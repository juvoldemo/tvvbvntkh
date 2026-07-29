import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getVietnamToday, monthBounds, toMonthStart } from "@/lib/format";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import { buildStarVietGroupReport, buildStarVietReport, normalizeText } from "@/lib/star-viet";
import { readStarVietData } from "@/lib/star-viet-data";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";
import type { RevenueRecord } from "@/lib/types";

const MONTHLY_MILESTONES = [12_000_000, 24_000_000, 50_000_000];
const PAGE_SIZE = 1000;

async function readAll<T>(queryFactory: (from: number, to: number) => any) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function previousMonth(month: string) {
  const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function statusBucket(value: unknown) {
  const status = normalizeStatusText(value);
  if (status === "co hieu luc") return "issued";
  if (status.includes("dgrr") || status.includes("kiem tra ycbh")) return "dgrr";
  if (["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(status)) return "invalid";
  return "pending";
}

function nextMilestone(revenue: number) {
  const target = MONTHLY_MILESTONES.find((value) => value > revenue);
  return target
    ? { target, remaining: target - revenue, achievedAll: false }
    : { target: MONTHLY_MILESTONES.at(-1)!, remaining: 0, achievedAll: true };
}

function quarterBounds(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
  const start = new Date(Date.UTC(year, quarterStartMonth, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, quarterStartMonth + 3, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function isNewAdvisor(startDate: unknown, month: string) {
  const date = String(startDate || "").slice(0, 10);
  if (!date) return false;
  const [startYear, startMonth, startDay] = date.split("-").map(Number);
  if (!startYear || !startMonth || !startDay) return false;
  const [year, monthNo] = month.split("-").map(Number);
  const periodEnd = new Date(Date.UTC(year, monthNo, 0));
  const twelveMonthMark = new Date(Date.UTC(startYear, startMonth - 1 + 12, startDay));
  return periodEnd >= new Date(Date.UTC(startYear, startMonth - 1, startDay)) && periodEnd < twelveMonthMark;
}

function monthsSince(referenceDate: unknown, month: string) {
  const raw = String(referenceDate || "").slice(0, 10);
  if (!raw) return null;
  const [refYear, refMonth] = raw.split("-").map(Number);
  const [year, monthNo] = month.split("-").map(Number);
  if (!refYear || !refMonth || !year || !monthNo) return null;
  return (year - refYear) * 12 + (monthNo - refMonth);
}

async function readTeamRoster(supabase: ReturnType<typeof getSupabaseAdmin>, groupName: string) {
  const { data, error } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,start_date,avatar_url,group_name")
    .eq("is_active", true)
    .eq("group_name", groupName)
    .order("full_name");
  if (error) {
    console.warn("[team-dashboard] Cannot read APM01 team roster", error.message);
    return [];
  }
  return data ?? [];
}

export async function GET(request: NextRequest) {
  try {
    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name,advisor_position,group_name")
      .eq("advisor_code", advisorCode)
      .single();
    if (profileError) throw profileError;

    const groupName = managedTeamName(profile.advisor_code, profile.advisor_position, profile.full_name, profile.group_name);
    if (!groupName) {
      return NextResponse.json({ error: "Tài khoản chưa được gán nhóm quản lý." }, { status: 403 });
    }

    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const currentStarVietMonth = getVietnamToday().slice(0, 7);
    const { start, end } = monthBounds(month);
    const previousMonthKey = previousMonth(month);
    const previousMonthBounds = monthBounds(previousMonthKey);
    const year = month.slice(0, 4);
    const [{ data: monthRows, error: monthError }, { data: previousRows, error: previousError }, { data: yearRows, error: yearError }, allTeamRows, starVietData, teamRoster] = await Promise.all([
      supabase.from("revenue_records").select("*")
        .eq("data_month", toMonthStart(month)).eq("group_name", groupName)
        .gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*")
        .eq("data_month", toMonthStart(previousMonthKey)).eq("group_name", groupName)
        .gte("paid_date", previousMonthBounds.start).lte("paid_date", previousMonthBounds.end),
      supabase.from("revenue_records").select("*")
        .neq("data_month", "2099-01-01").eq("group_name", groupName).gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`),
      readAll<Pick<RevenueRecord, "agent_code" | "agent_name" | "group_name" | "paid_date" | "issued_date">>((from, to) =>
        supabase.from("revenue_records").select("agent_code,agent_name,group_name,paid_date,issued_date")
          .neq("data_month", "2099-01-01").eq("group_name", groupName).range(from, to)
      ),
      readStarVietData(supabase, currentStarVietMonth),
      readTeamRoster(supabase, groupName)
    ]);
    if (monthError) throw monthError;
    if (previousError) throw previousError;
    if (yearError) throw yearError;

    const contracts = (monthRows ?? []) as RevenueRecord[];
    const previousContracts = (previousRows ?? []) as RevenueRecord[];
    const yearContracts = dedupeRevenueRecordsByContract((yearRows ?? []) as RevenueRecord[]);
    const counted = contracts.filter(isCountedRevenueRecord);
    const previousCounted = previousContracts.filter(isCountedRevenueRecord);
    const agents = new Map<string, any>();
    for (const row of contracts) {
      const key = String(row.agent_code || row.agent_name).trim();
      if (!key) continue;
      const current = agents.get(key) ?? {
        agentCode: row.agent_code || "", agentName: row.agent_name || "TVV",
        afyp: 0, ip: 0, contracts: 0, issued: 0, pending: 0, dgrr: 0, invalid: 0
      };
      current.contracts += 1;
      current[statusBucket(row.policy_status)] += 1;
      if (isCountedRevenueRecord(row)) {
        current.afyp += Number(row.afyp) || 0;
        current.ip += Number(row.ip) || 0;
      }
      agents.set(key, current);
    }

    const latestAdvisorByCode = new Map<string, any>();
    for (const row of allTeamRows) {
      const code = String(row.agent_code || row.agent_name || "").trim();
      if (!code) continue;
      const current = latestAdvisorByCode.get(code);
      const currentDate = String(current?.issued_date || current?.paid_date || "");
      const rowDate = String(row.issued_date || row.paid_date || "");
      if (!current || rowDate >= currentDate) latestAdvisorByCode.set(code, row);
    }

    const advisorCodes = [...new Set([...agents.values(), ...latestAdvisorByCode.values(), ...teamRoster].map((row: any) => row.agentCode || row.agent_code || row.advisor_code).filter(Boolean))];
    const { data: advisorProfiles } = advisorCodes.length
      ? await supabase.from("authorized_users").select("advisor_code,full_name,start_date,avatar_url").in("advisor_code", advisorCodes)
      : { data: [] as Array<{ advisor_code: string; full_name: string | null; start_date: string | null; avatar_url: string | null }> };
    const avatarByCode = new Map((advisorProfiles ?? []).map((row) => [row.advisor_code, row.avatar_url]));
    const profileByCode = new Map((advisorProfiles ?? []).map((row) => [row.advisor_code, row]));

    const ranking = [...agents.values()]
      .map((row) => ({ ...row, agentName: profileByCode.get(row.agentCode)?.full_name || row.agentName, startDate: profileByCode.get(row.agentCode)?.start_date ?? null, isNewAdvisor: isNewAdvisor(profileByCode.get(row.agentCode)?.start_date, month), avatarUrl: avatarByCode.get(row.agentCode) ?? null }))
      .map((row) => ({ ...row, nextMilestone: nextMilestone(row.ip) }))
      .sort((a, b) => b.ip - a.ip)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const rankedByCode = new Map(ranking.map((row) => [String(row.agentCode || row.agentName), row]));
    const rosterSource = teamRoster.length ? teamRoster : [...latestAdvisorByCode.values()];
    const allAgents = rosterSource
      .map((row) => {
        const agentCode = String(row.advisor_code || row.agent_code || "").trim();
        const key = agentCode || String(row.full_name || row.agent_name || "").trim();
        const profile = agentCode ? profileByCode.get(agentCode) : undefined;
        const latestContract = latestAdvisorByCode.get(key);
        const lastContractDate = String(latestContract?.issued_date || latestContract?.paid_date || "");
        const referenceDate = lastContractDate || null;
        const inactiveMonths = monthsSince(referenceDate, month);
        return rankedByCode.get(key) ?? {
          agentCode,
          agentName: row.full_name || profile?.full_name || row.agent_name || "TVV",
          afyp: 0,
          ip: 0,
          contracts: 0,
          issued: 0,
          pending: 0,
          dgrr: 0,
          invalid: 0,
          avatarUrl: profile?.avatar_url ?? null,
          startDate: profile?.start_date ?? null,
          isNewAdvisor: isNewAdvisor(profile?.start_date, month),
          lastContractDate: lastContractDate || null,
          inactiveMonths,
          needsSos: inactiveMonths !== null && inactiveMonths >= 5
        };
      })
      .map((agent) => {
        if ("needsSos" in agent) return agent;
        const latestContract = latestAdvisorByCode.get(String(agent.agentCode || agent.agentName || "").trim());
        const lastContractDate = String(latestContract?.issued_date || latestContract?.paid_date || "");
        const referenceDate = lastContractDate || null;
        const inactiveMonths = monthsSince(referenceDate, month);
        return {
          ...agent,
          lastContractDate: lastContractDate || null,
          inactiveMonths,
          needsSos: inactiveMonths !== null && inactiveMonths >= 5
        };
      })
      .sort((a, b) => Number(b.ip || 0) - Number(a.ip || 0) || String(a.agentName).localeCompare(String(b.agentName), "vi"));
    const accessCodes = allAgents.map((agent: any) => String(agent.agentCode || "").trim().toUpperCase()).filter(Boolean);
    let accessWarning = "";
    const lastAccessByCode = new Map<string, string>();
    if (accessCodes.length) {
      const { data: accessEvents, error: accessError } = await supabase
        .from("app_analytics_events")
        .select("advisor_code,created_at")
        .eq("event_name", "session_start")
        .in("advisor_code", accessCodes)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (accessError) {
        accessWarning = accessError.message;
      } else {
        for (const event of accessEvents ?? []) {
          const code = String(event.advisor_code || "").trim().toUpperCase();
          if (code && !lastAccessByCode.has(code)) lastAccessByCode.set(code, event.created_at);
        }
      }
    }
    const now = Date.now();
    const accessUsers = allAgents
      .map((agent: any) => {
        const advisorCode = String(agent.agentCode || "").trim().toUpperCase();
        const lastAccess = lastAccessByCode.get(advisorCode) || null;
        return {
          advisorCode,
          fullName: agent.agentName || "TVV",
          avatarUrl: agent.avatarUrl || null,
          lastAccess,
          inactive7Days: Boolean(lastAccess && now - new Date(lastAccess).getTime() >= 7 * 86400000)
        };
      })
      .sort((a: any, b: any) => {
        if (!a.lastAccess && !b.lastAccess) return a.fullName.localeCompare(b.fullName, "vi");
        if (!a.lastAccess) return 1;
        if (!b.lastAccess) return -1;
        return new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime();
      });
    const issued = contracts.filter((row) => statusBucket(row.policy_status) === "issued").length;
    const invalid = contracts.filter((row) => statusBucket(row.policy_status) === "invalid").length;
    const dgrr = contracts.filter((row) => statusBucket(row.policy_status) === "dgrr").length;
    const pending = Math.max(contracts.length - issued - dgrr - invalid, 0);
    const previousIssued = previousContracts.filter((row) => statusBucket(row.policy_status) === "issued").length;
    const previousInvalid = previousContracts.filter((row) => statusBucket(row.policy_status) === "invalid").length;
    const previousDgrr = previousContracts.filter((row) => statusBucket(row.policy_status) === "dgrr").length;
    const previousPending = Math.max(previousContracts.length - previousIssued - previousDgrr - previousInvalid, 0);
    const previousAgentCount = new Set(previousContracts.map((row) => row.agent_code || row.agent_name).filter(Boolean)).size;
    const previousSummary = {
      agents: previousAgentCount,
      afyp: previousCounted.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0),
      contracts: previousContracts.length,
      attention: previousPending + previousDgrr + previousInvalid
    };
    const comparison = (current: number, previous: number) => previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0 ? 100 : 0;
    const groupReport = buildStarVietGroupReport(starVietData.groupRecords);
    const starViet = groupReport.rows.find((row) =>
      String(row.leaderCode).trim().toUpperCase() === advisorCode || normalizeText(row.groupName) === normalizeText(groupName)
    ) ?? null;
    const starVietRows = buildStarVietReport(starVietData.personalRecords).rows
      .filter((row) => normalizeText(row.groupName) === normalizeText(groupName));

    return NextResponse.json({
      role: "team_leader",
      month,
      groupName,
      leader: { code: profile.advisor_code, name: profile.full_name },
      summary: {
        agents: allAgents.length || ranking.length,
        activeAgents: ranking.filter((row) => row.afyp > 0).length,
        afyp: counted.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0),
        ip: counted.reduce((sum, row) => sum + (Number(row.ip) || 0), 0),
        contracts: contracts.length,
        issued,
        pending,
        dgrr,
        invalid,
        comparisons: {
          afyp: comparison(counted.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0), previousSummary.afyp),
          agents: comparison(ranking.length, previousSummary.agents),
          contracts: comparison(contracts.length, previousSummary.contracts),
          attention: comparison(pending + dgrr + invalid, previousSummary.attention)
        }
      },
      agents: ranking,
      allAgents,
      accessStats: {
        accessedCount: accessUsers.filter((user: any) => user.lastAccess).length,
        totalCount: accessUsers.length,
        neverAccessed: accessUsers.filter((user: any) => !user.lastAccess),
        inactive7Days: accessUsers.filter((user: any) => user.inactive7Days),
        recentAccess: accessUsers.filter((user: any) => user.lastAccess),
        warning: accessWarning || null
      },
      starViet,
      starVietRows,
      starVietWarning: starVietData.warning,
      contracts,
      yearContracts,
      yearRevenue: yearContracts.filter((row: any) => isCountedRevenueRecord(row))
        .reduce((sum: number, row: any) => sum + (Number(row.afyp) || 0), 0)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu nhóm." }, { status: 500 });
  }
}
