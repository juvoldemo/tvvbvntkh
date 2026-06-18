"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, BarChart3, CalendarDays, ChevronDown, Coins, Download, Eye, EyeOff, Filter, LockKeyhole, Medal, Megaphone, MoreHorizontal, Search, Sparkles, Target, TrendingUp, Trophy, Users, UserRound, ClipboardList, LayoutGrid, Layers3, X } from "lucide-react";
import html2canvas from "html2canvas";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { formatCompactVnd, formatPercent, formatVnd } from "@/lib/format";
import { getUploadUserName } from "@/lib/upload-users";
import { getAdsPlan, getAdsMonthlyTarget, getAdsQuarterTarget, getAdsYearTarget } from "@/lib/ads-plan";

type DashboardData = any;
type Tab = "overview" | "groups" | "agents" | "status" | "time" | "ads" | "contests" | "starviet" | "admin" | "upload";
type CurrentUploader = {
  code: string;
  name: string;
};
type KpiDetailLine = { text: string; tone?: "muted" | "positive" | "negative" };
type HeaderPlanProgressItem = {
  label: string;
  plan: number;
  actual: number;
  remaining: number;
  percent: number | null;
  requiredPerDay?: number | null;
};
type OverviewPlanItem = {
  label: string;
  tone: "month" | "quarter" | "year";
  item: HeaderPlanProgressItem;
};
type CompetitionProgramView = {
  id: string;
  programName: string;
  originalFileUrl?: string | null;
  originalFileName?: string | null;
  extractedText?: string;
  aiSummary?: string;
  aiRule?: any;
  confirmedRule?: any;
  status: string;
  startDate?: string;
  endDate?: string;
  issueDeadline?: string;
  targetTypes?: string[];
  confidence?: number;
  needsReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastCalculatedAt?: string | null;
  latestResultId?: string | null;
  totalEligibleAdvisors?: number;
  totalEligibleContracts?: number;
  totalExcludedContracts?: number;
  totalIP?: number;
  totalAFYP?: number;
  totalReward?: number;
};

const QUARTER_PLAN_VND: Record<number, number> = {
  1: 10_800_000_000,
  2: 13_770_000_000,
  3: 13_770_000_000,
  4: 15_660_000_000
};
const YEAR_PLAN_VND = 54_000_000_000;

const tabs: Array<{ id: Tab; label: string; mobileLabel: string; icon: LucideIcon }> = [
  { id: "overview", label: "Tổng quan", mobileLabel: "Tổng quan", icon: LayoutGrid },
  { id: "status", label: "Hợp đồng", mobileLabel: "Hợp đồng", icon: ClipboardList },
  { id: "groups", label: "Nhóm", mobileLabel: "Nhóm", icon: Users },
  { id: "agents", label: "TVV", mobileLabel: "TVV", icon: UserRound },
  { id: "ads", label: "ADS", mobileLabel: "ADS", icon: Sparkles },
  { id: "contests", label: "Chương trình thi đua", mobileLabel: "Thi đua", icon: Trophy },
  { id: "starviet", label: "Sao Việt", mobileLabel: "SV", icon: Trophy },
  { id: "upload", label: "Quản trị", mobileLabel: "Quản trị", icon: Download }
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthKey(year: number, monthNo: number) {
  return `${year}-${String(monthNo).padStart(2, "0")}`;
}

function moneyCell(value: number) {
  return <strong>{formatCompactVnd(value)}</strong>;
}

function sortContracts(rows: any[]) {
  return [...rows].sort((a, b) => {
    const newBatchDiff = Number(Boolean(b.is_new_in_batch)) - Number(Boolean(a.is_new_in_batch));
    if (newBatchDiff !== 0) return newBatchDiff;
    const firstSeenDiff = new Date(b.first_seen_at ?? 0).getTime() - new Date(a.first_seen_at ?? 0).getTime();
    if (firstSeenDiff !== 0) return firstSeenDiff;
    const dateDiff = new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return Number(b.afyp || 0) - Number(a.afyp || 0);
  });
}

function isNewUploadContract(row: any) {
  return Boolean(row?.is_new_in_batch);
}

function groupNameForRecord(record: any) {
  return String(record?.group_name || record?.ban_name || "").trim();
}

function formatDateVi(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function monthLabel(month: string) {
  const [year, monthNo] = month.slice(0, 7).split("-");
  if (!year || !monthNo) return month;
  return `Tháng ${Number(monthNo)}/${year}`;
}

function monthTitle(month: string) {
  const [year, monthNo] = month.slice(0, 7).split("-");
  if (!year || !monthNo) return month;
  return `${Number(monthNo)}/${year}`;
}

function monthOnlyLabel(month: string) {
  const monthNo = Number(month.slice(5, 7));
  if (!Number.isFinite(monthNo) || monthNo <= 0) return month;
  return `Tháng ${monthNo}`;
}

function formatDateTimeVi(value: string | null | undefined) {
  if (!value) return "chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  }).format(date);
}

function formatShortDateTimeVi(value: string | null | undefined) {
  if (!value) return "chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  }).format(date).replace(",", "");
}

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatSignedVnd(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatCompactVnd(Math.abs(value))}`;
}

function formatMoney(value: number) {
  return formatCompactVnd(value);
}

function formatHeaderCompactMoney(value: number) {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  }
  return value.toLocaleString("vi-VN");
}

function selectedMonthNumber(month: string) {
  const value = Number(month.slice(5, 7));
  return Number.isFinite(value) && value >= 1 && value <= 12 ? value : 1;
}

function vietnamTodayParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const partValue = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: partValue("year"),
    month: partValue("month"),
    day: partValue("day")
  };
}

function remainingDaysInViewedMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = selectedMonthNumber(month);
  const daysInMonth = new Date(year, monthNo, 0).getDate();
  const today = vietnamTodayParts();
  if (today.year === year && today.month === monthNo) return daysInMonth - today.day;
  if (today.year > year || (today.year === year && today.month > monthNo)) return 0;
  return daysInMonth;
}

function remainingDaysUntilMonthEnd(month: string, endMonth: number) {
  const year = Number(month.slice(0, 4));
  const selectedMonth = selectedMonthNumber(month);
  const today = vietnamTodayParts();
  if (today.year > year || (today.year === year && today.month > endMonth)) return 0;

  const endOfPeriod = new Date(year, endMonth, 0);
  if (today.year === year && today.month >= selectedMonth && today.month <= endMonth) {
    const currentDay = new Date(year, today.month - 1, today.day);
    return Math.max(0, Math.floor((endOfPeriod.getTime() - currentDay.getTime()) / 86_400_000));
  }

  if (today.year < year || (today.year === year && today.month < selectedMonth)) {
    const startOfViewedMonth = new Date(year, selectedMonth - 1, 1);
    return Math.max(0, Math.floor((endOfPeriod.getTime() - startOfViewedMonth.getTime()) / 86_400_000) + 1);
  }

  return 0;
}

function formatRequiredDailyVnd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-- triệu/ngày";
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ/ngày`;
  }
  return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu/ngày`;
}

function buildHeaderPlanProgress(month: string, planRows: any[] = []) {
  const selectedMonth = selectedMonthNumber(month);
  const quarter = Math.ceil(selectedMonth / 3);
  const quarterStart = (quarter - 1) * 3 + 1;
  const quarterPlan = QUARTER_PLAN_VND[quarter] ?? 0;
  const actualByMonth = new Map<number, number>(
    planRows.map((row) => [Number(row.month), Number(row.actual ?? 0)])
  );
  const actualInRange = (from: number, to: number) => {
    let total = 0;
    for (let current = from; current <= to; current += 1) {
      total += actualByMonth.get(current) ?? 0;
    }
    return total;
  };
  const quarterActual = actualInRange(quarterStart, selectedMonth);
  const yearActual = actualInRange(1, selectedMonth);
  const buildItem = (label: string, actual: number, plan: number): HeaderPlanProgressItem => ({
    label,
    plan,
    actual,
    remaining: Math.max(plan - actual, 0),
    percent: plan > 0 ? (actual / plan) * 100 : null
  });

  return [
    buildItem("Kế hoạch quý", quarterActual, quarterPlan),
    buildItem("Kế hoạch năm", yearActual, YEAR_PLAN_VND)
  ];
}

function formatShortCompactVnd(value: number) {
  return formatCompactVnd(value)
    .replace(" triệu", "tr")
    .replace(" tỷ", " tỷ")
    .replace(" ₫", "đ");
}

function formatDailyCompactVnd(value: number) {
  return formatShortCompactVnd(value).replace("tr", "trđ");
}

function truncateChartLabel(value: unknown, maxLength = 16) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function normalizeViText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

function repairMojibake(value: unknown) {
  const text = String(value ?? "");
  if (!/[ÃÄÆáºá»]/.test(text) || typeof TextDecoder === "undefined") return text;
  try {
    const bytes = Uint8Array.from([...text].map((char) => char.charCodeAt(0) & 255));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return text;
  }
}

function abbreviateGroupName(value: unknown) {
  const text = String(value ?? "").trim();
  const known: Record<string, string> = {
    "quyet thang": "QT",
    "hong duc": "HĐ",
    "tam phat": "TP",
    "hung thinh": "HT",
    "nha trang 5": "NT5",
    "nguyen phat": "NP",
    "tam nhien": "TN",
    "nha trang 4": "NT4",
    "anh duong": "AD",
    "thanh phu": "TPh"
  };
  const normalized = normalizeViText(text);
  if (known[normalized]) return known[normalized];
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 5) || text;
}

function shortAgentName(value: unknown) {
  const parts = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? String(value ?? "");
}

function getDisplayedGroupChartData(rows: any[]) {
  return rows.map((row: any) => ({
    fullLabel: row.groupName || "Không xác định",
    label: abbreviateGroupName(row.groupName || "Không xác định"),
    afyp: Number(row.afyp ?? 0),
    count: Number(row.agentCount ?? 0)
  }));
}

function getDisplayedTvvChartData(rows: any[], isMobile: boolean) {
  const source = isMobile ? rows.slice(0, 20) : rows;
  return source.map((row: any) => ({
    fullLabel: row.agentName || "Không xác định",
    label: shortAgentName(row.agentName || "Không xác định"),
    afyp: Number(row.afyp ?? 0),
    count: Number(row.contractCount ?? 0)
  }));
}

function shortDateVi(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function calculateMonthlyPlanProgress(month: string, overview: any, timeRows: any[], activeDate: string) {
  const plan = Number(overview.monthlyTargetAfyp ?? 0);
  const actual = Number(overview.monthlyAfyp ?? 0);
  const percent = plan > 0 ? (actual / plan) * 100 : null;
  const remainingRaw = plan - actual;
  const totalDays = timeRows.length || new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const latestDay = activeDate ? Number(activeDate.slice(8, 10)) : 0;
  const remainingDays = Math.max(totalDays - latestDay, 0);

  if (plan <= 0) {
    return {
      hasPlan: false,
      value: "Chưa có kế hoạch",
      actual,
      plan,
      remainingRaw,
      remainingDays,
      lines: [{ text: "Không có dữ liệu kế hoạch", tone: "muted" } satisfies KpiDetailLine],
      progress: null
    };
  }

  const overPlan = remainingRaw < 0;
  const lines: KpiDetailLine[] = [
    { text: `ạt: ${formatMoney(actual)} / ${formatMoney(plan)}`, tone: "muted" },
    { text: overPlan ? `Vượt kế hoạch: ${formatMoney(Math.abs(remainingRaw))}` : `Còn thiếu: ${formatMoney(Math.max(remainingRaw, 0))}`, tone: overPlan ? "positive" : "muted" },
    {
      text: overPlan
        ? "ã hoàn thành kế hoạch"
        : remainingDays > 0
          ? `Cần TB/ngày còn lại: ${formatMoney(remainingRaw / remainingDays)}`
          : "ã hết kỳ theo dõi",
      tone: overPlan ? "positive" : "muted"
    }
  ];

  return {
    hasPlan: true,
    value: formatPercent(percent),
    actual,
    plan,
    remainingRaw,
    remainingDays,
    lines,
    progress: Math.max(0, Math.min(100, Number(percent ?? 0)))
  };
}

function todayRevenueCompareLine(overview: any) {
  const todayValue = Number(overview.todayAfyp ?? 0);
  const yesterdayValue = Number(overview.yesterdayAfyp ?? 0);
  const diff = Number(overview.changeAmount ?? todayValue - yesterdayValue);
  const tone = diff < 0 ? "negative" as const : diff > 0 ? "positive" as const : "muted" as const;
  if (yesterdayValue <= 0) {
    return {
      text: diff !== 0 ? `So với hôm qua: ${formatSignedVnd(diff)}` : "So với hôm qua: Chưa có dữ liệu",
      tone: diff !== 0 ? tone : "muted" as const
    };
  }
  return {
    text: `So với hôm qua: ${formatSignedVnd(diff)} / ${formatPercent((diff / yesterdayValue) * 100)}`,
    tone
  };
}

function todayRevenueMobileLines(overview: any) {
  const todayValue = Number(overview.todayAfyp ?? 0);
  const yesterdayValue = Number(overview.yesterdayAfyp ?? 0);
  const diff = Number(overview.changeAmount ?? todayValue - yesterdayValue);
  const tone = diff < 0 ? "negative" as const : diff > 0 ? "positive" as const : "muted" as const;
  const lines: KpiDetailLine[] = [];
  if (todayValue === 0) lines.push({ text: "Chưa phát sinh", tone: "muted" });
  if (yesterdayValue <= 0 && diff === 0) lines.push({ text: "So với qua: Chưa có dữ liệu", tone: "muted" });
  else lines.push({ text: `So với qua: ${formatShortCompactVnd(diff > 0 ? diff : -Math.abs(diff)).replace("--", "-")}`, tone });
  return lines;
}

function samePeriodComparisonLine(comparison: any): KpiDetailLine {
  if (!comparison?.hasPrevious) {
    return { text: "Chưa có dữ liệu tháng trước", tone: "muted" };
  }
  const percent = Number(comparison.percent ?? 0);
  if (percent > 0) {
    return { text: `▲ ${formatPercent(percent)}`, tone: "positive" };
  }
  if (percent < 0) {
    return { text: `▼ ${formatPercent(Math.abs(percent))}`, tone: "negative" };
  }
  return { text: "— 0%", tone: "muted" };
}

function monthlyPlanMobileLines(plan: { actual: number; plan: number; remainingRaw?: number; remainingDays?: number }) {
  if (plan.plan <= 0) return [{ text: "Chưa có kế hoạch", tone: "muted" as const }];
  const remaining = Number(plan.remainingRaw ?? plan.plan - plan.actual);
  const needPerDay = remaining > 0 && Number(plan.remainingDays ?? 0) > 0 ? remaining / Number(plan.remainingDays) : null;
  const shortageText = remaining > 0
    ? `Thiếu: ${formatShortCompactVnd(remaining)} (${needPerDay ? `Cần: ${formatDailyCompactVnd(needPerDay)}/ngày` : "ã hết kỳ"})`
    : "Hoàn thành KH";
  return [
    { text: `ạt: ${formatShortCompactVnd(plan.actual)}/${formatShortCompactVnd(plan.plan)}`, tone: "muted" as const },
    {
      text: shortageText,
      tone: remaining > 0 ? "muted" as const : "positive" as const
    }
  ];
}

function getActiveFilterChips(filters: { paidDate: string; ban: string; group: string; agent: string; ads: string }) {
  return [
    filters.paidDate ? { key: "paidDate" as const, label: "Ngày", value: shortDateVi(filters.paidDate) } : null,
    filters.ban ? { key: "ban" as const, label: "Ban", value: filters.ban } : null,
    filters.group ? { key: "group" as const, label: "Nhóm", value: filters.group } : null,
    filters.agent ? { key: "agent" as const, label: "TVV", value: filters.agent } : null,
    filters.ads ? { key: "ads" as const, label: "ADS", value: filters.ads } : null
  ].filter(Boolean) as Array<{ key: keyof typeof filters; label: string; value: string }>;
}

function contractStatusLabel(value: unknown) {
  const status = String(value ?? "").trim();
  return status || "Không xác định";
}

function normalizedContractStatus(value: unknown) {
  return contractStatusLabel(value).toLocaleLowerCase("vi-VN");
}

function compactStatusLabel(value: unknown) {
  const label = contractStatusLabel(value);
  const normalized = normalizedContractStatus(label);
  const labels: Record<string, string> = {
    "có hiệu lực": "Hiệu lực",
    "ch? kiểm tra ycbh": "Ch? KT YCBH",
    "cnbh có điu kiện": "CNBH ?K",
    "số hồ sơ": "HS",
    "tỷ lệ": "Tỷ lệ"
  };
  return labels[normalized] ?? label;
}

function localIsoDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function visibleDayCutoff(selectedMonth: string, todayIso: string, totalDays: number) {
  const todayMonth = todayIso.slice(0, 7);
  if (selectedMonth === todayMonth) return Math.min(Number(todayIso.slice(8, 10)), totalDays);
  if (selectedMonth < todayMonth) return totalDays;
  return 0;
}

function isValidMonthOption(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const maxYear = new Date().getFullYear() + 1;
  return month >= 1 && month <= 12 && year >= 2020 && year <= maxYear;
}

function medalTone(rank: number) {
  if (rank === 1) return { className: "rank-medal gold", icon: Trophy };
  if (rank === 2) return { className: "rank-medal silver", icon: Medal };
  if (rank === 3) return { className: "rank-medal bronze", icon: Medal };
  return { className: "rank-number", icon: null };
}

export default function HomePage() {
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth());
  const [filters, setFilters] = useState({ paidDate: "", ban: "", group: "", agent: "", ads: "" });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("Chi tiết hợp đồng");
  const [selectedContracts, setSelectedContracts] = useState<any[]>([]);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<{ title: string; rows: any[] } | null>(null);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<{ title: string; rows: any[] } | null>(null);
  const [uploadAuthOpen, setUploadAuthOpen] = useState(false);
  const [currentUploader, setCurrentUploader] = useState<CurrentUploader | null>(null);
  const [competitionRefreshKey, setCompetitionRefreshKey] = useState(0);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ month });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, month]);

  const monthOptions = useMemo(() => {
    const values = [month, ...(data?.availableMonths ?? []), currentMonth()].filter(Boolean);
    return [...new Set(values)].filter(isValidMonthOption).sort((a, b) => b.localeCompare(a));
  }, [data?.availableMonths, month]);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được dữ liệu.");
      setData(payload);
      setSelectedContracts([]);
      setSelectedTitle("Chi tiết hợp đồng");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem("bvnt_login") === "true");
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadDashboard();
  }, [isAuthenticated, query]);

  useEffect(() => {
    if (loading) return;
    const availableMonths = data?.availableMonths ?? [];
    if (availableMonths.length > 0 && !availableMonths.includes(month)) {
      setMonth(availableMonths[0]);
    }
  }, [data, loading, month]);

  const overview = data?.overview;
  const headerPlanProgress = useMemo(() => buildHeaderPlanProgress(month, data?.planTable ?? []), [data?.planTable, month]);
  const statusDetailRows = tab === "status" && selectedContracts.length > 0 ? selectedContracts : data?.contracts ?? [];
  const statusDetailTitle = tab === "status" && selectedContracts.length > 0 ? selectedTitle : "Chi tiết hợp đồng";
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);
  const mobileOptionTabs = tabs.filter((item) => item.id !== "overview" && item.id !== "status");
  const isMobileOptionTabActive = tab !== "overview" && tab !== "status";

  function switchTab(nextTab: Tab) {
    setMobileOptionsOpen(false);
    if (nextTab === "upload") {
      setUploadAuthOpen(true);
      return;
    }
    setCurrentUploader(null);
    setUploadAuthOpen(false);
    setTab(nextTab);
    setSelectedContracts([]);
    setSelectedTitle("Chi tiết hợp đồng");
    setSelectedGroupDetail(null);
    setSelectedAgentDetail(null);
  }

  function enterUploadTab(uploader: CurrentUploader) {
    setCurrentUploader(uploader);
    setUploadAuthOpen(false);
    setTab("upload");
    setSelectedContracts([]);
    setSelectedTitle("Chi tiết hợp đồng");
    setSelectedGroupDetail(null);
    setSelectedAgentDetail(null);
  }

  function handleLoginSuccess() {
    window.localStorage.setItem("bvnt_login", "true");
    setIsAuthenticated(true);
  }

  function clearFilter(key: keyof typeof filters) {
    setFilters((current) => ({ ...current, [key]: "" }));
  }

  function clearAllFilters() {
    setFilters({ paidDate: "", ban: "", group: "", agent: "", ads: "" });
  }

  if (!authReady) {
    return <div className="login-screen login-loading" aria-label="Đang kiểm tra đăng nhập" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <main className="app dashboard-page">
      <header className="topbar dashboard-header">
        <div className="topbar-inner">
          <div className="topbar-copy">
            <h1>
              <span className="desktop-header-title">Tổng quan doanh thu {monthLabel(month).toLowerCase()}</span>
              <span className="mobile-header-title">Doanh thu T{selectedMonthNumber(month)}/{month.slice(0, 4)}</span>
            </h1>
            <p className="topbar-meta">
              <span className="desktop-header-meta">Cập nhật gần nhất: {formatDateTimeVi(data?.updatedAt ?? null)}</span>
              <span className="mobile-header-meta">Cập nhật: {formatShortDateTimeVi(data?.updatedAt ?? null)}</span>
            </p>
          </div>
          {tab === "overview" && data && <HeaderPlanProgress items={headerPlanProgress} />}
          <label className="month-switcher">
            <div className="month-switcher-control">
              <CalendarDays size={16} />
              <select value={month} onChange={(event) => setMonth(event.target.value)}>
                {monthOptions.map((option) => (
                  <option key={option} value={option}>
                    {monthLabel(option)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
        </div>
      </header>

      <nav className="tabs dashboard-tabs" aria-label="Dashboard tabs">
        {tabs.map((item) => (
          <button key={item.id} className={`tab ${tab === item.id ? "active" : ""} ${item.id !== "overview" && item.id !== "status" ? "mobile-hidden-tab" : ""}`} onClick={() => switchTab(item.id)}>
            <item.icon size={16} />
            <span className="tab-label-full">{item.label}</span>
            <span className="tab-label-short">{item.mobileLabel}</span>
          </button>
        ))}
        <button className={`tab mobile-options-tab ${isMobileOptionTabActive ? "active" : ""}`} type="button" onClick={() => setMobileOptionsOpen(true)} aria-haspopup="dialog" aria-expanded={mobileOptionsOpen}>
          <MoreHorizontal size={16} />
          <span className="tab-label-full">Tùy chọn</span>
          <span className="tab-label-short">Tùy chọn</span>
        </button>
      </nav>

      {mobileOptionsOpen && (
        <div className="mobile-options-backdrop" role="presentation" onClick={() => setMobileOptionsOpen(false)}>
          <section className="mobile-options-sheet" role="dialog" aria-modal="true" aria-label="Tùy chọn" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-options-header">
              <h2>Tùy chọn</h2>
              <button type="button" aria-label="Đóng" onClick={() => setMobileOptionsOpen(false)}><X size={18} /></button>
            </div>
            <div className="mobile-options-list">
              {mobileOptionTabs.map((item) => (
                <button key={item.id} className={tab === item.id ? "active" : ""} type="button" onClick={() => switchTab(item.id)}>
                  <span><item.icon size={18} /></span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="content">
        <div className={`filters filter-card filter-bar ${isFilterOpen ? "open" : "collapsed"}`}>
          <button className="filter-toggle" type="button" onClick={() => setIsFilterOpen((value) => !value)} aria-expanded={isFilterOpen}>
            <span className="filter-toggle-title"><Filter size={18} /> Bộ lọc</span>
            <span className="filter-toggle-summary">{activeFilterCount > 0 ? `${activeFilterCount} bộ lọc đang áp dụng` : "Ngày, Ban, Nhóm, TVV, ADS"}</span>
            <ChevronDown className="filter-toggle-icon" size={18} />
          </button>
          <div className={`filter-state ${activeFilterChips.length > 0 ? "has-filters" : ""}`}>
            <div className="filter-state-heading">
              <span><Filter size={18} /> Bộ lọc</span>
              <strong>{activeFilterChips.length > 0 ? "Đang lọc" : "Ngày, Ban, Nhóm, TVV, ADS"}</strong>
            </div>
            {activeFilterChips.length > 0 && (
              <div className="filter-chip-row" aria-label="Bộ lọc đang áp dụng">
                {activeFilterChips.map((chip) => (
                  <button className="filter-chip" key={chip.key} type="button" onClick={() => clearFilter(chip.key)} title={`Xóa bộ lọc ${chip.label}`}>
                    <span>{chip.label}: {chip.value}</span>
                    <b aria-hidden="true">×</b>
                  </button>
                ))}
                {activeFilterChips.length >= 2 && (
                  <button className="clear-filter-chip" type="button" onClick={clearAllFilters}>Xóa tất cả</button>
                )}
              </div>
            )}
          </div>
          <div className="filter-grid">
            <Select icon={CalendarDays} label="Ngày thu" value={filters.paidDate} options={data?.options?.paidDates ?? []} onChange={(value) => setFilters({ ...filters, paidDate: value })} />
            <Select icon={Users} label="Ban" value={filters.ban} options={data?.options?.bans ?? []} onChange={(value) => setFilters({ ...filters, ban: value })} />
            <Select icon={Users} label="Nhóm" value={filters.group} options={data?.options?.groups ?? []} onChange={(value) => setFilters({ ...filters, group: value })} />
            <Select icon={UserRound} label="TVV" value={filters.agent} options={data?.options?.agents ?? []} onChange={(value) => setFilters({ ...filters, agent: value })} />
            <Select icon={Megaphone} label="ADS" value={filters.ads} options={data?.options?.ads ?? []} onChange={(value) => setFilters({ ...filters, ads: value })} />
          </div>
          <div className="filter-actions">
            <button className="secondary" type="button" onClick={clearAllFilters}>Đặt lại bộ lọc</button>
          </div>
        </div>

        {loading && <div className="panel">Đang tải dữ liệu...</div>}
        {error && <div className="panel error-list">{error}</div>}
        {!loading && !error && data && (
          <>
            {tab === "overview" && <Overview data={data} month={month} selectedAds={filters.ads} onViewDetails={(title, rows) => { setSelectedTitle(title); setSelectedContracts(rows); }} onGoGroups={() => switchTab("groups")} onGoAgents={() => switchTab("agents")} />}
            {tab === "groups" && <GroupTable month={month} rows={data.groups} contracts={data.contracts} openContracts={(title, rows) => setSelectedGroupDetail({ title, rows })} />}
            {tab === "agents" && <AgentTable month={month} rows={data.agents} contracts={data.contracts} openContracts={(title, rows) => setSelectedAgentDetail({ title, rows })} />}
            {tab === "status" && <StatusReport report={data.statuses} contracts={data.contracts} openContracts={(title, rows) => { setSelectedTitle(title); setSelectedContracts(rows); }} />}
            {tab === "time" && <TimeReport report={data.timeSeries} />}
            {tab === "ads" && <AdsTable rows={data.ads} month={month} contracts={data.contracts} openContracts={(title, rows) => { setSelectedTitle(title); setSelectedContracts(rows); }} />}
            {tab === "contests" && <CompetitionPanel month={month} refreshKey={competitionRefreshKey} onChanged={() => { setCompetitionRefreshKey((value) => value + 1); loadDashboard(); }} />}
            {tab === "starviet" && <StarVietPanel report={data.starViet} warning={data.starVietWarning} />}
            {tab === "admin" && <AdminPanel month={month} planRows={data.planTable ?? []} onSaved={loadDashboard} />}
            {tab === "upload" && <UploadPanel month={month} uploader={currentUploader} onUploaded={() => { setCompetitionRefreshKey((value) => value + 1); loadDashboard(); }} />}

            {tab === "status" && <ContractDetails title={statusDetailTitle} rows={statusDetailRows} showStatus />}
          </>
        )}
        {tab === "groups" && selectedGroupDetail && (
          <ContractDetailModal type="group" title={selectedGroupDetail.title} rows={selectedGroupDetail.rows} onClose={() => setSelectedGroupDetail(null)} />
        )}
        {tab === "agents" && selectedAgentDetail && (
          <ContractDetailModal type="agent" title={selectedAgentDetail.title} rows={selectedAgentDetail.rows} onClose={() => setSelectedAgentDetail(null)} />
        )}
        {uploadAuthOpen && (
          <UploadAuthModal onCancel={() => setUploadAuthOpen(false)} onSuccess={enterUploadTab} />
        )}
      </section>
    </main>
  );
}

function HeaderPlanProgress({ items }: { items: HeaderPlanProgressItem[] }) {
  return (
    <div className="header-plan-progress" aria-label="Tiến độ kế hoạch quý và năm">
      <div className="header-plan-mobile-title">Tiến độ KH</div>
      {items.map((item) => {
        const percent = item.percent ?? 0;
        const clampedPercent = Math.min(100, Math.max(0, percent));
        const compactLabel = item.label === "Kế hoạch quý" ? "Quý" : item.label === "Kế hoạch năm" ? "Năm" : item.label;
        return (
          <div className="header-plan-row" key={item.label}>
            <div className="header-plan-top">
              <span className="header-plan-label-full">{item.label}</span>
              <span className="header-plan-label-short">
                <b>{compactLabel}</b>
                <span>{formatPercent(percent)}</span>
                <span>KH {formatHeaderCompactMoney(item.plan)}</span>
                <span>Thiếu {formatHeaderCompactMoney(item.remaining)}</span>
              </span>
              <span className="header-plan-percent">{formatPercent(percent)}</span>
              <strong>{formatMoney(item.plan)}</strong>
            </div>
            <div className="header-plan-bar" aria-label={`${item.label}: ${formatPercent(percent)}`}>
              <div className="header-plan-fill" style={{ width: `${clampedPercent}%` }} />
              <span>{formatPercent(percent)}</span>
            </div>
            <p>Còn thiếu: {formatMoney(item.remaining)}</p>
          </div>
        );
      })}
    </div>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim() === "5875") {
      setError("");
      onSuccess();
      return;
    }
    setError("Mật khẩu không đúng, vui lòng thử lại");
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-title" aria-label="Dashboard Bảo Việt Nhân th Khánh Hòa">
          <h1>Dashboard</h1>
          <p>Bảo Việt Nhân th Khánh Hòa</p>
        </div>
        <label className="login-password-field">
          <LockKeyhole size={18} />
          <input
            autoFocus
            type={showPassword ? "text" : "password"}
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
          />
          <button className="login-eye-button" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>
        {error && <p className="login-error">{error}</p>}
        <button className="login-submit" type="submit">Truy cập</button>
      </form>
    </main>
  );
}

function Select({ icon: Icon, label, value, options, onChange }: { icon: LucideIcon; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="filter-field">
      <span className="filter-icon"><Icon size={20} /></span>
      <span className="label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Tất cả</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Overview({ data, month, selectedAds, onViewDetails, onGoGroups, onGoAgents }: { data: DashboardData; month: string; selectedAds?: string; onViewDetails: (title: string, rows: any[]) => void; onGoGroups: () => void; onGoAgents: () => void }) {
  const [chartMode, setChartMode] = useState<"day" | "group" | "agent">("day");
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isMobileChart, setIsMobileChart] = useState(false);
  const overview = data?.overview ?? {};
  const timeRows = data?.overviewTimeSeries?.rows ?? [];
  const groupRows = (data?.overviewGroups ?? []).slice(0, 5);
  const agentRows = (data?.overviewAgents ?? []).slice(0, 5);
  const overviewContracts = data?.overviewContracts ?? [];
  const dashboardToday = String(overview.todayDate ?? localIsoDate(data?.updatedAt ?? null));
  const visibleTimeRows = useMemo(() => {
    const cutoffDay = visibleDayCutoff(month.slice(0, 7), dashboardToday, timeRows.length);
    return timeRows.filter((row: any) => Number(row.day ?? 0) <= cutoffDay);
  }, [dashboardToday, month, timeRows]);
  const visibleDayCount = visibleTimeRows.length;
  const todayRevenueValue = Number(overview.todayAfyp ?? 0);
  const yesterdayCompare = useMemo(() => todayRevenueCompareLine(overview), [overview]);
  const todayRevenueLines = todayRevenueValue === 0
    ? [{ text: "Hôm nay chưa có phát sinh", tone: "muted" as const }, yesterdayCompare]
    : [yesterdayCompare];
  const planOverview = useMemo(() => {
    if (!selectedAds) return overview;
    return { ...overview, monthlyTargetAfyp: getAdsMonthlyTarget(selectedAds, month) };
  }, [month, overview, selectedAds]);
  const monthlyPlan = useMemo(() => calculateMonthlyPlanProgress(month, planOverview, timeRows, dashboardToday), [dashboardToday, month, planOverview, timeRows]);
  const desktopPlanItems = useMemo(() => {
    const [quarterPlan, yearPlan] = buildHeaderPlanProgress(month, data?.planTable ?? []);
    const monthRemaining = Math.max(monthlyPlan.remainingRaw, 0);
    const monthRemainingDays = remainingDaysInViewedMonth(month);
    const selectedMonth = selectedMonthNumber(month);
    const quarter = Math.ceil(selectedMonth / 3);
    const quarterEndMonth = quarter * 3;
    const quarterRemainingDays = remainingDaysUntilMonthEnd(month, quarterEndMonth);
    const yearRemainingDays = remainingDaysUntilMonthEnd(month, 12);
    const adsActuals = selectedAds ? data?.adsPlanActuals : null;
    const adsQuarterPlan = selectedAds ? getAdsQuarterTarget(selectedAds, month) : 0;
    const adsYearPlan = selectedAds ? getAdsYearTarget(selectedAds) : 0;
    const effectiveQuarterPlan = selectedAds ? {
      ...quarterPlan,
      actual: Number(adsActuals?.quarterActual ?? 0),
      plan: adsQuarterPlan,
      remaining: Math.max(adsQuarterPlan - Number(adsActuals?.quarterActual ?? 0), 0),
      percent: adsQuarterPlan > 0 ? (Number(adsActuals?.quarterActual ?? 0) / adsQuarterPlan) * 100 : null
    } : quarterPlan;
    const effectiveYearPlan = selectedAds ? {
      ...yearPlan,
      actual: Number(adsActuals?.yearActual ?? 0),
      plan: adsYearPlan,
      remaining: Math.max(adsYearPlan - Number(adsActuals?.yearActual ?? 0), 0),
      percent: adsYearPlan > 0 ? (Number(adsActuals?.yearActual ?? 0) / adsYearPlan) * 100 : null
    } : yearPlan;
    return [
      { label: "Kế hoạch tháng", tone: "month", item: { label: "Kế hoạch tháng", actual: monthlyPlan.actual, plan: monthlyPlan.plan, remaining: monthRemaining, percent: monthlyPlan.plan > 0 ? (monthlyPlan.actual / monthlyPlan.plan) * 100 : null, requiredPerDay: monthRemainingDays > 0 ? monthRemaining / monthRemainingDays : null } },
      { label: `Kế hoạch Quý ${quarter === 1 ? "I" : quarter === 2 ? "II" : quarter === 3 ? "III" : "IV"}`, tone: "quarter", item: { ...effectiveQuarterPlan, requiredPerDay: quarterRemainingDays > 0 ? effectiveQuarterPlan.remaining / quarterRemainingDays : null } },
      { label: `Kế hoạch Năm ${month.slice(0, 4)}`, tone: "year", item: { ...effectiveYearPlan, requiredPerDay: yearRemainingDays > 0 ? effectiveYearPlan.remaining / yearRemainingDays : null } }
    ] satisfies OverviewPlanItem[];
  }, [data?.adsPlanActuals, data?.planTable, month, monthlyPlan, selectedAds]);
  const monthlyPlanMobileDetailLines = useMemo(() => monthlyPlanMobileLines(monthlyPlan), [monthlyPlan]);
  const todayRevenueMobileDetailLines = useMemo(() => todayRevenueMobileLines(overview), [overview]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 759px)");
    const sync = () => setIsMobileChart(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const chartMeta = {
    day: {
      label: "Theo ngày",
      section: "Biểu đồ theo ngày",
      title: `AFYP / Số H theo ngày - ${monthOnlyLabel(month)}`,
      countLabel: "Số H",
      subtitle: visibleDayCount > 0
        ? `Hiển thị từ ngày 1 đến ngày ${visibleDayCount}, ngày đã qua không phát sinh sẽ bằng 0.`
        : "Chưa có ngày nào trong tháng được chn để hiển thị."
    },
    group: {
      label: "Theo nhóm",
      section: "Biểu đồ theo nhóm",
      title: `Top nhóm theo AFYP / Số TVV - ${monthOnlyLabel(month)}`,
      countLabel: "Số TVV",
      subtitle: "Hiển thị các nhóm dẫn đầu theo dữ liệu sau bộ l?c."
    },
    agent: {
      label: "Theo TVV",
      section: "Biểu đồ theo TVV",
      title: `Top TVV theo AFYP / Số H - ${monthOnlyLabel(month)}`,
      countLabel: "Số H",
      subtitle: "Hiển thị các TVV dẫn đầu theo dữ liệu sau bộ l?c."
    }
  }[chartMode];
  const chartRows = useMemo(() => {
    if (chartMode === "group") {
      return getDisplayedGroupChartData(data?.overviewGroups ?? []);
    }
    if (chartMode === "agent") {
      return getDisplayedTvvChartData(data?.overviewAgents ?? [], isMobileChart);
    }
    return visibleTimeRows.map((row: any) => ({
      label: row.day,
      fullLabel: row.day,
      afyp: Number(row.afyp ?? 0),
      count: Number(row.contractCount ?? 0)
    }));
  }, [chartMode, data?.overviewAgents, data?.overviewGroups, isMobileChart, timeRows, visibleTimeRows]);
  const chartMinWidth = useMemo(() => {
    if (chartMode === "day") return "100%";
    const itemWidth = isMobileChart ? 24 : 58;
    return `${Math.max(100, chartRows.length * itemWidth)}px`;
  }, [chartMode, chartRows.length, isMobileChart]);
  const hideMobileCategoryLabels = isMobileChart && chartMode !== "day";
  const comparisons = data?.overviewComparisons ?? {};

  const kpis = [
    {
      title: "AFYP",
      mobileTitle: "AFYP",
      value: formatCompactVnd(overview.monthlyAfyp ?? 0),
      icon: Coins,
      tone: "blue",
      detailLines: [samePeriodComparisonLine(comparisons.monthlyAfyp)],
      mobileDetailLines: []
    },
    {
      title: "IP",
      mobileTitle: "IP",
      value: formatCompactVnd(overview.monthlyIp ?? 0),
      icon: Layers3,
      tone: "gold",
      detailLines: [samePeriodComparisonLine(comparisons.monthlyIp)],
      mobileDetailLines: []
    },
    {
      title: "Số hợp đồng",
      mobileTitle: "H",
      value: formatNumber(overview.totalContracts ?? 0),
      icon: ClipboardList,
      tone: "green",
      detailLines: [samePeriodComparisonLine(comparisons.totalContracts)],
      mobileDetailLines: []
    },
    {
      title: "TVV hoạt động",
      mobileTitle: "TVV H",
      value: formatNumber(overview.activeAgents ?? 0),
      icon: UserRound,
      tone: "purple",
      detailLines: [samePeriodComparisonLine(comparisons.activeAgents)],
      mobileDetailLines: []
    },
    {
      title: "Kế hoạch tháng",
      mobileTitle: "KH tháng",
      value: monthlyPlan.value,
      icon: Target,
      tone: "orange",
      detailLines: monthlyPlan.lines,
      mobileDetailLines: monthlyPlanMobileDetailLines,
      progress: monthlyPlan.progress
    },
    {
      title: "Doanh thu hôm nay",
      mobileTitle: "DT hôm nay",
      value: formatCompactVnd(todayRevenueValue),
      icon: TrendingUp,
      tone: todayRevenueValue > 0 ? "green" : "neutral",
      detailLines: todayRevenueLines,
      mobileDetailLines: todayRevenueMobileDetailLines
    }
  ] as const;

  return (
    <>
      <section className="kpi-grid overview-kpi-grid">
        {kpis.slice(0, 4).map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
        <OverviewPlanCard items={desktopPlanItems} />
        <KpiCard {...kpis[4]} />
        <KpiCard {...kpis[5]} />
      </section>

      <section className="overview-grid">
        <div className="panel chart-panel chart-card">
          <div className="panel-header chart-header">
            <div>
              <div className="section-label"><BarChart3 size={16} /> {chartMeta.section}</div>
              <h2>{chartMeta.title}</h2>
              <p className="panel-subtitle">{chartMeta.subtitle}</p>
            </div>
            <div className="chart-actions">
              <label className="chart-mode-select">
                <span className="sr-only">Chế độ xem biểu đồ</span>
                <select value={chartMode} onChange={(event) => setChartMode(event.target.value as "day" | "group" | "agent")}>
                  <option value="day">Theo ngày</option>
                  <option value="group">Theo nhóm</option>
                  <option value="agent">Theo TVV</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <button className="secondary icon-button" type="button" aria-label="Tải xuống biểu đồ"><Download size={16} /></button>
              <button className="secondary chart-expand-button" type="button" onClick={() => setIsChartExpanded((value) => !value)}>
                <span className="chart-expand-full">{isChartExpanded ? "Thu gn biểu đồ" : "Mở rộng biểu đồ"}</span>
                <span className="chart-expand-short">{isChartExpanded ? "Thu gn" : "Mở rộng"}</span>
              </button>
            </div>
          </div>
          <div className={`chart chart-scroll ${isChartExpanded ? "expanded" : "compact"}`}>
            <div className="chart-inner" style={{ minWidth: chartMinWidth }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 10, right: 8, left: 0, bottom: hideMobileCategoryLabels ? 4 : chartMode === "day" ? 0 : 18 }} barCategoryGap={hideMobileCategoryLabels ? "6%" : "18%"} barGap={hideMobileCategoryLabels ? 2 : 6}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tick={!hideMobileCategoryLabels} tickLine={false} axisLine={false} interval={0} angle={chartMode === "day" ? 0 : isMobileChart ? 0 : -18} textAnchor={chartMode === "day" || isMobileChart ? "middle" : "end"} height={hideMobileCategoryLabels ? 8 : chartMode === "day" ? 30 : isMobileChart ? 34 : 66} tickFormatter={(value) => chartMode === "day" || isMobileChart ? value : truncateChartLabel(value)} />
                  <YAxis yAxisId="afyp" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}tr`} />
                  <YAxis yAxisId="count" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(value) => `${Number(value).toLocaleString("vi-VN")}`} />
                  <Tooltip content={<OverviewChartTooltip mode={chartMode} countLabel={chartMeta.countLabel} />} />
                  <Legend verticalAlign="top" height={28} iconType="square" />
                  <Bar yAxisId="afyp" dataKey="afyp" name="AFYP" fill="var(--blue-700)" radius={[8, 8, 0, 0]} barSize={hideMobileCategoryLabels ? 8 : undefined} />
                  <Line yAxisId="count" type="monotone" dataKey="count" name={chartMeta.countLabel} stroke="#f2a900" strokeWidth={3} dot={{ r: 4, fill: "#f2a900", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </section>

      <section className="ranking-grid">
        <OverviewRankingCard
          title="Xếp hạng nhóm"
          icon={Users}
          rows={groupRows}
          onViewMore={onGoGroups}
          columns={[
            { header: "Hạng", render: (row) => <RankBadge rank={row.rank} /> },
            { header: "Nhóm", render: (row) => row.groupName },
            { header: "AFYP", render: (row) => moneyCell(row.afyp) },
            { header: "H", render: (row) => row.contractCount },
            { header: "Tỷ trng", render: (row) => formatPercent(row.afypShare) }
          ]}
          onRowClick={(row) => onViewDetails(row.groupName, overviewContracts.filter((item: any) => item.group_name === row.groupName))}
        />

        <OverviewRankingCard
          title="Xếp hạng TVV"
          icon={UserRound}
          rows={agentRows}
          onViewMore={onGoAgents}
          columns={[
            { header: "Hạng", render: (row) => <RankBadge rank={row.rank} /> },
            { header: "Tên TVV", render: (row) => row.agentName },
            { header: "Nhóm", render: (row) => row.groupName },
            { header: "AFYP", render: (row) => moneyCell(row.afyp) },
            { header: "H", render: (row) => row.contractCount }
          ]}
          onRowClick={(row) => onViewDetails(row.agentName, overviewContracts.filter((item: any) => item.agent_name === row.agentName))}
        />
      </section>
    </>
  );
}

function OverviewPlanCard({ items }: { items: OverviewPlanItem[] }) {
  return (
    <article className="overview-plan-card">
      <h3>Tiến độ kế hoạch</h3>
      <div className="overview-plan-columns">
        {items.map(({ label, tone, item }) => {
          const percent = item.percent ?? 0;
          const clampedPercent = Math.min(100, Math.max(0, percent));
          return (
            <section className="overview-plan-column" key={label}>
              <span className="overview-plan-title">{label}</span>
              <strong>{formatPercent(percent)}</strong>
              <p>ạt: {formatMoney(item.actual)} / {formatMoney(item.plan)}</p>
              <p>Thiếu: {formatMoney(item.remaining)}</p>
              <div className="overview-plan-bar" aria-label={`${label}: ${formatPercent(percent)}`}>
                <div style={{ width: `${clampedPercent}%` }} />
              </div>
              <div className={`overview-plan-required-box ${tone}`}>
                <span className="overview-plan-required-icon"><Target size={15} /></span>
                <span>
                  <b>Cần: {formatRequiredDailyVnd(item.requiredPerDay)}</b>
                  <small>để hoàn thành kế hoạch</small>
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function KpiCard({ title, mobileTitle, value, icon: Icon, tone, note, mobileNote, detailLines, mobileDetailLines, progress }: { title: string; mobileTitle?: string; value: string; icon: LucideIcon; tone: string; note?: string; mobileNote?: string; detailLines?: readonly KpiDetailLine[]; mobileDetailLines?: readonly KpiDetailLine[]; progress?: number | null }) {
  const lines = detailLines ?? (note ? [{ text: note, tone: "muted" as const }] : []);
  const mobileLines = mobileDetailLines ?? detailLines ?? (mobileNote || note ? [{ text: mobileNote ?? note ?? "", tone: "muted" as const }] : []);
  const extraClass = title === "Doanh thu hôm nay" ? " kpi-today-revenue" : title === "Kế hoạch tháng" ? " kpi-monthly-plan" : "";
  const comparisonClass = lines.length === 1 && ["positive", "negative", "muted"].includes(lines[0]?.tone ?? "") ? " kpi-comparison-card" : "";
  return (
    <div className={`kpi kpi-card kpi-${tone}${extraClass}${comparisonClass}`}>
      <div className="kpi-desktop-layout">
        <div className="kpi-icon"><Icon size={22} /></div>
        <div className="kpi-copy">
          <span>{title}</span>
          <strong>{value}</strong>
          {lines.length > 0 && (
            <div className="kpi-detail-lines">
              {lines.map((line, index) => <p className={`mini-line ${line.tone ?? "muted"}`} key={`${line.text}-${index}`}>{line.text}</p>)}
            </div>
          )}
          {progress !== undefined && progress !== null && (
            <div className="progress-shell" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="kpi-mobile-layout">
        <div className="kpi-main-row">
          <div className="kpi-left">
            <div className="kpi-icon"><Icon size={22} /></div>
            <span>{mobileTitle ?? title}</span>
          </div>
          <strong>{value}</strong>
        </div>
        {mobileLines.length > 0 && (
          <div className="kpi-detail-lines">
            {mobileLines.map((line, index) => <p className={`mini-line ${line.tone ?? "muted"}`} key={`${line.text}-${index}`}>{line.text}</p>)}
          </div>
        )}
        {progress !== undefined && progress !== null && (
          <div className="progress-shell" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewChartTooltip({ active, payload, label, mode, countLabel }: any) {
  if (!active || !payload?.length) return null;
  const afyp = Number(payload.find((item: any) => item.dataKey === "afyp")?.value ?? 0);
  const count = Number(payload.find((item: any) => item.dataKey === "count")?.value ?? 0);
  const fullLabel = payload.find((item: any) => item.payload?.fullLabel)?.payload?.fullLabel ?? label;
  const title = mode === "day" ? `Ngày ${fullLabel}` : fullLabel;
  return (
    <div className="chart-tooltip">
      <strong>{title}</strong>
      <span>AFYP: {formatCompactVnd(afyp)}</span>
      <span>{countLabel}: {formatNumber(count)}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const { className, icon: Icon } = medalTone(rank);
  if (Icon) return <span className={className}><Icon size={14} /> {rank}</span>;
  return <span className={className}>{rank}</span>;
}

function MobileRankBadge({ rank }: { rank: number }) {
  const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain";
  return <span className={`mobile-rank-badge ${tier}`}>{rank}</span>;
}

function MobileMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mobile-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MobileRankingList({ rows, type, onRowClick }: { rows: any[]; type: "group" | "agent"; onRowClick: (row: any) => void }) {
  return (
    <div className="mobile-card-list mobile-ranking-list">
      {rows.map((row) => (
        <button className="mobile-rank-card" type="button" key={`${type}-${row.rank}-${row.groupName ?? row.agentName}`} onClick={() => onRowClick(row)}>
          <MobileRankBadge rank={row.rank} />
          <div className="mobile-rank-main">
            <div className="mobile-rank-title">{type === "group" ? row.groupName : row.agentName}</div>
            <div className="mobile-rank-subtitle">{type === "group" ? row.banName : row.groupName}</div>
            <div className="mobile-metric-grid compact">
              <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
              <MobileMetric label="H" value={row.contractCount} />
              {type === "group" ? <MobileMetric label="TT" value={formatPercent(row.afypShare)} /> : <MobileMetric label="Nhóm" value={row.groupName} />}
            </div>
          </div>
          <ChevronDown className="mobile-card-chevron" size={18} />
        </button>
      ))}
    </div>
  );
}

function MobileGroupRankingCards({ rows, contracts, openContracts }: { rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  return (
    <div className="mobile-card-list mobile-ranking-list">
      {rows.map((row) => (
        <button className="mobile-rank-card full" key={`${row.banName}-${row.groupName}`} type="button" onClick={() => openContracts(row.groupName, contracts.filter((item) => groupNameForRecord(item) === row.groupName))}>
          <MobileRankBadge rank={row.rank} />
          <div className="mobile-rank-main">
            <div className="mobile-rank-title">{row.groupName}</div>
            <div className="mobile-rank-subtitle">{row.banName}</div>
            <div className="mobile-metric-grid">
              <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
              <MobileMetric label="IP" value={formatCompactVnd(row.ip)} />
              <MobileMetric label="H" value={row.contractCount} />
              <MobileMetric label="TVV" value={row.agentCount} />
              <MobileMetric label="TT" value={formatPercent(row.afypShare)} />
              <MobileMetric label="BQ/H" value={formatCompactVnd(row.averageAfypPerContract)} />
            </div>
          </div>
          <ChevronDown className="mobile-card-chevron" size={18} />
        </button>
      ))}
    </div>
  );
}

function MobileAgentRankingCards({ rows, contracts, openContracts }: { rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  return (
    <div className="mobile-card-list mobile-ranking-list">
      {rows.map((row) => (
        <button className="mobile-rank-card full" key={`${row.agentName}-${row.agentCode}`} type="button" onClick={() => openContracts(row.agentName, contracts.filter((item) => item.agent_name === row.agentName))}>
          <MobileRankBadge rank={row.rank} />
          <div className="mobile-rank-main">
            <div className="mobile-rank-title">{row.agentName}</div>
            <div className="mobile-rank-subtitle">{row.agentCode}</div>
            <div className="mobile-info-grid">
              <span><b>Ban</b>{row.banName}</span>
              <span><b>Nhóm</b>{row.groupName}</span>
            </div>
            <div className="mobile-metric-grid">
              <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
              <MobileMetric label="IP" value={formatCompactVnd(row.ip)} />
              <MobileMetric label="H" value={row.contractCount} />
              <MobileMetric label="BQ/H" value={formatCompactVnd(row.averageAfypPerContract)} />
            </div>
          </div>
          <ChevronDown className="mobile-card-chevron" size={18} />
        </button>
      ))}
    </div>
  );
}

function MobileAdsCards({ rows, month, contracts, openContracts }: { rows: any[]; month: string; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  return (
    <div className="mobile-card-list mobile-ranking-list">
      {rows.map((row, index) => {
        const planMillion = getAdsPlan(row.adsName, month);
        const planVnd = planMillion ? planMillion * 1_000_000 : 0;
        const achievement = planVnd > 0 ? (Number(row.afyp ?? 0) / planVnd) * 100 : null;
        return (
          <button className="mobile-ads-card" key={`${row.adsName}-${row.adsCode}`} type="button" onClick={() => openContracts(row.adsName, contracts.filter((item) => item.ads_name === row.adsName))}>
            <div className="mobile-ads-head">
              <span className="mobile-rank-badge plain">{index + 1}</span>
              <strong>{row.adsName}</strong>
              <span className="mobile-ads-afyp">{formatCompactVnd(row.afyp)}</span>
            </div>
            <div className="mobile-metric-grid compact ads-mobile-stats">
              <MobileMetric label="KH" value={formatPlanMillion(planMillion)} />
              <MobileMetric label="HT" value={formatPercent(achievement)} />
              <MobileMetric label="IP" value={formatCompactVnd(row.ip)} />
              <MobileMetric label="H" value={row.contractCount} />
              <MobileMetric label="TVV" value={row.agentCount} />
              <MobileMetric label="TT" value={formatPercent(row.afypShare)} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OverviewRankingCard({ title, icon: Icon, rows, columns, onViewMore, onRowClick }: { title: string; icon: LucideIcon; rows: any[]; columns: Array<{ header: string; render: (row: any) => ReactNode }>; onViewMore: () => void; onRowClick: (row: any) => void }) {
  const type = title.toLowerCase().includes("tvv") ? "agent" : "group";
  return (
    <div className="panel ranking-panel ranking-card">
      <div className="panel-header chart-header">
        <div>
          <div className="section-label"><Icon size={16} /> {title}</div>
        </div>
      </div>
      <DataTable className="desktop-table" headers={columns.map((column) => column.header)}>
        {rows.map((row: any) => (
          <tr key={`${title}-${row.rank}-${row.groupName ?? row.agentName}`} className="clickable" onClick={() => onRowClick(row)}>
            {columns.map((column) => <td key={column.header}>{column.render(row)}</td>)}
          </tr>
        ))}
      </DataTable>
      <MobileRankingList rows={rows} type={type} onRowClick={onRowClick} />
      {rows.length === 0 && <p className="empty-state">Không có dữ liệu</p>}
      <div className="card-footer-link">
        <button className="ghost link-button" type="button" onClick={onViewMore}>Xem chi tiết {title.toLowerCase().includes("tvv") ? "TVV" : "nhóm"} <ArrowDownRight size={16} /></button>
      </div>
    </div>
  );
}

function PlanCard({ title, plan, actual, remaining, over, percent, status, note }: { title: string; plan: number; actual: number; remaining: number; over: number; percent: number | null; status?: string | null; note?: string }) {
  return (
    <div className="kpi">
      <span>{title}</span>
      <strong>{formatCompactVnd(plan)}</strong>
      <p className="mini-line">Thực hiện: {formatCompactVnd(actual)}</p>
      <p className="mini-line">{status ? `${status}: ${formatCompactVnd(over)}` : `Còn thiếu: ${formatCompactVnd(remaining)}`}</p>
      <p className="mini-line">Hoàn thành: {formatPercent(percent)}</p>
      {note && <p className="mini-line muted">{note}</p>}
    </div>
  );
}

function OverviewGroupTable({ rows, contracts, openContracts }: { rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  return (
    <div className="panel">
      <div className="panel-header"><h2>Xếp hạng nhóm</h2></div>
      <DataTable headers={["#", "Nhóm", "AFYP", "H", "TVV", "Tỷ trng"]}>
        {rows.map((row) => (
          <tr key={`${row.banName}-${row.groupName}`} className="clickable" onClick={() => openContracts(row.groupName, contracts.filter((item) => item.group_name === row.groupName))}>
            <td>{row.rank}</td><td>{row.groupName}</td><td>{moneyCell(row.afyp)}</td><td>{row.contractCount}</td><td>{row.agentCount}</td><td>{formatPercent(row.afypShare)}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function OverviewAgentTable({ rows, contracts, openContracts }: { rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  return (
    <div className="panel">
      <div className="panel-header"><h2>Xếp hạng TVV</h2></div>
      <DataTable headers={["#", "Tên TVV", "Nhóm", "AFYP", "H"]}>
        {rows.map((row) => (
          <tr key={`${row.agentName}-${row.agentCode}`} className="clickable" onClick={() => openContracts(row.agentName, contracts.filter((item) => item.agent_name === row.agentName))}>
            <td>{row.rank}</td><td>{row.agentName}</td><td>{row.groupName}</td><td>{moneyCell(row.afyp)}</td><td>{row.contractCount}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function getVietnamPosterDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year, month, day };
}

function posterDateText() {
  const { year, month, day } = getVietnamPosterDate();
  return {
    monthTitle: `${Number(month)}/${year}`,
    range: `Từ ngày 01/${month} đến ${day}/${month}/${year}`,
    fileMonth: `${month}-${year}`
  };
}

async function waitForPosterImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    image.crossOrigin = "anonymous";
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }));
}

async function downloadElementAsJpg(element: HTMLElement, fileName: string) {
  await waitForPosterImages(element);
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false
  });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.download = fileName;
  link.click();
}

function PosterDownloadButton({ rows, posterRef, fileName }: { rows: any[]; posterRef: RefObject<HTMLDivElement>; fileName: string }) {
  const [message, setMessage] = useState("");
  async function downloadPoster() {
    setMessage("");
    if (!rows.length) {
      setMessage("Không có dữ liệu để xuất poster");
      return;
    }
    if (!posterRef.current) return;
    try {
      await document.fonts?.ready;
      await downloadElementAsJpg(posterRef.current, fileName);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xuất poster.");
    }
  }
  return (
    <div className="poster-action">
      <button className="small-button poster-download-button" type="button" onClick={downloadPoster}><Download size={16} /> Tải ảnh</button>
      {message && <span className="poster-error">{message}</span>}
    </div>
  );
}

type XlsxCell = string | number;
type XlsxRow = Record<string, XlsxCell>;

function exportToXlsx({ rows, sheetName, fileName }: { rows: XlsxRow[]; sheetName: string; fileName: string }) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.max(header.length + 2, ...rows.map((row) => String(row[header] ?? "").length + 2))
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
}

function buildGroupXlsxRows(rows: any[]): XlsxRow[] {
  return rows.map((row) => ({
    "#": row.rank,
    "Ban": row.banName || "",
    "Nhóm": row.groupName || "",
    "AFYP": formatCompactVnd(row.afyp),
    "IP": formatCompactVnd(row.ip),
    "H": row.contractCount,
    "TVV": row.agentCount,
    "Tỷ trng": formatPercent(row.afypShare),
    "BQ/H": formatCompactVnd(row.averageAfypPerContract)
  }));
}

function buildAgentXlsxRows(rows: any[]): XlsxRow[] {
  return rows.map((row) => ({
    "#": row.rank,
    "Mã TVV": row.agentCode || "",
    "Tên TVV": row.agentName || "",
    "Ban": row.banName || "",
    "Nhóm": row.groupName || "",
    "ADS": row.adsName || "",
    "AFYP": formatCompactVnd(row.afyp),
    "IP": formatCompactVnd(row.ip),
    "H": row.contractCount,
    "BQ/H": formatCompactVnd(row.averageAfypPerContract)
  }));
}

function XlsxDownloadButton({ rows, fileName, sheetName }: { rows: XlsxRow[]; fileName: string; sheetName: string }) {
  const [message, setMessage] = useState("");
  function downloadXlsx() {
    setMessage("");
    if (!rows.length) {
      setMessage("Không có dữ liệu để xuất XLSX");
      return;
    }
    try {
      exportToXlsx({ rows, sheetName, fileName });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xuất XLSX.");
    }
  }
  return (
    <div className="poster-action">
      <button className="small-button poster-download-button" type="button" onClick={downloadXlsx}><Download size={16} /> Tải XLSX</button>
      {message && <span className="poster-error">{message}</span>}
    </div>
  );
}

function PosterRank({ rank }: { rank: number }) {
  if (rank > 3) return <span className="poster-rank-number">{rank}</span>;
  return <span className={`poster-medal poster-medal-${rank}`}>{rank}</span>;
}

function RankingPoster({ type, rows }: { type: "group" | "agent"; rows: any[] }) {
  const date = posterDateText();
  const isGroup = type === "group";
  const title = isGroup
    ? `BẢNG VÀNG DOANH THU NHÓM THNG ${date.monthTitle}`
    : `BẢNG VÀNG DOANH THU TƯ VẤN VIÊN THNG ${date.monthTitle}`;
  const headers = isGroup
    ? ["#", "Ban", "Nhóm", "AFYP", "IP", "H", "TVV", "Tỷ trng", "BQ/H"]
    : ["#", "Mã TVV", "Tên TVV", "Ban", "Nhóm", "ADS", "AFYP", "IP", "H", "BQ/H"];
  return (
    <div className="ranking-poster">
      <div className="poster-hero">
        <div className="poster-trophy">★</div>
        <div className="poster-title-block">
          <h1>{title}</h1>
          <div className="poster-rule" />
          <p>{date.range}</p>
        </div>
        <div className="poster-growth">↗</div>
      </div>
      <div className="poster-table-shell">
        <table className="poster-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, 17).map((row) => (
              <tr key={`${type}-${row.rank}-${row.groupName ?? row.agentName}`}>
                {isGroup ? (
                  <>
                    <td><PosterRank rank={row.rank} /></td><td>{row.banName}</td><td>{row.groupName}</td><td>{formatCompactVnd(row.afyp)}</td><td>{formatCompactVnd(row.ip)}</td><td>{row.contractCount}</td><td>{row.agentCount}</td><td>{formatPercent(row.afypShare)}</td><td>{formatCompactVnd(row.averageAfypPerContract)}</td>
                  </>
                ) : (
                  <>
                    <td><PosterRank rank={row.rank} /></td><td>{row.agentCode}</td><td>{row.agentName}</td><td>{row.banName}</td><td>{row.groupName}</td><td>{row.adsName}</td><td>{formatCompactVnd(row.afyp)}</td><td>{formatCompactVnd(row.ip)}</td><td>{row.contractCount}</td><td>{formatCompactVnd(row.averageAfypPerContract)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="poster-footer"><span>↗</span><strong>ơn vị: triệu đồng</strong><span>★</span></div>
    </div>
  );
}

function GroupTable({ month, rows, contracts, openContracts }: { month: string; rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const posterRef = useRef<HTMLDivElement>(null);
  const date = posterDateText();
  const xlsxRows = useMemo(() => buildGroupXlsxRows(rows), [rows]);
  return (
    <div className="panel">
      <div className="panel-header poster-panel-header">
        <h2>Xếp hạng nhóm</h2>
        <div className="poster-actions">
          <PosterDownloadButton rows={rows} posterRef={posterRef} fileName={`bang-vang-doanh-thu-nhom-thang-${date.fileMonth}.jpg`} />
          <XlsxDownloadButton rows={xlsxRows} sheetName="Xếp hạng nhóm" fileName={`xep-hang-nhom-${month}.xlsx`} />
        </div>
      </div>
      <DataTable className="desktop-table" headers={["#", "Ban", "Nhóm", "AFYP", "IP", "H", "TVV", "Tỷ trng", "BQ/H"]}>
        {rows.map((row) => (
          <tr key={`${row.banName}-${row.groupName}`} className="clickable" onClick={() => openContracts(row.groupName, contracts.filter((item) => groupNameForRecord(item) === row.groupName))}>
            <td>{row.rank}</td><td>{row.banName}</td><td>{row.groupName}</td><td>{moneyCell(row.afyp)}</td><td>{formatCompactVnd(row.ip)}</td><td>{row.contractCount}</td><td>{row.agentCount}</td><td>{formatPercent(row.afypShare)}</td><td>{formatCompactVnd(row.averageAfypPerContract)}</td>
          </tr>
        ))}
      </DataTable>
      <MobileGroupRankingCards rows={rows} contracts={contracts} openContracts={openContracts} />
      <div className="poster-offscreen" aria-hidden="true"><div ref={posterRef}><RankingPoster type="group" rows={rows} /></div></div>
    </div>
  );
}

function AgentTable({ month, rows, contracts, openContracts }: { month: string; rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const posterRef = useRef<HTMLDivElement>(null);
  const date = posterDateText();
  const xlsxRows = useMemo(() => buildAgentXlsxRows(rows), [rows]);
  return (
    <div className="panel">
      <div className="panel-header poster-panel-header">
        <h2>Xếp hạng tư vấn viên</h2>
        <div className="poster-actions">
          <PosterDownloadButton rows={rows} posterRef={posterRef} fileName={`bang-vang-doanh-thu-tu-van-vien-thang-${date.fileMonth}.jpg`} />
          <XlsxDownloadButton rows={xlsxRows} sheetName="Xếp hạng TVV" fileName={`xep-hang-tvv-${month}.xlsx`} />
        </div>
      </div>
      <DataTable className="desktop-table" headers={["#", "Mã TVV", "Tên TVV", "Ban", "Nhóm", "ADS", "AFYP", "IP", "H", "BQ/H"]}>
        {rows.map((row) => (
          <tr key={`${row.agentName}-${row.agentCode}`} className="clickable" onClick={() => openContracts(row.agentName, contracts.filter((item) => item.agent_name === row.agentName))}>
            <td>{row.rank}</td><td>{row.agentCode}</td><td>{row.agentName}</td><td>{row.banName}</td><td>{row.groupName}</td><td>{row.adsName}</td><td>{moneyCell(row.afyp)}</td><td>{formatCompactVnd(row.ip)}</td><td>{row.contractCount}</td><td>{formatCompactVnd(row.averageAfypPerContract)}</td>
          </tr>
        ))}
      </DataTable>
      <MobileAgentRankingCards rows={rows} contracts={contracts} openContracts={openContracts} />
      <div className="poster-offscreen" aria-hidden="true"><div ref={posterRef}><RankingPoster type="agent" rows={rows} /></div></div>
    </div>
  );
}

function StatusReport({ report, contracts, openContracts }: { report: any; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const hiddenStatusLabels = new Set(["có hiệu lực", "hoàn phí"]);
  const tableRows = (report.statusTableRows ?? report.groupedStatusRows ?? []).filter((row: any) => !hiddenStatusLabels.has(normalizedContractStatus(row.label)));
  const mobileStatusRows = tableRows;
  const cards = [
    { title: "Tổng hồ sơ", mobileTitle: "Tổng HS", count: report.totalPolicies ?? 0, afyp: report.totalAfyp ?? 0, icon: ClipboardList, tone: "blue" },
    { title: "Có hiệu lực", mobileTitle: "Hiệu lực", count: report.activePolicyCount ?? 0, afyp: report.activePolicyAfyp ?? 0, icon: Target, tone: "green" },
    { title: "Ch xử lý", mobileTitle: "Ch XL", count: report.pendingPolicyCount ?? 0, afyp: report.pendingPolicyAfyp ?? 0, icon: TrendingUp, tone: "orange" },
    { title: "Hoàn phí", mobileTitle: "Hoàn phí", count: report.refundPolicyCount ?? 0, afyp: report.refundPolicyAfyp ?? 0, icon: Coins, tone: "purple" }
  ];

  return (
    <>
      <div className="kpi-grid status-kpi-grid">
        {cards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div className={`kpi status-kpi-card kpi-${card.tone}`} key={card.title}>
              <div className="kpi-desktop-layout">
                <div className="kpi-icon"><CardIcon size={22} /></div>
                <div className="kpi-copy">
                  <span>{card.title}</span>
                  <strong>{formatNumber(card.count)}</strong>
                  <p className="mini-line muted">AFYP: {formatCompactVnd(card.afyp)}</p>
                </div>
              </div>
              <div className="kpi-mobile-layout">
                <div className="kpi-main-row">
                  <div className="kpi-left">
                    <div className="kpi-icon"><CardIcon size={22} /></div>
                    <span>{card.mobileTitle}</span>
                  </div>
                  <strong>{formatNumber(card.count)}</strong>
                </div>
                <p className="mini-line muted">AFYP: {formatCompactVnd(card.afyp)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="panel status-table-panel">
        <DataTable className="desktop-table" headers={["Nhóm trạng thái", "Số hồ sơ", "AFYP", "Tỷ lệ"]}>
          {tableRows.map((row: any) => (
            <tr key={row.key ?? row.label} className="clickable" onClick={() => openContracts(row.label, contracts.filter((item) => row.statuses?.includes(normalizedContractStatus(item.policy_status))))}>
              <td>{row.label}</td><td>{formatNumber(row.count)}</td><td>{formatCompactVnd(row.afyp)}</td><td>{formatPercent(row.rate)}</td>
            </tr>
          ))}
        </DataTable>
        <div className="mobile-card-list status-mobile-list">
          {mobileStatusRows.map((row: any) => (
            <button className="mobile-status-card" key={row.key ?? row.label} type="button" onClick={() => openContracts(row.label, contracts.filter((item) => row.statuses?.includes(normalizedContractStatus(item.policy_status))))}>
              <strong>{compactStatusLabel(row.label)}</strong>
              <div className="mobile-metric-grid compact">
                <MobileMetric label="HS" value={formatNumber(row.count)} />
                <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function TimeReport({ report }: { report: any }) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><span>Dự báo cuối tháng</span><strong>{formatCompactVnd(report.forecastMonthEndAfyp)}</strong></div>
        <div className="kpi"><span>Dự báo hoàn thành</span><strong>{formatPercent(report.forecastAchievementRate)}</strong></div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>AFYP/IP theo ngày</h2></div>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={report.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}tr`} />
              <Tooltip formatter={(v) => formatVnd(Number(v))} />
              <Legend />
              <Bar dataKey="afyp" name="AFYP" fill="#0759a3" />
              <Bar dataKey="ip" name="IP" fill="#f7c948" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Kế hoạch AFYP theo tháng năm 2026</h2></div>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={report.yearPlanRows ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis tickFormatter={(v) => `${Number(v) / 1_000_000_000} tỷ`} />
              <Tooltip formatter={(v) => formatVnd(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="actual" name="AFYP thực hiện" stroke="#0759a3" strokeWidth={2} />
              <Line type="monotone" dataKey="monthlyPlan" name="Kế hoạch tháng" stroke="#f7c948" strokeWidth={2} />
              <Line type="monotone" dataKey="cumulativeActual" name="Thực hiện lũy kế" stroke="#0f8b55" strokeWidth={2} />
              <Line type="monotone" dataKey="cumulativePlan" name="Kế hoạch lũy kế" stroke="#c2413b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Lũy kế AFYP và chỉ tiêu</h2></div>
        <div className="chart">
          <ResponsiveContainer>
            <AreaChart data={report.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}tr`} />
              <Tooltip formatter={(v) => formatVnd(Number(v))} />
              <Legend />
              <Area dataKey="cumulativeAfyp" name="AFYP lũy kế" stroke="#0759a3" fill="#e9f4ff" />
              <Area dataKey="targetCumulative" name="Chỉ tiêu lũy kế" stroke="#f7c948" fill="#fff6d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function formatPlanMillion(value: number | null) {
  if (!value) return "-";
  return `${value.toLocaleString("vi-VN")} triệu`;
}

function AdsTable({ rows, month, contracts, openContracts }: { rows: any[]; month: string; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const adsColWidths = ["18%", "12%", "15%", "13%", "12%", "8%", "8%", "14%"];
  return (
    <div className="panel">
      <div className="panel-header"><h2>Báo cáo ADS</h2></div>
      <DataTable className="desktop-table ads-table" headers={["Tên ADS", "AFYP", "Kế hoạch tháng", "HT kế hoạch", "IP", "H", "TVV", "Tỷ trng"]} colWidths={adsColWidths}>
        {rows.map((row) => {
          const planMillion = getAdsPlan(row.adsName, month);
          const planVnd = planMillion ? planMillion * 1_000_000 : 0;
          const achievement = planVnd > 0 ? (Number(row.afyp ?? 0) / planVnd) * 100 : null;
          return (
            <tr key={`${row.adsName}-${row.adsCode}`} className="clickable" onClick={() => openContracts(row.adsName, contracts.filter((item) => item.ads_name === row.adsName))}>
              <td>{row.adsName}</td><td>{moneyCell(row.afyp)}</td><td>{formatPlanMillion(planMillion)}</td><td>{formatPercent(achievement)}</td><td>{formatCompactVnd(row.ip)}</td><td>{row.contractCount}</td><td>{row.agentCount}</td><td>{formatPercent(row.afypShare)}</td>
            </tr>
          );
        })}
      </DataTable>
      <MobileAdsCards rows={rows} month={month} contracts={contracts} openContracts={openContracts} />
    </div>
  );
}

function ticketLabel(value: number) {
  return value > 0 ? `${String(value).padStart(2, "0")} vé` : "-";
}

function StarVietPanel({ report, warning }: { report: any; warning?: string | null }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [rank, setRank] = useState("");
  const rows = report?.rows ?? [];
  const summary = report?.summary ?? {};
  const options = report?.options ?? {};
  const normalizedSearch = normalizeViText(search.trim());
  const filteredRows = rows.filter((row: any) => {
    if (normalizedSearch && !normalizeViText(row.agentName).includes(normalizedSearch)) return false;
    if (group && row.groupName !== group) return false;
    if (rank && row.currentRank !== rank) return false;
    return true;
  });

  return (
    <div className="star-viet-page">
      <section className="star-viet-hero">
        <div>
          <p>Sao Việt cá nhân</p>
          <h2>SAO VIỆT C NHÂN</h2>
          <span>Theo dõi danh hiệu Sao Việt năm 2026</span>
        </div>
        <div className="star-viet-highlight">
          <span className="star-rank-badge gold">Hạng Vàng</span>
          <span className="star-rank-badge platinum">Hạng Bạch Kim</span>
          <span className="star-rank-badge diamond">Hạng Kim Cương</span>
        </div>
      </section>
      {warning && <p className="warning-list">{warning}</p>}
      <section className="kpi-grid star-viet-kpis">
        <KpiCard tone="blue" icon={Users} title="TVV theo dõi" value={formatNumber(summary.totalAgents ?? 0)} />
        <KpiCard tone="gold" icon={Trophy} title="ạt Sao Việt" value={formatNumber(summary.achievedAgents ?? 0)} />
        <KpiCard tone="green" icon={Coins} title="Tổng AFYP Sao Việt" value={formatCompactVnd(summary.totalAfyp ?? 0)} />
        <KpiCard tone="purple" icon={Medal} title="Gần đạt mốc" value={formatNumber(summary.nearNextAgents ?? 0)} />
      </section>
      <section className="panel">
        <div className="panel-header star-viet-table-header">
          <h2>Xếp hạng Sao Việt cá nhân</h2>
          <span>{filteredRows.length} TVV</span>
        </div>
        <div className="star-viet-filters">
          <label className="contract-search-field star-viet-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Tìm TVV Sao Việt</span>
            <input aria-label="Tìm TVV Sao Việt" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm TVV" />
          </label>
          <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Lc nhóm Sao Việt">
            <option value="">Tất cả nhóm</option>
            {(options.groups ?? []).map((item: string) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={rank} onChange={(event) => setRank(event.target.value)} aria-label="Lc hạng Sao Việt">
            <option value="">Tất cả hạng</option>
            {(options.ranks ?? []).map((item: string) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <DataTable className="desktop-table star-viet-table" headers={["STT", "Tên TVV", "Nhóm", "Tổng AFYP Sao Việt", "Hạng hiện tại", "Số vé", "Mốc tiếp theo", "Còn thiếu", "Tiến độ"]}>
          {filteredRows.map((row: any) => (
            <tr key={`${row.rank}-${row.agentName}`}>
              <td>{row.rank}</td>
              <td>{row.agentName}</td>
              <td>{row.groupName || "-"}</td>
              <td><strong>{formatCompactVnd(row.totalAfyp)}</strong></td>
              <td><span className={`star-rank-badge ${row.rankTone}`}>{row.currentRank}</span></td>
              <td>{ticketLabel(row.currentTickets)}</td>
              <td>{row.nextRank}</td>
              <td>{formatCompactVnd(row.remainingToNext)}</td>
              <td><StarProgress row={row} /></td>
            </tr>
          ))}
        </DataTable>
        <div className="mobile-card-list star-viet-mobile-list">
          {filteredRows.map((row: any) => (
            <article className="star-viet-card" key={`${row.rank}-${row.agentName}-mobile`}>
              <div className="star-viet-card-head"><strong>#{row.rank} {row.agentName}</strong></div>
              <div className="star-viet-card-meta">
                <span>Nhóm</span>
                <strong>{row.groupName || "-"}</strong>
              </div>
              <div className="star-viet-card-meta">
                <span>Tổng AFYP Sao Việt</span>
                <strong>{formatCompactVnd(row.totalAfyp)}</strong>
              </div>
              <div className="star-viet-card-badges"><span className={`star-rank-badge ${row.rankTone}`}>{row.currentRank}</span><span className="star-ticket">{ticketLabel(row.currentTickets)}</span></div>
              <div className="star-next-block">
                {row.remainingToNext > 0 ? (
                  <>
                    <p><span>Mốc tiếp theo:</span><strong>{row.nextRank}</strong></p>
                    <p><span>Còn thiếu:</span><strong>{formatCompactVnd(row.remainingToNext)}</strong></p>
                  </>
                ) : (
                  <p><span>Mốc tiếp theo:</span><strong>ã đạt mốc cao nhất</strong></p>
                )}
                <StarProgress row={row} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StarProgress({ row }: { row: any }) {
  const progress = Math.max(0, Math.min(100, Number(row.progress ?? 0)));
  const tone = row.remainingToNext > 0 ? rankTone(row.nextRank) : row.rankTone;
  return (
    <div className={`star-progress star-progress-${tone}`}>
      <div className="star-progress-top">
        <span>{formatCompactVnd(row.totalAfyp)} / {row.remainingToNext > 0 ? formatCompactVnd(row.nextThreshold) : formatCompactVnd(row.totalAfyp)}</span>
        <b>{formatPercent(progress)}</b>
      </div>
      <div className="star-progress-bar"><span style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function rankTone(rank: string) {
  const normalized = normalizeViText(rank ?? "");
  if (normalized.includes("kim cuong")) return "diamond";
  if (normalized.includes("bach? kim")) return "platinum";
  if (normalized.includes("vang")) return "gold";
  return "none";
}

function AdminPanel({ month, planRows, onSaved }: { month: string; planRows: any[]; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  async function save() {
    setMessage("");
    const response = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, afypTarget: Number(value) })
    });
    const payload = await response.json();
    if (!response.ok) setMessage(payload.error || "Không lưu được chỉ tiêu.");
    else {
      setMessage("ã lưu chỉ tiêu tháng.");
      onSaved();
    }
  }
  return (
    <>
      <div className="panel">
        <div className="panel-header"><h2>Chỉ tiêu AFYP cấp công ty</h2></div>
        <div className="form-row">
          <label><span className="label">Tháng</span><input value={month} disabled /></label>
          <label><span className="label">Chỉ tiêu AFYP</span><input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ví dụ: 5000000000" /></label>
          <button onClick={save}>Lưu chỉ tiêu</button>
        </div>
        {message && <p className={message.startsWith("ã") ? "success" : "error-list"}>{message}</p>}
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Kế hoạch AFYP năm 2026</h2><span>Tổng 54 tỷ</span></div>
        <DataTable headers={["Tháng", "Tỷ lệ", "Kế hoạch triệu đồng", "Kế hoạch VND", "AFYP thực hiện", "Còn thiếu", "% hoàn thành"]}>
          {planRows.map((row) => (
            <tr key={row.monthKey}>
              <td>{row.month}</td>
              <td>{formatPercent(row.rate)}</td>
              <td>{row.planMillion.toLocaleString("vi-VN")}</td>
              <td>{formatCompactVnd(row.planVnd)}</td>
              <td>{formatCompactVnd(row.actual)}</td>
              <td>{formatCompactVnd(row.remaining)}</td>
              <td>{formatPercent(row.progressPercent)}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}

function targetTypesText(value: unknown) {
  const normalizeTarget = (item: unknown) => {
    const text = String(item ?? "").trim();
    const normalized = normalizeViText(text);
    if (normalized.includes("hop dong") || normalized.includes("hd")) return "Hợp đồng";
    if (normalized.includes("nhom")) return "Nhóm";
    if (normalized.includes("tvv") || normalized.includes("tu van")) return "TVV";
    return text;
  };
  if (Array.isArray(value)) return [...new Set(value.map(normalizeTarget).filter(Boolean))].join(", ");
  if (typeof value === "string") return normalizeTarget(value);
  return "-";
}

function rewardRuleCards(rule: any) {
  return Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
}

function competitionStatusClass(status?: string | null) {
  const normalized = normalizeViText(status ?? "");
  if (normalized.includes("co ket qua")) return "done";
  if (normalized.includes("khong co")) return "warning";
  if (normalized.includes("cho") || normalized.includes("xac nhan")) return "review";
  return "pending";
}

function competitionStatusText(status?: string | null) {
  const text = String(status ?? "").trim();
  if (text.startsWith("ã ")) return `Đ${text}`;
  if (text.startsWith("a tinh")) return `Đã tính${text.slice("a tinh".length)}`;
  return text;
}

function vietnamDateOnly(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

function competitionRemainingInfo(endDate?: string | null) {
  if (!endDate) return { days: null, text: "-", tone: "ended" };
  const remainingDays = Math.round((vietnamDateOnly(endDate) - vietnamDateOnly()) / 86_400_000);
  if (remainingDays < 0) return { days: remainingDays, text: "Đã kết thúc", tone: "ended" };
  if (remainingDays === 0) return { days: remainingDays, text: "Kết thúc hôm nay", tone: "danger" };
  if (remainingDays <= 2) return { days: remainingDays, text: `Còn ${remainingDays} ngày`, tone: "danger" };
  if (remainingDays <= 4) return { days: remainingDays, text: `Còn ${remainingDays} ngày`, tone: "warning" };
  return { days: remainingDays, text: `Còn ${remainingDays} ngày`, tone: "success" };
}

function CompetitionRemainingBadge({ endDate }: { endDate?: string | null }) {
  const remaining = competitionRemainingInfo(endDate);
  return <span className={`contest-remaining ${remaining.tone}`}>{remaining.text}</span>;
}

function buildCompetitionGroupRows(advisors: any[] = [], contracts: any[] = []) {
  const byGroup = new Map<string, any>();
  for (const advisor of advisors) {
    const group = String(advisor.team || "Không xác định").trim() || "Không xác định";
    const current = byGroup.get(group) ?? {
      group,
      totalIP: 0,
      totalAFYP: 0,
      activeAdvisors: new Set<string>(),
      contractCount: 0,
      rewardPerAdvisor: 0,
      totalReward: 0,
      milestones: new Set<string>(),
      notes: new Set<string>()
    };
    current.totalIP += Number(advisor.total_ip ?? 0);
    current.totalAFYP += Number(advisor.total_afyp ?? 0);
    current.contractCount += Number(advisor.eligible_contract_count ?? 0);
    current.rewardPerAdvisor = Math.max(current.rewardPerAdvisor, Number(advisor.reward_amount ?? 0));
    current.totalReward += Number(advisor.reward_amount ?? 0);
    if (advisor.tvv) current.activeAdvisors.add(String(advisor.tvv));
    for (const name of advisor.achieved_reward_names ?? []) current.milestones.add(String(name));
    if (advisor.note) current.notes.add(String(advisor.note));
    byGroup.set(group, current);
  }
  for (const contract of contracts) {
    const group = String(contract.team || "Không xác định").trim() || "Không xác định";
    const current = byGroup.get(group);
    if (!current) continue;
    current.totalIP = Math.max(current.totalIP, Number(contract.ip ?? 0));
    current.totalAFYP = Math.max(current.totalAFYP, Number(contract.afyp ?? 0));
  }
  return [...byGroup.values()]
    .filter((row) => row.totalReward > 0)
    .map((row) => ({
      ...row,
      activeAdvisorCount: row.activeAdvisors.size,
      milestone: [...row.milestones][0] || [...row.notes][0] || "-",
      note: [...row.notes].join("; ") || "-"
    }))
    .sort((a, b) => b.totalReward - a.totalReward || b.totalIP - a.totalIP);
}

function normalizeCompetitionRewardGroups(rows: any[] = []) {
  return rows
    .map((row) => ({
      group: String(row.team || row.group || "-").trim() || "-",
      totalIP: Number(row.total_ip ?? row.totalIP ?? 0),
      totalAFYP: Number(row.total_afyp ?? row.totalAFYP ?? 0),
      activeAdvisorCount: Number(row.active_advisor_count ?? row.activeAdvisorCount ?? 0),
      contractCount: Number(row.eligible_contract_count ?? row.contractCount ?? 0),
      milestone: repairMojibake(row.achieved_tier || row.milestone || "-"),
      rewardPerAdvisor: Number(row.reward_per_advisor ?? row.rewardPerAdvisor ?? 0),
      totalReward: Number(row.total_reward ?? row.totalReward ?? 0),
      note: repairMojibake(Number(row.total_reward ?? row.totalReward ?? 0) > 0
        ? (row.prize_name || row.reward_name || row.note || "-")
        : (row.note || row.prize_name || row.reward_name || "-"))
    }))
    .sort((a, b) =>
      Number(a.totalReward > 0) - Number(b.totalReward > 0)
      || (a.totalReward > 0 ? b.totalReward - a.totalReward : b.totalIP - a.totalIP)
    );
}

function isWaitingRuleConfirmation(program?: CompetitionProgramView | null) {
  return Boolean(program && !program.confirmedRule && String(program.status || "").includes("Ch xác nhận"));
}

function competitionFlowMessage(program: CompetitionProgramView | undefined, detail: any, month: string, isCalculating: boolean) {
  if (isCalculating) return { tone: "success", text: "Đang tính thưởng" };
  if (!program) return { tone: "info", text: "Đang tải chi tiết" };
  if (isWaitingRuleConfirmation(program)) {
    return {
      tone: "warning",
      text: "Chương trình chưa xác nhận rule. Vui lòng vào tab Rule AI để xác nhận trước khi tính thưởng."
    };
  }
  if (String(detail?.result?.result_summary?.error || "").includes("Chưa có dữ liệu")) {
    return { tone: "warning", text: "Chưa có dữ liệu hợp đồng trong thi gian thi đua. Vui lòng upload CSV có chứa khoảng thi gian chương trình trước." };
  }
  if (!program.lastCalculatedAt) {
    return { tone: "info", text: "ã xác nhận rule. Có thể tính thưởng từ dữ liệu CSV theo thi gian chương trình." };
  }
  if ((program.totalEligibleContracts ?? 0) === 0 && (program.totalEligibleAdvisors ?? 0) === 0) {
    return { tone: "warning", text: "Đã tính thưởng nhưng không có hợp đồng nào thỏa điều kiện." };
  }
  return { tone: "success", text: "Đã tính có kết quả" };
}

function logCompetitionCalculationDebug(params: {
  programId: string;
  program?: CompetitionProgramView | null;
  month: string;
  payload: any;
}) {
  const resultSummary = params.payload?.rewardResult?.summary
    ?? params.payload?.result?.result_summary?.summary
    ?? params.payload?.result?.result_summary
    ?? null;

  console.log({
    programId: params.programId,
    status: params.program?.status,
    hasAiRule: Boolean(params.program?.aiRule),
    hasConfirmedRule: Boolean(params.program?.confirmedRule),
    contractsCount: Number(resultSummary?.debug?.inputRows ?? 0),
    selectedMonth: params.month,
    resultSummary
  });
}

function CompetitionPanel({ month, refreshKey, onChanged }: { month: string; refreshKey: number; onChanged: () => void }) {
  const [programs, setPrograms] = useState<CompetitionProgramView[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");

  async function loadPrograms() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/competition", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được chương trình thi đua.");
      setPrograms(payload.programs ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được chương trình thi đua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
  }, [refreshKey]);

  return (
    <>
      <div className="panel contest-panel competition-section">
        <div className="panel-header contest-header">
          <div>
            <h2><Trophy size={18} /> Danh sách chương trình thi đua</h2>
          </div>
        </div>
        {message && <p className={message.includes("ã") || message.includes("ang") ? "success" : "error-list"}>{message}</p>}
        {loading ? (
          <p>Đang tải chương trình thi đua...</p>
        ) : programs.length === 0 ? (
          <p className="empty-state">Chưa có chương trình thi đua. Hãy upload poster để AI tạo rule.</p>
        ) : (
          <>
            <DataTable className="desktop-table contest-table" headers={["Tên chương trình", "Thời gian", "Phát hành đến", "Còn lại", "TVV đạt", "HĐ đạt", "Thưởng dự kiến", "Thao tác"]}>
              {programs.map((program) => (
                <tr key={program.id} className={selectedProgramId === program.id ? "selected" : ""}>
                  <td><strong><Trophy size={16} /> {program.programName}</strong></td>
                  <td>{formatDateVi(program.startDate)} - {formatDateVi(program.endDate)}</td>
                  <td>{formatDateVi(program.issueDeadline) || "-"}</td>
                  <td><CompetitionRemainingBadge endDate={program.endDate} /></td>
                  <td>{formatNumber(program.totalEligibleAdvisors ?? 0)}</td>
                  <td>{formatNumber(program.totalEligibleContracts ?? 0)}</td>
                  <td>{formatCompactVnd(program.totalReward ?? 0)}</td>
                  <td>
                    <button className="small-button" type="button" onClick={() => setSelectedProgramId((current) => current === program.id ? "" : program.id)}>Xem chi tiết</button>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="mobile-card-list contest-mobile-list">
              {programs.map((program) => (
                <article className="contest-mobile-card" key={`${program.id}-mobile`}>
                  <div className="contest-mobile-head">
                    <div>
                      <strong>{program.programName}</strong>
                      <span>{formatDateVi(program.startDate)} - {formatDateVi(program.endDate)}</span>
                    </div>
                  </div>
                  <CompetitionRemainingBadge endDate={program.endDate} />
                  <div className="mobile-info-grid">
                    <span><b>TVV đạt</b>{formatNumber(program.totalEligibleAdvisors ?? 0)}</span>
                    <span><b>HĐ đạt</b>{formatNumber(program.totalEligibleContracts ?? 0)}</span>
                    <span><b>Thưởng</b>{formatCompactVnd(program.totalReward ?? 0)}</span>
                    <span><b>Còn lại</b><CompetitionRemainingBadge endDate={program.endDate} /></span>
                  </div>
                  <button type="button" onClick={() => setSelectedProgramId((current) => current === program.id ? "" : program.id)}>Xem chi tiết</button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      {selectedProgramId && <CompetitionDetailModal programId={selectedProgramId} month={month} refreshKey={refreshKey} onClose={() => setSelectedProgramId("")} onChanged={() => { onChanged(); loadPrograms(); }} />}
    </>
  );
}

function CompetitionUploadModal({ onClose, onAnalyzed }: { onClose: () => void; onAnalyzed: (program: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/competition/analyze-poster", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI không phân tích được poster.");
      onAnalyzed(payload.program);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI không phân tích được poster.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="contract-modal-backdrop">
      <div className="contract-modal contest-detail-modal" role="dialog" aria-modal="true">
        <div className="contract-modal-header">
          <div><h2>Thêm CTTĐ</h2><p>Upload poster JPG/PNG, AI sẽ đc nội dung và tạo rule nháp.</p></div>
          <button className="contract-modal-close" type="button" onClick={onClose} aria-label="óng">×</button>
        </div>
        <div className="contract-modal-body contest-rule-content">
          <label><span className="label">Poster chương trình</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          {error && <p className="error-list">{error}</p>}
          <div className="contest-run-row">
            <button type="button" disabled={!file || busy} onClick={submit}>{busy ? "AI đang đc poster..." : "Phân tích bằng AI"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitionRuleModal({ program, month, onClose, onChanged }: { program: any; month: string; onClose: () => void; onChanged: () => void }) {
  const initialRule = program.confirmedRule || program.confirmed_rule || program.aiRule || program.ai_rule || {};
  const [jsonText, setJsonText] = useState(JSON.stringify(initialRule, null, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function parsedRule() {
    return JSON.parse(jsonText);
  }

  async function confirmRule(shouldCalculate = false) {
    setBusy(true);
    setMessage("");
    try {
      const confirmedRule = parsedRule();
      const response = await fetch("/api/competition/confirm-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: program.id, confirmed_rule: confirmedRule })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được rule.");
      if (shouldCalculate) {
        const calc = await fetch("/api/competition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ program_id: program.id, month })
        });
        const calcPayload = await calc.json();
        if (!calc.ok) throw new Error(calcPayload.error || "Không tính được thưởng.");
      }
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rule JSON không hợp lệ.");
    } finally {
      setBusy(false);
    }
  }

  let preview: any = {};
  try { preview = JSON.parse(jsonText); } catch { preview = {}; }

  return (
    <div className="contract-modal-backdrop">
      <div className="contract-modal contest-detail-modal" role="dialog" aria-modal="true">
        <div className="contract-modal-header">
          <div><h2>Kiểm tra rule AI</h2><p>{preview.program_name || program.programName || program.program_name}</p></div>
          <button className="contract-modal-close" type="button" onClick={onClose} aria-label="óng">×</button>
        </div>
        <div className="contract-modal-body contest-rule-content">
          <div className="contest-overview-grid">
            <div className="contest-overview-item"><span>Thời gian thi đua</span><strong>{formatDateVi(preview.start_date)} - {formatDateVi(preview.end_date)}</strong></div>
            <div className="contest-overview-item"><span>Phát hành đến</span><strong>{formatDateVi(preview.issue_deadline) || "-"}</strong></div>
            <div className="contest-overview-item"><span>Đối tượng</span><strong>{targetTypesText(preview.target_types)}</strong></div>
          </div>
          <div className="contest-overview-grid">
            {(preview.reward_rules ?? []).slice(0, 6).map((rule: any, index: number) => (
              <div className="contest-overview-item" key={rule.id || index}>
                <span>{rule.reward_name || `Giải ${index + 1}`}</span>
                <strong>{rule.condition_text || rule.calculation_logic || rule.reward_type}</strong>
                <small>{formatCompactVnd(Number(rule.reward_amount ?? 0))}</small>
              </div>
            ))}
          </div>
          {program.extractedText || program.extracted_text ? <div><h3>Nội dung AI đc được</h3><p>{program.extractedText || program.extracted_text}</p></div> : null}
          {message && <p className="error-list">{message}</p>}
          <div className="contest-run-row">
            <button className="secondary" type="button" disabled={busy} onClick={() => confirmRule(false)}>Xác nhận rule</button>
            <button type="button" disabled={busy} onClick={() => confirmRule(true)}>Tính thưởng</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitionKpiCard({ label, value, icon: Icon, highlight = false }: { label: string; value: string; icon: LucideIcon; highlight?: boolean }) {
  return (
    <div className={`contest-kpi-card ${highlight ? "highlight" : ""}`}>
      <span className="contest-kpi-icon"><Icon size={20} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function rankLabel(index: number) {
  return index < 3 ? ["1", "2", "3"][index] : String(index + 1);
}

function CompetitionTopPanel({ title, actionTab, onOpen, headers, rows }: { title: string; actionTab: "groups" | "advisors" | "contracts"; onOpen: (tab: "groups" | "advisors" | "contracts") => void; headers: string[]; rows: ReactNode }) {
  return (
    <section className="contest-top-panel">
      <div className="contest-top-header">
        <h3>{title}</h3>
        <button type="button" onClick={() => onOpen(actionTab)}>Xem tất cả</button>
      </div>
      <div className="contest-top-table">
        <table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

const COMPETITION_STATUS_LEGEND = [
  ["Đang kiểm tra YCBH", "#1677ff"],
  ["CNBH chuẩn", "#19a65a"],
  ["Chờ ĐGRR", "#f58b00"],
  ["CNBH có điều kiện", "#8b5cf6"],
  ["Đang ĐGRR", "#12a7a2"],
  ["Có hiệu lực", "#16a34a"]
];

function CompetitionDetailModal({ programId, month, refreshKey, onClose, onChanged }: { programId: string; month: string; refreshKey: number; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<any | null>(null);
  const [tab, setTab] = useState<"overview" | "groups" | "advisors" | "contracts">("overview");
  const [message, setMessage] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  async function loadDetail() {
    const response = await fetch(`/api/competition?id=${programId}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Không tải được chi tiết chương trình.");
    setDetail(payload);
  }

  useEffect(() => {
    loadDetail().catch((error) => setMessage(error instanceof Error ? error.message : "Không tải được chi tiết chương trình."));
  }, [programId, refreshKey]);

  const program: CompetitionProgramView | undefined = detail?.program;
  const eligibleContracts = (detail?.rewardContracts ?? []).filter((row: any) => row.is_eligible);
  const groupRows = normalizeCompetitionRewardGroups(detail?.rewardGroups ?? []);
  const flowStatus = competitionFlowMessage(program, detail, month, isCalculating);
  const sortedContracts = [...eligibleContracts].sort((a: any, b: any) =>
    String(b.collection_date ?? "").localeCompare(String(a.collection_date ?? ""))
    || Number(b.ip ?? 0) - Number(a.ip ?? 0)
  );
  const achievedGroupRows = groupRows.filter((row) => Number(row.totalReward ?? 0) > 0);
  const topGroups = achievedGroupRows.slice(0, 5);
  const topAdvisors = [...(detail?.rewardAdvisors ?? [])].sort((a: any, b: any) => Number(b.total_ip ?? 0) - Number(a.total_ip ?? 0)).slice(0, 5);
  const topContracts = sortedContracts.slice(0, 5);

  return (
    <section className="competition-detail-panel">
      <div className="competition-detail-header">
        <div className="competition-detail-title">
          <span className="competition-title-icon"><Trophy size={22} /></span>
          <div>
            <h2>{program?.programName || "Chi tiết chương trình thi đua"}</h2>
            <p>
              {program && <span className={`contest-status ${competitionStatusClass(program.status)}`}>{competitionStatusText(program.status)}</span>}
            </p>
          </div>
        </div>
      </div>
        <div className="contest-detail-tabs" role="tablist">
          {[
            ["overview", "Tổng quan", LayoutGrid],
            ["groups", "Nhóm đạt", Users],
            ["advisors", "TVV đạt", UserRound],
            ["contracts", "HĐ đạt", ClipboardList]
          ].map(([id, label, Icon]) => {
            const TabIcon = Icon as LucideIcon;
            return <button key={id as string} className={tab === id ? "active" : ""} type="button" onClick={() => setTab(id as any)}><TabIcon size={16} />{label as string}</button>;
          })}
        </div>
        <div className="competition-detail-content contest-detail-body">
          {message && <p className={message.includes("ã") || message.includes("ang") ? "success" : "error-list"}>{message}</p>}
          {detail && <p className={`competition-flow-alert ${flowStatus.tone}`}>{flowStatus.text}</p>}
          {!detail ? <p>Đang tải chi tiết...</p> : (
            <>
              {tab === "overview" && program && (
                <>
                  <div className="contest-overview-grid">
                    <CompetitionKpiCard label="Thời gian thi đua" value={`${formatDateVi(program.startDate)} - ${formatDateVi(program.endDate)}`} icon={CalendarDays} />
                    <CompetitionKpiCard label="Phát hành đến" value={formatDateVi(program.issueDeadline) || "-"} icon={Megaphone} />
                    <div className="contest-kpi-card"><span className="contest-kpi-icon"><CalendarDays size={20} /></span><span>Còn lại</span><strong><CompetitionRemainingBadge endDate={program.endDate} /></strong></div>
                    <CompetitionKpiCard label="Đối tượng" value={targetTypesText(program.targetTypes)} icon={Target} />
                    <CompetitionKpiCard label="Tổng nhóm đạt" value={formatNumber(achievedGroupRows.length)} icon={Users} />
                    <CompetitionKpiCard label="Tổng TVV đạt" value={formatNumber(program.totalEligibleAdvisors ?? 0)} icon={UserRound} />
                    <CompetitionKpiCard label="Tổng HĐ đạt" value={formatNumber(program.totalEligibleContracts ?? 0)} icon={ClipboardList} />
                    <CompetitionKpiCard label="Tổng IP đạt" value={formatCompactVnd(program.totalIP ?? 0)} icon={Coins} />
                    <CompetitionKpiCard label="Tổng AFYP đạt" value={formatCompactVnd(program.totalAFYP ?? 0)} icon={TrendingUp} />
                    <CompetitionKpiCard label="Tổng thưởng" value={formatVnd(program.totalReward ?? 0)} icon={Trophy} highlight />
                  </div>
                  <div className="contest-top-grid">
                    <CompetitionTopPanel title="Top 5 nhóm đạt" actionTab="groups" onOpen={setTab as any} headers={["#", "Nhóm", "Tổng IP", "Mốc đạt", "Tổng thưởng"]} rows={topGroups.map((row, index) => (
                      <tr key={row.group || index}><td><span className={`rank-badge rank-${index + 1}`}>{rankLabel(index)}</span></td><td>{row.group}</td><td>{formatCompactVnd(row.totalIP ?? 0)}</td><td>{row.milestone}</td><td>{formatCompactVnd(row.totalReward ?? 0)}</td></tr>
                    ))} />
                    <CompetitionTopPanel title="Top 5 TVV đạt" actionTab="advisors" onOpen={setTab as any} headers={["#", "TVV", "HĐ đạt", "Tổng IP", "Thưởng"]} rows={topAdvisors.map((row: any, index: number) => (
                      <tr key={row.id || index}><td><span className={`rank-badge rank-${index + 1}`}>{rankLabel(index)}</span></td><td>{row.tvv}</td><td>{row.eligible_contract_count}</td><td>{formatCompactVnd(row.total_ip ?? 0)}</td><td>{formatCompactVnd(row.reward_amount ?? 0)}</td></tr>
                    ))} />
                    <CompetitionTopPanel title="Top 5 HĐ đạt" actionTab="contracts" onOpen={setTab as any} headers={["#", "Số GYC", "TVV", "IP", "Thưởng"]} rows={topContracts.map((row: any, index: number) => (
                      <tr key={row.id || index}><td><span className={`rank-badge rank-${index + 1}`}>{rankLabel(index)}</span></td><td>{row.gyc_no}</td><td>{row.tvv}</td><td>{formatCompactVnd(row.ip ?? 0)}</td><td>{formatCompactVnd(row.reward_amount ?? 0)}</td></tr>
                    ))} />
                  </div>
                  <div className="contest-note-grid">
                    <div className="contest-note-box"><span>i</span><p><strong>Ghi chú</strong>Hợp đồng chỉ tính thưởng khi thỏa điều kiện: IP/HĐ ≥ 15 triệu, trong thời gian thi đua và không thuộc trạng thái loại trừ.</p></div>
                    <div className="contest-legend-box"><strong>Trạng thái hợp đồng được tính:</strong>{COMPETITION_STATUS_LEGEND.map(([label, color]) => <span key={label}><i style={{ backgroundColor: color }} />{label}</span>)}</div>
                  </div>
                </>
              )}
              {tab === "groups" && <CompetitionGroupsTable rows={groupRows} />}
              {tab === "advisors" && <CompetitionAdvisorsTable rows={detail.rewardAdvisors ?? []} />}
              {tab === "contracts" && <CompetitionContractsTable rows={eligibleContracts} />}
            </>
          )}
        </div>
    </section>
  );
}

function CompetitionGroupsTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có nhóm đạt mốc thưởng.</p>;
  return (
    <>
      <DataTable className="desktop-table contest-mini-table contest-wide-table" headers={["STT", "Nhóm", "Tổng IP", "Tổng AFYP", "Số TVV hoạt động", "Số HĐ đạt", "Mốc đạt", "Thưởng/TVV", "Tổng thưởng nhóm", "Ghi chú"]}>
        {rows.map((row, index) => (
          <tr key={row.group || index}>
            <td>{index + 1}</td><td>{row.group}</td><td>{formatCompactVnd(row.totalIP ?? 0)}</td><td>{formatCompactVnd(row.totalAFYP ?? 0)}</td><td>{formatNumber(row.activeAdvisorCount ?? 0)}</td><td>{formatNumber(row.contractCount ?? 0)}</td><td>{row.milestone}</td><td>{formatCompactVnd(row.rewardPerAdvisor ?? 0)}</td><td>{formatCompactVnd(row.totalReward ?? 0)}</td><td><CompetitionGroupNote note={row.note} /></td>
          </tr>
        ))}
      </DataTable>
      <div className="contest-detail-card-list">
        {rows.map((row, index) => (
          <article className="contest-result-card" key={`${row.group || index}-mobile`}>
            <div className="contest-result-card-head"><strong>{index + 1}. {row.group}</strong><span>{formatCompactVnd(row.totalReward ?? 0)}</span></div>
            <div className="mobile-info-grid">
              <span><b>Tổng IP</b>{formatCompactVnd(row.totalIP ?? 0)}</span>
              <span><b>Tổng AFYP</b>{formatCompactVnd(row.totalAFYP ?? 0)}</span>
              <span><b>TVV hoạt động</b>{formatNumber(row.activeAdvisorCount ?? 0)}</span>
              <span><b>HĐ đạt</b>{formatNumber(row.contractCount ?? 0)}</span>
              <span><b>Mốc đạt</b>{row.milestone}</span>
              <span><b>Thưởng/TVV</b>{formatCompactVnd(row.rewardPerAdvisor ?? 0)}</span>
            </div>
            <small><CompetitionGroupNote note={row.note} /></small>
          </article>
        ))}
      </div>
    </>
  );
}

function CompetitionGroupNote({ note }: { note: unknown }) {
  const text = String(note ?? "-").trim() || "-";
  const markers = [" - Thiếu ", " - Còn thiếu "];
  const markerIndex = markers.map((marker) => text.indexOf(marker)).find((index) => index >= 0) ?? -1;
  if (markerIndex < 0) return <>{text}</>;

  return (
    <span className="contest-group-note">
      {text.slice(0, markerIndex)}
      <strong>{text.slice(markerIndex)}</strong>
    </span>
  );
}

function CompetitionAdvisorsTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có TVV đạt thưởng.</p>;
  return (
    <>
      <DataTable className="desktop-table contest-mini-table" headers={["STT", "TVV", "Nhóm", "ADS", "Số HĐ đạt", "Tổng IP", "Tổng AFYP", "Thưởng đạt", "Đạt giải nào"]}>
        {rows.map((row, index) => (
          <tr key={row.id || index}>
            <td>{index + 1}</td><td>{row.tvv}</td><td>{row.team}</td><td>{row.ads}</td><td>{row.eligible_contract_count}</td><td>{formatCompactVnd(row.total_ip ?? 0)}</td><td>{formatCompactVnd(row.total_afyp ?? 0)}</td><td>{formatCompactVnd(row.reward_amount ?? 0)}</td><td>{row.note}</td>
          </tr>
        ))}
      </DataTable>
      <div className="contest-detail-card-list">
        {rows.map((row, index) => (
          <article className="contest-result-card" key={`${row.id || index}-advisor-mobile`}>
            <div className="contest-result-card-head"><strong>{index + 1}. {row.tvv}</strong><span>{formatCompactVnd(row.reward_amount ?? 0)}</span></div>
            <div className="mobile-info-grid">
              <span><b>Nhóm</b>{row.team || "-"}</span>
              <span><b>ADS</b>{row.ads || "-"}</span>
              <span><b>HĐ đạt</b>{formatNumber(row.eligible_contract_count ?? 0)}</span>
              <span><b>Tổng IP</b>{formatCompactVnd(row.total_ip ?? 0)}</span>
              <span><b>Tổng AFYP</b>{formatCompactVnd(row.total_afyp ?? 0)}</span>
              <span><b>Đạt giải</b>{row.note || "-"}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CompetitionContractsTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có hợp đồng đạt điu kiện.</p>;
  const sortedRows = [...rows].sort((a, b) =>
    String(b.collection_date ?? "").localeCompare(String(a.collection_date ?? ""))
    || String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
  );
  return (
    <>
      <DataTable className="desktop-table contest-mini-table contest-wide-table" headers={["STT", "Ngày thu", "Số GYC", "Nhóm", "TVV", "BMBH", "NĐBH", "Trạng thái hợp đồng", "IP", "AFYP", "Giải thưởng", "Tiền thưởng"]}>
        {sortedRows.map((row, index) => (
          <tr key={row.id || index}>
            <td>{index + 1}</td><td>{formatDateVi(row.collection_date)}</td><td>{row.gyc_no}</td><td>{row.team}</td><td>{row.tvv}</td><td>{row.customer_name}</td><td>{row.insured_name || "-"}</td><td><span className="contract-status-pill">{row.status || "-"}</span></td><td className="numeric-cell">{formatCompactVnd(row.ip ?? 0)}</td><td className="numeric-cell">{formatCompactVnd(row.afyp ?? 0)}</td><td>{row.reward_name}</td><td className="numeric-cell">{formatCompactVnd(row.reward_amount ?? 0)}</td>
          </tr>
        ))}
      </DataTable>
      <div className="contest-detail-card-list">
        {sortedRows.map((row, index) => (
          <article className="contest-result-card" key={`${row.id || index}-contract-mobile`}>
            <div className="contest-result-card-head"><strong>{index + 1}. {row.gyc_no || row.contract_no || `HĐ ${index + 1}`}</strong><span>{formatCompactVnd(row.reward_amount ?? 0)}</span></div>
            <div className="mobile-info-grid">
              <span><b>Ngày thu</b>{formatDateVi(row.collection_date)}</span>
              <span><b>Nhóm</b>{row.team || "-"}</span>
              <span><b>TVV</b>{row.tvv || "-"}</span>
              <span><b>BMBH</b>{row.customer_name || "-"}</span>
              <span><b>NĐBH</b>{row.insured_name || "-"}</span>
              <span><b>Trạng thái</b>{row.status || "-"}</span>
              <span><b>IP</b>{formatCompactVnd(row.ip ?? 0)}</span>
              <span><b>AFYP</b>{formatCompactVnd(row.afyp ?? 0)}</span>
              <span><b>Giải thưởng</b>{row.reward_name || "-"}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CompetitionExcludedTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có danh sách hợp đồng bị loại. Hãy xác nhận rule và tính thưởng để xem lý do.</p>;
  return (
    <DataTable className="desktop-table contest-mini-table" headers={["Số GYC", "Số H", "TVV", "Nhóm", "Khách hàng", "IP", "AFYP", "Trạng thái", "Lý do bị loại"]}>
      {rows.map((row, index) => (
        <tr key={row.id || index}>
          <td>{row.gyc_no}</td><td>{row.contract_no}</td><td>{row.tvv}</td><td>{row.team}</td><td>{row.customer_name}</td><td>{formatCompactVnd(row.ip ?? 0)}</td><td>{formatCompactVnd(row.afyp ?? 0)}</td><td>{row.status}</td><td>{row.reason}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function UploadAuthModal({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: (uploader: CurrentUploader) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function authenticate() {
    const normalizedPassword = password.trim();
    const userName = getUploadUserName(normalizedPassword);
    if (!userName) {
      setError("Mật khẩu không đúng. Vui lòng thử lại.");
      return;
    }
    onSuccess({ code: normalizedPassword, name: userName });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    authenticate();
  }

  return (
    <div className="upload-auth-overlay" role="presentation">
      <form className="upload-auth-modal" role="dialog" aria-modal="true" aria-labelledby="upload-auth-title" onSubmit={submit}>
        <div className="upload-auth-icon"><LockKeyhole size={24} /></div>
        <h2 id="upload-auth-title">Xác thực quyền upload</h2>
        <p>Nhập mật khẩu 4 số để truy cập mục Upload dữ liệu</p>
        <input
          autoFocus
          aria-label="Mật khẩu upload"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
        />
        {error && <div className="login-error">{error}</div>}
        <div className="upload-auth-actions">
          <button className="secondary" type="button" onClick={onCancel}>Hủy</button>
          <button type="button" onClick={authenticate}>Xác nhận</button>
        </div>
      </form>
    </div>
  );
}

function UploadPanel({ month, uploader, onUploaded }: { month: string; uploader: CurrentUploader | null; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [competitionUploadOpen, setCompetitionUploadOpen] = useState(false);
  const [ruleProgram, setRuleProgram] = useState<any | null>(null);
  const selectedYear = Number(month.slice(0, 4)) || 2026;
  const [uploadMonth, setUploadMonth] = useState(month);
  const selectedMonthNumber = Number(uploadMonth.slice(5, 7));

  useEffect(() => {
    setUploadMonth(month);
  }, [month]);

  async function loadHistory() {
    const response = await fetch("/api/upload-history", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setHistory(payload.uploads ?? []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const uploadedMonths = new Set(history.map((item) => String(item.data_month ?? "").slice(0, 7)));

  async function send(mode: "preview" | "commit") {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("month", uploadMonth);
      body.set("mode", mode);
      body.set("uploadedBy", uploader?.code ?? "");
      body.set("uploadedByName", uploader?.name ?? "");
      body.set("uploadPassword", uploader?.code ?? "");
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = await response.json().catch(() => ({ error: "Không đc được phản hồi từ máy chủ." }));
      setResult(payload);
      if (response.ok && mode === "commit") {
        if (payload.upload) {
          setHistory((current) => [payload.upload, ...current.filter((item) => item.id !== payload.upload.id)].slice(0, 30));
        }
        await loadHistory();
        onUploaded();
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Không thể upload dữ liệu." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>Quản trị Chương trình thi đua</h2>
          <button className="contest-add-button" type="button" onClick={() => setCompetitionUploadOpen(true)}>+ Thêm CTTĐ</button>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Upload dữ liệu doanh thu theo tháng</h2><span>{uploader?.name || "-"}</span></div>
        <div className="month-button-grid">
          {Array.from({ length: 12 }, (_, index) => {
            const monthNo = index + 1;
            const key = monthKey(selectedYear, monthNo);
            return (
              <button
                key={key}
                className={`month-button ${uploadMonth === key ? "active" : ""}`}
                onClick={() => {
                  setUploadMonth(key);
                  setResult(null);
                }}
              >
                Tháng {monthNo}{uploadedMonths.has(key) ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        <p className="selected-upload-month">ang chn: Tháng {selectedMonthNumber}/{selectedYear}</p>
        <div className="panel-header"><h2>Upload CSV lũy kế tháng {uploadMonth}</h2></div>
        <div className="form-row">
          <label><span className="label">File CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <button disabled={!file || busy} onClick={() => send("preview")}>Kiểm tra dữ liệu</button>
          <button disabled={!file || busy || result?.errors?.length} onClick={() => send("commit")}>Ghi đè dữ liệu tháng {selectedMonthNumber}/{selectedYear}</button>
        </div>
        {result?.error && <p className="error-list">{result.error}</p>}
        {result?.warnings?.length > 0 && <ul className="warning-list">{result.warnings.map((warning: string, index: number) => <li key={index}>{warning}</li>)}</ul>}
        {result?.errors?.length > 0 && <ul className="error-list">{result.errors.slice(0, 30).map((err: any, index: number) => <li key={index}>Dòng {err.row ?? "-"}: {err.message}</li>)}</ul>}
        {result?.competitionNotice && <p className="success">{result.competitionNotice}</p>}
        {result?.ok && <p className="success">Hợp lệ: {result.rowCount} dòng, AFYP {formatCompactVnd(result.totalAfyp)}, IP {formatCompactVnd(result.totalIp)}.</p>}
        {result?.preview?.length > 0 && <ContractDetails title={`Xem trước dữ liệu upload cho tháng ${selectedMonthNumber}/${selectedYear}`} rows={result.preview} />}
      </div>
      {competitionUploadOpen && <CompetitionUploadModal onClose={() => setCompetitionUploadOpen(false)} onAnalyzed={(program) => { setCompetitionUploadOpen(false); setRuleProgram(program); onUploaded(); }} />}
      {ruleProgram && <CompetitionRuleModal program={ruleProgram} month={month} onClose={() => setRuleProgram(null)} onChanged={() => { setRuleProgram(null); onUploaded(); }} />}
      <StarVietUploadPanel year={selectedYear} uploader={uploader} onUploaded={onUploaded} />
      <UploadHistory rows={history} />
    </>
  );
}

function StarVietUploadPanel({ year, uploader, onUploaded }: { year: number; uploader: CurrentUploader | null; onUploaded: () => void }) {
  const [files, setFiles] = useState<{ kpi04: File | null; bc02: File | null }>({ kpi04: null, bc02: null });
  const [results, setResults] = useState<Record<string, any>>({});
  const [busySource, setBusySource] = useState<string>("");

  async function send(source: "kpi04" | "bc02", mode: "preview" | "commit") {
    const file = files[source];
    if (!file) return;
    setBusySource(source);
    try {
      const body = new FormData();
      body.set("year", String(year));
      body.set("source", source);
      body.set("mode", mode);
      body.set("uploadedBy", uploader?.code ?? "");
      body.set("uploadedByName", uploader?.name ?? "");
      body.set("uploadPassword", uploader?.code ?? "");
      body.set("file", file);
      const response = await fetch("/api/star-viet-upload", { method: "POST", body });
      const payload = await response.json().catch(() => ({ error: "Không đc được phản hồi từ máy chủ." }));
      setResults((current) => ({ ...current, [source]: payload }));
      if (response.ok && mode === "commit") onUploaded();
    } catch (error) {
      setResults((current) => ({ ...current, [source]: { error: error instanceof Error ? error.message : "Không thể upload dữ liệu Sao Việt." } }));
    } finally {
      setBusySource("");
    }
  }

  function uploadBlock(source: "kpi04" | "bc02", title: string, description: string) {
    const result = results[source];
    const busy = busySource === source;
    return (
      <div className="star-upload-block">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <label><span className="label">File CSV/XLSX</span><input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => setFiles((current) => ({ ...current, [source]: event.target.files?.[0] ?? null }))} /></label>
        <div className="star-upload-actions">
          <button disabled={!files[source] || busy} onClick={() => send(source, "preview")}>Kiểm tra</button>
          <button disabled={!files[source] || busy || result?.errors?.length} onClick={() => send(source, "commit")}>Ghi đè {source.toUpperCase()}</button>
        </div>
        {result?.error && <p className="error-list">{result.error}</p>}
        {result?.errors?.length > 0 && <ul className="error-list">{result.errors.slice(0, 8).map((err: any, index: number) => <li key={index}>Dòng {err.row ?? "-"}: {err.message}</li>)}</ul>}
        {result?.ok && <p className="success">Hợp lệ: {result.rowCount} dòng, AFYP {formatCompactVnd(result.totalAfyp)}.</p>}
      </div>
    );
  }

  return (
    <div className="panel star-upload-panel">
      <div className="panel-header"><h2>Upload dữ liệu Sao Việt</h2><span>Năm {year}</span></div>
      <div className="star-upload-grid">
        {uploadBlock("kpi04", "File KPI04 đã chốt", "Dữ liệu đã chốt từ T12/2025 đến tháng lin trước. Toàn bộ AFYP được tính.")}
        {uploadBlock("bc02", "File BC02 tháng hiện tại", "Dữ liệu tạm tháng hiện tại. Tự loại trừ hồ sơ hoàn/hủy theo trạng thái.")}
      </div>
    </div>
  );
}

function UploadHistory({ rows }: { rows: any[] }) {
  return (
    <div className="panel">
      <div className="panel-header"><h2>Lịch sử upload</h2><span>{rows.length} lần gần nhất</span></div>
      <DataTable className="desktop-table" headers={["Thi gian upload", "Ngưi upload", "Tháng dữ liệu", "Tên file", "Số dòng", "Kết quả"]}>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{new Date(row.uploaded_at).toLocaleString("vi-VN")}</td>
            <td>{row.uploaded_by_name || row.uploaded_by || "-"}</td>
            <td>{String(row.data_month ?? "").slice(0, 7)}</td>
            <td>{row.file_name}</td>
            <td>{Number(row.row_count ?? 0).toLocaleString("vi-VN")} dòng</td>
            <td>{row.status === "success" ? "Thành công" : row.error_message || "Lỗi"}</td>
          </tr>
        ))}
      </DataTable>
      <div className="mobile-card-list upload-history-list">
        {rows.map((row) => (
          <article className="mobile-upload-card" key={`${row.id}-mobile`}>
            <div className="mobile-upload-head">
              <strong>{new Date(row.uploaded_at).toLocaleString("vi-VN")}</strong>
              <span className={`upload-status ${row.status === "success" ? "success" : "failed"}`}>{row.status === "success" ? "Thành công" : "Lỗi"}</span>
            </div>
            <div className="mobile-info-grid">
              <span><b>Ngưi upload</b>{row.uploaded_by_name || row.uploaded_by || "-"}</span>
              <span><b>Tháng dữ liệu</b>{String(row.data_month ?? "").slice(0, 7)}</span>
              <span><b>Tên file</b>{row.file_name || "-"}</span>
              <span><b>Số dòng</b>{Number(row.row_count ?? 0).toLocaleString("vi-VN")} dòng</span>
              {row.status !== "success" && <span><b>Lỗi</b>{row.error_message || "Không xác định"}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function safeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function ContractDetailModal({ type, title, rows, onClose }: { type: "group" | "agent"; title: string; rows: any[]; onClose: () => void }) {
  const sortedRows = sortContracts(rows);
  const afyp = sortedRows.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0);
  const contractCount = new Set(sortedRows.map((row, index) => String(row.contract_no ?? "").trim() || `row-${index}`)).size;
  const agentCount = new Set(sortedRows.map((row) => String(row.agent_name ?? "").trim()).filter(Boolean)).size;
  const groupNames = Array.from(new Set(sortedRows.map((row) => groupNameForRecord(row)).filter(Boolean)));
  const isAgentDetail = type === "agent";
  const titlePrefix = isAgentDetail ? "Chi tiết TVV" : "Chi tiết nhóm";
  const groupSummary = groupNames.length > 3 ? `Số nhóm: ${formatNumber(groupNames.length)}` : `Nhóm: ${groupNames.join(", ") || "-"}`;
  const emptyMessage = isAgentDetail
    ? "Không có hợp đồng thuộc TVV này trong bộ l?c hiện tại."
    : "Không có hợp đồng thuộc nhóm này trong bộ l?c hiện tại.";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="contract-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section className="contract-modal" role="dialog" aria-modal="true" aria-label={`${titlePrefix} ${title}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="contract-modal-header">
          <div>
            <h2>{titlePrefix}: {title}</h2>
            <div className="contract-modal-summary">
              <span>AFYP: <b>{formatCompactVnd(afyp)}</b></span>
              <span>Số H: <b>{formatNumber(contractCount)}</b></span>
              {isAgentDetail ? <span>{groupSummary}</span> : <span>Số TVV: <b>{formatNumber(agentCount)}</b></span>}
            </div>
          </div>
          <button className="contract-modal-close" type="button" onClick={onClose} aria-label={`óng ${titlePrefix.toLowerCase()}`}>×</button>
        </div>
        <div className="contract-modal-body">
          <h3>Danh sách hợp đồng</h3>
          {sortedRows.length === 0 ? (
            <p className="empty-state">{emptyMessage}</p>
          ) : (
            <>
              <DataTable className="desktop-table contract-modal-table" headers={["Ngày thu", "Nhóm", "TVV", "BMBH", "NĐBH", "IP", "AFYP"]}>
                {sortedRows.map((row, index) => (
                  <tr key={`${row.contract_no || "contract"}-${index}`}>
                    <td>{formatDateVi(row.paid_date) || "-"}</td>
                    <td>{safeText(groupNameForRecord(row))}</td>
                    <td>{safeText(row.agent_name)}</td>
                    <td>{safeText(row.policy_owner)}</td>
                    <td>{safeText(row.insured_name)}</td>
                    <td>{formatCompactVnd(Number(row.ip) || 0)}</td>
                    <td>{formatCompactVnd(Number(row.afyp) || 0)}</td>
                  </tr>
                ))}
              </DataTable>
              <div className="mobile-card-list contract-mobile-list">
                {sortedRows.map((row, index) => (
                  <article className="mobile-contract-card" key={`${row.contract_no || "contract"}-modal-${index}`}>
                    <div className="mobile-contract-date">
                      <CalendarDays size={18} />
                      <strong>Ngày thu: {formatDateVi(row.paid_date) || "-"}</strong>
                    </div>
                    <div className="mobile-info-grid">
                      <span><b>Nhóm</b>{safeText(groupNameForRecord(row))}</span>
                      <span><b>TVV</b>{safeText(row.agent_name)}</span>
                      <span><b>BMBH</b>{safeText(row.policy_owner)}</span>
                      <span><b>NĐBH</b>{safeText(row.insured_name)}</span>
                    </div>
                    <div className="mobile-metric-grid compact">
                      <MobileMetric label="IP" value={formatCompactVnd(Number(row.ip) || 0)} />
                      <MobileMetric label="AFYP" value={formatCompactVnd(Number(row.afyp) || 0)} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ContractDetails({ title, rows, showStatus = false }: { title: string; rows: any[]; showStatus?: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const sortedRows = sortContracts(rows);
  const normalizedSearchTerm = normalizeViText(searchTerm.trim());
  const visibleRows = normalizedSearchTerm
    ? sortedRows.filter((row) => {
        const searchableText = [
          row.agent_name,
          groupNameForRecord(row),
          row.application_no,
          row.policy_owner,
          row.insured_name
        ].map((value) => normalizeViText(String(value ?? ""))).join(" ");
        return searchableText.includes(normalizedSearchTerm);
      })
    : sortedRows;
  const headers = showStatus
    ? ["Ngày thu", "Nhóm", "TVV", "BMBH", "NĐBH", "Trạng thái hợp đồng", "IP", "AFYP"]
    : ["Ngày thu", "Nhóm", "TVV", "BMBH", "NĐBH", "IP", "AFYP"];
  return (
    <div className="panel">
      <div className="panel-header contract-details-header">
        <div className="contract-details-title">
          <h2>{title}</h2>
          <label className="contract-search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Tìm kiếm hợp đồng</span>
            <input
              aria-label="Tìm kiếm hợp đồng"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
        <div className="contract-details-actions">
          <span>{visibleRows.length} dòng</span>
        </div>
      </div>
      <DataTable className="desktop-table" headers={[headers[0], "Số GYC", ...headers.slice(1)]}>
        {visibleRows.map((row, index) => (
          <tr key={`${row.contract_no}-${index}`}>
            <td>{formatDateVi(row.paid_date)}{isNewUploadContract(row) && <span className="new-contract-badge">Mới</span>}</td><td>{row.application_no || "-"}</td><td>{row.group_name}</td><td>{row.agent_name}</td><td>{row.policy_owner}</td><td>{row.insured_name}</td>{showStatus && <td>{contractStatusLabel(row.policy_status)}</td>}<td>{formatCompactVnd(row.ip)}</td><td>{formatCompactVnd(row.afyp)}</td>
          </tr>
        ))}
      </DataTable>
      <div className="mobile-card-list contract-mobile-list">
        {visibleRows.map((row, index) => (
          <article className="mobile-contract-card" key={`${row.contract_no}-mobile-${index}`}>
            <div className="mobile-contract-date">
              <CalendarDays size={18} />
              <strong>Ngày {formatDateVi(row.paid_date)}</strong>
              {isNewUploadContract(row) && <span className="new-contract-badge">Mới</span>}
              {showStatus && <span className="status-badge">{contractStatusLabel(row.policy_status)}</span>}
            </div>
            <div className="mobile-contract-main">
              <strong>{row.group_name || "Không xác định"}</strong>
              <span>{row.agent_name || "Không xác định"}</span>
            </div>
            <div className="mobile-info-grid">
              <span><b>Số GYC</b>{row.application_no || "-"}</span>
              <span><b>BMBH</b>{row.policy_owner || "-"}</span>
              <span><b>NĐBH</b>{row.insured_name || "-"}</span>
            </div>
            <div className="mobile-metric-grid compact">
              <MobileMetric label="IP" value={formatCompactVnd(row.ip)} />
              <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DataTable({ headers, children, className = "", colWidths }: { headers: string[]; children: React.ReactNode; className?: string; colWidths?: string[] }) {
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    let cellIndex = 0;
    const cells = Children.map((row.props as { children?: React.ReactNode }).children, (cell) => {
      if (!isValidElement(cell)) return cell;
      const label = headers[cellIndex] ?? "";
      cellIndex += 1;
      return cloneElement(cell as React.ReactElement<{ "data-label"?: string }>, {
        "data-label": label
      });
    });
    return cloneElement(row as React.ReactElement<{ children?: React.ReactNode }>, { children: cells });
  });

  return (
    <div className={`table-wrap ${className}`}>
      <table>
        {colWidths && (
          <colgroup>
            {colWidths.map((width, index) => <col key={`${width}-${index}`} style={{ width }} />)}
          </colgroup>
        )}
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
