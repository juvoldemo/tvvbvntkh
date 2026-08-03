"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { toPng } from "html-to-image";
import { BarChart3, Bell, BookOpen, CalendarDays, Calculator, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Coins, Crown, Download, Eye, EyeOff, FileText, Filter, FolderOpen, GripVertical, Gift, Home, Hourglass, Info, Layers3, LoaderCircle, LockKeyhole, Medal, RotateCcw, Search, Share2, ShieldCheck, Sparkles, Target, Trash2, Trophy, UserPlus, UserRound, Users, WalletCards, X, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";
import { isPreTeamLeaderPosition } from "@/lib/team-scope";
import GuestInvitationHomeCard from "@/app/GuestInvitationHomeCard";

type Tab = "overview" | "contracts" | "calculator" | "recruitment" | "contests" | "leaderboard" | "illustration" | "profile" | "archive" | "about" | "ado_targets" | "ado_accounts";
type PeriodMode = "month" | "quarter" | "year";
type DraftContract = { id: string; productName: string; productCode?: string; premium: number; expectedPaidDate: string; expectedIssueDate?: string; status?: string };
type AdminEvent = { id: string; title: string; content: string; event_date: string | null; created_at: string };

const fallbackAdvisor = {
  key: "D1021A1YNG__Lê Thị Mỹ Châu",
  code: "D1021A1YNG",
  name: "Lê Thị Mỹ Châu",
  ban: "",
  group: "",
  ads: ""
};

const emptyEstimate = {
  rewardByProgram: [],
  ongoingPrograms: [],
  endedPrograms: [],
  policyRewardPrograms: [],
  eligibleProgramCount: 0,
  totalEstimatedReward: 0,
  rewardByDraftContract: []
};

function isLocalAnalyticsHost() {
  return typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

const POLICY_MONTH_TIERS = [
  { minimum: 12_000_000, rate: 0.1 },
  { minimum: 24_000_000, rate: 0.15 },
  { minimum: 50_000_000, rate: 0.18 }
];
const POLICY_QUARTER_TIERS = [
  { minimum: 24_000_000, rate: 0.08 },
  { minimum: 60_000_000, rate: 0.1 },
  { minimum: 90_000_000, rate: 0.13 },
  { minimum: 150_000_000, rate: 0.15 },
  { minimum: 250_000_000, rate: 0.18 },
  { minimum: 350_000_000, rate: 0.2 },
  { minimum: 500_000_000, rate: 0.25 }
];
const ACQUISITION_COMMISSION_BREAKDOWN = [
  { label: "Năm 1", rate: 0.3 },
  { label: "Năm 2", rate: 0.15 },
  { label: "Năm 3", rate: 0.075 },
  { label: "Năm 4", rate: 0.04 }
];
const ACQUISITION_COMMISSION_TOTAL_RATE = ACQUISITION_COMMISSION_BREAKDOWN.reduce((sum, item) => sum + item.rate, 0);

function acquisitionCommissionLabel() {
  return ACQUISITION_COMMISSION_BREAKDOWN.map((item) => `${item.label} ${formatRate(item.rate)}`).join(" + ");
}

function acquisitionCommissionReward(premium: number) {
  return premium * ACQUISITION_COMMISSION_TOTAL_RATE;
}

function AcquisitionCommissionBreakdown({ total }: { total: number }) {
  const premium = ACQUISITION_COMMISSION_TOTAL_RATE > 0 ? total / ACQUISITION_COMMISSION_TOTAL_RATE : 0;
  return <div className="commission-year-breakdown">
    {ACQUISITION_COMMISSION_BREAKDOWN.map((item, index) => <div className={`commission-year-row${index === 0 ? " primary-year" : ""}`} key={item.label}>
      <small>{item.label} ({formatRate(item.rate)})</small>
      <em>+{formatVnd(premium * item.rate)}</em>
    </div>)}
    <div className="commission-included-total"><small>Tổng tính vào thu nhập</small><strong>{formatVnd(premium * ACQUISITION_COMMISSION_BREAKDOWN[0].rate)}</strong></div>
  </div>;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateVi(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatActivitySchedule(activity: any) {
  const date = formatDateVi(activity?.scheduled_date || activity?.scheduled_at);
  const time = String(activity?.scheduled_time || "").slice(0, 5);
  return time ? `${time} · ${date}` : date;
}

const TEAM_ACTIVITY_OPTIONS = [
  "Họp định kỳ nhóm",
  "Hỗ trợ tư vấn viên chốt hợp đồng",
  "Trao đổi 1:1 với TVV",
  "Đào tạo nghiệp vụ",
  "Khác"
] as const;

function normalizeCompetitionGiftLabel(value: unknown) {
  const original = String(value || "").trim();
  const normalized = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
  if (normalized.includes("toshiba")) return "Quạt đứng Toshiba";
  if (normalized.includes("xiaomi")) return "Máy tính bảng Xiaomi";
  if (normalized.includes("samsung")) return "Máy tính bảng Samsung";
  if (normalized.includes("xe") && (normalized.includes("may") || normalized.includes("?"))) return "Xe máy điện";
  return original;
}

function moneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

function parseMoneyInput(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function parseMillionMoneyInput(value: string) {
  const amount = parseMoneyInput(value);
  return amount > 0 && amount < 1_000 ? amount * 1_000_000 : amount;
}

function millionInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function toMillionTarget(value: unknown) {
  return Math.round((Number(value) || 0) / 1_000_000);
}

const TEAM_TARGET_MONTHLY_THRESHOLDS = [
  { min: 400_000_000, rates: [0.3, 0.28, 0.26, 0.1] },
  { min: 200_000_000, rates: [0.26, 0.22, 0.2, 0.1] },
  { min: 100_000_000, rates: [0.22, 0.2, 0.18, 0.1] },
  { min: 50_000_000, rates: [0.2, 0.18, 0.14, 0.1] },
  { min: 0, rates: [0, 0.16, 0.14, 0.1] }
];

function teamTargetHdcColumn(activeAdvisors: number) {
  if (activeAdvisors >= 5) return 0;
  if (activeAdvisors >= 3) return 1;
  if (activeAdvisors === 2) return 2;
  return 3;
}

function calculateTeamTargetPtkdReward(targetIp: number, activeAdvisors: number) {
  const threshold = TEAM_TARGET_MONTHLY_THRESHOLDS.find((item) => targetIp >= item.min) ?? TEAM_TARGET_MONTHLY_THRESHOLDS.at(-1)!;
  const rate = threshold.rates[teamTargetHdcColumn(activeAdvisors)] ?? 0;
  const targetFyc = targetIp * 0.3;
  return Math.round(targetFyc * rate);
}

function formatCompactVnd(value: unknown) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  return formatVnd(amount);
}

function formatRate(value: unknown) {
  const rate = Number(value) || 0;
  return `${Math.round(rate * 100)}%`;
}

function statusTone(status: unknown) {
  const normalized = normalizeStatusText(status);
  if (normalized === "co hieu luc") return { label: "Đã phát hành", tone: "green", icon: CheckCircle2 };
  if (["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(normalized)) return { label: "Hết hiệu lực", tone: "red", icon: XCircle };
  if (["cho dgrr", "dang dgrr", "cho kiem tra ycbh"].includes(normalized)) return { label: "Đang thẩm định", tone: "blue", icon: Search };
  return { label: status ? String(status) : "Chờ xử lý", tone: "orange", icon: Hourglass };
}

function monthLabel(month: string) {
  return `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
}

function quarterLabel(month: string) {
  const quarter = Math.ceil(Number(month.slice(5, 7)) / 3);
  return `Quý ${quarter}/${month.slice(0, 4)}`;
}

function recordInPeriod(row: any, month: string, period: PeriodMode) {
  const paidDate = String(row.paid_date || row.collection_date || "");
  if (!paidDate) return false;
  const selectedYear = month.slice(0, 4);
  if (paidDate.slice(0, 4) !== selectedYear) return false;
  if (period === "year") return true;
  if (period === "month") return paidDate.slice(0, 7) === month.slice(0, 7);
  const selectedQuarter = Math.ceil(Number(month.slice(5, 7)) / 3);
  const recordQuarter = Math.ceil(Number(paidDate.slice(5, 7)) / 3);
  return recordQuarter === selectedQuarter;
}

function contractStatusGroup(row: any): "issued" | "refunded" | "pending" {
  const normalized = normalizeStatusText(row.policy_status);
  if (normalized === "co hieu luc") return "issued";
  if (
    normalized.includes("hoan phi") ||
    normalized.includes("het hieu luc") ||
    normalized.includes("huy") ||
    normalized.includes("tu choi") ||
    normalized.includes("tri hoan")
  ) return "refunded";
  return "pending";
}

function contractIpValue(row: any) {
  return contractStatusGroup(row) === "refunded" ? 0 : Number(row.ip || 0);
}

function calculatorProgramOrder(item: any) {
  const id = String(item.programId ?? "").toLowerCase();
  const name = String(item.programName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  if (id === "acquisition-commission" || name.includes("hoa hong khai thac")) return 1;
  if (id === "policy-quarterly" || name.includes("thuong quy tvv")) return 2;
  if (id === "policy-monthly" || name.includes("thuong nang suat thang")) return 3;
  if (id === "policy-new-advisor-monthly" || name.includes("thuong thang tvv moi")) return 4;
  if (id === "policy-new-advisor-stage" || name.includes("thuong chang tvv moi")) return 5;
  return 10;
}

function monthOptionsUntilCurrent() {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonthNo = now.getMonth() + 1;
  return Array.from({ length: currentMonthNo }, (_, index) => {
    const monthNo = index + 1;
    const value = `${year}-${String(monthNo).padStart(2, "0")}`;
    return { value, label: monthLabel(value) };
  }).reverse();
}

function quarterOptionsUntilCurrent() {
  const now = new Date();
  const year = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  return Array.from({ length: currentQuarter }, (_, index) => {
    const quarter = index + 1;
    const value = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}`;
    return { value, label: quarterLabel(value) };
  }).reverse();
}

function yearOptionsUntilCurrent() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 2026 + 1 }, (_, index) => {
    const year = currentYear - index;
    return { value: `${year}-01`, label: `Năm ${year}` };
  });
}

function shortText(value: unknown, maxLength = 86) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

async function fetchJsonWithRetry(url: string, signal: AbortSignal, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store", signal });
      if (!response.ok) throw new Error(`${url} trả về lỗi ${response.status}`);
      return await response.json();
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 700));
      }
    }
  }
  throw lastError;
}

async function playNotificationTone() {
  if (typeof window === "undefined") return false;
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return false;

  try {
    const audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") await audioContext.resume();
    if (audioContext.state !== "running") {
      await audioContext.close().catch(() => undefined);
      return false;
    }
    const now = audioContext.currentTime;
    [0, 0.18].forEach((offset) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1046.5, now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(1568, now + offset + 0.08);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.16);
    });
    window.setTimeout(() => audioContext.close().catch(() => undefined), 600);
    return true;
  } catch {
    return false;
  }
}

export default function TvvMobilePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authenticatedAdvisorCode, setAuthenticatedAdvisorCode] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [illustrationLoaded, setIllustrationLoaded] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [contractMonth, setContractMonth] = useState(currentMonth());
  const [policyMonth, setPolicyMonth] = useState(currentMonth());
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [data, setData] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>({ agents: [], groups: [] });
  const [advisorKey, setAdvisorKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [teamOverviewReady, setTeamOverviewReady] = useState(true);
  const [leaderboardReady, setLeaderboardReady] = useState(false);
  const [drafts, setDrafts] = useState<DraftContract[]>([]);
  const [productName, setProductName] = useState("An Thịnh Phúc Niên");
  const [premiumText, setPremiumText] = useState("35.000.000");
  const [illustrationPremiumText, setIllustrationPremiumText] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimate, setEstimate] = useState<any>(null);
  const completedRewardRequestKeyRef = useRef("");
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const latestMonthResolvedRef = useRef(false);
  const notificationSoundPlayedRef = useRef(false);
  const analyticsSessionRef = useRef("");
  const analyticsHiddenAtRef = useRef(0);
  const [analyticsGeneration, setAnalyticsGeneration] = useState(0);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 12 });
  const [readEventIds, setReadEventIds] = useState<string[]>([]);
  const [readEventsReady, setReadEventsReady] = useState(false);
  const [notificationView, setNotificationView] = useState<"unread" | "read">("unread");
  const [openedNotificationIds, setOpenedNotificationIds] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [teamContractData, setTeamContractData] = useState<any>(null);
  const [teamRewards, setTeamRewards] = useState<any>(null);
  const [teamTarget, setTeamTarget] = useState<any>(null);
  const [targetRegistrationMonth, setTargetRegistrationMonth] = useState(currentMonth());
  const [targetRegistrationClosed, setTargetRegistrationClosed] = useState(false);
  const [tvvTarget, setTvvTarget] = useState<any>(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetReturnToTeamGoal, setTargetReturnToTeamGoal] = useState(false);
  const [teamGoalDetailSignal, setTeamGoalDetailSignal] = useState(0);
  const [activeRole, setActiveRole] = useState<"advisor" | "board_leader">("advisor");
  const [boardData, setBoardData] = useState<any>(null);
  const [boardContractData, setBoardContractData] = useState<any>(null);
  const [adoData, setAdoData] = useState<any>(null);
  const [adoContractData, setAdoContractData] = useState<any>(null);
  const [adoRefreshGeneration, setAdoRefreshGeneration] = useState(0);
  const isBoardMode = activeRole === "board_leader" && Boolean(userProfile?.has_board_leader_role);
  const isAdoMode = userProfile?.dashboard_role === "ado" || userProfile?.dashboard_role === "boss";
  const isBossMode = userProfile?.dashboard_role === "boss";

  useEffect(() => {
    if (isLocalAnalyticsHost()) {
      analyticsSessionRef.current = "";
      return;
    }
    if (!signedIn || !userProfile?.advisor_code) {
      analyticsSessionRef.current = "";
      return;
    }
    let sessionId = analyticsSessionRef.current;
    const isNewSession = !sessionId;
    if (isNewSession) sessionId = crypto.randomUUID();
    analyticsSessionRef.current = sessionId;
    const post = (eventName: string, extra: Record<string, unknown> = {}) => fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName, sessionId, ...extra }) }).catch(() => undefined);
    if (isNewSession) void post("session_start", { tabName: tab });
    const clickHandler = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest("button, a");
      if (!button || !button.closest(".tvv-app")) return;
      const actionName = button.getAttribute("aria-label") || button.textContent || "Tương tác";
      void post("action", { tabName: tab, actionName });
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [signedIn, userProfile?.advisor_code, tab, analyticsGeneration]);

  useEffect(() => {
    if (isLocalAnalyticsHost()) return;
    if (!signedIn || !userProfile?.advisor_code || !analyticsSessionRef.current) return;
    const startedAt = Date.now();
    const sessionId = analyticsSessionRef.current;
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName: "tab_view", sessionId, tabName: tab }) }).catch(() => undefined);
    return () => {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName: "tab_duration", sessionId, tabName: tab, durationSeconds }) }).catch(() => undefined);
    };
  }, [signedIn, userProfile?.advisor_code, tab, analyticsGeneration]);

  useEffect(() => {
    const trackVisibility = () => {
      if (document.visibilityState === "hidden") {
        analyticsHiddenAtRef.current = Date.now();
        return;
      }
      if (analyticsHiddenAtRef.current && Date.now() - analyticsHiddenAtRef.current >= 5 * 60 * 1000) {
        analyticsSessionRef.current = "";
        setAnalyticsGeneration((current) => current + 1);
      }
      analyticsHiddenAtRef.current = 0;
    };
    document.addEventListener("visibilitychange", trackVisibility);
    return () => document.removeEventListener("visibilitychange", trackVisibility);
  }, []);

  useEffect(() => {
    if (isLocalAnalyticsHost()) return;
    if (!signedIn || !userProfile?.advisor_code) return;
    const receiveIllustrationEvent = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "bvnt-analytics") return;
      const sessionId = analyticsSessionRef.current;
      if (!sessionId) return;
      let actionName = "";
      if (event.data.eventName === "summary_export") {
        const source = event.data.source === "riders" ? "sản phẩm bổ trợ" : "minh họa chính";
        actionName = `Xuất tóm tắt - ${source}`;
      } else if (event.data.eventName === "illustration_premium") {
        const annualPremium = Math.min(1_000_000_000_000, Math.max(0, Math.round(Number(event.data.annualPremium) || 0)));
        if (!annualPremium) return;
        actionName = `Minh họa mức phí ${formatVnd(annualPremium)}/năm`;
      }
      if (!actionName) return;
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName: "action", sessionId, tabName: "illustration", actionName }) }).catch(() => undefined);
    };
    window.addEventListener("message", receiveIllustrationEvent);
    return () => window.removeEventListener("message", receiveIllustrationEvent);
  }, [signedIn, userProfile?.advisor_code, analyticsGeneration]);

  useEffect(() => {
    if (tab === "illustration") setIllustrationLoaded(true);
  }, [tab]);
  const monthOptions = useMemo(() => monthOptionsUntilCurrent(), []);

  useEffect(() => {
    fetch("/api/user/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setSignedIn(Boolean(payload.authenticated));
        setAuthenticatedAdvisorCode(String(payload.advisorCode || "").trim().toUpperCase());
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setProfileReady(false);
      setUserProfile(null);
      return;
    }
    setProfileReady(false);
    fetch("/api/user/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setUserProfile(payload.profile ?? null))
      .catch(() => setUserProfile(null))
      .finally(() => setProfileReady(true));
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !isBoardMode) {
      setBoardData(null);
      return;
    }
    const controller = new AbortController();
    fetchJsonWithRetry(`/api/board-dashboard?month=${month}`, controller.signal)
      .then(setBoardData)
      .catch(() => setBoardData(null));
    return () => controller.abort();
  }, [isBoardMode, month, signedIn]);

  useEffect(() => {
    if (!signedIn || !isAdoMode) {
      setAdoData(null);
      return;
    }
    const controller = new AbortController();
    setTeamOverviewReady(false);
    fetchJsonWithRetry(`/api/ado-dashboard?month=${month}`, controller.signal)
      .then(setAdoData)
      .catch(() => setAdoData(null))
      .finally(() => setTeamOverviewReady(true));
    return () => controller.abort();
  }, [adoRefreshGeneration, isAdoMode, month, signedIn]);

  useEffect(() => {
    if (!signedIn || !isAdoMode) return;
    let refreshTimer: number | undefined;
    const refresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => setAdoRefreshGeneration((current) => current + 1), 120);
    };
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const localRecruitment = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("recruitment-pool-updates") : null;
    if (localRecruitment) localRecruitment.onmessage = refresh;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return () => {
        if (refreshTimer) window.clearTimeout(refreshTimer);
        window.removeEventListener("focus", onFocus);
        localRecruitment?.close();
      };
    }
    const liveClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const managementChannel = liveClient
      .channel("ado-management-live")
      .on("broadcast", { event: "changed" }, (event: any) => {
        if (!event?.payload?.month || event.payload.month === month) refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_target_registrations" }, refresh)
      .subscribe();
    const recruitmentChannel = liveClient
      .channel("recruitment-pool-live")
      .on("broadcast", { event: "changed" }, refresh)
      .subscribe();
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", onFocus);
      localRecruitment?.close();
      void liveClient.removeChannel(managementChannel);
      void liveClient.removeChannel(recruitmentChannel);
    };
  }, [isAdoMode, month, signedIn]);

  useEffect(() => {
    if (!signedIn || userProfile?.dashboard_role !== "team_leader") {
      setTeamData(null);
      setTeamRewards(null);
      setTeamOverviewReady(true);
      return;
    }
    const controller = new AbortController();
    setTeamOverviewReady(false);
    Promise.all([
      fetchJsonWithRetry(`/api/team-dashboard?month=${month}`, controller.signal),
      fetchJsonWithRetry(`/api/team-leader-rewards?month=${month}`, controller.signal)
    ]).then(([teamPayload, rewardPayload]) => {
      setTeamData(teamPayload);
      setTeamRewards(rewardPayload);
    }).catch(() => {
      setTeamData(null);
      setTeamRewards(null);
    }).finally(() => {
      setTeamOverviewReady(true);
    });
    return () => controller.abort();
  }, [month, signedIn, userProfile?.dashboard_role]);

  useEffect(() => {
    if (!signedIn || !profileReady || userProfile?.dashboard_role !== "advisor") {
      setTvvTarget(null);
      return;
    }
    fetch(`/api/tvv-target-registration?month=${targetRegistrationMonth}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { registration: null })
      .then((payload) => setTvvTarget(payload.registration ?? null))
      .catch(() => setTvvTarget(null));
  }, [profileReady, signedIn, targetRegistrationMonth, userProfile?.dashboard_role]);

  useEffect(() => {
    if (!signedIn || userProfile?.dashboard_role !== "team_leader") {
      setTeamTarget(null);
      return;
    }
    fetch(`/api/team-target-registration?month=${targetRegistrationMonth}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { registration: null })
      .then((payload) => setTeamTarget(payload.registration ?? null))
      .catch(() => setTeamTarget(null));
  }, [signedIn, targetRegistrationMonth, userProfile?.dashboard_role]);

  useEffect(() => {
    const targetRole = userProfile?.dashboard_role === "team_leader" || userProfile?.dashboard_role === "advisor";
    if (!signedIn || !targetRole) {
      setTargetRegistrationMonth(currentMonth());
      setTargetRegistrationClosed(false);
      return;
    }
    let active = true;
    const loadCycle = () => fetch("/api/target-registration-cycle", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const activeMonth = String(payload?.cycle?.activeMonth || "").slice(0, 7);
        if (active && activeMonth) {
          setTargetRegistrationMonth(activeMonth);
          setTargetRegistrationClosed(Boolean(payload?.cycle?.activeMonthSaved));
        }
      })
      .catch(() => undefined);
    const onFocus = () => { void loadCycle(); };
    void loadCycle();
    const timer = window.setInterval(loadCycle, 15_000);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [signedIn, userProfile?.dashboard_role]);

  useEffect(() => {
    if (!userProfile?.advisor_code) {
      setReadEventsReady(false);
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(`bvnt.readEvents.${userProfile.advisor_code}`) || "[]");
      setReadEventIds(Array.isArray(stored) ? stored.map(String) : []);
    } catch {
      setReadEventIds([]);
    } finally {
      setReadEventsReady(true);
    }
  }, [userProfile?.advisor_code]);

  useEffect(() => {
    let active = true;
    const loadEvents = () => fetch("/api/events", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { events: [] })
      .then((payload) => { if (active) setAdminEvents(payload.events ?? []); })
      .catch(() => { if (active) setAdminEvents([]); });
    void loadEvents();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadEvents();
    }, 10000);
    const refreshVisible = () => { if (document.visibilityState === "visible") void loadEvents(); };
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const positionPanel = () => {
      const rect = notificationButtonRef.current?.getBoundingClientRect();
      if (rect) setNotificationPosition({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
    };
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!notificationPanelRef.current?.contains(target) && !notificationButtonRef.current?.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!signedIn || !profileReady || isAdoMode) {
      if (isAdoMode) {
        setData(null);
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    fetchJsonWithRetry(`/api/dashboard?month=${month}`, controller.signal)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        const latestMonth = payload?.availableMonths?.[0];
        if (!latestMonthResolvedRef.current) {
          latestMonthResolvedRef.current = true;
          if (latestMonth && latestMonth !== "2099-01" && latestMonth <= currentMonth() && latestMonth !== month) {
            setMonth(latestMonth);
            setContractMonth(latestMonth);
            setPolicyMonth(latestMonth);
          }
        }
        const first = payload?.agents?.[0];
        setAdvisorKey((current) => current || (first ? `${first.agentCode}__${first.agentName}` : ""));
      })
      .catch(() => {
        if (cancelled) return;
        setData((current: any) => current);
        setEstimate((current: any) => current ?? emptyEstimate);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAdoMode, month, profileReady, signedIn]);

  useEffect(() => {
    if (!signedIn || tab !== "contracts" || isAdoMode) return;
    let cancelled = false;
    const controller = new AbortController();
    fetchJsonWithRetry(`/api/dashboard?month=${contractMonth}`, controller.signal)
      .then((payload) => {
        if (!cancelled) setContractData(payload);
      })
      .catch(() => {
        // Keep the last successful contract period visible during a temporary failure.
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contractMonth, isAdoMode, signedIn, tab]);

  useEffect(() => {
    if (!signedIn || tab !== "contracts" || userProfile?.dashboard_role !== "team_leader") {
      setTeamContractData(null);
      return;
    }
    const controller = new AbortController();
    fetchJsonWithRetry(`/api/team-dashboard?month=${contractMonth}`, controller.signal)
      .then(setTeamContractData)
      .catch(() => setTeamContractData(null));
    return () => controller.abort();
  }, [contractMonth, signedIn, tab, userProfile?.dashboard_role]);

  useEffect(() => {
    if (!signedIn || tab !== "contracts" || !isBoardMode) {
      setBoardContractData(null);
      return;
    }
    const controller = new AbortController();
    fetchJsonWithRetry(`/api/board-dashboard?month=${contractMonth}`, controller.signal)
      .then(setBoardContractData)
      .catch(() => setBoardContractData(null));
    return () => controller.abort();
  }, [contractMonth, isBoardMode, signedIn, tab]);

  useEffect(() => {
    if (!signedIn || tab !== "contracts" || !isAdoMode) {
      setAdoContractData(null);
      return;
    }
    const controller = new AbortController();
    fetchJsonWithRetry(`/api/ado-dashboard?month=${contractMonth}`, controller.signal)
      .then(setAdoContractData)
      .catch(() => setAdoContractData(null));
    return () => controller.abort();
  }, [contractMonth, isAdoMode, signedIn, tab]);

  useEffect(() => {
    const code = authenticatedAdvisorCode || userProfile?.advisor_code;
    if (!signedIn) {
      setLeaderboardReady(false);
      return;
    }
    if (isAdoMode) {
      setLeaderboard({ agents: [], groups: [] });
      setLeaderboardReady(true);
      return;
    }
    if (!code) {
      setLeaderboardReady(true);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLeaderboardReady(false);
    const advisorCode = encodeURIComponent(code);
    fetchJsonWithRetry(`/api/tvv-leaderboard?month=${month}&advisorCode=${advisorCode}`, controller.signal)
      .then((payload) => {
        if (!cancelled) setLeaderboard(payload);
      })
      .catch(() => {
        // Preserve the last successful ranking during a temporary network failure.
      })
      .finally(() => {
        if (!cancelled) setLeaderboardReady(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authenticatedAdvisorCode, isAdoMode, month, signedIn, userProfile?.advisor_code]);

  useEffect(() => {
    if (!showSplash || !authReady) return;
    if (!signedIn) {
      setShowSplash(false);
      return;
    }
    if (profileReady && !loading && teamOverviewReady && leaderboardReady) {
      setShowSplash(false);
    }
  }, [authReady, leaderboardReady, loading, profileReady, showSplash, signedIn, teamOverviewReady]);

  const advisorOptions = useMemo(() => (data?.agents ?? []).map((agent: any) => ({
    key: `${agent.agentCode || ""}__${agent.agentName || ""}`,
    code: agent.agentCode || "",
    name: agent.agentName || "TVV",
    ban: agent.banName || "",
    group: agent.groupName || "",
    ads: agent.adsName || ""
  })), [data]);

  const profileAdvisor = userProfile ? { key: `${userProfile.advisor_code}__${userProfile.full_name}`, code: userProfile.advisor_code, name: userProfile.full_name, ban: "", group: "", ads: "" } : null;
  const advisor = advisorOptions.find((item: any) => item.key === advisorKey) ?? advisorOptions[0] ?? profileAdvisor ?? fallbackAdvisor;
  const currentAdvisorRank = useMemo(() => {
    if (leaderboard?.currentAdvisorRank) return leaderboard.currentAdvisorRank;
    const advisorCode = String(advisor?.code ?? "").trim().toUpperCase();
    const advisorName = String(advisor?.name ?? "").trim().toLocaleLowerCase("vi");
    return (leaderboard?.agents ?? []).find((row: any) =>
      (advisorCode && String(row.agentCode ?? "").trim().toUpperCase() === advisorCode)
      || (!advisorCode && String(row.agentName ?? "").trim().toLocaleLowerCase("vi") === advisorName)
    )?.rank ?? null;
  }, [advisor?.code, advisor?.name, leaderboard?.agents, leaderboard?.currentAdvisorRank]);
  const advisorIpPeriods = useMemo(() => {
    const rows = data?.agentIpPeriods ?? [];
    return rows.find((row: any) => (advisor?.code && row.agentCode === advisor.code) || row.agentName === advisor?.name)
      ?? { monthIp: 0, quarterIp: 0, yearIp: 0 };
  }, [advisor, data?.agentIpPeriods]);
  const allContracts = useMemo(() => data?.statusContracts ?? data?.contracts ?? [], [data]);
  const myContracts = useMemo(() => {
    if (!advisor || !allContracts.length) return [];
    return allContracts.filter((row: any) => ((advisor.code && row.agent_code === advisor.code) || (!advisor.code && row.agent_name === advisor.name)) && recordInPeriod(row, month, "month"));
  }, [advisor, allContracts, month]);
  const contractAllContracts = useMemo(() => periodMode === "month"
    ? contractData?.statusContracts ?? contractData?.contracts ?? []
    : contractData?.yearStatusContracts ?? contractData?.yearContracts ?? [], [contractData, periodMode]);
  const selectedPeriodContracts = useMemo(() => {
    if (isAdoMode) {
      const adoContracts = periodMode === "month"
        ? adoContractData?.contracts ?? []
        : adoContractData?.yearContracts ?? [];
      return adoContracts.filter((row: any) => recordInPeriod(row, contractMonth, periodMode));
    }
    if (isBoardMode) {
      const boardContracts = periodMode === "month"
        ? boardContractData?.contracts ?? []
        : boardContractData?.yearContracts ?? [];
      return boardContracts.filter((row: any) => recordInPeriod(row, contractMonth, periodMode));
    }
    if (userProfile?.dashboard_role === "team_leader") {
      const teamContracts = periodMode === "month"
        ? teamContractData?.contracts ?? []
        : teamContractData?.yearContracts ?? [];
      return teamContracts.filter((row: any) => recordInPeriod(row, contractMonth, periodMode));
    }
    if (!advisor || !contractAllContracts.length) return [];
    return contractAllContracts.filter((row: any) =>
      ((advisor.code && row.agent_code === advisor.code) || (!advisor.code && row.agent_name === advisor.name))
      && recordInPeriod(row, contractMonth, periodMode)
    );
  }, [adoContractData, advisor, boardContractData, contractAllContracts, contractMonth, isAdoMode, isBoardMode, periodMode, teamContractData, userProfile?.dashboard_role]);
  const productOptions = useMemo(() => {
    const names = new Set(myContracts.map((row: any) => row.product_name || row.raw_data?.product || row.raw_data?.["Sản phẩm chính"]).filter(Boolean));
    ["An Thịnh Phúc Niên", "An Tâm Hoạch Định"].forEach((name) => names.add(name));
    return [...names] as string[];
  }, [myContracts]);

  const rewardAdvisorCode = String(advisor?.code ?? "");
  const rewardAdvisorName = String(advisor?.name ?? "");
  const rewardAdvisorBan = String(advisor?.ban ?? "");
  const rewardAdvisorGroup = String(advisor?.group ?? "");
  const rewardAdvisorAds = String(advisor?.ads ?? "");
  const rewardCalculationMonth = drafts.at(-1)?.expectedPaidDate?.slice(0, 7) || policyMonth;
  const rewardRequestKey = useMemo(() => JSON.stringify({
    month: rewardCalculationMonth,
    advisor: {
      code: rewardAdvisorCode,
      name: rewardAdvisorName,
      ban: rewardAdvisorBan,
      group: rewardAdvisorGroup,
      ads: rewardAdvisorAds
    },
    draftContracts: drafts
  }), [
    drafts,
    rewardAdvisorAds,
    rewardAdvisorBan,
    rewardAdvisorCode,
    rewardAdvisorGroup,
    rewardAdvisorName,
    rewardCalculationMonth
  ]);

  useEffect(() => {
    if (!signedIn || isAdoMode || (!rewardAdvisorCode && !rewardAdvisorName)) return;
    if (completedRewardRequestKeyRef.current === rewardRequestKey) return;
    const controller = new AbortController();
    fetch("/api/tvv-reward-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: rewardRequestKey
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Reward estimate API ${response.status}`);
        return response.json();
      })
      .then((responsePayload) => {
        if (controller.signal.aborted) return;
        completedRewardRequestKeyRef.current = rewardRequestKey;
        setEstimate(responsePayload);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setEstimate((current: any) => current ?? emptyEstimate);
      });
    return () => controller.abort();
  }, [isAdoMode, rewardAdvisorCode, rewardAdvisorName, rewardRequestKey, signedIn]);

  const stats = useMemo(() => {
    const total = myContracts.length;
    const issued = myContracts.filter((row: any) => normalizeStatusText(row.policy_status) === "co hieu luc").length;
    const invalid = myContracts.filter((row: any) => ["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(normalizeStatusText(row.policy_status))).length;
    return { total, issued, pending: Math.max(total - issued - invalid, 0), invalid };
  }, [myContracts]);
  const unreadNotifications = useMemo(() => adminEvents.filter((item) => !readEventIds.includes(item.id)), [adminEvents, readEventIds]);
  const unreadNotificationKey = unreadNotifications.map((item) => item.id).join("|");
  const notificationCount = Math.min(99, unreadNotifications.length);
  const targetRegistration = userProfile?.dashboard_role === "team_leader" ? teamTarget : tvvTarget;
  const targetRevenue = Number(targetRegistration?.revenue_target ?? 0);
  const targetActualRevenue = userProfile?.dashboard_role === "team_leader"
    ? Number(teamData?.summary?.afyp ?? 0)
    : myContracts.reduce((sum: number, row: any) => sum + Number(row.afyp ?? row.ip ?? 0), 0);
  const targetCompletion = targetRevenue > 0 ? Math.min(999, Math.round((targetActualRevenue / targetRevenue) * 100)) : 0;
  const targetProgress = Math.min(100, Math.max(0, targetCompletion));
  const targetCircleLength = 125.66;
  const displayedNotifications = notificationView === "unread"
    ? adminEvents.filter((item) => openedNotificationIds.includes(item.id))
    : adminEvents.filter((item) => readEventIds.includes(item.id));

  useEffect(() => {
    if (!signedIn || !readEventsReady || !userProfile?.advisor_code || !unreadNotificationKey) return;
    if (notificationSoundPlayedRef.current) return;
    notificationSoundPlayedRef.current = true;
    let active = true;
    const playAfterInteraction = () => {
      if (!active) return;
      void playNotificationTone();
      removeInteractionListeners();
    };
    const removeInteractionListeners = () => {
      window.removeEventListener("pointerdown", playAfterInteraction);
      window.removeEventListener("keydown", playAfterInteraction);
    };
    void playNotificationTone().then((played) => {
      if (!active || played) return;
      window.addEventListener("pointerdown", playAfterInteraction, { once: true });
      window.addEventListener("keydown", playAfterInteraction, { once: true });
    });
    return () => {
      active = false;
      removeInteractionListeners();
    };
  }, [readEventsReady, signedIn, unreadNotificationKey, userProfile?.advisor_code]);

  function toggleNotifications() {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (!willOpen) return;
    setNotificationView("unread");
    const newlyOpenedIds = unreadNotifications.map((item) => item.id);
    setOpenedNotificationIds(newlyOpenedIds);
    if (newlyOpenedIds.length === 0) return;
    const ids = Array.from(new Set([...readEventIds, ...newlyOpenedIds]));
    setReadEventIds(ids);
    if (userProfile?.advisor_code) {
      window.localStorage.setItem(`bvnt.readEvents.${userProfile.advisor_code}`, JSON.stringify(ids));
    }
  }

  function addDraft() {
    const premium = parseMoneyInput(premiumText);
    if (!productName || premium <= 0 || !paidDate) return;
    setDrafts((current) => [...current, { id: crypto.randomUUID(), productName, productCode: productName.includes("Phúc Niên") ? "BV-NCUVL08" : "", premium, expectedPaidDate: paidDate, expectedIssueDate: paidDate, status: "Có hiệu lực" }]);
  }

  function openIllustrationWithPremium(value: string) {
    const premium = parseMoneyInput(value);
    if (premium <= 0) return;
    setIllustrationPremiumText(String(premium));
    setIllustrationLoaded(true);
    setTab("illustration");
  }

  function closeTargetModal() {
    setTargetModalOpen(false);
    if (targetReturnToTeamGoal) setTeamGoalDetailSignal((current) => current + 1);
    setTargetReturnToTeamGoal(false);
  }

  const draftRewards = new Map((estimate?.rewardByDraftContract ?? []).map((item: any) => [item.draftId, item]));

  if (showSplash) {
    return (
      <main className="tvv-splash-screen" aria-label="Đang mở ứng dụng">
        <Image className="tvv-splash-image" src="/Hi.png" alt="" fill priority sizes="100vw" />
      </main>
    );
  }

  if (!authReady) return <main className="tvv-user-login"><p>Đang kiểm tra đăng nhập…</p></main>;
  if (!signedIn) return <UserLoginScreen onSuccess={(advisorCode) => {
    setTab("overview");
    setActiveRole("advisor");
    setUserProfile(null);
    setProfileReady(false);
    setAuthenticatedAdvisorCode(String(advisorCode || "").trim().toUpperCase());
    setSignedIn(true);
  }} />;
  if (!profileReady || !userProfile) return <main className="tvv-user-login"><p>Đang tải đúng giao diện tài khoản…</p></main>;

  return (
    <main className={`tvv-app${isAdoMode ? " ado-app" : ""}`}>
      {tab === "recruitment" ? (
        <RecruitmentSimulator onBack={() => setTab("overview")} />
      ) : tab === "calculator" ? (
        userProfile?.dashboard_role === "team_leader"
          ? <TeamLeaderCalculator month={month} teamData={teamData} baseline={teamRewards} onBack={() => setTab("overview")} />
          : <CalculatorView advisor={advisor} month={month} productName={productName} setProductName={setProductName} productOptions={productOptions} premiumText={premiumText} setPremiumText={(value: string) => setPremiumText(moneyInput(value))} paidDate={paidDate} setPaidDate={setPaidDate} drafts={drafts} draftRewards={draftRewards} estimate={estimate} onBack={() => setTab("overview")} onAdd={addDraft} onOpenIllustration={openIllustrationWithPremium} onRemove={(id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id))} onClear={() => setDrafts([])} />
      ) : (
        <>
          {tab === "overview" ? (
          <header className={`tvv-hero${isBoardMode ? " board-mode" : ""}${isAdoMode ? " ado-mode" : ""}`}>
            <div className="tvv-hero-main">
              <button className="tvv-avatar tvv-avatar-button" type="button" onClick={() => setTab("profile")} aria-label="Mở trang cá nhân">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : <UserRound size={40} />}</button>
              <div className="tvv-hero-copy">
                <h1 className="tvv-hero-greeting" title={`Xin chào, ${userProfile?.full_name || advisor?.name || "TVV"}`}>Xin chào, {userProfile?.full_name || advisor?.name || "TVV"}</h1>
                <p>{isBossMode ? "BOSS · Toàn công ty" : isAdoMode ? "ADO" : isBoardMode ? `Trưởng ban ${boardData?.boardName || userProfile?.managed_board_name || ""}` : userProfile?.dashboard_role === "team_leader" ? `Trưởng nhóm ${teamData?.groupName || userProfile?.managed_group_name || ""}` : `TVV - ${advisor?.code || "Chưa có mã"}`}</p>
                {isAdoMode
                  ? <strong className="tvv-current-rank"><Layers3 size={13} />{adoData ? `${adoData.groups.length} nhóm · ${adoData.summary.activeAdvisors} TVV hoạt động` : "Đang tổng hợp khu vực quản lý"}</strong>
                  : isBoardMode
                  ? <strong className="tvv-current-rank"><Users size={13} />{boardData ? `${boardData.summary.activeGroups}/${boardData.groups.length} nhóm có doanh thu` : "Đang tải dữ liệu ban"}</strong>
                  : userProfile?.dashboard_role === "team_leader"
                  ? <strong className="tvv-current-rank"><Users size={13} />{teamData ? `${teamData.summary.activeAgents}/${Number(teamRewards?.currentTeamAdvisorCount) || teamData.summary.agents} TVV có doanh thu` : "Đang tải hoạt động nhóm"}</strong>
                  : <strong className="tvv-current-rank"><Trophy size={13} />{currentAdvisorRank ? `Hạng ${currentAdvisorRank} tháng này` : "Chưa có xếp hạng tháng này"}</strong>}
              </div>
              <div className="tvv-hero-role-target">
              {!isAdoMode && !isBoardMode && userProfile?.dashboard_role !== "team_leader" && <button className="tvv-icon-button tvv-target-button" type="button" aria-label="Đăng ký mục tiêu" onClick={() => { setTargetReturnToTeamGoal(false); setTargetModalOpen(true); }}>
                  <svg className="tvv-target-progress-ring" viewBox="0 0 48 48" aria-hidden="true">
                    <circle className="track" cx="24" cy="24" r="20" />
                    <circle className="value" cx="24" cy="24" r="20" strokeDasharray={targetCircleLength} strokeDashoffset={targetCircleLength - (targetCircleLength * targetProgress / 100)} />
                  </svg>
                  <span className={`tvv-target-percent${targetCompletion >= 100 ? " is-compact" : ""}`}>{targetCompletion}%</span>
              </button>}
              {userProfile?.has_board_leader_role && <button className={`board-role-switch${isBoardMode ? " active" : ""}`} type="button" aria-label={isBoardMode ? "Chuyển sang vai trò Trưởng nhóm" : "Chuyển sang vai trò Trưởng ban"} aria-pressed={isBoardMode} onClick={() => { setActiveRole(isBoardMode ? "advisor" : "board_leader"); setTab("overview"); }}>
                <span>{isBoardMode ? "Trưởng nhóm" : "Trưởng ban"}</span>
              </button>}
              </div>
              <button ref={notificationButtonRef} className={`tvv-icon-button tvv-notification-button${notificationCount > 0 ? " tvv-notification-alert" : ""}`} type="button" aria-label={`Thông báo (${notificationCount})`} aria-expanded={notificationsOpen} onClick={toggleNotifications}>
                <Bell size={28} />
                {notificationCount > 0 && <b>{notificationCount}</b>}
              </button>
              {notificationsOpen && typeof document !== "undefined" && createPortal(
                <div ref={notificationPanelRef} className="tvv-notification-panel" style={{ top: notificationPosition.top, right: notificationPosition.right }}>
                  <div className="tvv-notification-heading" role="tablist" aria-label="Hộp thông báo">
                    <button type="button" role="tab" aria-selected={notificationView === "unread"} className={notificationView === "unread" ? "active" : ""} onClick={() => setNotificationView("unread")}>Thông báo</button>
                    <button type="button" role="tab" aria-selected={notificationView === "read"} className={notificationView === "read" ? "active" : ""} onClick={() => setNotificationView("read")}>Đã xem</button>
                  </div>
                  {displayedNotifications.length === 0 ? <p className="tvv-notification-empty">{notificationView === "unread" ? "Không có thông báo mới." : "Chưa có thông báo đã xem."}</p> : displayedNotifications.map((item) => (
                    <article key={item.id}>
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                      <small>{item.event_date ? new Date(item.event_date).toLocaleString("vi-VN") : new Date(item.created_at).toLocaleString("vi-VN")}</small>
                    </article>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </header>
          ) : (
            <TvvSubHeader title={tab === "contracts" ? "Hợp đồng" : tab === "contests" ? "Thi đua" : tab === "ado_targets" ? "Mục tiêu nhóm" : tab === "ado_accounts" ? "Tài khoản TVV" : tab === "leaderboard" ? "Bảng xếp hạng" : tab === "illustration" ? "Minh hoạ" : tab === "archive" ? "Kho tài liệu" : tab === "about" ? "Bảo Việt Nhân thọ là ai?" : "Cá nhân"} onBack={() => setTab("overview")} />
          )}
          {tab === "overview" && (isAdoMode
            ? <AdoOverview data={adoData} month={month} />
            : isBoardMode
            ? <BoardLeaderOverview data={boardData} month={month} monthOptions={monthOptions} onMonthChange={setMonth} onOpenContracts={() => setTab("contracts")} />
            : userProfile?.dashboard_role === "team_leader"
            ? <TeamLeaderOverview data={teamData} targetRegistration={teamTarget} targetMonth={targetRegistrationMonth} targetRegistrationClosed={targetRegistrationClosed} teamGoalDetailSignal={teamGoalDetailSignal} onOpenTarget={() => { setTargetReturnToTeamGoal(true); setTargetModalOpen(true); }} contestEstimate={teamRewards} currentTeamAdvisorCount={teamRewards?.currentTeamAdvisorCount} leaderboard={leaderboard} month={month} monthOptions={monthOptions} onMonthChange={setMonth} onOpenLeaderboard={() => setTab("leaderboard")} onOpenContests={() => setTab("contests")} onOpenRecruitment={() => setTab("recruitment")} />
            : <Overview advisorCode={userProfile?.advisor_code} showRecruitment={String(userProfile?.advisor_code || "").trim().toUpperCase() === "ADMINTN" || isPreTeamLeaderPosition(userProfile?.advisor_position)} stats={leaderboard?.advisorStats ?? stats} leaderboard={leaderboard} estimate={estimate ?? emptyEstimate} starViet={data?.currentStarViet} starVietWarning={data?.starVietWarning} onTab={setTab} />)}
          {tab === "contracts" && <ContractsListV2 contracts={selectedPeriodContracts} month={contractMonth} monthOptions={monthOptions} periodMode={periodMode} onPeriodModeChange={setPeriodMode} onMonthChange={setContractMonth} onOpenContract={setSelectedContract} showAdvisorFilter={userProfile?.dashboard_role === "team_leader" || isBoardMode || isAdoMode} showGroupFilter={isBoardMode || isAdoMode} />}
          {tab === "contests" && (isAdoMode ? <AdoCompetitionPage data={adoData} /> : userProfile?.dashboard_role === "team_leader" ? <TeamLeaderContestPage rewards={teamRewards} estimate={estimate ?? emptyEstimate} /> : <PolicyAwareContestList estimate={estimate ?? emptyEstimate} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={setPolicyMonth} />)}
          {tab === "ado_targets" && isAdoMode && <AdoTargetsPage data={adoData} month={month} />}
          {tab === "ado_accounts" && isAdoMode && <AdoAccountsPage data={adoData} />}
          {tab === "leaderboard" && <LeaderboardPage leaderboard={leaderboard} month={month} />}
          {tab === "archive" && <ArchiveView />}
          {tab === "about" && String(userProfile?.advisor_code || "").trim().toUpperCase() === "ADMIN" && <AboutBaoVietPage />}
          {tab === "profile" && <Profile advisor={advisor} contracts={isAdoMode ? (adoData?.contracts ?? []) : myContracts} onAvatarChange={(avatarUrl: string) => setUserProfile((value: any) => ({ ...value, avatar_url: avatarUrl }))} onLogout={() => {
            setTab("overview");
            setActiveRole("advisor");
            setUserProfile(null);
            setProfileReady(false);
            setSignedIn(false);
          }} />}
        </>
      )}
      {illustrationLoaded && <IllustrationTab active={tab === "illustration"} premiumText={illustrationPremiumText} />}
      {targetModalOpen && (userProfile?.dashboard_role === "team_leader"
        ? <TeamTargetRegistrationModal key={targetRegistrationMonth} month={targetRegistrationMonth} reportMonth={month} teamData={teamData} registration={teamTarget} onSaved={(value) => setTeamTarget({ ...value, personal_advisor_targets: teamTarget?.personal_advisor_targets ?? [] })} onClose={closeTargetModal} />
        : <TvvTargetRegistrationModal key={targetRegistrationMonth} month={targetRegistrationMonth} registration={tvvTarget} onSaved={setTvvTarget} onClose={closeTargetModal} />)}
      {selectedContract && <ContractDetailModal row={selectedContract} showAdvisorName={userProfile?.dashboard_role === "team_leader" || isBoardMode || isAdoMode} hideCustomerNames={userProfile?.dashboard_role === "team_leader" || isBoardMode} onClose={() => setSelectedContract(null)} />}
      <BottomNav tab={tab} setTab={setTab} boardMode={isBoardMode} adoMode={isAdoMode} />
    </main>
  );
}

function TvvSubHeader({ title, onBack, showHelp = false, onReset }: { title: string; onBack: () => void; showHelp?: boolean; onReset?: () => void }) {
  return <header className="tvv-calc-header tvv-page-header"><button className="tvv-back-button" onClick={onBack} aria-label="Quay lại tổng quan"><img src="/Icon/arrow-back-up.svg" alt="" /></button><h1>{title}</h1>{title === "Hợp đồng" && <button className="tvv-header-filter" type="button" aria-label="Lọc hợp đồng"><Filter size={22} /></button>}{onReset && <button className="tvv-header-reset" type="button" onClick={onReset} aria-label="Đặt lại mô phỏng"><RotateCcw size={20} /></button>}{showHelp && <span className="tvv-header-help"><Info size={18} /> Hướng dẫn</span>}</header>;
}

function MonthPicker({ value, options, onChange, className = "", ariaLabel }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; className?: string; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 168 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? monthLabel(value);
  useEffect(() => {
    if (!open) return;
    const positionMenu = () => {
      const rect = pickerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition({ top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 168) });
    };
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!pickerRef.current?.contains(target) && !target.closest(".tvv-month-menu")) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    positionMenu();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open]);
  return <div ref={pickerRef} className={`tvv-month-picker ${className}${open ? " open" : ""}`}>
    <button className="tvv-month-trigger" type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{selectedLabel}</span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div className="tvv-month-menu" style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }} role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "active" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <CheckCircle2 size={18} />}</button>)}
    </div>, document.body)}
  </div>;
}

function TvvTargetRegistrationModal({ month, registration, onSaved, onClose }: { month: string; registration: any; onSaved: (value: any) => void; onClose: () => void }) {
  const [revenueText, setRevenueText] = useState(() => String(toMillionTarget(registration?.revenue_target ?? 0) || ""));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const revenueMillions = Number(revenueText || 0);
    const revenueTarget = revenueMillions * 1_000_000;
    if (!Number.isInteger(revenueMillions) || revenueMillions < 15 || revenueMillions > 999) {
      setMessage("Doanh thu mục tiêu chỉ được nhập từ 15 đến 999 triệu đồng.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/tvv-target-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, revenueTarget })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được mục tiêu.");
      onSaved(payload.registration);
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("tvv-target-updates");
        channel.postMessage({ type: "target-saved", month });
        channel.close();
      }
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được mục tiêu.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(<div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}>
    <form className="tvv-contract-detail team-target-modal tvv-personal-target-modal" role="dialog" aria-modal="true" aria-label="Đăng ký mục tiêu" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
      <header><div><p>ĐĂNG KÝ MỤC TIÊU</p><h2>Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header>
      <section className="team-target-roster">
        <p className="team-target-unit-note">Đơn vị: Triệu đồng</p>
        <label className="tvv-personal-target-field">
          <span><Target size={17} />Nhập doanh thu mục tiêu</span>
          <div><input autoFocus value={revenueText} onChange={(event) => { const value = millionInput(event.target.value).slice(0, 3); if (!value || Number(value) <= 999) setRevenueText(value); }} inputMode="numeric" minLength={2} maxLength={3} placeholder="15 - 999" aria-label="Doanh thu mục tiêu từ 15 đến 999 triệu đồng" /></div>
        </label>
      </section>
      {message && <p className="tvv-form-message">{message}</p>}
      <button type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Gửi đăng ký"}</button>
    </form>
  </div>, document.body);
}

function formatCompactFee(value: unknown) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ đồng`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trđ`;
  return formatVnd(amount);
}

function TeamTargetRegistrationModal({ month, reportMonth, teamData, registration, onSaved, onClose }: { month: string; reportMonth: string; teamData: any; registration: any; onSaved: (value: any) => void; onClose: () => void }) {
  const advisors = useMemo(() => {
    const roster = teamData?.allAgents?.length ? teamData.allAgents : (teamData?.agents ?? []);
    const leaderCode = String(teamData?.leader?.code || "").trim();
    const normalizedLeaderCode = leaderCode.toUpperCase();
    if (!leaderCode) return roster;

    const leaderPerformance = (teamData?.agents ?? []).find((item: any) =>
      String(item.agentCode || item.advisor_code || "").trim().toUpperCase() === normalizedLeaderCode
    );
    const leaderIndex = roster.findIndex((item: any) =>
      String(item.agentCode || item.advisor_code || "").trim().toUpperCase() === normalizedLeaderCode
    );
    const leader = {
      ...(leaderPerformance ?? {}),
      ...(leaderIndex >= 0 ? roster[leaderIndex] : {}),
      agentCode: leaderCode,
      agentName: teamData?.leader?.name || leaderPerformance?.agentName || "Trưởng nhóm",
      isTeamLeader: true
    };

    if (leaderIndex < 0) return [leader, ...roster];
    return roster.map((item: any, index: number) => index === leaderIndex ? leader : item);
  }, [teamData]);
  const registeredSelectedAdvisors = registration?.selected_advisors ?? [];
  const personalTargetsByCode = useMemo(() => new Map<string, number>((registration?.personal_advisor_targets ?? []).map((item: any) => [
    String(item.advisor_code || item.agentCode || "").trim().toUpperCase(),
    Number(item.revenue_target ?? item.revenueTarget ?? 0) || 0
  ])), [registration?.personal_advisor_targets]);
  const registeredSelectedCodes = registeredSelectedAdvisors.map((item: any) => String(item.advisor_code || item.agentCode || "").trim()).filter(Boolean);
  const [targetView, setTargetView] = useState<"register" | "tracking">("register");
  const [activeAdvisorTarget, setActiveAdvisorTarget] = useState(() => String(Number(registration?.active_advisor_target ?? 0) || registeredSelectedCodes.length || ""));
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => new Set(registeredSelectedCodes));
  const [advisorTargets, setAdvisorTargets] = useState<Record<string, string>>(() => Object.fromEntries(registeredSelectedAdvisors
    .map((item: any) => [String(item.advisor_code || item.agentCode || "").trim(), String(toMillionTarget(item.revenue_target ?? item.revenueTarget))])
    .filter(([code]: [string, string]) => Boolean(code))));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const revenueTarget = useMemo(
    () => advisors.reduce((sum: number, item: any) => {
      const code = String(item.agentCode || item.advisor_code || "").trim();
      return selectedCodes.has(code) ? sum + Number(advisorTargets[code] || 0) * 1_000_000 : sum;
    }, 0),
    [advisors, advisorTargets, selectedCodes]
  );
  const targetReward = useMemo(
    () => calculateTeamTargetPtkdReward(revenueTarget, Number(activeAdvisorTarget) || 0),
    [activeAdvisorTarget, revenueTarget]
  );
  const advisorByCode = useMemo(() => new Map<string, any>(advisors.map((item: any) => [String(item.agentCode || item.advisor_code || "").trim(), item])), [advisors]);
  const trackingRows = useMemo(() => registeredSelectedAdvisors.map((item: any) => {
    const code = String(item.advisor_code || item.agentCode || "").trim();
    const agent = advisorByCode.get(code) ?? {};
    const target = Number(item.revenue_target ?? item.revenueTarget ?? 0) || 0;
    const actual = month === reportMonth ? Number(agent.ip ?? agent.afyp ?? 0) || 0 : 0;
    const percent = target > 0 ? Math.min(999, Math.round((actual / target) * 100)) : 0;
    const personalTarget = personalTargetsByCode.get(code.toUpperCase()) || 0;
    const personalPercent = personalTarget > 0 ? Math.min(999, Math.round((actual / personalTarget) * 100)) : 0;
    return {
      code,
      name: item.full_name || item.agentName || agent.agentName || agent.full_name || "TVV",
      target,
      actual,
      percent,
      remaining: Math.max(0, target - actual),
      personalTarget,
      personalPercent,
      personalRemaining: Math.max(0, personalTarget - actual)
    };
  }).sort((a: any, b: any) => b.percent - a.percent || b.actual - a.actual || String(a.name).localeCompare(String(b.name), "vi")), [advisorByCode, month, personalTargetsByCode, registeredSelectedAdvisors, reportMonth]);
  const trackingTarget = trackingRows.reduce((sum: number, row: any) => sum + row.target, 0);
  const trackingActual = trackingRows.reduce((sum: number, row: any) => sum + row.actual, 0);
  const trackingPercent = trackingTarget > 0 ? Math.min(999, Math.round((trackingActual / trackingTarget) * 100)) : 0;

  function toggleAdvisor(code: string) {
    setSelectedCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      setActiveAdvisorTarget(String(next.size));
      return next;
    });
  }

  function updateAdvisorTarget(code: string, value: string) {
    setAdvisorTargets((current) => ({ ...current, [code]: millionInput(value) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const selectedAdvisors = advisors
      .filter((item: any) => selectedCodes.has(String(item.agentCode || item.advisor_code || "").trim()))
      .map((item: any) => {
        const code = String(item.agentCode || item.advisor_code || "").trim();
        return {
          advisor_code: item.agentCode || item.advisor_code,
          full_name: item.agentName || item.full_name,
          revenue_target: Number(advisorTargets[code] || 0) * 1_000_000
        };
      });
    try {
      const response = await fetch("/api/team-target-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          revenueTarget,
          activeAdvisorTarget: Number(activeAdvisorTarget) || selectedAdvisors.length,
          rewardTarget: targetReward,
          selectedAdvisors
        })
      });
      const responseText = await response.text();
      let payload: any = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        payload = { error: responseText };
      }
      if (!response.ok) throw new Error(payload.error || "Không gửi được đăng ký mục tiêu.");
      onSaved(payload.registration);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được đăng ký mục tiêu.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}>
      <form className="tvv-contract-detail team-target-modal" role="dialog" aria-modal="true" aria-label="Đăng ký mục tiêu" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header><div><p>ĐĂNG KÝ MỤC TIÊU</p><h2>Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header>
        <div className="team-target-tabs" role="tablist" aria-label="Chọn chế độ mục tiêu">
          <button type="button" role="tab" aria-selected={targetView === "register"} className={targetView === "register" ? "active" : ""} onClick={() => setTargetView("register")}><Target size={16} />Đăng ký</button>
          <button type="button" role="tab" aria-selected={targetView === "tracking"} className={targetView === "tracking" ? "active" : ""} onClick={() => setTargetView("tracking")}><BarChart3 size={16} />Theo dõi</button>
        </div>
        <div className="team-target-fields">
          <label>{targetView === "tracking" ? "Doanh thu hiện tại" : "Doanh thu mục tiêu"}<input className="team-target-revenue-input" value={moneyInput(String(targetView === "tracking" ? trackingActual : revenueTarget)) || "0"} readOnly aria-readonly="true" /></label>
          <label>{targetView === "tracking" ? "Tiến độ" : "Lượt hoạt động"}<input className="team-target-active-input" value={targetView === "tracking" ? `${trackingPercent}%` : activeAdvisorTarget} readOnly aria-readonly="true" /></label>
          <label>{targetView === "tracking" ? "Mục tiêu đăng ký" : "Tiền thưởng mục tiêu"}<input className="team-target-reward-input" value={moneyInput(String(targetView === "tracking" ? trackingTarget : targetReward)) || "0"} readOnly aria-readonly="true" /></label>
        </div>
        {targetView === "register" ? <section className="team-target-roster">
          <div><strong>Danh sách thành viên của nhóm</strong><span>{selectedCodes.size}/{advisors.length} người dự kiến có doanh thu</span></div>
          <p className="team-target-unit-note">Đơn vị: Triệu đồng</p>
          <div className="team-target-agent-list">
            {advisors.map((agent: any) => {
              const code = String(agent.agentCode || agent.advisor_code || "").trim();
              return <label key={code || agent.agentName || agent.full_name}>
                <input type="checkbox" checked={selectedCodes.has(code)} onChange={() => toggleAdvisor(code)} />
                <span><b>{agent.agentName || agent.full_name || "TVV"}{agent.isTeamLeader && <em>trưởng nhóm</em>}{agent.isNewAdvisor && <em>new</em>}</b></span>
                <div className="team-target-agent-revenue-wrap"><input className="team-target-agent-revenue" value={advisorTargets[code] || ""} onChange={(event) => updateAdvisorTarget(code, event.target.value)} onFocus={() => { if (!selectedCodes.has(code)) toggleAdvisor(code); }} inputMode="numeric" placeholder="0" aria-label={`Mục tiêu doanh thu ${agent.agentName || agent.full_name || "TVV"} theo triệu`} /></div>
              </label>;
            })}
          </div>
        </section> : <section className="team-target-roster team-target-tracking">
          <div><strong>Tiến độ thành viên đã đăng ký</strong><span>{trackingRows.length} người</span></div>
          <p className="team-target-unit-note">Theo doanh thu hiện tại / mục tiêu đăng ký</p>
          <div className="team-target-tracking-list">
            {trackingRows.map((row: any) => (
              <article key={row.code || row.name} className={row.percent >= 100 ? "achieved" : ""}>
                <div className="team-target-tracking-head"><b>{row.name}</b><strong>{row.percent}%</strong></div>
                <div className="team-target-progress" aria-label={`Tiến độ ${row.name} ${row.percent}%`}><i style={{ width: `${Math.min(100, row.percent)}%` }} /></div>
                <div className="team-target-tracking-meta"><span>{formatVnd(row.actual)} / {formatVnd(row.target)}</span><small>Còn {formatVnd(row.remaining)}</small></div>
                {row.personalTarget > 0 && <div className="team-target-personal-progress">
                  <div><span>TVV tự đăng ký</span><strong>{row.personalPercent}%</strong></div>
                  <div className="team-target-progress" aria-label={`Tiến độ mục tiêu ${row.name} tự đăng ký ${row.personalPercent}%`}><i style={{ width: `${Math.min(100, row.personalPercent)}%` }} /></div>
                  <div className="team-target-tracking-meta"><span>{formatVnd(row.actual)} / {formatVnd(row.personalTarget)}</span><small>Còn {formatVnd(row.personalRemaining)}</small></div>
                </div>}
              </article>
            ))}
            {!trackingRows.length && <p className="team-target-tracking-empty">Chưa có thành viên nào trong đăng ký mục tiêu.</p>}
          </div>
        </section>}
        {message && <p className="error-list">{message}</p>}
        {targetView === "register" && <button type="submit" disabled={busy}>{busy ? "Đang gửi..." : "Gửi đăng ký"}</button>}
      </form>
    </div>,
    document.body
  );
}

function BoardLeaderOverview({ data, month, monthOptions, onMonthChange, onOpenContracts }: any) {
  const [selectedBoardGroup, setSelectedBoardGroup] = useState<string | null>(null);
  if (!data) return <section className="tvv-content team-dashboard-loading"><p>Đang tổng hợp dữ liệu các nhóm trong ban…</p></section>;
  const summary = data.summary ?? {};
  const topAdvisors = (data.advisors ?? []).slice(0, 5);
  const selectedGroupContracts = selectedBoardGroup
    ? (data.contracts ?? []).filter((row: any) => row.group_name === selectedBoardGroup).slice().sort((a: any, b: any) => String(b.paid_date || "").localeCompare(String(a.paid_date || "")))
    : [];
  return <section className="tvv-content team-dashboard board-dashboard">
    <div className="team-dashboard-toolbar team-dashboard-toolbar-compact">
      <MonthPicker value={month} options={monthOptions} onChange={onMonthChange} ariaLabel="Chọn tháng báo cáo ban" />
    </div>
    <div className="team-kpi-grid board-kpi-grid">
      <article className="team-kpi-card blue" aria-label="AFYP toàn ban"><BarChart3 size={20} /><strong>{formatCompactVnd(summary.afyp)}</strong></article>
      <article className="team-kpi-card green" aria-label="TVV hoạt động"><Users size={20} /><strong>{summary.activeAdvisors || 0}</strong></article>
      <button className="team-kpi-card orange clickable" type="button" aria-label="Hợp đồng" onClick={onOpenContracts}><FileText size={20} /><strong>{summary.contracts || 0}</strong></button>
      <button className="team-kpi-card red clickable" type="button" aria-label="Cần theo dõi" onClick={onOpenContracts}><Hourglass size={20} /><strong>{summary.attention || 0}</strong></button>
    </div>
    <GuestInvitationHomeCard />
    <section className="team-overview-panel board-groups-panel">
      <div className="team-panel-header"><div><Users size={18} /><div><h2>Doanh thu từng nhóm</h2></div></div></div>
      <div className="board-group-list">
        {(data.groups ?? []).map((group: any, index: number) => <button type="button" className="board-group-card" key={group.groupName} onClick={() => setSelectedBoardGroup(group.groupName)} aria-label={`Xem ${group.contracts} hợp đồng của nhóm ${group.groupName}`}>
          <div><b>{index + 1}</b><span><strong>{group.groupName}</strong><small>{group.activeAdvisors} TVV hoạt động · {group.contracts} HĐ</small></span></div>
          <span><strong>{formatCompactVnd(group.afyp)}</strong>{group.attention > 0 && <small className="attention">{group.attention} cần theo dõi</small>}</span>
        </button>)}
      </div>
    </section>
    <section className="team-overview-panel team-ranking-panel">
      <div className="team-panel-header"><div><Crown size={18} /><div><h2>Top TVV toàn ban</h2></div></div></div>
      <div className="board-top-agent-list">
        {topAdvisors.map((agent: any) => <article className="board-top-agent" key={agent.agentCode || agent.agentName}>
          <div className={`team-agent-rank rank-${agent.rank}`}>{agent.rank}</div>
          <div className="board-top-agent-copy"><strong>{agent.agentName}</strong><small>{agent.groupName}</small></div>
          <strong className="board-top-agent-revenue">{formatCompactVnd(agent.afyp)}</strong>
        </article>)}
      </div>
    </section>
    {selectedBoardGroup && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBoardGroup(null); }}>
        <section className="team-contract-modal board-contract-modal" role="dialog" aria-modal="true" aria-label={`Hợp đồng nhóm ${selectedBoardGroup}`}>
          <header>
            <div><h2>Hợp đồng nhóm {selectedBoardGroup}</h2><p>{selectedGroupContracts.length} GYC trong {monthLabel(month).toLowerCase()}</p></div>
            <button type="button" onClick={() => setSelectedBoardGroup(null)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <div className="team-contract-modal-list">
            {selectedGroupContracts.map((row: any) => <article key={row.id || row.application_no || row.contract_no}>
              <div><span>TVV</span><strong>{row.agent_name || "—"}</strong></div>
              <div><span>Số GYC/HĐ</span><strong>{row.application_no || row.contract_no_display || row.contract_no || "—"}</strong></div>
              <div><span>Ngày thu</span><strong>{formatDateVi(row.paid_date)}</strong></div>
              <div><span>IP / AFYP</span><strong>{formatCompactVnd(Number(row.ip || row.afyp || 0))}</strong></div>
              <em className={contractStatusGroup(row)}>{row.policy_status || "Chờ xử lý"}</em>
            </article>)}
            {!selectedGroupContracts.length && <p className="team-contract-modal-empty">Nhóm chưa có hợp đồng trong tháng này.</p>}
          </div>
        </section>
      </div>,
      document.body
    )}
  </section>;
}

function AdoOverview({ data, month }: any) {
  const [selectedAdoGroup, setSelectedAdoGroup] = useState<string | null>(null);
  if (!data) return <section className="tvv-content team-dashboard-loading"><p>Đang tổng hợp dữ liệu các nhóm ADO quản lý…</p></section>;
  const summary = data.summary ?? {};
  const targetRate = summary.target > 0 ? Math.round((summary.afyp / summary.target) * 100) : 0;
  const selectedGroupContracts = selectedAdoGroup
    ? (data.contracts ?? [])
      .filter((row: any) => row.group_name === selectedAdoGroup)
      .slice()
      .sort((a: any, b: any) => String(b.paid_date || "").localeCompare(String(a.paid_date || "")))
    : [];
  return <section className="tvv-content team-dashboard ado-dashboard">
    <section className="ado-command-card">
      <div><span>DOANH THU KHU VỰC</span><strong>{formatCompactVnd(summary.afyp)}</strong><small>{summary.contracts || 0} hợp đồng · {summary.activeAdvisors || 0} TVV hoạt động</small></div>
      <div className="ado-target-ring" style={{ "--ado-progress": `${Math.min(100, targetRate)}%` } as any}><b>{targetRate}%</b><span>mục tiêu</span></div>
    </section>
    <GuestInvitationHomeCard />
    <section className="team-overview-panel ado-groups-panel">
      <div className="team-panel-header"><div><Layers3 size={18} /><div><h2>Hiệu quả từng nhóm</h2><p>Xếp theo doanh thu tháng</p></div></div></div>
      <div className="ado-group-list">
        {(data.groups ?? []).map((group: any, index: number) => {
          const rate = group.target > 0 ? Math.round(group.targetRate) : 0;
          return <button type="button" key={group.groupName} onClick={() => setSelectedAdoGroup(group.groupName)} aria-label={`Xem ${group.contracts} hợp đồng của nhóm ${group.groupName}`}>
            <div className="ado-group-rank">{String(index + 1).padStart(2, "0")}</div>
            <div className="ado-group-main"><div><strong>{group.groupName}</strong><span>{group.activeAdvisors} TVV · {group.contracts} HĐ</span></div><b>{formatCompactVnd(group.afyp)}</b></div>
            {group.target > 0 && <div className="ado-group-progress"><i><u style={{ width: `${Math.min(100, rate)}%` }} /></i><span>{rate}% mục tiêu</span></div>}
          </button>;
        })}
      </div>
    </section>
    <AdoRecruitmentOverview recruitment={data.recruitment} />
    {selectedAdoGroup && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAdoGroup(null); }}>
        <section className="team-contract-modal board-contract-modal ado-group-contract-modal" role="dialog" aria-modal="true" aria-label={`Hợp đồng nhóm ${selectedAdoGroup}`}>
          <header>
            <div><h2>Hợp đồng nhóm {selectedAdoGroup}</h2><p>{selectedGroupContracts.length} hợp đồng trong {monthLabel(month).toLowerCase()}</p></div>
            <button type="button" onClick={() => setSelectedAdoGroup(null)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <div className="team-contract-modal-list">
            {selectedGroupContracts.map((row: any) => <article key={row.id || row.application_no || row.contract_no}>
              <div><span>TVV</span><strong>{row.agent_name || "—"}</strong></div>
              <div><span>Số GYC/HĐ</span><strong>{row.application_no || row.contract_no_display || row.contract_no || "—"}</strong></div>
              <div><span>BMBH</span><strong>{row.policy_owner || "—"}</strong></div>
              <div><span>NĐBH</span><strong>{row.insured_name || "—"}</strong></div>
              <div><span>Ngày thu</span><strong>{formatDateVi(row.paid_date)}</strong></div>
              <div><span>IP / AFYP</span><strong>{formatCompactVnd(Number(row.ip || row.afyp || 0))}</strong></div>
              <em className={contractStatusGroup(row)}>{row.policy_status || "Chờ xử lý"}</em>
            </article>)}
            {!selectedGroupContracts.length && <p className="team-contract-modal-empty">Nhóm chưa có hợp đồng trong tháng này.</p>}
          </div>
        </section>
      </div>,
      document.body
    )}
  </section>;
}

function AdoRecruitmentOverview({ recruitment }: any) {
  const selections = (recruitment?.selections ?? []).filter((item: any) => item.candidates?.length);
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  return <section className="team-overview-panel ado-recruitment-panel">
    <div className="team-panel-header">
      <div><UserPlus size={19} /><div><h2>Tuyển dụng</h2></div></div>
      <span>{recruitment?.totalCandidates || 0}<small>ứng viên</small></span>
    </div>
    <div className="ado-recruitment-summary">
      <div><strong>{recruitment?.totalLeaders || 0}</strong><span>Trưởng nhóm đã chọn</span></div>
      <div><strong>{recruitment?.totalCandidates || 0}</strong><span>Tổng ứng viên</span></div>
    </div>
    <div className="ado-recruitment-leaders">
      {selections.map((selection: any) => {
        const expanded = expandedLeader === selection.advisorCode;
        return <article key={selection.advisorCode} className={expanded ? "expanded" : ""}>
          <button type="button" onClick={() => setExpandedLeader(expanded ? null : selection.advisorCode)} aria-expanded={expanded}>
            <span>{String(selection.fullName || "TN").split(/\s+/).slice(-2).map((part: string) => part[0]).join("").toUpperCase()}</span>
            <div><strong>{selection.fullName}</strong><small>{selection.groupName} · {selection.isConfirmed ? "Đã xác nhận" : "Đang lựa chọn"}</small></div>
            <b>{selection.candidates.length}<small>ứng viên</small></b>
            <ChevronDown size={18} />
          </button>
          {expanded && <div className="ado-recruitment-candidates">
            {selection.candidates.map((candidate: any) => <button type="button" key={candidate.advisorCode} onClick={() => setSelectedCandidate({ ...candidate, leaderName: selection.fullName, groupName: selection.groupName })}>
              <span><UserRound size={17} /></span>
              <div><strong>{candidate.advisorName}</strong><small>{candidate.advisorCode} · Người tuyển: {candidate.recruiterName || "—"}</small></div>
              <ChevronRight size={18} />
            </button>)}
          </div>}
        </article>;
      })}
      {!selections.length && <p className="tvv-empty">Chưa có trưởng nhóm lựa chọn ứng viên tuyển dụng.</p>}
    </div>
    {selectedCandidate && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCandidate(null); }}>
        <section className="team-contract-modal ado-recruitment-detail-modal" role="dialog" aria-modal="true" aria-label={`Thông tin ứng viên ${selectedCandidate.advisorName}`}>
          <header><div><h2>{selectedCandidate.advisorName}</h2><p>{selectedCandidate.advisorCode} · Nhóm {selectedCandidate.groupName}</p></div><button type="button" onClick={() => setSelectedCandidate(null)} aria-label="Đóng"><X size={22} /></button></header>
          <div className="ado-recruitment-detail-body">
            <div><span>Trưởng nhóm lựa chọn</span><strong>{selectedCandidate.leaderName}</strong></div>
            <div><span>TVV tuyển dụng</span><strong>{selectedCandidate.recruiterName || "—"}</strong></div>
            <div><span>Ngày bắt đầu làm việc</span><strong>{formatDateVi(selectedCandidate.startDate)}</strong></div>
            <div><span>Số tháng không hoạt động</span><strong>{selectedCandidate.inactiveMonths || 0} tháng</strong></div>
            <div><span>Ký quỹ</span><strong>{formatVnd(Number(selectedCandidate.deposit) || 0)}</strong></div>
            <div><span>Số điện thoại</span><strong>{selectedCandidate.phone || "—"}</strong></div>
            <div className="wide"><span>Địa chỉ</span><strong>{selectedCandidate.address || "—"}</strong></div>
          </div>
        </section>
      </div>,
      document.body
    )}
  </section>;
}

function AdoTargetsPage({ data, month }: any) {
  const [targetView, setTargetView] = useState<"group" | "activity">("group");
  const total = (data?.groups ?? []).reduce((sum: number, group: any) => sum + (Number(group.target) || 0), 0);
  const leaderActivities = (data?.leaderActivities ?? []).flatMap((leader: any) => leader.activities ?? []);
  const completedActivities = leaderActivities.filter((activity: any) => activity.completed).length;
  return <section className="tvv-content tvv-subpage tvv-after-sub-header ado-page">
    <nav className="ado-target-view-tabs" aria-label="Chọn loại mục tiêu">
      <button type="button" className={targetView === "group" ? "active" : ""} onClick={() => setTargetView("group")}>Mục tiêu nhóm</button>
      <button type="button" className={targetView === "activity" ? "active" : ""} onClick={() => setTargetView("activity")}>Mục tiêu hoạt động</button>
    </nav>
    <section className="ado-page-intro"><span>{targetView === "group" ? <Target size={22} /> : <ClipboardList size={22} />}</span><div>
      {targetView === "group"
        ? <><p>MỤC TIÊU {monthLabel(month).toUpperCase()}</p><strong>{formatCompactVnd(total)}</strong><small>Tổng mục tiêu {data?.groups?.length || 0} nhóm quản lý</small></>
        : <><p>HOẠT ĐỘNG {monthLabel(month).toUpperCase()}</p><strong>{completedActivities}/{leaderActivities.length} hoàn thành</strong><small>Mục tiêu hoạt động của các trưởng nhóm</small></>}
    </div></section>
    {targetView === "group" && <section className="ado-target-form ado-target-readonly">
      <div className="ado-page-heading"><div><h2>Mục tiêu doanh thu từng nhóm</h2><p>Dữ liệu do trưởng nhóm đăng ký</p></div></div>
      {(data?.groups ?? []).map((group: any) => {
        const target = Number(group.target) || 0;
        const rate = target > 0 ? Math.round((Number(group.afyp) / target) * 100) : 0;
        return <article className="ado-target-row" key={group.groupName}>
          <div><b>{group.groupName}</b><span>{group.targetLeaderName ? `Trưởng nhóm: ${group.targetLeaderName}` : "Trưởng nhóm chưa đăng ký"}</span><small>Đã thực hiện {formatCompactVnd(group.afyp)}</small></div>
          <div className={`ado-target-value${group.targetRegistered ? "" : " empty"}`}><strong>{formatCompactVnd(target)}</strong><span>{group.targetActiveAdvisors || 0} TVV mục tiêu</span></div>
          <div className="ado-target-mini-progress"><i><u style={{ width: `${Math.min(100, rate)}%` }} /></i><span>{rate}%</span></div>
        </article>;
      })}
      {data?.warnings?.targets && <p className="team-form-error">{data.warnings.targets}</p>}
    </section>}
    {targetView === "activity" && <section className="ado-leader-activities">
      <div className="ado-page-heading">
        <div><h2>Mục tiêu hoạt động của trưởng nhóm</h2><p>Hoạt động đã đăng ký trong tháng {monthLabel(month)}</p></div>
      </div>
      <div className="ado-leader-activity-groups">
        {(data?.groups ?? []).map((group: any) => {
          const leader = (data?.leaderActivities ?? []).find((item: any) => item.groupName === group.groupName);
          const activities = leader?.activities ?? [];
          const completed = activities.filter((item: any) => item.completed).length;
          return <article className="ado-leader-activity-group" key={group.groupName}>
            <header>
              <div><strong>{group.groupName}</strong><small>{leader?.fullName ? `Trưởng nhóm: ${leader.fullName}` : "Chưa xác định trưởng nhóm"}</small></div>
              <span>{completed}/{activities.length}<small>hoàn thành</small></span>
            </header>
            {activities.length
              ? <div className="ado-leader-activity-list">{activities.map((activity: any) => <div key={activity.id} className={activity.completed ? "completed" : ""}>
                <span className="ado-activity-status">{activity.completed ? <CheckCircle2 size={16} /> : <CalendarDays size={16} />}</span>
                <div><strong>{activity.content}</strong><small>{formatActivitySchedule(activity)}</small></div>
                <em>{activity.completed ? "Đã thực hiện" : "Đã lên lịch"}</em>
              </div>)}</div>
              : <p className="ado-leader-activity-empty">Trưởng nhóm chưa đăng ký hoạt động trong tháng.</p>}
          </article>;
        })}
      </div>
    </section>}
  </section>;
}

function AdoAccountsPage({ data }: any) {
  const [selectedGroup, setSelectedGroup] = useState("Tất cả");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const groups = ["Tất cả", ...(data?.groups ?? []).map((group: any) => group.groupName)];
  const advisors = (data?.advisors ?? []).filter((advisor: any) => selectedGroup === "Tất cả" || advisor.groupName === selectedGroup);
  function togglePassword(code: string) {
    setVisiblePasswords((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }
  async function copyCredentials(advisor: any) {
    await navigator.clipboard.writeText(`Tên đăng nhập: ${advisor.username}\nMật khẩu: ${advisor.password}`);
    setCopied(advisor.advisorCode);
    window.setTimeout(() => setCopied(""), 1600);
  }
  return <section className="tvv-content tvv-subpage tvv-after-sub-header ado-page ado-accounts-page">
    <section className="ado-page-intro accounts"><span><ShieldCheck size={22} /></span><div><p>DANH BẠ TÀI KHOẢN</p><strong>{data?.advisors?.length || 0} TVV</strong><small>Chỉ hiển thị thành viên thuộc nhóm ADO quản lý</small></div></section>
    <div className="ado-group-chips">{groups.map((group) => <button type="button" className={selectedGroup === group ? "active" : ""} key={group} onClick={() => setSelectedGroup(group)}>{group}</button>)}</div>
    <div className="ado-account-list">
      {advisors.map((advisor: any) => {
        const visible = visiblePasswords.has(advisor.advisorCode);
        return <article key={advisor.advisorCode}>
          <div className="ado-account-person">{advisor.avatarUrl ? <img src={advisor.avatarUrl} alt="" /> : <span>{String(advisor.fullName || "TV").split(/\s+/).slice(-2).map((part: string) => part[0]).join("").toUpperCase()}</span>}<div><strong>{advisor.fullName}</strong><small>{advisor.groupName} · {advisor.position || "TVV"}</small></div></div>
          <dl><div><dt>Tên đăng nhập</dt><dd>{advisor.username}</dd></div><div><dt>Mật khẩu</dt><dd>{visible ? advisor.password : "••••••"}<button type="button" onClick={() => togglePassword(advisor.advisorCode)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></dd></div></dl>
          <button className="ado-copy-button" type="button" onClick={() => void copyCredentials(advisor)}>{copied === advisor.advisorCode ? <><CheckCircle2 size={16} />Đã sao chép</> : <><ClipboardList size={16} />Sao chép tài khoản</>}</button>
        </article>;
      })}
      {!advisors.length && <p className="tvv-empty">Nhóm này chưa có tài khoản TVV đang hoạt động.</p>}
    </div>
    <p className="ado-security-note"><ShieldCheck size={17} />Thông tin đăng nhập là dữ liệu nội bộ. Chỉ chia sẻ trực tiếp cho đúng tư vấn viên.</p>
  </section>;
}

function AdoCompetitionPage({ data }: any) {
  const [competitionView, setCompetitionView] = useState<"ongoing" | "ended">("ongoing");
  const today = new Date().toISOString().slice(0, 10);
  const allPrograms = data?.competitions ?? [];
  const groups = {
    ongoing: allPrograms.filter((program: any) => !program.end_date || String(program.end_date).slice(0, 10) >= today),
    ended: allPrograms
      .filter((program: any) => program.end_date && String(program.end_date).slice(0, 10) < today)
      .sort((a: any, b: any) => String(b.end_date || "").localeCompare(String(a.end_date || "")))
  };
  const programs = groups[competitionView];
  const isEnded = competitionView === "ended";
  return <section className="tvv-content tvv-subpage tvv-after-sub-header ado-page ado-competition-page">
    <nav className="ado-competition-view-tabs" aria-label="Lọc chương trình thi đua">
      <button type="button" className={!isEnded ? "active" : ""} onClick={() => setCompetitionView("ongoing")}>Đang diễn ra <span>{groups.ongoing.length}</span></button>
      <button type="button" className={isEnded ? "active" : ""} onClick={() => setCompetitionView("ended")}>Đã kết thúc <span>{groups.ended.length}</span></button>
    </nav>
    <section className={`ado-page-intro contests${isEnded ? " ended" : ""}`}><span><Trophy size={22} /></span><div><p>{isEnded ? "CHƯƠNG TRÌNH ĐÃ KẾT THÚC" : "CHƯƠNG TRÌNH ĐANG DIỄN RA"}</p><strong>{programs.length} chương trình</strong><small>Kết quả trong các nhóm ADO quản lý</small></div></section>
    <div className="ado-competition-list">
      {programs.map((program: any) => {
        const winners = program.achievedAdvisors ?? [];
        const winningGroups = program.achievedGroups ?? [];
        return <article key={program.id}>
          <header><div><em className={isEnded ? "ended" : ""}>{isEnded ? "ĐÃ KẾT THÚC" : "ĐANG DIỄN RA"}</em><h2>{program.program_name}</h2><p><CalendarDays size={14} />{formatDateVi(program.start_date)} – {formatDateVi(program.end_date)}</p></div><span>{winners.length + winningGroups.length}<small>đạt</small></span></header>
          {program.ai_summary && <p className="ado-competition-summary">{program.ai_summary}</p>}
          <div className="ado-achievement-list">
            {winningGroups.map((row: any) => <div key={`group-${row.team}`}><span className="group"><Users size={15} /></span><div><b>{row.team}</b><small>{row.prize_name || row.achieved_tier || "Nhóm đạt điều kiện"}</small></div><strong>{formatCompactVnd(row.total_reward || 0)}</strong></div>)}
            {winners.map((row: any, index: number) => <div key={`${row.tvv}-${index}`}><span><Medal size={15} /></span><div><b>{row.tvv}</b><small>{row.team} · {(row.achieved_reward_names ?? []).join(", ") || "Đạt điều kiện"}</small></div><strong>{formatCompactVnd(row.reward_amount || 0)}</strong></div>)}
            {!winners.length && !winningGroups.length && <p>Chưa có thành viên hoặc nhóm đạt trong kỳ hiện tại.</p>}
          </div>
        </article>;
      })}
      {!programs.length && <p className="tvv-empty">{isEnded ? "Chưa có chương trình thi đua đã kết thúc." : "Chưa có chương trình thi đua đang diễn ra."}</p>}
    </div>
  </section>;
}

function formatPolicyMonthBefore(value?: string | null) {
  if (!value) return "-";
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (!year || !month) return "-";
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  return `${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}/${previousMonth.getUTCFullYear()}`;
}

function TeamGoalPanel({ data, registration, reportMonth, targetMonth, registrationClosed, onOpen }: any) {
  const assignedTargets = registration?.selected_advisors ?? [];
  const personalTargets = registration?.personal_advisor_targets ?? [];
  const agentByCode = new Map<string, any>((data?.allAgents?.length ? data.allAgents : data?.agents ?? []).map((item: any) => [
    String(item.agentCode || item.advisor_code || "").trim().toUpperCase(),
    item
  ]));
  const assignedTotal = assignedTargets.reduce((sum: number, item: any) => sum + Number(item.revenue_target ?? item.revenueTarget ?? 0), 0);
  const targetCodes = new Set([
    ...assignedTargets.map((item: any) => String(item.advisor_code || item.agentCode || "").trim().toUpperCase()),
    ...personalTargets.map((item: any) => String(item.advisor_code || "").trim().toUpperCase())
  ]);
  const actualTotal = reportMonth === targetMonth ? [...targetCodes].filter(Boolean).reduce((sum: number, code: string) => {
    const agent = agentByCode.get(code) ?? {};
    return sum + Number(agent.afyp ?? agent.ip ?? 0);
  }, 0) : 0;
  const progress = assignedTotal > 0 ? Math.min(999, Math.round(actualTotal / assignedTotal * 100)) : 0;

  return <button className="team-goal-overview-card" type="button" onClick={onOpen} aria-label="Mở trang mục tiêu hành động">
    <span className="team-goal-overview-image"><Image src="/Icon/target-goal-icon.png" alt="" width={58} height={58} /></span>
    <strong>Mục tiêu hành động<small>{registrationClosed ? "Đã lưu" : "Đăng ký"} tháng {Number(targetMonth.slice(5, 7))}/{targetMonth.slice(0, 4)}</small></strong>
    <span className="team-goal-card-progress" style={{ "--goal-progress": `${Math.min(progress, 100) * 3.6}deg` } as React.CSSProperties}>{progress}%</span>
  </button>;
}

function TeamGoalPage({ data, registration, month, reportMonth, registrationClosed, onOpenTarget, onBack }: any) {
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");
  const [activeSection, setActiveSection] = useState<"revenue" | "actions">("revenue");
  const assignedTargets = registration?.selected_advisors ?? [];
  const personalTargets = useMemo(() => registration?.personal_advisor_targets ?? [], [registration?.personal_advisor_targets]);
  const agentByCode = useMemo(() => new Map<string, any>((data?.allAgents?.length ? data.allAgents : data?.agents ?? []).map((item: any) => [
    String(item.agentCode || item.advisor_code || "").trim().toUpperCase(),
    item
  ])), [data]);
  const personalByCode = useMemo(() => new Map<string, number>(personalTargets.map((item: any) => [
    String(item.advisor_code || "").trim().toUpperCase(),
    Number(item.revenue_target || 0)
  ])), [personalTargets]);
  const assignedByCode = new Map<string, any>(assignedTargets.map((item: any) => [
    String(item.advisor_code || item.agentCode || "").trim().toUpperCase(),
    item
  ]));
  const personalRowByCode = new Map<string, any>(personalTargets.map((item: any) => [
    String(item.advisor_code || "").trim().toUpperCase(),
    item
  ]));
  const targetRows = [...new Set([...assignedByCode.keys(), ...personalRowByCode.keys()])].filter(Boolean).map((code) => {
    const item = assignedByCode.get(code) ?? {};
    const personalItem = personalRowByCode.get(code) ?? {};
    const agent = agentByCode.get(code) ?? {};
    return {
      code,
      name: item.full_name || item.agentName || personalItem.advisor_name || agent.agentName || agent.full_name || "TVV",
      assigned: Number(item.revenue_target ?? item.revenueTarget ?? 0),
      personal: personalByCode.get(code) || 0,
      actual: month === reportMonth ? Number(agent.afyp ?? agent.ip ?? 0) : 0
    };
  });
  const assignedTotal = targetRows.reduce((sum: number, item: any) => sum + item.assigned, 0);
  const personalTotal = personalTargets.reduce((sum: number, item: any) => sum + Number(item.revenue_target || 0), 0);
  const actualTotal = targetRows.reduce((sum: number, item: any) => sum + item.actual, 0);
  const progress = assignedTotal > 0 ? Math.min(999, Math.round(actualTotal / assignedTotal * 100)) : 0;

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError("");
    try {
      const response = await fetch(`/api/team-activities?month=${month}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được hoạt động.");
      setActivities(payload.activities ?? []);
    } catch (error) {
      setActivities([]);
      setActivitiesError(error instanceof Error ? error.message : "Không tải được hoạt động.");
    } finally {
      setActivitiesLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const completedCount = activities.filter((item) => item.completed).length;
  return <section className="tvv-content team-goal-page">
    <header className="team-goal-page-header">
      <button type="button" onClick={onBack} aria-label="Quay lại tổng quan"><ChevronLeft size={21} /></button>
      <div><h2>Mục tiêu hành động</h2><p>Tháng {Number(month.slice(5, 7))}/{month.slice(0, 4)}</p></div>
    </header>

    <div className="team-goal-page-tabs" role="tablist" aria-label="Nội dung mục tiêu hành động">
      <button type="button" role="tab" aria-selected={activeSection === "revenue"} className={activeSection === "revenue" ? "active" : ""} onClick={() => setActiveSection("revenue")}><BarChart3 size={17} />Doanh thu</button>
      <button type="button" role="tab" aria-selected={activeSection === "actions"} className={activeSection === "actions" ? "active" : ""} onClick={() => setActiveSection("actions")}><CalendarDays size={17} />Hành động</button>
    </div>

    {activeSection === "revenue" ? (
      <section className="team-goal-page-panel" role="tabpanel">
        <div className="team-goal-detail-heading">
          <div><Target size={18} /><span><strong>Mục tiêu của nhóm</strong></span></div>
          <button type="button" disabled={registrationClosed} onClick={onOpenTarget}>{registrationClosed ? "Đã lưu mục tiêu" : "Giao mục tiêu"} {!registrationClosed && <ChevronRight size={14} />}</button>
        </div>
        <div className="team-goal-summary">
          <div className="team-goal-progress-ring" style={{ "--goal-progress": `${Math.min(progress, 100) * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{progress}%</strong></span>
          </div>
          <div className="team-goal-totals">
            <div><span>Trưởng nhóm giao</span><strong>{formatCompactVnd(assignedTotal)}</strong></div>
            <div><span>TVV tự đăng ký</span><strong>{formatCompactVnd(personalTotal)}</strong></div>
          </div>
        </div>
        <div className="team-goal-advisors">
          {targetRows.map((item: any) => (
            <article key={item.code || item.name}>
              <div><strong>{item.name}</strong><small>Đã đạt {formatCompactVnd(item.actual)}</small></div>
              <span><b>{formatCompactVnd(item.assigned)}</b><small>{item.personal > 0 ? `Tự đăng ký ${formatCompactVnd(item.personal)}` : "Chưa tự đăng ký"}</small></span>
            </article>
          ))}
          {!targetRows.length && <p className="team-goal-empty">Chưa giao mục tiêu cho TVV trong tháng này.</p>}
        </div>
      </section>
    ) : (
      <section className="team-goal-page-panel team-goal-actions-panel" role="tabpanel">
        <div className="team-goal-actions-summary">
          <span className="team-activity-preview-icon"><CalendarDays size={20} /></span>
          <span><strong>Hoạt động của trưởng nhóm</strong><small>{activitiesLoading ? "Đang tải…" : activitiesError ? "Chưa thiết lập dữ liệu hành động" : activities.length ? `${completedCount}/${activities.length} hành động đã hoàn thành` : "Đăng ký hành động và theo dõi thực hiện"}</small></span>
        </div>
        <TeamActivityManager month={month} activities={activities} error={activitiesError} onReload={loadActivities} />
      </section>
    )}
  </section>;
}

function TeamActivityManager({ month, activities, error, onReload }: any) {
  const defaultDate = `${month}-${String(Math.min(new Date().getDate(), 28)).padStart(2, "0")}`;
  const [activityDraft, setActivityDraft] = useState<{
    activityType: (typeof TEAM_ACTIVITY_OPTIONS)[number];
    otherContent: string;
    scheduledDate: string;
    scheduledTime: string;
  }>(() => ({
    activityType: TEAM_ACTIVITY_OPTIONS[0],
    otherContent: "",
    scheduledDate: defaultDate,
    scheduledTime: "08:00"
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error || "");
  const [evidenceById, setEvidenceById] = useState<Record<string, File | null>>({});

  async function createActivity(event: FormEvent) {
    event.preventDefault();
    const content = activityDraft.activityType === "Khác"
      ? activityDraft.otherContent.trim()
      : activityDraft.activityType;
    if (!activityDraft.scheduledDate || !activityDraft.scheduledTime || !content) {
      setMessage(activityDraft.activityType === "Khác"
        ? "Vui lòng chọn ngày, giờ và nhập nội dung chi tiết cho hoạt động khác."
        : "Vui lòng chọn đầy đủ ngày và giờ thực hiện.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/team-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activityDraft, content })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được hoạt động.");
      setActivityDraft({
        activityType: TEAM_ACTIVITY_OPTIONS[0],
        otherContent: "",
        scheduledDate: defaultDate,
        scheduledTime: "08:00"
      });
      await onReload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Không lưu được hoạt động.");
    } finally {
      setBusy(false);
    }
  }

  async function updateActivity(activity: any, completed: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("id", activity.id);
      form.set("completed", String(completed));
      const evidence = evidenceById[activity.id];
      if (evidence) form.set("evidence", evidence);
      const response = await fetch("/api/team-activities", { method: "PATCH", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không cập nhật được hoạt động.");
      setEvidenceById((current) => ({ ...current, [activity.id]: null }));
      await onReload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Không cập nhật được hoạt động.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="team-activity-manager team-activity-manager-inline" aria-label="Quản lý hoạt động">
        <div className="team-activity-manager-body">
          <form className="team-activity-create" onSubmit={createActivity}>
            <div className="team-activity-create-heading"><strong>Đăng ký hoạt động</strong></div>
            <div className="team-activity-draft">
              <div className="team-activity-schedule-fields">
                <label><span>Ngày thực hiện</span><div className="team-activity-schedule-control">
                  <output>{formatDateVi(activityDraft.scheduledDate)}</output>
                  <input type="date" aria-label="Ngày thực hiện" value={activityDraft.scheduledDate} onChange={(event) => setActivityDraft((current) => ({ ...current, scheduledDate: event.target.value }))} />
                </div></label>
                <label><span>Giờ thực hiện</span><div className="team-activity-schedule-control">
                  <output>{activityDraft.scheduledTime}</output>
                  <input type="time" aria-label="Giờ thực hiện" step="60" value={activityDraft.scheduledTime} onChange={(event) => setActivityDraft((current) => ({ ...current, scheduledTime: event.target.value }))} />
                </div></label>
              </div>
              <label><span>Nội dung hoạt động</span><select value={activityDraft.activityType} onChange={(event) => setActivityDraft((current) => ({ ...current, activityType: event.target.value as typeof current.activityType }))}>
                {TEAM_ACTIVITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select></label>
              {activityDraft.activityType === "Khác" && <label className="team-activity-other-content"><span>Nội dung chi tiết</span><textarea autoFocus value={activityDraft.otherContent} onChange={(event) => setActivityDraft((current) => ({ ...current, otherContent: event.target.value }))} maxLength={500} placeholder="Nhập nội dung hoạt động khác…" /></label>}
            </div>
            <button type="submit" disabled={busy}><CalendarDays size={17} />{busy ? "Đang lưu…" : "Đăng ký hoạt động"}</button>
          </form>
          {message && <p className="team-activity-message" role="alert">{message}</p>}
          <div className="team-activity-list">
            {activities.map((activity: any) => {
              const evidence = evidenceById[activity.id];
              return <article key={activity.id} className={activity.completed ? "completed" : ""}>
                <div className="team-activity-item-head">
                  <span><CalendarDays size={16} />{formatActivitySchedule(activity)}</span>
                  <em>{activity.completed ? <><CheckCircle2 size={15} />Đã thực hiện</> : "Đã lên lịch"}</em>
                </div>
                <strong>{activity.content}</strong>
                {activity.photo_url && <a className="team-activity-photo" href={activity.photo_url} target="_blank" rel="noreferrer"><img src={activity.photo_url} alt="Ảnh minh chứng hoạt động" /><span><Camera size={15} />Xem ảnh minh chứng</span></a>}
                {!activity.completed && <label className="team-activity-evidence">
                  <Camera size={17} /><span>{evidence ? evidence.name : "Chọn ảnh khi hoàn thành"}</span>
                  <input type="file" accept="image/*" onChange={(event) => setEvidenceById((current) => ({ ...current, [activity.id]: event.target.files?.[0] ?? null }))} />
                </label>}
                <button className={`team-activity-confirm${activity.completed ? " undo" : ""}`} type="button" disabled={busy} onClick={() => updateActivity(activity, !activity.completed)}>
                  {activity.completed ? <><Check size={16} />Bỏ xác nhận</> : <><CheckCircle2 size={16} />Xác nhận đã thực hiện</>}
                </button>
              </article>;
            })}
            {!activities.length && <p className="team-goal-empty">Chưa có hoạt động nào trong tháng này.</p>}
          </div>
        </div>
      </section>;
}

function TeamLeaderOverview({ data, targetRegistration, targetMonth, targetRegistrationClosed, teamGoalDetailSignal, onOpenTarget, contestEstimate, currentTeamAdvisorCount, leaderboard, month, monthOptions, onMonthChange, onOpenLeaderboard, onOpenContests, onOpenRecruitment }: any) {
  const [showAllTeamContracts, setShowAllTeamContracts] = useState(false);
  const [showTeamActivity, setShowTeamActivity] = useState(false);
  const [showTeamAccess, setShowTeamAccess] = useState(false);
  const [teamAccessTab, setTeamAccessTab] = useState<"never" | "inactive7" | "recent">("recent");
  const [showAllTeamAgents, setShowAllTeamAgents] = useState(false);
  const [selectedActivityStarAgent, setSelectedActivityStarAgent] = useState<any>(null);
  const [goalPageOpen, setGoalPageOpen] = useState(false);
  useEffect(() => {
    if (teamGoalDetailSignal > 0) setGoalPageOpen(true);
  }, [teamGoalDetailSignal]);
  if (!data) return <section className="tvv-content team-dashboard-loading"><p>Đang tổng hợp hoạt động của nhóm…</p></section>;
  if (goalPageOpen) return <TeamGoalPage data={data} registration={targetRegistration} month={targetMonth} reportMonth={month} registrationClosed={targetRegistrationClosed} onOpenTarget={onOpenTarget} onBack={() => setGoalPageOpen(false)} />;
  const summary = data.summary ?? {};
  const totalTeamAdvisors = Number(currentTeamAdvisorCount) || summary.agents;
  const accessStats = data.accessStats ?? { accessedCount: 0, totalCount: totalTeamAdvisors, neverAccessed: [], inactive7Days: [], recentAccess: [] };
  const kpis = [
    { label: "Doanh thu AFYP", value: formatCompactVnd(summary.afyp), tone: "blue", icon: BarChart3, action: "" },
    { label: "TVV hoạt động", value: `${summary.activeAgents} / ${totalTeamAdvisors}`, tone: "red", icon: Users, action: "activity" },
    { label: "Hợp đồng", value: summary.contracts, tone: "orange", icon: FileText, action: "contracts" },
    { label: "Có hiệu lực", value: summary.issued, tone: "green", icon: CheckCircle2, action: "" },
    { label: "TVV truy cập", value: `${accessStats.accessedCount}/${accessStats.totalCount}`, tone: "purple", icon: Eye, action: "access" }
  ];
  const allTeamContracts = (data.contracts ?? []).slice().sort((a: any, b: any) => String(b.paid_date || "").localeCompare(String(a.paid_date || "")));
  const teamAgents = data.allAgents?.length ? data.allAgents : data.agents ?? [];
  const activeTeamAgents = teamAgents.filter((agent: any) => Number(agent.afyp || agent.ip || 0) > 0);
  const inactiveTeamAgents = teamAgents.filter((agent: any) => Number(agent.afyp || agent.ip || 0) <= 0);
  const sosTeamAgents = inactiveTeamAgents.filter((agent: any) => agent.needsSos);
  const visibleTeamAgents = showAllTeamAgents ? (data.agents ?? []) : (data.agents ?? []).slice(0, 5);
  const accessRows = teamAccessTab === "never"
    ? accessStats.neverAccessed ?? []
    : teamAccessTab === "inactive7"
      ? accessStats.inactive7Days ?? []
      : accessStats.recentAccess ?? [];
  async function openActivityAdvisor(value: any) {
    const agent = value?.agent ?? {};
    setSelectedActivityStarAgent({ ...value, tab: "star", rewardLoading: true, rewardError: "", rewardEstimate: null });
    try {
      const response = await fetch("/api/tvv-reward-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          advisor: {
            code: agent.agentCode || agent.advisor_code || "",
            name: agent.agentName || agent.full_name || "",
            group: agent.groupName || agent.group_name || "",
            ban: agent.banName || agent.ban_name || "",
            ads: agent.adsName || agent.ads_name || ""
          },
          draftContracts: []
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được thưởng chính sách TVV.");
      setSelectedActivityStarAgent((current: any) => current?.agent === value.agent ? { ...current, rewardLoading: false, rewardEstimate: payload } : current);
    } catch (error) {
      setSelectedActivityStarAgent((current: any) => current?.agent === value.agent ? { ...current, rewardLoading: false, rewardError: error instanceof Error ? error.message : "Không tải được thưởng chính sách TVV." } : current);
    }
  }
  return <section className="tvv-content team-dashboard">
    <div className="team-dashboard-toolbar team-dashboard-toolbar-compact">
      <MonthPicker value={month} options={monthOptions} onChange={onMonthChange} ariaLabel="Chọn tháng báo cáo nhóm" />
    </div>

    <div className="team-kpi-grid">
      {kpis.map((item) => {
        const Icon = item.icon;
        const isInteractive = Boolean(item.action);
        const CardTag = isInteractive ? "button" : "article";
        const onClick = item.action === "activity"
          ? () => setShowTeamActivity(true)
          : item.action === "contracts"
            ? () => setShowAllTeamContracts(true)
            : item.action === "access"
              ? () => { setTeamAccessTab("recent"); setShowTeamAccess(true); }
              : undefined;
        return <CardTag className={`team-kpi-card ${item.tone}${isInteractive ? " clickable" : ""}`} key={item.label} type={isInteractive ? "button" : undefined} onClick={onClick}>
          <Icon size={20} />
          <strong>{item.value}</strong>
        </CardTag>;
      })}
    </div>

    <GuestInvitationHomeCard />
    <RecruitmentPreview onOpen={onOpenRecruitment} />

    <TeamGoalPanel data={data} registration={targetRegistration} reportMonth={month} targetMonth={targetMonth} registrationClosed={targetRegistrationClosed} onOpen={() => setGoalPageOpen(true)} />

    <ContestPreview estimate={contestEstimate} onAll={onOpenContests} />

    <section className="team-overview-panel team-ranking-panel">
      <div className="team-panel-header">
        <div><Crown size={18} /><div><h2>Top TVV trong nhóm</h2></div></div>
        {(data.agents ?? []).length > 5 && <button type="button" onClick={() => setShowAllTeamAgents((value) => !value)}>{showAllTeamAgents ? "Thu gọn" : "Xem tất cả"} <ChevronRight size={14} /></button>}
      </div>
      <div className="team-agent-list">
        {visibleTeamAgents.map((agent: any) => (
          <article className="team-agent-card team-agent-card-compact" key={agent.agentCode || agent.agentName}>
            <div className={`team-agent-rank rank-${agent.rank}`}>{agent.rank}</div>
            <div className="team-agent-avatar">{agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : <UserRound size={19} />}</div>
            <div className="team-agent-main">
              <div className="team-agent-title"><div><strong>{agent.agentName}</strong><small>{Math.max(Number(agent.contracts || 0) - Number(agent.invalid || 0), 0)} HĐ</small></div><b>{Number(agent.ip || 0).toLocaleString("vi-VN")}</b></div>
            </div>
          </article>
        ))}
        {!data.agents?.length && <p className="team-empty">Nhóm chưa có hợp đồng trong tháng đã chọn.</p>}
      </div>
    </section>

    <TeamLeaderStarJourney row={data?.starViet} warning={data?.starVietWarning} />

    <LeaderboardPreview leaderboard={leaderboard} onOpen={onOpenLeaderboard} />
    {showTeamActivity && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTeamActivity(false); }}>
        <section className="team-activity-modal" role="dialog" aria-modal="true" aria-label="Danh sách TVV hoạt động">
          <header>
            <div><h2>TVV hoạt động</h2><p>{activeTeamAgents.length}/{totalTeamAdvisors} TVV có doanh thu</p></div>
            <button type="button" onClick={() => setShowTeamActivity(false)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <div className="team-activity-modal-list">
            <TeamActivityGroup title="TVV cần SOS" count={sosTeamAgents.length} agents={sosTeamAgents} starRows={data?.starVietRows ?? []} onOpenStar={openActivityAdvisor} />
            <TeamActivityGroup title="TVV chưa hoạt động" count={inactiveTeamAgents.length} agents={inactiveTeamAgents} starRows={data?.starVietRows ?? []} onOpenStar={openActivityAdvisor} />
            <TeamActivityGroup title="TVV đã hoạt động" count={activeTeamAgents.length} agents={activeTeamAgents} starRows={data?.starVietRows ?? []} onOpenStar={openActivityAdvisor} />
          </div>
        </section>
      </div>,
      document.body
    )}
    {showTeamAccess && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTeamAccess(false); }}>
        <section className="team-access-modal" role="dialog" aria-modal="true" aria-label="Thống kê truy cập TVV" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><h2>Truy cập của TVV trong nhóm</h2><p>{accessStats.accessedCount}/{accessStats.totalCount} TVV đã từng truy cập</p></div>
            <button type="button" onClick={() => setShowTeamAccess(false)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <nav className="team-access-tabs" role="tablist" aria-label="Phân loại truy cập">
            <button type="button" role="tab" aria-selected={teamAccessTab === "never"} className={teamAccessTab === "never" ? "active" : ""} onClick={() => setTeamAccessTab("never")}>TVV chưa truy cập <b>{accessStats.neverAccessed?.length ?? 0}</b></button>
            <button type="button" role="tab" aria-selected={teamAccessTab === "inactive7"} className={teamAccessTab === "inactive7" ? "active" : ""} onClick={() => setTeamAccessTab("inactive7")}>7 ngày chưa truy cập <b>{accessStats.inactive7Days?.length ?? 0}</b></button>
            <button type="button" role="tab" aria-selected={teamAccessTab === "recent"} className={teamAccessTab === "recent" ? "active" : ""} onClick={() => setTeamAccessTab("recent")}>Truy cập gần nhất <b>{accessStats.recentAccess?.length ?? 0}</b></button>
          </nav>
          <div className="team-access-list" role="tabpanel">
            {accessRows.map((user: any) => <article key={user.advisorCode || user.fullName}>
              <span className="team-access-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={19} />}</span>
              <div><strong>{user.fullName}</strong><small>{user.advisorCode || "Chưa có mã TVV"}</small></div>
              <time>{user.lastAccess ? new Date(user.lastAccess).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa từng truy cập"}</time>
            </article>)}
            {!accessRows.length && <p className="team-access-empty">{teamAccessTab === "never" ? "Tất cả TVV trong nhóm đã từng truy cập." : teamAccessTab === "inactive7" ? "Không có TVV nào ngừng truy cập từ 7 ngày trở lên." : "Chưa có dữ liệu truy cập của TVV trong nhóm."}</p>}
            {accessStats.warning && <p className="team-form-error">Chưa đọc được đầy đủ dữ liệu truy cập.</p>}
          </div>
        </section>
      </div>,
      document.body
    )}
    {selectedActivityStarAgent && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedActivityStarAgent(null); }}>
        <section className="tvv-contract-detail team-star-agent-modal" role="dialog" aria-modal="true" aria-label="Hành trình Sao Việt TVV" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><p>TVV TRONG NHÓM</p><h2>{selectedActivityStarAgent.agent?.agentName || selectedActivityStarAgent.agent?.full_name || selectedActivityStarAgent.agent?.agentCode || "TVV"}</h2></div>
            <button type="button" onClick={() => setSelectedActivityStarAgent(null)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <div className="team-agent-detail-tabs" role="tablist" aria-label="Thông tin TVV">
            <button type="button" role="tab" aria-selected={(selectedActivityStarAgent.tab || "star") === "star"} className={(selectedActivityStarAgent.tab || "star") === "star" ? "active" : ""} onClick={() => setSelectedActivityStarAgent((current: any) => ({ ...current, tab: "star" }))}><Sparkles size={16} />Sao Việt</button>
            <button type="button" role="tab" aria-selected={selectedActivityStarAgent.tab === "policy"} className={selectedActivityStarAgent.tab === "policy" ? "active" : ""} onClick={() => setSelectedActivityStarAgent((current: any) => ({ ...current, tab: "policy" }))}><ShieldCheck size={16} />Thưởng chính sách</button>
          </div>
          {(selectedActivityStarAgent.tab || "star") === "star"
            ? <PersonalStarJourney row={selectedActivityStarAgent.star} warning="" />
            : <AdvisorPolicyRewardPanel estimate={selectedActivityStarAgent.rewardEstimate} loading={selectedActivityStarAgent.rewardLoading} error={selectedActivityStarAgent.rewardError} />}
        </section>
      </div>,
      document.body
    )}
    {showAllTeamContracts && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAllTeamContracts(false); }}>
        <section className="team-contract-modal" role="dialog" aria-modal="true" aria-label="Danh sách toàn bộ GYC của nhóm">
          <header>
            <div><h2>Tất cả hợp đồng của nhóm</h2><p>{allTeamContracts.length} GYC trong tháng</p></div>
            <button type="button" onClick={() => setShowAllTeamContracts(false)} aria-label="Đóng"><X size={22} /></button>
          </header>
          <div className="team-contract-modal-list">
            {allTeamContracts.map((row: any) => (
              <article key={row.id || row.application_no || row.contract_no}>
                <div><span>TVV</span><strong>{row.agent_name || "—"}</strong></div>
                <div><span>Ngày hiệu lực</span><strong>{formatDateVi(row.paid_date || row.raw_data?.["NGÀY THU"])}</strong></div>
                <div><span>Ngày phát hành</span><strong>{formatDateVi(row.issued_date || row.raw_data?.["NGÀY PHÁT HÀNH"])}</strong></div>
                <div><span>IP</span><strong>{Number(row.ip || 0).toLocaleString("vi-VN")}</strong></div>
                <em className={contractStatusGroup(row)}>{row.policy_status || "Chờ xử lý"}</em>
              </article>
            ))}
            {!allTeamContracts.length && <p className="team-contract-modal-empty">Nhóm chưa có GYC trong tháng này.</p>}
          </div>
        </section>
      </div>,
      document.body
    )}
  </section>;
}

function AdvisorPolicyRewardPanel({ estimate, loading, error }: { estimate: any; loading?: boolean; error?: string }) {
  const programs = (estimate?.policyRewardPrograms ?? []).filter((item: any) => item.programId !== "policy-month-13");
  const total = programs.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0);
  if (loading) return <p className="tvv-empty">Đang tải thưởng chính sách TVV...</p>;
  if (error) return <p className="team-form-error">{error}</p>;
  return <section className="team-agent-policy-panel">
    <div className="team-agent-policy-total"><span>Tổng thưởng chính sách tạm tính</span><strong>{formatVnd(total)}</strong></div>
    {programs.length ? programs.map((item: any) => {
      const milestoneInfo = contestNextMilestones(item);
      const tone = item.programId === "policy-quarterly" ? "quarter" : "monthly";
      return <article className={`team-agent-policy-card ${tone}`} key={item.programId}>
        <header><div><b>{item.programName}</b><small>{item.period}</small></div><strong>{formatCompactVnd(Number(item.estimatedReward || 0))}</strong></header>
        {!item.infoOnly && <div className="team-agent-policy-current">
          <span>Hiện tại</span>
          <strong>{milestoneInfo.basisLabel === "hợp đồng" || milestoneInfo.basisLabel === "HĐ đủ điều kiện" ? `${milestoneInfo.currentBasis} HĐ` : milestoneInfo.basisLabel === "Quý đạt" ? `${milestoneInfo.currentBasis}/4 quý` : formatCompactVnd(milestoneInfo.currentBasis)}</strong>
          {milestoneInfo.currentRateLabel && <em>Bậc {milestoneInfo.currentRateLabel}</em>}
        </div>}
        <div className="team-agent-policy-next">
          <span>Mốc tiếp theo</span>
          {milestoneInfo.nextTiers.length ? milestoneInfo.nextTiers.map((tier: any) => <div key={`${item.programId}-${tier.title}`}>
            <b>{tier.title}</b>
            <small>{tier.subtitle}</small>
            <p>Cần thêm <strong>{tier.missingLabel === "hợp đồng" ? `${tier.missing} HĐ` : formatCompactFee(tier.missing)}</strong>{tier.missingLabel !== "hợp đồng" && ` ${tier.missingLabel}`}</p>
            <footer><span>Dự kiến thưởng</span><strong>{tier.projectedReward > 0 ? formatVnd(tier.projectedReward) : "Chưa đủ dữ liệu"}</strong></footer>
          </div>) : <p className="tvv-empty">Đã đạt mốc cao nhất của chính sách này.</p>}
        </div>
      </article>;
    }) : <p className="tvv-empty">Chưa có dữ liệu thưởng chính sách của TVV này.</p>}
  </section>;
}

function TeamActivityGroup({ title, count, agents, starRows = [], onOpenStar }: { title: string; count: number; agents: any[]; starRows?: any[]; onOpenStar?: (value: any) => void }) {
  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const findStar = (agent: any) => starRows.find((row: any) =>
    (normalize(agent.agentCode) && normalize(row.agentCode) === normalize(agent.agentCode)) ||
    (normalize(agent.agentName) && normalize(row.agentName) === normalize(agent.agentName))
  ) ?? null;
  const activityLabel = (agent: any) => {
    const inactiveMonths = typeof agent.inactiveMonths === "number" ? agent.inactiveMonths : null;
    if (inactiveMonths !== null && inactiveMonths <= 1) return "Hoạt động đều";
    if (inactiveMonths !== null) return `${inactiveMonths} tháng chưa có HĐ`;
    if (Number(agent.contracts || 0) > 0 || Number(agent.ip || agent.afyp || 0) > 0) return "Hoạt động đều";
    return "Chưa xác định";
  };
  return <section className="team-activity-group">
    <div className="team-activity-group-head"><h3>{title}</h3><span>{count} TVV</span></div>
    <div className="team-activity-agent-list">
      {agents.map((agent: any) => {
        const star = findStar(agent);
        return <button type="button" className="team-activity-agent" key={agent.agentCode || agent.agentName} onClick={() => onOpenStar?.({ agent, star })}>
          <div className="team-agent-avatar">{agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : <UserRound size={18} />}</div>
          <div>
            <strong>{agent.agentName || "TVV"}{agent.isNewAdvisor && <em>new</em>}{agent.needsSos && <em className="team-agent-sos">SOS</em>}</strong>
            <small>{activityLabel(agent)}</small>
            <small>{agent.agentCode || "Chưa có mã TVV"}</small>
          </div>
          <span>{formatCompactVnd(Number(agent.afyp || 0))}</span>
        </button>;
      })}
      {!agents.length && <p className="team-empty">Không có TVV trong danh sách này.</p>}
    </div>
  </section>;
}

function TeamLeaderRewardSummary({ rewards }: { rewards: any }) {
  const items = [
    ["Thưởng PTKD tháng", rewards.monthly?.reward, `${Math.round((rewards.monthly?.rate || 0) * 100)}% FYC`],
    ["Thưởng Quý", rewards.quarterly?.reward, `${Math.round((rewards.quarterly?.rate || 0) * 100)}% FYC`],
    ["Thưởng tuyển luyện", rewards.recruitmentTraining?.reward, `${rewards.recruitmentTraining?.activeNewAdvisorCount || 0} TVV mới HĐC`],
    ["Thưởng năm", rewards.annual?.reward, `${rewards.annual?.achievedQuarters || 0}/4 quý đạt`],
    ["Quản lý mới", rewards.newManager?.reward, rewards.newManager ? `Đến hết tháng ${formatPolicyMonthBefore(rewards.newManager.validUntil)}` : "Không áp dụng"]
  ];
  return <section className="team-overview-panel team-reward-summary">
    <div className="team-reward-summary-head"><div><Gift size={18} /><span><h2>Thưởng chính sách Trưởng nhóm</h2><p>Tạm tính theo dữ liệu hiện tại</p></span></div><strong>{formatVnd(rewards.totalEstimatedReward || 0)}</strong></div>
    <div className="team-reward-summary-grid">{items.map(([label, value, note]) => <article key={String(label)}><span>{label}</span><strong>{formatVnd(Number(value) || 0)}</strong><small>{note}</small></article>)}</div>
  </section>;
}

function TeamLeaderRewardSummaryCard({ rewards, baseline }: { rewards: any; baseline?: any }) {
  const [selectedDetail, setSelectedDetail] = useState<"monthly" | "quarterly" | null>(null);
  const items = [
    { id: "monthly", label: "Thưởng PTKD tháng", currentValue: baseline?.monthly?.reward ?? 0, value: rewards.monthly?.reward, note: `${Math.round((rewards.monthly?.rate || 0) * 100)}% FYC`, icon: Trophy, interactive: true },
    { id: "quarterly", label: "Thưởng Quý", currentValue: baseline?.quarterly?.reward ?? 0, value: rewards.quarterly?.reward, note: `${Math.round((rewards.quarterly?.rate || 0) * 100)}% FYC`, icon: Gift, interactive: true },
    { id: "recruitment-training", label: "Thưởng tuyển luyện", currentValue: baseline?.recruitmentTraining?.reward ?? 0, value: rewards.recruitmentTraining?.reward, note: `${rewards.recruitmentTraining?.activeNewAdvisorCount || 0} TVV mới HĐC · ${Math.round((rewards.recruitmentTraining?.rate || 0) * 100)}%`, icon: UserPlus, interactive: false },
    { id: "annual", label: "Thưởng năm", currentValue: baseline?.annual?.reward ?? 0, value: rewards.annual?.reward, note: `${rewards.annual?.achievedQuarters || 0}/4 quý đạt`, icon: Medal, interactive: false },
    ...(baseline?.newManager || rewards.newManager ? [{
      id: "new-manager",
      label: "Quản lý mới",
      currentValue: baseline?.newManager?.reward ?? 0,
      value: rewards.newManager?.reward,
      note: `Đến hết tháng ${formatPolicyMonthBefore((rewards.newManager || baseline?.newManager)?.validUntil)}`,
      icon: Crown,
      interactive: false
    }] : [])
  ];

  return <>
    <div className="tvv-reward-summary-title team-reward-summary-title">
      <span><Gift size={18} /></span>
      <div><h2>Thưởng chính sách Trưởng nhóm</h2><p>Tạm tính theo dữ liệu hiện tại</p></div>
    </div>
    <div className="team-reward-total team-reward-total-stack">
      <div><span>Tổng thưởng dự kiến</span><strong>+{formatVnd(rewards.totalEstimatedReward || 0)}</strong></div>
      <div className="team-reward-total-ip"><span>Tổng IP dự kiến</span><strong>{formatVnd(rewards.monthly?.ip || 0)}</strong></div>
    </div>
    <div className="tvv-result-table tvv-result-table-standalone team-reward-programs">
      <div className="tvv-result-head"><span>Chương trình</span><span>Hiện tại / Dự kiến</span></div>
      {items.map((item, index) => {
        const Icon = item.icon;
        const currentValue = Number(item.currentValue) || 0;
        const projectedValue = Number(item.value) || 0;
        const increaseValue = Math.max(0, projectedValue - currentValue);
        const interactiveProps = item.interactive ? {
          role: "button" as const,
          tabIndex: 0,
          onClick: () => setSelectedDetail(item.id as "monthly" | "quarterly"),
          onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setSelectedDetail(item.id as "monthly" | "quarterly");
          }
        } : {};
        return <div className={`tvv-result-row team-reward-program-row${item.interactive ? " interactive" : ""}`} key={item.id} {...interactiveProps}>
          <div><span className={`tvv-result-icon tone-${index % 3}`}><Icon size={22} /></span><b>{item.label}</b><small>{item.note}{item.interactive ? " · Bấm để xem chi tiết" : ""}</small></div>
          <strong className="team-reward-program-amount"><small>Hiện tại {formatVnd(currentValue)}</small><em>{increaseValue > 0 ? `+${formatVnd(increaseValue)}` : "+0 đ"}</em></strong>
        </div>;
      })}
    </div>
    {selectedDetail && <TeamLeaderPolicyDetailModal type={selectedDetail} rewards={rewards} onClose={() => setSelectedDetail(null)} />}
  </>;
}

function TeamLeaderPolicyDetailModal({ type, rewards, onClose }: { type: "monthly" | "quarterly"; rewards: any; onClose: () => void }) {
  const detail = type === "monthly" ? rewards.monthly : rewards.quarterly;
  const title = type === "monthly" ? "Thưởng PTKD tháng" : "Thưởng Quý";
  const monthlyBasisName = rewards.monthly?.source === "temporary-ptkd-2026-07" ? "FYP" : "IP";
  const basisLabel = type === "monthly" ? `${monthlyBasisName} nhóm tháng hiện tại` : "IP nhóm quý hiện tại";
  const fycLabel = type === "monthly" ? "FYC tháng hiện tại" : "FYC quý hiện tại";
  const posterUrl = type === "monthly" ? "/Thưởng tháng trưởng nhóm.png" : "/Thưởng Quý trưởng nhóm.png";
  const currentRate = Math.round((detail?.rate || 0) * 100);
  const milestones = Array.isArray(detail?.milestones) ? detail.milestones : [];

  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}>
    <section className="tvv-contract-detail team-policy-detail-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <header><div><p>CHI TIẾT CHƯƠNG TRÌNH</p><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header>
      <div className="team-policy-detail-section"><span>Thể lệ CTTĐ</span><div className="team-policy-poster"><Image src={posterUrl} alt={`Poster thể lệ ${title}`} width={900} height={1273} sizes="(max-width: 700px) 100vw, 420px" /></div></div>
      <div className="team-policy-detail-grid">
        <article><span>{basisLabel}</span><strong>{formatVnd(Number(detail?.ip || 0))}</strong></article>
        <article><span>{fycLabel}</span><strong>{formatVnd(Number(detail?.fyc || 0))}</strong></article>
        <article><span>Bậc hiện tại</span><strong>{currentRate}% FYC</strong></article>
        <article><span>Thưởng hiện tại</span><strong>{formatVnd(Number(detail?.reward || 0))}</strong></article>
      </div>
      {detail?.source === "temporary-ptkd-2026-07" && <div className="team-policy-detail-note"><span>Nguồn dữ liệu</span><strong>Bảng PTKD tháng 07/2026</strong></div>}
      {type === "monthly" && <div className="team-policy-detail-note"><span>TVV HĐC hiện tại</span><strong>{Number(detail?.hdc || 0)} TVV</strong></div>}
      {type === "quarterly" && <div className="team-policy-detail-note"><span>Điều kiện TVV mới HĐC</span><strong>{detail?.hasNewAdvisor ? "Đã đạt" : "Chưa đạt"}</strong></div>}
      <div className="team-policy-detail-section"><span>Mốc tiếp theo</span>{milestones.length ? <div className="team-policy-next-list">{milestones.map((item: any) => <article key={item.title}><b>{item.title}</b><small>{item.subtitle}</small><div><span>Còn thiếu {formatVnd(Number(item.missing || 0))}</span><strong>{formatVnd(Number(item.projectedReward || 0))}</strong></div><em>+{formatVnd(Number(item.incrementalReward || 0))} so với hiện tại</em></article>)}</div> : <p className="tvv-empty">Đã đạt mốc cao nhất của chương trình này.</p>}</div>
    </section>
  </div>;
}

function TeamLeaderStarJourney({ row, warning }: { row?: any; warning?: string | null }) {
  if (warning) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>Hành trình Sao Việt</h2></div><p>{warning}</p></section>;
  if (!row) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>Hành trình Sao Việt</h2></div><p>Chưa có dữ liệu Sao Việt của nhóm trong tháng này.</p></section>;
  const totalFyp = Number(row.totalAfyp || 0);
  const progress = Math.max(0, Math.min(100, Number(row.progress ?? 0)));
  return <section className="tvv-card tvv-star-journey">
    <div className="tvv-star-title"><span><Sparkles size={17} /> Hành trình Sao Việt</span><em>{row.currentTickets > 0 ? `${row.currentTickets} vé` : row.currentRank}</em></div>
    <div className="tvv-star-main"><div><small>FYP KTM Nhóm</small><strong>{formatVnd(totalFyp)}</strong></div><img className="tvv-star-achievement-icon" src="/images/star-viet-achievement.png" alt="" /></div>
    <div className="tvv-star-progress"><div><span>Mốc tiếp theo</span><b>{row.remainingToNext > 0 ? row.nextRank : "Đã đạt mốc cao nhất"}</b></div><i><u style={{ width: `${progress}%` }} /></i><div><span>{progress.toFixed(1).replace(".0", "")}%</span>{row.remainingToNext > 0 && <b>Còn {formatVnd(row.remainingToNext)}</b>}</div></div>
  </section>;
}

function TeamLeaderContestPage({ rewards, estimate }: { rewards: any; estimate: any }) {
  const [view, setView] = useState<"ongoing" | "ended" | "policy">("ongoing");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const ongoingPrograms = rewards?.ongoingPrograms ?? estimate?.ongoingPrograms ?? [];
  const endedPrograms = [...(rewards?.endedPrograms ?? estimate?.endedPrograms ?? [])]
    .sort((a: any, b: any) => String(b.endDate ?? "").localeCompare(String(a.endDate ?? "")));
  const totalPolicyReward = Number(rewards?.totalEstimatedReward ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const soonEndingCount = ongoingPrograms.filter((item: any) => {
    const end = String(item.endDate ?? "");
    if (!end) return false;
    const diff = (new Date(`${end}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const tabs = [
    { id: "ongoing" as const, label: `Đang diễn ra (${ongoingPrograms.length})`, value: ongoingPrograms.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0) },
    { id: "ended" as const, label: `Đã kết thúc (${endedPrograms.length})`, value: endedPrograms.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0) },
    { id: "policy" as const, label: "Thưởng chính sách", value: totalPolicyReward }
  ];
  const visiblePrograms = view === "ongoing" ? ongoingPrograms : endedPrograms;

  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page team-contest-page">
    <section className="tvv-contest-summary"><h2>Tổng quan thi đua</h2><div>
      <span><b>Đang diễn ra</b><strong>{ongoingPrograms.length}</strong><em>chương trình</em></span>
      <span><b>Sắp kết thúc</b><strong>{soonEndingCount}</strong><em>chương trình</em></span>
      <span><b>Ước tính thưởng</b><strong>{formatVnd(totalPolicyReward)}</strong><em>Thưởng Trưởng nhóm</em></span>
    </div></section>
    <div className="tvv-contest-filter">{tabs.map((tabItem) => <button key={tabItem.id} type="button" className={view === tabItem.id ? "active" : ""} onClick={() => setView(tabItem.id)}><span>{tabItem.label}</span><strong>{formatVnd(tabItem.value)}</strong></button>)}</div>
    <section className={`tvv-contest-list-panel${view === "policy" ? " team-policy-list-panel" : ""}`}>
      {view === "policy"
        ? <TeamLeaderPolicyPage rewards={rewards} embedded />
        : visiblePrograms.length
          ? visiblePrograms.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} status={view} onOpen={setSelectedProgram} />)
          : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : "Chưa có chương trình thi đua đã kết thúc."}</p>}
    </section>
    <p className="tvv-contest-note"><Info size={17} /><span>Thưởng chính sách Trưởng nhóm được tính theo cơ chế riêng dựa trên kết quả của nhóm. Mức thưởng chính thức được xác nhận khi đủ điều kiện chi trả.</span></p>
  </section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function TeamLeaderPolicyPage({ rewards, embedded = false }: { rewards: any; embedded?: boolean }) {
    const [selectedPolicyProgram, setSelectedPolicyProgram] = useState<any>(null);
  if (!rewards) return <section className="tvv-content tvv-subpage tvv-after-sub-header"><p className="tvv-empty">Đang tính chính sách Trưởng nhóm…</p></section>;
  const newManager = rewards.newManager;
  const newManagerStatus = rewards.newManagerStatus ?? {};
  const monthlyBasisName = rewards.monthly?.source === "temporary-ptkd-2026-07" ? "FYP" : "IP";
  const programs = [
    {
      id: "team-policy-monthly",
      title: "Thưởng PTKD tháng",
      period: `Tháng ${Number(rewards.month.slice(5, 7))}/${rewards.month.slice(0, 4)}`,
      poster: "/Thưởng tháng trưởng nhóm.png",
      reward: rewards.monthly.reward,
      basisLabel: `${monthlyBasisName} nhóm tháng`,
      currentBasis: rewards.monthly.ip,
      currentRateLabel: `${Math.round(rewards.monthly.rate * 100)}%`,
      milestones: rewards.monthly.milestones ?? [],
      stats: [`${monthlyBasisName} ${formatVnd(rewards.monthly.ip)}`, `FYC ${formatVnd(rewards.monthly.fyc)}`, `KPI04 ${formatVnd(rewards.monthly.kpi04Fyc)}`, `KPI05 ${formatVnd(rewards.monthly.kpi05Fyc)}`, `BC02 bổ sung ${formatVnd(rewards.monthly.bc02Fyc)}`, `${rewards.monthly.hdc} TVV HĐC`, `Tỷ lệ ${Math.round(rewards.monthly.rate * 100)}%`],
      target: rewards.monthly.nextIpTarget,
      remaining: rewards.monthly.remainingIp,
      contracts: rewards.monthly.contracts
    },
    {
      id: "team-policy-quarterly",
      title: `Thưởng Quý ${rewards.quarterly.quarter}`,
      period: `Quý ${rewards.quarterly.quarter}/${rewards.annual.year}`,
      poster: "/Thưởng Quý trưởng nhóm.png",
      reward: rewards.quarterly.reward,
      basisLabel: "IP nhóm quý",
      currentBasis: rewards.quarterly.ip,
      currentRateLabel: `${Math.round(rewards.quarterly.rate * 100)}%`,
      milestones: rewards.quarterly.milestones ?? [],
      stats: [`FYC quý ${formatVnd(rewards.quarterly.fyc)}`, `KPI04 ${formatVnd(rewards.quarterly.kpi04Fyc)}`, `KPI05 ${formatVnd(rewards.quarterly.kpi05Fyc)}`, `BC02 bổ sung ${formatVnd(rewards.quarterly.bc02Fyc)}`, rewards.quarterly.hasNewAdvisor ? "Có TVV mới HĐC" : "Chưa có TVV mới HĐC", `Tỷ lệ ${Math.round(rewards.quarterly.rate * 100)}%`],
      target: rewards.quarterly.nextIpTarget,
      remaining: rewards.quarterly.remainingIp,
      contracts: rewards.quarterly.contracts
    },
    {
      id: "team-policy-annual",
      title: `Thưởng năm ${rewards.annual.year}`,
      period: `Năm ${rewards.annual.year}`,
      poster: "/Thưởng tháng 13 trưởng nhóm.png",
      reward: rewards.annual.reward,
      basisLabel: "Quý đạt",
      currentBasis: rewards.annual.achievedQuarters,
      currentRateLabel: "",
      milestones: rewards.annual.milestones ?? [],
      stats: [`FYP năm ${formatVnd(rewards.annual.fyp)}`, `KPI04 ${formatVnd(rewards.annual.kpi04Fyc)}`, `KPI05 ${formatVnd(rewards.annual.kpi05Fyc)}`, `BC02 bổ sung ${formatVnd(rewards.annual.bc02Fyc)}`, `${rewards.annual.achievedQuarters}/4 quý đạt`, rewards.annual.fypFallback ? "Tạm dùng FYC do chưa có FYP" : "Tạm tính, chi trả một lần"],
      target: null,
      remaining: 0,
      contracts: []
    },
    {
      id: "team-policy-new-manager",
      title: "Thưởng Quản lý mới",
      period: newManager ? `Áp dụng đến hết tháng ${formatPolicyMonthBefore(newManager.validUntil)}` : "Không áp dụng trong tháng xét",
      poster: "/Thưởng quản lý mới.png",
      reward: newManager?.reward ?? 0,
      basisLabel: "FYP nhóm tháng",
      currentBasis: newManager?.fyp ?? 0,
      currentRateLabel: "",
      milestones: newManager?.milestones ?? [],
      stats: newManager ? [`FYP tháng ${formatVnd(newManager.fyp)}`, `${newManager.hdc} TVV HĐC`, `Áp dụng đến hết tháng ${formatPolicyMonthBefore(newManager.validUntil)}`] : [],
      breakdown: (newManager?.fypBreakdown ?? []).map((row: any) => ({
        label: row.advisorName || row.advisorCode,
        value: formatVnd(row.fyp)
      })),
      target: null,
      remaining: 0,
      contracts: newManager?.contracts ?? [],
      notEligible: !newManager,
      eligibilityNote: newManagerStatus.reason || "Chỉ áp dụng cho Trưởng nhóm trong 12 tháng chức vụ đầu tiên."
    },
    {
      id: "team-policy-recruitment",
      title: "Thưởng tuyển luyện",
      period: `Tháng ${Number(rewards.month.slice(5, 7))}/${rewards.month.slice(0, 4)}`,
      poster: "/Thưởng tuyển luyện.png",
      reward: rewards.recruitmentTraining?.reward ?? 0,
      basisLabel: "TVV mới HĐC",
      currentBasis: rewards.recruitmentTraining?.activeNewAdvisorCount ?? 0,
      currentRateLabel: `${Math.round((rewards.recruitmentTraining?.rate || 0) * 100)}%`,
      milestones: rewards.recruitmentTraining?.milestones ?? [],
      stats: [
        `Thưởng tháng TVV mới ${formatVnd(rewards.recruitmentTraining?.monthlyReward || 0)}`,
        `Thưởng chặng TVV mới ${formatVnd(rewards.recruitmentTraining?.stageReward || 0)}`,
        `Tổng thưởng TVV mới ${formatVnd(rewards.recruitmentTraining?.totalNewAdvisorReward || 0)}`,
        `${rewards.recruitmentTraining?.activeNewAdvisorCount || 0} TVV mới HĐC`,
        `Tỷ lệ ${Math.round((rewards.recruitmentTraining?.rate || 0) * 100)}%`
      ],
      breakdown: [
        { label: "Thưởng tháng TVV mới", value: formatVnd(rewards.recruitmentTraining?.monthlyReward || 0) },
        { label: "Thưởng chặng TVV mới", value: formatVnd(rewards.recruitmentTraining?.stageReward || 0) },
        { label: "Tổng thưởng TVV mới", value: formatVnd(rewards.recruitmentTraining?.totalNewAdvisorReward || 0) },
        { label: "Thưởng tuyển luyện", value: formatVnd(rewards.recruitmentTraining?.reward || 0) }
      ],
      target: null,
      remaining: 0,
      contracts: []
    },
    {
      id: "team-policy-system-growth",
      title: "Thưởng phát triển hệ thống",
      period: "Quyền lợi dành cho Trưởng nhóm",
      poster: "/Thưởng phát triển hệ thống.png",
      reward: 0,
      infoOnly: true,
      infoNote: "Chương trình này chỉ hiển thị để Trưởng nhóm biết các quyền lợi về phát triển hệ thống. Dashboard không tự tính số thưởng cho mục này."
    }
  ];
  const openPolicyMilestone = (program: any) => setSelectedPolicyProgram({
    programId: program.id,
    programName: program.title,
    period: program.period,
    originalFileUrl: program.poster || null,
    estimatedReward: program.reward,
    infoOnly: Boolean(program.infoOnly),
    infoNote: program.infoNote || "",
    notEligible: Boolean(program.notEligible),
    eligibilityNote: program.eligibilityNote || "",
    milestoneType: "team-policy",
    isTeamPolicy: true,
    teamPolicy: {
      basisLabel: program.basisLabel,
      currentBasis: program.currentBasis,
      currentReward: program.reward,
      currentRateLabel: program.currentRateLabel,
      nextTiers: program.milestones,
      breakdown: program.breakdown ?? []
    }
  });
  return <><section className={`${embedded ? "team-policy-page team-policy-page-embedded" : "tvv-content tvv-subpage tvv-after-sub-header team-policy-page"}`}>
    {!embedded && <div className="team-policy-total"><span>Tổng thưởng tạm tính</span><strong>{formatVnd(rewards.totalEstimatedReward)}</strong><small>Nhóm {rewards.groupName}</small></div>}
    {programs.map((program) => <article className="team-policy-card team-policy-card-clickable" key={program.title} role="button" tabIndex={0} onClick={() => openPolicyMilestone(program)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPolicyMilestone(program); } }}>
      <div className="team-policy-card-head"><div><Trophy size={19} /><h2>{program.title}</h2></div><strong>{program.infoOnly ? "Quyền lợi" : formatVnd(program.reward)}</strong></div>
      {program.target && <div className="team-policy-next"><span>Mốc FYP tiếp theo <b>{formatVnd(program.target)}</b></span><strong>Còn {formatVnd(program.remaining)}</strong><i><u style={{ width: `${Math.min(100, ((program.target - program.remaining) / program.target) * 100)}%` }} /></i></div>}
    </article>)}
  </section>{selectedPolicyProgram && <ContestDetailModal item={selectedPolicyProgram} onClose={() => setSelectedPolicyProgram(null)} />}</>;
}

function TeamLeaderCalculator({ month, teamData, baseline, onBack }: any) {
  const [advisorCode, setAdvisorCode] = useState("");
  const [ipText, setIpText] = useState("");
  const [expectedPaidDate, setExpectedPaidDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isNewAdvisor, setIsNewAdvisor] = useState(false);
  const [draftContracts, setDraftContracts] = useState<any[]>([]);
  const [result, setResult] = useState<any>(baseline);
  const [calculating, setCalculating] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedAdvisorReward, setSelectedAdvisorReward] = useState<any>(null);
  const [advisorRewardLoading, setAdvisorRewardLoading] = useState(false);
  const [advisorRewardError, setAdvisorRewardError] = useState("");
  const advisorList = teamData?.allAgents?.length ? teamData.allAgents : (teamData?.agents ?? []);

  async function openAdvisorReward(draft: any) {
    const advisorInfo = advisorList.find((item: any) => item.agentCode === draft.advisorCode || item.advisor_code === draft.advisorCode);
    setSelectedAdvisorReward({ advisor: advisorInfo, draft, estimate: null });
    setAdvisorRewardLoading(true);
    setAdvisorRewardError("");
    try {
      const response = await fetch("/api/tvv-reward-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          advisor: {
            code: draft.advisorCode,
            name: advisorInfo?.agentName || advisorInfo?.full_name || "",
            group: advisorInfo?.groupName || advisorInfo?.group_name || "",
            ban: advisorInfo?.banName || advisorInfo?.ban_name || "",
            ads: advisorInfo?.adsName || advisorInfo?.ads_name || ""
          },
          draftContracts: [{
            id: draft.id,
            premium: Number(draft.ip) || 0,
            expectedPaidDate: draft.expectedPaidDate,
            expectedIssueDate: draft.expectedIssueDate || draft.expectedPaidDate,
            productName: "Hop dong du kien"
          }]
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Khong tinh duoc thuong TVV.");
      setSelectedAdvisorReward({ advisor: advisorInfo, draft, estimate: payload });
    } catch (error) {
      setAdvisorRewardError(error instanceof Error ? error.message : "Khong tinh duoc thuong TVV.");
    } finally {
      setAdvisorRewardLoading(false);
    }
  }

  async function calculate(nextDrafts = draftContracts) {
    setCalculating(true);
    try {
      const response = await fetch("/api/team-leader-rewards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, draftContracts: nextDrafts })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tính được thưởng.");
      setResult(payload);
    } finally { setCalculating(false); }
  }

  function addDraft() {
    const ip = parseMillionMoneyInput(ipText);
    if (!advisorCode) return setFormError("Vui lòng chọn TVV trước khi thêm hợp đồng dự kiến.");
    if (ip <= 0) return setFormError("Vui lòng nhập IP dự kiến lớn hơn 0.");
    if (!expectedPaidDate) return setFormError("Vui lòng chọn ngày thu phí.");
    setFormError("");
    const next = [...draftContracts, { id: crypto.randomUUID(), advisorCode, ip, expectedPaidDate, expectedIssueDate: expectedPaidDate, isNewAdvisor }];
    setDraftContracts(next);
    setIpText("");
    void calculate(next);
  }

  return <section className="tvv-calculator team-leader-calculator">
    <TvvSubHeader title="Mô phỏng thưởng Trưởng nhóm" onBack={onBack} />
    <section className="tvv-calc-card team-leader-entry-card">
      <div className="team-leader-entry-head"><div><h2>Thêm hợp đồng dự kiến</h2></div><span>Đơn vị: triệu đồng</span></div>
      <div className="team-leader-calc-form">
        <label><span>TVV</span><select value={advisorCode} onChange={(event) => { setAdvisorCode(event.target.value); if (formError) setFormError(""); }}><option value="">Chọn TVV</option>{advisorList.map((item: any) => <option key={item.agentCode} value={item.agentCode}>{item.agentName}{item.isNewAdvisor ? "  NEW" : ""}</option>)}</select></label>
        <label><span>IP dự kiến</span><input className="team-ip-input" value={ipText} onChange={(event) => { setIpText(millionInput(event.target.value)); if (formError) setFormError(""); }} placeholder="0" inputMode="numeric" /></label>
        <label className="team-date-field"><span>Ngày thu phí</span><div className="team-date-input"><strong>{formatDateVi(expectedPaidDate)}</strong><CalendarDays size={18} /><input type="date" value={expectedPaidDate} onChange={(event) => { setExpectedPaidDate(event.target.value); if (formError) setFormError(""); }} /></div></label>
      </div>
      {formError && <p className="team-form-error">{formError}</p>}
      <div className="team-leader-entry-foot"><button className="tvv-primary" type="button" onClick={addDraft}>+ Thêm và tính lại</button></div>
    </section>
    {draftContracts.length > 0 && <section className="tvv-calc-card"><h2>Hợp đồng dự kiến ({draftContracts.length})</h2>{draftContracts.map((draft) => {
      const advisorInfo = advisorList.find((item: any) => item.agentCode === draft.advisorCode || item.advisor_code === draft.advisorCode);
      return <article className="team-draft-contract" key={draft.id}><button className="team-draft-advisor-button" type="button" onClick={() => void openAdvisorReward(draft)}>{advisorInfo?.agentName || advisorInfo?.full_name || draft.advisorCode}</button><strong>{formatVnd(draft.ip)}</strong><button type="button" onClick={() => { const next = draftContracts.filter((item) => item.id !== draft.id); setDraftContracts(next); void calculate(next); }}><Trash2 size={16} /></button></article>;
    })}</section>}
    <section className="tvv-calc-card tvv-reward-summary-card team-calc-result"><h2>Kết quả mô phỏng</h2>{calculating ? <p>Đang tính…</p> : result ? <><TeamLeaderRewardSummaryCard rewards={result} baseline={baseline} /><div className="team-calc-increase"><span>Tăng thêm so với hiện tại</span><strong>+{formatVnd(Math.max(0, Number(result.totalEstimatedReward) - Number(baseline?.totalEstimatedReward || 0)))}</strong></div></> : <p>Chưa có kết quả.</p>}</section>
    {selectedAdvisorReward && <AdvisorRewardPopup data={selectedAdvisorReward} loading={advisorRewardLoading} error={advisorRewardError} onClose={() => setSelectedAdvisorReward(null)} />}
  </section>;
}

function AdvisorRewardPopup({ data, loading, error, onClose }: { data: any; loading: boolean; error: string; onClose: () => void }) {
  const estimate = data?.estimate;
  const advisor = data?.advisor ?? {};
  const draft = data?.draft ?? {};
  const programs = [...(estimate?.calculatorPrograms ?? [])]
    .filter((item: any) => item.programId !== "policy-month-13")
    .sort((a: any, b: any) => calculatorProgramOrder(a) - calculatorProgramOrder(b));
  const total = Number(estimate?.calculatorTotalEstimatedReward ?? 0);
  return <div className="tvv-contract-detail-backdrop advisor-reward-popup-backdrop" role="presentation" onClick={onClose}>
    <section className="tvv-contract-detail tvv-reward-summary-card advisor-reward-popup" role="dialog" aria-modal="true" aria-label="Thuong TVV du kien" onClick={(event) => event.stopPropagation()}>
      <header><div><p>THƯỞNG TVV DỰ KIẾN</p><h2>{advisor.agentName || advisor.full_name || draft.advisorCode || "TVV"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header>
      <div className="advisor-reward-meta"><span>IP dự kiến</span><strong>{formatVnd(Number(draft.ip || 0))}</strong><span>Ngày thu phí</span><strong>{formatDateVi(draft.expectedPaidDate)}</strong></div>
      {loading && <p className="tvv-empty">Đang tính thưởng TVV...</p>}
      {error && <p className="team-form-error">{error}</p>}
      {!loading && !error && <>
        <div className="tvv-total"><span>Tổng thu nhập dự kiến</span><strong>+{formatVnd(total)}</strong></div>
        <div className="tvv-result-table tvv-result-table-standalone">
          <div className="tvv-result-head"><span>Chương trình</span><span>Thưởng cộng thêm</span></div>
          {programs.map((item: any, index: number) => {
            const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
            const currentReward = Number(item.currentReward ?? 0);
            const projectedReward = currentReward + increase;
            const isGiftReward = item.rewardKind === "gift";
            const currentGift = item.currentGiftLabels?.join(" · ") || "Chưa đạt quà";
            const projectedGift = item.projectedGiftLabels?.join(" · ") || "Chưa đạt quà";
            return <div className={`tvv-result-row${item.isPolicyProjection ? " policy" : ""}${item.isCommission ? " commission" : ""}`} key={item.programId || index}>
              <div><span className={`tvv-result-icon tone-${index % 3}`}>{item.isPolicyProjection ? <ShieldCheck size={22} /> : item.isCommission ? <Calculator size={22} /> : index % 3 === 1 ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 52)}</b>{item.isCommission ? <AcquisitionCommissionBreakdown total={increase} /> : item.isPolicyProjection && <small>{item.period}</small>}</div>
              {item.isCommission ? null : <strong className="advisor-reward-breakdown">
                {isGiftReward ? <span className="gift-reward-breakdown">
                  <b>Hiện tại {currentGift},</b>
                  <em>{item.incrementalGiftLabels?.length ? "Nâng bậc quà" : "Giữ bậc quà"}, {projectedGift}</em>
                </span> : <>
                  <small>Hiện tại {formatVnd(currentReward)}</small>
                  <em className="new-reward">+{formatVnd(increase)}</em>
                  <em className="projected-reward">+{formatVnd(projectedReward)}</em>
                </>}
              </strong>}
            </div>;
          })}
        </div>
      </>}
    </section>
  </div>;
}

function Overview({ advisorCode, showRecruitment, stats, leaderboard, estimate, starViet, starVietWarning, onTab }: any) {
  const statItems = [
    ["Tổng HĐ", stats.total, "blue", "contracts"],
    ["Đã phát hành", stats.issued, "green", "contracts"],
    ["Chờ xử lý", stats.pending, "orange", "contracts"],
    ["Hết hiệu lực", stats.invalid, "red", "contracts"]
  ];
  return <section className="tvv-content">
    <div className="tvv-stat-card">{statItems.map(([label, value, tone, target]: any) => <div className="tvv-stat" role="button" tabIndex={0} key={label} onClick={() => onTab(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTab(target); } }} aria-label={`${label}: ${value}. Xem hợp đồng`}><strong className={`stat-${tone}`}>{value}</strong><p>{label}</p><i className={`stat-${tone}`} /></div>)}</div>
    <GuestInvitationHomeCard />
    {showRecruitment && <RecruitmentPreview onOpen={() => onTab("recruitment")} />}
    <LeaderboardPreview leaderboard={leaderboard} onOpen={() => onTab("leaderboard")} />
    <ContestPreview estimate={estimate} onAll={() => onTab("contests")} />
    {String(advisorCode || "").trim().toUpperCase() === "ADMIN" && <AboutBaoVietPreview onOpen={() => onTab("about")} />}
    <PersonalStarJourney row={starViet} warning={starVietWarning} />
    <ArchivePreview onOpen={() => onTab("archive")} />
  </section>;
}

function RecruitmentPreview({ onOpen }: { onOpen: () => void }) {
  return <button className="tvv-card tvv-recruitment-preview" type="button" onClick={onOpen}>
    <span className="tvv-recruitment-preview-icon"><img src="/Icon/recruitment-sign.png" alt="" /></span>
    <span className="tvv-leaderboard-preview-copy">
      <small>Mô phỏng thu nhập TVV mới và tuyển ngang</small>
    </span>
    <ChevronRight size={22} />
  </button>;
}

function initials(value: unknown) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word.charAt(0)).join("").toUpperCase() || "TV";
}

function RankingAvatar({ name, src, group = false }: { name: string; src?: string | null; group?: boolean }) {
  return <span className={`tvv-ranking-avatar${group ? " group" : ""}`}>
    {src ? <img src={src} alt={`Ảnh đại diện ${name}`} /> : group ? <Users size={20} /> : initials(name)}
  </span>;
}

function LeaderboardPreview({ leaderboard, onOpen }: any) {
  const leaders = (leaderboard?.agents ?? []).slice(0, 3);
  return <button className="tvv-card tvv-leaderboard-preview" type="button" onClick={onOpen}>
    <span className="tvv-leaderboard-preview-icon"><img src="/images/leaderboard-trophy.png" alt="" /></span>
    <span className="tvv-leaderboard-preview-copy">
      <strong>Bảng xếp hạng doanh thu</strong>
      <small>Tôn vinh những gương mặt dẫn đầu tháng</small>
      <span className="tvv-preview-avatars">
        {leaders.map((row: any) => <RankingAvatar key={row.agentCode || row.agentName} name={row.agentName} src={row.avatarUrl} />)}
      </span>
    </span>
    <ChevronRight size={22} />
  </button>;
}

function ArchivePreview({ onOpen }: { onOpen: () => void }) {
  return <button className="tvv-card tvv-archive-preview" type="button" onClick={onOpen}>
    <span className="tvv-archive-preview-icon"><FolderOpen size={30} /></span>
    <span className="tvv-leaderboard-preview-copy">
      <strong>Kho tài liệu</strong>
      <small>Mẫu biểu, hướng dẫn và tài liệu nghiệp vụ</small>
      <span className="tvv-archive-tags"><b>Mẫu biểu</b><b>Hướng dẫn</b><b>FAQ</b></span>
    </span>
    <ChevronRight size={22} />
  </button>;
}

function LeaderboardPage({ leaderboard, month }: any) {
  const [rankingView, setRankingView] = useState<"agents" | "groups">("agents");
  const agents = leaderboard?.agents ?? [];
  const groups = leaderboard?.groups ?? [];
  return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-leaderboard-page">
    <div className="tvv-ranking-tabs" role="tablist" aria-label={`Bảng xếp hạng ${monthLabel(month)}`}>
      <button type="button" role="tab" aria-selected={rankingView === "agents"} className={rankingView === "agents" ? "active" : ""} onClick={() => setRankingView("agents")}><UserRound size={18} />Top TVV</button>
      <button type="button" role="tab" aria-selected={rankingView === "groups"} className={rankingView === "groups" ? "active" : ""} onClick={() => setRankingView("groups")}><Users size={18} />Top nhóm</button>
    </div>
    {rankingView === "agents"
      ? <RankingSection title="Top 10 Tư vấn viên" subtitle="Những cá nhân xuất sắc nhất" rows={agents} />
      : <RankingSection title="Top 10 Nhóm" subtitle="Những tập thể bứt phá nhất" rows={groups} group />}
  </section>;
}

function RankingSection({ title, subtitle, rows, group = false }: { title: string; subtitle: string; rows: any[]; group?: boolean }) {
  return <section className="tvv-ranking-section">
    <header><Medal size={22} /><span><h3>{title}</h3><p>{subtitle}</p></span></header>
    {rows.length ? <div className="tvv-ranking-list">
      {rows.map((row) => {
        const name = group ? row.groupName || "Nhóm chưa xác định" : row.agentName || row.agentCode || "Tư vấn viên";
        return <article className={row.rank <= 3 ? `top-${row.rank}` : ""} key={group ? `${row.banName}-${row.groupName}` : row.agentCode || row.agentName}>
          <strong className="tvv-rank-number">{row.rank <= 3 ? <Crown size={18} /> : row.rank}</strong>
          <RankingAvatar name={name} src={row.avatarUrl} group={group} />
          <span className="tvv-ranking-name"><b>{name}</b><small>{group ? row.banName : row.groupName}</small></span>
          <span className="tvv-ranking-revenue"><b>{formatVnd(row.afyp)}</b><small>{row.contractCount} hợp đồng</small></span>
        </article>;
      })}
    </div> : <p className="tvv-empty">Chưa có dữ liệu xếp hạng trong kỳ này.</p>}
  </section>;
}

function PersonalStarJourney({ row, warning }: { row?: any; warning?: string | null }) {
  if (warning) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>Hành trình Sao Việt</h2></div><p>Chưa tải được dữ liệu Sao Việt.</p></section>;
  if (!row) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>Hành trình Sao Việt</h2></div><p>Chưa có dữ liệu Sao Việt của bạn trong tháng này.</p></section>;
  const progress = Math.max(0, Math.min(100, Number(row.progress ?? 0)));
  return <section className="tvv-card tvv-star-journey">
    <div className="tvv-star-title"><span><Sparkles size={17} /> Hành trình Sao Việt</span><em>{row.currentTickets > 0 ? `${row.currentTickets} vé` : row.currentRank}</em></div>
    <div className="tvv-star-main"><div><small>Tổng AFYP Sao Việt</small><strong>{formatVnd(row.totalAfyp)}</strong></div><img className="tvv-star-achievement-icon" src="/images/star-viet-achievement.png" alt="" /></div>
    <div className="tvv-star-progress"><div><span>Mốc tiếp theo</span><b>{row.remainingToNext > 0 ? row.nextRank : "Đã đạt mốc cao nhất"}</b></div><i><u style={{ width: `${progress}%` }} /></i><div><span>{progress.toFixed(1).replace(".0", "")}%</span>{row.remainingToNext > 0 && <b>Còn {formatVnd(row.remainingToNext)}</b>}</div></div>
  </section>;
}

function ContestPreview({ estimate, onAll }: any) {
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const programs = estimate?.ongoingPrograms?.length ? estimate.ongoingPrograms : estimate?.rewardByProgram ?? [];
  return <><section className="tvv-card tvv-contest-preview"><div className="tvv-section-head"><h2>Chương trình thi đua</h2><div><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div></div>{programs.length ? <div className="tvv-contest-list">{programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} compact onOpen={setSelectedProgram} />)}</div> : <p className="tvv-empty">Chưa có chương trình thi đua đang diễn ra.</p>}</section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function policyPeriodOptions(programId: string, monthOptions: Array<{ value: string; label: string }>) {
  return programId === "policy-quarterly" ? quarterOptionsUntilCurrent() : monthOptions;
}

function policyPickerValue(programId: string, month: string) {
  if (programId !== "policy-quarterly") return month;
  const quarter = Math.ceil(Number(month.slice(5, 7)) / 3);
  return `${month.slice(0, 4)}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}`;
}

function PolicyAwareContestList({ estimate, policyMonth, monthOptions, onPolicyMonthChange }: any) {
  const [view, setView] = useState<"ongoing" | "ended" | "policy">("ongoing");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const groups = {
    ongoing: estimate?.ongoingPrograms?.length ? estimate.ongoingPrograms : [],
    ended: [...(estimate?.endedPrograms ?? [])]
      .sort((a: any, b: any) => String(b.endDate ?? "").localeCompare(String(a.endDate ?? ""))),
    policy: estimate?.policyRewardPrograms ?? []
  };
  const totalReward = groups.policy.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0);
  const today = currentMonth() ? new Date().toISOString().slice(0, 10) : "";
  const soonEndingCount = groups.ongoing.filter((item: any) => {
    const end = String(item.endDate ?? "");
    if (!end || !today) return false;
    const diff = (new Date(`${end}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const tabs = [
    ["ongoing", `Đang diễn ra (${groups.ongoing.length})`, groups.ongoing],
    ["ended", `Đã kết thúc (${groups.ended.length})`, groups.ended],
    ["policy", "Thưởng chính sách", groups.policy]
  ] as const;
  const programs = groups[view] ?? [];
  useEffect(() => {
    if (!selectedProgram || !Array.isArray(selectedProgram.rows)) return;
    const nextProgram = groups.policy.find((item: any) => item.programId === selectedProgram.programId);
    if (nextProgram && nextProgram !== selectedProgram) setSelectedProgram(nextProgram);
  }, [groups.policy, selectedProgram]);
  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page">
    <section className="tvv-contest-summary"><h2>Tổng quan thi đua</h2><div><span><b>Đang diễn ra</b><strong>{groups.ongoing.length}</strong><em>chương trình</em></span><span><b>Sắp kết thúc</b><strong>{soonEndingCount}</strong><em>chương trình</em></span><span><b>Ước tính thưởng</b><strong>{formatVnd(totalReward)}</strong><em>Tổng có thể nhận</em></span></div></section>
    <div className="tvv-contest-filter">{tabs.map(([id, label, rows]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{label}</span><strong>{formatVnd(rows.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0))}</strong></button>)}</div>
    <section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <PolicyAwareContestRow key={item.programId} item={item} index={index} status={view} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : view === "ended" ? "Chưa có chương trình thi đua đã kết thúc." : "Chưa có thưởng chính sách."}</p>}</section>
    <p className="tvv-contest-note"><Info size={17} /><span>Ước tính thưởng được cập nhật dựa trên dữ liệu hiện tại. Mức thưởng chính thức sẽ được xác nhận khi chương trình kết thúc.</span></p>
  </section>{selectedProgram && <ContestDetailModal item={selectedProgram} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onClose={() => setSelectedProgram(null)} />}</>;
}

function PolicyAwareContestRow({ item, status, onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className="tvv-contest-row" role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}>
    <div>
      <em className={`contest-status contest-status-${isPolicy ? "policy" : status === "ended" ? "ended" : "ongoing"}`}>{isPolicy ? "THƯỞNG CHÍNH SÁCH" : status === "ended" ? "ĐÃ KẾT THÚC" : "ĐANG DIỄN RA"}</em>
      <b>{shortText(item.programName, 74)}</b>
      <small><CalendarDays size={14} />{isPolicy ? item.period : `${formatDateVi(item.startDate)} - ${formatDateVi(item.endDate)}`}</small>
      {hasReward && !isPolicy && <><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HĐ đủ điều kiện</small></>}
    </div>
    {(hasReward || isPolicy) && <strong>{formatVnd(item.estimatedReward)}</strong>}
    <ChevronRight size={24} />
  </article>;
}

function ContestList({ estimate }: any) {
  const [view, setView] = useState<"ongoing" | "ended" | "policy">("ongoing");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const groups = {
    ongoing: estimate?.ongoingPrograms?.length ? estimate.ongoingPrograms : [],
    ended: [...(estimate?.endedPrograms ?? [])]
      .sort((a: any, b: any) => String(b.endDate ?? "").localeCompare(String(a.endDate ?? ""))),
    policy: estimate?.policyRewardPrograms ?? []
  };
  const totalReward = groups.policy.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0);
  const today = currentMonth() ? new Date().toISOString().slice(0, 10) : "";
  const soonEndingCount = groups.ongoing.filter((item: any) => {
    const end = String(item.endDate ?? "");
    if (!end || !today) return false;
    const diff = (new Date(`${end}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const tabs = [
    ["ongoing", `Đang diễn ra (${groups.ongoing.length})`, groups.ongoing],
    ["ended", `Đã kết thúc (${groups.ended.length})`, groups.ended],
    ["policy", "Thưởng chính sách", groups.policy]
  ] as const;
  const programs = groups[view] ?? [];
  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page"><section className="tvv-contest-summary"><h2>Tổng quan thi đua</h2><div><span><b>Đang diễn ra</b><strong>{groups.ongoing.length}</strong><em>chương trình</em></span><span><b>Sắp kết thúc</b><strong>{soonEndingCount}</strong><em>chương trình</em></span><span><b>Ước tính thưởng</b><strong>{formatVnd(totalReward)}</strong><em>Tổng có thể nhận</em></span></div></section><div className="tvv-contest-filter">{tabs.map(([id, label, rows]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{label}</span><strong>{formatVnd(rows.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0))}</strong></button>)}</div><section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} status={view} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : view === "ended" ? "Chưa có chương trình thi đua đã kết thúc." : "Chưa có thưởng chính sách."}</p>}</section><p className="tvv-contest-note"><Info size={17} /><span>Ước tính thưởng được cập nhật dựa trên dữ liệu hiện tại. Mức thưởng chính thức sẽ được xác nhận khi chương trình kết thúc.</span></p></section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function ContestRow({ item, index, compact = false, status = "ongoing", onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className={`tvv-contest-row${compact ? " compact" : ""}`} role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}><div><em className={`contest-status contest-status-${isPolicy ? "policy" : status === "ended" ? "ended" : "ongoing"}`}>{isPolicy ? "THƯỞNG CHÍNH SÁCH" : status === "ended" ? "ĐÃ KẾT THÚC" : "ĐANG DIỄN RA"}</em><b>{shortText(item.programName, compact ? 62 : 74)}</b><small><CalendarDays size={14} />{isPolicy ? item.period : `${formatDateVi(item.startDate)} - ${formatDateVi(item.endDate)}`}</small>{hasReward && !compact && !isPolicy && <><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HĐ đủ điều kiện</small></>}</div>{(hasReward || isPolicy) && !compact && <strong>{formatVnd(item.estimatedReward)}</strong>}<ChevronRight size={24} /></article>;
}

function contestNextMilestones(item: any) {
  if (item.milestoneType === "team-policy" && item.teamPolicy) {
    return {
      basisLabel: item.teamPolicy.basisLabel || "Tiến độ nhóm",
      currentBasis: Number(item.teamPolicy.currentBasis ?? 0),
      currentReward: Number(item.teamPolicy.currentReward ?? item.estimatedReward ?? 0),
      currentRate: 0,
      currentRateLabel: item.teamPolicy.currentRateLabel || "",
      nextTiers: Array.isArray(item.teamPolicy.nextTiers) ? item.teamPolicy.nextTiers : []
    };
  }

  if (item.isCommission) {
    const reward = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
    return {
      basisLabel: "Phí đóng",
      currentBasis: reward / ACQUISITION_COMMISSION_TOTAL_RATE,
      currentReward: reward,
      currentRate: 0,
      currentRateLabel: formatRate(ACQUISITION_COMMISSION_TOTAL_RATE),
      nextTiers: [
        {
          title: "Hoa hồng hợp đồng hiện tại",
          subtitle: acquisitionCommissionLabel(),
          missing: 0,
          missingLabel: "hợp đồng",
          estimatedContracts: 1,
          projectedReward: reward,
          incrementalReward: 0
        }
      ]
    };
  }

  if (item.milestoneType === "revenue-tier" && Array.isArray(item.milestoneTiers)) {
    const basisValue = Number(item.milestoneCurrentBasis ?? 0);
    const currentReward = Number(item.milestoneCurrentReward ?? item.estimatedReward ?? 0);
    const metricLabel = item.milestoneMetricLabel || "Doanh thu";
    const contractCount = Math.max(1, Number(item.milestoneContractCount ?? 1));
    const averageContract = basisValue > 0 ? basisValue / contractCount : 0;
    const tierMinimum = (tier: any) => Number(
      tier.min ?? tier.min_value ?? tier.min_pdt ?? tier.min_ip ?? tier.min_revenue
      ?? tier.min_group_revenue ?? tier.threshold ?? tier.threshold_value ?? tier.minimum ?? 0
    );
    const tierGiftLabel = (tier: any) => normalizeCompetitionGiftLabel(tier.gift_name ?? tier.prize_name ?? tier.reward_name);
    const tierReward = (tier: any, value: number) => {
      const rate = Number(tier.reward_rate ?? 0);
      const percent = Number(String(tier.reward_percent ?? "").replace("%", "").replace(",", ".")) || 0;
      const formulaMatch = String(tier.reward_formula ?? "").match(/(\d+(?:[.,]\d+)?)\s*%/);
      const formulaPercent = formulaMatch ? Number(formulaMatch[1].replace(",", ".")) : 0;
      if (rate > 0) return value * rate;
      if (percent > 0) return value * percent / 100;
      if (formulaPercent > 0) return value * formulaPercent / 100;
      return Number(tier.reward_amount ?? tier.rewardAmount ?? tier.amount ?? 0) || 0;
    };
    const sortedTiers = [...item.milestoneTiers].sort((a: any, b: any) =>
      tierMinimum(a) - tierMinimum(b)
    );
    const currentTier = [...sortedTiers].reverse().find((tier: any) => basisValue >= tierMinimum(tier));
    const nextTiers = sortedTiers
      .filter((tier: any) => basisValue < tierMinimum(tier))
      .slice(0, 2)
      .map((tier: any) => {
        const minimum = tierMinimum(tier);
        const missing = Math.max(0, minimum - basisValue);
        const projectedReward = tierReward(tier, minimum);
        const projectedGiftLabel = tierGiftLabel(tier);
        return {
          title: `${metricLabel} đạt ${formatCompactVnd(minimum)}`,
          subtitle: projectedGiftLabel || tier.note || tier.reward_formula || "Bậc thưởng tiếp theo",
          missing,
          missingLabel: metricLabel,
          estimatedContracts: averageContract > 0 ? Math.max(1, Math.ceil(missing / averageContract)) : 0,
          projectedReward,
          projectedGiftLabel,
          incrementalReward: Math.max(0, projectedReward - currentReward)
        };
      });
    const currentRateMatch = String(currentTier?.reward_formula ?? "").match(/(\d+(?:[.,]\d+)?)\s*%/);
    return {
      basisLabel: metricLabel,
      currentBasis: basisValue,
      currentReward,
      currentRate: currentRateMatch ? Number(currentRateMatch[1].replace(",", ".")) / 100 : 0,
      currentRateLabel: currentRateMatch ? `${currentRateMatch[1]}%` : "",
      nextTiers
    };
  }

  const policyRow = Array.isArray(item.rows) ? item.rows[0] : null;
  if (policyRow) {
    if (item.programId === "policy-month-13") {
      const achievedQuarters = Array.isArray(policyRow.achievedQuarters) ? policyRow.achievedQuarters.length : 0;
      return {
        basisLabel: "Quý đạt",
        currentBasis: achievedQuarters,
        currentReward: Number(policyRow.reward || item.estimatedReward || 0),
        currentRate: 0,
        currentRateLabel: "",
        policyRow,
        nextTiers: []
      };
    }
    const tiers = item.programId === "policy-quarterly" ? POLICY_QUARTER_TIERS : item.programId === "policy-monthly" ? POLICY_MONTH_TIERS : [];
    const basisLabel = item.programId === "policy-quarterly" ? "FYP quý" : "IP tháng";
    const basisValue = item.programId === "policy-quarterly"
      ? Number(policyRow.qualificationFyp ?? (policyRow.fypFallback ? policyRow.totalFyc : policyRow.fyp))
      : Number(policyRow.ip);
    const currentTotalFyc = Number(policyRow.totalFyc || 0);
    const currentReward = Number(policyRow.reward || item.estimatedReward || 0);
    const averageContract = Math.max(
      1,
      Math.round(Number(policyRow.ip || policyRow.fyp || policyRow.totalFyc || 0) / Math.max(1, Number(policyRow.contractCount || policyRow.contract_count || 1)))
    );
    const nextTiers = tiers
      .filter((tier) => basisValue < tier.minimum)
      .slice(0, 2)
      .map((tier) => {
        const missing = Math.max(0, tier.minimum - basisValue);
        const estimatedContracts = Math.max(1, Math.ceil(missing / averageContract));
        const projectedTotalFyc = currentTotalFyc + missing * 0.3;
        const projectedReward = projectedTotalFyc * tier.rate;
        return {
          title: `${basisLabel} đạt ${formatCompactVnd(tier.minimum)}`,
          subtitle: `Bậc thưởng ${formatRate(tier.rate)}`,
          missing,
          missingLabel: basisLabel,
          estimatedContracts,
          projectedReward,
          incrementalReward: Math.max(0, projectedReward - currentReward)
        };
      });
    return {
      basisLabel,
      currentBasis: basisValue,
      currentReward,
      currentRate: Number(policyRow.rate || 0),
      currentRateLabel: Number(policyRow.rate || 0) > 0 ? formatRate(policyRow.rate) : "0%",
      policyRow,
      nextTiers
    };
  }

  const matchedCount = Math.max(0, Number(item.actualContractCount ?? item.matchedContracts?.length ?? 0));
  const reward = Number(item.estimatedReward || 0);
  const averageReward = matchedCount > 0 && reward > 0 ? reward / matchedCount : 0;
  const currentIp = Math.max(0, Number(item.milestoneCurrentIp ?? item.milestoneCurrentBasis ?? 0));
  const averageIp = matchedCount > 0 ? currentIp / matchedCount : 0;
  const nextTiers = item.isEligible ? [] : [1, 2].map((step) => ({
    title: averageIp > 0 ? `IP đạt ${formatCompactVnd(currentIp + averageIp * step)}` : "Mốc IP tiếp theo",
    subtitle: averageReward > 0 ? "Minh họa theo thưởng bình quân hiện tại" : "Cần đối chiếu điều kiện chương trình",
    missing: averageIp * step,
    missingLabel: "IP",
    estimatedContracts: step,
    projectedReward: averageReward > 0 ? reward + averageReward * step : 0,
    incrementalReward: averageReward > 0 ? averageReward * step : 0
  }));
  return {
    basisLabel: "IP",
    currentBasis: currentIp,
    currentReward: reward,
    currentRate: 0,
    currentRateLabel: "",
    nextTiers
  };
}

function ContestDetailModal({ item, onClose, policyMonth, monthOptions = [], onPolicyMonthChange }: { item: any; onClose: () => void; policyMonth?: string; monthOptions?: Array<{ value: string; label: string }>; onPolicyMonthChange?: (value: string) => void }) {
  const [detailTab, setDetailTab] = useState<"overview" | "achieved" | "missing" | "quarters" | "formula">("overview");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const policyRows = Array.isArray(item.rows) ? item.rows : null;
  const policyOptions = policyRows && policyMonth && onPolicyMonthChange ? policyPeriodOptions(item.programId, monthOptions) : [];
  const milestoneInfo = contestNextMilestones(item);
  const isGiftReward = item.rewardKind === "gift";
  const giftRewardLabel = Array.isArray(item.giftLabels) && item.giftLabels.length > 0 ? item.giftLabels.join(" · ") : "Quà tặng";
  const tabs = policyRows ? [
    ["overview", "Tổng quan"]
  ] as Array<[typeof detailTab, string]> : [];
  const visibleRows = detailTab === "achieved" ? policyRows?.filter((row: any) => row.achieved)
    : detailTab === "missing" ? policyRows?.filter((row: any) => !row.achieved) : policyRows;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewUrl) setPreviewUrl(null);
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, previewUrl]);
  return <div className="tvv-contest-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contest-detail" role="dialog" aria-modal="true" aria-label="Nội dung chương trình thi đua" onClick={(event) => event.stopPropagation()}>
    <header><div>{policyOptions.length ? <div className="tvv-policy-modal-period"><MonthPicker value={policyPickerValue(item.programId, policyMonth!)} options={policyOptions} onChange={onPolicyMonthChange!} ariaLabel="Chọn kỳ thưởng chính sách" /></div> : <em>{item.period || "ĐANG DIỄN RA"}</em>}<h2>{item.programName || "Chương trình thi đua"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header>
    {!policyRows && !item.isTeamPolicy && <p className="tvv-contest-detail-date">
      <span><CalendarDays size={17} />{formatDateVi(item.startDate)} - {formatDateVi(item.endDate)}</span>
      {item.issueDeadline && <span className="tvv-contest-issue-deadline">Phát hành đến {formatDateVi(item.issueDeadline)}</span>}
    </p>}
    {policyRows && tabs.length > 1 && <nav className="tvv-policy-detail-tabs">{tabs.map(([id, label]) => <button type="button" className={detailTab === id ? "active" : ""} key={id} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>}
    {(item.originalFileUrl || (!policyRows && !item.isTeamPolicy)) && <div className="tvv-contest-poster">
      {item.originalFileUrl ? <button type="button" onClick={() => setPreviewUrl(item.originalFileUrl)} aria-label={`Xem poster ${item.programName || "chương trình thi đua"}`}>
        <img src={item.originalFileUrl} alt={`Poster ${item.programName || "chương trình thi đua"}`} />
      </button> : <div className="tvv-contest-poster-empty">Chưa có ảnh</div>}
    </div>}
    {item.notEligible && <p className="tvv-policy-warning"><Info size={16} />{item.eligibilityNote}</p>}
    {!item.infoOnly && !item.notEligible && (!policyRows || detailTab === "overview") && <div className="tvv-current-tier-card">
      <span>{item.isTeamPolicy ? milestoneInfo.basisLabel : "Hiện tại"}</span>
      <strong>{milestoneInfo.basisLabel === "hợp đồng" || milestoneInfo.basisLabel === "HĐ đủ điều kiện" ? `${milestoneInfo.currentBasis} HĐ` : milestoneInfo.basisLabel === "TVV mới HĐC" ? `${milestoneInfo.currentBasis} TVV` : milestoneInfo.basisLabel === "Quý đạt" ? `${milestoneInfo.currentBasis}/4 quý` : formatCompactVnd(milestoneInfo.currentBasis)}</strong>
      {milestoneInfo.currentRateLabel && <em>Bậc hiện tại: {milestoneInfo.currentRateLabel}</em>}
      {item.isTeamPolicy && Array.isArray(item.teamPolicy?.breakdown) && item.teamPolicy.breakdown.length > 0 && <div className={`tvv-policy-current-breakdown${item.programId === "team-policy-recruitment" ? " is-compact" : ""}`}>
        {item.teamPolicy.breakdown.map((row: any) => <article key={row.label}><span>{row.label}</span><strong>{row.value}</strong></article>)}
      </div>}
      {policyRows && milestoneInfo.policyRow && <div className="tvv-policy-current-breakdown">
        <article><span>{item.programId === "policy-month-13" ? "Số quý đã đạt" : item.programId === "policy-quarterly" ? "FYP thực đạt" : "IP tháng"}</span><strong>{item.programId === "policy-month-13" ? `${Array.isArray(milestoneInfo.policyRow.achievedQuarters) ? milestoneInfo.policyRow.achievedQuarters.length : 0}/4 quý` : formatVnd(Number(item.programId === "policy-quarterly" ? milestoneInfo.policyRow.actualFyp ?? milestoneInfo.policyRow.fyp : milestoneInfo.policyRow.ip ?? 0))}</strong></article>
        {item.programId === "policy-quarterly" && Number(milestoneInfo.policyRow.newAdvisorFactor ?? 1) > 1 && <article><span>FYP xét thưởng</span><strong>{formatVnd(Number(milestoneInfo.policyRow.qualificationFyp ?? 0))}<small>Hệ số {Number(milestoneInfo.policyRow.newAdvisorFactor).toFixed(2)}x</small></strong></article>}
        <article><span>Tổng FYC</span><strong>{formatVnd(Number(milestoneInfo.policyRow.totalFyc ?? 0))}</strong></article>
        <article className="reward"><span>Thưởng tạm tính</span><strong>{formatVnd(Number(milestoneInfo.policyRow.reward ?? item.estimatedReward ?? 0))}</strong></article>
      </div>}
      {!policyRows && Number(item.estimatedReward ?? 0) > 0 && <div className="tvv-current-tier-reward">
        <span>{isGiftReward ? "Quà đang đạt" : "Ước tính thưởng"}</span>
        <strong>{isGiftReward ? <><Gift size={18} />{giftRewardLabel}</> : formatVnd(Number(item.estimatedReward))}</strong>
      </div>}
      {!policyRows && isGiftReward && Number(item.estimatedReward ?? 0) <= 0 && <div className="tvv-current-tier-reward is-gift">
        <span>Quà đang đạt</span>
        <strong><Gift size={18} />{giftRewardLabel}</strong>
      </div>}
      {!policyRows && Array.isArray(item.participatingContracts) && item.participatingContracts.length > 0 && <div className="tvv-current-contracts">
        {item.participatingContracts.map((contract: any, index: number) => <article key={`${contract.applicationNo}-${index}`}>
          <div><b>{contract.advisorName || contract.policyOwner}</b><small>GYC {contract.applicationNo || "—"}</small></div>
          <span>{contract.status}</span>
        </article>)}
      </div>}
    </div>}
    {!policyRows && item.teamScoped && <div className="tvv-team-achieved-advisors">
      <div className="tvv-team-achieved-head"><span>TVV trong nhóm đang đạt</span><strong>{item.achievedAdvisors?.length || 0} TVV</strong></div>
      {Array.isArray(item.achievedAdvisors) && item.achievedAdvisors.length > 0
        ? <div>{item.achievedAdvisors.map((advisor: any, index: number) => <article key={advisor.advisorCode || `${advisor.advisorName}-${index}`}>
          <span className="tvv-team-achieved-rank">{index + 1}</span>
          <div><b>{advisor.advisorName}</b><small>{advisor.advisorCode || "Chưa có mã"} · {advisor.contractCount || 0} HĐ</small></div>
          <span><b>{isGiftReward ? (advisor.giftLabels?.length ? <><Gift size={15} />{advisor.giftLabels.join(" · ")}</> : "Đạt điều kiện") : formatVnd(Number(advisor.reward || 0))}</b><small>IP {formatCompactVnd(Number(advisor.totalIP || 0))}</small></span>
        </article>)}</div>
        : <p className="tvv-empty">Chưa có TVV nào trong nhóm đạt chương trình này.</p>}
    </div>}
    {!item.infoOnly && !item.notEligible && !item.teamScoped && (!policyRows || detailTab === "overview") && <div className="tvv-next-milestones">
      <div className="tvv-next-milestones-head">
        <span>Mốc tiếp theo</span>
      </div>
      {milestoneInfo.nextTiers.length ? <div className="tvv-next-milestone-grid">{milestoneInfo.nextTiers.map((tier: any) => (
        <article key={`${tier.title}-${tier.subtitle}`}>
          <div>
            <b>{tier.title}</b>
            <small>{tier.subtitle}</small>
          </div>
          <p>Cần thêm <strong>{tier.missingLabel === "hợp đồng" ? `${tier.missing} HĐ` : String(tier.missingLabel).includes("TVV") ? tier.missing : formatCompactFee(tier.missing)}</strong>{tier.missingLabel !== "hợp đồng" && ` ${tier.missingLabel}`}</p>
          {tier.incrementalReward > 0 && <em>+{formatVnd(tier.incrementalReward)} so với hiện tại</em>}
          <footer><span>{tier.projectedGiftLabel ? "Quà dự kiến" : "Dự kiến thưởng"}</span><strong>{tier.projectedGiftLabel || (tier.projectedReward > 0 ? formatVnd(tier.projectedReward) : "Chưa đủ dữ liệu")}</strong></footer>
        </article>
      ))}</div> : <p className="tvv-empty">{item.isTeamPolicy ? "Nhóm đã ở mốc cao nhất hiện có của chính sách này." : "Bạn đang ở đỉnh cao của CTTĐ này rồi."}</p>}
    </div>}
    {policyRows && ["achieved", "missing", "quarters"].includes(detailTab) && <div className="tvv-policy-agent-list">
      {(visibleRows ?? []).map((row: any) => <article key={row.agentCode}><div><b>{row.agentName}</b><small>{row.agentCode} · {row.group || row.ban}</small></div><span>{detailTab === "quarters" ? `Quý ${(row.achievedQuarters ?? []).join(", ") || "—"}` : formatVnd(row.reward)}</span></article>)}
      {!visibleRows?.length && <p className="tvv-empty">Chưa có TVV trong danh sách này.</p>}
    </div>}
    {(item.warnings ?? []).map((warning: string) => <p className="tvv-policy-warning" key={warning}><Info size={16} />{warning}</p>)}
    {previewUrl && createPortal(<div className="tvv-poster-lightbox" role="presentation" onClick={() => setPreviewUrl(null)}>
      <button type="button" onClick={() => setPreviewUrl(null)} aria-label="Đóng ảnh"><X size={22} /></button>
      <img src={previewUrl} alt={`Poster ${item.programName || "chương trình thi đua"}`} onClick={(event) => event.stopPropagation()} />
    </div>, document.body)}
  </section></div>;
}

function ContractsListV2({ contracts, month, monthOptions, periodMode, onPeriodModeChange, onMonthChange, onOpenContract, showAdvisorFilter = false, showGroupFilter = false }: any) {
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "pending" | "refunded">("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedAdvisorKey, setSelectedAdvisorKey] = useState("all");
  const [selectedAdvisorSnapshot, setSelectedAdvisorSnapshot] = useState<{ key: string; code: string; name: string; group?: string } | null>(null);
  const [advisorMenuOpen, setAdvisorMenuOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const advisorMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const groupOptions = useMemo(() => [...new Set<string>(contracts.map((row: any) => String(row.group_name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [contracts]);
  const groupScopedContracts = selectedGroup === "all" ? contracts : contracts.filter((row: any) => row.group_name === selectedGroup);
  const advisorOptions = useMemo(() => {
    const values = new Map<string, { key: string; code: string; name: string; group: string }>();
    groupScopedContracts.forEach((row: any) => {
      const code = String(row.agent_code || "").trim();
      const name = String(row.agent_name || "TVV").trim();
      const key = code || name;
      if (key && !values.has(key)) values.set(key, { key, code, name, group: String(row.group_name || "") });
    });
    return [...values.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [groupScopedContracts]);
  const visibleAdvisorOptions = selectedAdvisorSnapshot
    && selectedAdvisorKey !== "all"
    && !advisorOptions.some((option) => option.key === selectedAdvisorKey)
    ? [selectedAdvisorSnapshot, ...advisorOptions]
    : advisorOptions;
  const selectedAdvisor = visibleAdvisorOptions.find((option) => option.key === selectedAdvisorKey);
  useEffect(() => {
    if (!advisorMenuOpen && !groupMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!advisorMenuRef.current?.contains(event.target as Node)) setAdvisorMenuOpen(false);
      if (!groupMenuRef.current?.contains(event.target as Node)) setGroupMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [advisorMenuOpen, groupMenuOpen]);

  function selectGroup(group: string) {
    setSelectedGroup(group);
    setSelectedAdvisorKey("all");
    setSelectedAdvisorSnapshot(null);
    setStatusFilter("all");
    setGroupMenuOpen(false);
  }

  function selectAdvisor(key: string) {
    setSelectedAdvisorKey(key);
    setSelectedAdvisorSnapshot(key === "all" ? null : advisorOptions.find((option) => option.key === key) ?? selectedAdvisorSnapshot);
    setStatusFilter("all");
    setAdvisorMenuOpen(false);
  }
  const advisorScopedContracts = selectedAdvisorKey === "all"
    ? groupScopedContracts
    : groupScopedContracts.filter((row: any) => String(row.agent_code || row.agent_name || "").trim() === selectedAdvisorKey);
  const filteredContracts = statusFilter === "all" ? advisorScopedContracts : advisorScopedContracts.filter((row: any) => contractStatusGroup(row) === statusFilter);
  const totalIp = advisorScopedContracts.reduce((sum: number, row: any) => sum + contractIpValue(row), 0);
  const periodOptions = periodMode === "year" ? yearOptionsUntilCurrent() : periodMode === "quarter" ? quarterOptionsUntilCurrent() : monthOptions;
  const issued = advisorScopedContracts.filter((row: any) => contractStatusGroup(row) === "issued").length;
  const pending = advisorScopedContracts.filter((row: any) => contractStatusGroup(row) === "pending").length;
  const refunded = advisorScopedContracts.filter((row: any) => contractStatusGroup(row) === "refunded").length;
  const selectedIndex = periodOptions.findIndex((option: any) => option.value === month);
  const periodTitle = periodMode === "year" ? `Năm ${month.slice(0, 4)}` : periodMode === "quarter" ? quarterLabel(month) : monthLabel(month);

  function selectPeriodMode(mode: PeriodMode) {
    onPeriodModeChange(mode);
    if (mode === "year") {
      onMonthChange(`${month.slice(0, 4)}-01`);
      return;
    }
    if (mode === "quarter") {
      const quarter = Math.ceil(Number(month.slice(5, 7)) / 3);
      onMonthChange(`${month.slice(0, 4)}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}`);
    }
  }

  function movePeriod(direction: number) {
    const next = periodOptions[selectedIndex + direction];
    if (next) onMonthChange(next.value);
  }

  const filters = [
    ["all", "Tất cả", advisorScopedContracts.length, "blue"],
    ["issued", "Đã phát hành", issued, "green"],
    ["pending", "Chờ phát hành", pending, "orange"],
    ["refunded", "Hoàn phí", refunded, "red"]
  ];

  return <section className={`tvv-content tvv-contract-template${showGroupFilter ? " board-contract-template" : ""}`}>
    <div className="ct-period-tabs" role="tablist" aria-label="Chọn kỳ dữ liệu">
      {(["month", "quarter", "year"] as PeriodMode[]).map((mode) => <button key={mode} type="button" role="tab" aria-selected={periodMode === mode} onClick={() => selectPeriodMode(mode)}><CalendarDays size={16} />{mode === "month" ? "Tháng" : mode === "quarter" ? "Quý" : "Năm"}</button>)}
    </div>
    <div className="ct-period-nav">
      <button type="button" disabled={selectedIndex < 0 || selectedIndex === periodOptions.length - 1} onClick={() => movePeriod(1)} aria-label="Kỳ trước"><ChevronLeft size={22} /></button>
      <MonthPicker className="ct-month-picker" value={month} options={periodOptions} onChange={onMonthChange} ariaLabel="Chọn kỳ hợp đồng" />
      <button type="button" disabled={selectedIndex <= 0} onClick={() => movePeriod(-1)} aria-label="Kỳ sau"><ChevronRight size={22} /></button>
    </div>
    <div className="ct-summary">
      <article><span>IP {periodMode === "month" ? "tháng" : periodMode === "quarter" ? "quý" : "năm"}</span><i><BarChart3 size={20} /></i><strong>{formatVnd(totalIp)}</strong></article>
      <article><span>Số hợp đồng</span><i><FileText size={19} /></i><strong>{advisorScopedContracts.length}</strong></article>
    </div>
    <div className="ct-status-tabs" role="tablist" aria-label="Lọc trạng thái hợp đồng">
      {filters.map(([id, label, count, tone]: any) => <button key={id} type="button" role="tab" aria-selected={statusFilter === id} onClick={() => setStatusFilter(id)}><b className={tone} />{label} ({count})</button>)}
    </div>
    <section className="ct-contract-list">
      <header>
        <h2>Danh sách hợp đồng</h2>
        <div className="ct-contract-list-actions">
          {!showGroupFilter && <span>{filteredContracts.length} HĐ</span>}
          {showGroupFilter && <div className="ct-advisor-dropdown ct-group-filter" ref={groupMenuRef}>
            <button type="button" className="ct-advisor-filter ct-group-filter-button" aria-label="Chọn nhóm để lọc hợp đồng" aria-haspopup="listbox" aria-expanded={groupMenuOpen} onClick={() => { setGroupMenuOpen((open) => !open); setAdvisorMenuOpen(false); }}>
              <Users size={15} /><span>{selectedGroup === "all" ? "Tất cả nhóm" : selectedGroup}</span><ChevronDown size={14} />
            </button>
            {groupMenuOpen && <div className="ct-advisor-menu ct-group-menu" role="listbox" aria-label="Danh sách nhóm">
              <div className="ct-advisor-menu-head"><span>Chọn nhóm</span><small>{groupOptions.length} nhóm</small></div>
              <button type="button" role="option" aria-selected={selectedGroup === "all"} onClick={() => selectGroup("all")}>
                <span className="ct-advisor-avatar all"><Users size={15} /></span><span><b>Tất cả nhóm</b><small>Xem toàn bộ hợp đồng</small></span>{selectedGroup === "all" && <Check size={16} />}
              </button>
              {groupOptions.map((group) => <button type="button" role="option" aria-selected={selectedGroup === group} key={group} onClick={() => selectGroup(group)}>
                <span className="ct-advisor-avatar">{group.slice(0, 1).toLocaleUpperCase("vi")}</span><span><b>{group}</b></span>{selectedGroup === group && <Check size={16} />}
              </button>)}
            </div>}
          </div>}
          {showAdvisorFilter && <div className="ct-advisor-dropdown" ref={advisorMenuRef}>
            <button type="button" className="ct-advisor-filter" aria-label="Chọn TVV để lọc hợp đồng" aria-haspopup="listbox" aria-expanded={advisorMenuOpen}
              onClick={() => setAdvisorMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setAdvisorMenuOpen(false);
                if (event.key === "ArrowDown") setAdvisorMenuOpen(true);
              }}>
              <Users size={15} />
              <span>{selectedAdvisor?.name || "Tất cả TVV"}</span>
              <ChevronDown size={14} />
            </button>
            {advisorMenuOpen && <div className="ct-advisor-menu" role="listbox" aria-label="Danh sách TVV">
              <div className="ct-advisor-menu-head"><span>Chọn tư vấn viên</span><small>{advisorOptions.length} TVV</small></div>
              <button type="button" role="option" aria-selected={selectedAdvisorKey === "all"} onClick={() => selectAdvisor("all")}>
                <span className="ct-advisor-avatar all"><Users size={15} /></span>
                <span><b>Tất cả TVV</b><small>Xem toàn bộ hợp đồng</small></span>
                {selectedAdvisorKey === "all" && <Check size={16} />}
              </button>
              {visibleAdvisorOptions.map((option) => <button type="button" role="option" aria-selected={selectedAdvisorKey === option.key} key={option.key} onClick={() => selectAdvisor(option.key)}>
                <span className="ct-advisor-avatar">{option.name.slice(0, 1).toLocaleUpperCase("vi")}</span>
                <span><b>{option.name}</b><small>{option.group ? `${option.group} · ` : ""}{option.code || "Chưa có mã TVV"}</small></span>
                {selectedAdvisorKey === option.key && <Check size={16} />}
              </button>)}
            </div>}
          </div>}
        </div>
      </header>
      {filteredContracts.length ? filteredContracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} hideCustomerName={showAdvisorFilter} />) : <p className="ct-empty">Chưa có hợp đồng trong {periodTitle.toLowerCase()}.</p>}
    </section>
  </section>;
}

function ContractPreview({ contracts, onAll, onOpenContract }: any) {
  return <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div>{contracts.length ? contracts.slice(0, 5).map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">Chưa có hợp đồng trong tháng này.</p>}</section>;
}

function ContractsList({ contracts, month, monthOptions, periodMode, onPeriodModeChange, onMonthChange, onOpenContract }: any) {
  const totalIp = contracts.reduce((sum: number, row: any) => sum + contractIpValue(row), 0);
  const totalAfyp = contracts.reduce((sum: number, row: any) => sum + Number(row.afyp || 0), 0);
  const periodLabel = periodMode === "year" ? `Nam ${month.slice(0, 4)}` : periodMode === "quarter" ? quarterLabel(month) : monthLabel(month);
  const emptyLabel = periodMode === "year" ? "nam nay" : periodMode === "quarter" ? "quy nay" : "thang nay";
  return <section className="tvv-content tvv-subpage tvv-after-sub-header">
    <div className="tvv-period-tabs" role="tablist" aria-label="Chon ky du lieu">
      {(["month", "quarter", "year"] as PeriodMode[]).map((mode) => <button key={mode} type="button" role="tab" aria-selected={periodMode === mode} className={periodMode === mode ? "active" : ""} onClick={() => onPeriodModeChange(mode)}>{mode === "month" ? "Thang" : mode === "quarter" ? "Quy" : "Nam"}</button>)}
    </div>
    <section className="tvv-contract-revenue" aria-label="Doanh thu TVV">
      <div><span>{periodLabel}</span><strong>{formatVnd(totalIp)}</strong><small>IP</small></div>
      <div><span>AFYP</span><strong>{formatVnd(totalAfyp)}</strong><small>Doanh thu quy doi</small></div>
    </section>
    <label className="tvv-contract-month-filter"><span><CalendarDays size={18} /> Tháng muốn xem</span><MonthPicker className="tvv-contract-month-control" value={month} options={monthOptions} onChange={onMonthChange} ariaLabel="Chọn tháng hợp đồng" /></label>
    <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><span>{contracts.length} HĐ</span></div>{contracts.length ? contracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">Chưa có hợp đồng trong tháng này.</p>}</section>
  </section>;
}

function contractRawValue(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row.raw_data?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function contractDisplay(row: any) {
  const policyOwner = row.policy_owner || contractRawValue(row, ["BÊN MUA BẢO HIỂM (BMBH)", "BMBH", "Bên mua bảo hiểm"]) || row.insured_name || "-";
  const insuredName = row.insured_name || contractRawValue(row, ["NGƯỜI ĐƯỢC BẢO HIỂM", "NĐBH", "Người được bảo hiểm"]) || "";
  const applicationNo = row.application_no || row.gyc_no || row.contract_no || "-";
  const paidDate = row.paid_date || row.collection_date || contractRawValue(row, ["NGÀY THU", "Ngày thu"]) || null;
  const issuedDate = row.issued_date || row.issue_date || contractRawValue(row, ["NGÀY PHÁT HÀNH", "Ngày phát hành", "NGAY PHAT HANH"]) || "";
  return { policyOwner, insuredName, applicationNo, paidDate, issuedDate };
}

function ContractRow({ row, onOpen, hideCustomerName = false }: any) {
  const tone = statusTone(row.policy_status);
  const Icon = tone.icon;
  const display = contractDisplay(row);
  const title = hideCustomerName ? row.agent_name || "TVV" : display.policyOwner;
  return <button className="tvv-contract-row" type="button" onClick={() => onOpen?.(row)}><span className={tone.tone}><Icon size={22} /></span><div><b>{title}</b><p>{display.applicationNo}</p></div><strong>{formatVnd(Number(row.ip || row.afyp || 0))}<small>{formatDateVi(display.paidDate)}</small></strong><em className={tone.tone}>{tone.label}</em><ChevronRight size={20} /></button>;
}

function ContractDetailModal({ row, onClose, showAdvisorName = false, hideCustomerNames = false }: { row: any; onClose: () => void; showAdvisorName?: boolean; hideCustomerNames?: boolean }) {
  const display = contractDisplay(row);
  const detailRows = [
    ["BMBH", display.policyOwner || ""],
    ["NĐBH", display.insuredName || ""],
    ["Ngày hiệu lực", display.paidDate ? formatDateVi(display.paidDate) : ""],
    ["Ngày phát hành", display.issuedDate ? formatDateVi(display.issuedDate) : ""],
    ["IP", formatVnd(Number(row.ip || 0))],
    ["AFYP", formatVnd(Number(row.afyp || 0))]
  ].filter((_, index) => !hideCustomerNames || index > 1);
  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contract-detail" role="dialog" aria-modal="true" aria-label="Chi tiết hợp đồng" onClick={(event) => event.stopPropagation()}><header><div><p>{display.applicationNo}</p><h2>{showAdvisorName ? row.agent_name || "TVV" : display.policyOwner}</h2></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button></header><div className="tvv-contract-detail-grid">{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>;
}

function RecruitmentSimulator({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"new-advisor" | "lateral">("new-advisor");
  const [lateralResetSignal, setLateralResetSignal] = useState(0);
  return <section className="recruitment-simulator-shell">
    <TvvSubHeader title="Mô phỏng tuyển dụng" onBack={onBack} onReset={mode === "lateral" ? () => setLateralResetSignal((current) => current + 1) : undefined} />
    <nav className="recruitment-simulator-tabs" aria-label="Chọn hình thức tuyển dụng">
      <button type="button" className={mode === "new-advisor" ? "active" : ""} onClick={() => setMode("new-advisor")}>TVV mới</button>
      <button type="button" className={mode === "lateral" ? "active" : ""} onClick={() => setMode("lateral")}>Tuyển ngang</button>
    </nav>
    {mode === "new-advisor"
      ? <RecruitmentIncomeCalculator onBack={onBack} embedded />
      : <LateralRecruitmentSimulator resetSignal={lateralResetSignal} />}
  </section>;
}

function LateralRecruitmentSimulator({ resetSignal }: { resetSignal: number }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [frameHeight, setFrameHeight] = useState(720);
  function syncFrameHeight() {
    const frame = frameRef.current;
    const documentElement = frame?.contentDocument?.documentElement;
    const body = frame?.contentDocument?.body;
    if (!documentElement || !body) return;
    const update = () => setFrameHeight(Math.max(620, body.scrollHeight, documentElement.scrollHeight));
    observerRef.current?.disconnect();
    observerRef.current = new ResizeObserver(update);
    observerRef.current.observe(documentElement);
    observerRef.current.observe(body);
    update();
  }
  useEffect(() => () => observerRef.current?.disconnect(), []);
  useEffect(() => {
    if (!resetSignal) return;
    frameRef.current?.contentWindow?.postMessage({ type: "reset-lateral-recruitment" }, window.location.origin);
  }, [resetSignal]);
  return <section className="lateral-recruitment-embed">
    <iframe ref={frameRef} src="/tuyen-ngang/index.html" title="Mô phỏng tuyển ngang" style={{ height: `${frameHeight}px` }} onLoad={syncFrameHeight} scrolling="no" />
  </section>;
}

function RecruitmentIncomeCalculator({ onBack, embedded = false }: { onBack: () => void; embedded?: boolean }) {
  const [advisorName, setAdvisorName] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string[]>(() => Array(6).fill("20"));
  const [estimates, setEstimates] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [activeSimulationMonth, setActiveSimulationMonth] = useState(0);
  const [exportingSimulation, setExportingSimulation] = useState(false);
  const [simulationExportError, setSimulationExportError] = useState("");
  const [mobileShareAvailable, setMobileShareAvailable] = useState(false);
  const monthCarouselRef = useRef<HTMLDivElement>(null);
  const simulationExportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const updateShareMode = () => setMobileShareAvailable(media.matches && typeof navigator.share === "function");
    updateShareMode();
    media.addEventListener("change", updateShareMode);
    return () => media.removeEventListener("change", updateShareMode);
  }, []);
  const simulationMonths = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const paidDay = Math.min(today.getDate(), lastDay);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        month,
        label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
        paidDate: `${month}-${String(paidDay).padStart(2, "0")}`
      };
    });
  }, []);
  const revenueValues = useMemo(
    () => monthlyRevenue.map((value) => Math.max(0, Number(value.replace(",", ".")) || 0) * 1_000_000),
    [monthlyRevenue]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setError("");
      const cumulativeDrafts: DraftContract[] = [];
      const requests = simulationMonths.map((item, index) => {
        cumulativeDrafts.push({
          id: `recruitment-${item.month}`,
          productName: "Doanh thu tuyển dụng dự kiến",
          premium: revenueValues[index],
          expectedPaidDate: item.paidDate,
          expectedIssueDate: item.paidDate,
          status: "Có hiệu lực"
        });
        return fetch("/api/tvv-reward-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            recruitmentMode: true,
            recruitmentStartDate: simulationMonths[0].paidDate,
            trainingCompleted: true,
            month: item.month,
            advisor: { code: "ADMINTN", name: advisorName.trim() || "TVV mới" },
            draftContracts: [...cumulativeDrafts]
          })
        }).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "Không tính được thu nhập.");
          return payload;
        });
      });
      Promise.all(requests)
        .then(setEstimates)
        .catch((reason) => {
          if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tính được thu nhập.");
        });
    }, 600);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [advisorName, revenueValues, simulationMonths]);

  const monthlyResults = estimates.map((estimate, monthIndex) => {
    const activeContestIds = new Set((estimate?.ongoingPrograms ?? []).map((item: any) => item.programId));
    const programs = (estimate?.calculatorPrograms ?? [])
      .filter((item: any) => item.programId !== "policy-month-13" && !item.isCommission)
      .filter((item: any) => item.isPolicyProjection || activeContestIds.has(item.programId))
      .sort((a: any, b: any) => calculatorProgramOrder(a) - calculatorProgramOrder(b));
    const previousPrograms = new Map((estimates[monthIndex - 1]?.calculatorPrograms ?? []).map((item: any) => [item.programId, item]));
    const previousQuarter = monthIndex > 0 ? Math.ceil(Number(simulationMonths[monthIndex - 1].month.slice(5, 7)) / 3) : 0;
    const currentQuarter = Math.ceil(Number(simulationMonths[monthIndex].month.slice(5, 7)) / 3);
    const rows = programs.map((item: any) => {
      const currentReward = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
      const previous = previousPrograms.get(item.programId) as any;
      const previousReward = Number(previous?.incrementalReward ?? previous?.estimatedReward ?? 0);
      const isMonthly = item.programId === "policy-monthly" || item.programId === "policy-new-advisor-monthly";
      const isStage = item.programId === "policy-new-advisor-stage";
      const reward = isMonthly || isStage
        ? currentReward
        : currentQuarter !== previousQuarter
          ? currentReward
          : Math.max(0, currentReward - previousReward);
      const currentGifts = item.projectedGiftLabels?.length ? item.projectedGiftLabels : item.giftLabels ?? [];
      const previousGifts = previous?.projectedGiftLabels?.length ? previous.projectedGiftLabels : previous?.giftLabels ?? [];
      const gifts = currentGifts.filter((gift: string) => !previousGifts.includes(gift));
      return { ...item, monthlyReward: reward, monthlyGifts: gifts };
    });
    const commission = revenueValues[monthIndex] * ACQUISITION_COMMISSION_BREAKDOWN[0].rate;
    return {
      commission,
      rows,
      total: commission + rows.reduce((sum: number, item: any) => sum + Number(item.monthlyReward ?? 0), 0)
    };
  });
  const totalRevenue = revenueValues.reduce((sum, value) => sum + value, 0);
  const totalCommission = monthlyResults.reduce((sum, item) => sum + item.commission, 0);
  const totalIncome = monthlyResults.reduce((sum, item) => sum + item.total, 0);
  const simulationExportRows = simulationMonths.map((item, monthIndex) => ({
    ...item,
    revenue: revenueValues[monthIndex],
    commission: monthlyResults[monthIndex]?.commission ?? 0,
    total: monthlyResults[monthIndex]?.total ?? 0,
    rewards: (monthlyResults[monthIndex]?.rows ?? [])
      .filter((program: any) => Number(program.monthlyReward ?? 0) > 0 || (program.monthlyGifts ?? []).length > 0)
      .map((program: any) => ({
        name: program.programName,
        value: (program.monthlyGifts ?? []).length
          ? program.monthlyGifts.join(" · ")
          : formatVnd(Number(program.monthlyReward ?? 0))
      }))
  }));
  function openSimulationMonth(index: number) {
    const nextIndex = Math.max(0, Math.min(simulationMonths.length - 1, index));
    setActiveSimulationMonth(nextIndex);
    const container = monthCarouselRef.current;
    if (container) container.scrollTo({ left: container.clientWidth * nextIndex, behavior: "smooth" });
  }
  async function exportSimulationImage() {
    const name = advisorName.trim();
    if (!name) {
      setSimulationExportError("Vui lòng nhập họ và tên TVV trước khi xuất ảnh.");
      return;
    }
    if (!simulationExportRef.current || estimates.length !== 6) return;
    setExportingSimulation(true);
    setSimulationExportError("");
    try {
      await document.fonts?.ready;
      const element = simulationExportRef.current;
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: element.offsetWidth,
        height: element.offsetHeight,
        style: {
          position: "static",
          top: "auto",
          left: "auto",
          zIndex: "0"
        }
      });
      const safeName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "tvv-moi";
      const fileName = `mo-phong-thu-nhap-${safeName}.png`;
      if (mobileShareAvailable && typeof navigator.share === "function") {
        const imageBlob = await fetch(dataUrl).then((response) => response.blob());
        const imageFile = new File([imageBlob], fileName, { type: "image/png" });
        if (typeof navigator.canShare !== "function" || navigator.canShare({ files: [imageFile] })) {
          await navigator.share({
            title: `Mô phỏng tuyển dụng - ${name}`,
            text: `Mô phỏng tuyển dụng dành cho TVV mới ${name}`,
            files: [imageFile]
          });
          return;
        }
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setSimulationExportError(reason instanceof Error ? reason.message : "Không thể xuất ảnh mô phỏng.");
    } finally {
      setExportingSimulation(false);
    }
  }

  return <section className="tvv-calculator recruitment-calculator">
    {!embedded && <TvvSubHeader title="Mô phỏng tuyển dụng" onBack={onBack} />}
    <section className="tvv-calc-card recruitment-input-card">
      <label className="recruitment-advisor-name">
        <span>Họ và tên TVV</span>
        <input
          type="text"
          value={advisorName}
          onChange={(event) => setAdvisorName(event.target.value)}
          placeholder="Nhập họ và tên"
          autoComplete="name"
        />
      </label>
      <div className="recruitment-three-month-grid">
        {simulationMonths.map((item, index) => <label className={`month-tone-${index + 1}`} key={item.month}>
          <i>T{Number(item.month.slice(5, 7))}</i>
          <div><input inputMode="decimal" value={monthlyRevenue[index]} onChange={(event) => setMonthlyRevenue((current) => current.map((value, valueIndex) => valueIndex === index ? event.target.value.replace(/[^\d.,]/g, "") : value))} aria-label={`Doanh thu dự kiến ${item.label}, đơn vị triệu đồng`} /></div>
        </label>)}
      </div>
      {error && <div className="tvv-user-error" role="alert">{error}</div>}
    </section>

    {estimates.length === 6 && !error && <section className="tvv-calc-card recruitment-summary-card">
      <div className="recruitment-total"><span>Tổng thu nhập dự kiến trong 6 tháng</span><strong>{formatVnd(totalIncome)}</strong></div>
      <div className="recruitment-metrics">
        <div><span>Tổng doanh thu</span><b>{formatVnd(totalRevenue)}</b></div>
        <div><span>Hoa hồng khai thác</span><b>{formatVnd(totalCommission)}</b></div>
        <div><span>Thưởng & thi đua</span><b>{formatVnd(Math.max(0, totalIncome - totalCommission))}</b></div>
      </div>
    </section>}

    {estimates.length === 6 && !error && <section className="tvv-calc-card recruitment-reward-carousel-card">
      <div className="recruitment-carousel-heading">
        <div><h2>Thưởng từng tháng</h2><p>Vuốt ngang để xem tháng tiếp theo</p></div>
        <div><button type="button" aria-label="Tháng trước" disabled={activeSimulationMonth === 0} onClick={() => openSimulationMonth(activeSimulationMonth - 1)}><ChevronLeft size={19} /></button><strong>{activeSimulationMonth + 1}/6</strong><button type="button" aria-label="Tháng tiếp theo" disabled={activeSimulationMonth === 5} onClick={() => openSimulationMonth(activeSimulationMonth + 1)}><ChevronRight size={19} /></button></div>
      </div>
      <div className="recruitment-reward-carousel" ref={monthCarouselRef} onScroll={(event) => {
        const element = event.currentTarget;
        if (element.clientWidth) setActiveSimulationMonth(Math.round(element.scrollLeft / element.clientWidth));
      }}>
        {simulationMonths.map((item, monthIndex) => <article className={`recruitment-reward-slide month-tone-${monthIndex + 1}`} key={item.month}>
          <header><i>{monthIndex + 1}</i><div><span>{item.label}</span><strong>{formatVnd(monthlyResults[monthIndex]?.total ?? 0)}</strong><small>Doanh thu dự kiến {monthlyRevenue[monthIndex] || 0} triệu</small></div></header>
          <div className="recruitment-reward-slide-rows">
            <div className="recruitment-commission-row">
              <span><Calculator size={17} />Hoa hồng khai thác năm 1</span>
              <strong>{formatVnd(monthlyResults[monthIndex]?.commission ?? 0)}</strong>
              <div className="recruitment-future-commission">
                <small>Các năm tiếp theo · không tính vào tổng thu nhập</small>
                {ACQUISITION_COMMISSION_BREAKDOWN.slice(1).map((commissionYear) => <p key={commissionYear.label}>
                  <span>{commissionYear.label} ({formatRate(commissionYear.rate)})</span>
                  <b>{formatVnd(revenueValues[monthIndex] * commissionYear.rate)}</b>
                </p>)}
              </div>
            </div>
            {(monthlyResults[monthIndex]?.rows ?? []).map((program: any, programIndex: number) => {
              const gifts = program.monthlyGifts ?? [];
              const reward = Number(program.monthlyReward ?? 0);
              const achieved = reward > 0 || gifts.length > 0;
              return <button type="button" key={program.programId || programIndex} onClick={() => setSelectedProgram(program)}>
                <span>{program.isPolicyProjection ? <ShieldCheck size={17} /> : gifts.length ? <Gift size={17} /> : <Trophy size={17} />}{program.programName}</span>
                <strong className={achieved ? gifts.length ? "achieved" : "achieved reward-amount" : ""}>{gifts.length ? gifts.join(" · ") : achieved ? `+${formatVnd(reward)}` : "Chưa đạt"}</strong>
              </button>;
            })}
          </div>
        </article>)}
      </div>
      <div className="recruitment-carousel-dots">{simulationMonths.map((item, index) => <button type="button" key={item.month} className={activeSimulationMonth === index ? "active" : ""} aria-label={`Xem ${item.label}`} onClick={() => openSimulationMonth(index)} />)}</div>
      <p className="tvv-disclaimer"><Info size={17} /><span><b>Lưu ý</b>Thưởng quý, thưởng chặng và thi đua được mô phỏng lũy kế từ các tháng trước. Kết quả giả định hợp đồng phát hành thành công và TVV hoàn thành điều kiện đào tạo.</span></p>
    </section>}

    {estimates.length === 6 && !error && <section className="tvv-calc-card recruitment-export-card">
      <div><span>{mobileShareAvailable ? <Share2 size={21} /> : <Download size={21} />}</span><div><h2>Xuất mô phỏng</h2><p>{mobileShareAvailable ? "Tạo ảnh và mở bảng chia sẻ để gửi qua Zalo." : "Tạo ảnh tổng hợp doanh thu, hoa hồng và các khoản thưởng dự kiến trong 6 tháng."}</p></div></div>
      <button type="button" onClick={exportSimulationImage} disabled={exportingSimulation}>
        {exportingSimulation ? <LoaderCircle className="spin" size={19} /> : mobileShareAvailable ? <Share2 size={19} /> : <Download size={19} />}
        {exportingSimulation ? "Đang tạo ảnh..." : mobileShareAvailable ? "Chia sẻ ảnh qua Zalo" : "Xuất ảnh mô phỏng"}
      </button>
      {simulationExportError && <p className="tvv-user-error" role="alert">{simulationExportError}</p>}

      <div className="recruitment-export-canvas recruitment-export-v2" ref={simulationExportRef}>
        <header>
          <div><span>BẢO VIỆT NHÂN THỌ <i>✦</i></span><h1>MÔ PHỎNG TUYỂN DỤNG · TVV MỚI</h1></div>
          <strong><UserRound size={19} />Dành cho TVV mới</strong>
        </header>
        <section className="recruitment-export-advisor">
          <span><UserRound size={34} /></span><div><small>TƯ VẤN VIÊN</small><h2>{advisorName.trim() || "Chưa nhập họ và tên"}</h2></div>
        </section>
        <section className="recruitment-export-summary">
          <div><i><Target size={28} /></i><span>Tổng doanh thu</span><strong>{formatVnd(totalRevenue)}</strong></div>
          <div><i><WalletCards size={28} /></i><span>Tổng thu nhập<br />dự kiến</span><strong>{formatVnd(totalIncome)}</strong></div>
          <div><i><Trophy size={28} /></i><span>Tổng thưởng &<br />thi đua</span><strong>{formatVnd(Math.max(0, totalIncome - totalCommission))}</strong></div>
        </section>
        <section className="recruitment-export-months">{simulationExportRows.map((row, monthIndex) => <article key={row.month}>
          <div className="recruitment-export-month-badge"><strong>{monthIndex + 1}</strong><CalendarDays size={18} /></div>
          <div className="recruitment-export-month-contract">
            <h3>{row.label}</h3>
            <p><span>Doanh thu</span><b>{formatVnd(row.revenue)}</b></p>
            <p><span>Hoa hồng năm 1</span><b>{formatVnd(row.commission)}</b></p>
          </div>
          <div className="recruitment-export-month-rewards">
            <h4>Các khoản thưởng sẽ nhận</h4>
            {row.rewards.length ? row.rewards.map((reward: any) => <p key={`${row.month}-${reward.name}`}><span>•&nbsp;&nbsp;{reward.name}</span><b>{reward.value}</b></p>) : <em>Chưa phát sinh thưởng</em>}
          </div>
          <div className="recruitment-export-month-total"><span>Tổng thu nhập</span><strong>{formatVnd(row.total)}</strong><i><CircleDollarSign size={29} /></i></div>
        </article>)}</section>
        <h3 className="recruitment-export-renewal-title"><Coins size={25} />Hoa hồng các năm tiếp theo</h3>
        <section className="recruitment-export-renewal">
          <div><i><Coins size={24} /></i><span>Hoa hồng năm 2 · 15%<b>{formatVnd(totalRevenue * ACQUISITION_COMMISSION_BREAKDOWN[1].rate)}</b></span></div>
          <div><i><Coins size={24} /></i><span>Hoa hồng năm 3 · 7,5%<b>{formatVnd(totalRevenue * ACQUISITION_COMMISSION_BREAKDOWN[2].rate)}</b></span></div>
          <div><i><Coins size={24} /></i><span>Hoa hồng năm 4 · 4%<b>{formatVnd(totalRevenue * ACQUISITION_COMMISSION_BREAKDOWN[3].rate)}</b></span></div>
        </section>
        <p className="recruitment-export-renewal-note"><Info size={20} />Các khoản hoa hồng năm tiếp theo chỉ để tham khảo, không tính vào tổng thu nhập 6 tháng.</p>
        <footer><ShieldCheck size={25} /><span>Kết quả mang tính mô phỏng theo chính sách và chương trình thi đua đang áp dụng trong từng tháng.<br />Thu nhập thực tế phụ thuộc điều kiện phát hành hợp đồng và điều kiện chương trình.</span></footer>
      </div>
    </section>}
    {selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}
  </section>;
}

function CalculatorView(props: any) {
  const { drafts, estimate } = props;
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const draftCommissionReward = drafts.reduce((sum: number, draft: DraftContract) => sum + acquisitionCommissionReward(Number(draft.premium) || 0), 0);
  const draftFirstYearCommissionReward = drafts.reduce((sum: number, draft: DraftContract) => sum + (Number(draft.premium) || 0) * ACQUISITION_COMMISSION_BREAKDOWN[0].rate, 0);
  const rawCalculatorPrograms = estimate?.calculatorPrograms ?? estimate?.rewardByProgram ?? [];
  const hasCommissionRow = rawCalculatorPrograms.some((item: any) => item.programId === "acquisition-commission");
  const localCommissionProgram = {
        programId: "acquisition-commission",
        programName: "Hoa hồng khai thác",
        period: acquisitionCommissionLabel(),
        estimatedReward: draftCommissionReward,
        currentReward: 0,
        projectedReward: draftCommissionReward,
        incrementalReward: draftCommissionReward,
        isPolicyProjection: false,
        isCommission: true
  };
  const calculatorPrograms = hasCommissionRow
    ? rawCalculatorPrograms.map((item: any) => item.programId === "acquisition-commission"
      ? { ...item, ...localCommissionProgram }
      : item)
    : [...rawCalculatorPrograms, localCommissionProgram];
  const orderedCalculatorPrograms = [...calculatorPrograms]
    .filter((item: any) => item.programId !== "policy-month-13")
    .sort((a: any, b: any) => calculatorProgramOrder(a) - calculatorProgramOrder(b));
  const apiCalculatorTotal = Number(estimate?.calculatorTotalEstimatedReward ?? estimate?.totalEstimatedReward ?? 0);
  const visibleProgramTotal = orderedCalculatorPrograms.reduce((sum: number, item: any) => {
    const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
    const includedIncrease = item.isCommission && ACQUISITION_COMMISSION_TOTAL_RATE > 0
      ? increase * ACQUISITION_COMMISSION_BREAKDOWN[0].rate / ACQUISITION_COMMISSION_TOTAL_RATE
      : increase;
    return sum + includedIncrease;
  }, 0);
  const calculatorTotal = Math.max(apiCalculatorTotal, visibleProgramTotal, draftFirstYearCommissionReward);
  return <section className="tvv-calculator">
    <TvvSubHeader title="Máy tính thưởng" onBack={props.onBack} />
    <section className="tvv-calc-card"><h2>1. Nhập thông tin hợp đồng</h2><div className="tvv-form-grid tvv-form-grid-compact"><label>Phí đóng (PĐT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>đ</span></div></label><label>Ngày nộp phí dự kiến<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" aria-label={`Thêm hợp đồng #${props.drafts.length + 1} · PĐT ${formatVnd(parseMoneyInput(props.premiumText))}`} onClick={props.onAdd}>+ Thêm hợp đồng</button></section>
    <section className="tvv-calc-card"><div className="tvv-section-head"><h2>2. Danh sách hợp đồng đã thêm ({drafts.length})</h2>{drafts.length > 0 && <button className="danger" onClick={props.onClear}><Trash2 size={15} /> Xóa tất cả</button>}</div>{drafts.map((draft: DraftContract, index: number) => {
      return <article className="tvv-draft-row" key={draft.id}><GripVertical size={17} /><i>{index + 1}</i><div><p className="tvv-draft-premium">PĐT: {formatVnd(draft.premium)}</p></div><button type="button" className="tvv-draft-illustration" aria-label="Minh họa với phí hợp đồng này" title="Minh họa với phí hợp đồng này" onClick={() => props.onOpenIllustration(String(draft.premium))}><Calculator size={15} /></button><button onClick={() => props.onRemove(draft.id)}><Trash2 size={18} /></button></article>;
    })}</section>
    <section className="tvv-calc-card tvv-reward-summary-card"><div className="tvv-reward-summary-title"><span><Sparkles size={18} /></span><div><h2>3. Kết quả ước tính</h2><p>Thu nhập tăng thêm từ hợp đồng dự kiến</p></div></div><div className="tvv-total"><span>Tổng thu nhập dự kiến</span><strong>+{formatVnd(Number(calculatorTotal))}</strong></div><div className="tvv-result-table tvv-result-table-standalone"><div className="tvv-result-head"><span>Chương trình</span><span>Thưởng cộng thêm</span></div>{orderedCalculatorPrograms.map((item: any, index: number) => {
      const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
      const currentReward = Number(item.currentReward ?? 0);
      const isGiftReward = item.rewardKind === "gift";
      const currentGift = item.currentGiftLabels?.join(" · ") || "Chưa đạt quà";
      const projectedGift = item.projectedGiftLabels?.join(" · ") || "Chưa đạt quà";
      const interactiveProps = item.isCommission ? {} : {
        role: "button",
        tabIndex: 0,
        onClick: () => setSelectedProgram(item),
        onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setSelectedProgram(item);
        }
      };
      return <div
        className={`tvv-result-row${item.isPolicyProjection ? " policy" : ""}${item.isCommission ? " commission" : ""}`}
        key={item.programId}
        {...interactiveProps}
      ><div><span className={`tvv-result-icon tone-${index % 3}`}>{item.isPolicyProjection ? <ShieldCheck size={22} /> : item.isCommission ? <Calculator size={22} /> : isGiftReward ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 52)}</b>{item.isCommission ? <AcquisitionCommissionBreakdown total={increase} /> : item.isPolicyProjection && <small>{item.period}</small>}</div>{!item.isCommission && (isGiftReward
        ? <strong className="advisor-reward-breakdown"><span className="gift-reward-breakdown"><b>Hiện tại: {currentGift}</b><em>{item.incrementalGiftLabels?.length ? "Quà dự kiến" : "Giữ bậc quà"}: {projectedGift}</em></span></strong>
        : <strong className={increase > 0 ? "increase" : ""}><small>Hiện tại {formatVnd(currentReward)}</small>{increase > 0 ? `+${formatVnd(increase)}` : formatVnd(0)}<em className="calculator-program-total">+{formatVnd(currentReward + increase)}</em></strong>)}</div>;
    })}</div><p className="tvv-disclaimer"><Info size={17} /><span><b>Lưu ý</b>Phần màu xanh là số thưởng tăng thêm so với dữ liệu hiện tại. Thưởng chính sách chỉ được xác nhận khi hợp đồng đủ điều kiện và phát hành thành công.</span></p></section>
    {selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}
  </section>;
}

function IllustrationView({ advisor, contracts, estimate, onOpenCalculator }: any) {
  const totalIp = contracts.reduce((sum: number, row: any) => sum + contractIpValue(row), 0);
  const totalAfyp = contracts.reduce((sum: number, row: any) => sum + Number(row.afyp || 0), 0);
  const issued = contracts.filter((row: any) => normalizeStatusText(row.policy_status) === "co hieu luc").length;
  const programs = (estimate?.calculatorPrograms ?? estimate?.policyRewardPrograms ?? []).filter((item: any) => item.programId !== "policy-month-13").slice(0, 3);
  return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-illustration-page">
    <section className="tvv-card tvv-illustration-summary">
      <div><span>TVV</span><strong>{advisor?.name || "TVV"}</strong><small>{advisor?.code || "Chưa có mã"}</small></div>
      <button type="button" onClick={onOpenCalculator}><Calculator size={18} /> Thu nhập</button>
    </section>
    <section className="tvv-card tvv-illustration-metrics">
      <div><span>Tổng HĐ</span><strong>{contracts.length}</strong></div>
      <div><span>Đã phát hành</span><strong>{issued}</strong></div>
      <div><span>Tổng IP</span><strong>{formatCompactVnd(totalIp)}</strong></div>
      <div><span>Tổng AFYP</span><strong>{formatCompactVnd(totalAfyp)}</strong></div>
    </section>
    <section className="tvv-card tvv-illustration-programs">
      <div className="tvv-section-head"><h2>Minh hoạ thưởng</h2></div>
      {programs.length ? programs.map((item: any) => <article key={item.programId}><div><b>{item.programName}</b><small>{item.period || item.conditionText || "Chương trình"}</small></div><strong>{formatVnd(Number(item.incrementalReward ?? item.estimatedReward ?? 0))}</strong></article>) : <p className="tvv-empty">Chưa có dữ liệu minh hoạ.</p>}
    </section>
  </section>;
}

function IllustrationTab({ active, premiumText = "" }: { active: boolean; premiumText?: string }) {
  const minhHoaVersion = "20260716-swap-rate-columns";
  const src = `/minhhoa2/index.html?embedded=1&v=${minhHoaVersion}${premiumText ? `&annualPremium=${encodeURIComponent(premiumText)}` : ""}`;
  return (
    <section className={`tvv-illustration-embed${active ? " active" : ""}`} aria-hidden={!active}>
      <iframe key={src} src={src} title="Minh hoạ quyền lợi bảo hiểm" loading="eager" />
    </section>
  );
}

function TeamLeaderPolicyIllustration({ active, rewards }: { active: boolean; rewards: any }) {
  if (!active) return null;
  return <section className="tvv-content tvv-subpage tvv-after-sub-header team-policy-illustration">
    <article><h2>1. Thưởng PTKD tháng</h2><p><b>Thưởng = Tỷ lệ × FYC nhóm/tháng</b></p><p>Tỷ lệ được xác định theo tổng IP nhóm và số TVV có IP trên 12 triệu.</p>{rewards && <strong>Hiện tại: {Math.round(rewards.monthly.rate * 100)}% × {formatVnd(rewards.monthly.fyc)} = {formatVnd(rewards.monthly.reward)}</strong>}</article>
    <article><h2>2. Thưởng Quý</h2><p><b>Thưởng = Tỷ lệ × FYC nhóm/quý</b></p><p>Nguồn FYC áp dụng giống TVV: KPI05 thay KPI04 và BC02 theo từng TVV/tháng; tháng chưa có KPI05 dùng KPI04 cộng 30% IP của GYC BC02 chưa trùng.</p>{rewards && <strong>Hiện tại: {Math.round(rewards.quarterly.rate * 100)}% × {formatVnd(rewards.quarterly.fyc)} = {formatVnd(rewards.quarterly.reward)}</strong>}</article>
    <article><h2>3. Thưởng năm</h2><p>4 quý: 20 triệu · 3 quý: 10 triệu · 2 quý: 6 triệu · 1 quý và FYP năm ≥300 triệu: 3 triệu.</p>{rewards && <strong>Tạm tính: {rewards.annual.achievedQuarters} quý đạt — {formatVnd(rewards.annual.reward)}</strong>}</article>
    <article><h2>4. Thưởng tuyển luyện</h2><p><b>Thưởng = Tỷ lệ × (Thưởng tháng TVV mới + Thưởng chặng TVV mới)</b></p><p>1 TVV mới HĐC: 100% · 2 TVV: 125% · từ 3 TVV: 150%.</p>{rewards && <strong>Hiện tại: {Math.round((rewards.recruitmentTraining?.rate || 0) * 100)}% × {formatVnd(rewards.recruitmentTraining?.totalNewAdvisorReward || 0)} = {formatVnd(rewards.recruitmentTraining?.reward || 0)}</strong>}</article>
    {rewards?.newManager && <article><h2>5. Quản lý mới</h2><p>Áp dụng trong 12 tháng đầu kể từ ngày hiệu lực chức vụ. Xét theo FYP nhóm và số TVV HĐC từng tháng.</p><strong>Hiện tại: {formatVnd(rewards.newManager.reward)}</strong></article>}
  </section>;
}

type ArchiveFolder = { id: string; title: string; items: ArchiveDocument[] };
type ArchiveDocument = { id: string; title: string; file?: string; size?: string };
type ArchiveGuide = { id: string; title: string; description?: string; summary?: string; type?: string; pdfUrl?: string; youtubeUrl?: string; youtubeId?: string; pageCount?: number; isActive?: boolean };
type ArchiveFaq = { id?: string; question?: string; title?: string; answer?: string };
type ArchiveSelection =
  | { kind: "pdf"; title: string; file: string }
  | { kind: "youtube"; title: string; youtubeUrl?: string; youtubeId?: string };

function archiveFileSrc(value?: string) {
  return value ? `/api/archive/file?path=${encodeURIComponent(value)}` : "";
}

function archiveShareFileName(item: ArchiveDocument) {
  const sourceName = item.file?.split("/").pop();
  if (sourceName && /\.pdf$/i.test(sourceName)) return sourceName;
  const safeTitle = item.title.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `${safeTitle || "tai-lieu"}.pdf`;
}

function ArchiveShareIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M8.7 10.7l6.6 -3.4" />
    <path d="M8.7 13.3l6.6 3.4" />
  </svg>;
}

function youtubeEmbedSrc(guide: Pick<ArchiveGuide, "youtubeId" | "youtubeUrl">) {
  if (guide.youtubeId) return `https://www.youtube.com/embed/${encodeURIComponent(guide.youtubeId)}`;
  if (!guide.youtubeUrl) return "";
  try {
    const url = new URL(guide.youtubeUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${encodeURIComponent(url.pathname.slice(1))}`;
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

function ArchiveView() {
  const [data, setData] = useState<{ forms: { folders: ArchiveFolder[] }; guides: ArchiveGuide[]; faq: ArchiveFaq[] } | null>(null);
  const [view, setView] = useState<"forms" | "guides" | "faq">("forms");
  const [folderId, setFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState<ArchiveSelection | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/archive/content", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData({ forms: { folders: [] }, guides: [], faq: [] });
      });
    return () => { cancelled = true; };
  }, []);

  const folders = data?.forms?.folders ?? [];
  const activeFolder = folders.find((folder) => folder.id === folderId) ?? null;
  const visibleFolders = folders;
  const visibleGuides = (data?.guides ?? []).filter((guide) => guide.isActive !== false);
  const visibleFaq = data?.faq ?? [];
  const documents = activeFolder ? activeFolder.items : [];

  async function shareDocument(item: ArchiveDocument) {
    if (!item.file || sharingId) return;
    const relativeUrl = archiveFileSrc(item.file);
    const absoluteUrl = new URL(relativeUrl, window.location.href).href;
    setSharingId(item.id);

    try {
      if (!navigator.share) {
        await navigator.clipboard?.writeText(absoluteUrl);
        window.alert("Đã sao chép liên kết tài liệu để bạn gửi qua Zalo.");
        return;
      }

      const response = await fetch(relativeUrl);
      if (!response.ok) throw new Error("Không thể tải tài liệu");
      const blob = await response.blob();
      const file = new File([blob], archiveShareFileName(item), { type: blob.type || "application/pdf" });
      const filePayload = { title: item.title, text: item.title, files: [file] };

      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share(filePayload);
      } else {
        await navigator.share({ title: item.title, text: item.title, url: absoluteUrl });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        if (navigator.share) await navigator.share({ title: item.title, text: item.title, url: absoluteUrl });
        else throw error;
      } catch (fallbackError) {
        if (!(fallbackError instanceof DOMException && fallbackError.name === "AbortError")) {
          window.alert("Chưa thể mở giao diện chia sẻ. Vui lòng thử lại.");
        }
      }
    } finally {
      setSharingId(null);
    }
  }

  return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-archive-page">
    <div className="tvv-archive-tabs">
      {([["forms", "Mẫu biểu"], ["guides", "Hướng dẫn"], ["faq", "FAQ"]] as const).map(([id, label]) => <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setFolderId(""); setSelectedFile(null); setOpenFaqId(null); }}>{label}</button>)}
    </div>

    {view === "forms" && !activeFolder && <section className="tvv-archive-list">
      {visibleFolders.map((folder) => <button type="button" className="tvv-archive-folder" key={folder.id} onClick={() => setFolderId(folder.id)}>
        <span><FolderOpen size={19} /></span><b>{folder.title}</b><small>{folder.items.length} tài liệu</small><ChevronRight size={20} />
      </button>)}
      {!visibleFolders.length && <p className="tvv-empty">Không tìm thấy tài liệu phù hợp.</p>}
    </section>}

    {view === "forms" && activeFolder && <section className="tvv-archive-list">
      <button type="button" className="tvv-archive-back" onClick={() => { setFolderId(""); setSelectedFile(null); }}><ChevronLeft size={18} />{activeFolder.title}</button>
      {documents.map((item) => <div className="tvv-archive-file" key={item.id} role="button" tabIndex={item.file ? 0 : -1} onClick={() => item.file && setSelectedFile({ kind: "pdf", title: item.title, file: item.file })} onKeyDown={(event) => {
        if (item.file && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setSelectedFile({ kind: "pdf", title: item.title, file: item.file });
        }
      }}>
        <span>PDF</span><b>{item.title}</b><button type="button" className="tvv-archive-share" disabled={!item.file || sharingId === item.id} aria-label={`Chia sẻ ${item.title}`} title="Chia sẻ qua Zalo" onKeyDown={(event) => event.stopPropagation()} onClick={(event) => {
          event.stopPropagation();
          void shareDocument(item);
        }}>{sharingId === item.id ? <LoaderCircle className="tvv-spin" size={22} /> : <ArchiveShareIcon />}</button><ChevronRight size={20} />
      </div>)}
      {!documents.length && <p className="tvv-empty">Không tìm thấy tài liệu phù hợp.</p>}
    </section>}

    {view === "guides" && <section className="tvv-archive-list">
      {visibleGuides.map((guide) => {
        const isYoutube = guide.type === "youtube";
        const canOpen = isYoutube ? Boolean(youtubeEmbedSrc(guide)) : Boolean(guide.pdfUrl);
        return <button type="button" className="tvv-archive-file" key={guide.id} onClick={() => {
          if (isYoutube && canOpen) setSelectedFile({ kind: "youtube", title: guide.title, youtubeUrl: guide.youtubeUrl, youtubeId: guide.youtubeId });
          else if (guide.pdfUrl) setSelectedFile({ kind: "pdf", title: guide.title, file: guide.pdfUrl });
        }} disabled={!canOpen}>
          <span>{isYoutube ? "YT" : "PDF"}</span><b>{guide.title}</b><small>{isYoutube ? "Video hướng dẫn" : `${guide.pageCount || 0} trang`}</small>{canOpen ? <ChevronRight size={20} /> : <BookOpen size={19} />}
        </button>;
      })}
      {!visibleGuides.length && <p className="tvv-empty">Không tìm thấy hướng dẫn phù hợp.</p>}
    </section>}

    {view === "faq" && <section className="tvv-archive-list">
      {visibleFaq.map((item, index) => {
        const faqId = String(item.id ?? index);
        const isOpen = openFaqId === faqId;
        return <article className={`tvv-archive-faq${isOpen ? " open" : ""}`} key={faqId}>
          <button type="button" aria-expanded={isOpen} onClick={() => setOpenFaqId(isOpen ? null : faqId)}><b>{item.question ?? item.title}</b><ChevronDown size={19} /></button>
          {isOpen && <p>{item.answer}</p>}
        </article>;
      })}
      {!visibleFaq.length && <p className="tvv-empty">Không tìm thấy câu hỏi phù hợp.</p>}
    </section>}

    {selectedFile && <div className="tvv-archive-viewer-backdrop" role="presentation" onClick={() => setSelectedFile(null)}>
      <section className="tvv-archive-viewer" role="dialog" aria-modal="true" aria-label={selectedFile.title} onClick={(event) => event.stopPropagation()}>
        <header><span><FileText size={18} /><b>{selectedFile.title}</b></span><button className="contract-modal-close" type="button" onClick={() => setSelectedFile(null)} aria-label="Đóng"><X size={22} /></button></header>
        <iframe src={selectedFile.kind === "youtube" ? youtubeEmbedSrc(selectedFile) : archiveFileSrc(selectedFile.file)} title={selectedFile.title} allow={selectedFile.kind === "youtube" ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" : undefined} allowFullScreen={selectedFile.kind === "youtube"} />
        {selectedFile.kind === "pdf" && <div className="tvv-archive-viewer-actions">
          <a href={archiveFileSrc(selectedFile.file)} download><Download size={18} />Tải xuống</a>
          <button type="button" disabled={sharingId === `viewer:${selectedFile.file}`} aria-label={`Chia sẻ ${selectedFile.title}`} onClick={() => void shareDocument({ id: `viewer:${selectedFile.file}`, title: selectedFile.title, file: selectedFile.file })}>
            {sharingId === `viewer:${selectedFile.file}` ? <LoaderCircle className="tvv-spin" size={22} /> : <ArchiveShareIcon />}<span>Chia sẻ</span>
          </button>
        </div>}
      </section>
    </div>}
  </section>;
}

function UserLoginScreen({ onSuccess }: { onSuccess: (advisorCode: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; field?: "username" | "password" } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/user/auth", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({ error: "Máy chủ không phản hồi đúng định dạng." }));
    setBusy(false);
    if (!response.ok) return setError({ message: payload.error || "Không thể đăng nhập. Vui lòng thử lại.", field: payload.field });
    onSuccess(payload.advisorCode || username);
  }
  const canSubmit = Boolean(username.trim() && password && !busy);
  return <main className="tvv-user-login">
      <form className="tvv-login-form" onSubmit={submit}>
        <header><h1>Đăng nhập</h1><p>Nhập thông tin của bạn để tiếp tục.</p></header>
        <label>Mã TVV<div className={`tvv-login-input${error?.field === "username" ? " has-error" : ""}`}><UserRound size={19} /><input value={username} onChange={(event) => { setUsername(event.target.value); if (error?.field === "username") setError(null); }} placeholder="Ví dụ: D102123456" autoCapitalize="characters" autoComplete="username" required /></div>{error?.field === "username" && <span className="tvv-field-error" role="alert">{error.message}</span>}</label>
        <label>Mật khẩu<div className={`tvv-login-input${error?.field === "password" ? " has-error" : ""}`}><ShieldCheck size={19} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); if (error?.field === "password") setError(null); }} placeholder="Nhập mật khẩu" autoComplete="current-password" required /><button className="tvv-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>{error?.field === "password" && <span className="tvv-field-error" role="alert">{error.message}</span>}</label>
        {error && !error.field && <div className="tvv-user-error" role="alert">{error.message}</div>}
        <button className="tvv-login-submit" disabled={!canSubmit}>{busy && <LoaderCircle className="tvv-login-spinner" size={19} aria-hidden="true" />}{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>
  </main>;
}

function Profile({ advisor, contracts, onAvatarChange, onLogout }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  useEffect(() => { fetch("/api/user/profile", { cache: "no-store" }).then((response) => response.json()).then((payload) => setProfile(payload.profile ?? null)); }, []);
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessage("Mật khẩu mới nhập lại chưa khớp.");
      return;
    }
    const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const payload = await response.json();
    setMessage(response.ok ? "Đã thay đổi mật khẩu." : payload.error);
    if (response.ok) { setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }
  }
  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/user/profile", { method: "POST", body: new FormData(form) });
    const payload = await response.json();
    setMessage(response.ok ? "Đã cập nhật avatar." : payload.error);
    if (response.ok) {
      setProfile((value: any) => ({ ...value, avatar_url: payload.avatarUrl }));
      onAvatarChange?.(payload.avatarUrl);
      setAvatarFileName("");
      form.reset();
    }
  }
  async function logout() {
    await fetch("/api/user/auth", { method: "DELETE" });
    onLogout();
  }
  const date = (value?: string) => value ? formatDateVi(value) : "—";
  return <section className="tvv-content tvv-subpage tvv-after-sub-header"><section className="tvv-card tvv-profile-card"><div className="tvv-profile">
    {profile?.avatar_url ? <img className="tvv-profile-avatar" src={profile.avatar_url} alt="Avatar" /> : <UserRound size={58} />}
    <b>{profile?.full_name || advisor?.name}</b><span>{profile?.advisor_code || advisor?.code}</span><strong>{contracts.length} hợp đồng trong tháng</strong>
  </div>
  <div className="tvv-profile-details"><div><span>Ngày bắt đầu làm việc</span><b>{date(profile?.start_date)}</b></div><div><span>Trạng thái</span><b>{profile?.advisor_status || "—"}</b></div><div><span>Chức vụ TVV</span><b>{profile?.advisor_position || "—"}</b></div><div><span>Ngày hiệu lực chức vụ</span><b>{date(profile?.position_effective_date)}</b></div></div>
  {message && <div className="tvv-profile-message">{message}</div>}
  <form className="tvv-profile-form" onSubmit={uploadAvatar}><h3>Ảnh đại diện</h3>
    <label className="tvv-avatar-picker">
      <span className="tvv-avatar-picker-icon"><Camera size={23} /></span>
      <span className="tvv-avatar-picker-copy"><b>{avatarFileName || "Chọn ảnh đại diện"}</b><small>{avatarFileName ? "Nhấn để chọn ảnh khác" : "JPG, PNG hoặc WEBP"}</small></span>
      <span className="tvv-avatar-picker-action">Chọn ảnh</span>
      <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setAvatarFileName(event.target.files?.[0]?.name || "")} />
    </label>
    <small className="tvv-avatar-limit">Dung lượng ảnh phải nhỏ hơn 5 MB.</small><button disabled={!avatarFileName}>Cập nhật avatar</button></form>
  <form className="tvv-profile-form" onSubmit={changePassword}>
    <h3>Đổi mật khẩu</h3>
    <input type="password" placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
    <input type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} />
    <input type="password" placeholder="Nhập lại mật khẩu mới" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required minLength={6} />
    <button>Đổi mật khẩu</button>
  </form>
  <button className="tvv-logout-button" onClick={logout}>Đăng xuất</button>
  </section></section>;
}

function BottomNav({ tab, setTab, boardMode = false, adoMode = false }: { tab: Tab; setTab: (tab: Tab) => void; boardMode?: boolean; adoMode?: boolean }) {
  const items: Array<[Tab, string, any]> = adoMode
    ? [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["ado_targets", "Mục tiêu", Target], ["contests", "Thi đua", Trophy], ["ado_accounts", "Tài khoản", LockKeyhole]]
    : boardMode
    ? [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["contests", "Thi đua", Trophy]]
    : [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Thu nhập", Calculator], ["contests", "Thi đua", Trophy], ["illustration", "Minh hoạ", FileText]];
  return <nav className={`tvv-bottom-nav${boardMode ? " board-bottom-nav" : ""}${adoMode ? " ado-bottom-nav" : ""}`} aria-label="Điều hướng chính">{items.map(([id, label, Icon]) => <button type="button" key={id} className={`${tab === id ? "active" : ""}${id === "calculator" ? " income-nav" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{id === "calculator" ? <img src="/Icon/Icon baoviet.png" alt="" /> : <Icon size={25} />}<span>{label}</span></button>)}</nav>;
}

type AboutItem = { id: string; title: string; content: string; imageUrl?: string };
type AboutSection = { id: string; title: string; description: string; items: AboutItem[] };

function customAboutDescription(section: AboutSection) {
  const description = section.description.trim();
  const defaults = new Set([
    "Những thông tin nổi bật về Bảo Việt Nhân thọ.",
    "Các giải thưởng, danh hiệu và dấu ấn nổi bật.",
    "Thông tin lãi suất công bố trong 3 năm gần nhất.",
    "Thông tin tổng hợp về hoạt động chi trả quyền lợi."
  ]);
  return defaults.has(description) ? "" : description;
}

function AboutBaoVietPreview({ onOpen }: { onOpen: () => void }) {
  return <button className="tvv-card tvv-about-compact-preview" type="button" onClick={onOpen}>
    <span className="tvv-about-compact-icon" aria-hidden="true"><img src={encodeURI("/BVNT là ai/BVNT là ai.png")} alt="" /></span>
    <span className="tvv-leaderboard-preview-copy"><strong>Bảo Việt Nhân thọ là ai?</strong><small>Danh hiệu, lãi suất và thông tin chi trả quyền lợi</small></span>
    <ChevronRight size={22} />
  </button>;
}

function AboutBaoVietPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [selected, setSelected] = useState<AboutSection | null>(null);
  useEffect(() => {
    fetch(`/api/archive/content?updated=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      .then((response) => response.json())
      .then((payload) => setSections((payload.about?.sections ?? []).filter((section: AboutSection) => section.id !== "large-benefits" && !section.title.toLowerCase().includes("quyền lợi lớn"))))
      .catch(() => setSections([]));
  }, []);
  const icons = [
    "Thông tin BVNT-transparent.png",
    "Danh hiệu đạt được-transparent.png",
    "lãi suất-transparent.png",
    "quyền lợi chi trả-transparent.png"
  ];
  if (selected) return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-about-page tvv-about-detail-page">
    <button className="tvv-about-page-back" type="button" onClick={() => setSelected(null)}><ChevronLeft size={20} />Tất cả nội dung</button>
    {customAboutDescription(selected) && <article className="tvv-about-description">{customAboutDescription(selected)}</article>}
    <div className="tvv-about-page-content">{selected.items.some((item) => Boolean(item.imageUrl)) ? selected.items.filter((item) => Boolean(item.imageUrl)).map((item, index) => <figure key={item.id}>
      <img src={`/api/archive/file?path=${encodeURIComponent(item.imageUrl!)}`} alt={`Hình ảnh ${index + 1}: ${selected.title}`} />
    </figure>) : !customAboutDescription(selected) && <p className="tvv-empty">Nội dung đang được cập nhật.</p>}</div>
  </section>;
  return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-about-page">
    <section className="tvv-card tvv-about-preview">
      <div className="tvv-section-head"><div><h2>Bảo Việt Nhân thọ là ai?</h2></div></div>
      <div className="tvv-about-grid">{sections.map((section, index) => <button type="button" key={section.id} onClick={() => setSelected(section)}><span><img src={encodeURI(`/BVNT là ai/${icons[index % icons.length]}`)} alt="" /></span><b>{section.title}</b><i aria-hidden="true" /><em><ChevronRight size={22} /></em></button>)}</div>
    </section>
  </section>;
}



