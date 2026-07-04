import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getVietnamToday } from "@/lib/format";
import { managedTeamName } from "@/lib/team-scope";
import { calculateTeamLeaderPolicy } from "@/lib/team-leader-policy";
import { userCodeFromRequest } from "@/lib/user-auth";
import type { RevenueRecord } from "@/lib/types";

async function readAll(queryFactory: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await queryFactory(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

function deduplicateRevenue(rows: RevenueRecord[]) {
  const byContract = new Map<string, RevenueRecord>();
  for (const row of rows) {
    const key = String(row.application_no || row.contract_no || row.id || "").trim();
    if (!key) continue;
    const current = byContract.get(key);
    if (!current) {
      byContract.set(key, row);
      continue;
    }
    const rowIsMonthly = row.data_month !== "2099-01-01";
    const currentIsMonthly = current.data_month !== "2099-01-01";
    const rowStamp = String(row.updated_date || row.created_at || "");
    const currentStamp = String(current.updated_date || current.created_at || "");
    if ((rowIsMonthly && !currentIsMonthly) || (rowIsMonthly === currentIsMonthly && rowStamp > currentStamp)) {
      byContract.set(key, row);
    }
  }
  return [...byContract.values()];
}

async function calculate(request: NextRequest, body: any = {}) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const month = String(body.month || request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7)).slice(0, 7);
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase.from("authorized_users")
    .select("advisor_code,full_name,advisor_position,position_effective_date")
    .eq("advisor_code", code).single();
  if (error) throw error;
  const groupName = managedTeamName(code, profile.advisor_position);
  if (!groupName) return NextResponse.json({ error: "Tài khoản không phải Trưởng nhóm hoặc chưa được gán nhóm." }, { status: 403 });

  const year = month.slice(0, 4);
  const [allRevenue, fycRows, advisorProfiles] = await Promise.all([
    readAll((from, to) => supabase.from("revenue_records").select("*").order("paid_date").range(from, to)),
    readAll((from, to) => supabase.from("tvv_reward_policy_records").select("data_month,agent_code,fyc,raw_data").gte("data_month", `${year}-01-01`).lte("data_month", `${year}-12-31`).range(from, to)),
    readAll((from, to) => supabase.from("authorized_users").select("advisor_code,start_date").range(from, to))
  ]);
  const uniqueRevenue = deduplicateRevenue(allRevenue as RevenueRecord[]).sort((a, b) => String(a.paid_date).localeCompare(String(b.paid_date)));
  const latestGroupByAdvisor = new Map<string, string>();
  for (const row of uniqueRevenue) {
    const advisorCode = String(row.agent_code ?? "").trim();
    if (advisorCode && row.group_name) latestGroupByAdvisor.set(advisorCode, row.group_name);
  }
  const groupRecords = uniqueRevenue.filter((row) => row.group_name === groupName && row.issued_date?.startsWith(year));
  const result = calculateTeamLeaderPolicy({
    month,
    groupName,
    positionEffectiveDate: profile.position_effective_date,
    groupRecords,
    latestGroupByAdvisor,
    fycRows,
    advisorProfiles,
    asOfDate: getVietnamToday(),
    drafts: Array.isArray(body.draftContracts) ? body.draftContracts : []
  });
  return NextResponse.json({ ...result, leader: { code, name: profile.full_name } });
}

export async function GET(request: NextRequest) {
  try { return await calculate(request); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không tính được chính sách Trưởng nhóm." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try { return await calculate(request, await request.json().catch(() => ({}))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không tính được chính sách Trưởng nhóm." }, { status: 500 }); }
}
