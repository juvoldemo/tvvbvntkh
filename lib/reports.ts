import { getEffectiveMonthlyPlan } from "./afyp-plan";
import { getVietnamToday, getVietnamYesterday, monthBounds } from "./format";
import type { DashboardFilters, MonthlyTarget, RevenueRecord } from "./types";

function inRange(date: string, start?: string, end?: string) {
  return (!start || date >= start) && (!end || date <= end);
}

function isAgentCodeLike(value: unknown) {
  return /^D\d+/i.test(String(value ?? "").trim());
}

function isAdsCodeLike(value: unknown) {
  return /^L\d+/i.test(String(value ?? "").trim());
}

function visibleAgentName(record: RevenueRecord) {
  const name = String(record.agent_name ?? "").trim();
  return name && !isAgentCodeLike(name) ? name : "";
}

function visibleAdsName(record: RevenueRecord) {
  const name = String(record.ads_name ?? "").trim();
  return name && !isAdsCodeLike(name) ? name : "";
}

const EXCLUDED_OVERVIEW_REVENUE_STATUSES = new Set([
  "hết hiệu lực",
  "ycbh hết hiệu lực",
  "từ chối",
  "trì hoãn"
]);

export const EXCLUDED_RANKING_STATUSES = new Set([
  "ycbh hết hiệu lực",
  "từ chối",
  "trì hoãn"
]);

function rawStatusValue(record: RevenueRecord) {
  const raw = record.raw_data ?? {};
  return record.policy_status
    ?? raw["Trạng thái hợp đồng"]
    ?? raw["Trạng thái"]
    ?? raw["trang_thai"]
    ?? raw["status"]
    ?? raw["Trạng thái hồ sơ"]
    ?? raw["Tình trạng"]
    ?? null;
}

function normalizedStatus(record: RevenueRecord) {
  return String(rawStatusValue(record) ?? "").trim().toLocaleLowerCase("vi-VN");
}

export function isOverviewRevenueRecord(record: RevenueRecord) {
  return !EXCLUDED_OVERVIEW_REVENUE_STATUSES.has(normalizedStatus(record));
}

export function isExcludedRankingStatus(record: RevenueRecord) {
  return EXCLUDED_RANKING_STATUSES.has(normalizedStatus(record));
}

export function isValidForRanking(record: RevenueRecord) {
  return !isExcludedRankingStatus(record);
}

export function applyFilters(records: RevenueRecord[], filters: DashboardFilters) {
  const bounds = monthBounds(filters.month);
  const start = filters.paidDate || bounds.start;
  const end = filters.paidDate || bounds.end;

  return records.filter((record) => {
    if (!inRange(record.paid_date, start, end)) return false;
    if (filters.ban && record.ban_name !== filters.ban) return false;
    if (filters.group && record.group_name !== filters.group) return false;
    if (filters.agent && visibleAgentName(record) !== filters.agent) return false;
    if (filters.ads && visibleAdsName(record) !== filters.ads) return false;
    if (filters.status && record.policy_status !== filters.status) return false;
    return true;
  });
}

export function sortContractDetails(records: RevenueRecord[]) {
  return [...records].sort((a, b) => {
    const dateDiff = new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (Number(b.afyp) || 0) - (Number(a.afyp) || 0);
  });
}

export function sumAfyp(records: RevenueRecord[]) {
  return records.reduce((sum, record) => sum + (Number(record.afyp) || 0), 0);
}

export function sumIp(records: RevenueRecord[]) {
  return records.reduce((sum, record) => sum + (Number(record.ip) || 0), 0);
}

export function countDistinct(records: RevenueRecord[], key: keyof RevenueRecord) {
  return new Set(records.map((record) => record[key]).filter(Boolean)).size;
}

export function countContracts(records: RevenueRecord[]) {
  const keys = records.map((record, index) => {
    const contractNo = String(record.contract_no ?? "").trim();
    if (contractNo) return contractNo;
    const rawNum = record.raw_data?.["Num"] ?? record.raw_data?.["num"] ?? record.raw_data?.["Số thứ tự"] ?? record.raw_data?.["STT"];
    const num = String(rawNum ?? "").trim();
    return num || `row-${index}`;
  });
  return new Set(keys).size;
}

export function countDistinctActiveAgents(records: RevenueRecord[]) {
  return new Set(records.map(visibleAgentName).filter(Boolean)).size;
}

function activeStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase() === "có hiệu lực";
}

function normalizePolicyStatus(status?: string | null) {
  return String(status ?? "").trim().toLocaleLowerCase("vi-VN");
}

const PENDING_PROCESS_STATUSES = new Set([
  "chờ kiểm tra ycbh",
  "cnbh chuẩn",
  "chờ đgrr",
  "cnbh có điều kiện",
  "đang đgrr"
]);

const REFUND_STATUSES = new Set([
  "ycbh hết hiệu lực",
  "từ chối",
  "trì hoãn"
]);

const STATUS_TABLE_DEFINITIONS = [
  { key: "active", label: "Có hiệu lực", statuses: ["có hiệu lực"] },
  { key: "waiting_ycbh", label: "Chờ kiểm tra YCBH", statuses: ["chờ kiểm tra ycbh"] },
  { key: "cnbh_standard", label: "CNBH chuẩn", statuses: ["cnbh chuẩn"] },
  { key: "waiting_dgrr", label: "Chờ ĐGRR", statuses: ["chờ đgrr"] },
  { key: "cnbh_conditional", label: "CNBH có điều kiện", statuses: ["cnbh có điều kiện"] },
  { key: "in_dgrr", label: "Đang ĐGRR", statuses: ["đang đgrr"] },
  { key: "refund", label: "Hoàn phí", statuses: [...REFUND_STATUSES] }
];

export function statusBucket(status?: string | null) {
  const normalized = String(status ?? "").trim();
  if (normalized === "Có hiệu lực") return "active";
  if (["CNBH chuẩn", "CNBH có điều kiện"].includes(normalized)) return "approved_pending_or_issued";
  if (["Chờ ĐGRR", "Đang ĐGRR", "Chờ kiểm tra YCBH"].includes(normalized)) return "pending";
  if (normalized === "Từ chối") return "rejected";
  return "unknown";
}

export function buildOverview(records: RevenueRecord[], month: string, target?: MonthlyTarget | null) {
  const today = getVietnamToday();
  const yesterday = getVietnamYesterday();
  const monthlyAfyp = sumAfyp(records);
  const monthlyIp = sumIp(records);
  const todayAfyp = sumAfyp(records.filter((record) => record.paid_date === today));
  const yesterdayAfyp = sumAfyp(records.filter((record) => record.paid_date === yesterday));
  const changeAmount = todayAfyp - yesterdayAfyp;
  const changePercent = yesterdayAfyp > 0 ? (changeAmount / yesterdayAfyp) * 100 : null;
  const targetValue = getEffectiveMonthlyPlan(month, target).plan;

  return {
    monthlyAfyp,
    monthlyIp,
    totalContracts: countDistinct(records, "contract_no"),
    activeAgents: countDistinctActiveAgents(records),
    activePolicies: records.filter((record) => activeStatus(record.policy_status)).length,
    todayAfyp,
    yesterdayAfyp,
    todayDate: today,
    yesterdayDate: yesterday,
    changeAmount,
    changePercent,
    comparisonLabel: yesterdayAfyp > 0 ? null : "Không có dữ liệu so sánh",
    monthlyTargetAfyp: targetValue,
    achievementRate: targetValue > 0 ? (monthlyAfyp / targetValue) * 100 : null
  };
}

export function buildGroupRanking(records: RevenueRecord[]) {
  const totalAfyp = sumAfyp(records);
  const grouped = new Map<string, RevenueRecord[]>();
  records.forEach((record) => {
    const key = `${record.ban_name}__${record.group_name}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  return [...grouped.entries()]
    .map(([, items]) => {
      const afyp = sumAfyp(items);
      const contracts = countDistinct(items, "contract_no");
      return {
        banName: items[0]?.ban_name ?? "",
        groupName: items[0]?.group_name ?? "",
        afyp,
        ip: sumIp(items),
        contractCount: contracts,
        agentCount: new Set(items.map(visibleAgentName).filter(Boolean)).size,
        afypShare: totalAfyp > 0 ? (afyp / totalAfyp) * 100 : 0,
        averageAfypPerContract: contracts > 0 ? afyp / contracts : 0
      };
    })
    .sort((a, b) => b.afyp - a.afyp)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

export function buildAgentRanking(records: RevenueRecord[]) {
  const grouped = new Map<string, RevenueRecord[]>();
  records.forEach((record) => {
    const key = visibleAgentName(record);
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  return [...grouped.entries()]
    .map(([, items]) => {
      const afyp = sumAfyp(items);
      const contracts = countDistinct(items, "contract_no");
      return {
        agentCode: items[0]?.agent_code ?? "",
        agentName: visibleAgentName(items[0]),
        banName: items[0]?.ban_name ?? "",
        groupName: items[0]?.group_name ?? "",
        adsName: items[0]?.ads_name ?? "",
        afyp,
        ip: sumIp(items),
        contractCount: contracts,
        averageAfypPerContract: contracts > 0 ? afyp / contracts : 0
      };
    })
    .sort((a, b) => b.afyp - a.afyp)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

export function buildAdsReport(records: RevenueRecord[]) {
  const totalAfyp = sumAfyp(records);
  const grouped = new Map<string, RevenueRecord[]>();
  records.forEach((record) => {
    const key = visibleAdsName(record) || "Không xác định";
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  return [...grouped.values()]
    .map((items) => {
      const afyp = sumAfyp(items);
      return {
        adsCode: items[0]?.ads_code ?? "",
        adsName: visibleAdsName(items[0]) || "Không xác định",
        afyp,
        ip: sumIp(items),
        contractCount: countDistinct(items, "contract_no"),
        agentCount: new Set(items.map(visibleAgentName).filter(Boolean)).size,
        afypShare: totalAfyp > 0 ? (afyp / totalAfyp) * 100 : 0
      };
    })
    .sort((a, b) => b.afyp - a.afyp);
}

export function buildStatusReport(records: RevenueRecord[]) {
  const total = records.length;
  const totalAfyp = sumAfyp(records);
  const grouped = new Map<string, RevenueRecord[]>();
  records.forEach((record) => {
    const key = record.policy_status?.trim() || "Không xác định";
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  const detail = [...grouped.entries()]
    .map(([status, items]) => ({
      status,
      bucket: statusBucket(status),
      count: items.length,
      afyp: sumAfyp(items),
      rate: total > 0 ? (items.length / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  const activeRecords = records.filter((record) => normalizePolicyStatus(record.policy_status) === "có hiệu lực");
  const pendingRecords = records.filter((record) => PENDING_PROCESS_STATUSES.has(normalizePolicyStatus(record.policy_status)));
  const refundRecords = records.filter((record) => REFUND_STATUSES.has(normalizePolicyStatus(record.policy_status)));
  const groupedStatusRows = [
    {
      key: "active",
      label: "Có hiệu lực",
      statuses: ["có hiệu lực"],
      count: activeRecords.length,
      afyp: sumAfyp(activeRecords),
      rate: total > 0 ? (activeRecords.length / total) * 100 : 0
    },
    {
      key: "pending",
      label: "Chờ xử lý",
      statuses: [...PENDING_PROCESS_STATUSES],
      count: pendingRecords.length,
      afyp: sumAfyp(pendingRecords),
      rate: total > 0 ? (pendingRecords.length / total) * 100 : 0
    },
    {
      key: "refund",
      label: "Hoàn phí",
      statuses: [...REFUND_STATUSES],
      count: refundRecords.length,
      afyp: sumAfyp(refundRecords),
      rate: total > 0 ? (refundRecords.length / total) * 100 : 0
    }
  ];
  const statusTableRows = STATUS_TABLE_DEFINITIONS.map((definition) => {
    const statusSet = new Set(definition.statuses);
    const items = records.filter((record) => statusSet.has(normalizePolicyStatus(record.policy_status)));
    return {
      ...definition,
      count: items.length,
      afyp: sumAfyp(items),
      rate: total > 0 ? (items.length / total) * 100 : 0
    };
  });

  return {
    totalPolicies: total,
    totalAfyp,
    activePolicyCount: activeRecords.length,
    activePolicyAfyp: sumAfyp(activeRecords),
    pendingPolicyCount: pendingRecords.length,
    pendingPolicyAfyp: sumAfyp(pendingRecords),
    refundPolicyCount: refundRecords.length,
    refundPolicyAfyp: sumAfyp(refundRecords),
    activeRate: total > 0 ? (activeRecords.length / total) * 100 : 0,
    groupedStatusRows,
    statusTableRows,
    detail
  };
}

export function buildTimeSeries(records: RevenueRecord[], month: string, target?: MonthlyTarget | null) {
  const { start, totalDays } = monthBounds(month);
  const targetValue = getEffectiveMonthlyPlan(month, target).plan;
  const dailyTarget = targetValue > 0 ? targetValue / totalDays : 0;
  let cumulativeAfyp = 0;
  let cumulativeIp = 0;

  const rows = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const date = `${start.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const daily = records.filter((record) => record.paid_date === date);
    const afyp = sumAfyp(daily);
    const ip = sumIp(daily);
    const contractCount = countContracts(daily);
    cumulativeAfyp += afyp;
    cumulativeIp += ip;
    return {
      date,
      day,
      afyp,
      ip,
      contractCount,
      cumulativeAfyp,
      cumulativeIp,
      targetCumulative: dailyTarget * day
    };
  });

  const today = new Date();
  const selectedMonth = start.slice(0, 7);
  const daysElapsed = today.toISOString().slice(0, 7) === selectedMonth ? today.getDate() : totalDays;
  const monthlyAfyp = sumAfyp(records);
  const forecastMonthEndAfyp = daysElapsed > 0 ? (monthlyAfyp / daysElapsed) * totalDays : 0;

  return {
    rows,
    forecastMonthEndAfyp,
    forecastAchievementRate: targetValue > 0 ? (forecastMonthEndAfyp / targetValue) * 100 : null
  };
}

export function buildYearPlanSeries(planRows: Array<{ month: number; monthKey: string; planVnd: number; actual: number; cumulativePlan: number; cumulativeActual: number }>) {
  return planRows.map((row) => ({
    month: row.month,
    monthLabel: `T${row.month}`,
    monthKey: row.monthKey,
    actual: row.actual,
    monthlyPlan: row.planVnd,
    cumulativePlan: row.cumulativePlan,
    cumulativeActual: row.cumulativeActual
  }));
}

export function filterOptions(records: RevenueRecord[]) {
  const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi"));
  return {
    paidDates: [...new Set(records.map((record) => record.paid_date).filter(Boolean))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    bans: unique(records.map((record) => record.ban_name)),
    groups: unique(records.map((record) => record.group_name)),
    agents: unique(records.map(visibleAgentName)),
    ads: unique(records.map(visibleAdsName)),
    statuses: unique(records.map((record) => record.policy_status))
  };
}
