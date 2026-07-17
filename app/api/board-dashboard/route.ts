import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";
import { managedBoardScope } from "@/lib/board-scope";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord } from "@/lib/reports";
import { monthBounds, toMonthStart } from "@/lib/format";
import type { RevenueRecord } from "@/lib/types";

function statusBucket(value: unknown) {
  const status = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  if (status.includes("co hieu luc")) return "issued";
  if (status.includes("dgrr") || status.includes("kiem tra ycbh")) return "attention";
  if (["hoan phi", "tu choi", "tri hoan", "het hieu luc"].some((item) => status.includes(item))) return "invalid";
  return "pending";
}

function sanitizeContract(row: RevenueRecord) {
  const { policy_owner: _policyOwner, insured_name: _insuredName, insured_dob: _insuredDob, raw_data: _rawData, ...safe } = row;
  return safe;
}

function aggregateGroups(records: RevenueRecord[], configuredGroups: string[]) {
  const groups = new Map(configuredGroups.map((groupName) => [groupName, { groupName, afyp: 0, ip: 0, contracts: 0, activeAdvisors: new Set<string>(), attention: 0 }]));
  for (const row of records) {
    const group = groups.get(row.group_name);
    if (!group) continue;
    group.contracts += 1;
    if (["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))) group.attention += 1;
    if (isCountedRevenueRecord(row)) {
      group.afyp += Number(row.afyp) || 0;
      group.ip += Number(row.ip) || 0;
      if (row.agent_code || row.agent_name) group.activeAdvisors.add(row.agent_code || row.agent_name);
    }
  }
  return [...groups.values()].map((row) => ({ ...row, activeAdvisors: row.activeAdvisors.size })).sort((a, b) => b.afyp - a.afyp);
}

export async function GET(request: NextRequest) {
  try {
    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase.from("authorized_users").select("advisor_code,full_name").eq("advisor_code", advisorCode).single();
    if (profileError) throw profileError;
    const scope = managedBoardScope(profile.full_name);
    if (!scope) return NextResponse.json({ error: "Tài khoản không có quyền Trưởng ban." }, { status: 403 });

    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const year = month.slice(0, 4);
    const { start, end } = monthBounds(month);
    const [{ data: monthRows, error: monthError }, { data: yearRows, error: yearError }] = await Promise.all([
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month)).in("group_name", scope.groups).gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").in("group_name", scope.groups).gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`)
    ]);
    if (monthError) throw monthError;
    if (yearError) throw yearError;
    const contracts = (monthRows ?? []) as RevenueRecord[];
    const yearContracts = dedupeRevenueRecordsByContract((yearRows ?? []) as RevenueRecord[]);
    const counted = contracts.filter(isCountedRevenueRecord);
    const groups = aggregateGroups(contracts, scope.groups);
    const advisors = new Map<string, any>();
    for (const row of contracts) {
      const key = row.agent_code || row.agent_name;
      if (!key) continue;
      const item = advisors.get(key) ?? { agentCode: row.agent_code, agentName: row.agent_name || "TVV", groupName: row.group_name, afyp: 0, ip: 0, contracts: 0, attention: 0 };
      item.contracts += 1;
      if (["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))) item.attention += 1;
      if (isCountedRevenueRecord(row)) { item.afyp += Number(row.afyp) || 0; item.ip += Number(row.ip) || 0; }
      advisors.set(key, item);
    }
    const rankedAdvisors = [...advisors.values()].sort((a, b) => b.afyp - a.afyp).map((row, index) => ({ ...row, rank: index + 1 }));
    return NextResponse.json({
      role: "board_leader", month, boardName: scope.boardName, groups,
      summary: {
        afyp: counted.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0),
        ip: counted.reduce((sum, row) => sum + (Number(row.ip) || 0), 0),
        contracts: contracts.length,
        activeAdvisors: new Set(counted.map((row) => row.agent_code || row.agent_name).filter(Boolean)).size,
        attention: contracts.filter((row) => ["attention", "pending", "invalid"].includes(statusBucket(row.policy_status))).length,
        activeGroups: groups.filter((row) => row.afyp > 0).length
      },
      advisors: rankedAdvisors,
      contracts: contracts.map(sanitizeContract),
      yearContracts: yearContracts.map(sanitizeContract)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu ban." }, { status: 500 });
  }
}
