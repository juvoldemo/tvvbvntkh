import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getVietnamToday } from "@/lib/format";
import { managedTeamName } from "@/lib/team-scope";
import { calculateTeamLeaderPolicy } from "@/lib/team-leader-policy";
import { userCodeFromRequest } from "@/lib/user-auth";
import { calculateCompetitionReward, getBaseEligibleCompetitionContracts } from "@/src/lib/competition/competitionRuleEngine";
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

function normalizedText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

async function readTeamRosterCount(supabase: ReturnType<typeof getSupabaseAdmin>, groupName: string) {
  const { count, error } = await supabase
    .from("authorized_users")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("group_name", groupName);
  if (error) {
    console.warn("[team-leader-rewards] Cannot read APM01 team roster count", error.message);
    return 0;
  }
  return count ?? 0;
}

function programSummary(program: any, contracts: RevenueRecord[]) {
  const storedRule = program.confirmed_rule || program.ai_rule || {};
  const rule = {
    ...storedRule,
    id: program.id,
    program_name: program.program_name || storedRule.program_name || "Chương trình thi đua",
    start_date: program.start_date || storedRule.start_date,
    end_date: program.end_date || storedRule.end_date,
    issue_deadline: program.issue_deadline || storedRule.issue_deadline
  };
  const result = calculateCompetitionReward(rule, contracts);
  const primaryRule = rule.reward_rules?.[0] ?? {};
  const milestoneTiers = primaryRule.thresholds ?? rule.thresholds ?? rule.tiers ?? [];
  const metricText = normalizedText(primaryRule.calculation_logic ?? rule.calculation_logic ?? rule.metric_type);
  const usesIp = metricText.includes("ip") || metricText.includes("pdt") || metricText.includes("phi dau tien");
  const participatingContracts = getBaseEligibleCompetitionContracts(rule, contracts);
  const currentBasis = participatingContracts.reduce(
    (sum: number, contract: any) => sum + Number(usesIp ? contract.ip : contract.afyp),
    0
  );
  const groupReward = result.groupRewardResults.reduce((sum, row) => sum + Number(row.totalReward ?? row.group_reward_amount ?? 0), 0);
  const advisorReward = result.tvvRewardResults.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0);
  const contractReward = result.contractRewardResults.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0);
  const estimatedReward = groupReward || advisorReward + contractReward;
  const advisorCodeByName = new Map(contracts.map((row) => [normalizedText(row.agent_name), row.agent_code]));
  const achievedByAdvisor = new Map<string, {
    advisorName: string;
    advisorCode: string;
    contractCount: number;
    totalIP: number;
    totalAFYP: number;
    reward: number;
  }>();
  const addAchievedAdvisor = (row: any, reward = 0) => {
    const advisorName = String(row.advisor || row.agent_name || "").trim();
    const key = normalizedText(advisorName);
    if (!key) return;
    const current = achievedByAdvisor.get(key) ?? {
      advisorName,
      advisorCode: String(advisorCodeByName.get(key) || ""),
      contractCount: 0,
      totalIP: 0,
      totalAFYP: 0,
      reward: 0
    };
    current.contractCount = Math.max(current.contractCount, Number(row.contractCount ?? 0));
    current.totalIP = Math.max(current.totalIP, Number(row.totalIP ?? row.ip ?? 0));
    current.totalAFYP = Math.max(current.totalAFYP, Number(row.totalAFYP ?? row.afyp ?? 0));
    current.reward = Math.max(current.reward, Number(reward || row.rewardAmount || 0));
    achievedByAdvisor.set(key, current);
  };
  result.tvvRewardResults.forEach((row) => addAchievedAdvisor(row));
  result.groupRewardResults
    .filter((row) => Number(row.totalReward ?? row.group_reward_amount ?? 0) > 0)
    .forEach((row) => row.advisors.forEach((advisor) => addAchievedAdvisor(advisor, Number(row.rewardPerAdvisor ?? row.reward_per_tvv ?? 0))));
  result.contractRewardResults.forEach((row) => addAchievedAdvisor({
    advisor: row.advisor,
    contractCount: 1,
    totalIP: row.ip,
    totalAFYP: row.afyp
  }, row.rewardAmount));

  return {
    programId: program.id,
    programName: rule.program_name,
    originalFileUrl: program.original_file_url || null,
    originalFileName: program.original_file_name || null,
    issueDeadline: rule.issue_deadline || null,
    status: program.status,
    startDate: String(rule.start_date || "").slice(0, 10),
    endDate: String(rule.end_date || "").slice(0, 10),
    estimatedReward,
    actualContractCount: participatingContracts.length,
    matchedContracts: participatingContracts,
    isEligible: estimatedReward > 0,
    milestoneType: milestoneTiers.length ? "revenue-tier" : undefined,
    milestoneMetricLabel: usesIp ? "Phí đầu tiên (IP) nhóm" : "AFYP nhóm",
    milestoneCurrentBasis: currentBasis,
    milestoneCurrentReward: estimatedReward,
    milestoneContractCount: participatingContracts.length,
    milestoneTiers,
    teamScoped: true,
    achievedAdvisors: [...achievedByAdvisor.values()].sort((a, b) => b.reward - a.reward || b.totalIP - a.totalIP),
    participatingContracts: participatingContracts.map((contract: any) => ({
      applicationNo: contract.applicationNo || contract.gyc_no || "",
      policyOwner: contract.customer || contract.customer_name || "Chưa có tên BMBH",
      status: contract.status || "Chưa có trạng thái"
    }))
  };
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
  const groupName = managedTeamName(code, profile.advisor_position, profile.full_name);
  if (!groupName) return NextResponse.json({ error: "Tài khoản không phải Trưởng nhóm hoặc chưa được gán nhóm." }, { status: 403 });

  const year = month.slice(0, 4);
  const [allRevenue, fycRows, advisorProfiles, competitionPrograms, rosterCount] = await Promise.all([
    readAll((from, to) => supabase.from("revenue_records").select("*").order("paid_date").range(from, to)),
    readAll((from, to) => supabase.from("tvv_reward_policy_records").select("data_month,reward_source,agent_code,agent_name,group_name,ip,fyp,fyc,raw_data").gte("data_month", `${year}-01-01`).lte("data_month", `${year}-12-31`).range(from, to)),
    readAll((from, to) => supabase.from("authorized_users").select("advisor_code,start_date").range(from, to)),
    readAll((from, to) => supabase.from("competition_programs").select("*").range(from, to)),
    readTeamRosterCount(supabase, groupName)
  ]);
  const uniqueRevenue = deduplicateRevenue(allRevenue as RevenueRecord[]).sort((a, b) => String(a.paid_date).localeCompare(String(b.paid_date)));
  const latestGroupByAdvisor = new Map<string, string>();
  for (const row of uniqueRevenue) {
    const advisorCode = String(row.agent_code ?? "").trim();
    if (advisorCode && row.group_name) latestGroupByAdvisor.set(advisorCode, row.group_name);
  }
  const currentTeamAdvisorCount = rosterCount || [...latestGroupByAdvisor.values()]
    .filter((advisorGroupName) => advisorGroupName === groupName).length;
  const groupRecords = uniqueRevenue.filter((row) => row.group_name === groupName && row.issued_date?.startsWith(year));
  const teamCompetitionContracts = uniqueRevenue.filter((row) => row.group_name === groupName);
  const today = getVietnamToday();
  const competitionSummaries = competitionPrograms
    .filter((program: any) => program.is_hidden !== true && program.confirmed_rule)
    .map((program: any) => {
      try {
        return programSummary(program, teamCompetitionContracts);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const ongoingPrograms = competitionSummaries.filter((program: any) => program.startDate <= today && program.endDate >= today);
  const endedPrograms = competitionSummaries.filter((program: any) => program.endDate < today);
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
  return NextResponse.json({
    ...result,
    currentTeamAdvisorCount,
    ongoingPrograms,
    endedPrograms,
    leader: { code, name: profile.full_name }
  });
}

export async function GET(request: NextRequest) {
  try { return await calculate(request); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không tính được chính sách Trưởng nhóm." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try { return await calculate(request, await request.json().catch(() => ({}))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không tính được chính sách Trưởng nhóm." }, { status: 500 }); }
}
