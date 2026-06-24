"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Coins, Download, Eye, EyeOff, Filter, Link2, LockKeyhole, Medal, Megaphone, MoreHorizontal, PieChart, Search, Share2, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Users, UserRound, ClipboardList, LayoutGrid, Layers3, X } from "lucide-react";
import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import LeaderboardPoster from "./LeaderboardPoster";
import { formatCompactVnd, formatPercent, formatVnd } from "@/lib/format";
import { groupLeaderName } from "@/lib/group-leaders";
import { getUploadUserName } from "@/lib/upload-users";
import { getAdsPlan, getAdsMonthlyTarget, getAdsQuarterTarget, getAdsYearTarget } from "@/lib/ads-plan";

type DashboardData = any;
type Tab = "overview" | "groups" | "agents" | "status" | "time" | "ads" | "contests" | "starviet" | "admin" | "upload";
type CurrentUploader = {
  code: string;
  name: string;
};
type KpiDetailLine = { text: string; tone?: "muted" | "positive" | "negative"; trend?: "up" | "down" };
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
  recipientTypes?: string[];
  isHidden?: boolean;
};

const QUARTER_PLAN_VND: Record<number, number> = {
  1: 10_800_000_000,
  2: 13_770_000_000,
  3: 13_770_000_000,
  4: 15_660_000_000
};
const YEAR_PLAN_VND = 54_000_000_000;
const HIDDEN_COMPETITION_PROGRAMS_KEY = "dashboard.hiddenCompetitionProgramIds";
const HIDDEN_COMPETITION_PROGRAMS_EVENT = "dashboard:hidden-competition-programs-changed";

const tabs: Array<{ id: Tab; label: string; mobileLabel: string; icon: LucideIcon }> = [
  { id: "overview", label: "Tổng quan", mobileLabel: "Tổng quan", icon: LayoutGrid },
  { id: "status", label: "Hợp đồng", mobileLabel: "Hợp đồng", icon: ClipboardList },
  { id: "groups", label: "Nhóm", mobileLabel: "Nhóm", icon: Users },
  { id: "agents", label: "TVV", mobileLabel: "TVV", icon: UserRound },
  { id: "ads", label: "ADO", mobileLabel: "ADO", icon: Sparkles },
  { id: "contests", label: "CTTĐ", mobileLabel: "CTTĐ", icon: Trophy },
  { id: "starviet", label: "Sao Việt", mobileLabel: "SV", icon: Trophy },
  { id: "upload", label: "Quản trị", mobileLabel: "Quản trị", icon: Download }
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthKey(year: number, monthNo: number) {
  return `${year}-${String(monthNo).padStart(2, "0")}`;
}

function hiddenCompetitionProgramIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const values = JSON.parse(window.localStorage.getItem(HIDDEN_COMPETITION_PROGRAMS_KEY) || "[]");
    return new Set(Array.isArray(values) ? values.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function saveHiddenCompetitionProgramIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDDEN_COMPETITION_PROGRAMS_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent(HIDDEN_COMPETITION_PROGRAMS_EVENT));
}

function moneyCell(value: number) {
  return <strong>{formatFullMoney(value)}</strong>;
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

function formatSidebarDateTimeVi(value: string | null | undefined) {
  if (!value) return "chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "chưa có dữ liệu";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
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

function formatFullMoney(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
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
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tá»·`;
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
    .replace(" triệu", "tr");
}

function formatDailyCompactVnd(value: number) {
  return formatShortCompactVnd(value).replace("tr", "trđ");
}

function truncateChartLabel(value: unknown, maxLength = 16) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function normalizeViText(value: string) {
  return repairMojibake(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function repairMojibake(value: unknown) {
  const text = String(value ?? "");
  const knownReplacementText: Record<string, string> = {
    "Ho\uFFFDng Ph\uFFFDt": "Ho\u00e0ng Ph\u00e1t",
    "T\uFFFDm Ph\uFFFDt": "T\u00e2m Ph\u00e1t",
    "Duy\uFFFDn Ph\uFFFDt": "Duy\u00ean Ph\u00e1t",
    "T\uFFFDi Ph\uFFFDt": "T\u00e0i Ph\u00e1t"
  };
  if (knownReplacementText[text]) return knownReplacementText[text];
  if (!/[\u00c3\u00c4\u00c6\u00e1]/.test(text) || typeof TextDecoder === "undefined") return text;
  try {
    const bytes = Uint8Array.from([...text].map((char) => char.charCodeAt(0) & 255));
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return knownReplacementText[repaired] ?? repaired;
  } catch {
    return text;
  }
}

const ADO_COLORS_BY_KEY: Record<string, string> = {
  "nguyen thi mai trang": "#1677ff",
  "nguyen thi tram": "#f59e0b",
  "dinh quoc tien": "#7c3aed",
  "nguyen thoc": "#16a34a",
  "tran xuan thu": "#f97316",
  "nguyen thanh nhan": "#06b6d4"
};

const ADO_FALLBACK_COLORS = ["#e11d48", "#0ea5e9", "#84cc16", "#a855f7", "#f59e0b", "#14b8a6"];

function adoColor(name: unknown, index = 0) {
  return ADO_COLORS_BY_KEY[normalizeViText(String(name ?? ""))]
    ?? ADO_FALLBACK_COLORS[index % ADO_FALLBACK_COLORS.length];
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
    { text: `Đạt: ${formatMoney(actual)} / ${formatMoney(plan)}`, tone: "muted" },
    { text: overPlan ? `Vượt kế hoạch: ${formatMoney(Math.abs(remainingRaw))}` : `Còn thiếu: ${formatMoney(Math.max(remainingRaw, 0))}`, tone: overPlan ? "positive" : "muted" },
    {
      text: overPlan
        ? "Đã hoàn thành kế hoạch"
        : remainingDays > 0
          ? `Cần TB/ngày còn lại: ${formatMoney(remainingRaw / remainingDays)}`
          : "Đã hết kỳ theo dõi",
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
      tone: diff !== 0 ? tone : "muted" as const,
      trend: diff > 0 ? "up" as const : diff < 0 ? "down" as const : undefined
    };
  }
  return {
    text: `So với hôm qua: ${formatSignedVnd(diff)} / ${formatPercent((diff / yesterdayValue) * 100)}`,
    tone,
    trend: diff > 0 ? "up" as const : diff < 0 ? "down" as const : undefined
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
  else lines.push({
    text: yesterdayValue > 0
      ? `So với hôm qua: ${formatShortCompactVnd(diff > 0 ? diff : -Math.abs(diff)).replace("--", "-")} / ${formatPercent((diff / yesterdayValue) * 100)}`
      : `So với hôm qua: ${formatShortCompactVnd(diff > 0 ? diff : -Math.abs(diff)).replace("--", "-")}`,
    tone
  });
  return lines;
}

function samePeriodComparisonLine(comparison: any): KpiDetailLine {
  if (!comparison?.hasPrevious) {
    return { text: "Chưa có dữ liệu tháng trước", tone: "muted" };
  }
  const percent = Number(comparison.percent ?? 0);
  if (percent > 0) {
    return { text: formatPercent(percent), tone: "positive", trend: "up" };
  }
  if (percent < 0) {
    return { text: formatPercent(Math.abs(percent)), tone: "negative", trend: "down" };
  }
  return { text: "0%", tone: "muted" };
}

function KpiDetailLineView({ line }: { line: KpiDetailLine }) {
  const TrendIcon = line.trend === "up" ? TrendingUp : line.trend === "down" ? TrendingDown : null;
  return (
    <span className="kpi-detail-line-content" style={{ color: "inherit" }}>
      {TrendIcon && <TrendIcon className="kpi-trend-icon" size={14} strokeWidth={2.4} aria-hidden="true" style={{ color: "inherit" }} />}
      <span style={{ color: "inherit" }}>{line.text}</span>
    </span>
  );
}

function monthlyPlanMobileLines(plan: { actual: number; plan: number; remainingRaw?: number; remainingDays?: number }) {
  if (plan.plan <= 0) return [{ text: "Chưa có kế hoạch", tone: "muted" as const }];
  const remaining = Number(plan.remainingRaw ?? plan.plan - plan.actual);
  const needPerDay = remaining > 0 && Number(plan.remainingDays ?? 0) > 0 ? remaining / Number(plan.remainingDays) : null;
  const shortageText = remaining > 0
    ? `Thiếu: ${formatShortCompactVnd(remaining)} (${needPerDay ? `Cần: ${formatDailyCompactVnd(needPerDay)}/ngày` : "Đã hết kỳ"})`
    : "Hoàn thành KH";
  return [
    { text: `Đạt: ${formatShortCompactVnd(plan.actual)}/${formatShortCompactVnd(plan.plan)}`, tone: "muted" as const },
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
  return repairMojibake(contractStatusLabel(value))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function isCountedContract(value: unknown) {
  return !new Set([
    "het hieu luc",
    "ycbh het hieu luc",
    "tu choi",
    "tri hoan",
    "hoan phi"
  ]).has(normalizedContractStatus(value));
}

const STATUS_COLOR_BY_NORMALIZED_LABEL: Record<string, string> = {
  "cho kiem tra ycbh": "#0f6fff",
  "cnbh chuan": "#22a447",
  "cho dgrr": "#f59e0b",
  "cnbh co dieu kien": "#8b5cf6",
  "dang dgrr": "#14b8a6",
  "co hieu luc": "#22a447",
  "cho xu ly": "#f59e0b",
  "hoan phi": "#ef4444",
  "tu choi": "#ef4444",
  "het hieu luc": "#ef4444",
  "ycbh het hieu luc": "#ef4444",
  "tri hoan": "#ef4444",
  "huy": "#ef4444",
  "khong xac dinh": "#64748b"
};

const STATUS_FALLBACK_COLORS = ["#0f6fff", "#22a447", "#f59e0b", "#8b5cf6", "#14b8a6", "#ef4444", "#64748b"];

function getStatusColor(status: unknown) {
  const normalized = normalizedContractStatus(status);
  const mappedColor = STATUS_COLOR_BY_NORMALIZED_LABEL[normalized];
  if (mappedColor) return mappedColor;
  const hash = [...normalized].reduce((total, char) => total + char.charCodeAt(0), 0);
  return STATUS_FALLBACK_COLORS[hash % STATUS_FALLBACK_COLORS.length];
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
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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
      setSelectedStatus(null);
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
  const hasSelectedStatus = tab === "status" && selectedStatus !== null;
  const statusDetailRows = useMemo(() => {
    const allContracts = data?.contracts ?? [];
    if (selectedStatus === null) return allContracts;
    return selectedContracts;
  }, [data?.contracts, selectedContracts, selectedStatus]);
  const statusDetailTitle = hasSelectedStatus ? selectedTitle : "Chi tiết hợp đồng";
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);
  const mobileOptionTabs = tabs.filter((item) => item.id !== "overview" && item.id !== "status");
  const isMobileOptionTabActive = tab !== "overview" && tab !== "status";
  const headerCopy: Record<Tab, { title: string; subtitle: string }> = {
    overview: { title: `Tổng quan doanh thu ${monthLabel(month).toLowerCase()}`, subtitle: `Cập nhật gần nhất: ${formatDateTimeVi(data?.updatedAt ?? null)}` },
    status: { title: "Hợp đồng", subtitle: "Quản lý và theo dõi hiệu quả hợp đồng" },
    groups: { title: "Nhóm", subtitle: "Theo dõi hiệu quả hoạt động của các nhóm" },
    agents: { title: "TVV", subtitle: "Theo dõi hiệu quả hoạt động của tư vấn viên" },
    ads: { title: "ADO", subtitle: "Theo dõi và quản lý hiệu quả ADO theo phòng kinh doanh" },
    contests: { title: "Chương trình thi đua", subtitle: "Theo dõi và quản lý hiệu quả các chương trình thi đua" },
    starviet: { title: "Sao Việt cá nhân", subtitle: "Theo dõi danh hiệu Sao Việt năm 2026" },
    admin: { title: "Quản trị", subtitle: "Quản lý dữ liệu và hệ thống" },
    upload: { title: "Quản trị", subtitle: "Quản lý dữ liệu và hệ thống" },
    time: { title: "Theo dõi thời gian", subtitle: "Diễn biến doanh thu theo thời gian" }
  };
  const currentHeader = headerCopy[tab];
  const mobileHeaderTitle = tab === "overview" ? `Doanh thu T${selectedMonthNumber(month)}/${month.slice(0, 4)}` : tabs.find((item) => item.id === tab)?.mobileLabel ?? currentHeader.title;

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
    setSelectedStatus(null);
    setSelectedGroupDetail(null);
    setSelectedAgentDetail(null);
  }

  function enterUploadTab(uploader: CurrentUploader) {
    setCurrentUploader(uploader);
    setUploadAuthOpen(false);
    setTab("upload");
    setSelectedContracts([]);
    setSelectedTitle("Chi tiết hợp đồng");
    setSelectedStatus(null);
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
    <main className={`app dashboard-page tab-${tab}`}>
      <header className="topbar dashboard-header">
        <div className="topbar-inner">
          <div className="topbar-copy">
            <h1>
              <span className="desktop-header-title">{currentHeader.title}</span>
              <span className="mobile-header-title">{mobileHeaderTitle}</span>
            </h1>
            {tab === "overview" && (
              <span className="mobile-header-updated">
                Cập nhật gần nhất: {formatDateTimeVi(data?.updatedAt ?? null)}
              </span>
            )}
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
        <div className="sidebar-brand" aria-label="Dashboard doanh thu">
          <span className="sidebar-brand-mark"><BarChart3 size={22} /></span>
          <span><strong>Dashboard</strong><small>Doanh thu</small></span>
        </div>
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
        <LastUpdatedBox updatedAt={data?.updatedAt ?? null} />
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
            {tab === "groups" && <GroupTable month={month} rows={data.groups} contracts={data.statusContracts ?? data.contracts} openContracts={(title, rows) => setSelectedGroupDetail({ title, rows })} />}
            {tab === "agents" && <AgentTable month={month} rows={data.agents} contracts={data.statusContracts ?? data.contracts} openContracts={(title, rows) => setSelectedAgentDetail({ title, rows })} />}
            {tab === "status" && <StatusReport report={data.statuses} contracts={data.statusContracts ?? data.contracts} openContracts={(status, title, rows) => { setSelectedStatus(status); setSelectedTitle(title); setSelectedContracts(rows); }} />}
            {tab === "time" && <TimeReport report={data.timeSeries} />}
            {tab === "ads" && <AdsTable report={data.ado} rows={data.ads} month={month} contracts={data.contracts} openContracts={(title, rows) => { setSelectedTitle(title); setSelectedContracts(rows); }} />}
            {tab === "contests" && <CompetitionPanel month={month} refreshKey={competitionRefreshKey} onChanged={() => { setCompetitionRefreshKey((value) => value + 1); loadDashboard(); }} />}
            {tab === "starviet" && <StarVietPanel report={data.starViet} warning={data.starVietWarning} />}
            {tab === "admin" && <AdminPanel month={month} planRows={data.planTable ?? []} onSaved={loadDashboard} />}
            {tab === "upload" && <UploadPanel month={month} uploader={currentUploader} onUploaded={() => { setCompetitionRefreshKey((value) => value + 1); loadDashboard(); }} />}

            {tab === "status" && <ContractDetails title={statusDetailTitle} rows={statusDetailRows} showStatus emptyMessage={hasSelectedStatus ? "Không có hồ sơ thuộc trạng thái này" : undefined} />}
          </>
        )}
        {tab === "groups" && selectedGroupDetail && (
          <ContractDetailModal type="group" title={selectedGroupDetail.title} rows={selectedGroupDetail.rows} onClose={() => setSelectedGroupDetail(null)} />
        )}
        {tab === "agents" && selectedAgentDetail && (
          <ContractDetailModal type="agent" title={selectedAgentDetail.title} rows={selectedAgentDetail.rows} onClose={() => setSelectedAgentDetail(null)} />
        )}
        {tab === "ads" && selectedContracts.length > 0 && (
          <ContractDetailModal type="ads" title={selectedTitle} rows={selectedContracts} onClose={() => setSelectedContracts([])} />
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

function LastUpdatedBox({ updatedAt }: { updatedAt?: string | null }) {
  return (
    <div className="last-updated-box" aria-label="Cập nhật gần nhất">
      <span className="last-updated-icon"><Clock3 size={16} /></span>
      <span>
        <strong>Cập nhật gần nhất</strong>
        <small>{formatSidebarDateTimeVi(updatedAt)}</small>
      </span>
    </div>
  );
}

function Overview({ data, month, selectedAds, onViewDetails, onGoGroups, onGoAgents }: { data: DashboardData; month: string; selectedAds?: string; onViewDetails: (title: string, rows: any[]) => void; onGoGroups: () => void; onGoAgents: () => void }) {
  const [chartMode, setChartMode] = useState<"day" | "group" | "agent">("day");
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isMobileChart, setIsMobileChart] = useState(false);
  const overview = data?.overview ?? {};
  const timeRows = data?.overviewTimeSeries?.rows ?? [];
  const groupRows = (data?.overviewGroups ?? []).slice(0, 3);
  const agentRows = (data?.overviewAgents ?? []).slice(0, 3);
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
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileChart(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const chartMeta = {
    day: {
      label: "Theo ngày",
      section: "Biểu đồ theo ngày",
      title: `AFYP / Số hợp đồng theo ngày - ${monthOnlyLabel(month)}`,
      countLabel: "Số HĐ",
      subtitle: visibleDayCount > 0
        ? `Hiển thị từ ngày 1 đến ngày ${visibleDayCount}, ngày đã qua không phát sinh sẽ bằng 0.`
        : "Chưa có ngày nào trong tháng được chọn để hiển thị."
    },
    group: {
      label: "Theo nhóm",
      section: "Biểu đồ theo nhóm",
      title: `Top nhóm theo AFYP / Số TVV - ${monthOnlyLabel(month)}`,
      countLabel: "Số TVV",
      subtitle: "Hiển thị các nhóm dẫn đầu theo dữ liệu sau bộ lọc."
    },
    agent: {
      label: "Theo TVV",
      section: "Biểu đồ theo TVV",
      title: `Top TVV theo AFYP / Số hợp đồng - ${monthOnlyLabel(month)}`,
      countLabel: "Số HĐ",
      subtitle: "Hiển thị các TVV dẫn đầu theo dữ liệu sau bộ lọc."
    }
  }[chartMode];
  const chartRows = useMemo(() => {
    if (chartMode === "group") {
      return getDisplayedGroupChartData(data?.overviewGroups ?? []);
    }
    if (chartMode === "agent") {
      return getDisplayedTvvChartData(data?.overviewAgents ?? [], isMobileChart);
    }
    const displayedDayRows = isMobileChart ? visibleTimeRows.slice(-10) : visibleTimeRows;
    return displayedDayRows.map((row: any) => ({
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
      mobileTitle: "HĐ",
      value: formatNumber(overview.totalContracts ?? 0),
      icon: ClipboardList,
      tone: "green",
      detailLines: [samePeriodComparisonLine(comparisons.totalContracts)],
      mobileDetailLines: []
    },
    {
      title: "TVV hoạt động",
      mobileTitle: "TVV",
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
                  <XAxis dataKey="label" tick={hideMobileCategoryLabels ? false : { fontSize: isMobileChart ? 10 : 12 }} tickLine={false} axisLine={false} interval={0} angle={chartMode === "day" ? 0 : isMobileChart ? 0 : -18} textAnchor={chartMode === "day" || isMobileChart ? "middle" : "end"} height={hideMobileCategoryLabels ? 8 : chartMode === "day" ? 30 : isMobileChart ? 34 : 66} tickFormatter={(value) => chartMode === "day" || isMobileChart ? value : truncateChartLabel(value)} />
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
            { header: "HĐ", render: (row) => row.contractCount },
            { header: "Tỷ trọng", render: (row) => formatPercent(row.afypShare) }
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
            <section className={`overview-plan-column ${tone}`} key={label}>
              <span className="overview-plan-title">{label}</span>
              <strong>{formatPercent(percent)}</strong>
              <p>Đạt: {formatMoney(item.actual)} / {formatMoney(item.plan)}</p>
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
  const isTodayRevenue = title === "Doanh thu hôm nay";
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
              {lines.map((line, index) => <p className={`mini-line ${line.tone ?? "muted"}`} key={`${line.text}-${index}`}><KpiDetailLineView line={line} /></p>)}
            </div>
          )}
          {progress !== undefined && progress !== null && (
            <div className="progress-shell" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          )}
        </div>
      </div>
      {isTodayRevenue ? (
        <div className="today-mobile-card">
          <div className="today-mobile-top">
            <span className="today-mobile-icon"><Icon size={16} /></span>
            <span className="today-mobile-label">{mobileTitle ?? title}</span>
            <strong className="today-mobile-value">{value}</strong>
          </div>
          {mobileLines.length > 0 && (
            <p className={`today-mobile-compare ${mobileLines[0].tone ?? "muted"}`}>
              <KpiDetailLineView line={mobileLines[0]} />
            </p>
          )}
        </div>
      ) : (
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
              {mobileLines.map((line, index) => <p className={`mini-line ${line.tone ?? "muted"}`} key={`${line.text}-${index}`}><KpiDetailLineView line={line} /></p>)}
            </div>
          )}
          {progress !== undefined && progress !== null && (
            <div className="progress-shell" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          )}
        </div>
      )}
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

function TemplateProgress({ value, max, tone = "blue" }: { value: number; max: number; tone?: "blue" | "green" | "purple" | "gold" }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (Number(value ?? 0) / max) * 100)) : 0;
  return (
    <span className={`template-progress template-progress-${tone}`}>
      <i><em style={{ width: `${percent}%` }} /></i>
    </span>
  );
}

type DashboardHideableColumn = { key: string; header: string; width?: string; render: (row: any) => ReactNode };

function DashboardHideableTable({ rows, columns, hiddenColumns, onHideColumn, onShowAllColumns, className = "", rowKey, onRowClick }: { rows: any[]; columns: DashboardHideableColumn[]; hiddenColumns: string[]; onHideColumn: (key: string) => void; onShowAllColumns: () => void; className?: string; rowKey: (row: any, index: number) => string; onRowClick?: (row: any) => void }) {
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.key));
  return <>
    {hiddenColumns.length > 0 && <div className="contest-column-actions"><button className="ghost" type="button" onClick={onShowAllColumns}>Hiện</button></div>}
    <div className={`table-wrap ${className}`}><table><thead><tr>{visibleColumns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined} onClick={() => onHideColumn(column.key)} title="Bấm để ẩn cột">{column.header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={rowKey(row, index)} className={onRowClick ? "clickable" : undefined} onClick={() => onRowClick?.(row)}>{visibleColumns.map((column) => <td key={column.key} data-label={column.header}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>
  </>;
}

function GroupAgentKpiRow({ type, rows, contracts }: { type: "group" | "agent"; rows: any[]; contracts: any[] }) {
  const totalAfyp = rows.reduce((sum, row) => sum + Number(row.afyp ?? 0), 0);
  const totalIp = rows.reduce((sum, row) => sum + Number(row.ip ?? 0), 0);
  const totalContracts = rows.reduce((sum, row) => sum + Number(row.contractCount ?? 0), 0);
  const totalAgents = type === "agent"
    ? rows.length
    : rows.reduce((sum, row) => sum + Number(row.agentCount ?? 0), 0);
  const activeCount = type === "agent"
    ? rows.filter((row) => Number(row.contractCount ?? 0) > 0 || Number(row.afyp ?? 0) > 0).length
    : rows.filter((row) => Number(row.contractCount ?? 0) > 0 || Number(row.afyp ?? 0) > 0).length;
  const averageShare = rows.length ? rows.reduce((sum, row) => sum + Number(row.afypShare ?? 0), 0) / rows.length : 0;
  const totalLabel = type === "agent" ? "Tổng số TVV" : "Tổng số nhóm";
  const activeLabel = type === "agent" ? "Có hiệu lực" : "Có hiệu lực";
  return (
    <section className={`kpi-grid kpi-grid-6 template-kpi-row ${type === "agent" ? "agent-kpi-row" : ""}`}>
      <KpiCard title={totalLabel} value={formatNumber(type === "agent" ? rows.length : rows.length)} icon={type === "agent" ? Users : ClipboardList} tone="blue" detailLines={[{ text: type === "agent" ? "TVV trong dữ liệu hiện tại" : "Nhóm trong dữ liệu hiện tại", tone: "muted" }]} />
      <KpiCard title={activeLabel} value={formatNumber(activeCount)} icon={Target} tone="green" detailLines={[{ text: "Có phát sinh doanh thu", tone: "positive" }]} />
      <KpiCard title="Chờ xử lý" value={formatNumber(Math.max(0, contracts.length - totalContracts))} icon={TrendingUp} tone="orange" detailLines={[{ text: "Theo dữ liệu hợp đồng", tone: "muted" }]} />
      <KpiCard title="Hoàn phí" value={formatNumber(contracts.filter((item) => normalizeViText(String(item.policy_status ?? item.status ?? "")).includes("hoan phi")).length)} icon={Link2} tone="purple" detailLines={[{ text: "Theo trạng thái hợp đồng", tone: "muted" }]} />
      <KpiCard title={type === "agent" ? "Tổng AFYP" : "Tổng TVV"} value={type === "agent" ? formatCompactVnd(totalAfyp) : formatNumber(totalAgents)} icon={type === "agent" ? PieChart : Users} tone="gold" detailLines={[{ text: type === "agent" ? `IP: ${formatCompactVnd(totalIp)}` : `AFYP: ${formatCompactVnd(totalAfyp)}`, tone: "positive" }]} />
      <KpiCard title="Tỷ trọng TB" value={formatPercent(averageShare)} icon={PieChart} tone="neutral" detailLines={[{ text: "Trung bình theo bảng", tone: "positive" }]} />
    </section>
  );
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
        <button className="mobile-rank-card full mobile-group-rank-card" key={`${row.banName}-${row.groupName}`} type="button" onClick={() => openContracts(row.groupName, contracts.filter((item) => groupNameForRecord(item) === row.groupName))}>
          <MobileRankBadge rank={row.rank} />
          <div className="mobile-rank-main">
            <div className="mobile-rank-title">{row.groupName}</div>
            <div className="mobile-rank-subtitle">{groupLeaderName(row.groupName)}</div>
            <div className="mobile-metric-grid">
              <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
              <MobileMetric label="Số HĐ" value={row.contractCount} />
              <MobileMetric label="Số TVV" value={row.agentCount} />
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
        const planMillion = row.kpi ?? getAdsPlan(row.adsName, month);
        const planVnd = planMillion ? planMillion * 1_000_000 : 0;
        const achievement = planVnd > 0 ? (Number(row.afyp ?? 0) / planVnd) * 100 : null;
        const title = adsRowTitle(row);
        return (
          <button className="mobile-ads-card" key={`${row.adsName}-${row.adsCode}-${row.adsSubtitle}`} type="button" onClick={() => openContracts(title, adsRowContracts(row, contracts))}>
            <div className="mobile-ads-head">
              <span className="mobile-rank-badge plain">{index + 1}</span>
              <strong>{title}</strong>
              <span className="mobile-ads-afyp">{formatCompactVnd(row.afyp)}</span>
            </div>
            {row.adsSubtitle && <p className="mobile-ads-subtitle">{row.adsSubtitle}</p>}
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
        <button className="ghost link-button" type="button" onClick={onViewMore}>Xem tất cả <ArrowDownRight size={16} /></button>
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
    <div className="panel contract-details-panel">
      <div className="panel-header"><h2>Xếp hạng nhóm</h2></div>
      <DataTable headers={["#", "Nhóm", "AFYP", "HĐ", "TVV", "Tỷ trọng"]}>
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
    <div className="panel contract-details-panel">
      <div className="panel-header"><h2>Xếp hạng TVV</h2></div>
      <DataTable headers={["#", "Tên TVV", "Nhóm", "AFYP", "HĐ"]}>
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

function GroupPosterDownloadButton({
  rows,
  posterRef,
  fileName
}: {
  rows: any[];
  posterRef: RefObject<HTMLDivElement>;
  fileName: string;
}) {
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
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: "#031a4e",
        width: 1400,
        height: posterRef.current.offsetHeight
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xuất poster.");
    }
  }

  return (
    <div className="poster-action">
      <button className="small-button poster-download-button" type="button" onClick={downloadPoster}>
        <Download size={16} /> Tải ảnh
      </button>
      {message && <span className="poster-error">{message}</span>}
    </div>
  );
}

async function groupPosterFile(element: HTMLElement, fileName: string) {
  await document.fonts?.ready;
  const pngUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    backgroundColor: "#031a4e",
    width: 1400,
    height: element.offsetHeight
  });
  const response = await fetch(pngUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
}

function GroupPosterShareButton({ rows, posterRef, fileName }: {
  rows: any[];
  posterRef: RefObject<HTMLDivElement>;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sharePoster() {
    setMessage("");
    if (!rows.length || !posterRef.current || busy) return;
    setBusy(true);
    try {
      const file = await groupPosterFile(posterRef.current, fileName);
      if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        setMessage("Thiết bị chưa hỗ trợ chia sẻ file. Ảnh bảng vàng đã được tải xuống.");
        return;
      }
      await navigator.share({
        files: [file],
        title: "Bảng vàng doanh thu nhóm",
        text: "Bảng vàng doanh thu nhóm"
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Không thể chia sẻ bảng vàng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mobile-group-share-wrap">
      <button className="mobile-group-share-button" type="button" onClick={sharePoster} disabled={busy || !rows.length} aria-label="Chia sẻ bảng vàng nhóm qua Zalo">
        <Share2 size={14} /> {busy ? "Đang tạo..." : "Chia sẻ"}
      </button>
      {message && <span className="mobile-group-share-message">{message}</span>}
    </div>
  );
}

type XlsxCell = string | number;
type XlsxRow = Record<string, XlsxCell>;

function exportToXlsx({ rows, sheetName, fileName }: { rows: XlsxRow[]; sheetName: string; fileName: string }) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const fullMoneyColumns = new Set(["IP", "AFYP", "BQ/HĐ"]);
  headers.forEach((header, columnIndex) => {
    if (!fullMoneyColumns.has(header)) return;
    for (let rowIndex = 1; rowIndex <= rows.length; rowIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (cell && typeof cell.v === "number") cell.z = "#,##0";
    }
  });
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
    "Trưởng nhóm": groupLeaderName(row.groupName),
    "AFYP": Number(row.afyp ?? 0),
    "IP": Number(row.ip ?? 0),
    "HĐ": row.contractCount,
    "TVV": row.agentCount,
    "Tỷ trọng": formatPercent(row.afypShare),
    "BQ/HĐ": Number(row.averageAfypPerContract ?? 0)
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
    "AFYP": Number(row.afyp ?? 0),
    "IP": Number(row.ip ?? 0),
    "HĐ": row.contractCount,
    "BQ/HĐ": Number(row.averageAfypPerContract ?? 0)
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
    ? ["#", "Ban", "Nhóm", "AFYP", "IP", "HĐ", "TVV", "Tỷ trọng", "BQ/HĐ"]
    : ["#", "Mã TVV", "Tên TVV", "Ban", "Nhóm", "ADS", "AFYP", "IP", "HĐ", "BQ/HĐ"];
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
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const xlsxRows = useMemo(() => buildGroupXlsxRows(rows), [rows]);
  const [year, monthNumber] = month.slice(0, 7).split("-");
  const maxAfyp = Math.max(...rows.map((row) => Number(row.afyp ?? 0)), 0);
  const maxIp = Math.max(...rows.map((row) => Number(row.ip ?? 0)), 0);
  const maxShare = Math.max(...rows.map((row) => Number(row.afypShare ?? 0)), 0);
  const maxAverage = Math.max(...rows.map((row) => Number(row.averageAfypPerContract ?? 0)), 0);
  return (
    <>
    <GroupAgentKpiRow type="group" rows={rows} contracts={contracts} />
    <div className="panel template-ranking-panel">
      <div className="panel-header poster-panel-header">
        <h2>Xếp hạng nhóm</h2>
        <GroupPosterShareButton rows={rows} posterRef={posterRef} fileName={`bang-vang-doanh-thu-nhom-${monthNumber}-${year}.png`} />
        <div className="poster-actions">
          {hiddenColumns.length > 0 && <button className="ghost" type="button" onClick={() => setHiddenColumns([])}>Hiện</button>}
          <GroupPosterDownloadButton rows={rows} posterRef={posterRef} fileName={`bang-vang-doanh-thu-nhom-${monthNumber}-${year}.png`} />
          <XlsxDownloadButton rows={xlsxRows} sheetName="Xếp hạng nhóm" fileName={`xep-hang-nhom-${month}.xlsx`} />
        </div>
      </div>
      <DataTable className="desktop-table template-ranking-table group-ranking-table" headers={["#", "Ban", "Nhóm", "Trưởng nhóm", "AFYP", "IP", "HĐ", "TVV", "Tỷ trọng", "BQ/HĐ"]} colWidths={["50px", "130px", "150px", "150px", "180px", "180px", "60px", "60px", "140px", "160px"]}>
        {rows.map((row) => (
          <tr key={`${row.banName}-${row.groupName}`} className="clickable" onClick={() => openContracts(row.groupName, contracts.filter((item) => groupNameForRecord(item) === row.groupName))}>
            <td><RankBadge rank={row.rank} /></td>
            <td>{row.banName}</td>
            <td>{row.groupName}</td>
            <td>{groupLeaderName(row.groupName)}</td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{moneyCell(row.afyp)}</span><TemplateProgress value={Number(row.afyp ?? 0)} max={maxAfyp} tone="blue" /></td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{formatFullMoney(row.ip)}</span><TemplateProgress value={Number(row.ip ?? 0)} max={maxIp} tone="green" /></td>
            <td className="count-cell">{row.contractCount}</td>
            <td className="count-cell">{row.agentCount}</td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{formatPercent(row.afypShare)}</span><TemplateProgress value={Number(row.afypShare ?? 0)} max={maxShare} tone="blue" /></td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{formatFullMoney(row.averageAfypPerContract)}</span><TemplateProgress value={Number(row.averageAfypPerContract ?? 0)} max={maxAverage} tone="purple" /></td>
          </tr>
        ))}
      </DataTable>
      <MobileGroupRankingCards rows={rows} contracts={contracts} openContracts={openContracts} />
      <div className="poster-offscreen" aria-hidden="true">
        <div ref={posterRef} style={{ width: 1400 }}>
          <LeaderboardPoster month={month} rows={rows} />
        </div>
      </div>
    </div>
    </>
  );
}

function AgentTable({ month, rows, contracts, openContracts }: { month: string; rows: any[]; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const date = posterDateText();
  const xlsxRows = useMemo(() => buildAgentXlsxRows(rows), [rows]);
  const maxAfyp = Math.max(...rows.map((row) => Number(row.afyp ?? 0)), 0);
  const maxIp = Math.max(...rows.map((row) => Number(row.ip ?? 0)), 0);
  return (
    <>
    <GroupAgentKpiRow type="agent" rows={rows} contracts={contracts} />
    <div className="panel template-ranking-panel">
      <div className="panel-header poster-panel-header">
        <h2>Xếp hạng tư vấn viên</h2>
        <div className="poster-actions">
          {hiddenColumns.length > 0 && <button className="ghost" type="button" onClick={() => setHiddenColumns([])}>Hiện</button>}
          <PosterDownloadButton rows={rows} posterRef={posterRef} fileName={`bang-vang-doanh-thu-tu-van-vien-thang-${date.fileMonth}.jpg`} />
          <XlsxDownloadButton rows={xlsxRows} sheetName="Xếp hạng TVV" fileName={`xep-hang-tvv-${month}.xlsx`} />
        </div>
      </div>
      <DataTable className="desktop-table template-ranking-table agent-ranking-table" headers={["#", "Mã TVV", "Tên TVV", "Ban", "Nhóm", "ADS", "AFYP", "IP", "HĐ", "BQ/HĐ"]} colWidths={["50px", "120px", "190px", "130px", "130px", "170px", "180px", "180px", "60px", "140px"]}>
        {rows.map((row) => (
          <tr key={`${row.agentName}-${row.agentCode}`} className="clickable" onClick={() => openContracts(row.agentName, contracts.filter((item) => item.agent_name === row.agentName))}>
            <td><RankBadge rank={row.rank} /></td>
            <td>{row.agentCode}</td>
            <td>{row.agentName}</td>
            <td>{row.banName}</td>
            <td>{row.groupName}</td>
            <td>{row.adsName}</td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{moneyCell(row.afyp)}</span><TemplateProgress value={Number(row.afyp ?? 0)} max={maxAfyp} tone="blue" /></td>
            <td className="number-cell metric-cell"><span className="ranking-metric-value">{formatFullMoney(row.ip)}</span><TemplateProgress value={Number(row.ip ?? 0)} max={maxIp} tone="green" /></td>
            <td className="count-cell">{row.contractCount}</td>
            <td className="number-cell"><span className="ranking-metric-value">{formatFullMoney(row.averageAfypPerContract)}</span></td>
          </tr>
        ))}
      </DataTable>
      <MobileAgentRankingCards rows={rows} contracts={contracts} openContracts={openContracts} />
      <div className="poster-offscreen" aria-hidden="true"><div ref={posterRef}><RankingPoster type="agent" rows={rows} /></div></div>
    </div>
    </>
  );
}

function StatusReport({ report, contracts, openContracts }: { report: any; contracts: any[]; openContracts: (status: string, title: string, rows: any[]) => void }) {
  const hiddenStatusLabels = new Set(["co hieu luc"]);
  const tableRows = (report.statusTableRows ?? report.groupedStatusRows ?? []).filter((row: any) => !hiddenStatusLabels.has(normalizedContractStatus(row.label)));
  const mobileStatusRows = tableRows;
  const contractsByStatus = (row: any) => {
    const rowStatuses = Array.isArray(row.statuses) && row.statuses.length > 0 ? row.statuses : [row.label];
    const normalizedRowStatuses = new Set(rowStatuses.map((status: unknown) => normalizedContractStatus(status)));
    return contracts.filter((item) => {
      const itemStatus = item.policy_status ?? item.status ?? item.contract_status ?? "";
      return normalizedRowStatuses.has(normalizedContractStatus(itemStatus));
    });
  };
  const openStatusContracts = (row: any) => openContracts(String(row.label), `Danh sách hồ sơ: ${row.label}`, contractsByStatus(row));
  const cards = [
    { title: "Tổng hồ sơ", mobileTitle: "Tổng HS", count: report.totalPolicies ?? 0, afyp: report.totalAfyp ?? 0, icon: ClipboardList, tone: "blue" },
    { title: "Có hiệu lực", mobileTitle: "Hiệu lực", count: report.activePolicyCount ?? 0, afyp: report.activePolicyAfyp ?? 0, icon: Target, tone: "green" },
    { title: "Chờ xử lý", mobileTitle: "Chờ XL", count: report.pendingPolicyCount ?? 0, afyp: report.pendingPolicyAfyp ?? 0, icon: TrendingUp, tone: "orange" },
    { title: "Hoàn phí", mobileTitle: "Hoàn phí", count: report.refundPolicyCount ?? 0, afyp: report.refundPolicyAfyp ?? 0, icon: Coins, tone: "purple" }
  ];
  const pieRows = tableRows.map((row: any) => ({
    name: row.label,
    value: Number(row.count ?? 0),
    rate: row.rate,
    color: getStatusColor(row.label),
    statuses: row.statuses
  })).filter((row: any) => row.value > 0);

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
      <div className="status-two-column">
        <div className="panel status-table-panel">
          <div className="panel-header"><h2>Nhóm trạng thái</h2></div>
          <DataTable className="desktop-table template-yellow-head" headers={["Nhóm trạng thái", "Số hồ sơ", "AFYP", "Tỷ lệ"]}>
            {tableRows.map((row: any) => (
              <tr key={row.key ?? row.label} className="clickable status-clickable-row" onClick={() => openStatusContracts(row)}>
                <td>{row.label}</td><td>{formatNumber(row.count)}</td><td>{formatCompactVnd(row.afyp)}</td><td>{formatPercent(row.rate)}</td>
              </tr>
            ))}
          </DataTable>
          <div className="mobile-card-list status-mobile-list">
            {mobileStatusRows.map((row: any) => (
              <button className="mobile-status-card" key={row.key ?? row.label} type="button" onClick={() => openStatusContracts(row)}>
                <strong>{compactStatusLabel(row.label)}</strong>
                <div className="mobile-metric-grid compact">
                  <MobileMetric label="HS" value={formatNumber(row.count)} />
                  <MobileMetric label="AFYP" value={formatCompactVnd(row.afyp)} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="panel status-donut-panel">
          <div className="panel-header"><h2>Phân bổ theo trạng thái</h2></div>
          <div className="status-donut-layout">
            <div className="status-donut-chart">
              <ResponsiveContainer width="100%" height={230}>
                <RechartsPieChart>
                  <Pie data={pieRows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={94} paddingAngle={1}>
                    {pieRows.map((entry: any) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${formatNumber(Number(value))} hồ sơ`, name]} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="status-donut-center"><strong>{formatNumber(report.totalPolicies ?? 0)}</strong><span>Tổng hồ sơ</span></div>
            </div>
            <div className="status-donut-legend">
              {pieRows.map((row: any) => (
                <button key={row.name} type="button" onClick={() => openStatusContracts({ label: row.name, statuses: row.statuses })}>
                  <i style={{ backgroundColor: row.color }} />
                  <span>{row.name}</span>
                  <b>{formatPercent(row.rate)} ({formatNumber(row.value)})</b>
                </button>
              ))}
            </div>
          </div>
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
              <YAxis tickFormatter={(v) => `${Number(v) / 1_000_000_000} tá»·`} />
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

function adsRowTitle(row: any) {
  return row.adsDisplayName || row.adsName || "Chưa gán ADS";
}

function adsRowContracts(row: any, contracts: any[]) {
  const name = String(row.adsName ?? "").trim();
  const code = String(row.adsCode ?? "").trim();
  const subtitle = String(row.adsSubtitle ?? "").trim();
  const hasName = Boolean(row.hasAdsName);

  return contracts.filter((item) => {
    if (hasName && name) return item.ads_name === name;
    if (code) return item.ads_code === code || item.ads_name === code;
    if (subtitle && !subtitle.includes("nhóm chưa gán")) return item.group_name === subtitle || item.ban_name === subtitle;
    return !item.ads_name && !item.ads_code;
  });
}

function AdsTable({ report, rows, month, contracts, openContracts }: { report?: any; rows: any[]; month: string; contracts: any[]; openContracts: (title: string, rows: any[]) => void }) {
  const [detailPeriod, setDetailPeriod] = useState<"month" | "quarter" | "year">("month");
  const adoRows = report?.rows ?? [];
  const departmentRows = report?.departments ?? [];
  useEffect(() => {
    const sourceAdos = rows.map((row) => String(row.adsName ?? row.adsDisplayName ?? "")).filter(Boolean);
    console.log("[ADO] Danh sách đ�c được từ BC02:", sourceAdos);
    console.log("[ADO] Danh sách sau chuẩn hóa alias:", adoRows.map((row: any) => row.sourceName ?? row.adoName));
    console.log("[ADO] Danh sách cuối cùng hiển thị:", adoRows.map((row: any) => row.adoName));
    if (!adoRows.some((row: any) => row.adoName === "Nguyễn Thị Trầm")) console.warn("[ADO] Nguyễn Thị Trầm không xuất hiện: kiểm tra mapping ADO/KPI.");
  }, [rows, adoRows]);
  const tone = (value: number) => value >= 100 ? "good" : value >= 80 ? "blue" : value >= 50 ? "warn" : "bad";
  const kpiDonut = (value: number, color = "#1677ff") => <div className="ado-donut ado-kpi-donut" style={{ background: `conic-gradient(${color} ${Math.min(value, 100)}%, #e8f1fb 0)` }}><div><strong>{formatPercent(value)}</strong><small>Hoàn thành KPI tháng</small></div></div>;
  const revenueDonut = (items: any[], total: number) => {
    let cursor = 0;
    const slices = items.map((row, index) => {
      const start = cursor;
      const share = total ? Number(row.monthlyAfyp ?? 0) / total * 100 : 0;
      cursor += share;
      return `${adoColor(row.adoName, index)} ${start}% ${cursor}%`;
    });
    return <div className="ado-donut ado-revenue-donut" style={{ background: `conic-gradient(${slices.length ? slices.join(", ") : "#e8f1fb 0 100%"})` }}><div><strong>{formatCompactVnd(total)}</strong></div></div>;
  };
  const periodLabel = detailPeriod === "month" ? "tháng" : detailPeriod === "quarter" ? "quý" : "năm";
  const periodOptions: Array<{ key: "month" | "quarter" | "year"; label: string }> = [{ key: "month", label: "Tháng" }, { key: "quarter", label: "Quý" }, { key: "year", label: "Năm" }];
  const periodMetrics = (row: any) => {
    const metric = detailPeriod === "quarter"
      ? { afyp: row.quarterAfyp, kpi: row.quarterKpi, rate: row.quarterRate, ip: row.quarterIp, contractCount: row.quarterContractCount, agentCount: row.quarterAgentCount }
      : detailPeriod === "year"
        ? { afyp: row.yearAfyp, kpi: row.yearKpi, rate: row.yearRate, ip: row.yearIp, contractCount: row.yearContractCount, agentCount: row.yearAgentCount }
        : { afyp: row.monthlyAfyp, kpi: row.monthlyKpi, rate: row.monthlyRate, ip: row.ip, contractCount: row.contractCount, agentCount: row.agentCount };
    return {
      afyp: Number(metric.afyp ?? 0),
      kpi: Number(metric.kpi ?? 0),
      rate: Number(metric.rate ?? 0),
      ip: Number(metric.ip ?? 0),
      contractCount: Number(metric.contractCount ?? 0),
      agentCount: Number(metric.agentCount ?? 0)
    };
  };
  useEffect(() => {
    [...adoRows, ...departmentRows].forEach((row: any) => {
      const metric = periodMetrics(row);
      console.log("[ADO period debug]", {
        currentPeriodMode: detailPeriod,
        recordsUsedForPeriod: row.periodRecordCounts?.[detailPeriod] ?? null,
        adoName: row.adoName ?? row.department,
        afypTotal: metric.afyp,
        ipTotal: metric.ip,
        contractCount: metric.contractCount,
        tvvCount: metric.agentCount
      });
    });
  }, [detailPeriod, adoRows, departmentRows]);
  const adoColWidths = ["28%", "12%", "12%", "16%", "13%", "10%", "9%"];
  const periodButtons = <div className="ado-period-toggle">{periodOptions.map((option) => <button key={option.key} type="button" className={detailPeriod === option.key ? "active" : ""} onClick={() => setDetailPeriod(option.key)}>{option.label}</button>)}</div>;
  const detailRow = (row: any, index = 0) => { const metric = periodMetrics(row); const delta = Number(metric.kpi ?? 0) - Number(metric.afyp ?? 0); return <tr key={row.adoName} className="clickable" onClick={() => openContracts(row.adoName, adsRowContracts({ adsName: row.sourceName, hasAdsName: true }, contracts))}><td><div className="ado-name-cell"><span className="ado-avatar" style={{ backgroundColor: adoColor(row.adoName, index) }}>{row.adoName.slice(0, 1)}</span><strong>{row.adoName}</strong></div></td><td>{formatFullMoney(metric.afyp)}</td><td>{formatFullMoney(metric.kpi)}</td><td><span className={`ado-mini-progress ${tone(metric.rate)}`}><i><em style={{ width: `${Math.min(metric.rate, 100)}%` }} /></i><b>{formatPercent(metric.rate)}</b></span></td><td className={delta <= 0 ? "positive" : "negative"}>{delta <= 0 ? `Vượt ${formatFullMoney(Math.abs(delta))}` : formatFullMoney(delta)}</td><td>{formatFullMoney(metric.ip)}</td><td>{metric.contractCount} / {metric.agentCount}</td></tr>; };
  const mobileDetailRow = (row: any, index = 0) => {
    const metric = periodMetrics(row);
    return (
      <button className="ado-mobile-detail-row" type="button" key={`${row.adoName}-mobile`} onClick={() => openContracts(row.adoName, adsRowContracts({ adsName: row.sourceName, hasAdsName: true }, contracts))}>
        <span className="ado-avatar" style={{ backgroundColor: adoColor(row.adoName, index) }}>{row.adoName.slice(0, 1)}</span>
        <strong className="ado-mobile-name">{row.adoName}</strong>
        <span className="ado-mobile-rate">{formatPercent(metric.rate)}</span>
        <div className="ado-mobile-metrics">
          <span><small>AFYP</small><b>{formatCompactVnd(metric.afyp)}</b></span>
          <span><small>KPI</small><b>{formatCompactVnd(metric.kpi)}</b></span>
          <span><small>IP</small><b>{formatCompactVnd(metric.ip)}</b></span>
          <span><small>HĐ / TVV</small><b>{metric.contractCount} / {metric.agentCount}</b></span>
        </div>
      </button>
    );
  };
  return (
    <div className="panel ado-page">
      <div className="panel-header"><h2>Tổng quan KPI theo phòng</h2></div>
      <div className="ado-departments">{departmentRows.map((row: any, index: number) => <section className="ado-department summary" key={row.department}><div><h3>{row.department}</h3><strong>{formatCompactVnd(row.monthlyAfyp)}</strong></div>{kpiDonut(row.monthlyRate, index ? "#16a34a" : "#1677ff")}<aside><span>Hoàn thành<b>{formatPercent(row.monthlyRate)}</b></span><span>Còn thiếu<b>{formatCompactVnd(Math.max(row.monthlyKpi-row.monthlyAfyp,0))}</b></span></aside></section>)}</div>
      <div className="ado-composition">{departmentRows.map((department: any) => { const items=adoRows.filter((row:any)=>row.department===department.department); const total = Number(department.monthlyAfyp ?? 0); return <section key={department.department} className={department.department === "PTKD 2" ? "ptkd-2" : "ptkd-1"}><h3>Cơ cấu doanh thu {department.department} (AFYP tháng)</h3>{revenueDonut(items,total)}<div className="ado-composition-list">{items.map((row:any,index:number)=>{ const share = total ? Number(row.monthlyAfyp ?? 0) / total * 100 : 0; return <p key={row.adoName} style={{ "--ado-color": adoColor(row.adoName, index) } as React.CSSProperties}><span>{row.adoName}</span><b>{formatCompactVnd(row.monthlyAfyp)}</b><strong>{formatPercent(share)}</strong></p>;})}</div></section>;})}</div>
      <div className="panel-header ado-detail-header"><h2>Chi tiết ADO</h2></div>
      <div className="ado-detail-sections">{departmentRows.map((department: any) => { const items = adoRows.filter((row: any) => row.department === department.department).sort((a: any,b:any)=>b.monthlyAfyp-a.monthlyAfyp); const total = periodMetrics(department); const totalDelta = total.kpi - total.afyp; return <section className="ado-room" key={department.department}><div className="ado-room-total"><div><span className="ado-room-icon">{department.department === "PTKD 2" ? "2" : "1"}</span><strong>{department.department}</strong></div>{periodButtons}</div><DataTable className="desktop-table ado-table" headers={["ADO","AFYP","KPI","Hoàn thành","Còn thiếu","IP","HĐ / TVV"]} colWidths={adoColWidths}>{items.map(detailRow)}<tr className="ado-total-row"><td>Tổng {department.department}</td><td>{formatFullMoney(total.afyp)}</td><td>{formatFullMoney(total.kpi)}</td><td>{formatPercent(total.rate)}</td><td className={totalDelta <= 0 ? "positive" : "negative"}>{totalDelta <= 0 ? `Vượt ${formatFullMoney(Math.abs(totalDelta))}` : formatFullMoney(totalDelta)}</td><td>{formatFullMoney(total.ip)}</td><td>{total.contractCount} / {total.agentCount}</td></tr></DataTable><div className="ado-mobile-detail-list">{items.map(mobileDetailRow)}</div></section>; })}</div>
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
          <h2>SAO VIỆT CÁ NHÂN</h2>
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
        <KpiCard tone="gold" icon={Trophy} title="TVV đạt Sao Việt" value={formatNumber(summary.achievedAgents ?? 0)} />
        <KpiCard tone="green" icon={Coins} title="Tổng AFYP Sao Việt" mobileTitle="AFYP SV" value={formatCompactVnd(summary.totalAfyp ?? 0)} />
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
              <td><strong>{formatFullMoney(row.totalAfyp)}</strong></td>
              <td><span className={`star-rank-badge ${row.rankTone}`}>{row.currentRank}</span></td>
              <td>{ticketLabel(row.currentTickets)}</td>
              <td>{row.nextRank}</td>
              <td>{formatFullMoney(row.remainingToNext)}</td>
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
                  <p><span>Mốc tiếp theo:</span><strong>Đã đạt mốc cao nhất</strong></p>
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
      setMessage("Đã lưu chỉ tiêu tháng.");
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
        {message && <p className={message.startsWith("Đ") ? "success" : "error-list"}>{message}</p>}
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
    if (normalized.includes("hop dong") || normalized.includes("contract") || normalized.includes("policy") || normalized.includes("hd")) return "Hợp đồng";
    if (normalized.includes("nhom") || normalized.includes("group")) return "Nhóm";
    if (normalized.includes("tvv") || normalized.includes("tu van") || normalized.includes("advisor") || normalized.includes("agent")) return "TVV";
    return text;
  };
  if (Array.isArray(value)) return [...new Set(value.map(normalizeTarget).filter(Boolean))].join(", ");
  if (typeof value === "string") return normalizeTarget(value);
  return "-";
}

type CompetitionResultTarget = "groups" | "advisors" | "contracts";

function competitionTargetKey(value: unknown): CompetitionResultTarget | null {
  const normalized = normalizeViText(String(value ?? "").trim());
  if (!normalized) return null;
  if (normalized.includes("hop dong") || normalized.includes("contract") || normalized.includes("policy") || normalized.includes("hd")) return "contracts";
  if (normalized.includes("nhom") || normalized.includes("group")) return "groups";
  if (normalized.includes("tvv") || normalized.includes("tu van") || normalized.includes("advisor") || normalized.includes("agent")) return "advisors";
  return null;
}

function inferCompetitionRecipientTarget(rule: any): CompetitionResultTarget | null {
  const resultTab = competitionTargetKey(rule?.result_tab ?? rule?.condition?.result_tab);
  if (resultTab) return resultTab;
  const target = competitionTargetKey(rule?.target_type ?? rule?.condition?.target_type);
  if (target === "groups") return "groups";
  const explicit = competitionTargetKey(rule?.reward_recipient_type ?? rule?.recipient_type ?? rule?.recipient ?? rule?.condition?.reward_recipient_type ?? rule?.condition?.recipient_type ?? rule?.condition?.recipient);
  if (explicit) return explicit;
  const normalized = normalizeViText([
    rule?.reward_name,
    rule?.prize_name,
    rule?.condition_text,
    rule?.calculation_logic,
    rule?.reward_formula,
    rule?.reward_type,
    rule?.condition?.type,
    rule?.condition?.text,
    rule?.condition?.description
  ].join(" "));
  if (isCompetitionGroupRuleText(normalized)) return "groups";
  if (normalized.includes("/tvv") || normalized.includes("tvv hoat dong") || normalized.includes("moi tvv") || normalized.includes("tu van vien") || normalized.includes("active_advisor")) return "advisors";
  if (normalized.includes("/hd") || normalized.includes("/hop dong") || normalized.includes("moi hd") || normalized.includes("moi hop dong") || normalized.includes("pdt/hd") || normalized.includes("per_contract") || normalized.includes("per_policy") || normalized.includes("top_n")) return "contracts";
  return null;
}

function isCompetitionGroupRuleText(normalized: string) {
  return [
    "tong doanh thu/nhom",
    "tong doanh thu nhom",
    "doanh thu nhom",
    "tong ip nhom",
    "tong afyp nhom",
    "chi tieu nhom",
    "kpi nhom",
    "nhom dat",
    "theo nhom",
    "moi nhom",
    "nhom co doanh thu",
    "so hd/nhom",
    "so hop dong/nhom",
    "tvv hoat dong trong nhom"
  ].some((phrase) => normalized.includes(phrase));
}

function competitionResultTargets(program: CompetitionProgramView | undefined): CompetitionResultTarget[] {
  const summaryTargets = Array.isArray(program?.recipientTypes)
    ? program.recipientTypes.map(competitionTargetKey).filter(Boolean) as CompetitionResultTarget[]
    : [];
  if (summaryTargets.length > 0) return [...new Set(summaryTargets)];

  const rewardRules = Array.isArray(program?.confirmedRule?.reward_rules) ? program?.confirmedRule.reward_rules : [];
  const ruleTargets = rewardRules
    .map(inferCompetitionRecipientTarget)
    .filter(Boolean) as CompetitionResultTarget[];
  return [...new Set(ruleTargets)];
}

function rewardRuleCards(rule: any) {
  return Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
}

function dedupeRewardContracts(rows: any[] = []) {
  const selected = new Map<string, any>();
  for (const row of rows) {
    if (!row?.is_eligible || !(Number(row.reward_amount ?? row.rewardAmount ?? 0) > 0)) continue;
    const gycNo = String(row.gyc_no ?? row.applicationNo ?? "").trim();
    const contractNo = String(row.contract_no ?? row.contractNo ?? row.policy_no ?? "").trim();
    const key = gycNo
      ? `gyc:${normalizeViText(gycNo)}`
      : contractNo
        ? `contract:${normalizeViText(contractNo)}`
        : [row.collection_date ?? row.paidDate, row.tvv ?? row.advisor, row.customer_name ?? row.customer, row.ip, row.afyp].map(normalizeViText).join("|");
    const current = selected.get(key);
    const amount = Number(row.reward_amount ?? row.rewardAmount ?? 0);
    const currentAmount = Number(current?.reward_amount ?? current?.rewardAmount ?? 0);
    const priority = Number(row.rule_priority ?? row.rulePriority ?? Number.MAX_SAFE_INTEGER);
    const currentPriority = Number(current?.rule_priority ?? current?.rulePriority ?? Number.MAX_SAFE_INTEGER);
    if (!current || amount > currentAmount || (amount === currentAmount && priority < currentPriority)) selected.set(key, row);
  }
  return [...selected.values()];
}

function summarizeQualifiedRewardContracts(qualifiedRewardContracts: any[] = []) {
  const advisors = new Map<string, any>();
  const groups = new Map<string, any>();
  for (const contract of qualifiedRewardContracts) {
    const advisor = String(contract.tvv ?? contract.advisor ?? "").trim() || "-";
    const group = String(contract.team ?? contract.group ?? "").trim() || "-";
    const amount = Number(contract.reward_amount ?? contract.rewardAmount ?? 0);
    const ip = Number(contract.ip ?? 0);
    const afyp = Number(contract.afyp ?? 0);
    const rewardName = String(contract.reward_name ?? contract.rewardName ?? contract.prize_name ?? "").trim();
    const advisorKey = `${normalizeViText(advisor)}__${normalizeViText(group)}`;
    const advisorRow = advisors.get(advisorKey) ?? { tvv: advisor, team: group, eligible_contract_count: 0, total_ip: 0, total_afyp: 0, reward_amount: 0, rewardNames: new Set<string>() };
    advisorRow.eligible_contract_count += 1;
    advisorRow.total_ip += ip;
    advisorRow.total_afyp += afyp;
    advisorRow.reward_amount += amount;
    if (rewardName) advisorRow.rewardNames.add(rewardName);
    advisors.set(advisorKey, advisorRow);
    const groupRow = groups.get(group) ?? { group, totalIP: 0, totalAFYP: 0, contractCount: 0, totalReward: 0, advisors: new Set<string>(), rewardNames: new Set<string>() };
    groupRow.totalIP += ip;
    groupRow.totalAFYP += afyp;
    groupRow.contractCount += 1;
    groupRow.totalReward += amount;
    if (advisor !== "-") groupRow.advisors.add(advisor);
    if (rewardName) groupRow.rewardNames.add(rewardName);
    groups.set(group, groupRow);
  }
  const advisorRows = [...advisors.values()].map((row) => ({ ...row, note: [...row.rewardNames].join(", ") || "-" })).sort((a, b) => b.reward_amount - a.reward_amount || b.total_ip - a.total_ip);
  const groupRows = [...groups.values()].map((row) => ({ group: row.group, totalIP: row.totalIP, totalAFYP: row.totalAFYP, activeAdvisorCount: row.advisors.size, contractCount: row.contractCount, milestone: [...row.rewardNames].join(", ") || "-", rewardPerAdvisor: row.advisors.size ? row.totalReward / row.advisors.size : 0, totalReward: row.totalReward, note: [...row.rewardNames].join(", ") || "-" })).sort((a, b) => b.totalReward - a.totalReward || b.totalIP - a.totalIP);
  return { advisorRows, groupRows, totalReward: qualifiedRewardContracts.reduce((sum, row) => sum + Number(row.reward_amount ?? row.rewardAmount ?? 0), 0) };
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
      group: repairMojibake(String(row.team || row.group || "-").trim() || "-"),
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

function competitionMissingGroupThreshold(program?: CompetitionProgramView) {
  const rule = program?.confirmedRule ?? program?.aiRule ?? {};
  const rewardRules = Array.isArray(rule.reward_rules) ? rule.reward_rules : Array.isArray(rule.rewards) ? rule.rewards : [];
  const thresholds = rewardRules.flatMap((reward: any) => reward.thresholds ?? reward.tiers ?? reward.condition?.tiers ?? []);
  const values = thresholds
    .map((tier: any) => Number(tier.min_group_revenue ?? tier.min_revenue ?? tier.threshold ?? tier.min_amount ?? 0))
    .filter((value: number) => value > 0);
  return values.length ? Math.min(...values) : 0;
}

function isWaitingRuleConfirmation(program?: CompetitionProgramView | null) {
  const status = normalizeViText(String(program?.status || ""));
  return Boolean(program && !program.confirmedRule && status.includes("cho xac nhan"));
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
    return { tone: "warning", text: "Chưa có dữ liệu hợp đồng trong thời gian thi đua. Vui lòng upload CSV có chứa khoảng thời gian chương trình trước." };
  }
  if (!program.lastCalculatedAt) {
    return { tone: "info", text: "Chưa xác nhận rule. Có thể tính thưởng từ dữ liệu CSV theo thời gian chương trình." };
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
      const hiddenIds = hiddenCompetitionProgramIds();
      setPrograms((payload.programs ?? []).filter((program: CompetitionProgramView) => !program.isHidden && !hiddenIds.has(program.id)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được chương trình thi đua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
  }, [refreshKey]);

  useEffect(() => {
    const syncHiddenPrograms = () => loadPrograms();
    window.addEventListener(HIDDEN_COMPETITION_PROGRAMS_EVENT, syncHiddenPrograms);
    window.addEventListener("storage", syncHiddenPrograms);
    return () => {
      window.removeEventListener(HIDDEN_COMPETITION_PROGRAMS_EVENT, syncHiddenPrograms);
      window.removeEventListener("storage", syncHiddenPrograms);
    };
  }, []);

  return (
    <div className={`competition-panel-stack ${selectedProgramId ? "has-selected-program" : ""}`}>
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
                <button className="contest-mobile-card" key={`${program.id}-mobile`} type="button" onClick={() => setSelectedProgramId(program.id)}>
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
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {selectedProgramId && <CompetitionDetailModal programId={selectedProgramId} month={month} refreshKey={refreshKey} onClose={() => setSelectedProgramId("")} onChanged={() => { onChanged(); loadPrograms(); }} />}
    </div>
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

const DEFAULT_PDT_TIERS = [[50, "8%", "6%"], [40, 2800000, 2500000], [30, 1800000, 1500000], [24, 1400000, 1200000], [18, 900000, 700000], [12, 600000, 500000], [8, 400000, 300000]];

function isPdtRewardTable(rule: any) {
  return (rule?.reward_rules ?? []).some((item: any) => item?.reward_type === "reward_by_policy_pdt_table" && Array.isArray(item?.pdt_reward_tiers));
}

function LegacyCompetitionRuleForm({ rule, onUpdateRule }: { rule: any; onUpdateRule: (mutator: (rule: any) => any) => void }) {
  const tableRule = (rule?.reward_rules ?? []).find((item: any) => item?.reward_type === "reward_by_policy_pdt_table");
  if (!isPdtRewardTable(rule) || !tableRule) return <div className="contest-rule-fallback"><p>Thể lệ này chưa nhận diện được dạng bảng thưởng PĐT/HĐ. Bạn vẫn có thể chỉnh sửa trong phần JSON nâng cao.</p><button className="secondary" type="button" onClick={() => onUpdateRule((current) => ({ ...current, reward_rules: [{ id: "pdt-reward-table", reward_name: "Bảng thưởng theo PĐT/HĐ", target_type: "policy", reward_recipient_type: "Hợp đồng", reward_type: "reward_by_policy_pdt_table", spc_products: ["BV-NCUVL08"], pdt_reward_tiers: DEFAULT_PDT_TIERS.map(([min_pdt, spc_reward, other_reward]) => ({ min_pdt: Number(min_pdt) * 1000000, spc_reward, other_reward })) }] }))}>Tạo bảng thưởng PĐT/HĐ</button></div>;
  const tiers = tableRule.pdt_reward_tiers ?? [];
  const updateTable = (mutator: (item: any) => any) => onUpdateRule((current) => ({ ...current, reward_rules: current.reward_rules.map((item: any) => item === tableRule || item.id === tableRule.id ? mutator(item) : item) }));
  const updateGeneral = (key: string, value: any) => onUpdateRule((current) => ({ ...current, [key]: value }));
  const statuses = ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực"];
  return <div className="contest-rule-form pdt-table-form">
    <div className="pdt-reward-table-wrap"><table className="pdt-reward-table"><thead><tr><th>PĐT/HĐ từ</th><th>Thưởng HĐ SPC An Thịnh Phúc Niên</th><th>Thưởng HĐ còn lại</th><th /></tr></thead><tbody>{tiers.map((tier: any, index: number) => <tr key={index}><td><input type="number" min="0" value={Number(tier.min_pdt ?? 0) / 1000000 || ""} onChange={(event) => updateTable((item) => ({ ...item, pdt_reward_tiers: item.pdt_reward_tiers.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, min_pdt: Number(event.target.value || 0) * 1000000 } : row) }))} /><span>trđ</span></td><td><input value={tier.spc_reward ?? ""} placeholder="VD: 8% hoặc 2800000" onChange={(event) => updateTable((item) => ({ ...item, pdt_reward_tiers: item.pdt_reward_tiers.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, spc_reward: event.target.value } : row) }))} /><small>{String(tier.spc_reward ?? "").includes("%") ? "% * PĐT" : "đ"}</small></td><td><input value={tier.other_reward ?? ""} placeholder="VD: 6% hoặc 2500000" onChange={(event) => updateTable((item) => ({ ...item, pdt_reward_tiers: item.pdt_reward_tiers.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, other_reward: event.target.value } : row) }))} /><small>{String(tier.other_reward ?? "").includes("%") ? "% * PĐT" : "đ"}</small></td><td><button className="ghost" type="button" onClick={() => updateTable((item) => ({ ...item, pdt_reward_tiers: item.pdt_reward_tiers.filter((_: any, rowIndex: number) => rowIndex !== index) }))}>Xóa dòng</button></td></tr>)}</tbody></table></div>
    <button className="secondary" type="button" onClick={() => updateTable((item) => ({ ...item, pdt_reward_tiers: [...item.pdt_reward_tiers, { min_pdt: 0, spc_reward: "", other_reward: "" }] }))}>Thêm dòng thưởng</button>
    <div className="contest-rule-general-grid"><label><span>Từ ngày</span><input type="date" value={rule?.start_date ?? ""} onChange={(event) => updateGeneral("start_date", event.target.value)} /></label><label><span>Đến ngày</span><input type="date" value={rule?.end_date ?? ""} onChange={(event) => updateGeneral("end_date", event.target.value)} /></label><label><span>Hạn phát hành hợp đồng</span><input type="date" value={rule?.issue_deadline ?? ""} onChange={(event) => updateGeneral("issue_deadline", event.target.value)} /></label><label><span>Sản phẩm SPC</span><input value={(tableRule.spc_products ?? ["BV-NCUVL08"]).join(", ")} onChange={(event) => updateTable((item) => ({ ...item, spc_products: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) }))} /></label><div className="full-width pdt-statuses"><span>Trạng thái loại trừ</span>{statuses.map((status) => <label key={status}><input type="checkbox" checked={(rule?.excluded_statuses ?? []).includes(status)} onChange={(event) => updateGeneral("excluded_statuses", event.target.checked ? [...new Set([...(rule?.excluded_statuses ?? []), status])] : (rule?.excluded_statuses ?? []).filter((value: string) => value !== status))} />{status}</label>)}</div></div>
  </div>;
}

type DynamicRewardKind = "pdt" | "contract" | "tvv" | "group" | "gift" | "custom";

function dynamicRuleText(value: unknown) {
  return normalizeViText(Array.isArray(value) ? value.join(" ") : String(value ?? ""));
}

function dynamicRewardKind(item: any): DynamicRewardKind {
  const scope = dynamicRuleText([item?.scope, item?.target_type, item?.condition?.scope, item?.condition?.target_type, item?.metric_type].filter(Boolean).join(" "));
  const kind = dynamicRuleText([item?.rule_type, item?.calculation_type, item?.reward_type, item?.type, item?.condition?.type, item?.reward?.type, item?.reward_name, item?.prize_name].filter(Boolean).join(" "));
  if (item?.reward_type === "reward_by_policy_pdt_table" && Array.isArray(item?.pdt_reward_tiers)) return "pdt";
  if (kind.includes("qua") || kind.includes("gift") || kind.includes("san pham")) return "gift";
  if (scope.includes("nhom") || scope.includes("group") || kind.includes("group_revenue") || kind.includes("active_advisor_by_group") || kind.includes("revenue_tier")) return "group";
  if (scope.includes("tvv") || scope.includes("advisor") || scope.includes("agent") || scope.includes("tu van")) return "tvv";
  if (scope.includes("hop dong") || scope.includes("policy") || scope.includes("contract") || kind.includes("top_n") || kind.includes("per_contract")) return "contract";
  return "custom";
}

function dynamicRewardLabel(kind: DynamicRewardKind) {
  if (kind === "contract" || kind === "pdt") return "Giải HĐ";
  if (kind === "tvv") return "Giải TVV";
  if (kind === "group") return "Giải Nhóm";
  if (kind === "gift") return "Quà tặng";
  return "Rule đặc thù";
}

function hasEditableDynamicRules(rule: any) {
  const rewards = Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
  return rewards.some((item: any) => dynamicRewardKind(item) !== "custom");
}

function isOnlyPdtTableRule(rule: any) {
  const rewards = Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
  return rewards.length > 0 && rewards.every((item: any) => dynamicRewardKind(item) === "pdt");
}

function shouldPreferAiRuleStructure(program: any) {
  const confirmedRule = program.confirmedRule || program.confirmed_rule;
  const aiRule = program.aiRule || program.ai_rule;
  const aiRewards = Array.isArray(aiRule?.reward_rules) ? aiRule.reward_rules : [];
  const programName = dynamicRuleText(program.programName || program.program_name || confirmedRule?.program_name || aiRule?.program_name);
  if (programName.includes("an thinh") || programName.includes("pdt")) return false;
  if (!confirmedRule || !aiRule || aiRewards.length === 0) return false;
  if (!isOnlyPdtTableRule(confirmedRule)) return false;
  return aiRewards.some((item: any) => dynamicRewardKind(item) !== "pdt" && dynamicRewardKind(item) !== "custom");
}

function setNestedValue(source: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  return { ...(source ?? {}), [head]: setNestedValue(source?.[head], rest, value) };
}

function dynamicNumberValue(value: unknown) {
  const amount = Number(value ?? 0);
  return amount > 0 ? amount : "";
}

function DynamicTextField({ label, value, onChange, placeholder = "" }: { label: string; value: unknown; onChange: (value: string) => void; placeholder?: string }) {
  return <label><span>{label}</span><input value={String(value ?? "")} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function DynamicNumberField({ label, value, onChange, suffix = "" }: { label: string; value: unknown; onChange: (value: number) => void; suffix?: string }) {
  return <label><span>{label}</span><input type="number" min="0" value={dynamicNumberValue(value)} onChange={(event) => onChange(Number(event.target.value || 0))} />{suffix ? <small>{suffix}</small> : null}</label>;
}

function CompetitionRuleForm({ rule, onUpdateRule, onUnsupportedRule }: { rule: any; onUpdateRule: (mutator: (rule: any) => any) => void; onUnsupportedRule?: () => void }) {
  const rewardRules = Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
  const statuses = ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực"];
  const updateGeneral = (key: string, value: any) => onUpdateRule((current) => ({ ...current, [key]: value }));
  const updateReward = (index: number, mutator: (item: any) => any) => onUpdateRule((current) => ({ ...current, reward_rules: (current.reward_rules ?? []).map((item: any, itemIndex: number) => itemIndex === index ? mutator(item) : item) }));
  const unsupportedOnly = rewardRules.length === 0 || !hasEditableDynamicRules(rule);

  return <div className="contest-rule-form dynamic-rule-form">
    <div className="contest-rule-general-grid">
      <label><span>Từ ngày</span><input type="date" value={rule?.start_date ?? ""} onChange={(event) => updateGeneral("start_date", event.target.value)} /></label>
      <label><span>Đến ngày</span><input type="date" value={rule?.end_date ?? ""} onChange={(event) => updateGeneral("end_date", event.target.value)} /></label>
      <label><span>Hạn phát hành hợp đồng</span><input type="date" value={rule?.issue_deadline ?? ""} onChange={(event) => updateGeneral("issue_deadline", event.target.value)} /></label>
      <div className="full-width pdt-statuses"><span>Trạng thái loại trừ</span>{statuses.map((status) => <label key={status}><input type="checkbox" checked={(rule?.excluded_statuses ?? []).includes(status)} onChange={(event) => updateGeneral("excluded_statuses", event.target.checked ? [...new Set([...(rule?.excluded_statuses ?? []), status])] : (rule?.excluded_statuses ?? []).filter((value: string) => value !== status))} />{status}</label>)}</div>
    </div>
    {unsupportedOnly ? <div className="contest-rule-fallback"><p>Chương trình này có thể lệ đặc thù, vui lòng sửa ở chế độ nâng cao.</p><button className="secondary" type="button" onClick={onUnsupportedRule}>Mở JSON nâng cao</button></div> : null}
    {rewardRules.map((item: any, index: number) => {
      const kind = dynamicRewardKind(item);
      const title = item.reward_name || item.prize_name || `Giải ${index + 1}`;
      const tiers = item.pdt_reward_tiers ?? item.thresholds ?? item.tiers ?? item.condition?.tiers ?? [];
      const amount = item.reward_amount ?? item.reward?.amount;
      return <article className={`contest-rule-reward-card dynamic-rule-card kind-${kind}`} key={item.id || index}>
        <div className="contest-rule-reward-head"><span>{dynamicRewardLabel(kind)}</span><strong>{title}</strong></div>
        {kind === "custom" ? <div className="contest-rule-fallback"><p>Chương trình này có thể lệ đặc thù, vui lòng sửa ở chế độ nâng cao.</p><button className="secondary" type="button" onClick={onUnsupportedRule}>Mở JSON nâng cao</button></div> : null}
        {kind === "pdt" ? <>
          <div className="pdt-reward-table-wrap"><table className="pdt-reward-table"><thead><tr><th>PĐT/HĐ từ</th><th>Thưởng SPC</th><th>Thưởng HĐ còn lại</th><th /></tr></thead><tbody>{tiers.map((tier: any, tierIndex: number) => <tr key={tierIndex}><td><input type="number" min="0" value={Number(tier.min_pdt ?? 0) / 1000000 || ""} onChange={(event) => updateReward(index, (reward) => ({ ...reward, pdt_reward_tiers: (reward.pdt_reward_tiers ?? []).map((row: any, rowIndex: number) => rowIndex === tierIndex ? { ...row, min_pdt: Number(event.target.value || 0) * 1000000 } : row) }))} /><span>trđ</span></td><td><input value={tier.spc_reward ?? ""} placeholder="VD: 8% hoặc 2800000" onChange={(event) => updateReward(index, (reward) => ({ ...reward, pdt_reward_tiers: (reward.pdt_reward_tiers ?? []).map((row: any, rowIndex: number) => rowIndex === tierIndex ? { ...row, spc_reward: event.target.value } : row) }))} /></td><td><input value={tier.other_reward ?? ""} placeholder="VD: 6% hoặc 2500000" onChange={(event) => updateReward(index, (reward) => ({ ...reward, pdt_reward_tiers: (reward.pdt_reward_tiers ?? []).map((row: any, rowIndex: number) => rowIndex === tierIndex ? { ...row, other_reward: event.target.value } : row) }))} /></td><td><button className="ghost" type="button" onClick={() => updateReward(index, (reward) => ({ ...reward, pdt_reward_tiers: (reward.pdt_reward_tiers ?? []).filter((_: any, rowIndex: number) => rowIndex !== tierIndex) }))}>Xóa dòng</button></td></tr>)}</tbody></table></div>
          <button className="secondary" type="button" onClick={() => updateReward(index, (reward) => ({ ...reward, pdt_reward_tiers: [...(reward.pdt_reward_tiers ?? []), { min_pdt: 0, spc_reward: "", other_reward: "" }] }))}>Thêm dòng thưởng</button>
          <div className="contest-rule-general-grid"><DynamicTextField label="Sản phẩm SPC" value={(item.spc_products ?? []).join(", ")} onChange={(value) => updateReward(index, (reward) => ({ ...reward, spc_products: value.split(",").map((part) => part.trim()).filter(Boolean) }))} /></div>
        </> : null}
        {kind === "contract" ? <div className="contest-rule-general-grid">
          <DynamicNumberField label="Số HĐ/mốc chọn" value={item.top_n ?? item.condition?.limit} onChange={(value) => updateReward(index, (reward) => reward.condition ? setNestedValue(setNestedValue(reward, ["condition", "limit"], value), ["top_n"], value) : setNestedValue(reward, ["top_n"], value))} />
          <DynamicNumberField label="IP/AFYP tối thiểu" value={item.min_policy_ip ?? item.condition?.policy_filters?.min_policy_ip} onChange={(value) => updateReward(index, (reward) => reward.condition?.policy_filters ? setNestedValue(reward, ["condition", "policy_filters", "min_policy_ip"], value) : setNestedValue(reward, ["min_policy_ip"], value))} suffix="đ" />
          <DynamicTextField label="Mốc đạt" value={item.condition_text || item.condition?.description || item.condition?.text} onChange={(value) => updateReward(index, (reward) => reward.condition ? setNestedValue(reward, ["condition", "description"], value) : setNestedValue(reward, ["condition_text"], value))} />
          <DynamicNumberField label="Thưởng/HĐ" value={amount} onChange={(value) => updateReward(index, (reward) => reward.reward ? setNestedValue(reward, ["reward", "amount"], value) : setNestedValue(reward, ["reward_amount"], value))} suffix="đ" />
        </div> : null}
        {kind === "tvv" ? <div className="contest-rule-general-grid">
          <DynamicTextField label="Điều kiện TVV" value={item.condition_text || item.condition?.description || item.condition?.text} onChange={(value) => updateReward(index, (reward) => reward.condition ? setNestedValue(reward, ["condition", "description"], value) : setNestedValue(reward, ["condition_text"], value))} />
          <DynamicNumberField label="Số HĐ tối thiểu" value={item.min_contract_count ?? item.condition?.min_contract_count ?? item.condition?.min_policy_count} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "min_contract_count"], value))} />
          <DynamicNumberField label="IP/AFYP tối thiểu" value={item.min_total_ip ?? item.min_total_afyp ?? item.condition?.min_total_ip ?? item.condition?.min_total_afyp} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "min_total_ip"], value))} suffix="đ" />
          <DynamicTextField label="Mốc đạt" value={item.tier_name ?? item.achieved_tier ?? item.condition?.tier_name} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "tier_name"], value))} />
          <DynamicNumberField label="Thưởng/TVV" value={amount} onChange={(value) => updateReward(index, (reward) => reward.reward ? setNestedValue(reward, ["reward", "amount"], value) : setNestedValue(reward, ["reward_amount"], value))} suffix="đ" />
        </div> : null}
        {kind === "group" ? <div className="contest-rule-general-grid">
          <DynamicNumberField label="Số TVV hoạt động" value={item.min_active_advisors ?? item.condition?.min_active_advisors ?? item.condition?.active_agent_definition?.min_valid_policy_count} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "min_active_advisors"], value))} />
          <DynamicNumberField label="Số HĐ đạt" value={item.min_contract_count ?? item.condition?.min_contract_count} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "min_contract_count"], value))} />
          <DynamicNumberField label="Tổng IP/AFYP" value={item.min_group_revenue ?? item.condition?.min_group_revenue ?? tiers?.[0]?.min_group_revenue} onChange={(value) => updateReward(index, (reward) => setNestedValue(reward, ["condition", "min_group_revenue"], value))} suffix="đ" />
          <DynamicTextField label="Mốc đạt" value={item.condition_text || item.condition?.description || item.condition?.text || tiers?.map((tier: any) => `${formatCompactVnd(tier.min_group_revenue ?? tier.min_revenue ?? 0)}: ${formatCompactVnd(tier.reward_per_active_agent ?? tier.reward_amount ?? 0)}`).join(", ")} onChange={(value) => updateReward(index, (reward) => reward.condition ? setNestedValue(reward, ["condition", "description"], value) : setNestedValue(reward, ["condition_text"], value))} />
          <DynamicNumberField label="Thưởng nhóm" value={amount ?? item.reward_per_group ?? item.reward?.amount ?? tiers?.[0]?.reward_amount ?? tiers?.[0]?.reward_per_active_agent} onChange={(value) => updateReward(index, (reward) => reward.reward ? setNestedValue(reward, ["reward", "amount"], value) : setNestedValue(reward, ["reward_amount"], value))} suffix="đ" />
        </div> : null}
        {kind === "gift" ? <div className="contest-rule-general-grid">
          <DynamicTextField label="Điều kiện nhận quà" value={item.condition_text || item.condition?.description || item.condition?.text} onChange={(value) => updateReward(index, (reward) => reward.condition ? setNestedValue(reward, ["condition", "description"], value) : setNestedValue(reward, ["condition_text"], value))} />
          <DynamicNumberField label="Số lượng quà" value={item.gift_quantity ?? item.quantity ?? item.reward?.quantity} onChange={(value) => updateReward(index, (reward) => reward.reward ? setNestedValue(reward, ["reward", "quantity"], value) : setNestedValue(reward, ["gift_quantity"], value))} />
          <DynamicNumberField label="Giá trị quà" value={item.gift_value ?? item.reward_value ?? item.reward?.value ?? amount} onChange={(value) => updateReward(index, (reward) => reward.reward ? setNestedValue(reward, ["reward", "value"], value) : setNestedValue(reward, ["gift_value"], value))} suffix="đ" />
          <DynamicTextField label="Đối tượng nhận thưởng" value={item.reward_recipient_type || item.recipient_type || item.recipient || item.condition?.recipient} onChange={(value) => updateReward(index, (reward) => ({ ...reward, reward_recipient_type: value }))} />
          <DynamicTextField label="Tab kết quả" value={item.result_tab || item.condition?.result_tab} onChange={(value) => updateReward(index, (reward) => ({ ...reward, result_tab: value }))} />
        </div> : null}
      </article>;
    })}
  </div>;
}

function CompetitionRuleModal({ program, month, onClose, onChanged, inline = false }: { program: any; month: string; onClose: () => void; onChanged: () => void; inline?: boolean }) {
  const initialRule = shouldPreferAiRuleStructure(program) ? (program.aiRule || program.ai_rule || {}) : (program.confirmedRule || program.confirmed_rule || program.aiRule || program.ai_rule || {});
  const [jsonText, setJsonText] = useState(JSON.stringify(initialRule, null, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAdvancedJsonOpen, setIsAdvancedJsonOpen] = useState(true);

  function parsedRule() {
    return JSON.parse(jsonText);
  }

  function validationMessage(rule: any) {
    if (!rule || typeof rule !== "object") return "Thể lệ chưa đúng định dạng.";
    if (!String(rule.program_name || "").trim()) return "Thiếu tên chương trình.";
    if (!String(rule.start_date || "").trim()) return "Thiếu ngày bắt đầu chương trình.";
    if (!String(rule.end_date || "").trim()) return "Thiếu ngày kết thúc chương trình.";
    if (!Array.isArray(rule.reward_rules)) return "Danh sách giải thưởng chưa hợp lệ.";
    for (const item of rule.reward_rules) {
      if (!String(item?.reward_name || item?.prize_name || "").trim()) return "Mỗi giải thưởng cần có tên.";
      const amount = item?.reward_amount ?? item?.reward?.amount;
      if (amount !== undefined && amount !== null && amount !== "" && !Number.isFinite(Number(amount))) return "Mức thưởng phải là số.";
    }
    return "";
  }

  function updateRule(mutator: (rule: any) => any) {
    try { setJsonText(JSON.stringify(mutator(parsedRule()), null, 2)); setMessage(""); }
    catch { setMessage("JSON nâng cao đang lỗi. Hãy kiểm tra và format lại trước khi sửa bằng form."); }
  }

  function updateReward(index: number, mutator: (reward: any) => any) {
    updateRule((rule) => ({ ...rule, reward_rules: (rule.reward_rules ?? []).map((item: any, itemIndex: number) => itemIndex === index ? mutator(item) : item) }));
  }

  async function confirmRule(shouldCalculate = false) {
    setBusy(true);
    setMessage("");
    try {
      const confirmedRule = parsedRule();
      const validationError = validationMessage(confirmedRule);
      if (validationError) throw new Error(validationError);
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
  const extractedRuleText = program.extractedText || program.extracted_text;
  const shouldOpenAdvancedJson = !hasEditableDynamicRules(preview);

  useEffect(() => {
    if (shouldOpenAdvancedJson) setIsAdvancedJsonOpen(true);
  }, [shouldOpenAdvancedJson]);

  function formatRuleJson() {
    try {
      const parsed = parsedRule();
      setJsonText(JSON.stringify(parsed, null, 2));
      setMessage("Đã chuẩn hóa JSON rule.");
    } catch {
      setMessage("Rule JSON chưa hợp lệ, vui lòng kiểm tra lại dấu phẩy, ngoặc hoặc dấu nháy.");
    }
  }

  function resetRuleJson() {
    setJsonText(JSON.stringify(initialRule, null, 2));
    setMessage("Đã khôi phục rule AI ban đầu.");
  }

  function addReward() {
    updateRule((rule) => ({ ...rule, reward_rules: [...(rule.reward_rules ?? []), { id: `reward-${Date.now()}`, reward_name: "Giải thưởng mới", target_type: "policy", reward_recipient_type: "Hợp đồng", reward_type: "reward_per_contract", eligible_products: Array.isArray(rule.eligible_products) ? [...rule.eligible_products] : [], reward_amount: 0, reward_formula: "", condition_text: "" }] }));
  }

  const content = (
    <>
        <div className="contract-modal-header">
          <div><h2>Kiểm tra rule AI</h2><p>{preview.program_name || program.programName || program.program_name}</p></div>
          <button className="contract-modal-close" type="button" onClick={onClose} aria-label="óng">×</button>
        </div>
        <div className="contract-modal-body contest-rule-content">
          <section className="contest-rule-editor">
            <div className="contest-rule-editor-head">
              <div>
                <h3>Chỉnh sửa thể lệ theo cấu trúc chương trình</h3>
                <p>Form bên dưới tự đổi theo từng loại giải. Rule đặc thù sẽ dùng JSON nâng cao để tránh sửa sai công thức.</p>
              </div>
            </div>
            <CompetitionRuleForm rule={preview} onUpdateRule={updateRule} onUnsupportedRule={() => setIsAdvancedJsonOpen(true)} />
            <details className="contest-rule-advanced" open={isAdvancedJsonOpen} onToggle={(event) => setIsAdvancedJsonOpen((event.target as HTMLDetailsElement).open)}>
              <summary>Dành cho kỹ thuật · Xem JSON nâng cao</summary>
              <div className="contest-rule-editor-body">
                <div className="contest-rule-editor-actions">
                  <button className="secondary" type="button" onClick={formatRuleJson}>Kiểm tra & format JSON</button>
                  <button className="ghost" type="button" onClick={resetRuleJson}>Khôi phục rule AI</button>
                </div>
                <textarea
                  className="contest-rule-textarea"
                  spellCheck={false}
                  value={jsonText}
                  onChange={(event) => {
                    setJsonText(event.target.value);
                    setMessage("");
                  }}
                />
              </div>
            </details>
          </section>
          {message && <p className="error-list">{message}</p>}
          <div className="contest-run-row">
            <button className="secondary" type="button" disabled={busy} onClick={() => confirmRule(false)}>{isPdtRewardTable(preview) ? "Lưu bảng thưởng" : "Xác nhận thể lệ"}</button>
            <button type="button" disabled={busy} onClick={() => confirmRule(true)}>Xác nhận & tính thưởng</button>
          </div>
        </div>
    </>
  );

  if (inline) {
    return <section className="admin-rule-inline">{content}</section>;
  }

  return (
    <div className="contract-modal-backdrop">
      <div className="contract-modal contest-detail-modal" role="dialog" aria-modal="true">
        {content}
    </div>
    </div>
  );
}

function ruleMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return amount > 0 ? formatCompactVnd(amount) : "-";
}

function ruleListText(values: unknown, fallback = "-") {
  if (Array.isArray(values)) return values.filter(Boolean).join(", ") || fallback;
  return String(values ?? "").trim() || fallback;
}

function CompetitionRuleVisualPreview({ rule, extractedText }: { rule: any; extractedText?: string | null }) {
  const rewardRules = Array.isArray(rule?.reward_rules) ? rule.reward_rules : [];
  const excludedStatuses = ruleListText(rule?.excluded_statuses);
  const eligibleProducts = ruleListText(rule?.eligible_products);
  return (
    <div className="contest-rule-visual">
      <section className="contest-rule-summary">
        <div><span>Thời gian thi đua</span><strong>{formatDateVi(rule?.start_date)} - {formatDateVi(rule?.end_date)}</strong></div>
        <div><span>Phát hành đến</span><strong>{formatDateVi(rule?.issue_deadline) || "-"}</strong></div>
        <div><span>Đối tượng</span><strong>{targetTypesText(rule?.target_types)}</strong></div>
        <div><span>Độ tin cậy AI</span><strong>{Number(rule?.confidence ?? 0) ? `${Math.round(Number(rule.confidence) * 100)}%` : "-"}</strong></div>
      </section>
      <section className="contest-rule-flow">
        <h3>Luồng xét thưởng</h3>
        <div className="contest-rule-steps">
          <div><b>1</b><span>Lọc hợp đồng trong thời gian thi đua</span></div>
          <div><b>2</b><span>Loại trạng thái: {excludedStatuses}</span></div>
          <div><b>3</b><span>Kiểm tra IP/HĐ tối thiểu: {ruleMoney(rule?.min_policy_ip)}</span></div>
          <div><b>4</b><span>Áp điều kiện sản phẩm: {eligibleProducts}</span></div>
          <div><b>5</b><span>Tính thưởng theo từng giải bên dưới</span></div>
        </div>
      </section>
      <section className="contest-rule-rewards">
        <h3>Các giải thưởng AI trích xuất</h3>
        {rewardRules.length === 0 ? <p className="empty-state">AI chưa trích xuất được giải thưởng nào.</p> : rewardRules.map((item: any, index: number) => (
          <article className="contest-rule-reward-card" key={item.id || index}>
            <div className="contest-rule-reward-head">
              <span>Giải {index + 1}</span>
              <strong>{item.reward_name || item.prize_name || "Giải thưởng"}</strong>
              <em>{ruleMoney(item.reward_amount ?? item.reward?.amount)}</em>
            </div>
            <div className="contest-rule-reward-grid">
              <span><b>Loại giải</b>{dynamicRewardLabel(dynamicRewardKind(item))}</span>
              <span><b>Đối tượng nhận thưởng</b>{item.reward_recipient_type || item.recipient_type || item.recipient || item.condition?.recipient || "-"}</span>
              <span><b>Tab kết quả</b>{item.result_tab || item.condition?.result_tab || "-"}</span>
              <span><b>Điều kiện</b>{item.condition_text || item.condition?.description || item.condition?.text || item.calculation_logic || item.reward_formula || "-"}</span>
              <span><b>Thưởng / mốc</b>{ruleMoney(item.reward_amount ?? item.reward?.amount) !== "-" ? ruleMoney(item.reward_amount ?? item.reward?.amount) : ruleListText((item.pdt_reward_tiers ?? item.thresholds ?? item.tiers ?? item.condition?.tiers)?.map((tier: any) => tier.reward_name || tier.name || tier.label || ruleMoney(tier.reward_amount ?? tier.reward_per_active_agent)), "-")}</span>
            </div>
          </article>
        ))}
      </section>
      {extractedText ? (
        <details className="contest-rule-source">
          <summary>Nội dung OCR từ poster</summary>
          <p>{extractedText}</p>
        </details>
      ) : null}
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
  const [hiddenColumnsByTable, setHiddenColumnsByTable] = useState<Record<CompetitionResultTarget, string[]>>({
    contracts: [],
    advisors: [],
    groups: []
  });
  const [message, setMessage] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedGroupContracts, setSelectedGroupContracts] = useState<{ title: string; rows: any[] } | null>(null);

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
  const qualifiedRewardContracts = dedupeRewardContracts(detail?.contractRewardResults ?? detail?.rewardContracts ?? []);
  const tvvRewardResults = detail?.tvvRewardResults ?? detail?.rewardAdvisors ?? [];
  const groupRewardResults = detail?.groupRewardResults ?? detail?.rewardGroups ?? [];
  const groupContracts = detail?.groupContracts ?? [];
  const groupRoster = detail?.groupRoster ?? [];
  const eligibleContracts = qualifiedRewardContracts;
  const calculatedGroupRows = normalizeCompetitionRewardGroups(groupRewardResults);
  const groupThreshold = competitionMissingGroupThreshold(program);
  const groupRows = [
    ...calculatedGroupRows,
    ...Array.from(new Set<string>(groupRoster.map((row: any) => groupNameForRecord(row)).filter(Boolean)))
      .filter((group) => !calculatedGroupRows.some((row) => normalizeViText(row.group) === normalizeViText(group)))
      .map((group) => ({
        group,
        totalIP: 0,
        totalAFYP: 0,
        activeAdvisorCount: 0,
        contractCount: 0,
        milestone: "Chưa đạt",
        rewardPerAdvisor: 0,
        totalReward: 0,
        note: groupThreshold > 0 ? `Chưa đạt - Thiếu ${formatFullMoney(groupThreshold)}` : "Chưa có hợp đồng trong thời gian thi đua"
      }))
  ].sort((a, b) => Number(b.totalReward > 0) - Number(a.totalReward > 0) || b.totalIP - a.totalIP);
  const flowStatus = competitionFlowMessage(program, detail, month, isCalculating);
  const achievedGroupRows = groupRows.filter((row) => Number(row.totalReward ?? 0) > 0);
  const resultTargets = competitionResultTargets(program);
  const visibleTabs: Array<{ id: "overview" | CompetitionResultTarget; label: string; icon: LucideIcon }> = [
    { id: "overview", label: "Tổng quan", icon: LayoutGrid },
    ...(resultTargets.includes("groups") ? [{ id: "groups" as const, label: "Nhóm đạt", icon: Users }] : []),
    ...(resultTargets.includes("advisors") ? [{ id: "advisors" as const, label: "TVV đạt", icon: UserRound }] : []),
    ...(resultTargets.includes("contracts") ? [{ id: "contracts" as const, label: "HĐ đạt", icon: ClipboardList }] : [])
  ];
  const hasGroupTarget = resultTargets.includes("groups");
  const hasAdvisorTarget = resultTargets.includes("advisors");
  const hasContractTarget = resultTargets.includes("contracts");
  const activeResultTable = tab === "groups" || tab === "advisors" || tab === "contracts" ? tab : null;
  const activeHiddenColumns = activeResultTable ? hiddenColumnsByTable[activeResultTable] : [];

  function hideColumn(table: CompetitionResultTarget, columnKey: string) {
    console.log("COLUMN CLICK:", columnKey);
    setHiddenColumnsByTable((previous) => {
      const hiddenColumns = previous[table];
      console.log("HIDDEN BEFORE:", hiddenColumns);
      const nextHiddenColumns = hiddenColumns.includes(columnKey) ? hiddenColumns : [...hiddenColumns, columnKey];
      console.log("HIDDEN AFTER:", nextHiddenColumns);
      return { ...previous, [table]: nextHiddenColumns };
    });
  }

  function showAllColumns(table: CompetitionResultTarget) {
    setHiddenColumnsByTable((previous) => ({ ...previous, [table]: [] }));
  }

  useEffect(() => {
    if (tab !== "overview" && !resultTargets.includes(tab)) setTab("overview");
  }, [resultTargets.join("|"), tab]);

  useEffect(() => {
    if (!detail) return;
    console.log("[CTTD reward scopes]", { program: program?.programName, contractRewardResults: qualifiedRewardContracts.length, tvvRewardResults: tvvRewardResults.length, groupRewardResults: groupRows.length, contractRewardTotal: qualifiedRewardContracts.reduce((sum, row) => sum + Number(row.reward_amount ?? row.rewardAmount ?? 0), 0), tvvRewardTotal: tvvRewardResults.reduce((sum: number, row: any) => sum + Number(row.reward_amount ?? row.rewardAmount ?? 0), 0), groupRewardTotal: groupRows.reduce((sum, row) => sum + Number(row.totalReward ?? 0), 0) });
  }, [detail]);

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
        <button className="competition-mobile-back" type="button" onClick={onClose}>Danh sách</button>
      </div>
        <div className="contest-detail-tabs" role="tablist">
          {visibleTabs.map(({ id, label, icon: TabIcon }) => {
            return <button key={id} className={tab === id ? "active" : ""} type="button" onClick={() => setTab(id)}><TabIcon size={16} />{label}</button>;
          })}
          {activeResultTable && activeHiddenColumns.length > 0 && (
            <button className="contest-show-columns-button" type="button" onClick={() => showAllColumns(activeResultTable)}>{"Hi\u1ec7n"}</button>
          )}
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
                    {hasGroupTarget && <CompetitionKpiCard label="Tổng nhóm đạt" value={formatNumber(achievedGroupRows.length)} icon={Users} />}
                    {hasAdvisorTarget && <CompetitionKpiCard label="Tổng TVV đạt" value={formatNumber(tvvRewardResults.filter((row: any) => Number(row.reward_amount ?? row.rewardAmount ?? 0) > 0).length)} icon={UserRound} />}
                    {hasContractTarget && <CompetitionKpiCard label="Tổng HĐ đạt" value={formatNumber(qualifiedRewardContracts.length)} icon={ClipboardList} />}
                    <CompetitionKpiCard label="Tổng IP đạt" value={formatCompactVnd(qualifiedRewardContracts.reduce((sum, row) => sum + Number(row.ip ?? 0), 0))} icon={Coins} />
                    <CompetitionKpiCard label="Tổng AFYP đạt" value={formatCompactVnd(qualifiedRewardContracts.reduce((sum, row) => sum + Number(row.afyp ?? 0), 0))} icon={TrendingUp} />
                    <CompetitionKpiCard label="Tổng thưởng" value={formatVnd(program.totalReward ?? 0)} icon={Trophy} highlight />
                  </div>
                  <div className="contest-note-grid">
                    <div className="contest-note-box"><span>i</span><p><strong>Ghi chú</strong>Hợp đồng chỉ tính thưởng khi thỏa điều kiện: IP/HĐ ≥ 15 triệu, trong thời gian thi đua và không thuộc trạng thái loại trừ.</p></div>
                    <div className="contest-legend-box"><strong>Trạng thái hợp đồng được tính:</strong>{COMPETITION_STATUS_LEGEND.map(([label, color]) => <span key={label}><i style={{ backgroundColor: color }} />{label}</span>)}</div>
                  </div>
                </>
              )}
              {tab === "groups" && hasGroupTarget && <CompetitionGroupsTable rows={groupRows} groupContracts={groupContracts} onOpenGroup={(title, rows) => setSelectedGroupContracts({ title, rows })} hiddenColumns={hiddenColumnsByTable.groups} onHideColumn={(key) => hideColumn("groups", key)} onShowAllColumns={() => showAllColumns("groups")} />}
              {tab === "advisors" && hasAdvisorTarget && <CompetitionAdvisorsTable rows={tvvRewardResults.filter((row: any) => Number(row.reward_amount ?? row.rewardAmount ?? 0) > 0)} hiddenColumns={hiddenColumnsByTable.advisors} onHideColumn={(key) => hideColumn("advisors", key)} onShowAllColumns={() => showAllColumns("advisors")} />}
              {tab === "contracts" && hasContractTarget && <CompetitionContractsTable rows={eligibleContracts} hiddenColumns={hiddenColumnsByTable.contracts} onHideColumn={(key) => hideColumn("contracts", key)} onShowAllColumns={() => showAllColumns("contracts")} />}
            </>
          )}
        </div>
        {selectedGroupContracts && <ContractDetailModal type="group" title={selectedGroupContracts.title} rows={selectedGroupContracts.rows} onClose={() => setSelectedGroupContracts(null)} />}
    </section>
  );
}

type HideableColumn = { key: string; header: string; render: (row: any, index: number) => ReactNode };

function CompetitionHideableTable({ table, rows, columns, hiddenColumns, onHideColumn, onShowAllColumns, className = "" }: { table: CompetitionResultTarget; rows: any[]; columns: HideableColumn[]; hiddenColumns: string[]; onHideColumn: (key: string) => void; onShowAllColumns: () => void; className?: string }) {
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.key));
  useEffect(() => { console.log("VISIBLE COLUMNS:", table, visibleColumns.map((column) => column.key)); }, [table, hiddenColumns, columns]);
  return <>
    {hiddenColumns.length > 0 && <div className="contest-column-actions"><button className="ghost" type="button" onClick={onShowAllColumns}>Hiện</button></div>}
    <div className={`table-wrap ${className}`}><table><thead><tr>{visibleColumns.map((column) => <th key={column.key} onClick={() => onHideColumn(column.key)}>{column.header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || row.group || `${table}-${index}`}>{visibleColumns.map((column) => <td key={column.key} data-label={column.header}>{column.render(row, index)}</td>)}</tr>)}</tbody></table></div>
  </>;
}

function CompetitionGroupsTable({ rows, groupContracts, onOpenGroup, hiddenColumns, onHideColumn, onShowAllColumns }: { rows: any[]; groupContracts: any[]; onOpenGroup: (title: string, rows: any[]) => void; hiddenColumns: string[]; onHideColumn: (key: string) => void; onShowAllColumns: () => void }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có nhóm đạt mốc thưởng.</p>;
  const groupLabel = (row: any) => repairMojibake(row.group);
  const openGroupContracts = (row: any) => onOpenGroup(groupLabel(row), groupContracts.filter((contract) => normalizeViText(groupNameForRecord(contract)) === normalizeViText(row.group) || normalizeViText(groupNameForRecord(contract)) === normalizeViText(groupLabel(row))));
  return (
    <>
      <CompetitionHideableTable table="groups" rows={rows} hiddenColumns={hiddenColumns} onHideColumn={onHideColumn} onShowAllColumns={onShowAllColumns} className="desktop-table contest-mini-table contest-wide-table" columns={[
        { key: "index", header: "STT", render: (_, index) => index + 1 }, { key: "group", header: "Nhóm", render: (row) => <button className="contest-group-link" type="button" onClick={() => openGroupContracts(row)}>{row.group}</button> }, { key: "total_ip", header: "Tổng IP", render: (row) => formatFullMoney(row.totalIP ?? 0) }, { key: "total_afyp", header: "Tổng AFYP", render: (row) => formatFullMoney(row.totalAFYP ?? 0) }, { key: "active_advisors", header: "Số TVV hoạt động", render: (row) => formatNumber(row.activeAdvisorCount ?? row.active_tvv_count ?? 0) }, { key: "contract_count", header: "Số HĐ đạt", render: (row) => formatNumber(row.contractCount ?? 0) }, { key: "milestone", header: "Mốc đạt", render: (row) => row.milestone }, { key: "reward_per_advisor", header: "Thưởng/TVV", render: (row) => formatFullMoney(row.reward_per_tvv ?? row.rewardPerAdvisor ?? 0) }, { key: "total_reward", header: "Tổng thưởng nhóm", render: (row) => formatFullMoney(row.group_reward_amount ?? row.totalReward ?? 0) }, { key: "note", header: "Ghi chú", render: (row) => <CompetitionGroupNote note={row.reward_note ?? row.note} /> }
      ]} />
      <div className="contest-detail-card-list">
        {rows.map((row, index) => (
          <article className="contest-result-card clickable" key={`${row.group || index}-mobile`} onClick={() => openGroupContracts(row)}>
            <div className="contest-result-card-head"><strong>{index + 1}. {row.group}</strong><span>{formatCompactVnd(row.group_reward_amount ?? row.totalReward ?? 0)}</span></div>
            <div className="mobile-info-grid">
              <span><b>Tổng IP</b>{formatCompactVnd(row.totalIP ?? 0)}</span>
              <span><b>Tổng AFYP</b>{formatCompactVnd(row.totalAFYP ?? 0)}</span>
              <span><b>TVV hoạt động</b>{formatNumber(row.activeAdvisorCount ?? 0)}</span>
              <span><b>HĐ đạt</b>{formatNumber(row.contractCount ?? 0)}</span>
              <span><b>Mốc đạt</b>{row.milestone}</span>
              <span><b>Thưởng/TVV</b>{formatCompactVnd(row.reward_per_tvv ?? row.rewardPerAdvisor ?? 0)}</span>
            </div>
            <small><CompetitionGroupNote note={row.reward_note ?? row.note} /></small>
          </article>
        ))}
      </div>
    </>
  );
}

function CompetitionGroupNote({ note }: { note: unknown }) {
  const text = String(note ?? "-").trim() || "-";
  const missingAmount = /(Thiếu|Còn thiếu)\s+([\d.,]+)/i.exec(text);
  if (!missingAmount?.[2]) return <>{text}</>;
  const amountStart = (missingAmount.index ?? 0) + missingAmount[0].length - missingAmount[2].length;
  const amountEnd = amountStart + missingAmount[2].length;
  return <span className="contest-group-note">{text.slice(0, amountStart)}<strong>{missingAmount[2]}</strong>{text.slice(amountEnd)}</span>;
}

function CompetitionAdvisorsTable({ rows, hiddenColumns, onHideColumn, onShowAllColumns }: { rows: any[]; hiddenColumns: string[]; onHideColumn: (key: string) => void; onShowAllColumns: () => void }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có TVV đạt thưởng.</p>;
  return (
    <>
      <CompetitionHideableTable table="advisors" rows={rows} hiddenColumns={hiddenColumns} onHideColumn={onHideColumn} onShowAllColumns={onShowAllColumns} className="desktop-table contest-mini-table" columns={[
        { key: "index", header: "STT", render: (_, index) => index + 1 }, { key: "advisor", header: "TVV", render: (row) => row.tvv }, { key: "group", header: "Nhóm", render: (row) => row.team }, { key: "contract_count", header: "Số HĐ đạt", render: (row) => row.eligible_contract_count }, { key: "total_ip", header: "Tổng IP", render: (row) => formatCompactVnd(row.total_ip ?? 0) }, { key: "total_afyp", header: "Tổng AFYP", render: (row) => formatCompactVnd(row.total_afyp ?? 0) }, { key: "reward_amount", header: "Thưởng đạt", render: (row) => formatCompactVnd(row.reward_amount ?? 0) }, { key: "note", header: "Đạt giải nào", render: (row) => row.note }
      ]} />
      <div className="contest-detail-card-list">
        {rows.map((row, index) => (
          <article className="contest-result-card" key={`${row.id || index}-advisor-mobile`}>
            <div className="contest-result-card-head"><strong>{index + 1}. {row.tvv}</strong><span>{formatCompactVnd(row.reward_amount ?? 0)}</span></div>
            <div className="mobile-info-grid">
              <span><b>Nhóm</b>{row.team || "-"}</span>
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

function CompetitionContractsTable({ rows, hiddenColumns, onHideColumn, onShowAllColumns }: { rows: any[]; hiddenColumns: string[]; onHideColumn: (key: string) => void; onShowAllColumns: () => void }) {
  if (rows.length === 0) return <p className="empty-state">Chưa có hợp đồng đạt điu kiện.</p>;
  const sortedRows = [...rows].sort((a, b) =>
    String(b.collection_date ?? "").localeCompare(String(a.collection_date ?? ""))
    || String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
  );
  return (
    <>
      <CompetitionHideableTable table="contracts" rows={sortedRows} hiddenColumns={hiddenColumns} onHideColumn={onHideColumn} onShowAllColumns={onShowAllColumns} className="desktop-table contest-mini-table contest-wide-table" columns={[
        { key: "index", header: "STT", render: (_, index) => index + 1 }, { key: "collection_date", header: "Ngày thu", render: (row) => formatDateVi(row.collection_date) }, { key: "policy_no", header: "Số GYC", render: (row) => row.gyc_no }, { key: "group", header: "Nhóm", render: (row) => row.team }, { key: "advisor", header: "TVV", render: (row) => row.tvv }, { key: "policy_owner", header: "BMBH", render: (row) => row.customer_name }, { key: "insured_name", header: "NĐBH", render: (row) => row.insured_name || "-" }, { key: "status", header: "Trạng thái hợp đồng", render: (row) => <span className="contract-status-pill" style={{ color: getStatusColor(row.status), borderColor: getStatusColor(row.status) }}>{row.status || "-"}</span> }, { key: "ip", header: "IP", render: (row) => formatFullMoney(row.ip ?? 0) }, { key: "afyp", header: "AFYP", render: (row) => formatFullMoney(row.afyp ?? 0) }, { key: "reward_name", header: "Giải thưởng", render: (row) => row.reward_name }, { key: "reward_amount", header: "Tiền thưởng", render: (row) => formatFullMoney(row.reward_amount ?? 0) }
      ]} />
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
    <DataTable className="desktop-table contest-mini-table" headers={["Số GYC", "Số HĐ", "TVV", "Nhóm", "Khách hàng", "IP", "AFYP", "Trạng thái", "Lý do bị loại"]}>
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

function AdminCompetitionPrograms({ programs, selectedProgramId, onOpenRule, onToggleHidden, onDelete }: { programs: CompetitionProgramView[]; selectedProgramId?: string; onOpenRule: (program: CompetitionProgramView) => void; onToggleHidden: (program: CompetitionProgramView) => void; onDelete: (program: CompetitionProgramView) => void }) {
  if (programs.length === 0) {
    return <div className="admin-contest-empty"><span>+</span><strong>Chưa có chương trình thi đua nào</strong><small>Bấm “+ Thêm CTTĐ” để tạo chương trình thi đua.</small></div>;
  }

  return (
    <div className="admin-contest-list">
      <DataTable className="desktop-table contest-mini-table" headers={["Tên chương trình", "Trạng thái", "Thời gian", "Phát hành đến", "Hiển thị", "AI", "Thao tác"]}>
        {programs.map((program) => {
          const waiting = isWaitingRuleConfirmation(program);
          return (
            <tr key={program.id} className={`clickable ${selectedProgramId === program.id ? "selected" : ""}`} onClick={() => onOpenRule(program)}>
              <td><strong>{program.programName}</strong></td>
              <td><span className={`contest-status ${competitionStatusClass(program.status)}`}>{competitionStatusText(program.status)}</span></td>
              <td>{formatDateVi(program.startDate)} - {formatDateVi(program.endDate)}</td>
              <td>{formatDateVi(program.issueDeadline) || "-"}</td>
              <td>{program.isHidden ? "Đang ẩn" : "Đang hiện"}</td>
              <td>{program.aiRule ? "Đã có rule AI" : "-"}</td>
              <td>
                <div className="admin-contest-actions">
                  <button className={waiting ? "small-button" : "small-button secondary"} type="button" onClick={(event) => { event.stopPropagation(); onOpenRule(program); }}>
                    {waiting ? "Kiểm tra & xác nhận" : "Xem thể lệ"}
                  </button>
                  <button className="small-button secondary" type="button" onClick={(event) => { event.stopPropagation(); onToggleHidden(program); }}>
                    {program.isHidden ? "Hiện" : "Ẩn"}
                  </button>
                  <button className="small-button danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete(program); }}>
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <div className="contest-detail-card-list">
        {programs.map((program) => {
          const waiting = isWaitingRuleConfirmation(program);
          return (
            <article className="contest-result-card" key={`${program.id}-admin-mobile`} onClick={() => onOpenRule(program)}>
              <div className="contest-result-card-head"><strong>{program.programName}</strong><span>{competitionStatusText(program.status)}</span></div>
              <div className="mobile-info-grid">
                <span><b>Thời gian</b>{formatDateVi(program.startDate)} - {formatDateVi(program.endDate)}</span>
                <span><b>Phát hành đến</b>{formatDateVi(program.issueDeadline) || "-"}</span>
                <span><b>AI</b>{program.aiRule ? "Đã có rule AI" : "-"}</span>
              </div>
              <div className="admin-contest-actions">
                <button className={waiting ? "" : "secondary"} type="button" onClick={(event) => { event.stopPropagation(); onOpenRule(program); }}>{waiting ? "Kiểm tra & xác nhận" : "Xem thể lệ"}</button>
                <button className="secondary" type="button" onClick={(event) => { event.stopPropagation(); onToggleHidden(program); }}>{program.isHidden ? "Hiện CTTĐ" : "Ẩn CTTĐ"}</button>
                <button className="danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete(program); }}>Xóa CTTĐ</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function UploadPanel({ month, uploader, onUploaded }: { month: string; uploader: CurrentUploader | null; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [competitionPrograms, setCompetitionPrograms] = useState<CompetitionProgramView[]>([]);
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

  async function loadCompetitionPrograms() {
    const response = await fetch("/api/competition?includeHidden=1", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) {
      setCompetitionPrograms(payload.programs ?? []);
    }
  }

  async function toggleCompetitionHidden(program: CompetitionProgramView) {
    const nextHidden = !program.isHidden;
    const response = await fetch("/api/competition", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: program.id, is_hidden: nextHidden })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = String(payload.error || "");
      if (!text.includes("is_hidden")) {
        setResult({ error: payload.error || "Không cập nhật được trạng thái ẩn/hiện CTTĐ." });
        return;
      }
    }
    const hiddenIds = hiddenCompetitionProgramIds();
    if (nextHidden) hiddenIds.add(program.id);
    else hiddenIds.delete(program.id);
    saveHiddenCompetitionProgramIds(hiddenIds);
    await loadCompetitionPrograms();
    onUploaded();
  }

  async function deleteCompetitionProgram(program: CompetitionProgramView) {
    const confirmed = window.confirm(`Xóa sạch CTTĐ "${program.programName}"?`);
    if (!confirmed) return;
    const response = await fetch(`/api/competition?id=${encodeURIComponent(program.id)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResult({ error: payload.error || "Không xóa được CTTĐ." });
      return;
    }
    const hiddenIds = hiddenCompetitionProgramIds();
    hiddenIds.delete(program.id);
    saveHiddenCompetitionProgramIds(hiddenIds);
    setRuleProgram((current: any) => current?.id === program.id ? null : current);
    await loadCompetitionPrograms();
    onUploaded();
  }

  useEffect(() => {
    loadHistory();
    loadCompetitionPrograms();
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
      <div className="panel admin-contest-panel">
        <div className="panel-header">
          <h2>Quản trị Chương trình thi đua</h2>
          <button className="contest-add-button" type="button" onClick={() => setCompetitionUploadOpen(true)}>+ Thêm CTTĐ</button>
        </div>
        <AdminCompetitionPrograms
          programs={competitionPrograms}
          selectedProgramId={ruleProgram?.id}
          onOpenRule={(program) => setRuleProgram((current: any) => current?.id === program.id ? null : program)}
          onToggleHidden={toggleCompetitionHidden}
          onDelete={deleteCompetitionProgram}
        />
        {ruleProgram && (
          <CompetitionRuleModal
            inline
            program={ruleProgram}
            month={month}
            onClose={() => setRuleProgram(null)}
            onChanged={() => { setRuleProgram(null); loadCompetitionPrograms(); onUploaded(); }}
          />
        )}
      </div>
      <div className="panel admin-revenue-panel">
        <div className="panel-header"><h2>Upload dữ liệu doanh thu theo tháng</h2><span>{uploader?.name || "-"}</span></div>
        <div className="month-button-grid admin-month-tabs">
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
        <div className="form-row admin-upload-row">
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
      {competitionUploadOpen && <CompetitionUploadModal onClose={() => setCompetitionUploadOpen(false)} onAnalyzed={(program) => { setCompetitionUploadOpen(false); setRuleProgram(program); loadCompetitionPrograms(); onUploaded(); }} />}
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
    <div className="panel star-upload-panel admin-star-panel">
      <div className="panel-header"><h2>Upload dữ liệu Sao Việt</h2><span>Năm {year}</span></div>
      <div className="star-upload-grid">
        {uploadBlock("kpi04", "File KPI04 đã chốt", "Dữ liệu đã chốt từ T12/2025 đến tháng liền trước. Sao Việt tính theo cột FYP.")}
        {uploadBlock("bc02", "File BC02 tháng hiện tại", "Dữ liệu tạm tháng hiện tại. Tự loại trừ hồ sơ hoàn/hủy theo trạng thái.")}
      </div>
    </div>
  );
}

function UploadHistory({ rows }: { rows: any[] }) {
  return (
    <div className="panel admin-history-panel">
      <div className="panel-header"><h2>Lịch sử upload</h2><span>{rows.length} lần gần nhất</span></div>
      <DataTable className="desktop-table" headers={["Thời gian upload", "Người upload", "Tháng dữ liệu", "Tên file", "Số dòng", "Kết quả"]}>
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
              <span><b>Người upload</b>{row.uploaded_by_name || row.uploaded_by || "-"}</span>
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

function ContractDetailModal({ type, title, rows, onClose }: { type: "group" | "agent" | "ads"; title: string; rows: any[]; onClose: () => void }) {
  const sortedRows = sortContracts(rows);
  const countedRows = sortedRows.filter((row) => isCountedContract(row.policy_status));
  const xlsxRows = sortedRows.map((row) => ({
    "Ngày thu": formatDateVi(row.paid_date) || "",
    "Số GYC": safeText(row.application_no),
    "Nhóm": safeText(groupNameForRecord(row)),
    "TVV": safeText(row.agent_name),
    "BMBH": safeText(row.policy_owner),
    "NĐBH": safeText(row.insured_name),
    "Trạng thái hợp đồng": contractStatusLabel(row.policy_status),
    "IP": Number(row.ip) || 0,
    "AFYP": Number(row.afyp) || 0
  }));
  const xlsxFileName = `chi-tiet-${type}-${normalizeViText(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hop-dong"}.xlsx`;
  const afyp = countedRows.reduce((sum, row) => sum + (Number(row.afyp) || 0), 0);
  const contractCount = new Set(countedRows.map((row, index) => String(row.contract_no ?? "").trim() || `row-${index}`)).size;
  const agentCount = new Set(countedRows.map((row) => String(row.agent_name ?? "").trim()).filter(Boolean)).size;
  const groupNames = Array.from(new Set(sortedRows.map((row) => groupNameForRecord(row)).filter(Boolean)));
  const isAgentDetail = type === "agent";
  const titlePrefix = type === "ads" ? "Chi tiết ADS" : isAgentDetail ? "Chi tiết TVV" : "Chi tiết nhóm";
  const groupSummary = groupNames.length > 3 ? `Số nhóm: ${formatNumber(groupNames.length)}` : `Nhóm: ${groupNames.join(", ") || "-"}`;
  const emptyMessage = isAgentDetail
    ? "Không có hợp đồng thuộc TVV này trong bộ lọc hiện tại."
    : "Không có hợp đồng thuộc nhóm này trong bộ lọc hiện tại.";

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
              <span>Số HĐ: <b>{formatNumber(contractCount)}</b></span>
              {isAgentDetail ? <span>{groupSummary}</span> : <span>Số TVV: <b>{formatNumber(agentCount)}</b></span>}
            </div>
          </div>
          <button className="contract-modal-close" type="button" onClick={onClose} aria-label={`óng ${titlePrefix.toLowerCase()}`}>×</button>
        </div>
        <div className="contract-modal-body">
          <div className="contract-modal-list-header">
            <h3>Danh sách hợp đồng</h3>
            <XlsxDownloadButton rows={xlsxRows} fileName={xlsxFileName} sheetName="Danh sách hợp đồng" />
          </div>
          {sortedRows.length === 0 ? (
            <p className="empty-state">{emptyMessage}</p>
          ) : (
            <>
              <DataTable className="desktop-table contract-modal-table" headers={["Ngày thu", "Nhóm", "TVV", "BMBH", "NĐBH", "Trạng thái hợp đồng", "IP", "AFYP"]}>
                {sortedRows.map((row, index) => (
                  <tr key={`${row.contract_no || "contract"}-${index}`}>
                    <td>{formatDateVi(row.paid_date) || "-"}</td>
                    <td>{safeText(groupNameForRecord(row))}</td>
                    <td>{safeText(row.agent_name)}</td>
                    <td>{safeText(row.policy_owner)}</td>
                    <td>{safeText(row.insured_name)}</td>
                    <td><span className="contract-status-text" style={{ color: getStatusColor(row.policy_status) }}>{contractStatusLabel(row.policy_status)}</span></td>
                    <td>{formatFullMoney(Number(row.ip) || 0)}</td>
                    <td>{formatFullMoney(Number(row.afyp) || 0)}</td>
                  </tr>
                ))}
              </DataTable>
              <div className="mobile-card-list contract-mobile-list">
                {sortedRows.map((row, index) => (
                  <article className="mobile-contract-card" key={`${row.contract_no || "contract"}-modal-${index}`}>
                    <div className="mobile-contract-date">
                      <CalendarDays size={18} />
                      <strong>Ngày thu: {formatDateVi(row.paid_date) || "-"}</strong>
                      <span className="status-badge" style={{ color: getStatusColor(row.policy_status), borderColor: getStatusColor(row.policy_status) }}>{contractStatusLabel(row.policy_status)}</span>
                    </div>
                    <div className="mobile-info-grid">
                      <span><b>Nhóm</b>{safeText(groupNameForRecord(row))}</span>
                      <span><b>TVV</b>{safeText(row.agent_name)}</span>
                      <span><b>BMBH</b>{safeText(row.policy_owner)}</span>
                      <span><b>NĐBH</b>{safeText(row.insured_name)}</span>
                    </div>
                    <div className="mobile-metric-grid compact">
                      <MobileMetric label="IP" value={formatFullMoney(Number(row.ip) || 0)} />
                      <MobileMetric label="AFYP" value={formatFullMoney(Number(row.afyp) || 0)} />
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

function ContractDetails({ title, rows, showStatus = false, emptyMessage }: { title: string; rows: any[]; showStatus?: boolean; emptyMessage?: string }) {
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
    <div className="panel contract-details-panel">
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
      <DataTable className="desktop-table contract-details-table" headers={[headers[0], "Số GYC", ...headers.slice(1)]} colWidths={showStatus ? ["110px", "130px", "15%", "15%", "17%", "17%", "190px", "110px", "110px"] : undefined}>
        {visibleRows.map((row, index) => (
          <tr key={`${row.contract_no}-${index}`}>
            <td>{formatDateVi(row.paid_date)}{isNewUploadContract(row) && <span className="new-contract-badge">Má»›i</span>}</td><td>{row.application_no || "-"}</td><td>{row.group_name}</td><td>{row.agent_name}</td><td>{row.policy_owner}</td><td>{row.insured_name}</td>{showStatus && <td><span className="contract-status-text" style={{ color: getStatusColor(row.policy_status) }}>{contractStatusLabel(row.policy_status)}</span></td>}<td>{formatFullMoney(row.ip)}</td><td>{formatFullMoney(row.afyp)}</td>
          </tr>
        ))}
      </DataTable>
      {visibleRows.length === 0 && <p className="empty-state">{emptyMessage ?? "Không có hồ sơ."}</p>}
      <div className="mobile-card-list contract-mobile-list">
        {visibleRows.map((row, index) => (
          <article className="mobile-contract-card" key={`${row.contract_no}-mobile-${index}`}>
            <div className="mobile-contract-date">
              <CalendarDays size={18} />
              <strong>Ngày {formatDateVi(row.paid_date)}</strong>
              {isNewUploadContract(row) && <span className="new-contract-badge">Má»›i</span>}
              {showStatus && <span className="status-badge" style={{ color: getStatusColor(row.policy_status), borderColor: getStatusColor(row.policy_status) }}>{contractStatusLabel(row.policy_status)}</span>}
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

function DataTable({ headers, children, className = "", colWidths, hiddenColumns = [], onHeaderClick }: { headers: string[]; children: React.ReactNode; className?: string; colWidths?: string[]; hiddenColumns?: number[]; onHeaderClick?: (index: number) => void }) {
  const [localHiddenColumns, setLocalHiddenColumns] = useState<number[]>([]);
  const activeHiddenColumns = onHeaderClick ? hiddenColumns : localHiddenColumns;
  const hidden = new Set(activeHiddenColumns);
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    let cellIndex = 0;
    const cells = Children.map((row.props as { children?: React.ReactNode }).children, (cell) => {
      if (!isValidElement(cell)) return cell;
      const label = headers[cellIndex] ?? "";
      cellIndex += 1;
      const isHidden = hidden.has(cellIndex - 1);
      return cloneElement(cell as React.ReactElement<{ "data-label"?: string; style?: React.CSSProperties; className?: string }>, {
        "data-label": label,
        className: `${(cell.props as any).className ?? ""}${isHidden ? " is-hidden-column" : ""}`,
        style: isHidden ? { ...(cell.props as any).style, display: "none" } : (cell.props as any).style
      });
    });
    return cloneElement(row as React.ReactElement<{ children?: React.ReactNode }>, { children: cells });
  });

  return (
    <>{localHiddenColumns.length > 0 && !onHeaderClick && <div className="contest-column-actions"><button className="ghost" type="button" onClick={() => setLocalHiddenColumns([])}>Hiện</button></div>}<div className={`table-wrap ${className}${hidden.size > 0 ? " has-hidden-columns" : ""}`}>
      <table>
        {colWidths && hidden.size === 0 && (
          <colgroup>
            {colWidths.map((width, index) => <col key={`${width}-${index}`} style={{ width }} />)}
          </colgroup>
        )}
        <thead><tr>{headers.map((header, index) => hidden.has(index) ? null : <th key={header} onClick={() => onHeaderClick ? onHeaderClick(index) : setLocalHiddenColumns((current) => current.includes(index) ? current : [...current, index])} title="Bấm để ẩn cột">{header}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div></>
  );
}
