import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { monthBounds, toMonthStart } from "@/lib/format";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import { revealVisiblePassword } from "@/lib/user-auth";
import { userCodeFromRequest } from "@/lib/user-auth";
import { managedTeamName } from "@/lib/team-scope";
import type { RevenueRecord } from "@/lib/types";
import recruitmentCandidates from "@/data/recruitment-candidates.json";

const TEAM_ACTIVITY_DATA_BUCKET = "team-activity-data";
const RECRUITMENT_REGISTRY_MONTH = "2099-12-01";
const RECRUITMENT_REGISTRY_GROUP = "__RECRUITMENT_POOL_LOCK__";
const responseCache = new Map<string, { expiresAt: number; payload: any }>();
const RESPONSE_TTL_MS = 30_000;

function statusBucket(value: unknown) {
  const status = normalizeStatusText(value);
  if (status === "co hieu luc") return "issued";
  if (status.includes("dgrr") || status.includes("kiem tra ycbh")) return "attention";
  if (["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(status)) return "invalid";
  return "pending";
}

function sanitizeContract(row: RevenueRecord) {
  // ADO is authorized to see BMBH and NĐBH for contracts in the groups they
  // manage. Keep names, while still excluding DOB and the unrestricted raw row.
  const { insured_dob: _insuredDob, raw_data: _rawData, ...safe } = row;
  return safe;
}

function monthStart(value: string) {
  return `${/^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7)}-01`;
}

async function readLeaderActivities(supabase: ReturnType<typeof getSupabaseAdmin>, leaderCode: string) {
  const normalizedCode = leaderCode.replace(/[^a-z0-9_-]/gi, "_").toUpperCase();
  const legacyPath = `leaders/${normalizedCode}.json`;
  const folder = `leaders/${normalizedCode}/activities`;
  let legacyActivities: any[] = [];
  const { data: legacyData, error: legacyError } = await supabase.storage.from(TEAM_ACTIVITY_DATA_BUCKET).download(legacyPath);
  if (!legacyError && legacyData) {
    const parsed = JSON.parse(await legacyData.text());
    legacyActivities = Array.isArray(parsed) ? parsed : [];
  } else if (legacyError && !/not found|does not exist/i.test(legacyError.message)) {
    throw legacyError;
  }
  const { data: files, error: listError } = await supabase.storage.from(TEAM_ACTIVITY_DATA_BUCKET).list(folder, { limit: 1000 });
  if (listError && !/not found|does not exist/i.test(listError.message)) throw listError;
  const individualActivities = await Promise.all((files ?? [])
    .filter((file) => file.name.endsWith(".json"))
    .map(async (file) => {
      const { data, error } = await supabase.storage.from(TEAM_ACTIVITY_DATA_BUCKET).download(`${folder}/${file.name}`);
      if (error) throw error;
      return JSON.parse(await data.text());
    }));
  const merged = new Map<string, any>();
  legacyActivities.forEach((item: any) => merged.set(String(item.id), item));
  individualActivities.forEach((item: any) => merged.set(String(item.id), item));
  return [...merged.values()];
}

async function resolveManagementScope(supabase: ReturnType<typeof getSupabaseAdmin>, advisorCode: string, fullName: string) {
  const adoScope = managedAdoScope(advisorCode, fullName);
  if (adoScope) return { ...adoScope, role: "ado" as const };
  if (!isBossAccount(advisorCode)) return null;

  const { data, error } = await supabase
    .from("authorized_users")
    .select("group_name,advisor_position")
    .eq("is_active", true)
    .not("group_name", "is", null);
  if (error) throw error;
  const managementPositions = new Set(["ado", "boss"]);
  const managementGroups = new Set(["ptkd1", "ptkd2", "toancongty"]);
  const groups = [...new Set((data ?? []).flatMap((row: any) => {
    const groupName = String(row.group_name || "").trim();
    const position = String(row.advisor_position || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const normalizedGroup = groupName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
    return groupName && !managementPositions.has(position) && !managementGroups.has(normalizedGroup) ? [groupName] : [];
  }))].sort((a, b) => a.localeCompare(b, "vi"));
  return { username: "boss", fullName: fullName || "Boss", department: "Toàn công ty", groups, role: "boss" as const };
}

export async function GET(request: NextRequest) {
  try {
    const code = userCodeFromRequest(request);
    if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const cacheKey = `${code}:${month}`;
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, { headers: { "Cache-Control": "private, max-age=20", "X-Data-Cache": "HIT" } });
    }
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name")
      .eq("advisor_code", code)
      .single();
    if (profileError) throw profileError;
    const scope = await resolveManagementScope(supabase, profile.advisor_code, profile.full_name);
    if (!scope) return NextResponse.json({ error: "Tài khoản không có quyền quản lý." }, { status: 403 });

    const { start, end } = monthBounds(month);
    const year = month.slice(0, 4);
    const [
      { data: monthRows, error: monthError },
      { data: yearRows, error: yearError },
      { data: roster, error: rosterError },
      { data: unassignedRoster, error: unassignedRosterError },
      { data: scopeMembershipRows, error: scopeMembershipError },
      { data: targetRows, error: targetError },
      { data: programs, error: programError }
    ] = await Promise.all([
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month))
        .in("group_name", scope.groups).gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01")
        .in("group_name", scope.groups).gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`),
      supabase.from("authorized_users")
        .select("advisor_code,full_name,group_name,advisor_position,advisor_status,avatar_url,password_hash,password_plain,is_active")
        .in("group_name", scope.groups).order("group_name").order("full_name"),
      supabase.from("authorized_users")
        .select("advisor_code,full_name,group_name,advisor_position,advisor_status,avatar_url,password_hash,password_plain,is_active")
        .is("group_name", null).eq("is_active", true).order("full_name"),
      supabase.from("revenue_records")
        .select("agent_code,group_name").eq("data_month", "2099-01-01").in("group_name", scope.groups),
      supabase.from("team_target_registrations")
        .select("group_name,leader_code,leader_name,revenue_target,active_advisor_target,updated_at")
        .eq("target_month", monthStart(month)).in("group_name", scope.groups),
      supabase.from("competition_programs")
        .select("id,program_name,ai_summary,start_date,end_date,status,last_calculated_at,is_hidden")
        .eq("is_hidden", false).lte("start_date", end).order("end_date", { ascending: false })
    ]);
    if (monthError) throw monthError;
    if (yearError) throw yearError;
    if (rosterError) throw rosterError;
    if (unassignedRosterError) throw unassignedRosterError;
    if (scopeMembershipError) throw scopeMembershipError;

    const membershipByAdvisor = new Map<string, string>();
    for (const row of scopeMembershipRows ?? []) {
      const advisorCode = String(row.agent_code || "").trim().toUpperCase();
      if (advisorCode && row.group_name && !membershipByAdvisor.has(advisorCode)) {
        membershipByAdvisor.set(advisorCode, row.group_name);
      }
    }
    const rosterByCode = new Map<string, any>();
    for (const row of [...(roster ?? []), ...(unassignedRoster ?? [])]) {
      const advisorCode = String(row.advisor_code || "").trim().toUpperCase();
      const resolvedGroup = String(row.group_name || "").trim()
        || managedTeamName(row.advisor_code, row.advisor_position, row.full_name, row.group_name)
        || membershipByAdvisor.get(advisorCode)
        || "";
      if (advisorCode && scope.groups.includes(resolvedGroup)) {
        rosterByCode.set(advisorCode, { ...row, group_name: resolvedGroup });
      }
    }
    const resolvedRoster = [...rosterByCode.values()];
    const activeRoster = resolvedRoster.filter((row: any) => row.is_active);
    // The latest APM01 import is authoritative: the import disables every old
    // record first, then re-activates only advisors present in the new file.
    // Never retain stale accounts merely because they already have a password.
    const visibleRoster = activeRoster;
    const contracts = (monthRows ?? []) as RevenueRecord[];
    const counted = contracts.filter(isCountedRevenueRecord);
    const targets = targetError ? [] : (targetRows ?? []);
    const targetByGroup = new Map(targets.map((row: any) => [row.group_name, row]));
    const groupRows = scope.groups.map((groupName) => {
      const rows = contracts.filter((row) => row.group_name === groupName);
      const valid = rows.filter(isCountedRevenueRecord);
      const afyp = valid.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0);
      const targetRegistration: any = targetByGroup.get(groupName);
      const target = Number(targetRegistration?.revenue_target) || 0;
      return {
        groupName,
        afyp,
        ip: valid.reduce((sum, row) => sum + (Number(row.ip) || 0), 0),
        contracts: rows.length,
        activeAdvisors: new Set(valid.map((row) => row.agent_code || row.agent_name).filter(Boolean)).size,
        attention: rows.filter((row) => ["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))).length,
        target,
        targetRegistered: Boolean(targetRegistration),
        targetLeaderCode: targetRegistration?.leader_code || null,
        targetLeaderName: targetRegistration?.leader_name || null,
        targetActiveAdvisors: Number(targetRegistration?.active_advisor_target) || 0,
        targetUpdatedAt: targetRegistration?.updated_at || null,
        targetRate: target > 0 ? afyp / target * 100 : 0
      };
    }).sort((a, b) => b.afyp - a.afyp);

    const programRows = programError ? [] : (programs ?? []);
    const teamLeaders = activeRoster.flatMap((row: any) => {
      const managedGroup = managedTeamName(row.advisor_code, row.advisor_position, row.full_name, row.group_name);
      return managedGroup && scope.groups.includes(managedGroup)
        ? [{ advisorCode: row.advisor_code, fullName: row.full_name, groupName: managedGroup }]
        : [];
    });
    const leaderActivities = await Promise.all(teamLeaders.map(async (leader: any) => {
      try {
        const activities = await readLeaderActivities(supabase, leader.advisorCode);
        return {
          ...leader,
          activities: activities
            .filter((item: any) => item.target_month === month)
            .sort((a: any, b: any) => String(a.scheduled_at || "").localeCompare(String(b.scheduled_at || "")))
        };
      } catch (error) {
        console.warn("[ado-dashboard] Cannot read team leader activities", leader.advisorCode, error);
        return { ...leader, activities: [] };
      }
    }));
    const { data: recruitmentRegistry } = await supabase
      .from("team_target_registrations")
      .select("selected_advisors,updated_at")
      .eq("target_month", RECRUITMENT_REGISTRY_MONTH)
      .eq("group_name", RECRUITMENT_REGISTRY_GROUP)
      .maybeSingle();
    const registry = recruitmentRegistry?.selected_advisors && !Array.isArray(recruitmentRegistry.selected_advisors)
      ? recruitmentRegistry.selected_advisors as any
      : {};
    const claims = registry.claims && typeof registry.claims === "object" ? registry.claims : {};
    const confirmations = registry.confirmations && typeof registry.confirmations === "object" ? registry.confirmations : {};
    const candidateByCode = new Map((recruitmentCandidates as any[]).map((candidate: any) => [candidate.advisorCode, candidate]));
    const recruitmentSelections = teamLeaders
      .map((leader: any) => ({
        ...leader,
        isConfirmed: Boolean(confirmations[leader.advisorCode]),
        confirmedAt: confirmations[leader.advisorCode] || null,
        candidates: Object.entries(claims)
          .filter(([, leaderCode]) => leaderCode === leader.advisorCode)
          .map(([candidateCode]) => candidateByCode.get(candidateCode))
          .filter(Boolean)
          .sort((a: any, b: any) => String(a.advisorName).localeCompare(String(b.advisorName), "vi"))
          .map((candidate: any) => ({
            id: candidate.id,
            advisorCode: candidate.advisorCode,
            advisorName: candidate.advisorName,
            recruiterCode: candidate.recruiterCode,
            recruiterName: candidate.recruiterName,
            startDate: candidate.startDate,
            inactiveMonths: candidate.inactiveMonths,
            deposit: candidate.deposit,
            phone: candidate.phone,
            address: candidate.address
          }))
      }))
      .sort((a: any, b: any) => String(a.groupName).localeCompare(String(b.groupName), "vi"));
    const competitionIds = programRows.map((program: any) => program.id);
    const { data: resultRows } = competitionIds.length
      ? await supabase.from("competition_results").select("id,program_id,calculated_at").in("program_id", competitionIds).order("calculated_at", { ascending: false })
      : { data: [] as any[] };
    const latestResultByProgram = new Map<string, string>();
    for (const result of resultRows ?? []) if (!latestResultByProgram.has(result.program_id)) latestResultByProgram.set(result.program_id, result.id);
    const resultIds = [...latestResultByProgram.values()];
    const [{ data: achievedAdvisors }, { data: achievedGroups }] = resultIds.length
      ? await Promise.all([
        supabase.from("competition_reward_advisors")
          .select("program_id,result_id,tvv,team,total_ip,total_afyp,reward_amount,achieved_reward_names")
          .in("result_id", resultIds).in("team", scope.groups),
        supabase.from("competition_reward_groups")
          .select("program_id,result_id,team,total_ip,total_afyp,total_reward,achieved_tier,prize_name")
          .in("result_id", resultIds).in("team", scope.groups)
      ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const payload = {
      role: scope.role,
      month,
      ado: { code, name: scope.fullName, department: scope.department },
      groups: groupRows,
      summary: {
        afyp: counted.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0),
        ip: counted.reduce((sum, row) => sum + (Number(row.ip) || 0), 0),
        contracts: contracts.length,
        activeAdvisors: new Set(counted.map((row) => row.agent_code || row.agent_name).filter(Boolean)).size,
        attention: contracts.filter((row) => ["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))).length,
        target: groupRows.reduce((sum, row) => sum + row.target, 0)
      },
      contracts: contracts.map(sanitizeContract),
      yearContracts: dedupeRevenueRecordsByContract((yearRows ?? []) as RevenueRecord[]).map(sanitizeContract),
      advisors: visibleRoster.map((row: any) => ({
        advisorCode: row.advisor_code,
        fullName: row.full_name,
        groupName: row.group_name,
        position: row.advisor_position,
        status: row.advisor_status,
        avatarUrl: row.avatar_url,
        username: String(row.advisor_code || "").toLowerCase(),
        password: revealVisiblePassword(row.password_hash || "") || row.password_plain || "Chưa thiết lập"
      })),
      leaderActivities,
      recruitment: {
        selections: recruitmentSelections,
        totalLeaders: recruitmentSelections.filter((item: any) => item.candidates.length > 0).length,
        totalCandidates: recruitmentSelections.reduce((sum: number, item: any) => sum + item.candidates.length, 0),
        updatedAt: recruitmentRegistry?.updated_at || null
      },
      competitions: programRows.map((program: any) => ({
        ...program,
        achievedAdvisors: (achievedAdvisors ?? []).filter((row: any) => row.program_id === program.id),
        achievedGroups: (achievedGroups ?? []).filter((row: any) => row.program_id === program.id)
      })),
      warnings: {
        targets: targetError ? "Chưa tải được mục tiêu do trưởng nhóm đăng ký." : null
      }
    };
    responseCache.set(cacheKey, { expiresAt: Date.now() + RESPONSE_TTL_MS, payload });
    if (responseCache.size > 100) {
      for (const [key, value] of responseCache) if (value.expiresAt <= Date.now()) responseCache.delete(key);
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=20", "X-Data-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu ADO." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Mục tiêu doanh thu do Trưởng nhóm đăng ký." }, { status: 403 });
}
