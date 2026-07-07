import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getVietnamToday } from "@/lib/format";
import { calculatePolicyRewards, policyProgramSummaries } from "@/lib/tvv-policy-rewards";
import { calculateTeamLeaderPolicy } from "@/lib/team-leader-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { RevenueRecord } from "@/lib/types";
import { calculateCompetitionReward } from "@/src/lib/competition/competitionRuleEngine";
import { buildGroupStarVietSummary, buildStarVietReport } from "@/lib/star-viet";
import { readStarVietRecords } from "@/lib/star-viet-data";

type RewardParticipant = {
  code: string;
  name: string;
  groupName?: string;
  contractCount: number;
  ip: number;
  fyp: number;
  fyc: number;
  reward: number;
  detail: string;
};

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
    const rowStamp = String(row.updated_date || row.created_at || "");
    const currentStamp = String(current?.updated_date || current?.created_at || "");
    if (!current || rowStamp >= currentStamp) byContract.set(key, row);
  }
  return [...byContract.values()];
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

function programRange(program: any) {
  const rule = program.confirmed_rule || program.ai_rule || {};
  return {
    start: String(program.start_date || rule.start_date || "").slice(0, 10),
    end: String(program.end_date || rule.end_date || "").slice(0, 10)
  };
}

function monthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const endDay = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(endDay).padStart(2, "0")}` };
}

function quarterRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const quarter = Math.ceil(monthNo / 3);
  const startMonth = (quarter - 1) * 3 + 1;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const endMonth = startMonth + 2;
  const endDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return { start, end: `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`, quarter };
}

function overlaps(range: { start: string; end: string }, start: string, end: string) {
  const rangeStart = range.start || start;
  const rangeEnd = range.end || end;
  return rangeStart <= end && rangeEnd >= start;
}

function toProgram(id: string, name: string, period: string, participants: RewardParticipant[]) {
  return {
    id,
    name,
    period,
    totalReward: participants.reduce((sum, item) => sum + item.reward, 0),
    achievedCount: participants.length,
    participants: participants.sort((a, b) => b.reward - a.reward || b.ip - a.ip || b.fyp - a.fyp)
  };
}

function aggregateCompetitionTvv(program: any, contracts: RevenueRecord[]) {
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
  const byCode = new Map<string, RewardParticipant>();
  const add = (row: any, reward: number, contractCount = 0) => {
    const code = String(row.agentCode || row.agent_code || row.advisorCode || row.advisor_code || "").trim();
    const name = String(row.advisor || row.agentName || row.agent_name || row.advisorName || "").trim();
    const key = code || normalizeText(name);
    if (!key || reward <= 0) return;
    const current = byCode.get(key) ?? {
      code,
      name,
      groupName: String(row.groupName || row.group_name || ""),
      contractCount: 0,
      ip: 0,
      fyp: 0,
      fyc: 0,
      reward: 0,
      detail: "Đạt chương trình thi đua"
    };
    current.contractCount += contractCount || Number(row.contractCount ?? 0);
    current.ip += Number(row.totalIP ?? row.ip ?? 0);
    current.fyp += Number(row.totalAFYP ?? row.afyp ?? row.fyp ?? 0);
    current.reward += reward;
    byCode.set(key, current);
  };
  result.tvvRewardResults.forEach((row: any) => add(row, Number(row.rewardAmount ?? 0), Number(row.contractCount ?? 0)));
  result.contractRewardResults.forEach((row: any) => add(row, Number(row.rewardAmount ?? 0), 1));
  const period = [rule.start_date, rule.end_date].filter(Boolean).join(" - ");
  return toProgram(`competition-tvv-${program.id}`, rule.program_name, period, [...byCode.values()]);
}

function aggregateCompetitionGroups(program: any, contracts: RevenueRecord[]) {
  const storedRule = program.confirmed_rule || program.ai_rule || {};
  const rule = {
    ...storedRule,
    id: program.id,
    program_name: program.program_name || storedRule.program_name || "Chương trình thi đua",
    start_date: program.start_date || storedRule.start_date,
    end_date: program.end_date || storedRule.end_date
  };
  const result = calculateCompetitionReward(rule, contracts);
  const participants = result.groupRewardResults
    .map((row: any) => ({
      code: "",
      name: String(row.group || row.groupName || row.group_name || "Nhóm đạt").trim(),
      groupName: String(row.group || row.groupName || row.group_name || "").trim(),
      contractCount: Number(row.contractCount ?? row.contract_count ?? row.advisors?.length ?? 0),
      ip: Number(row.totalIP ?? row.total_ip ?? row.groupMetric ?? 0),
      fyp: Number(row.totalAFYP ?? row.total_afyp ?? 0),
      fyc: 0,
      reward: Number(row.totalReward ?? row.group_reward_amount ?? 0),
      detail: row.rewardNote || row.reward_note || "Nhóm đạt chương trình thi đua"
    }))
    .filter((row: RewardParticipant) => row.reward > 0);
  const period = [rule.start_date, rule.end_date].filter(Boolean).join(" - ");
  return toProgram(`competition-group-${program.id}`, rule.program_name, period, participants);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });

    const month = String(request.nextUrl.searchParams.get("month") || getVietnamToday().slice(0, 7)).slice(0, 7);
    const period = request.nextUrl.searchParams.get("period") === "quarter" ? "quarter" : "month";
    const selectedRange = period === "quarter" ? quarterRange(month) : { ...monthRange(month), quarter: Math.ceil(Number(month.slice(5, 7)) / 3) };
    const year = month.slice(0, 4);
    const supabase = getSupabaseAdmin();
    const [revenueRows, policyRows, advisorProfiles, programs, starVietRecords] = await Promise.all([
      readAll((from, to) => supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`).range(from, to)),
      readAll((from, to) => supabase.from("tvv_reward_policy_records").select("*").gte("data_month", `${year}-01-01`).lte("data_month", `${year}-12-31`).range(from, to)),
      readAll((from, to) => supabase.from("authorized_users").select("advisor_code,full_name,start_date,advisor_position,position_effective_date,is_active").range(from, to)),
      readAll((from, to) => supabase.from("competition_programs").select("*").range(from, to)),
      readStarVietRecords(supabase, month)
    ]);

    const contracts = deduplicateRevenue(revenueRows as RevenueRecord[]);
    const visiblePrograms = programs.filter((program: any) => program.is_hidden !== true && program.confirmed_rule && overlaps(programRange(program), selectedRange.start, selectedRange.end));
    const policyResult = calculatePolicyRewards({
      selectedMonth: month,
      kpi04: policyRows,
      bc02: contracts,
      advisorProfiles
    });
    const tvvPolicyPrograms = policyProgramSummaries(policyResult, month)
      .filter((program: any) => period === "quarter" ? program.programId === "policy-quarterly" : program.programId === "policy-monthly")
      .map((program: any) => toProgram(
      program.programId,
      program.programName,
      program.period,
      (program.rows ?? [])
        .filter((row: any) => row.achieved || Number(row.reward ?? 0) > 0)
        .map((row: any) => ({
          code: String(row.agentCode || ""),
          name: String(row.agentName || ""),
          groupName: "",
          contractCount: Number(row.contractCount ?? 0),
          ip: Number(row.ip ?? 0),
          fyp: Number(row.fyp ?? 0),
          fyc: Number(row.totalFyc ?? 0),
          reward: Number(row.reward ?? 0),
          detail: row.achievedQuarters ? `Đạt ${row.achievedQuarters.length} quý` : `Tỷ lệ ${Math.round(Number(row.rate ?? 0) * 100)}%`
        }))
    ));

    const latestGroupByAdvisor = new Map<string, string>();
    contracts.forEach((row) => {
      const code = String(row.agent_code ?? "").trim();
      if (code && row.group_name) latestGroupByAdvisor.set(code, row.group_name);
    });
    const groups = [...new Set(contracts.map((row) => String(row.group_name || "").trim()).filter(Boolean))];
    const leaderPolicyRows = groups.map((groupName) => {
      const leader = advisorProfiles.find((profile: any) => normalizeText(profile.full_name).includes(normalizeText(groupName)) || normalizeText(profile.advisor_position).includes("truong"));
      const result = calculateTeamLeaderPolicy({
        month,
        groupName,
        positionEffectiveDate: leader?.position_effective_date,
        groupRecords: contracts.filter((row) => row.group_name === groupName && String(row.issued_date || row.paid_date || "").startsWith(year)),
        latestGroupByAdvisor,
        fycRows: policyRows,
        advisorProfiles,
        asOfDate: getVietnamToday()
      });
      return {
        groupName,
        monthly: result.monthly,
        quarterly: result.quarterly,
        annual: result.annual,
        newManager: result.newManager
      };
    });

    const leaderPrograms = [
      ...(period === "month" ? [toProgram("leader-monthly", "Thưởng tháng Trưởng nhóm", `Tháng ${month.slice(5, 7)}/${year}`, leaderPolicyRows
        .filter((row) => Number(row.monthly.reward) > 0)
        .map((row) => ({ code: "", name: row.groupName, groupName: row.groupName, contractCount: Number(row.monthly.hdc ?? 0), ip: Number(row.monthly.ip ?? 0), fyp: 0, fyc: Number(row.monthly.fyc ?? 0), reward: Number(row.monthly.reward ?? 0), detail: `Tỷ lệ ${Math.round(Number(row.monthly.rate ?? 0) * 100)}%` })))] : []),
      ...(period === "quarter" ? [toProgram("leader-quarterly", "Thưởng quý Trưởng nhóm", `Quý ${selectedRange.quarter}/${year}`, leaderPolicyRows
        .filter((row) => Number(row.quarterly.reward) > 0)
        .map((row) => ({ code: "", name: row.groupName, groupName: row.groupName, contractCount: Number(row.quarterly.contracts?.length ?? 0), ip: Number(row.quarterly.ip ?? 0), fyp: 0, fyc: Number(row.quarterly.fyc ?? 0), reward: Number(row.quarterly.reward ?? 0), detail: row.quarterly.hasNewAdvisor ? "Có TVV mới HĐC" : "Đạt bậc thưởng quý" })))] : [])
    ];

    const competitionContracts = contracts.filter((row) => {
      const paidDate = String(row.paid_date || "");
      return !paidDate || (paidDate >= selectedRange.start && paidDate <= selectedRange.end);
    });
    const tvvCompetitionPrograms = visiblePrograms.map((program: any) => aggregateCompetitionTvv(program, competitionContracts));
    const groupCompetitionPrograms = visiblePrograms.map((program: any) => aggregateCompetitionGroups(program, competitionContracts));
    const starVietReport = buildStarVietReport(starVietRecords);
    const starVietTvvProgram = toProgram("star-viet-tvv", `Sao Việt TVV ${year}`, `Lũy kế đến ${period === "quarter" ? `quý ${selectedRange.quarter}` : `tháng ${month.slice(5, 7)}`}/${year}`, starVietReport.rows
      .filter((row: any) => row.currentRank !== "Chưa đạt" || Number(row.totalAfyp ?? 0) > 0)
      .map((row: any) => ({
        code: String(row.agentCode || ""),
        name: String(row.agentName || ""),
        groupName: String(row.groupName || ""),
        contractCount: 0,
        ip: 0,
        fyp: Number(row.totalAfyp ?? 0),
        fyc: 0,
        reward: 0,
        detail: `${row.currentRank} · ${row.currentTickets} vé · AFYP ${Math.round(Number(row.totalAfyp ?? 0)).toLocaleString("vi-VN")} đ`
      })));
    const starVietGroupProgram = toProgram("star-viet-group", `Sao Việt Trưởng nhóm ${year}`, `Lũy kế đến ${period === "quarter" ? `quý ${selectedRange.quarter}` : `tháng ${month.slice(5, 7)}`}/${year}`, groups
      .map((groupName) => buildGroupStarVietSummary(starVietRecords, groupName))
      .filter((row: any) => row.currentRank !== "Chưa đạt" || Number(row.totalAfyp ?? 0) > 0)
      .map((row: any) => ({
        code: "",
        name: String(row.groupName || ""),
        groupName: String(row.groupName || ""),
        contractCount: 0,
        ip: 0,
        fyp: Number(row.totalAfyp ?? 0),
        fyc: 0,
        reward: 0,
        detail: `${row.currentRank} · ${row.currentTickets} vé · AFYP ${Math.round(Number(row.totalAfyp ?? 0)).toLocaleString("vi-VN")} đ`
      })));

    return NextResponse.json({
      month,
      period,
      range: selectedRange,
      tvv: [...tvvPolicyPrograms, ...tvvCompetitionPrograms, starVietTvvProgram],
      leaders: [...leaderPrograms, ...groupCompetitionPrograms, starVietGroupProgram]
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dữ liệu thưởng." }, { status: 500 });
  }
}
