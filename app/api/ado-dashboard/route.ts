import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedAdoScope } from "@/lib/ado-scope";
import { monthBounds, toMonthStart } from "@/lib/format";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import { revealVisiblePassword } from "@/lib/user-auth";
import { userCodeFromRequest } from "@/lib/user-auth";
import { managedTeamName } from "@/lib/team-scope";
import type { RevenueRecord } from "@/lib/types";

const TEAM_ACTIVITY_DATA_BUCKET = "team-activity-data";

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

export async function GET(request: NextRequest) {
  try {
    const code = userCodeFromRequest(request);
    if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name")
      .eq("advisor_code", code)
      .single();
    if (profileError) throw profileError;
    const scope = managedAdoScope(profile.advisor_code, profile.full_name);
    if (!scope) return NextResponse.json({ error: "Tài khoản không có quyền ADO." }, { status: 403 });

    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const { start, end } = monthBounds(month);
    const year = month.slice(0, 4);
    const [
      { data: monthRows, error: monthError },
      { data: yearRows, error: yearError },
      { data: roster, error: rosterError },
      { data: targetRows, error: targetError },
      { data: programs, error: programError }
    ] = await Promise.all([
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month))
        .in("group_name", scope.groups).gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01")
        .in("group_name", scope.groups).gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`),
      supabase.from("authorized_users")
        .select("advisor_code,full_name,group_name,advisor_position,advisor_status,avatar_url,password_hash,password_plain,is_active")
        .in("group_name", scope.groups).eq("is_active", true).order("group_name").order("full_name"),
      supabase.from("ado_group_target_registrations").select("*")
        .eq("target_month", monthStart(month)).eq("ado_code", code),
      supabase.from("competition_programs")
        .select("id,program_name,ai_summary,start_date,end_date,status,last_calculated_at,is_hidden")
        .eq("is_hidden", false).lte("start_date", end).order("end_date", { ascending: false })
    ]);
    if (monthError) throw monthError;
    if (yearError) throw yearError;
    if (rosterError) throw rosterError;

    const contracts = (monthRows ?? []) as RevenueRecord[];
    const counted = contracts.filter(isCountedRevenueRecord);
    const targets = targetError ? [] : (targetRows ?? []);
    const targetByGroup = new Map(targets.map((row: any) => [row.group_name, Number(row.revenue_target) || 0]));
    const groupRows = scope.groups.map((groupName) => {
      const rows = contracts.filter((row) => row.group_name === groupName);
      const valid = rows.filter(isCountedRevenueRecord);
      const afyp = valid.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0);
      const target = targetByGroup.get(groupName) || 0;
      return {
        groupName,
        afyp,
        ip: valid.reduce((sum, row) => sum + (Number(row.ip) || 0), 0),
        contracts: rows.length,
        activeAdvisors: new Set(valid.map((row) => row.agent_code || row.agent_name).filter(Boolean)).size,
        attention: rows.filter((row) => ["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))).length,
        target,
        targetRate: target > 0 ? afyp / target * 100 : 0
      };
    }).sort((a, b) => b.afyp - a.afyp);

    const programRows = programError ? [] : (programs ?? []);
    const teamLeaders = (roster ?? []).flatMap((row: any) => {
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

    return NextResponse.json({
      role: "ado",
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
      advisors: (roster ?? []).map((row: any) => ({
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
      competitions: programRows.map((program: any) => ({
        ...program,
        achievedAdvisors: (achievedAdvisors ?? []).filter((row: any) => row.program_id === program.id),
        achievedGroups: (achievedGroups ?? []).filter((row: any) => row.program_id === program.id)
      })),
      warnings: {
        targets: targetError ? "Chưa tạo bảng mục tiêu ADO. Hãy chạy supabase/ado-accounts-and-targets.sql." : null
      }
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu ADO." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const code = userCodeFromRequest(request);
    if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase.from("authorized_users")
      .select("advisor_code,full_name").eq("advisor_code", code).single();
    if (profileError) throw profileError;
    const scope = managedAdoScope(profile.advisor_code, profile.full_name);
    if (!scope) return NextResponse.json({ error: "Tài khoản không có quyền ADO." }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const targetMonth = monthStart(String(body.month || ""));
    const requestedTargets = Array.isArray(body.targets) ? body.targets : [];
    const rows = requestedTargets
      .filter((item: any) => scope.groups.includes(String(item.groupName || "")))
      .map((item: any) => ({
        target_month: targetMonth,
        ado_code: code,
        ado_name: scope.fullName,
        group_name: String(item.groupName),
        revenue_target: Math.max(0, Number(item.revenueTarget) || 0),
        updated_at: new Date().toISOString()
      }));
    if (rows.length !== scope.groups.length) return NextResponse.json({ error: "Vui lòng nhập mục tiêu cho đầy đủ các nhóm." }, { status: 400 });
    const { data, error } = await supabase.from("ado_group_target_registrations")
      .upsert(rows, { onConflict: "target_month,ado_code,group_name" }).select("*");
    if (error) throw error;
    return NextResponse.json({ targets: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không lưu được mục tiêu ADO." }, { status: 500 });
  }
}
