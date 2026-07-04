import { isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import type { RevenueRecord } from "@/lib/types";

type FycRow = { data_month?: string | null; agent_code?: string | null; fyc?: number | null; raw_data?: Record<string, unknown> | null };
type AdvisorProfile = { advisor_code?: string | null; start_date?: string | null };

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

function newManagerReward(ip: number, hdc: number) {
  if (hdc < 2 || ip < 45_000_000) return 0;
  if (hdc >= 4) return ip >= 85_000_000 ? 8_000_000 : 5_000_000;
  if (hdc === 3) return ip >= 55_000_000 ? 5_000_000 : 3_000_000;
  return 3_000_000;
}

function addYears(date: string, years: number) {
  const value = new Date(`${date}T00:00:00+07:00`);
  value.setFullYear(value.getFullYear() + years);
  return value.toISOString().slice(0, 10);
}

function monthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const endDay = new Date(year, monthNo, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(endDay).padStart(2, "0")}` };
}

function periodData(records: RevenueRecord[], start: string, end: string) {
  const rows = records.filter((row) => {
    const issuedDate = String(row.issued_date || "");
    return issuedDate >= start && issuedDate <= end;
  });
  const valid = rows.filter(isCountedRevenueRecord);
  const issued = valid.filter((row) => normalizeStatusText(row.policy_status) === "co hieu luc");
  const ip = valid.reduce((sum, row) => sum + (Number(row.ip) || 0), 0);
  const byAdvisor = new Map<string, number>();
  issued.forEach((row) => {
    const key = String(row.agent_code || row.agent_name || "").trim();
    if (key) byAdvisor.set(key, (byAdvisor.get(key) ?? 0) + (Number(row.ip) || 0));
  });
  return {
    rows,
    valid,
    issued,
    ip,
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

  const syntheticRows = (params.drafts ?? []).map((draft, index) => ({
    id: `draft-${index}`,
    data_month: `${String(draft.expectedPaidDate || monthStart).slice(0, 7)}-01`,
    ban_name: "",
    group_name: groupName,
    agent_code: draft.advisorCode || `DRAFT-${index}`,
    agent_name: draft.advisorCode || `TVV dự kiến ${index + 1}`,
    contract_no: `DRAFT-${index}`,
    paid_date: draft.expectedPaidDate || monthStart,
    issued_date: draft.expectedIssueDate || draft.expectedPaidDate || monthStart,
    policy_status: "Có hiệu lực",
    ip: Number(draft.ip) || 0,
    afyp: Number(draft.ip) || 0
  })) as RevenueRecord[];
  const records = [...groupRecords, ...syntheticRows];

  const monthly = periodData(records, monthStart, monthEnd);
  const quarterData = periodData(records, quarterStart, quarterEnd);
  const yearData = periodData(records, `${year}-01-01`, `${year}-12-31`);

  function fycForPeriod(startMonth: string, endMonth: string, issuedContracts: RevenueRecord[]) {
    const policyRows = fycRows
      .filter((row) => {
        const rowMonth = String(row.data_month ?? "").slice(0, 7);
        return rowMonth >= startMonth && rowMonth <= endMonth;
      })
      .filter((row) => latestGroupByAdvisor.get(String(row.agent_code ?? "").trim()) === groupName);
    const recordedApplications = new Set<string>();
    policyRows.forEach((row) => {
      const applications = row.raw_data?.application_nos;
      if (Array.isArray(applications)) applications.forEach((value) => {
        const application = String(value ?? "").trim();
        if (application) recordedApplications.add(application);
      });
    });
    const kpiFyc = policyRows.reduce((sum, row) => sum + (Number(row.fyc) || 0), 0);
    const supplementalContracts = issuedContracts.filter((row) => {
      const application = String(row.application_no || row.contract_no || "").trim();
      return application && !recordedApplications.has(application);
    });
    const supplementalFyc = supplementalContracts.reduce((sum, row) => sum + (Number(row.ip) || 0) * 0.3, 0);
    return { total: kpiFyc + supplementalFyc, kpiFyc, supplementalFyc, supplementalContracts };
  }

  const monthlyFyc = fycForPeriod(month, month, monthly.issued);
  const fyc = monthlyFyc.total;
  const developmentRate = monthlyRate(monthly.ip, monthly.hdc);
  const developmentReward = Math.round(fyc * developmentRate);

  const profileByCode = new Map(advisorProfiles.map((profile) => [String(profile.advisor_code ?? "").trim(), profile]));
  const quarterValidByAdvisor = new Map<string, RevenueRecord[]>();
  quarterData.issued.forEach((row) => {
    const code = String(row.agent_code ?? "").trim();
    if (code) quarterValidByAdvisor.set(code, [...(quarterValidByAdvisor.get(code) ?? []), row]);
  });
  const recruitedAdvisors = [...quarterValidByAdvisor.entries()].filter(([code, rows]) => {
    const startDate = profileByCode.get(code)?.start_date;
    if (!startDate || startDate > asOfDate || addYears(startDate, 1) <= asOfDate) return false;
    return rows.some((row) => String(row.issued_date || "") >= startDate && (Number(row.ip) || 0) > 12_000_000);
  }).map(([code]) => code);
  const hasDraftRecruit = (params.drafts ?? []).some((draft) => draft.isNewAdvisor && (Number(draft.ip) || 0) > 12_000_000);
  const hasNewAdvisor = recruitedAdvisors.length > 0 || hasDraftRecruit;
  const recruitmentRate = quarterRate(quarterData.ip, hasNewAdvisor);
  const quarterStartKey = quarterStart.slice(0, 7);
  const quarterEndKey = quarterEnd.slice(0, 7);
  const quarterlyFyc = fycForPeriod(quarterStartKey, quarterEndKey, quarterData.issued);
  const recruitmentReward = Math.round(quarterlyFyc.total * recruitmentRate);

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
        : achievedQuarters === 1 && yearData.ip >= 300_000_000 ? 3_000_000 : 0;

  const anniversaryDate = positionEffectiveDate ? addYears(positionEffectiveDate, 1) : null;
  const newManagerEligible = Boolean(
    positionEffectiveDate
    && anniversaryDate
    && monthEnd >= positionEffectiveDate
    && monthStart < anniversaryDate
  );
  const newManagerPeriod = newManagerEligible && anniversaryDate
    ? periodData(records.filter((row) => String(row.issued_date || "") < anniversaryDate), monthStart, monthEnd)
    : { rows: [], valid: [], issued: [], ip: 0, hdc: 0 };
  const managementReward = newManagerEligible ? newManagerReward(newManagerPeriod.ip, newManagerPeriod.hdc) : 0;

  const nextMonthlyIp = nextIpThreshold(monthly.ip);
  const nextQuarterIp = [150, 270, 450, 600].map((value) => value * 1_000_000).find((value) => value > quarterData.ip) ?? null;

  return {
    month,
    groupName,
    isNewManager: newManagerEligible,
    newManagerUntil: anniversaryDate,
    monthly: {
      ip: monthly.ip, fyc, hdc: monthly.hdc, rate: developmentRate,
      kpiFyc: monthlyFyc.kpiFyc,
      supplementalFyc: monthlyFyc.supplementalFyc,
      reward: developmentReward,
      nextIpTarget: nextMonthlyIp,
      remainingIp: nextMonthlyIp ? Math.max(0, nextMonthlyIp - monthly.ip) : 0,
      contracts: monthly.valid
    },
    quarterly: {
      quarter, ip: quarterData.ip, fyc: quarterlyFyc.total,
      kpiFyc: quarterlyFyc.kpiFyc, supplementalFyc: quarterlyFyc.supplementalFyc,
      rate: recruitmentRate, reward: recruitmentReward,
      hasNewAdvisor, recruitedAdvisorCodes: recruitedAdvisors,
      nextIpTarget: nextQuarterIp,
      remainingIp: nextQuarterIp ? Math.max(0, nextQuarterIp - quarterData.ip) : 0,
      contracts: quarterData.valid
    },
    annual: {
      year, ip: yearData.ip, achievedQuarters, quarters, reward: annualReward,
      projected: true
    },
    newManager: newManagerEligible ? {
      ip: newManagerPeriod.ip, hdc: newManagerPeriod.hdc, reward: managementReward,
      validUntil: anniversaryDate,
      contracts: newManagerPeriod.valid
    } : null,
    totalEstimatedReward: developmentReward + recruitmentReward + annualReward + managementReward
  };
}
