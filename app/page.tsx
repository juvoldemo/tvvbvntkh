"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BarChart3, Bell, BookOpen, CalendarDays, Calculator, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Crown, Download, Eye, EyeOff, FileText, Filter, FolderOpen, GripVertical, Gift, Home, Hourglass, Info, LoaderCircle, Medal, Search, ShieldCheck, Sparkles, Target, Trash2, Trophy, UserRound, Users, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";

type Tab = "overview" | "contracts" | "calculator" | "contests" | "leaderboard" | "illustration" | "profile" | "archive";
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
  const [tvvTarget, setTvvTarget] = useState<any>(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);

  useEffect(() => {
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
    if (!signedIn || !userProfile?.advisor_code) return;
    const receiveIllustrationEvent = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "bvnt-analytics" || event.data?.eventName !== "summary_export") return;
      const sessionId = analyticsSessionRef.current;
      if (!sessionId) return;
      const source = event.data.source === "riders" ? "sản phẩm bổ trợ" : "minh họa chính";
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName: "action", sessionId, tabName: "illustration", actionName: `Xuất tóm tắt - ${source}` }) }).catch(() => undefined);
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
    if (!signedIn || !profileReady || userProfile?.dashboard_role === "team_leader") {
      setTvvTarget(null);
      return;
    }
    fetch(`/api/tvv-target-registration?month=${month}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { registration: null })
      .then((payload) => setTvvTarget(payload.registration ?? null))
      .catch(() => setTvvTarget(null));
  }, [month, profileReady, signedIn, userProfile?.dashboard_role]);

  useEffect(() => {
    if (!signedIn || userProfile?.dashboard_role !== "team_leader") {
      setTeamTarget(null);
      return;
    }
    fetch(`/api/team-target-registration?month=${month}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { registration: null })
      .then((payload) => setTeamTarget(payload.registration ?? null))
      .catch(() => setTeamTarget(null));
  }, [month, signedIn, userProfile?.dashboard_role]);

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
    if (!signedIn) return;
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
  }, [month, signedIn]);

  useEffect(() => {
    if (!signedIn || tab !== "contracts") return;
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
  }, [contractMonth, signedIn, tab]);

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
    const code = authenticatedAdvisorCode || userProfile?.advisor_code;
    if (!signedIn) {
      setLeaderboardReady(false);
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
  }, [authenticatedAdvisorCode, month, signedIn, userProfile?.advisor_code]);

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
  }, [advisor, contractAllContracts, contractMonth, periodMode, teamContractData, userProfile?.dashboard_role]);
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
    if (!signedIn || (!rewardAdvisorCode && !rewardAdvisorName)) return;
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
  }, [rewardAdvisorCode, rewardAdvisorName, rewardRequestKey, signedIn]);

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

  const draftRewards = new Map((estimate?.rewardByDraftContract ?? []).map((item: any) => [item.draftId, item]));

  if (showSplash) {
    return (
      <main className="tvv-splash-screen" aria-label="Đang mở ứng dụng">
        <Image className="tvv-splash-image" src="/Hi.png" alt="" fill priority sizes="100vw" />
      </main>
    );
  }

  if (!authReady) return <main className="tvv-user-login"><p>Đang kiểm tra đăng nhập…</p></main>;
  if (!signedIn) return <UserLoginScreen onSuccess={() => setSignedIn(true)} />;

  return (
    <main className="tvv-app">
      {tab === "calculator" ? (
        userProfile?.dashboard_role === "team_leader"
          ? <TeamLeaderCalculator month={month} teamData={teamData} baseline={teamRewards} onBack={() => setTab("overview")} />
          : <CalculatorView advisor={advisor} month={month} productName={productName} setProductName={setProductName} productOptions={productOptions} premiumText={premiumText} setPremiumText={(value: string) => setPremiumText(moneyInput(value))} paidDate={paidDate} setPaidDate={setPaidDate} drafts={drafts} draftRewards={draftRewards} estimate={estimate} onBack={() => setTab("overview")} onAdd={addDraft} onOpenIllustration={openIllustrationWithPremium} onRemove={(id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id))} onClear={() => setDrafts([])} />
      ) : (
        <>
          {tab === "overview" ? (
          <header className="tvv-hero">
            <div className="tvv-hero-main">
              <button className="tvv-avatar tvv-avatar-button" type="button" onClick={() => setTab("profile")} aria-label="Mở trang cá nhân">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : <UserRound size={40} />}</button>
              <div>
                <h1>Xin chào, {userProfile?.full_name || advisor?.name || "TVV"} <span>👋</span></h1>
                <p>{userProfile?.dashboard_role === "team_leader" ? `Trưởng nhóm ${teamData?.groupName || userProfile?.managed_group_name || ""}` : `TVV - ${advisor?.code || "Chưa có mã"}`}</p>
                {userProfile?.dashboard_role === "team_leader"
                  ? <strong className="tvv-current-rank"><Users size={13} />{teamData ? `${teamData.summary.activeAgents}/${Number(teamRewards?.currentTeamAdvisorCount) || teamData.summary.agents} TVV có doanh thu` : "Đang tải hoạt động nhóm"}</strong>
                  : <strong className="tvv-current-rank"><Trophy size={13} />{currentAdvisorRank ? `Hạng ${currentAdvisorRank} tháng này` : "Chưa có xếp hạng tháng này"}</strong>}
              </div>
              <button className="tvv-icon-button tvv-target-button" type="button" aria-label="Đăng ký mục tiêu" onClick={() => setTargetModalOpen(true)}>
                  <svg className="tvv-target-progress-ring" viewBox="0 0 48 48" aria-hidden="true">
                    <circle className="track" cx="24" cy="24" r="20" />
                    <circle className="value" cx="24" cy="24" r="20" strokeDasharray={targetCircleLength} strokeDashoffset={targetCircleLength - (targetCircleLength * targetProgress / 100)} />
                  </svg>
                  <span className="tvv-target-percent">{targetCompletion}%</span>
              </button>
              <button ref={notificationButtonRef} className={`tvv-icon-button${notificationCount > 0 ? " tvv-notification-alert" : ""}`} type="button" aria-label={`Thông báo (${notificationCount})`} aria-expanded={notificationsOpen} onClick={toggleNotifications}>
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
            <TvvSubHeader title={tab === "contracts" ? "Hợp đồng" : tab === "contests" ? "Thi đua" : tab === "leaderboard" ? "Bảng xếp hạng" : tab === "illustration" ? "Minh hoạ" : tab === "archive" ? "Kho tài liệu" : "Cá nhân"} onBack={() => setTab("overview")} />
          )}
          {tab === "overview" && (userProfile?.dashboard_role === "team_leader"
            ? <TeamLeaderOverview data={teamData} contestEstimate={teamRewards} currentTeamAdvisorCount={teamRewards?.currentTeamAdvisorCount} leaderboard={leaderboard} month={month} monthOptions={monthOptions} onMonthChange={setMonth} onOpenLeaderboard={() => setTab("leaderboard")} onOpenContests={() => setTab("contests")} />
            : <Overview stats={leaderboard?.advisorStats ?? stats} leaderboard={leaderboard} estimate={estimate ?? emptyEstimate} starViet={data?.currentStarViet} starVietWarning={data?.starVietWarning} onTab={setTab} />)}
          {tab === "contracts" && <ContractsListV2 contracts={selectedPeriodContracts} month={contractMonth} monthOptions={monthOptions} periodMode={periodMode} onPeriodModeChange={setPeriodMode} onMonthChange={setContractMonth} onOpenContract={setSelectedContract} showAdvisorFilter={userProfile?.dashboard_role === "team_leader"} />}
          {tab === "contests" && (userProfile?.dashboard_role === "team_leader" ? <TeamLeaderContestPage rewards={teamRewards} estimate={estimate ?? emptyEstimate} /> : <PolicyAwareContestList estimate={estimate ?? emptyEstimate} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={setPolicyMonth} />)}
          {tab === "leaderboard" && <LeaderboardPage leaderboard={leaderboard} month={month} />}
          {tab === "archive" && <ArchiveView />}
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} onAvatarChange={(avatarUrl: string) => setUserProfile((value: any) => ({ ...value, avatar_url: avatarUrl }))} onLogout={() => setSignedIn(false)} />}
        </>
      )}
      {illustrationLoaded && <IllustrationTab active={tab === "illustration"} premiumText={illustrationPremiumText} />}
      {targetModalOpen && (userProfile?.dashboard_role === "team_leader"
        ? <TeamTargetRegistrationModal month={month} teamData={teamData} registration={teamTarget} onSaved={setTeamTarget} onClose={() => setTargetModalOpen(false)} />
        : <TvvTargetRegistrationModal month={month} registration={tvvTarget} onSaved={setTvvTarget} onClose={() => setTargetModalOpen(false)} />)}
      {selectedContract && <ContractDetailModal row={selectedContract} showAdvisorName={userProfile?.dashboard_role === "team_leader"} hideCustomerNames={userProfile?.dashboard_role === "team_leader"} onClose={() => setSelectedContract(null)} />}
      <BottomNav tab={tab} setTab={setTab} />
    </main>
  );
}

function TvvSubHeader({ title, onBack, showHelp = false }: { title: string; onBack: () => void; showHelp?: boolean }) {
  return <header className="tvv-calc-header tvv-page-header"><button className="tvv-back-button" onClick={onBack} aria-label="Quay lại tổng quan"><img src="/Icon/arrow-back-up.svg" alt="" /></button><h1>{title}</h1>{title === "Hợp đồng" && <button className="tvv-header-filter" type="button" aria-label="Lọc hợp đồng"><Filter size={22} /></button>}{showHelp && <span className="tvv-header-help"><Info size={18} /> Hướng dẫn</span>}</header>;
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
      <header><div><p>ĐĂNG KÝ MỤC TIÊU</p><h2>Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">X</button></header>
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

function TeamTargetRegistrationModal({ month, teamData, registration, onSaved, onClose }: { month: string; teamData: any; registration: any; onSaved: (value: any) => void; onClose: () => void }) {
  const advisors = teamData?.allAgents?.length ? teamData.allAgents : (teamData?.agents ?? []);
  const registeredSelectedAdvisors = registration?.selected_advisors ?? [];
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
    const actual = Number(agent.ip ?? agent.afyp ?? 0) || 0;
    const percent = target > 0 ? Math.min(999, Math.round((actual / target) * 100)) : 0;
    return {
      code,
      name: item.full_name || item.agentName || agent.agentName || agent.full_name || "TVV",
      target,
      actual,
      percent,
      remaining: Math.max(0, target - actual)
    };
  }).sort((a: any, b: any) => b.percent - a.percent || b.actual - a.actual || String(a.name).localeCompare(String(b.name), "vi")), [advisorByCode, registeredSelectedAdvisors]);
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
        <header><div><p>ĐĂNG KÝ MỤC TIÊU</p><h2>Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">X</button></header>
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
          <div><strong>Danh sách TVV của nhóm</strong><span>{selectedCodes.size}/{advisors.length} TVV dự kiến có doanh thu</span></div>
          <p className="team-target-unit-note">Đơn vị: Triệu đồng</p>
          <div className="team-target-agent-list">
            {advisors.map((agent: any) => {
              const code = String(agent.agentCode || agent.advisor_code || "").trim();
              return <label key={code || agent.agentName || agent.full_name}>
                <input type="checkbox" checked={selectedCodes.has(code)} onChange={() => toggleAdvisor(code)} />
                <span><b>{agent.agentName || agent.full_name || "TVV"}{agent.isNewAdvisor && <em>new</em>}</b></span>
                <div className="team-target-agent-revenue-wrap"><input className="team-target-agent-revenue" value={advisorTargets[code] || ""} onChange={(event) => updateAdvisorTarget(code, event.target.value)} onFocus={() => { if (!selectedCodes.has(code)) toggleAdvisor(code); }} inputMode="numeric" placeholder="0" aria-label={`Mục tiêu doanh thu ${agent.agentName || agent.full_name || "TVV"} theo triệu`} /></div>
              </label>;
            })}
          </div>
        </section> : <section className="team-target-roster team-target-tracking">
          <div><strong>Tiến độ TVV đã đăng ký</strong><span>{trackingRows.length} TVV</span></div>
          <p className="team-target-unit-note">Theo doanh thu hiện tại / mục tiêu đăng ký</p>
          <div className="team-target-tracking-list">
            {trackingRows.map((row: any) => (
              <article key={row.code || row.name} className={row.percent >= 100 ? "achieved" : ""}>
                <div className="team-target-tracking-head"><b>{row.name}</b><strong>{row.percent}%</strong></div>
                <div className="team-target-progress" aria-label={`Tiến độ ${row.name} ${row.percent}%`}><i style={{ width: `${Math.min(100, row.percent)}%` }} /></div>
                <div className="team-target-tracking-meta"><span>{formatVnd(row.actual)} / {formatVnd(row.target)}</span><small>Còn {formatVnd(row.remaining)}</small></div>
              </article>
            ))}
            {!trackingRows.length && <p className="team-target-tracking-empty">Chưa có TVV nào trong đăng ký mục tiêu.</p>}
          </div>
        </section>}
        {message && <p className="error-list">{message}</p>}
        {targetView === "register" && <button type="submit" disabled={busy}>{busy ? "Đang gửi..." : "Gửi đăng ký"}</button>}
      </form>
    </div>,
    document.body
  );
}

function TeamLeaderOverview({ data, contestEstimate, currentTeamAdvisorCount, leaderboard, month, monthOptions, onMonthChange, onOpenLeaderboard, onOpenContests }: any) {
  const [showAllTeamContracts, setShowAllTeamContracts] = useState(false);
  const [showTeamActivity, setShowTeamActivity] = useState(false);
  const [showAllTeamAgents, setShowAllTeamAgents] = useState(false);
  const [selectedActivityStarAgent, setSelectedActivityStarAgent] = useState<any>(null);
  if (!data) return <section className="tvv-content team-dashboard-loading"><p>Đang tổng hợp hoạt động của nhóm…</p></section>;
  const summary = data.summary ?? {};
  const totalTeamAdvisors = Number(currentTeamAdvisorCount) || summary.agents;
  const kpis = [
    { label: "Doanh thu AFYP", value: formatCompactVnd(summary.afyp), tone: "blue", icon: BarChart3 },
    { label: "TVV hoạt động", value: `${summary.activeAgents} / ${totalTeamAdvisors}`, tone: "red", icon: Users },
    { label: "Hợp đồng", value: summary.contracts, tone: "orange", icon: FileText },
    { label: "Có hiệu lực", value: summary.issued, tone: "green", icon: CheckCircle2 }
  ];
  const allTeamContracts = (data.contracts ?? []).slice().sort((a: any, b: any) => String(b.paid_date || "").localeCompare(String(a.paid_date || "")));
  const teamAgents = data.allAgents?.length ? data.allAgents : data.agents ?? [];
  const activeTeamAgents = teamAgents.filter((agent: any) => Number(agent.afyp || agent.ip || 0) > 0);
  const inactiveTeamAgents = teamAgents.filter((agent: any) => Number(agent.afyp || agent.ip || 0) <= 0);
  const sosTeamAgents = inactiveTeamAgents.filter((agent: any) => agent.needsSos);
  const visibleTeamAgents = showAllTeamAgents ? (data.agents ?? []) : (data.agents ?? []).slice(0, 5);
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
        const isActivityCard = item.label.includes("TVV");
        const isContractsCard = item.label.includes("Hợp");
        const isInteractive = isActivityCard || isContractsCard;
        const CardTag = isInteractive ? "button" : "article";
        const onClick = isActivityCard ? () => setShowTeamActivity(true) : isContractsCard ? () => setShowAllTeamContracts(true) : undefined;
        return <CardTag className={`team-kpi-card ${item.tone}${isInteractive ? " clickable" : ""}`} key={item.label} type={isInteractive ? "button" : undefined} onClick={onClick}>
          <Icon size={20} />
          <strong>{item.value}</strong>
        </CardTag>;
      })}
    </div>

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

    <ContestPreview estimate={contestEstimate} onAll={onOpenContests} />
    <TeamLeaderStarJourney row={data?.starViet} />

    <LeaderboardPreview leaderboard={leaderboard} onOpen={onOpenLeaderboard} />
    {showTeamActivity && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTeamActivity(false); }}>
        <section className="team-activity-modal" role="dialog" aria-modal="true" aria-label="Danh sách TVV hoạt động">
          <header>
            <div><h2>TVV hoạt động</h2><p>{activeTeamAgents.length}/{totalTeamAdvisors} TVV có doanh thu</p></div>
            <button type="button" onClick={() => setShowTeamActivity(false)} aria-label="Đóng"><XCircle size={24} /></button>
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
    {selectedActivityStarAgent && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedActivityStarAgent(null); }}>
        <section className="tvv-contract-detail team-star-agent-modal" role="dialog" aria-modal="true" aria-label="Hành trình Sao Việt TVV" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><p>TVV TRONG NHÓM</p><h2>{selectedActivityStarAgent.agent?.agentName || selectedActivityStarAgent.agent?.full_name || selectedActivityStarAgent.agent?.agentCode || "TVV"}</h2></div>
            <button type="button" onClick={() => setSelectedActivityStarAgent(null)} aria-label="Đóng">×</button>
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
            <button type="button" onClick={() => setShowAllTeamContracts(false)} aria-label="Đóng"><XCircle size={24} /></button>
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
    ["Thưởng năm", rewards.annual?.reward, `${rewards.annual?.achievedQuarters || 0}/4 quý đạt`],
    ["Quản lý mới", rewards.newManager?.reward, rewards.newManager ? `Đến ${formatDateVi(rewards.newManager.validUntil)}` : "Không áp dụng"]
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
    { id: "annual", label: "Thưởng năm", currentValue: baseline?.annual?.reward ?? 0, value: rewards.annual?.reward, note: `${rewards.annual?.achievedQuarters || 0}/4 quý đạt`, icon: Medal, interactive: false },
    { id: "new-manager", label: "Quản lý mới", currentValue: baseline?.newManager?.reward ?? 0, value: rewards.newManager?.reward, note: rewards.newManager ? `Đến ${formatDateVi(rewards.newManager.validUntil)}` : "Không áp dụng", icon: Crown, interactive: false }
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
  const basisLabel = type === "monthly" ? "IP nhóm tháng hiện tại" : "IP nhóm quý hiện tại";
  const fycLabel = type === "monthly" ? "FYC tháng hiện tại" : "FYC quý hiện tại";
  const posterUrl = type === "monthly" ? "/Thưởng tháng trưởng nhóm.png" : "/Thưởng Quý trưởng nhóm.png";
  const currentRate = Math.round((detail?.rate || 0) * 100);
  const milestones = Array.isArray(detail?.milestones) ? detail.milestones : [];

  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}>
    <section className="tvv-contract-detail team-policy-detail-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <header><div><p>CHI TIẾT CHƯƠNG TRÌNH</p><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
      <div className="team-policy-detail-section"><span>Thể lệ CTTĐ</span><div className="team-policy-poster"><Image src={posterUrl} alt={`Poster thể lệ ${title}`} width={900} height={1273} sizes="(max-width: 700px) 100vw, 420px" /></div></div>
      <div className="team-policy-detail-grid">
        <article><span>{basisLabel}</span><strong>{formatVnd(Number(detail?.ip || 0))}</strong></article>
        <article><span>{fycLabel}</span><strong>{formatVnd(Number(detail?.fyc || 0))}</strong></article>
        <article><span>Bậc hiện tại</span><strong>{currentRate}% FYC</strong></article>
        <article><span>Thưởng hiện tại</span><strong>{formatVnd(Number(detail?.reward || 0))}</strong></article>
      </div>
      {type === "monthly" && <div className="team-policy-detail-note"><span>TVV HĐC hiện tại</span><strong>{Number(detail?.hdc || 0)} TVV</strong></div>}
      {type === "quarterly" && <div className="team-policy-detail-note"><span>Điều kiện TVV mới HĐC</span><strong>{detail?.hasNewAdvisor ? "Đã đạt" : "Chưa đạt"}</strong></div>}
      <div className="team-policy-detail-section"><span>Mốc tiếp theo</span>{milestones.length ? <div className="team-policy-next-list">{milestones.map((item: any) => <article key={item.title}><b>{item.title}</b><small>{item.subtitle}</small><div><span>Còn thiếu {formatVnd(Number(item.missing || 0))}</span><strong>{formatVnd(Number(item.projectedReward || 0))}</strong></div><em>+{formatVnd(Number(item.incrementalReward || 0))} so với hiện tại</em></article>)}</div> : <p className="tvv-empty">Đã đạt mốc cao nhất của chương trình này.</p>}</div>
    </section>
  </div>;
}

function TeamLeaderStarJourney({ row }: { row?: any }) {
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
  const endedPrograms = rewards?.endedPrograms ?? estimate?.endedPrograms ?? [];
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
          ? visiblePrograms.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} onOpen={setSelectedProgram} />)
          : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : "Chưa có chương trình thi đua đã kết thúc."}</p>}
    </section>
    <p className="tvv-contest-note"><Info size={17} /><span>Thưởng chính sách Trưởng nhóm được tính theo cơ chế riêng dựa trên kết quả của nhóm. Mức thưởng chính thức được xác nhận khi đủ điều kiện chi trả.</span></p>
  </section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function TeamLeaderPolicyPage({ rewards, embedded = false }: { rewards: any; embedded?: boolean }) {
    const [selectedPolicyProgram, setSelectedPolicyProgram] = useState<any>(null);
  if (!rewards) return <section className="tvv-content tvv-subpage tvv-after-sub-header"><p className="tvv-empty">Đang tính chính sách Trưởng nhóm…</p></section>;
  const programs = [
    {
      id: "team-policy-monthly",
      title: "Thưởng PTKD tháng",
      period: `Tháng ${Number(rewards.month.slice(5, 7))}/${rewards.month.slice(0, 4)}`,
      poster: "/Thưởng tháng trưởng nhóm.png",
      reward: rewards.monthly.reward,
      basisLabel: "IP nhóm tháng",
      currentBasis: rewards.monthly.ip,
      currentRateLabel: `${Math.round(rewards.monthly.rate * 100)}%`,
      milestones: rewards.monthly.milestones ?? [],
      stats: [`IP ${formatVnd(rewards.monthly.ip)}`, `FYC ${formatVnd(rewards.monthly.fyc)}`, `KPI04 ${formatVnd(rewards.monthly.kpi04Fyc)}`, `KPI05 ${formatVnd(rewards.monthly.kpi05Fyc)}`, `BC02 bổ sung ${formatVnd(rewards.monthly.bc02Fyc)}`, `${rewards.monthly.hdc} TVV HĐC`, `Tỷ lệ ${Math.round(rewards.monthly.rate * 100)}%`],
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
    ...(rewards.newManager ? [{
      id: "team-policy-new-manager",
      title: "Thưởng Quản lý mới",
      period: `Hiệu lực đến ${formatDateVi(rewards.newManager.validUntil)}`,
      poster: "",
      reward: rewards.newManager.reward,
      basisLabel: "IP nhóm tháng",
      currentBasis: rewards.newManager.ip,
      currentRateLabel: "",
      milestones: [],
      stats: [`FYP tháng ${formatVnd(rewards.newManager.ip)}`, `${rewards.newManager.hdc} TVV HĐC`, `Hiệu lực đến ${formatDateVi(rewards.newManager.validUntil)}`],
      target: null,
      remaining: 0,
      contracts: rewards.newManager.contracts
    }] : []),
    {
      id: "team-policy-recruitment",
      title: "Thưởng tuyển luyện",
      period: "Quyền lợi dành cho Trưởng nhóm",
      poster: "/Thưởng tuyển luyện.png",
      reward: 0,
      infoOnly: true,
      infoNote: "Chương trình này chỉ hiển thị để Trưởng nhóm theo dõi quyền lợi hiện có. Không tham gia vào phần tạm tính thưởng trên màn hình này."
    },
    {
      id: "team-policy-system-growth",
      title: "Thưởng phát triển hệ thống",
      period: "Quyền lợi dành cho Trưởng nhóm",
      poster: "/Thưởng phát triển hệ thống.png",
      reward: 0,
      infoOnly: true,
      infoNote: "Chương trình này chỉ hiển thị để Trưởng nhóm biết các quyền lợi về phát triển hệ thống. Dashboard không tự tính số thưởng cho mục này."
    },
    {
      id: "team-policy-new-management-benefit",
      title: "Thưởng quản lý mới",
      period: "Quyền lợi dành cho Trưởng nhóm",
      poster: "/Thưởng quản lý mới.png",
      reward: 0,
      infoOnly: true,
      infoNote: "Chương trình này chỉ hiển thị poster và thông tin tham khảo về quyền lợi quản lý mới, không tham gia vào phần tính thưởng hiện tại."
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
    milestoneType: "team-policy",
    isTeamPolicy: true,
    teamPolicy: {
      basisLabel: program.basisLabel,
      currentBasis: program.currentBasis,
      currentReward: program.reward,
      currentRateLabel: program.currentRateLabel,
      nextTiers: program.milestones
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
      <header><div><p>THƯỞNG TVV DỰ KIẾN</p><h2>{advisor.agentName || advisor.full_name || draft.advisorCode || "TVV"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
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

function Overview({ stats, leaderboard, estimate, starViet, starVietWarning, onTab }: any) {
  const statItems = [
    ["Tổng HĐ", stats.total, "blue", "contracts"],
    ["Đã phát hành", stats.issued, "green", "contracts"],
    ["Chờ xử lý", stats.pending, "orange", "contracts"],
    ["Hết hiệu lực", stats.invalid, "red", "contracts"]
  ];
  return <section className="tvv-content">
    <div className="tvv-stat-card">{statItems.map(([label, value, tone, target]: any) => <div className="tvv-stat" role="button" tabIndex={0} key={label} onClick={() => onTab(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTab(target); } }} aria-label={`${label}: ${value}. Xem hợp đồng`}><strong className={`stat-${tone}`}>{value}</strong><p>{label}</p><i className={`stat-${tone}`} /></div>)}</div>
    <LeaderboardPreview leaderboard={leaderboard} onOpen={() => onTab("leaderboard")} />
    <ContestPreview estimate={estimate} onAll={() => onTab("contests")} />
    <PersonalStarJourney row={starViet} warning={starVietWarning} />
    <ArchivePreview onOpen={() => onTab("archive")} />
  </section>;
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
    ended: estimate?.endedPrograms ?? [],
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
    <section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <PolicyAwareContestRow key={item.programId} item={item} index={index} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : view === "ended" ? "Chưa có chương trình thi đua đã kết thúc." : "Chưa có thưởng chính sách."}</p>}</section>
    <p className="tvv-contest-note"><Info size={17} /><span>Ước tính thưởng được cập nhật dựa trên dữ liệu hiện tại. Mức thưởng chính thức sẽ được xác nhận khi chương trình kết thúc.</span></p>
  </section>{selectedProgram && <ContestDetailModal item={selectedProgram} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onClose={() => setSelectedProgram(null)} />}</>;
}

function PolicyAwareContestRow({ item, onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className="tvv-contest-row" role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}>
    <div>
      <em>{isPolicy ? "THƯỞNG CHÍNH SÁCH" : "ĐANG DIỄN RA"}</em>
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
    ended: estimate?.endedPrograms ?? [],
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
  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page"><section className="tvv-contest-summary"><h2>Tổng quan thi đua</h2><div><span><b>Đang diễn ra</b><strong>{groups.ongoing.length}</strong><em>chương trình</em></span><span><b>Sắp kết thúc</b><strong>{soonEndingCount}</strong><em>chương trình</em></span><span><b>Ước tính thưởng</b><strong>{formatVnd(totalReward)}</strong><em>Tổng có thể nhận</em></span></div></section><div className="tvv-contest-filter">{tabs.map(([id, label, rows]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{label}</span><strong>{formatVnd(rows.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0))}</strong></button>)}</div><section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "Chưa có chương trình thi đua đang diễn ra." : view === "ended" ? "Chưa có chương trình thi đua đã kết thúc." : "Chưa có thưởng chính sách."}</p>}</section><p className="tvv-contest-note"><Info size={17} /><span>Ước tính thưởng được cập nhật dựa trên dữ liệu hiện tại. Mức thưởng chính thức sẽ được xác nhận khi chương trình kết thúc.</span></p></section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function ContestRow({ item, index, compact = false, onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className={`tvv-contest-row${compact ? " compact" : ""}`} role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}><div><em>{isPolicy ? "THƯỞNG CHÍNH SÁCH" : "ĐANG DIỄN RA"}</em><b>{shortText(item.programName, compact ? 62 : 74)}</b><small><CalendarDays size={14} />{isPolicy ? item.period : `${formatDateVi(item.startDate)} - ${formatDateVi(item.endDate)}`}</small>{hasReward && !compact && !isPolicy && <><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HĐ đủ điều kiện</small></>}</div>{(hasReward || isPolicy) && !compact && <strong>{formatVnd(item.estimatedReward)}</strong>}<ChevronRight size={24} /></article>;
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
    <header><div>{policyOptions.length ? <div className="tvv-policy-modal-period"><MonthPicker value={policyPickerValue(item.programId, policyMonth!)} options={policyOptions} onChange={onPolicyMonthChange!} ariaLabel="Chọn kỳ thưởng chính sách" /></div> : <em>{item.period || "ĐANG DIỄN RA"}</em>}<h2>{item.programName || "Chương trình thi đua"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
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
    {!item.infoOnly && (!policyRows || detailTab === "overview") && <div className="tvv-current-tier-card">
      <span>Hiện tại</span>
      <strong>{milestoneInfo.basisLabel === "hợp đồng" || milestoneInfo.basisLabel === "HĐ đủ điều kiện" ? `${milestoneInfo.currentBasis} HĐ` : milestoneInfo.basisLabel === "Quý đạt" ? `${milestoneInfo.currentBasis}/4 quý` : formatCompactVnd(milestoneInfo.currentBasis)}</strong>
      {milestoneInfo.currentRateLabel && <em>Bậc hiện tại: {milestoneInfo.currentRateLabel}</em>}
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
    {!item.infoOnly && !item.teamScoped && (!policyRows || detailTab === "overview") && <div className="tvv-next-milestones">
      <div className="tvv-next-milestones-head">
        <span>Mốc tiếp theo</span>
      </div>
      {milestoneInfo.nextTiers.length ? <div className="tvv-next-milestone-grid">{milestoneInfo.nextTiers.map((tier: any) => (
        <article key={`${tier.title}-${tier.subtitle}`}>
          <div>
            <b>{tier.title}</b>
            <small>{tier.subtitle}</small>
          </div>
          <p>Cần thêm <strong>{tier.missingLabel === "hợp đồng" ? `${tier.missing} HĐ` : formatCompactFee(tier.missing)}</strong>{tier.missingLabel !== "hợp đồng" && ` ${tier.missingLabel}`}</p>
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
      <button type="button" onClick={() => setPreviewUrl(null)} aria-label="Đóng ảnh">×</button>
      <img src={previewUrl} alt={`Poster ${item.programName || "chương trình thi đua"}`} onClick={(event) => event.stopPropagation()} />
    </div>, document.body)}
  </section></div>;
}

function ContractsListV2({ contracts, month, monthOptions, periodMode, onPeriodModeChange, onMonthChange, onOpenContract, showAdvisorFilter = false }: any) {
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "pending" | "refunded">("all");
  const [selectedAdvisorKey, setSelectedAdvisorKey] = useState("all");
  const [selectedAdvisorSnapshot, setSelectedAdvisorSnapshot] = useState<{ key: string; code: string; name: string } | null>(null);
  const [advisorMenuOpen, setAdvisorMenuOpen] = useState(false);
  const advisorMenuRef = useRef<HTMLDivElement>(null);
  const advisorOptions = useMemo(() => {
    const values = new Map<string, { key: string; code: string; name: string }>();
    contracts.forEach((row: any) => {
      const code = String(row.agent_code || "").trim();
      const name = String(row.agent_name || "TVV").trim();
      const key = code || name;
      if (key && !values.has(key)) values.set(key, { key, code, name });
    });
    return [...values.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [contracts]);
  const visibleAdvisorOptions = selectedAdvisorSnapshot
    && selectedAdvisorKey !== "all"
    && !advisorOptions.some((option) => option.key === selectedAdvisorKey)
    ? [selectedAdvisorSnapshot, ...advisorOptions]
    : advisorOptions;
  const selectedAdvisor = visibleAdvisorOptions.find((option) => option.key === selectedAdvisorKey);
  useEffect(() => {
    if (!advisorMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!advisorMenuRef.current?.contains(event.target as Node)) setAdvisorMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [advisorMenuOpen]);

  function selectAdvisor(key: string) {
    setSelectedAdvisorKey(key);
    setSelectedAdvisorSnapshot(key === "all" ? null : advisorOptions.find((option) => option.key === key) ?? selectedAdvisorSnapshot);
    setStatusFilter("all");
    setAdvisorMenuOpen(false);
  }
  const advisorScopedContracts = selectedAdvisorKey === "all"
    ? contracts
    : contracts.filter((row: any) => String(row.agent_code || row.agent_name || "").trim() === selectedAdvisorKey);
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

  return <section className="tvv-content tvv-contract-template">
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
          <span>{filteredContracts.length} HĐ</span>
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
                <span><b>{option.name}</b><small>{option.code || "Chưa có mã TVV"}</small></span>
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
  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contract-detail" role="dialog" aria-modal="true" aria-label="Chi tiết hợp đồng" onClick={(event) => event.stopPropagation()}><header><div><p>{display.applicationNo}</p><h2>{showAdvisorName ? row.agent_name || "TVV" : display.policyOwner}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header><div className="tvv-contract-detail-grid">{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>;
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
    <section className="tvv-calc-card"><h2>1. Nhập thông tin hợp đồng</h2><div className="tvv-form-grid tvv-form-grid-compact"><label>Phí đóng (PĐT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>đ</span></div></label><label>Ngày nộp phí dự kiến<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" onClick={props.onAdd}>+ Thêm hợp đồng</button></section>
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
  const minhHoaVersion = "20260706-compact-relation-card";
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
    {rewards?.newManager && <article><h2>4. Quản lý mới</h2><p>Áp dụng trong 12 tháng đầu kể từ ngày hiệu lực chức vụ. Xét theo FYP nhóm và số TVV HĐC từng tháng.</p><strong>Hiện tại: {formatVnd(rewards.newManager.reward)}</strong></article>}
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
      {documents.map((item) => <button type="button" className="tvv-archive-file" key={item.id} onClick={() => item.file && setSelectedFile({ kind: "pdf", title: item.title, file: item.file })}>
        <span>PDF</span><b>{item.title}</b><small>{item.size ?? "PDF"}</small><ChevronRight size={20} />
      </button>)}
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
        <header><span><FileText size={18} /><b>{selectedFile.title}</b></span><button type="button" onClick={() => setSelectedFile(null)} aria-label="Đóng">×</button></header>
        <iframe src={selectedFile.kind === "youtube" ? youtubeEmbedSrc(selectedFile) : archiveFileSrc(selectedFile.file)} title={selectedFile.title} allow={selectedFile.kind === "youtube" ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" : undefined} allowFullScreen={selectedFile.kind === "youtube"} />
        {selectedFile.kind === "pdf" && <a href={archiveFileSrc(selectedFile.file)} download><Download size={16} />Tải xuống</a>}
      </section>
    </div>}
  </section>;
}

function UserLoginScreen({ onSuccess }: { onSuccess: () => void }) {
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
    onSuccess();
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

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<[Tab, string, any]> = [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Thu nhập", Calculator], ["contests", "Thi đua", Trophy], ["illustration", "Minh hoạ", FileText]];
  return <nav className="tvv-bottom-nav" aria-label="Điều hướng chính">{items.map(([id, label, Icon]) => <button type="button" key={id} className={`${tab === id ? "active" : ""}${id === "calculator" ? " income-nav" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{id === "calculator" ? <img src="/Icon/Icon baoviet.png" alt="" /> : <Icon size={25} />}<span>{label}</span></button>)}</nav>;
}



