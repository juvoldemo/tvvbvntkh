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
  actualFyp?: number;
  qualificationFyp?: number;
  newAdvisorFactor?: number;
  newAdvisorStartDate?: string | null;
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
const NEW_ADVISOR_MONTHLY_IP = 12_000_000;
const NEW_ADVISOR_MONTHLY_REWARD = 1_000_000;
const NEW_ADVISOR_STAGE_IP = 50_000_000;
const NEW_ADVISOR_STAGE_REWARD = 3_000_000;
const NEW_ADVISOR_FAST_START_IP = 100_000_000;
const NEW_ADVISOR_FAST_START_REWARD = 3_000_000;

const number = (value: unknown) => Number(value) || 0;
const text = (value: unknown) => String(value ?? "").trim();
const monthKey = (value: unknown) => text(value).slice(0, 7);
const quarterOf = (value: unknown) => Math.ceil(Number(monthKey(value).slice(5, 7)) / 3);
const normalizeGyc = (value: unknown) => text(value).toUpperCase().replace(/\s+/g, "");
const rewardSource = (row: Row) => text(row.reward_source || row.source || "kpi04").toLowerCase();
const MONTHLY_PREVIOUS_GYC_MIN_IP = 3_000_000;

function applicationNos(row: Row) {
  const raw = row.raw_data?.application_nos ?? row.line_items?.application_no ?? row.application_no ?? row.contract_no;
  const lineItems = Array.isArray(row.line_items) ? row.line_items.map((item: Row) => item.application_no || item.contract_no) : [];
  const values = [
    ...(Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,;\n]+/) : [raw]),
    ...lineItems
  ];
  return values.map(normalizeGyc).filter(Boolean);
}

function agentKey(row: Row) {
  return text(row.agent_code) || text(row.agent_name).toLocaleLowerCase("vi");
}

function agentMonthKey(row: Row) {
  const month = monthKey(row.paid_date || row.data_month);
  const agent = agentKey(row);
  return agent && month ? `${agent}__${month}` : "";
}

function previousMonthKey(month: string) {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addMonths(month: string, months: number) {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(startMonth: string, endMonth: string) {
  return (Number(endMonth.slice(0, 4)) - Number(startMonth.slice(0, 4))) * 12
    + Number(endMonth.slice(5, 7)) - Number(startMonth.slice(5, 7));
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
  const kpi05AgentMonths = new Set(kpiRows.filter((row) => rewardSource(row) === "kpi05").map(agentMonthKey).filter(Boolean));
  const kpi04Rows = kpiRows.filter((row) => rewardSource(row) !== "kpi05" && !kpi05AgentMonths.has(agentMonthKey(row)));
  const kpi05Rows = kpiRows.filter((row) => rewardSource(row) === "kpi05");
  const kpi04Gyc = new Set(kpi04Rows.flatMap(applicationNos));
  const issuedGyc = new Set([...kpi04Gyc]);
  const seenBc02 = new Set<string>();
  const estimatedRows: Row[] = bc02Rows.flatMap((row) => {
    if (kpi05AgentMonths.has(agentMonthKey(row))) return [];
    const gyc = normalizeGyc(row.application_no || row.contract_no);
    if (!gyc || issuedGyc.has(gyc) || seenBc02.has(gyc) || !text(row.agent_code)) return [];
    seenBc02.add(gyc);
    return [{
      ...row,
      data_month: `${monthKey(row.paid_date || row.data_month)}-01`,
      paid_date: text(row.paid_date || row.data_month).slice(0, 10),
      fyc: 0,
      // Khi chưa có KPI04/KPI05, dùng AFYP (hoặc IP) của hợp đồng đã thu làm
      // FYP dự kiến để TVV vẫn thấy thưởng quý tạm tính. Khi dữ liệu chính thức
      // xuất hiện, cơ chế loại trùng theo TVV/tháng ở trên sẽ thay bản ghi này.
      fyp: number(row.estimated_fyp) || number(row.afyp) || number(row.ip),
      estimated_fyc: number(row.ip) * 0.3,
      source: "bc02"
    }];
  });
  const normalizeKpiRows = (rows: Row[]): Row[] => rows.filter((row) => text(row.agent_code)).map((row) => ({
    ...row,
    paid_date: text(row.data_month).slice(0, 10),
    policy_status: null,
    estimated_fyc: 0,
    source: rewardSource(row)
  }));
  const normalizedKpi04 = normalizeKpiRows(kpi04Rows);
  const seenKpi05 = new Set<string>();
  const normalizedKpi05 = normalizeKpiRows(kpi05Rows).filter((row) => {
    const keys = applicationNos(row);
    if (!keys.length) return true;
    const month = monthKey(row.paid_date || row.data_month);
    const scopedKeys = keys.map((key) => `${month}:${key}`);
    if (scopedKeys.some((key) => seenKpi05.has(key))) return false;
    scopedKeys.forEach((key) => seenKpi05.add(key));
    return true;
  });
  return [...normalizedKpi04, ...normalizedKpi05, ...estimatedRows];
}

function parseDate(value: unknown) {
  const raw = text(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function daysInclusive(start: string, end: string) {
  const startTime = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)));
  const endTime = Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)));
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

function quarterBounds(selectedMonth: string) {
  const year = Number(selectedMonth.slice(0, 4));
  const quarter = Math.ceil(Number(selectedMonth.slice(5, 7)) / 3);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
  };
}

function calculatePeriod(rows: Row[], basis: "ip" | "fyp", tiers: typeof MONTH_TIERS, options: {
  advisorStartDates?: Map<string, string>;
  quarterStart?: string;
  quarterEnd?: string;
  qualifiedAgents?: Set<string>;
} = {}) {
  return [...groupRows(rows).values()].map((agentRows) => {
    const totals = aggregate(agentRows);
    const fypFallback = basis === "fyp" && totals.fyp <= 0 && totals.totalFyc > 0;
    // Chưa có FYP chính thức thì dùng IP của hợp đồng đã vào hệ thống làm
    // căn cứ FYP tạm tính; không dùng FYC ước tính (chỉ khoảng 30% IP).
    let qualificationFyp = fypFallback ? (totals.ip || totals.totalFyc) : totals.fyp;
    let newAdvisorFactor = 1;
    let newAdvisorStartDate: string | null = null;
    if (basis === "fyp" && options.quarterStart && options.quarterEnd) {
      const startDate = options.advisorStartDates?.get(totals.agentCode);
      if (startDate && startDate > options.quarterStart && startDate <= options.quarterEnd) {
        const quarterDays = daysInclusive(options.quarterStart, options.quarterEnd);
        const workingDays = daysInclusive(startDate, options.quarterEnd);
        newAdvisorFactor = workingDays > 0 ? quarterDays / workingDays : 1;
        newAdvisorStartDate = startDate;
        qualificationFyp *= newAdvisorFactor;
      }
    }
    const basisValue = basis === "ip" ? totals.ip : qualificationFyp;
    const tier = tierResult(basisValue, tiers);
    const qualified = !options.qualifiedAgents || options.qualifiedAgents.has(agentKey({
      agent_code: totals.agentCode,
      agent_name: totals.agentName
    }));
    return {
      ...totals,
      ...tier,
      rate: qualified ? tier.rate : 0,
      achieved: qualified ? tier.achieved : false,
      reward: qualified ? tier.rate * totals.totalFyc : 0,
      fypFallback,
      actualFyp: basis === "fyp" ? totals.fyp : undefined,
      qualificationFyp: basis === "fyp" ? qualificationFyp : undefined,
      newAdvisorFactor: basis === "fyp" ? newAdvisorFactor : undefined,
      newAdvisorStartDate
    };
  }).sort((a, b) => b.reward - a.reward || (basis === "ip" ? b.ip - a.ip : b.fyp - a.fyp));
}

function calculateNewAdvisorMonthly(
  rows: Row[],
  selectedMonth: string,
  advisorStartDates: Map<string, string>,
  trainingCompleted: boolean
) {
  return [...groupRows(rows).values()].map((agentRows) => {
    const totals = aggregate(agentRows);
    const startDate = advisorStartDates.get(totals.agentCode);
    const startMonth = monthKey(startDate);
    const tenureMonth = startMonth ? monthDiff(startMonth, selectedMonth) + 1 : 0;
    const achieved = Boolean(startDate && tenureMonth >= 1 && tenureMonth <= 12 && totals.ip >= NEW_ADVISOR_MONTHLY_IP);
    const monthlyReward = trainingCompleted || tenureMonth <= 3
      ? NEW_ADVISOR_MONTHLY_REWARD
      : NEW_ADVISOR_MONTHLY_REWARD / 2;
    return {
      ...totals,
      rate: 0,
      reward: achieved ? monthlyReward : 0,
      achieved,
      nextTierMinimum: achieved ? null : NEW_ADVISOR_MONTHLY_IP,
      missingToNextTier: achieved ? 0 : Math.max(0, NEW_ADVISOR_MONTHLY_IP - totals.ip),
      fypFallback: false,
      newAdvisorStartDate: startDate ?? null,
      tenureMonth,
      trainingCompleted
    };
  }).filter((row) => row.newAdvisorStartDate && row.tenureMonth >= 1 && row.tenureMonth <= 12)
    .sort((a, b) => b.reward - a.reward || b.ip - a.ip);
}

function calculateNewAdvisorStage(rows: Row[], selectedMonth: string, advisorStartDates: Map<string, string>) {
  const selectedRows = rows.filter((row) => monthKey(row.paid_date || row.data_month) <= selectedMonth);
  return [...groupRows(selectedRows).values()].map((agentRows) => {
    const firstTotals = aggregate(agentRows);
    const startDate = advisorStartDates.get(firstTotals.agentCode);
    const startMonth = monthKey(startDate);
    const tenureMonth = startMonth ? monthDiff(startMonth, selectedMonth) + 1 : 0;
    const stageNo = Math.ceil(tenureMonth / 3);
    if (!startDate || tenureMonth < 1 || tenureMonth > 12 || stageNo < 1 || stageNo > 4) return null;

    const stageStart = addMonths(startMonth, (stageNo - 1) * 3);
    const stageEnd = addMonths(stageStart, 2);
    const previousMonth = previousMonthKey(selectedMonth);
    const stageRows = agentRows.filter((row) => {
      const rowMonth = monthKey(row.paid_date || row.data_month);
      return rowMonth >= stageStart && rowMonth <= stageEnd && rowMonth <= selectedMonth;
    });
    const previousStageRows = stageRows.filter((row) => monthKey(row.paid_date || row.data_month) <= previousMonth);
    const totals = aggregate(stageRows);
    const previousIp = previousStageRows.reduce((sum, row) => sum + number(row.ip), 0);
    const stageReward = previousIp < NEW_ADVISOR_STAGE_IP && totals.ip >= NEW_ADVISOR_STAGE_IP ? NEW_ADVISOR_STAGE_REWARD : 0;
    const fastReward = stageNo === 1 && previousIp < NEW_ADVISOR_FAST_START_IP && totals.ip >= NEW_ADVISOR_FAST_START_IP
      ? NEW_ADVISOR_FAST_START_REWARD
      : 0;
    const reward = stageReward + fastReward;
    return {
      ...totals,
      rate: 0,
      reward,
      achieved: reward > 0,
      nextTierMinimum: totals.ip >= NEW_ADVISOR_STAGE_IP ? (stageNo === 1 && totals.ip < NEW_ADVISOR_FAST_START_IP ? NEW_ADVISOR_FAST_START_IP : null) : NEW_ADVISOR_STAGE_IP,
      missingToNextTier: totals.ip >= NEW_ADVISOR_STAGE_IP
        ? (stageNo === 1 ? Math.max(0, NEW_ADVISOR_FAST_START_IP - totals.ip) : 0)
        : Math.max(0, NEW_ADVISOR_STAGE_IP - totals.ip),
      fypFallback: false,
      newAdvisorStartDate: startDate,
      tenureMonth,
      stageNo,
      stageStart,
      stageEnd,
      trainingCompleted: true,
      stageReward,
      fastReward
    };
  }).filter((row): row is NonNullable<typeof row> => Boolean(row)).sort((a: any, b: any) => b.reward - a.reward || b.ip - a.ip);
}

export function calculatePolicyRewards(params: {
  selectedMonth: string;
  kpi04: Row[];
  bc02: Row[];
  advisorProfiles?: Row[];
  filters?: PolicyFilters;
  newAdvisorTrainingCompleted?: boolean;
}) {
  const selectedMonth = params.selectedMonth.slice(0, 7);
  const selectedMonthNo = Number(selectedMonth.slice(5, 7));
  const selectedQuarter = Math.ceil(selectedMonthNo / 3);
  const selectedYearStart = `${selectedMonth.slice(0, 4)}-01`;
  const filters = params.filters ?? {};
  const kpi = params.kpi04.filter((row) => matches(row, filters));
  const bc02 = params.bc02.filter((row) => matches(row, filters) && monthKey(row.paid_date || row.data_month) <= selectedMonth);
  const eligibleContracts = combineKpi04AndBc02(kpi, bc02)
    .filter((row) => monthKey(row.paid_date || row.data_month) <= selectedMonth);
  const rewardYearContracts = eligibleContracts
    .filter((row) => monthKey(row.paid_date || row.data_month) >= selectedYearStart);
  const rewardMonthContracts = rewardYearContracts.filter((row) => monthKey(row.paid_date || row.data_month) === selectedMonth);
  const previousMonth = previousMonthKey(selectedMonth);
  const monthlyQualifiedAgents = new Set(eligibleContracts
    .filter((row) => monthKey(row.paid_date || row.data_month) === previousMonth)
    .filter((row) => number(row.ip) >= MONTHLY_PREVIOUS_GYC_MIN_IP && applicationNos(row).length > 0)
    .map(agentKey)
    .filter(Boolean));
  const quarterRows = rewardYearContracts.filter((row) => quarterOf(row.paid_date || row.data_month) === selectedQuarter);
  const advisorStartDates = new Map((params.advisorProfiles ?? [])
    .map((row) => [text(row.advisor_code || row.agent_code), parseDate(row.start_date)] as const)
    .filter(([code, date]) => code && date) as [string, string][]);
  const selectedQuarterBounds = quarterBounds(selectedMonth);

  const monthly = calculatePeriod(rewardMonthContracts, "ip", MONTH_TIERS, {
    qualifiedAgents: monthlyQualifiedAgents
  });
  const quarterly = calculatePeriod(quarterRows, "fyp", QUARTER_TIERS, {
    advisorStartDates,
    quarterStart: selectedQuarterBounds.start,
    quarterEnd: selectedQuarterBounds.end
  });
  const newAdvisorMonthly = calculateNewAdvisorMonthly(
    rewardMonthContracts,
    selectedMonth,
    advisorStartDates,
    params.newAdvisorTrainingCompleted !== false
  );
  const newAdvisorStage = calculateNewAdvisorStage(eligibleContracts, selectedMonth, advisorStartDates);
  const quarterResults = new Map<string, PolicyRewardRow[]>();
  for (let quarter = 1; quarter <= selectedQuarter; quarter++) {
    const rows = rewardYearContracts.filter((row) => quarterOf(row.paid_date || row.data_month) === quarter);
    const startMonth = (quarter - 1) * 3 + 1;
    const bounds = quarterBounds(`${selectedMonth.slice(0, 4)}-${String(startMonth).padStart(2, "0")}`);
    quarterResults.set(String(quarter), calculatePeriod(rows, "fyp", QUARTER_TIERS, {
      advisorStartDates,
      quarterStart: bounds.start,
      quarterEnd: bounds.end
    }));
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
    newAdvisorMonthly,
    newAdvisorStage,
    month13,
    selectedQuarter,
    warnings: [
      ...(kpi.length > 0 && !kpi.some((row) => applicationNos(row).length)
        ? ["Dữ liệu KPI04 hiện chưa có danh sách GYC để đối soát. Vui lòng upload lại KPI04 có cột Số GYC để loại trùng chính xác với BC02."]
        : []),
      ...(quarterly.some((row) => row.fypFallback)
        ? ["Dữ liệu chưa có FYP; hệ thống đang tạm dùng IP để xác định bậc thưởng quý."]
        : [])
    ]
  };
}

export function policyProgramSummaries(result: ReturnType<typeof calculatePolicyRewards>, selectedMonth: string) {
  const month = Number(selectedMonth.slice(5, 7));
  const year = selectedMonth.slice(0, 4);
  const posterByProgramId: Record<string, string> = {
    "policy-monthly": "/Thưởng năng suất tháng.png",
    "policy-quarterly": "/Thưởng Quý.png",
    "policy-month-13": "/Thưởng tháng 13.png",
    "policy-new-advisor-monthly": "/Thưởng tháng TVV mới.jpg",
    "policy-new-advisor-stage": "/Thưởng chặng TVV mới.png"
  };
  const build = (id: string, name: string, period: string, conditionText: string, rows: PolicyRewardRow[]) => ({
    programId: id,
    programName: name,
    period,
    conditionText: id === "policy-monthly"
      ? "Tháng liền trước có GYC IP từ 3 triệu; IP tháng từ 12 triệu; thưởng 10%-18% tổng FYC."
      : conditionText,
    originalFileUrl: posterByProgramId[id],
    estimatedReward: rows.reduce((sum, row) => sum + row.reward, 0),
    achievedCount: rows.filter((row) => row.achieved).length,
    rows,
    isEligible: rows.some((row) => row.achieved),
    warnings: result.warnings
  });
  return [
    build("policy-monthly", "Thưởng Năng suất tháng TVV", `Tháng ${month}/${year}`, "IP tháng từ 12 triệu; thưởng 10%–18% tổng FYC.", result.monthly),
    build("policy-quarterly", "Thưởng Quý TVV", `Quý ${result.selectedQuarter}/${year}`, "FYP quý từ 24 triệu; PR15 mặc định đạt 100%.", result.quarterly),
    build(
      "policy-new-advisor-monthly",
      "Thưởng tháng TVV mới (TVVm)",
      `Tháng ${month}/${year}`,
      "IP tháng từ 12 triệu: tháng thâm niên 1–3 thưởng 1 triệu; tháng 4–12 thưởng 1 triệu nếu hoàn thành đào tạo, 0,5 triệu nếu chưa hoàn thành.",
      result.newAdvisorMonthly
    ),
    build("policy-new-advisor-stage", "Thưởng Chặng TVV mới", `Lũy kế chặng đến tháng ${month}/${year}`, "Mỗi chặng 3 tháng; IP chặng từ 50 triệu thưởng 3 triệu; riêng chặng 1 đạt 100 triệu cộng thêm 3 triệu.", result.newAdvisorStage),
    build("policy-month-13", "Thưởng Tháng 13", `Lũy kế đến tháng ${month}/${year}`, "Đạt 1–4 quý; trường hợp chỉ đạt 1 quý cần FYP năm từ 50 triệu.", result.month13)
  ].filter((program) => !program.programId.startsWith("policy-new-advisor-") || program.rows.length > 0);
}
