type Row = Record<string, any>;

export type PolicyFilters = {
  ban?: string;
  group?: string;
  agent?: string;
  agentCode?: string;
  ads?: string;
};

export type PolicyRewardRow = {
  agentCode: string;
  agentName: string;
  ban: string;
  group: string;
  ip: number;
  fyp: number;
  fyc: number;
  estimatedFyc: number;
  totalFyc: number;
  rate: number;
  reward: number;
  achieved: boolean;
  nextTierMinimum: number | null;
  missingToNextTier: number;
  fypFallback: boolean;
  achievedQuarters?: number[];
};

const MONTH_TIERS = [
  { minimum: 12_000_000, rate: 0.1 },
  { minimum: 24_000_000, rate: 0.15 },
  { minimum: 50_000_000, rate: 0.18 }
];
const QUARTER_TIERS = [
  { minimum: 24_000_000, rate: 0.08 },
  { minimum: 60_000_000, rate: 0.1 },
  { minimum: 90_000_000, rate: 0.13 },
  { minimum: 150_000_000, rate: 0.15 },
  { minimum: 250_000_000, rate: 0.18 },
  { minimum: 350_000_000, rate: 0.2 },
  { minimum: 500_000_000, rate: 0.25 }
];
const MONTH_13_REWARDS: Record<number, number> = { 1: 1_000_000, 2: 3_000_000, 3: 5_000_000, 4: 10_000_000 };

const number = (value: unknown) => Number(value) || 0;
const text = (value: unknown) => String(value ?? "").trim();
const monthKey = (value: unknown) => text(value).slice(0, 7);
const quarterOf = (value: unknown) => Math.ceil(Number(monthKey(value).slice(5, 7)) / 3);
const normalizeGyc = (value: unknown) => text(value).toUpperCase().replace(/\s+/g, "");

function applicationNos(row: Row) {
  const raw = row.raw_data?.application_nos;
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,;\n]+/) : [];
  return values.map(normalizeGyc).filter(Boolean);
}

function agentKey(row: Row) {
  return text(row.agent_code) || text(row.agent_name).toLocaleLowerCase("vi");
}

function matches(row: Row, filters: PolicyFilters) {
  if (filters.agentCode && text(row.agent_code) !== filters.agentCode) return false;
  if (filters.agent && text(row.agent_name) !== filters.agent) return false;
  if (filters.ban && text(row.ban_name) !== filters.ban) return false;
  if (filters.group && text(row.group_name) !== filters.group) return false;
  if (filters.ads && text(row.ads_name) !== filters.ads) return false;
  return true;
}

function tierResult(value: number, tiers: typeof MONTH_TIERS) {
  const tier = [...tiers].reverse().find((item) => value >= item.minimum);
  const next = tiers.find((item) => value < item.minimum);
  return {
    rate: tier?.rate ?? 0,
    achieved: Boolean(tier),
    nextTierMinimum: next?.minimum ?? null,
    missingToNextTier: next ? Math.max(0, next.minimum - value) : 0
  };
}

function groupRows(rows: Row[]) {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = agentKey(row);
    if (!key || !text(row.agent_code)) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function aggregate(rows: Row[]): Omit<PolicyRewardRow, "rate" | "reward" | "achieved" | "nextTierMinimum" | "missingToNextTier" | "fypFallback"> {
  const first = rows[0] ?? {};
  return {
    agentCode: text(first.agent_code),
    agentName: text(first.agent_name),
    ban: text(first.ban_name),
    group: text(first.group_name),
    ip: rows.reduce((sum, row) => sum + number(row.ip), 0),
    fyp: rows.reduce((sum, row) => sum + number(row.fyp), 0),
    fyc: rows.reduce((sum, row) => sum + number(row.fyc), 0),
    estimatedFyc: rows.reduce((sum, row) => sum + number(row.estimated_fyc), 0),
    totalFyc: rows.reduce((sum, row) => sum + number(row.fyc) + number(row.estimated_fyc), 0)
  };
}

export function combineKpi04AndBc02(kpiRows: Row[], bc02Rows: Row[]): Row[] {
  const issuedGyc = new Set(kpiRows.flatMap(applicationNos));
  const seenBc02 = new Set<string>();
  const estimatedRows = bc02Rows.flatMap((row) => {
    const gyc = normalizeGyc(row.application_no || row.contract_no);
    if (!gyc || issuedGyc.has(gyc) || seenBc02.has(gyc) || !text(row.agent_code)) return [];
    seenBc02.add(gyc);
    return [{
      ...row,
      data_month: `${monthKey(row.paid_date || row.data_month)}-01`,
      paid_date: text(row.paid_date || row.data_month).slice(0, 10),
      fyc: 0,
      // BC02 thật không được dùng AFYP thay FYP. Riêng bản ghi dự kiến từ
      // máy tính có thể truyền estimated_fyp để ước lượng bậc thưởng quý.
      fyp: number(row.estimated_fyp),
      estimated_fyc: number(row.ip) * 0.3,
      source: "bc02"
    }];
  });
  const normalizedKpi = kpiRows.filter((row) => text(row.agent_code)).map((row) => ({
    ...row,
    paid_date: text(row.data_month).slice(0, 10),
    policy_status: null,
    estimated_fyc: 0,
    source: "kpi04"
  }));
  return [...normalizedKpi, ...estimatedRows];
}

function calculatePeriod(rows: Row[], basis: "ip" | "fyp", tiers: typeof MONTH_TIERS) {
  return [...groupRows(rows).values()].map((agentRows) => {
    const totals = aggregate(agentRows);
    const fypFallback = basis === "fyp" && totals.fyp <= 0 && totals.totalFyc > 0;
    const basisValue = basis === "ip" ? totals.ip : fypFallback ? totals.totalFyc : totals.fyp;
    const tier = tierResult(basisValue, tiers);
    return { ...totals, ...tier, reward: tier.rate * totals.totalFyc, fypFallback };
  }).sort((a, b) => b.reward - a.reward || (basis === "ip" ? b.ip - a.ip : b.fyp - a.fyp));
}

export function calculatePolicyRewards(params: {
  selectedMonth: string;
  kpi04: Row[];
  bc02: Row[];
  filters?: PolicyFilters;
}) {
  const selectedMonth = params.selectedMonth.slice(0, 7);
  const selectedMonthNo = Number(selectedMonth.slice(5, 7));
  const selectedQuarter = Math.ceil(selectedMonthNo / 3);
  const filters = params.filters ?? {};
  const kpi = params.kpi04.filter((row) => matches(row, filters));
  const bc02 = params.bc02.filter((row) => matches(row, filters) && monthKey(row.paid_date || row.data_month) <= selectedMonth);
  const rewardYearContracts = combineKpi04AndBc02(kpi, bc02)
    .filter((row) => monthKey(row.paid_date || row.data_month) <= selectedMonth);
  const rewardMonthContracts = rewardYearContracts.filter((row) => monthKey(row.paid_date || row.data_month) === selectedMonth);
  const quarterRows = rewardYearContracts.filter((row) => quarterOf(row.paid_date || row.data_month) === selectedQuarter);

  const monthly = calculatePeriod(rewardMonthContracts, "ip", MONTH_TIERS);
  const quarterly = calculatePeriod(quarterRows, "fyp", QUARTER_TIERS);
  const quarterResults = new Map<string, PolicyRewardRow[]>();
  for (let quarter = 1; quarter <= selectedQuarter; quarter++) {
    const rows = rewardYearContracts.filter((row) => quarterOf(row.paid_date || row.data_month) === quarter);
    quarterResults.set(String(quarter), calculatePeriod(rows, "fyp", QUARTER_TIERS));
  }
  const annualGroups = groupRows(rewardYearContracts);
  const month13 = [...annualGroups.entries()].map(([key, rows]) => {
    const totals = aggregate(rows);
    const achievedQuarters = [...quarterResults.entries()]
      .filter(([, results]) => results.some((result) => agentKey({ agent_code: result.agentCode, agent_name: result.agentName }) === key && result.achieved))
      .map(([quarter]) => Number(quarter));
    const annualBasis = totals.fyp > 0 ? totals.fyp : totals.totalFyc;
    const count = achievedQuarters.length;
    const achieved = count > 1 || (count === 1 && annualBasis >= 50_000_000);
    const nextCount = Math.min(4, count + 1);
    return {
      ...totals,
      rate: 0,
      reward: achieved ? MONTH_13_REWARDS[count] ?? 0 : 0,
      achieved,
      nextTierMinimum: count === 1 && annualBasis < 50_000_000 ? 50_000_000 : null,
      missingToNextTier: count === 1 ? Math.max(0, 50_000_000 - annualBasis) : Math.max(0, nextCount - count),
      fypFallback: totals.fyp <= 0 && totals.totalFyc > 0,
      achievedQuarters
    };
  }).sort((a, b) => b.reward - a.reward || b.fyp - a.fyp);

  return {
    rewardMonthContracts,
    rewardYearContracts,
    monthly,
    quarterly,
    month13,
    selectedQuarter,
    warnings: [
      ...(kpi.length > 0 && !kpi.some((row) => applicationNos(row).length)
        ? ["Dữ liệu KPI04 hiện chưa có danh sách GYC để đối soát. Vui lòng upload lại KPI04 có cột Số GYC để loại trùng chính xác với BC02."]
        : []),
      ...(quarterly.some((row) => row.fypFallback)
        ? ["Dữ liệu chưa có FYP; hệ thống đang tạm dùng FYC để xác định bậc thưởng quý."]
        : [])
    ]
  };
}

export function policyProgramSummaries(result: ReturnType<typeof calculatePolicyRewards>, selectedMonth: string) {
  const month = Number(selectedMonth.slice(5, 7));
  const year = selectedMonth.slice(0, 4);
  const build = (id: string, name: string, period: string, conditionText: string, rows: PolicyRewardRow[]) => ({
    programId: id,
    programName: name,
    period,
    conditionText,
    estimatedReward: rows.reduce((sum, row) => sum + row.reward, 0),
    achievedCount: rows.filter((row) => row.achieved).length,
    rows,
    isEligible: rows.some((row) => row.achieved),
    warnings: result.warnings
  });
  return [
    build("policy-monthly", "Thưởng Năng suất tháng TVV", `Tháng ${month}/${year}`, "IP tháng từ 12 triệu; thưởng 10%–18% tổng FYC.", result.monthly),
    build("policy-quarterly", "Thưởng Quý TVV", `Quý ${result.selectedQuarter}/${year}`, "FYP quý từ 24 triệu; PR15 mặc định đạt 100%.", result.quarterly),
    build("policy-month-13", "Thưởng Tháng 13", `Lũy kế đến tháng ${month}/${year}`, "Đạt 1–4 quý; trường hợp chỉ đạt 1 quý cần FYP năm từ 50 triệu.", result.month13)
  ];
}
