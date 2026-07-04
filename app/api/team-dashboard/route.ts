import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { monthBounds, toMonthStart } from "@/lib/format";
import { isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";
import type { RevenueRecord } from "@/lib/types";

const MONTHLY_MILESTONES = [12_000_000, 24_000_000, 50_000_000];

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

export async function GET(request: NextRequest) {
  try {
    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name,advisor_position")
      .eq("advisor_code", advisorCode)
      .single();
    if (profileError) throw profileError;

    const groupName = managedTeamName(profile.advisor_code, profile.advisor_position);
    if (!groupName) {
      return NextResponse.json({ error: "Tài khoản chưa được gán nhóm quản lý." }, { status: 403 });
    }

    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const { start, end } = monthBounds(month);
    const previousMonthKey = previousMonth(month);
    const previousMonthBounds = monthBounds(previousMonthKey);
    const year = month.slice(0, 4);
    const [{ data: monthRows, error: monthError }, { data: previousRows, error: previousError }, { data: yearRows, error: yearError }] = await Promise.all([
      supabase.from("revenue_records").select("*")
        .eq("data_month", toMonthStart(month)).eq("group_name", groupName)
        .gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*")
        .eq("data_month", toMonthStart(previousMonthKey)).eq("group_name", groupName)
        .gte("paid_date", previousMonthBounds.start).lte("paid_date", previousMonthBounds.end),
      supabase.from("revenue_records").select("*")
        .neq("data_month", "2099-01-01").eq("group_name", groupName).gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`)
    ]);
    if (monthError) throw monthError;
    if (previousError) throw previousError;
    if (yearError) throw yearError;

    const contracts = (monthRows ?? []) as RevenueRecord[];
    const previousContracts = (previousRows ?? []) as RevenueRecord[];
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

    const advisorCodes = [...agents.values()].map((row) => row.agentCode).filter(Boolean);
    const { data: advisorProfiles } = advisorCodes.length
      ? await supabase.from("authorized_users").select("advisor_code,avatar_url").in("advisor_code", advisorCodes)
      : { data: [] as Array<{ advisor_code: string; avatar_url: string | null }> };
    const avatarByCode = new Map((advisorProfiles ?? []).map((row) => [row.advisor_code, row.avatar_url]));

    const ranking = [...agents.values()]
      .map((row) => ({ ...row, avatarUrl: avatarByCode.get(row.agentCode) ?? null }))
      .map((row) => ({ ...row, nextMilestone: nextMilestone(row.ip) }))
      .sort((a, b) => b.ip - a.ip)
      .map((row, index) => ({ ...row, rank: index + 1 }));
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

    return NextResponse.json({
      role: "team_leader",
      month,
      groupName,
      leader: { code: profile.advisor_code, name: profile.full_name },
      summary: {
        agents: ranking.length,
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
      contracts,
      yearContracts: yearRows ?? [],
      yearRevenue: (yearRows ?? []).filter((row: any) => isCountedRevenueRecord(row))
        .reduce((sum: number, row: any) => sum + (Number(row.afyp) || 0), 0)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu nhóm." }, { status: 500 });
  }
}
