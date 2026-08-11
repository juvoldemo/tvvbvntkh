import { isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import { calculatePolicyRewards, combineKpi04AndBc02 } from "@/lib/tvv-policy-rewards";
import type { RevenueRecord } from "@/lib/types";

type FycRow = {
  data_month?: string | null;
  reward_source?: string | null;
  source?: string | null;
  agent_code?: string | null;
  agent_name?: string | null;
  group_name?: string | null;
  ip?: number | null;
  fyp?: number | null;
  fyc?: number | null;
  raw_data?: Record<string, unknown> | null;
};
type AdvisorProfile = {
  advisor_code?: string | null;
  start_date?: string | null;
  group_name?: string | null;
  is_active?: boolean | null;
};

export type TeamLeaderDraft = {
  advisorCode?: string;
  ip?: number;
  expectedPaidDate?: string;
  expectedIssueDate?: string;
  isNewAdvisor?: boolean;
};

const MONTHLY_THRESHOLDS = [
  { min: 400_000_000, rates: [0.3, 0.28, 0.26, 0.1] },
  { min: 200_000_000, rates: [0.26, 0.22, 0.2, 0.1] },
  { min: 100_000_000, rates: [0.22, 0.2, 0.18, 0.1] },
  { min: 50_000_000, rates: [0.2, 0.18, 0.14, 0.1] },
  { min: 0, rates: [0, 0.16, 0.14, 0.1] }
];

function hdcColumn(hdc: number) {
  if (hdc >= 5) return 0;
  if (hdc >= 3) return 1;
  if (hdc === 2) return 2;
  return 3;
}

function monthlyRate(ip: number, hdc: number) {
  const row = MONTHLY_THRESHOLDS.find((item) => ip >= item.min) ?? MONTHLY_THRESHOLDS.at(-1)!;
  return row.rates[hdcColumn(hdc)] ?? 0;
}

function quarterRate(ip: number, hasNewAdvisor: boolean) {
  if (ip < 150_000_000) return 0;
  if (!hasNewAdvisor) return 0.04;
  if (ip >= 600_000_000) return 0.22;
  if (ip >= 450_000_000) return 0.18;
  if (ip >= 270_000_000) return 0.14;
  return 0.09;
}

export function recruitmentTrainingRate(activeNewAdvisorCount: number) {
  if (activeNewAdvisorCount >= 3) return 1.5;
  if (activeNewAdvisorCount === 2) return 1.25;
  if (activeNewAdvisorCount === 1) return 1;
  return 0;
}

export function calculateRecruitmentTrainingReward(
  activeNewAdvisorCount: number,
  monthlyReward: number,
  stageReward: number
) {
  const rate = recruitmentTrainingRate(activeNewAdvisorCount);
  const totalNewAdvisorReward = Math.max(0, monthlyReward) + Math.max(0, stageReward);
  return {
    activeNewAdvisorCount,
    rate,
    monthlyReward: Math.max(0, monthlyReward),
    stageReward: Math.max(0, stageReward),
    totalNewAdvisorReward,
    reward: Math.round(totalNewAdvisorReward * rate)
  };
}

function newManagerReward(fyp: number, hdc: number) {
  if (hdc < 2 || fyp < 45_000_000) return 0;
  if (hdc >= 4) return fyp >= 85_000_000 ? 8_000_000 : 5_000_000;
  if (hdc === 3) return fyp >= 55_000_000 ? 5_000_000 : 3_000_000;
  return 3_000_000;
}

function addYears(date: string, years: number) {
  const value = new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  ));
  value.setUTCFullYear(value.getUTCFullYear() + years);
  return value.toISOString().slice(0, 10);
}

function earlierDate(left: string, right: string) {
  return left <= right ? left : right;
}

function monthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const endDay = new Date(year, monthNo, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(endDay).padStart(2, "0")}` };
}

function periodData(records: RevenueRecord[], start: string, end: string) {
  const rows = records.filter((row) => {
    const paidDate = String(row.paid_date || "");
    return paidDate >= start && paidDate <= end;
  });
  const valid = rows.filter(isCountedRevenueRecord);
  const issued = valid.filter((row) => normalizeStatusText(row.policy_status) === "co hieu luc");
  const ip = valid.reduce((sum, row) => sum + (Number(row.ip) || 0), 0);
  const fyp = valid.reduce((sum, row) => sum + (Number(row.afyp ?? row.ip) || 0), 0);
  const byAdvisor = new Map<string, number>();
  valid.forEach((row) => {
    const key = String(row.agent_code || row.agent_name || "").trim();
    if (key) byAdvisor.set(key, (byAdvisor.get(key) ?? 0) + (Number(row.ip) || 0));
  });
  return {
    rows,
    valid,
    issued,
    ip,
    fyp,
    hdc: [...byAdvisor.values()].filter((value) => value > 12_000_000).length
  };
}

function nextIpThreshold(ip: number) {
  return [50, 100, 200, 400].map((value) => value * 1_000_000).find((value) => value > ip) ?? null;
}

export function calculateTeamLeaderPolicy(params: {
  month: string;
  groupName: string;
  positionEffectiveDate?: string | null;
  groupRecords: RevenueRecord[];
  allRevenueRecords?: RevenueRecord[];
  latestGroupByAdvisor: Map<string, string>;
  fycRows: FycRow[];
  advisorProfiles: AdvisorProfile[];
  drafts?: TeamLeaderDraft[];
  asOfDate?: string;
}) {
  const { month, groupName, positionEffectiveDate, groupRecords, latestGroupByAdvisor, fycRows, advisorProfiles } = params;
  const asOfDate = params.asOfDate || new Date().toISOString().slice(0, 10);
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const quarter = Math.ceil(monthNo / 3);
  const quarterStartMonth = (quarter - 1) * 3 + 1;
  const quarterStart = `${year}-${String(quarterStartMonth).padStart(2, "0")}-01`;
  const quarterEnd = monthRange(`${year}-${String(quarterStartMonth + 2).padStart(2, "0")}`).end;
  const { start: monthStart, end: monthEnd } = monthRange(month);
  const quarterlyEvaluationDate = earlierDate(asOfDate, quarterEnd);

  const syntheticRows = (params.drafts ?? []).map((draft, index) => ({
    id: `draft-${index}`,
    data_month: `${String(draft.expectedPaidDate || monthStart).slice(0, 7)}-01`,
    ban_name: "",
    group_name: groupName,
    agent_code: draft.advisorCode || `DRAFT-${index}`,
    agent_name: draft.advisorCode || `TVV dự kiến ${index + 1}`,
    contract_no: `DRAFT-${index}`,
    paid_date: draft.expectedPaidDate || monthStart,
    // A draft has no official KPI04/KPI05 row yet. Keep it unissued in the
    // synthetic BC02 data so combineKpi04AndBc02 can estimate its FYC.
    issued_date: null,
    policy_status: "Có hiệu lực",
    ip: Number(draft.ip) || 0,
    afyp: Number(draft.ip) || 0
  })) as RevenueRecord[];
  const records = [...groupRecords, ...syntheticRows];
  const policyRewardRecords = [...(params.allRevenueRecords ?? groupRecords), ...syntheticRows];
  const rewardAdvisorProfiles: AdvisorProfile[] = [
    ...advisorProfiles,
    ...(params.drafts ?? []).flatMap((draft) => draft.isNewAdvisor && draft.advisorCode ? [{
      advisor_code: draft.advisorCode,
      start_date: draft.expectedIssueDate || draft.expectedPaidDate || monthStart,
      group_name: groupName,
      is_active: true
    }] : [])
  ];

  const monthly = periodData(records, monthStart, monthEnd);
  const quarterData = periodData(records, quarterStart, quarterEnd);
  const yearData = periodData(records, `${year}-01-01`, `${year}-12-31`);

  function fycForPeriod(startMonth: string, endMonth: string, periodContracts: RevenueRecord[]) {
    const policyRows = fycRows
      .filter((row) => {
        const rowMonth = String(row.data_month ?? "").slice(0, 7);
        return rowMonth >= startMonth && rowMonth <= endMonth;
      })
      .filter((row) => latestGroupByAdvisor.get(String(row.agent_code ?? "").trim()) === groupName);
    const combinedRows = combineKpi04AndBc02(policyRows, periodContracts);
    const rowsBySource = (source: "kpi04" | "kpi05" | "bc02") =>
      combinedRows.filter((row) => String(row.source ?? "").toLowerCase() === source);
    const kpi04Rows = rowsBySource("kpi04");
    const kpi05Rows = rowsBySource("kpi05");
    const bc02Rows = rowsBySource("bc02");
    const kpi04Fyc = kpi04Rows.reduce((sum, row) => sum + (Number(row.fyc) || 0), 0);
    const kpi05Fyc = kpi05Rows.reduce((sum, row) => sum + (Number(row.fyc) || 0), 0);
    const bc02Fyc = bc02Rows.reduce((sum, row) => sum + (Number(row.estimated_fyc) || 0), 0);
    const fyp = combinedRows.reduce((sum, row) => sum + (Number(row.fyp) || 0), 0);
    const fypByAdvisor = new Map<string, { advisorCode: string; advisorName: string; fyp: number }>();
    combinedRows.forEach((row) => {
      const advisorCode = String(row.agent_code ?? "").trim();
      const advisorName = String(row.agent_name ?? (advisorCode || "TVV")).trim();
      const key = advisorCode || advisorName;
      const current = fypByAdvisor.get(key) ?? { advisorCode, advisorName, fyp: 0 };
      current.fyp += Number(row.fyp) || 0;
      fypByAdvisor.set(key, current);
    });
    return {
      total: kpi04Fyc + kpi05Fyc + bc02Fyc,
      fyp,
      fypBreakdown: [...fypByAdvisor.values()].filter((row) => row.fyp > 0).sort((a, b) => b.fyp - a.fyp),
      kpiFyc: kpi04Fyc + kpi05Fyc,
      kpi04Fyc,
      kpi05Fyc,
      supplementalFyc: bc02Fyc,
      bc02Fyc,
      supplementalContracts: bc02Rows as RevenueRecord[]
    };
  }

  const monthlyFyc = fycForPeriod(month, month, monthly.valid);
  const fyc = monthlyFyc.total;
  const developmentRate = monthlyRate(monthly.ip, monthly.hdc);
  const developmentReward = Math.round(fyc * developmentRate);

  const profileByCode = new Map(rewardAdvisorProfiles.map((profile) => [String(profile.advisor_code ?? "").trim(), profile]));
  const quarterValidByAdvisor = new Map<string, RevenueRecord[]>();
  quarterData.valid.forEach((row) => {
    const code = String(row.agent_code ?? "").trim();
    if (code) quarterValidByAdvisor.set(code, [...(quarterValidByAdvisor.get(code) ?? []), row]);
  });
  const recruitedAdvisors = [...quarterValidByAdvisor.entries()].filter(([code, rows]) => {
    const startDate = profileByCode.get(code)?.start_date;
    if (!startDate || startDate > quarterlyEvaluationDate || addYears(startDate, 1) <= quarterlyEvaluationDate) return false;
    return rows
      .filter((row) => String(row.paid_date || "") >= startDate)
      .reduce((sum, row) => sum + (Number(row.ip) || 0), 0) > 12_000_000;
  }).map(([code]) => code);
  const hasDraftRecruit = (params.drafts ?? []).some((draft) => draft.isNewAdvisor && (Number(draft.ip) || 0) > 12_000_000);
  const hasNewAdvisor = recruitedAdvisors.length > 0 || hasDraftRecruit;
  const recruitmentRate = quarterRate(quarterData.ip, hasNewAdvisor);
  const quarterStartKey = quarterStart.slice(0, 7);
  const quarterEndKey = quarterEnd.slice(0, 7);
  const quarterlyFyc = fycForPeriod(quarterStartKey, quarterEndKey, quarterData.valid);
  const recruitmentReward = Math.round(quarterlyFyc.total * recruitmentRate);
  const annualSources = fycForPeriod(`${year}-01`, `${year}-12`, yearData.valid);
  const annualFyp = annualSources.fyp > 0 ? annualSources.fyp : annualSources.total;

  const quarters = [1, 2, 3, 4].map((quarterNo) => {
    const startMonth = (quarterNo - 1) * 3 + 1;
    const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const end = monthRange(`${year}-${String(startMonth + 2).padStart(2, "0")}`).end;
    const value = periodData(records, start, end).ip;
    return { quarter: quarterNo, ip: value, achieved: value >= 150_000_000 };
  });
  const achievedQuarters = quarters.filter((item) => item.achieved).length;
  const annualReward = achievedQuarters >= 4 ? 20_000_000
    : achievedQuarters === 3 ? 10_000_000
      : achievedQuarters === 2 ? 6_000_000
        : achievedQuarters === 1 && annualFyp >= 300_000_000 ? 3_000_000 : 0;

  const anniversaryDate = positionEffectiveDate ? addYears(positionEffectiveDate, 1) : null;
  const newManagerEligible = Boolean(
    positionEffectiveDate
    && anniversaryDate
    && month >= positionEffectiveDate.slice(0, 7)
    && month < anniversaryDate.slice(0, 7)
  );
  const newManagerIneligibilityReason = newManagerEligible ? ""
    : !positionEffectiveDate ? "Chưa có Ngày hiệu lực chức vụ để xác định thâm niên."
      : month < positionEffectiveDate.slice(0, 7) ? "Tháng xét trước tháng hiệu lực chức vụ."
        : "Chỉ áp dụng trong 12 tháng chức vụ đầu tiên.";
  const newManagerPeriod = newManagerEligible
    ? periodData(records, monthStart, monthEnd)
    : { rows: [], valid: [], issued: [], ip: 0, fyp: 0, hdc: 0 };
  const newManagerFyp = newManagerEligible ? newManagerPeriod.fyp : 0;
  const newManagerFypByAdvisor = new Map<string, { advisorCode: string; advisorName: string; fyp: number }>();
  newManagerPeriod.valid.forEach((row) => {
    const advisorCode = String(row.agent_code ?? "").trim();
    const advisorName = String(row.agent_name ?? (advisorCode || "TVV")).trim();
    const key = advisorCode || advisorName;
    const current = newManagerFypByAdvisor.get(key) ?? { advisorCode, advisorName, fyp: 0 };
    current.fyp += Number(row.afyp ?? row.ip) || 0;
    newManagerFypByAdvisor.set(key, current);
  });
  const managementReward = newManagerEligible ? newManagerReward(newManagerFyp, newManagerPeriod.hdc) : 0;
  const newManagerMilestones = newManagerEligible ? [
    { reward: 3_000_000, options: [{ hdc: 2, fyp: 45_000_000 }] },
    { reward: 5_000_000, options: [{ hdc: 3, fyp: 55_000_000 }, { hdc: 4, fyp: 45_000_000 }] },
    { reward: 8_000_000, options: [{ hdc: 4, fyp: 85_000_000 }] }
  ].filter((tier) => tier.reward > managementReward).slice(0, 2).map((tier) => {
    const option = [...tier.options].sort((left, right) => {
      const leftScore = Math.max(0, left.hdc - newManagerPeriod.hdc) * 10
        + Math.max(0, left.fyp - newManagerFyp) / 1_000_000;
      const rightScore = Math.max(0, right.hdc - newManagerPeriod.hdc) * 10
        + Math.max(0, right.fyp - newManagerFyp) / 1_000_000;
      return leftScore - rightScore;
    })[0];
    const missingFyp = Math.max(0, option.fyp - newManagerFyp);
    const missingHdc = Math.max(0, option.hdc - newManagerPeriod.hdc);
    return {
      title: `Mốc thưởng ${tier.reward.toLocaleString("vi-VN")} đ`,
      subtitle: `Cần FYP nhóm từ ${option.fyp.toLocaleString("vi-VN")} đ và từ ${option.hdc} TVV HĐC`,
      missing: missingFyp > 0 ? missingFyp : missingHdc,
      missingLabel: missingFyp > 0 ? "FYP nhóm" : "TVV HĐC",
      estimatedContracts: 0,
      projectedReward: tier.reward,
      incrementalReward: Math.max(0, tier.reward - managementReward)
    };
  }) : [];

  const currentGroupForAdvisor = (code: string) => {
    const profileGroup = String(profileByCode.get(code)?.group_name ?? "").trim();
    return profileGroup || latestGroupByAdvisor.get(code) || "";
  };
  const directlyManagedNewAdvisorCodes = new Set(rewardAdvisorProfiles.flatMap((profile) => {
    const code = String(profile.advisor_code ?? "").trim();
    const startDate = String(profile.start_date ?? "").slice(0, 10);
    if (!code || !startDate || startDate > monthEnd || profile.is_active === false) return [];
    return currentGroupForAdvisor(code) === groupName ? [code] : [];
  }));
  const monthlyIpByAdvisor = new Map<string, number>();
  monthly.valid.forEach((row) => {
    const code = String(row.agent_code ?? "").trim();
    if (directlyManagedNewAdvisorCodes.has(code)) {
      monthlyIpByAdvisor.set(code, (monthlyIpByAdvisor.get(code) ?? 0) + (Number(row.ip) || 0));
    }
  });
  // Monthly rewards are calculated from the selected month by calculatePolicyRewards.
  // Stage rewards still need prior rows in the stage to detect a milestone reached
  // specifically in the selected month (prior cumulative < target, current cumulative >= target).
  const newAdvisorPolicy = calculatePolicyRewards({
    selectedMonth: month,
    kpi04: fycRows,
    bc02: policyRewardRecords,
    advisorProfiles: rewardAdvisorProfiles
  });
  const rewardEligibleNewAdvisorCodes = new Set([
    ...newAdvisorPolicy.newAdvisorMonthly.map((row) => row.agentCode),
    ...newAdvisorPolicy.newAdvisorStage.map((row) => row.agentCode)
  ]);
  const activeNewAdvisorCodes = [...monthlyIpByAdvisor.entries()]
    .filter(([code, ip]) => ip > 12_000_000 && rewardEligibleNewAdvisorCodes.has(code))
    .map(([code]) => code);
  const newAdvisorRewardsByCode = new Map<string, { monthlyReward: number; stageReward: number }>();
  newAdvisorPolicy.newAdvisorMonthly.forEach((row) => {
    if (!directlyManagedNewAdvisorCodes.has(row.agentCode)) return;
    const current = newAdvisorRewardsByCode.get(row.agentCode) ?? { monthlyReward: 0, stageReward: 0 };
    current.monthlyReward += Number(row.reward) || 0;
    newAdvisorRewardsByCode.set(row.agentCode, current);
  });
  newAdvisorPolicy.newAdvisorStage.forEach((row) => {
    if (!directlyManagedNewAdvisorCodes.has(row.agentCode)) return;
    const current = newAdvisorRewardsByCode.get(row.agentCode) ?? { monthlyReward: 0, stageReward: 0 };
    current.stageReward += Number(row.reward) || 0;
    newAdvisorRewardsByCode.set(row.agentCode, current);
  });
  const recruitmentTrainingAdvisors = [...newAdvisorRewardsByCode.entries()].map(([advisorCode, rewards]) => ({
    advisorCode,
    ...rewards,
    totalReward: rewards.monthlyReward + rewards.stageReward,
    isHdc: activeNewAdvisorCodes.includes(advisorCode)
  }));
  const trainingCalculation = calculateRecruitmentTrainingReward(
    activeNewAdvisorCodes.length,
    recruitmentTrainingAdvisors.reduce((sum, row) => sum + row.monthlyReward, 0),
    recruitmentTrainingAdvisors.reduce((sum, row) => sum + row.stageReward, 0)
  );
  const { totalNewAdvisorReward, rate: trainingRate, reward: recruitmentTrainingReward } = trainingCalculation;
  const recruitmentTrainingMilestones = [
    { count: 1, rate: 1 },
    { count: 2, rate: 1.25 },
    { count: 3, rate: 1.5 }
  ].filter((tier) => tier.count > activeNewAdvisorCodes.length).slice(0, 2).map((tier) => ({
    title: `Đạt ${tier.count === 3 ? "từ 3" : tier.count} TVV mới HĐC`,
    subtitle: `Tỷ lệ ${Math.round(tier.rate * 100)}% tổng thưởng TVV mới`,
    missing: tier.count - activeNewAdvisorCodes.length,
    missingLabel: "TVV mới HĐC",
    estimatedContracts: 0,
    projectedReward: Math.round(totalNewAdvisorReward * tier.rate),
    incrementalReward: Math.max(0, Math.round(totalNewAdvisorReward * tier.rate) - recruitmentTrainingReward)
  }));

  const nextMonthlyIp = nextIpThreshold(monthly.ip);
  const nextQuarterIp = [150, 270, 450, 600].map((value) => value * 1_000_000).find((value) => value > quarterData.ip) ?? null;
  const monthlyMilestones = [50, 100, 200, 400]
    .map((value) => value * 1_000_000)
    .filter((target) => target > monthly.ip)
    .slice(0, 2)
    .map((target) => {
      const missing = target - monthly.ip;
      const rate = monthlyRate(target, monthly.hdc);
      const projectedReward = Math.round((fyc + missing * 0.3) * rate);
      return {
        title: `IP nhóm tháng đạt ${target.toLocaleString("vi-VN")} đ`,
        subtitle: `Bậc thưởng ${Math.round(rate * 100)}% với ${monthly.hdc} TVV HĐC`,
        missing,
        missingLabel: "IP nhóm",
        estimatedContracts: 0,
        projectedReward,
        incrementalReward: Math.max(0, projectedReward - developmentReward)
      };
    });
  const quarterlyMilestones = [150, 270, 450, 600]
    .map((value) => value * 1_000_000)
    .filter((target) => target > quarterData.ip)
    .slice(0, 2)
    .map((target) => {
      const missing = target - quarterData.ip;
      const rate = quarterRate(target, hasNewAdvisor);
      const projectedReward = Math.round((quarterlyFyc.total + missing * 0.3) * rate);
      return {
        title: `IP nhóm quý đạt ${target.toLocaleString("vi-VN")} đ`,
        subtitle: `Bậc thưởng ${Math.round(rate * 100)}%${hasNewAdvisor ? " có TVV mới HĐC" : ""}`,
        missing,
        missingLabel: "IP nhóm",
        estimatedContracts: 0,
        projectedReward,
        incrementalReward: Math.max(0, projectedReward - recruitmentReward)
      };
    });
  const annualRewardByQuarter: Record<number, number> = { 1: 3_000_000, 2: 6_000_000, 3: 10_000_000, 4: 20_000_000 };
  const annualMilestones = [1, 2, 3, 4]
    .filter((target) => target > achievedQuarters)
    .slice(0, 2)
    .map((target) => ({
      title: `Đạt ${target}/4 quý`,
      subtitle: target === 1 ? "Cần FYP năm từ 300 triệu để nhận thưởng" : "Mốc thưởng năm Trưởng nhóm",
      missing: target - achievedQuarters,
      missingLabel: "quý đạt",
      estimatedContracts: 0,
      projectedReward: annualRewardByQuarter[target],
      incrementalReward: Math.max(0, annualRewardByQuarter[target] - annualReward)
    }));

  return {
    month,
    groupName,
    isNewManager: newManagerEligible,
    newManagerUntil: anniversaryDate,
    newManagerStatus: {
      eligible: newManagerEligible,
      positionEffectiveDate: positionEffectiveDate ?? null,
      validUntil: anniversaryDate,
      reason: newManagerIneligibilityReason
    },
    monthly: {
      ip: monthly.ip, fyc, hdc: monthly.hdc, rate: developmentRate,
      kpiFyc: monthlyFyc.kpiFyc,
      kpi04Fyc: monthlyFyc.kpi04Fyc,
      kpi05Fyc: monthlyFyc.kpi05Fyc,
      supplementalFyc: monthlyFyc.supplementalFyc,
      bc02Fyc: monthlyFyc.bc02Fyc,
      reward: developmentReward,
      nextIpTarget: nextMonthlyIp,
      remainingIp: nextMonthlyIp ? Math.max(0, nextMonthlyIp - monthly.ip) : 0,
      milestones: monthlyMilestones,
      contracts: monthly.valid
    },
    quarterly: {
      quarter, ip: quarterData.ip, fyc: quarterlyFyc.total,
      kpiFyc: quarterlyFyc.kpiFyc,
      kpi04Fyc: quarterlyFyc.kpi04Fyc,
      kpi05Fyc: quarterlyFyc.kpi05Fyc,
      supplementalFyc: quarterlyFyc.supplementalFyc,
      bc02Fyc: quarterlyFyc.bc02Fyc,
      rate: recruitmentRate, reward: recruitmentReward,
      hasNewAdvisor, recruitedAdvisorCodes: recruitedAdvisors,
      nextIpTarget: nextQuarterIp,
      remainingIp: nextQuarterIp ? Math.max(0, nextQuarterIp - quarterData.ip) : 0,
      milestones: quarterlyMilestones,
      contracts: quarterData.valid
    },
    annual: {
      year,
      ip: yearData.ip,
      fyp: annualFyp,
      fypFallback: annualSources.fyp <= 0 && annualSources.total > 0,
      kpi04Fyc: annualSources.kpi04Fyc,
      kpi05Fyc: annualSources.kpi05Fyc,
      bc02Fyc: annualSources.bc02Fyc,
      achievedQuarters, quarters, reward: annualReward,
      milestones: annualMilestones,
      projected: true
    },
    newManager: newManagerEligible ? {
      fyp: newManagerFyp,
      fypFallback: false,
      fypSource: "bc02",
      fypBreakdown: [...newManagerFypByAdvisor.values()].filter((row) => row.fyp > 0).sort((a, b) => b.fyp - a.fyp),
      hdc: newManagerPeriod.hdc,
      reward: managementReward,
      validUntil: anniversaryDate,
      contracts: newManagerPeriod.valid,
      milestones: newManagerMilestones
    } : null,
    recruitmentTraining: {
      activeNewAdvisorCount: activeNewAdvisorCodes.length,
      activeNewAdvisorCodes,
      rate: trainingRate,
      monthlyReward: recruitmentTrainingAdvisors.reduce((sum, row) => sum + row.monthlyReward, 0),
      stageReward: recruitmentTrainingAdvisors.reduce((sum, row) => sum + row.stageReward, 0),
      totalNewAdvisorReward,
      reward: recruitmentTrainingReward,
      advisors: recruitmentTrainingAdvisors,
      milestones: recruitmentTrainingMilestones
    },
    totalEstimatedReward: developmentReward + recruitmentReward + annualReward + managementReward + recruitmentTrainingReward
  };
}
