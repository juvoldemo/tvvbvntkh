"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Bell, BookOpen, CalendarDays, Calculator, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Crown, Download, FileText, Filter, FolderOpen, GripVertical, Gift, Home, Hourglass, Info, Medal, Search, ShieldCheck, Sparkles, Trash2, Trophy, UserRound, Users, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";

type Tab = "overview" | "contracts" | "calculator" | "contests" | "leaderboard" | "illustration" | "profile" | "archive";
type PeriodMode = "month" | "quarter" | "year";
type DraftContract = { id: string; productName: string; productCode?: string; premium: number; expectedPaidDate: string; expectedIssueDate?: string; status?: string };
type AdminEvent = { id: string; title: string; content: string; event_date: string | null; created_at: string };

const fallbackAdvisor = {
  key: "D1021A1YNG__LÃª Thá»‹ Má»¹ ChÃ¢u",
  code: "D1021A1YNG",
  name: "LÃª Thá»‹ Má»¹ ChÃ¢u",
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

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateVi(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function moneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

function parseMoneyInput(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function formatCompactVnd(value: unknown) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tá»·`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  return formatVnd(amount);
}

function formatRate(value: unknown) {
  const rate = Number(value) || 0;
  return `${Math.round(rate * 100)}%`;
}

function statusTone(status: unknown) {
  const normalized = normalizeStatusText(status);
  if (normalized === "co hieu luc") return { label: "ÄÃ£ phÃ¡t hÃ nh", tone: "green", icon: CheckCircle2 };
  if (["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(normalized)) return { label: "Háº¿t hiá»‡u lá»±c", tone: "red", icon: XCircle };
  if (["cho dgrr", "dang dgrr", "cho kiem tra ycbh"].includes(normalized)) return { label: "Äang tháº©m Ä‘á»‹nh", tone: "blue", icon: Search };
  return { label: status ? String(status) : "Chá» xá»­ lÃ½", tone: "orange", icon: Hourglass };
}

function monthLabel(month: string) {
  return `ThÃ¡ng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
}

function quarterLabel(month: string) {
  const quarter = Math.ceil(Number(month.slice(5, 7)) / 3);
  return `QuÃ½ ${quarter}/${month.slice(0, 4)}`;
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
    .replace(/[Ä‘Ä]/g, "d")
    .toLowerCase();
  if (id === "acquisition-commission" || name.includes("hoa hong khai thac")) return 1;
  if (id === "policy-quarterly" || name.includes("thuong quy tvv")) return 2;
  if (id === "policy-monthly" || name.includes("thuong nang suat thang")) return 3;
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
    return { value: `${year}-01`, label: `NÄƒm ${year}` };
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
      if (!response.ok) throw new Error(`${url} tráº£ vá» lá»—i ${response.status}`);
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
  const [drafts, setDrafts] = useState<DraftContract[]>([]);
  const [productName, setProductName] = useState("An Thá»‹nh PhÃºc NiÃªn");
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
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 12 });
  const [readEventIds, setReadEventIds] = useState<string[]>([]);
  const [readEventsReady, setReadEventsReady] = useState(false);
  const [notificationView, setNotificationView] = useState<"unread" | "read">("unread");
  const [openedNotificationIds, setOpenedNotificationIds] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [teamContractData, setTeamContractData] = useState<any>(null);
  const [teamRewards, setTeamRewards] = useState<any>(null);
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
    if (!signedIn) return;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setUserProfile(payload.profile ?? null));
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || userProfile?.dashboard_role !== "team_leader") {
      setTeamData(null);
      setTeamRewards(null);
      return;
    }
    const controller = new AbortController();
    Promise.all([
      fetchJsonWithRetry(`/api/team-dashboard?month=${month}`, controller.signal),
      fetchJsonWithRetry(`/api/team-leader-rewards?month=${month}`, controller.signal)
    ]).then(([teamPayload, rewardPayload]) => {
      setTeamData(teamPayload);
      setTeamRewards(rewardPayload);
    }).catch(() => {
      setTeamData(null);
      setTeamRewards(null);
    });
    return () => controller.abort();
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
    fetch("/api/events", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { events: [] })
      .then((payload) => setAdminEvents(payload.events ?? []))
      .catch(() => setAdminEvents([]));
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
    if (!signedIn || !code) return;
    let cancelled = false;
    const controller = new AbortController();
    const advisorCode = encodeURIComponent(code);
    fetchJsonWithRetry(`/api/tvv-leaderboard?month=${month}&advisorCode=${advisorCode}`, controller.signal)
      .then((payload) => {
        if (!cancelled) setLeaderboard(payload);
      })
      .catch(() => {
        // Preserve the last successful ranking during a temporary network failure.
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authenticatedAdvisorCode, month, signedIn, userProfile?.advisor_code]);

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
    const names = new Set(myContracts.map((row: any) => row.product_name || row.raw_data?.product || row.raw_data?.["Sáº£n pháº©m chÃ­nh"]).filter(Boolean));
    ["An Thá»‹nh PhÃºc NiÃªn", "An TÃ¢m Hoáº¡ch Äá»‹nh"].forEach((name) => names.add(name));
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
    setDrafts((current) => [...current, { id: crypto.randomUUID(), productName, productCode: productName.includes("PhÃºc NiÃªn") ? "BV-NCUVL08" : "", premium, expectedPaidDate: paidDate, expectedIssueDate: paidDate, status: "CÃ³ hiá»‡u lá»±c" }]);
  }

  function openIllustrationWithPremium(value: string) {
    const premium = parseMoneyInput(value);
    if (premium <= 0) return;
    setIllustrationPremiumText(String(premium));
    setIllustrationLoaded(true);
    setTab("illustration");
  }

  const draftRewards = new Map((estimate?.rewardByDraftContract ?? []).map((item: any) => [item.draftId, item]));

  if (!authReady) return <main className="tvv-user-login"><p>Äang kiá»ƒm tra Ä‘Äƒng nháº­pâ€¦</p></main>;
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
              <button className="tvv-avatar tvv-avatar-button" type="button" onClick={() => setTab("profile")} aria-label="Má»Ÿ trang cÃ¡ nhÃ¢n">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : <UserRound size={40} />}</button>
              <div>
                <h1>Xin chÃ o, {userProfile?.full_name || advisor?.name || "TVV"} <span>ðŸ‘‹</span></h1>
                <p>{userProfile?.dashboard_role === "team_leader" ? `TrÆ°á»Ÿng nhÃ³m ${teamData?.groupName || userProfile?.managed_group_name || ""}` : `TVV - ${advisor?.code || "ChÆ°a cÃ³ mÃ£"}`}</p>
                {userProfile?.dashboard_role === "team_leader"
                  ? <strong className="tvv-current-rank"><Users size={13} />{teamData ? `${teamData.summary.activeAgents}/${teamData.summary.agents} TVV cÃ³ doanh thu` : "Äang táº£i hoáº¡t Ä‘á»™ng nhÃ³m"}</strong>
                  : <strong className="tvv-current-rank"><Trophy size={13} />{currentAdvisorRank ? `Háº¡ng ${currentAdvisorRank} thÃ¡ng nÃ y` : "ChÆ°a cÃ³ xáº¿p háº¡ng thÃ¡ng nÃ y"}</strong>}
              </div>
              <button ref={notificationButtonRef} className={`tvv-icon-button${notificationCount > 0 ? " tvv-notification-alert" : ""}`} type="button" aria-label={`ThÃ´ng bÃ¡o (${notificationCount})`} aria-expanded={notificationsOpen} onClick={toggleNotifications}>
                <Bell size={28} />
                {notificationCount > 0 && <b>{notificationCount}</b>}
              </button>
              {notificationsOpen && typeof document !== "undefined" && createPortal(
                <div ref={notificationPanelRef} className="tvv-notification-panel" style={{ top: notificationPosition.top, right: notificationPosition.right }}>
                  <div className="tvv-notification-heading" role="tablist" aria-label="Há»™p thÃ´ng bÃ¡o">
                    <button type="button" role="tab" aria-selected={notificationView === "unread"} className={notificationView === "unread" ? "active" : ""} onClick={() => setNotificationView("unread")}>ThÃ´ng bÃ¡o</button>
                    <button type="button" role="tab" aria-selected={notificationView === "read"} className={notificationView === "read" ? "active" : ""} onClick={() => setNotificationView("read")}>ÄÃ£ xem</button>
                  </div>
                  {displayedNotifications.length === 0 ? <p className="tvv-notification-empty">{notificationView === "unread" ? "KhÃ´ng cÃ³ thÃ´ng bÃ¡o má»›i." : "ChÆ°a cÃ³ thÃ´ng bÃ¡o Ä‘Ã£ xem."}</p> : displayedNotifications.map((item) => (
                    <article key={item.id}>
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                      <small>{item.event_date ? `Sá»± kiá»‡n: ${new Date(item.event_date).toLocaleString("vi-VN")}` : new Date(item.created_at).toLocaleString("vi-VN")}</small>
                    </article>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </header>
          ) : (
            <TvvSubHeader title={tab === "contracts" ? "Há»£p Ä‘á»“ng" : tab === "contests" ? "Thi Ä‘ua" : tab === "leaderboard" ? "Báº£ng xáº¿p háº¡ng" : tab === "illustration" ? "Minh hoáº¡" : tab === "archive" ? "Kho tÃ i liá»‡u" : "CÃ¡ nhÃ¢n"} onBack={() => setTab("overview")} />
          )}
          {tab === "overview" && (userProfile?.dashboard_role === "team_leader"
            ? <TeamLeaderOverview data={teamData} leaderboard={leaderboard} month={month} monthOptions={monthOptions} onMonthChange={setMonth} onOpenLeaderboard={() => setTab("leaderboard")} />
            : <Overview stats={leaderboard?.advisorStats ?? stats} leaderboard={leaderboard} estimate={estimate ?? emptyEstimate} starViet={data?.currentStarViet} starVietWarning={data?.starVietWarning} onTab={setTab} />)}
          {tab === "contracts" && <ContractsListV2 contracts={selectedPeriodContracts} month={contractMonth} monthOptions={monthOptions} periodMode={periodMode} onPeriodModeChange={setPeriodMode} onMonthChange={setContractMonth} onOpenContract={setSelectedContract} showAdvisorFilter={userProfile?.dashboard_role === "team_leader"} />}
          {tab === "contests" && (userProfile?.dashboard_role === "team_leader" ? <TeamLeaderPolicyPage rewards={teamRewards} /> : <PolicyAwareContestList estimate={estimate ?? emptyEstimate} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={setPolicyMonth} />)}
          {tab === "leaderboard" && <LeaderboardPage leaderboard={leaderboard} month={month} />}
          {tab === "archive" && <ArchiveView />}
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} onAvatarChange={(avatarUrl: string) => setUserProfile((value: any) => ({ ...value, avatar_url: avatarUrl }))} onLogout={() => setSignedIn(false)} />}
        </>
      )}
      {illustrationLoaded && (userProfile?.dashboard_role === "team_leader"
        ? <TeamLeaderPolicyIllustration active={tab === "illustration"} rewards={teamRewards} />
        : <IllustrationTab active={tab === "illustration"} premiumText={illustrationPremiumText} />)}
      {selectedContract && <ContractDetailModal row={selectedContract} showAdvisorName={userProfile?.dashboard_role === "team_leader"} onClose={() => setSelectedContract(null)} />}
      <BottomNav tab={tab} setTab={setTab} />
    </main>
  );
}

function TvvSubHeader({ title, onBack, showHelp = false }: { title: string; onBack: () => void; showHelp?: boolean }) {
  return <header className="tvv-calc-header tvv-page-header"><button className="tvv-back-button" onClick={onBack} aria-label="Quay láº¡i tá»•ng quan"><img src="/Icon/arrow-back-up.svg" alt="" /></button><h1>{title}</h1>{title === "Há»£p Ä‘á»“ng" && <button className="tvv-header-filter" type="button" aria-label="Lá»c há»£p Ä‘á»“ng"><Filter size={22} /></button>}{showHelp && <span className="tvv-header-help"><Info size={18} /> HÆ°á»›ng dáº«n</span>}</header>;
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

function TeamLeaderOverview({ data, leaderboard, month, monthOptions, onMonthChange, onOpenLeaderboard }: any) {
  const [selectedTeamStatus, setSelectedTeamStatus] = useState<"issued" | "pending" | "refunded" | null>(null);
  const [showAllTeamAgents, setShowAllTeamAgents] = useState(false);
  if (!data) return <section className="tvv-content team-dashboard-loading"><p>Äang tá»•ng há»£p hoáº¡t Ä‘á»™ng cá»§a nhÃ³mâ€¦</p></section>;
  const summary = data.summary ?? {};
  const kpis = [
    { label: "Doanh thu AFYP", value: formatCompactVnd(summary.afyp), tone: "blue", icon: BarChart3 },
    { label: "TVV hoáº¡t Ä‘á»™ng", value: `${summary.activeAgents} / ${summary.agents}`, tone: "green", icon: Users },
    { label: "Há»£p Ä‘á»“ng", value: summary.contracts, tone: "orange", icon: FileText },
    { label: "Cáº§n theo dÃµi", value: summary.pending + summary.dgrr + summary.invalid, tone: "purple", icon: Trophy }
  ];
  const statuses = [
    { key: "issued" as const, label: "ÄÃ£ phÃ¡t hÃ nh", value: summary.issued, tone: "green", icon: CheckCircle2 },
    { key: "pending" as const, label: "Chá» xá»­ lÃ½", value: summary.pending + summary.dgrr, tone: "orange", icon: Hourglass },
    { key: "refunded" as const, label: "HoÃ n phÃ­", value: summary.invalid, tone: "red", icon: XCircle }
  ];
  const selectedStatus = statuses.find((item) => item.key === selectedTeamStatus);
  const selectedContracts = selectedTeamStatus
    ? (data.contracts ?? [])
      .filter((row: any) => contractStatusGroup(row) === selectedTeamStatus)
      .sort((a: any, b: any) => String(b.paid_date || "").localeCompare(String(a.paid_date || "")))
    : [];
  const visibleTeamAgents = showAllTeamAgents ? (data.agents ?? []) : (data.agents ?? []).slice(0, 5);
  return <section className="tvv-content team-dashboard">
    <div className="team-dashboard-toolbar team-dashboard-toolbar-compact">
      <MonthPicker value={month} options={monthOptions} onChange={onMonthChange} ariaLabel="Chá»n thÃ¡ng bÃ¡o cÃ¡o nhÃ³m" />
    </div>

    <div className="team-kpi-grid">
      {kpis.map((item) => {
        const Icon = item.icon;
        return <article className={`team-kpi-card ${item.tone}`} key={item.label}>
          <Icon size={20} />
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>;
      })}
    </div>

    <section className="team-overview-panel team-ranking-panel">
      <div className="team-panel-header">
        <div><Crown size={18} /><div><h2>Top TVV trong nhÃ³m</h2></div></div>
        {(data.agents ?? []).length > 5 && <button type="button" onClick={() => setShowAllTeamAgents((value) => !value)}>{showAllTeamAgents ? "Thu gá»n" : "Xem táº¥t cáº£"} <ChevronRight size={14} /></button>}
      </div>
      <div className="team-agent-list">
        {visibleTeamAgents.map((agent: any) => (
          <article className="team-agent-card team-agent-card-compact" key={agent.agentCode || agent.agentName}>
            <div className={`team-agent-rank rank-${agent.rank}`}>{agent.rank}</div>
            <div className="team-agent-avatar">{agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : <UserRound size={19} />}</div>
            <div className="team-agent-main">
              <div className="team-agent-title"><div><strong>{agent.agentName}</strong><small>{Math.max(Number(agent.contracts || 0) - Number(agent.invalid || 0), 0)} HÄ</small></div><b>{Number(agent.ip || 0).toLocaleString("vi-VN")}</b></div>
            </div>
          </article>
        ))}
        {!data.agents?.length && <p className="team-empty">NhÃ³m chÆ°a cÃ³ há»£p Ä‘á»“ng trong thÃ¡ng Ä‘Ã£ chá»n.</p>}
      </div>
    </section>

    <section className="team-overview-panel team-status-panel">
      <div className="team-panel-header">
        <div><div><h2>TÃ¬nh hÃ¬nh há»£p Ä‘á»“ng</h2></div></div>
      </div>
      <div className="team-status-grid">
        {statuses.map((item) => {
          const Icon = item.icon;
          return <button type="button" className={item.tone} key={item.label} onClick={() => setSelectedTeamStatus(item.key)} aria-label={`Xem ${item.value} GYC ${item.label}`}>
            <div><Icon size={18} /><span>{item.label}</span></div>
            <strong>{item.value}</strong>
          </button>;
        })}
      </div>
    </section>

    <LeaderboardPreview leaderboard={leaderboard} onOpen={onOpenLeaderboard} />
    {selectedTeamStatus && typeof document !== "undefined" && createPortal(
      <div className="team-contract-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTeamStatus(null); }}>
        <section className="team-contract-modal" role="dialog" aria-modal="true" aria-label={`Danh sÃ¡ch GYC ${selectedStatus?.label}`}>
          <header>
            <div><h2>{selectedStatus?.label}</h2><p>{selectedContracts.length} GYC trong thÃ¡ng</p></div>
            <button type="button" onClick={() => setSelectedTeamStatus(null)} aria-label="ÄÃ³ng"><XCircle size={24} /></button>
          </header>
          <div className="team-contract-modal-list">
            {selectedContracts.map((row: any) => (
              <article key={row.id || row.application_no || row.contract_no}>
                <div><span>BMBH</span><strong>{row.policy_owner || row.raw_data?.["BÃŠN MUA Báº¢O HIá»‚M (BMBH)"] || "â€”"}</strong></div>
                <div><span>TVV</span><strong>{row.agent_name || "â€”"}</strong></div>
                <div><span>NgÃ y hiá»‡u lá»±c</span><strong>{formatDateVi(row.paid_date || row.raw_data?.["NGÃ€Y THU"])}</strong></div>
                <div><span>NgÃ y phÃ¡t hÃ nh</span><strong>{formatDateVi(row.issued_date || row.raw_data?.["NGÃ€Y PHÃT HÃ€NH"])}</strong></div>
                <div><span>IP</span><strong>{Number(row.ip || 0).toLocaleString("vi-VN")}</strong></div>
                <em className={contractStatusGroup(row)}>{row.policy_status || "Chá» xá»­ lÃ½"}</em>
              </article>
            ))}
            {!selectedContracts.length && <p className="team-contract-modal-empty">KhÃ´ng cÃ³ GYC á»Ÿ tráº¡ng thÃ¡i nÃ y.</p>}
          </div>
        </section>
      </div>,
      document.body
    )}
  </section>;
}

function TeamLeaderRewardSummary({ rewards }: { rewards: any }) {
  const items = [
    ["ThÆ°á»Ÿng PTKD thÃ¡ng", rewards.monthly?.reward, `${Math.round((rewards.monthly?.rate || 0) * 100)}% FYC`],
    ["ThÆ°á»Ÿng QuÃ½", rewards.quarterly?.reward, `${Math.round((rewards.quarterly?.rate || 0) * 100)}% FYC`],
    ["ThÆ°á»Ÿng nÄƒm", rewards.annual?.reward, `${rewards.annual?.achievedQuarters || 0}/4 quÃ½ Ä‘áº¡t`],
    ["Quáº£n lÃ½ má»›i", rewards.newManager?.reward, rewards.newManager ? `Äáº¿n ${formatDateVi(rewards.newManager.validUntil)}` : "KhÃ´ng Ã¡p dá»¥ng"]
  ];
  return <section className="team-overview-panel team-reward-summary">
    <div className="team-reward-summary-head"><div><Gift size={18} /><span><h2>ThÆ°á»Ÿng chÃ­nh sÃ¡ch TrÆ°á»Ÿng nhÃ³m</h2><p>Táº¡m tÃ­nh theo dá»¯ liá»‡u hiá»‡n táº¡i</p></span></div><strong>{formatVnd(rewards.totalEstimatedReward || 0)}</strong></div>
    <div className="team-reward-summary-grid">{items.map(([label, value, note]) => <article key={String(label)}><span>{label}</span><strong>{formatVnd(Number(value) || 0)}</strong><small>{note}</small></article>)}</div>
  </section>;
}

function TeamLeaderPolicyPage({ rewards }: { rewards: any }) {
  const [openProgram, setOpenProgram] = useState("");
  if (!rewards) return <section className="tvv-content tvv-subpage tvv-after-sub-header"><p className="tvv-empty">Äang tÃ­nh chÃ­nh sÃ¡ch TrÆ°á»Ÿng nhÃ³mâ€¦</p></section>;
  const programs = [
    {
      title: "ThÆ°á»Ÿng PTKD thÃ¡ng",
      reward: rewards.monthly.reward,
      stats: [`IP ${formatVnd(rewards.monthly.ip)}`, `FYC ${formatVnd(rewards.monthly.fyc)}`, `${rewards.monthly.hdc} TVV HÄC`, `Tá»· lá»‡ ${Math.round(rewards.monthly.rate * 100)}%`],
      target: rewards.monthly.nextIpTarget,
      remaining: rewards.monthly.remainingIp,
      contracts: rewards.monthly.contracts
    },
    {
      title: `ThÆ°á»Ÿng QuÃ½ ${rewards.quarterly.quarter}`,
      reward: rewards.quarterly.reward,
      stats: [`FYC quÃ½ ${formatVnd(rewards.quarterly.fyc)}`, `KPI04 ${formatVnd(rewards.quarterly.kpiFyc)}`, `BC02 bá»• sung ${formatVnd(rewards.quarterly.supplementalFyc)}`, rewards.quarterly.hasNewAdvisor ? "CÃ³ TVV má»›i HÄC" : "ChÆ°a cÃ³ TVV má»›i HÄC", `Tá»· lá»‡ ${Math.round(rewards.quarterly.rate * 100)}%`],
      target: rewards.quarterly.nextIpTarget,
      remaining: rewards.quarterly.remainingIp,
      contracts: rewards.quarterly.contracts
    },
    {
      title: `ThÆ°á»Ÿng nÄƒm ${rewards.annual.year}`,
      reward: rewards.annual.reward,
      stats: [`FYP nÄƒm ${formatVnd(rewards.annual.ip)}`, `${rewards.annual.achievedQuarters}/4 quÃ½ Ä‘áº¡t`, "Táº¡m tÃ­nh, chi tráº£ má»™t láº§n"],
      target: null,
      remaining: 0,
      contracts: []
    },
    ...(rewards.newManager ? [{
      title: "ThÆ°á»Ÿng Quáº£n lÃ½ má»›i",
      reward: rewards.newManager.reward,
      stats: [`FYP thÃ¡ng ${formatVnd(rewards.newManager.ip)}`, `${rewards.newManager.hdc} TVV HÄC`, `Hiá»‡u lá»±c Ä‘áº¿n ${formatDateVi(rewards.newManager.validUntil)}`],
      target: null,
      remaining: 0,
      contracts: rewards.newManager.contracts
    }] : [])
  ];
  return <section className="tvv-content tvv-subpage tvv-after-sub-header team-policy-page">
    <div className="team-policy-total"><span>Tá»•ng thÆ°á»Ÿng táº¡m tÃ­nh</span><strong>{formatVnd(rewards.totalEstimatedReward)}</strong><small>NhÃ³m {rewards.groupName}</small></div>
    {programs.map((program) => <article className="team-policy-card" key={program.title}>
      <div className="team-policy-card-head"><div><Trophy size={19} /><h2>{program.title}</h2></div><strong>{formatVnd(program.reward)}</strong></div>
      <div className="team-policy-stats">{program.stats.map((item) => <span key={item}>{item}</span>)}</div>
      {program.target && <div className="team-policy-next"><span>Má»‘c FYP tiáº¿p theo <b>{formatVnd(program.target)}</b></span><strong>CÃ²n {formatVnd(program.remaining)}</strong><i><u style={{ width: `${Math.min(100, ((program.target - program.remaining) / program.target) * 100)}%` }} /></i></div>}
      {program.contracts.length > 0 && <><button className="team-policy-contract-toggle" type="button" onClick={() => setOpenProgram((value) => value === program.title ? "" : program.title)}>{openProgram === program.title ? "áº¨n há»£p Ä‘á»“ng" : `Xem ${program.contracts.length} HÄ Ä‘Ã³ng gÃ³p`} <ChevronDown size={14} /></button>
      {openProgram === program.title && <div className="team-policy-contracts">{program.contracts.map((row: any) => <div key={row.id || row.application_no || row.contract_no}><span><b>{row.application_no || row.contract_no}</b><small>{row.agent_name}</small></span><strong>{formatVnd(row.ip)}</strong></div>)}</div>}</>}
    </article>)}
    <section className="team-policy-quarters"><h2>Tiáº¿n Ä‘á»™ thÆ°á»Ÿng nÄƒm</h2>{rewards.annual.quarters.map((item: any) => <div key={item.quarter}><span>QuÃ½ {item.quarter}</span><strong>{formatVnd(item.ip)}</strong><em className={item.achieved ? "achieved" : ""}>{item.achieved ? "Äáº¡t" : "ChÆ°a Ä‘áº¡t"}</em></div>)}</section>
  </section>;
}

function TeamLeaderCalculator({ month, teamData, baseline, onBack }: any) {
  const [advisorCode, setAdvisorCode] = useState("");
  const [ipText, setIpText] = useState("");
  const [expectedPaidDate, setExpectedPaidDate] = useState(`${month}-01`);
  const [isNewAdvisor, setIsNewAdvisor] = useState(false);
  const [draftContracts, setDraftContracts] = useState<any[]>([]);
  const [result, setResult] = useState<any>(baseline);
  const [calculating, setCalculating] = useState(false);

  async function calculate(nextDrafts = draftContracts) {
    setCalculating(true);
    try {
      const response = await fetch("/api/team-leader-rewards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, draftContracts: nextDrafts })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "KhÃ´ng tÃ­nh Ä‘Æ°á»£c thÆ°á»Ÿng.");
      setResult(payload);
    } finally { setCalculating(false); }
  }

  function addDraft() {
    const ip = parseMoneyInput(ipText);
    if (!advisorCode || ip <= 0 || !expectedPaidDate) return;
    const next = [...draftContracts, { id: crypto.randomUUID(), advisorCode, ip, expectedPaidDate, expectedIssueDate: expectedPaidDate, isNewAdvisor }];
    setDraftContracts(next);
    setIpText("");
    void calculate(next);
  }

  return <section className="tvv-calculator team-leader-calculator">
    <TvvSubHeader title="MÃ´ phá»ng thÆ°á»Ÿng TrÆ°á»Ÿng nhÃ³m" onBack={onBack} />
    <section className="tvv-calc-card"><h2>ThÃªm há»£p Ä‘á»“ng dá»± kiáº¿n</h2>
      <div className="team-leader-calc-form">
        <label>TVV<select value={advisorCode} onChange={(event) => setAdvisorCode(event.target.value)}><option value="">Chá»n TVV</option>{(teamData?.agents ?? []).map((item: any) => <option key={item.agentCode} value={item.agentCode}>{item.agentName}</option>)}</select></label>
        <label>IP dá»± kiáº¿n<input value={ipText} onChange={(event) => setIpText(moneyInput(event.target.value))} placeholder="0" /></label>
        <label>NgÃ y thu phÃ­<input type="date" value={expectedPaidDate} onChange={(event) => setExpectedPaidDate(event.target.value)} /></label>
        <label className="team-new-advisor-check"><input type="checkbox" checked={isNewAdvisor} onChange={(event) => setIsNewAdvisor(event.target.checked)} /> TVV má»›i trong quÃ½</label>
      </div>
      <p className="team-fyc-note">FYC dá»± kiáº¿n tá»± Ä‘á»™ng tÃ­nh báº±ng 30% IP.</p>
      <button className="tvv-primary" type="button" onClick={addDraft}>+ ThÃªm vÃ  tÃ­nh láº¡i</button>
    </section>
    {draftContracts.length > 0 && <section className="tvv-calc-card"><h2>Há»£p Ä‘á»“ng dá»± kiáº¿n ({draftContracts.length})</h2>{draftContracts.map((draft) => <article className="team-draft-contract" key={draft.id}><span>{teamData?.agents?.find((item: any) => item.agentCode === draft.advisorCode)?.agentName || draft.advisorCode}</span><strong>{formatVnd(draft.ip)}</strong><button type="button" onClick={() => { const next = draftContracts.filter((item) => item.id !== draft.id); setDraftContracts(next); void calculate(next); }}><Trash2 size={16} /></button></article>)}</section>}
    <section className="tvv-calc-card team-calc-result"><h2>Káº¿t quáº£ mÃ´ phá»ng</h2>{calculating ? <p>Äang tÃ­nhâ€¦</p> : result ? <><TeamLeaderRewardSummary rewards={result} /><div className="team-calc-increase"><span>TÄƒng thÃªm so vá»›i hiá»‡n táº¡i</span><strong>+{formatVnd(Math.max(0, Number(result.totalEstimatedReward) - Number(baseline?.totalEstimatedReward || 0)))}</strong></div></> : <p>ChÆ°a cÃ³ káº¿t quáº£.</p>}</section>
  </section>;
}

function Overview({ stats, leaderboard, estimate, starViet, starVietWarning, onTab }: any) {
  const statItems = [
    ["Tá»•ng HÄ", stats.total, "blue", "contracts"],
    ["ÄÃ£ phÃ¡t hÃ nh", stats.issued, "green", "contracts"],
    ["Chá» xá»­ lÃ½", stats.pending, "orange", "contracts"],
    ["Háº¿t hiá»‡u lá»±c", stats.invalid, "red", "contracts"]
  ];
  return <section className="tvv-content">
    <div className="tvv-stat-card">{statItems.map(([label, value, tone, target]: any) => <div className="tvv-stat" role="button" tabIndex={0} key={label} onClick={() => onTab(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTab(target); } }} aria-label={`${label}: ${value}. Xem há»£p Ä‘á»“ng`}><strong className={`stat-${tone}`}>{value}</strong><p>{label}</p><i className={`stat-${tone}`} /></div>)}</div>
    <LeaderboardPreview leaderboard={leaderboard} onOpen={() => onTab("leaderboard")} />
    <ContestPreview estimate={estimate} onAll={() => onTab("contests")} />
    <ArchivePreview onOpen={() => onTab("archive")} />
    <PersonalStarJourney row={starViet} warning={starVietWarning} />
  </section>;
}

function initials(value: unknown) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word.charAt(0)).join("").toUpperCase() || "TV";
}

function RankingAvatar({ name, src, group = false }: { name: string; src?: string | null; group?: boolean }) {
  return <span className={`tvv-ranking-avatar${group ? " group" : ""}`}>
    {src ? <img src={src} alt={`áº¢nh Ä‘áº¡i diá»‡n ${name}`} /> : group ? <Users size={20} /> : initials(name)}
  </span>;
}

function LeaderboardPreview({ leaderboard, onOpen }: any) {
  const leaders = (leaderboard?.agents ?? []).slice(0, 3);
  return <button className="tvv-card tvv-leaderboard-preview" type="button" onClick={onOpen}>
    <span className="tvv-leaderboard-preview-icon"><img src="/images/leaderboard-trophy.png" alt="" /></span>
    <span className="tvv-leaderboard-preview-copy">
      <strong>Báº£ng xáº¿p háº¡ng doanh thu</strong>
      <small>TÃ´n vinh nhá»¯ng gÆ°Æ¡ng máº·t dáº«n Ä‘áº§u thÃ¡ng</small>
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
      <strong>Kho tÃ i liá»‡u</strong>
      <small>Máº«u biá»ƒu, hÆ°á»›ng dáº«n vÃ  tÃ i liá»‡u nghiá»‡p vá»¥</small>
      <span className="tvv-archive-tags"><b>Máº«u biá»ƒu</b><b>HÆ°á»›ng dáº«n</b><b>FAQ</b></span>
    </span>
    <ChevronRight size={22} />
  </button>;
}

function LeaderboardPage({ leaderboard, month }: any) {
  const [rankingView, setRankingView] = useState<"agents" | "groups">("agents");
  const agents = leaderboard?.agents ?? [];
  const groups = leaderboard?.groups ?? [];
  return <section className="tvv-content tvv-subpage tvv-after-sub-header tvv-leaderboard-page">
    <div className="tvv-ranking-tabs" role="tablist" aria-label={`Báº£ng xáº¿p háº¡ng ${monthLabel(month)}`}>
      <button type="button" role="tab" aria-selected={rankingView === "agents"} className={rankingView === "agents" ? "active" : ""} onClick={() => setRankingView("agents")}><UserRound size={18} />Top TVV</button>
      <button type="button" role="tab" aria-selected={rankingView === "groups"} className={rankingView === "groups" ? "active" : ""} onClick={() => setRankingView("groups")}><Users size={18} />Top nhÃ³m</button>
    </div>
    {rankingView === "agents"
      ? <RankingSection title="Top 10 TÆ° váº¥n viÃªn" subtitle="Nhá»¯ng cÃ¡ nhÃ¢n xuáº¥t sáº¯c nháº¥t" rows={agents} />
      : <RankingSection title="Top 10 NhÃ³m" subtitle="Nhá»¯ng táº­p thá»ƒ bá»©t phÃ¡ nháº¥t" rows={groups} group />}
  </section>;
}

function RankingSection({ title, subtitle, rows, group = false }: { title: string; subtitle: string; rows: any[]; group?: boolean }) {
  return <section className="tvv-ranking-section">
    <header><Medal size={22} /><span><h3>{title}</h3><p>{subtitle}</p></span></header>
    {rows.length ? <div className="tvv-ranking-list">
      {rows.map((row) => {
        const name = group ? row.groupName || "NhÃ³m chÆ°a xÃ¡c Ä‘á»‹nh" : row.agentName || row.agentCode || "TÆ° váº¥n viÃªn";
        return <article className={row.rank <= 3 ? `top-${row.rank}` : ""} key={group ? `${row.banName}-${row.groupName}` : row.agentCode || row.agentName}>
          <strong className="tvv-rank-number">{row.rank <= 3 ? <Crown size={18} /> : row.rank}</strong>
          <RankingAvatar name={name} src={row.avatarUrl} group={group} />
          <span className="tvv-ranking-name"><b>{name}</b><small>{group ? row.banName : row.groupName}</small></span>
          <span className="tvv-ranking-revenue"><b>{formatVnd(row.afyp)}</b><small>{row.contractCount} há»£p Ä‘á»“ng</small></span>
        </article>;
      })}
    </div> : <p className="tvv-empty">ChÆ°a cÃ³ dá»¯ liá»‡u xáº¿p háº¡ng trong ká»³ nÃ y.</p>}
  </section>;
}

function PersonalStarJourney({ row, warning }: { row?: any; warning?: string | null }) {
  if (warning) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>HÃ nh trÃ¬nh Sao Viá»‡t</h2></div><p>ChÆ°a táº£i Ä‘Æ°á»£c dá»¯ liá»‡u Sao Viá»‡t.</p></section>;
  if (!row) return <section className="tvv-card tvv-star-journey tvv-star-empty"><div className="tvv-section-head"><h2>HÃ nh trÃ¬nh Sao Viá»‡t</h2></div><p>ChÆ°a cÃ³ dá»¯ liá»‡u Sao Viá»‡t cá»§a báº¡n trong thÃ¡ng nÃ y.</p></section>;
  const progress = Math.max(0, Math.min(100, Number(row.progress ?? 0)));
  return <section className="tvv-card tvv-star-journey">
    <div className="tvv-star-title"><span><Sparkles size={17} /> HÃ nh trÃ¬nh Sao Viá»‡t</span><em>{row.currentTickets > 0 ? `${row.currentTickets} vÃ©` : row.currentRank}</em></div>
    <div className="tvv-star-main"><div><small>Tá»•ng AFYP Sao Viá»‡t</small><strong>{formatVnd(row.totalAfyp)}</strong></div><img className="tvv-star-achievement-icon" src="/images/star-viet-achievement.png" alt="" /></div>
    <div className="tvv-star-progress"><div><span>Má»‘c tiáº¿p theo</span><b>{row.remainingToNext > 0 ? row.nextRank : "ÄÃ£ Ä‘áº¡t má»‘c cao nháº¥t"}</b></div><i><u style={{ width: `${progress}%` }} /></i><div><span>{progress.toFixed(1).replace(".0", "")}%</span>{row.remainingToNext > 0 && <b>CÃ²n {formatVnd(row.remainingToNext)}</b>}</div></div>
  </section>;
}

function ContestPreview({ estimate, onAll }: any) {
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const programs = estimate?.ongoingPrograms?.length ? estimate.ongoingPrograms : estimate?.rewardByProgram ?? [];
  return <><section className="tvv-card tvv-contest-preview"><div className="tvv-section-head"><h2>ChÆ°Æ¡ng trÃ¬nh thi Ä‘ua</h2><div><button onClick={onAll}>Xem táº¥t cáº£ <ChevronRight size={18} /></button></div></div>{programs.length ? <div className="tvv-contest-list">{programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} compact onOpen={setSelectedProgram} />)}</div> : <p className="tvv-empty">ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh thi Ä‘ua Ä‘ang diá»…n ra.</p>}</section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
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
    ["ongoing", `Äang diá»…n ra (${groups.ongoing.length})`, groups.ongoing],
    ["ended", `ÄÃ£ káº¿t thÃºc (${groups.ended.length})`, groups.ended],
    ["policy", "ThÆ°á»Ÿng chÃ­nh sÃ¡ch", groups.policy]
  ] as const;
  const programs = groups[view] ?? [];
  useEffect(() => {
    if (!selectedProgram || !Array.isArray(selectedProgram.rows)) return;
    const nextProgram = groups.policy.find((item: any) => item.programId === selectedProgram.programId);
    if (nextProgram && nextProgram !== selectedProgram) setSelectedProgram(nextProgram);
  }, [groups.policy, selectedProgram]);
  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page">
    <section className="tvv-contest-summary"><h2>Tá»•ng quan thi Ä‘ua</h2><div><span><b>Äang diá»…n ra</b><strong>{groups.ongoing.length}</strong><em>chÆ°Æ¡ng trÃ¬nh</em></span><span><b>Sáº¯p káº¿t thÃºc</b><strong>{soonEndingCount}</strong><em>chÆ°Æ¡ng trÃ¬nh</em></span><span><b>Æ¯á»›c tÃ­nh thÆ°á»Ÿng</b><strong>{formatVnd(totalReward)}</strong><em>Tá»•ng cÃ³ thá»ƒ nháº­n</em></span></div></section>
    <div className="tvv-contest-filter">{tabs.map(([id, label, rows]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{label}</span><strong>{formatVnd(rows.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0))}</strong></button>)}</div>
    <section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <PolicyAwareContestRow key={item.programId} item={item} index={index} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh thi Ä‘ua Ä‘ang diá»…n ra." : view === "ended" ? "ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh thi Ä‘ua Ä‘Ã£ káº¿t thÃºc." : "ChÆ°a cÃ³ thÆ°á»Ÿng chÃ­nh sÃ¡ch."}</p>}</section>
    <p className="tvv-contest-note"><Info size={17} /><span>Æ¯á»›c tÃ­nh thÆ°á»Ÿng Ä‘Æ°á»£c cáº­p nháº­t dá»±a trÃªn dá»¯ liá»‡u hiá»‡n táº¡i. Má»©c thÆ°á»Ÿng chÃ­nh thá»©c sáº½ Ä‘Æ°á»£c xÃ¡c nháº­n khi chÆ°Æ¡ng trÃ¬nh káº¿t thÃºc.</span></p>
  </section>{selectedProgram && <ContestDetailModal item={selectedProgram} policyMonth={policyMonth} monthOptions={monthOptions} onPolicyMonthChange={onPolicyMonthChange} onClose={() => setSelectedProgram(null)} />}</>;
}

function PolicyAwareContestRow({ item, onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className="tvv-contest-row" role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}>
    <div>
      <em>{isPolicy ? "THÆ¯á»žNG CHÃNH SÃCH" : "ÄANG DIá»„N RA"}</em>
      <b>{shortText(item.programName, 74)}</b>
      <small><CalendarDays size={14} />{isPolicy ? item.period : `${formatDateVi(item.startDate)} - ${formatDateVi(item.endDate)}`}</small>
      {hasReward && !isPolicy && <><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HÄ Ä‘á»§ Ä‘iá»u kiá»‡n</small></>}
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
    ["ongoing", `Äang diá»…n ra (${groups.ongoing.length})`, groups.ongoing],
    ["ended", `ÄÃ£ káº¿t thÃºc (${groups.ended.length})`, groups.ended],
    ["policy", "ThÆ°á»Ÿng chÃ­nh sÃ¡ch", groups.policy]
  ] as const;
  const programs = groups[view] ?? [];
  return <><section className="tvv-content tvv-subpage tvv-after-sub-header tvv-contest-page"><section className="tvv-contest-summary"><h2>Tá»•ng quan thi Ä‘ua</h2><div><span><b>Äang diá»…n ra</b><strong>{groups.ongoing.length}</strong><em>chÆ°Æ¡ng trÃ¬nh</em></span><span><b>Sáº¯p káº¿t thÃºc</b><strong>{soonEndingCount}</strong><em>chÆ°Æ¡ng trÃ¬nh</em></span><span><b>Æ¯á»›c tÃ­nh thÆ°á»Ÿng</b><strong>{formatVnd(totalReward)}</strong><em>Tá»•ng cÃ³ thá»ƒ nháº­n</em></span></div></section><div className="tvv-contest-filter">{tabs.map(([id, label, rows]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{label}</span><strong>{formatVnd(rows.reduce((sum: number, item: any) => sum + Number(item.estimatedReward ?? 0), 0))}</strong></button>)}</div><section className="tvv-contest-list-panel">{programs.length ? programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} onOpen={setSelectedProgram} />) : <p className="tvv-empty">{view === "ongoing" ? "ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh thi Ä‘ua Ä‘ang diá»…n ra." : view === "ended" ? "ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh thi Ä‘ua Ä‘Ã£ káº¿t thÃºc." : "ChÆ°a cÃ³ thÆ°á»Ÿng chÃ­nh sÃ¡ch."}</p>}</section><p className="tvv-contest-note"><Info size={17} /><span>Æ¯á»›c tÃ­nh thÆ°á»Ÿng Ä‘Æ°á»£c cáº­p nháº­t dá»±a trÃªn dá»¯ liá»‡u hiá»‡n táº¡i. Má»©c thÆ°á»Ÿng chÃ­nh thá»©c sáº½ Ä‘Æ°á»£c xÃ¡c nháº­n khi chÆ°Æ¡ng trÃ¬nh káº¿t thÃºc.</span></p></section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
}

function ContestRow({ item, index, compact = false, onOpen }: any) {
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  const hasReward = Number(item.estimatedReward ?? 0) > 0 || Boolean(item.isEligible);
  const isPolicy = Array.isArray(item.rows);
  return <article className={`tvv-contest-row${compact ? " compact" : ""}`} role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.(item); } }}><div><em>{isPolicy ? "THÆ¯á»žNG CHÃNH SÃCH" : "ÄANG DIá»„N RA"}</em><b>{shortText(item.programName, compact ? 62 : 74)}</b><small><CalendarDays size={14} />{isPolicy ? item.period : `${formatDateVi(item.startDate)} - ${formatDateVi(item.endDate)}`}</small>{hasReward && !compact && !isPolicy && <><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HÄ Ä‘á»§ Ä‘iá»u kiá»‡n</small></>}</div>{(hasReward || isPolicy) && !compact && <strong>{formatVnd(item.estimatedReward)}</strong>}<ChevronRight size={24} /></article>;
}

function contestNextMilestones(item: any) {
  if (item.isCommission) {
    const reward = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
    return {
      basisLabel: "PhÃ­ Ä‘Ã³ng",
      currentBasis: reward / 0.3,
      currentReward: reward,
      currentRate: 0,
      currentRateLabel: "30%",
      nextTiers: [
        {
          title: "Hoa há»“ng há»£p Ä‘á»“ng hiá»‡n táº¡i",
          subtitle: "PhÃ­ Ä‘Ã³ng Ã— 30%",
          missing: 0,
          missingLabel: "há»£p Ä‘á»“ng",
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
      Number(a.min_value ?? a.minimum ?? 0) - Number(b.min_value ?? b.minimum ?? 0)
    );
    const currentTier = [...sortedTiers].reverse().find((tier: any) => basisValue >= Number(tier.min_value ?? tier.minimum ?? 0));
    const nextTiers = sortedTiers
      .filter((tier: any) => basisValue < Number(tier.min_value ?? tier.minimum ?? 0))
      .slice(0, 2)
      .map((tier: any) => {
        const minimum = Number(tier.min_value ?? tier.minimum ?? 0);
        const missing = Math.max(0, minimum - basisValue);
        const projectedReward = tierReward(tier, minimum);
        return {
          title: `${metricLabel} Ä‘áº¡t ${formatCompactVnd(minimum)}`,
          subtitle: tier.note || tier.reward_formula || "Báº­c thÆ°á»Ÿng tiáº¿p theo",
          missing,
          missingLabel: metricLabel,
          estimatedContracts: averageContract > 0 ? Math.max(1, Math.ceil(missing / averageContract)) : 0,
          projectedReward,
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
    const tiers = item.programId === "policy-quarterly" ? POLICY_QUARTER_TIERS : item.programId === "policy-monthly" ? POLICY_MONTH_TIERS : [];
    const basisLabel = item.programId === "policy-quarterly" ? "FYP quÃ½" : "IP thÃ¡ng";
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
          title: `${basisLabel} Ä‘áº¡t ${formatCompactVnd(tier.minimum)}`,
          subtitle: `Báº­c thÆ°á»Ÿng ${formatRate(tier.rate)}`,
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
  const nextTiers = [1, 2].map((step) => ({
    title: `ThÃªm ${step} HÄ Ä‘á»§ Ä‘iá»u kiá»‡n`,
    subtitle: averageReward > 0 ? "Minh há»a theo thÆ°á»Ÿng bÃ¬nh quÃ¢n hiá»‡n táº¡i" : "Cáº§n Ä‘á»‘i chiáº¿u Ä‘iá»u kiá»‡n chÆ°Æ¡ng trÃ¬nh",
    missing: step,
    missingLabel: "há»£p Ä‘á»“ng",
    estimatedContracts: step,
    projectedReward: averageReward > 0 ? reward + averageReward * step : 0,
    incrementalReward: averageReward > 0 ? averageReward * step : 0
  }));
  return {
    basisLabel: "HÄ Ä‘á»§ Ä‘iá»u kiá»‡n",
    currentBasis: matchedCount,
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
  const tabs = policyRows ? [
    ["overview", "Tá»•ng quan"]
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
  return <div className="tvv-contest-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contest-detail" role="dialog" aria-modal="true" aria-label="Ná»™i dung chÆ°Æ¡ng trÃ¬nh thi Ä‘ua" onClick={(event) => event.stopPropagation()}>
    <header><div>{policyOptions.length ? <div className="tvv-policy-modal-period"><MonthPicker value={policyPickerValue(item.programId, policyMonth!)} options={policyOptions} onChange={onPolicyMonthChange!} ariaLabel="Chá»n ká»³ thÆ°á»Ÿng chÃ­nh sÃ¡ch" /></div> : <em>{item.period || "ÄANG DIá»„N RA"}</em>}<h2>{item.programName || "ChÆ°Æ¡ng trÃ¬nh thi Ä‘ua"}</h2></div><button type="button" onClick={onClose} aria-label="ÄÃ³ng">Ã—</button></header>
    {!policyRows && <p className="tvv-contest-detail-date">
      <span><CalendarDays size={17} />{formatDateVi(item.startDate)} - {formatDateVi(item.endDate)}</span>
      {item.issueDeadline && <span className="tvv-contest-issue-deadline">PhÃ¡t hÃ nh Ä‘áº¿n {formatDateVi(item.issueDeadline)}</span>}
    </p>}
    {policyRows && tabs.length > 1 && <nav className="tvv-policy-detail-tabs">{tabs.map(([id, label]) => <button type="button" className={detailTab === id ? "active" : ""} key={id} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>}
    {(item.originalFileUrl || !policyRows) && <div className="tvv-contest-poster">
      {item.originalFileUrl ? <button type="button" onClick={() => setPreviewUrl(item.originalFileUrl)} aria-label={`Xem poster ${item.programName || "chÆ°Æ¡ng trÃ¬nh thi Ä‘ua"}`}>
        <img src={item.originalFileUrl} alt={`Poster ${item.programName || "chÆ°Æ¡ng trÃ¬nh thi Ä‘ua"}`} />
      </button> : <div className="tvv-contest-poster-empty">ChÆ°a cÃ³ áº£nh</div>}
    </div>}
    {(!policyRows || detailTab === "overview") && <div className="tvv-current-tier-card">
      <span>Hiá»‡n táº¡i</span>
      <strong>{milestoneInfo.basisLabel === "há»£p Ä‘á»“ng" || milestoneInfo.basisLabel === "HÄ Ä‘á»§ Ä‘iá»u kiá»‡n" ? `${milestoneInfo.currentBasis} HÄ` : formatCompactVnd(milestoneInfo.currentBasis)}</strong>
      {milestoneInfo.currentRateLabel && <em>Báº­c hiá»‡n táº¡i: {milestoneInfo.currentRateLabel}</em>}
      {policyRows && milestoneInfo.policyRow && <div className="tvv-policy-current-breakdown">
        <article><span>{item.programId === "policy-quarterly" ? "FYP thá»±c Ä‘áº¡t" : "IP thÃ¡ng"}</span><strong>{formatVnd(Number(item.programId === "policy-quarterly" ? milestoneInfo.policyRow.actualFyp ?? milestoneInfo.policyRow.fyp : milestoneInfo.policyRow.ip ?? 0))}</strong></article>
        {item.programId === "policy-quarterly" && Number(milestoneInfo.policyRow.newAdvisorFactor ?? 1) > 1 && <article><span>FYP xÃ©t thÆ°á»Ÿng</span><strong>{formatVnd(Number(milestoneInfo.policyRow.qualificationFyp ?? 0))}<small>Há»‡ sá»‘ {Number(milestoneInfo.policyRow.newAdvisorFactor).toFixed(2)}x</small></strong></article>}
        <article><span>Tá»•ng FYC</span><strong>{formatVnd(Number(milestoneInfo.policyRow.totalFyc ?? 0))}</strong></article>
        <article className="reward"><span>ThÆ°á»Ÿng Ä‘ang chá»n</span><strong>{formatVnd(Number(milestoneInfo.policyRow.reward ?? item.estimatedReward ?? 0))}</strong></article>
      </div>}
      {!policyRows && Number(item.estimatedReward ?? 0) > 0 && <div className="tvv-current-tier-reward">
        <span>Æ¯á»›c tÃ­nh thÆ°á»Ÿng</span>
        <strong>{formatVnd(Number(item.estimatedReward))}</strong>
      </div>}
      {!policyRows && Array.isArray(item.participatingContracts) && item.participatingContracts.length > 0 && <div className="tvv-current-contracts">
        {item.participatingContracts.map((contract: any, index: number) => <article key={`${contract.applicationNo}-${index}`}>
          <div><b>{contract.policyOwner}</b><small>GYC {contract.applicationNo || "â€”"}</small></div>
          <span>{contract.status}</span>
        </article>)}
      </div>}
    </div>}
    {(!policyRows || detailTab === "overview") && <div className="tvv-next-milestones">
      <div className="tvv-next-milestones-head">
        <span>Má»‘c tiáº¿p theo</span>
      </div>
      {milestoneInfo.nextTiers.length ? <div className="tvv-next-milestone-grid">{milestoneInfo.nextTiers.map((tier: any) => (
        <article key={`${tier.title}-${tier.subtitle}`}>
          <div>
            <b>{tier.title}</b>
            <small>{tier.subtitle}</small>
          </div>
          <p>Cáº§n thÃªm <strong>{tier.missingLabel === "há»£p Ä‘á»“ng" ? `${tier.missing} HÄ` : formatCompactVnd(tier.missing)}</strong>{tier.missingLabel !== "há»£p Ä‘á»“ng" && ` ${tier.missingLabel}`}</p>
          <footer><span>Dá»± kiáº¿n thÆ°á»Ÿng</span><strong>{tier.projectedReward > 0 ? formatVnd(tier.projectedReward) : "ChÆ°a Ä‘á»§ dá»¯ liá»‡u"}</strong></footer>
          {tier.incrementalReward > 0 && <em>+{formatVnd(tier.incrementalReward)} so vá»›i hiá»‡n táº¡i</em>}
        </article>
      ))}</div> : <p className="tvv-empty">TVV Ä‘Ã£ á»Ÿ má»‘c cao nháº¥t hiá»‡n cÃ³ cá»§a chÆ°Æ¡ng trÃ¬nh nÃ y.</p>}
    </div>}
    {policyRows && ["achieved", "missing", "quarters"].includes(detailTab) && <div className="tvv-policy-agent-list">
      {(visibleRows ?? []).map((row: any) => <article key={row.agentCode}><div><b>{row.agentName}</b><small>{row.agentCode} Â· {row.group || row.ban}</small></div><span>{detailTab === "quarters" ? `QuÃ½ ${(row.achievedQuarters ?? []).join(", ") || "â€”"}` : formatVnd(row.reward)}</span></article>)}
      {!visibleRows?.length && <p className="tvv-empty">ChÆ°a cÃ³ TVV trong danh sÃ¡ch nÃ y.</p>}
    </div>}
    {(item.warnings ?? []).map((warning: string) => <p className="tvv-policy-warning" key={warning}><Info size={16} />{warning}</p>)}
    {previewUrl && createPortal(<div className="tvv-poster-lightbox" role="presentation" onClick={() => setPreviewUrl(null)}>
      <button type="button" onClick={() => setPreviewUrl(null)} aria-label="ÄÃ³ng áº£nh">Ã—</button>
      <img src={previewUrl} alt={`Poster ${item.programName || "chÆ°Æ¡ng trÃ¬nh thi Ä‘ua"}`} onClick={(event) => event.stopPropagation()} />
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
  const periodTitle = periodMode === "year" ? `NÄƒm ${month.slice(0, 4)}` : periodMode === "quarter" ? quarterLabel(month) : monthLabel(month);

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
    ["all", "Táº¥t cáº£", advisorScopedContracts.length, "blue"],
    ["issued", "ÄÃ£ phÃ¡t hÃ nh", issued, "green"],
    ["pending", "Chá» phÃ¡t hÃ nh", pending, "orange"],
    ["refunded", "HoÃ n phÃ­", refunded, "red"]
  ];

  return <section className="tvv-content tvv-contract-template">
    <div className="ct-period-tabs" role="tablist" aria-label="Chá»n ká»³ dá»¯ liá»‡u">
      {(["month", "quarter", "year"] as PeriodMode[]).map((mode) => <button key={mode} type="button" role="tab" aria-selected={periodMode === mode} onClick={() => selectPeriodMode(mode)}><CalendarDays size={16} />{mode === "month" ? "ThÃ¡ng" : mode === "quarter" ? "QuÃ½" : "NÄƒm"}</button>)}
    </div>
    <div className="ct-period-nav">
      <button type="button" disabled={selectedIndex < 0 || selectedIndex === periodOptions.length - 1} onClick={() => movePeriod(1)} aria-label="Ká»³ trÆ°á»›c"><ChevronLeft size={22} /></button>
      <MonthPicker className="ct-month-picker" value={month} options={periodOptions} onChange={onMonthChange} ariaLabel="Chá»n ká»³ há»£p Ä‘á»“ng" />
      <button type="button" disabled={selectedIndex <= 0} onClick={() => movePeriod(-1)} aria-label="Ká»³ sau"><ChevronRight size={22} /></button>
    </div>
    <div className="ct-summary">
      <article><span>IP {periodMode === "month" ? "thÃ¡ng" : periodMode === "quarter" ? "quÃ½" : "nÄƒm"}</span><i><BarChart3 size={20} /></i><strong>{formatVnd(totalIp)}</strong></article>
      <article><span>Sá»‘ há»£p Ä‘á»“ng</span><i><FileText size={19} /></i><strong>{advisorScopedContracts.length}</strong></article>
      <article className="ct-status-summary"><span>Tráº¡ng thÃ¡i</span><div><small><b className="green" />ÄÃ£ phÃ¡t hÃ nh</small><strong>{issued}</strong></div><div><small><b className="orange" />Chá» phÃ¡t hÃ nh</small><strong>{pending}</strong></div><div><small><b className="red" />HoÃ n phÃ­</small><strong>{refunded}</strong></div></article>
    </div>
    <div className="ct-status-tabs" role="tablist" aria-label="Lá»c tráº¡ng thÃ¡i há»£p Ä‘á»“ng">
      {filters.map(([id, label, count, tone]: any) => <button key={id} type="button" role="tab" aria-selected={statusFilter === id} onClick={() => setStatusFilter(id)}><b className={tone} />{label} ({count})</button>)}
    </div>
    <section className="ct-contract-list">
      <header>
        <h2>Danh sÃ¡ch há»£p Ä‘á»“ng</h2>
        <div className="ct-contract-list-actions">
          <span>{filteredContracts.length} HÄ</span>
          {showAdvisorFilter && <div className="ct-advisor-dropdown" ref={advisorMenuRef}>
            <button type="button" className="ct-advisor-filter" aria-label="Chá»n TVV Ä‘á»ƒ lá»c há»£p Ä‘á»“ng" aria-haspopup="listbox" aria-expanded={advisorMenuOpen}
              onClick={() => setAdvisorMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setAdvisorMenuOpen(false);
                if (event.key === "ArrowDown") setAdvisorMenuOpen(true);
              }}>
              <Users size={15} />
              <span>{selectedAdvisor?.name || "Táº¥t cáº£ TVV"}</span>
              <ChevronDown size={14} />
            </button>
            {advisorMenuOpen && <div className="ct-advisor-menu" role="listbox" aria-label="Danh sÃ¡ch TVV">
              <div className="ct-advisor-menu-head"><span>Chá»n tÆ° váº¥n viÃªn</span><small>{advisorOptions.length} TVV</small></div>
              <button type="button" role="option" aria-selected={selectedAdvisorKey === "all"} onClick={() => selectAdvisor("all")}>
                <span className="ct-advisor-avatar all"><Users size={15} /></span>
                <span><b>Táº¥t cáº£ TVV</b><small>Xem toÃ n bá»™ há»£p Ä‘á»“ng</small></span>
                {selectedAdvisorKey === "all" && <Check size={16} />}
              </button>
              {visibleAdvisorOptions.map((option) => <button type="button" role="option" aria-selected={selectedAdvisorKey === option.key} key={option.key} onClick={() => selectAdvisor(option.key)}>
                <span className="ct-advisor-avatar">{option.name.slice(0, 1).toLocaleUpperCase("vi")}</span>
                <span><b>{option.name}</b><small>{option.code || "ChÆ°a cÃ³ mÃ£ TVV"}</small></span>
                {selectedAdvisorKey === option.key && <Check size={16} />}
              </button>)}
            </div>}
          </div>}
        </div>
      </header>
      {filteredContracts.length ? filteredContracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="ct-empty">ChÆ°a cÃ³ há»£p Ä‘á»“ng trong {periodTitle.toLowerCase()}.</p>}
    </section>
  </section>;
}

function ContractPreview({ contracts, onAll, onOpenContract }: any) {
  return <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Há»£p Ä‘á»“ng cá»§a tÃ´i</h2><button onClick={onAll}>Xem táº¥t cáº£ <ChevronRight size={18} /></button></div>{contracts.length ? contracts.slice(0, 5).map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">ChÆ°a cÃ³ há»£p Ä‘á»“ng trong thÃ¡ng nÃ y.</p>}</section>;
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
    <label className="tvv-contract-month-filter"><span><CalendarDays size={18} /> ThÃ¡ng muá»‘n xem</span><MonthPicker className="tvv-contract-month-control" value={month} options={monthOptions} onChange={onMonthChange} ariaLabel="Chá»n thÃ¡ng há»£p Ä‘á»“ng" /></label>
    <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Há»£p Ä‘á»“ng cá»§a tÃ´i</h2><span>{contracts.length} HÄ</span></div>{contracts.length ? contracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">ChÆ°a cÃ³ há»£p Ä‘á»“ng trong thÃ¡ng nÃ y.</p>}</section>
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
  const policyOwner = row.policy_owner || contractRawValue(row, ["BÃŠN MUA Báº¢O HIá»‚M (BMBH)", "BMBH", "BÃªn mua báº£o hiá»ƒm"]) || row.insured_name || "-";
  const insuredName = row.insured_name || contractRawValue(row, ["NGÆ¯á»œI ÄÆ¯á»¢C Báº¢O HIá»‚M", "NÄBH", "NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm"]) || "";
  const applicationNo = row.application_no || row.gyc_no || row.contract_no || "-";
  const paidDate = row.paid_date || row.collection_date || contractRawValue(row, ["NGÃ€Y THU", "NgÃ y thu"]) || null;
  const issuedDate = row.issued_date || row.issue_date || contractRawValue(row, ["NGÃ€Y PHÃT HÃ€NH", "NgÃ y phÃ¡t hÃ nh", "NGAY PHAT HANH"]) || "";
  return { policyOwner, insuredName, applicationNo, paidDate, issuedDate };
}

function ContractRow({ row, onOpen }: any) {
  const tone = statusTone(row.policy_status);
  const Icon = tone.icon;
  const display = contractDisplay(row);
  return <button className="tvv-contract-row" type="button" onClick={() => onOpen?.(row)}><span className={tone.tone}><Icon size={22} /></span><div><b>{display.policyOwner}</b><p>{display.applicationNo}</p></div><strong>{formatVnd(Number(row.ip || row.afyp || 0))}<small>{formatDateVi(display.paidDate)}</small></strong><em className={tone.tone}>{tone.label}</em><ChevronRight size={20} /></button>;
}

function ContractDetailModal({ row, onClose, showAdvisorName = false }: { row: any; onClose: () => void; showAdvisorName?: boolean }) {
  const display = contractDisplay(row);
  const detailRows = [
    ["BMBH", display.policyOwner || ""],
    ["NÄBH", display.insuredName || ""],
    ["NgÃ y hiá»‡u lá»±c", display.paidDate ? formatDateVi(display.paidDate) : ""],
    ["NgÃ y phÃ¡t hÃ nh", display.issuedDate ? formatDateVi(display.issuedDate) : ""],
    ["IP", formatVnd(Number(row.ip || 0))],
    ["AFYP", formatVnd(Number(row.afyp || 0))]
  ];
  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contract-detail" role="dialog" aria-modal="true" aria-label="Chi tiáº¿t há»£p Ä‘á»“ng" onClick={(event) => event.stopPropagation()}><header><div><p>{display.applicationNo}</p><h2>{showAdvisorName ? row.agent_name || "TVV" : display.policyOwner}</h2></div><button type="button" onClick={onClose} aria-label="ÄÃ³ng">Ã—</button></header><div className="tvv-contract-detail-grid">{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>;
}

function CalculatorView(props: any) {
  const { drafts, estimate } = props;
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const draftCommissionReward = drafts.reduce((sum: number, draft: DraftContract) => sum + (Number(draft.premium) || 0) * 0.3, 0);
  const rawCalculatorPrograms = estimate?.calculatorPrograms ?? estimate?.rewardByProgram ?? [];
  const hasCommissionRow = rawCalculatorPrograms.some((item: any) => item.programId === "acquisition-commission");
  const localCommissionProgram = {
        programId: "acquisition-commission",
        programName: "Hoa há»“ng khai thÃ¡c",
        period: "PhÃ­ Ä‘Ã³ng Ã— 30%",
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
  const visibleProgramTotal = orderedCalculatorPrograms.reduce((sum: number, item: any) => sum + Number(item.incrementalReward ?? item.estimatedReward ?? 0), 0);
  const calculatorTotal = Math.max(apiCalculatorTotal, visibleProgramTotal, draftCommissionReward);
  return <section className="tvv-calculator">
    <TvvSubHeader title="MÃ¡y tÃ­nh thÆ°á»Ÿng" onBack={props.onBack} />
    <section className="tvv-calc-card"><h2>1. Nháº­p thÃ´ng tin há»£p Ä‘á»“ng</h2><div className="tvv-form-grid tvv-form-grid-compact"><label>PhÃ­ Ä‘Ã³ng (PÄT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>Ä‘</span></div></label><label>NgÃ y ná»™p phÃ­ dá»± kiáº¿n<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" onClick={props.onAdd}>+ ThÃªm há»£p Ä‘á»“ng</button></section>
    <section className="tvv-calc-card"><div className="tvv-section-head"><h2>2. Danh sÃ¡ch há»£p Ä‘á»“ng Ä‘Ã£ thÃªm ({drafts.length})</h2>{drafts.length > 0 && <button className="danger" onClick={props.onClear}><Trash2 size={15} /> XÃ³a táº¥t cáº£</button>}</div>{drafts.map((draft: DraftContract, index: number) => {
      return <article className="tvv-draft-row" key={draft.id}><GripVertical size={17} /><i>{index + 1}</i><div><p className="tvv-draft-premium">PÄT: {formatVnd(draft.premium)}</p></div><button type="button" className="tvv-draft-illustration" aria-label="Minh há»a vá»›i phÃ­ há»£p Ä‘á»“ng nÃ y" title="Minh há»a vá»›i phÃ­ há»£p Ä‘á»“ng nÃ y" onClick={() => props.onOpenIllustration(String(draft.premium))}><Calculator size={15} /></button><button onClick={() => props.onRemove(draft.id)}><Trash2 size={18} /></button></article>;
    })}</section>
    <section className="tvv-calc-card tvv-reward-summary-card"><div className="tvv-reward-summary-title"><span><Sparkles size={18} /></span><div><h2>3. Káº¿t quáº£ Æ°á»›c tÃ­nh</h2><p>Thu nháº­p tÄƒng thÃªm tá»« há»£p Ä‘á»“ng dá»± kiáº¿n</p></div></div><div className="tvv-total"><span>Tá»•ng thÆ°á»Ÿng cá»™ng thÃªm dá»± kiáº¿n</span><strong>+{formatVnd(Number(calculatorTotal))}</strong></div><div className="tvv-result-table tvv-result-table-standalone"><div className="tvv-result-head"><span>ChÆ°Æ¡ng trÃ¬nh</span><span>ThÆ°á»Ÿng cá»™ng thÃªm</span></div>{orderedCalculatorPrograms.map((item: any, index: number) => {
      const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
      const currentReward = Number(item.currentReward ?? 0);
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
      ><div><span className={`tvv-result-icon tone-${index % 3}`}>{item.isPolicyProjection ? <ShieldCheck size={22} /> : item.isCommission ? <Calculator size={22} /> : index % 3 === 1 ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 52)}</b>{(item.isPolicyProjection || item.isCommission) && <small>{item.period}</small>}</div><strong className={increase > 0 ? "increase" : ""}>{!item.isCommission && <small>Hiá»‡n táº¡i {formatVnd(currentReward)}</small>}{increase > 0 ? `+${formatVnd(increase)}` : formatVnd(0)}</strong></div>;
    })}</div><p className="tvv-disclaimer"><Info size={17} /><span><b>LÆ°u Ã½</b>Pháº§n mÃ u xanh lÃ  sá»‘ thÆ°á»Ÿng tÄƒng thÃªm so vá»›i dá»¯ liá»‡u hiá»‡n táº¡i. ThÆ°á»Ÿng chÃ­nh sÃ¡ch chá»‰ Ä‘Æ°á»£c xÃ¡c nháº­n khi há»£p Ä‘á»“ng Ä‘á»§ Ä‘iá»u kiá»‡n vÃ  phÃ¡t hÃ nh thÃ nh cÃ´ng.</span></p></section>
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
      <div><span>TVV</span><strong>{advisor?.name || "TVV"}</strong><small>{advisor?.code || "ChÆ°a cÃ³ mÃ£"}</small></div>
      <button type="button" onClick={onOpenCalculator}><Calculator size={18} /> Thu nháº­p</button>
    </section>
    <section className="tvv-card tvv-illustration-metrics">
      <div><span>Tá»•ng HÄ</span><strong>{contracts.length}</strong></div>
      <div><span>ÄÃ£ phÃ¡t hÃ nh</span><strong>{issued}</strong></div>
      <div><span>Tá»•ng IP</span><strong>{formatCompactVnd(totalIp)}</strong></div>
      <div><span>Tá»•ng AFYP</span><strong>{formatCompactVnd(totalAfyp)}</strong></div>
    </section>
    <section className="tvv-card tvv-illustration-programs">
      <div className="tvv-section-head"><h2>Minh hoáº¡ thÆ°á»Ÿng</h2></div>
      {programs.length ? programs.map((item: any) => <article key={item.programId}><div><b>{item.programName}</b><small>{item.period || item.conditionText || "ChÆ°Æ¡ng trÃ¬nh"}</small></div><strong>{formatVnd(Number(item.incrementalReward ?? item.estimatedReward ?? 0))}</strong></article>) : <p className="tvv-empty">ChÆ°a cÃ³ dá»¯ liá»‡u minh hoáº¡.</p>}
    </section>
  </section>;
}

function IllustrationTab({ active, premiumText = "" }: { active: boolean; premiumText?: string }) {
  const src = `/minhhoa2/index.html?embedded=1${premiumText ? `&annualPremium=${encodeURIComponent(premiumText)}` : ""}`;
  return (
    <section className={`tvv-illustration-embed${active ? " active" : ""}`} aria-hidden={!active}>
      <iframe key={src} src={src} title="Minh hoáº¡ quyá»n lá»£i báº£o hiá»ƒm" loading="eager" />
    </section>
  );
}

function TeamLeaderPolicyIllustration({ active, rewards }: { active: boolean; rewards: any }) {
  if (!active) return null;
  return <section className="tvv-content tvv-subpage tvv-after-sub-header team-policy-illustration">
    <article><h2>1. ThÆ°á»Ÿng PTKD thÃ¡ng</h2><p><b>ThÆ°á»Ÿng = Tá»· lá»‡ Ã— FYC nhÃ³m/thÃ¡ng</b></p><p>Tá»· lá»‡ Ä‘Æ°á»£c xÃ¡c Ä‘á»‹nh theo tá»•ng IP nhÃ³m vÃ  sá»‘ TVV cÃ³ IP trÃªn 12 triá»‡u.</p>{rewards && <strong>Hiá»‡n táº¡i: {Math.round(rewards.monthly.rate * 100)}% Ã— {formatVnd(rewards.monthly.fyc)} = {formatVnd(rewards.monthly.reward)}</strong>}</article>
    <article><h2>2. ThÆ°á»Ÿng QuÃ½</h2><p><b>ThÆ°á»Ÿng = Tá»· lá»‡ Ã— FYC nhÃ³m/quÃ½</b></p><p>FYC quÃ½ gá»“m FYC KPI04 vÃ  30% IP cá»§a GYC phÃ¡t hÃ nh trong BC02 chÆ°a Ä‘Æ°á»£c ghi nháº­n trong KPI04.</p>{rewards && <strong>Hiá»‡n táº¡i: {Math.round(rewards.quarterly.rate * 100)}% Ã— {formatVnd(rewards.quarterly.fyc)} = {formatVnd(rewards.quarterly.reward)}</strong>}</article>
    <article><h2>3. ThÆ°á»Ÿng nÄƒm</h2><p>4 quÃ½: 20 triá»‡u Â· 3 quÃ½: 10 triá»‡u Â· 2 quÃ½: 6 triá»‡u Â· 1 quÃ½ vÃ  FYP nÄƒm â‰¥300 triá»‡u: 3 triá»‡u.</p>{rewards && <strong>Táº¡m tÃ­nh: {rewards.annual.achievedQuarters} quÃ½ Ä‘áº¡t â€” {formatVnd(rewards.annual.reward)}</strong>}</article>
    {rewards?.newManager && <article><h2>4. Quáº£n lÃ½ má»›i</h2><p>Ãp dá»¥ng trong 12 thÃ¡ng Ä‘áº§u ká»ƒ tá»« ngÃ y hiá»‡u lá»±c chá»©c vá»¥. XÃ©t theo FYP nhÃ³m vÃ  sá»‘ TVV HÄC tá»«ng thÃ¡ng.</p><strong>Hiá»‡n táº¡i: {formatVnd(rewards.newManager.reward)}</strong></article>}
  </section>;
}

type ArchiveFolder = { id: string; title: string; items: ArchiveDocument[] };
type ArchiveDocument = { id: string; title: string; file?: string; size?: string };
type ArchiveGuide = { id: string; title: string; description?: string; summary?: string; type?: string; pdfUrl?: string; youtubeUrl?: string; pageCount?: number; isActive?: boolean };
type ArchiveFaq = { id?: string; question?: string; title?: string; answer?: string };

function archiveFileSrc(value?: string) {
  return value ? `/api/archive/file?path=${encodeURIComponent(value)}` : "";
}

function ArchiveView() {
  const [data, setData] = useState<{ forms: { folders: ArchiveFolder[] }; guides: ArchiveGuide[]; faq: ArchiveFaq[] } | null>(null);
  const [view, setView] = useState<"forms" | "guides" | "faq">("forms");
  const [folderId, setFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ title: string; file: string } | null>(null);

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
      {([["forms", "Máº«u biá»ƒu"], ["guides", "HÆ°á»›ng dáº«n"], ["faq", "FAQ"]] as const).map(([id, label]) => <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setFolderId(""); setSelectedFile(null); }}>{label}</button>)}
    </div>

    {view === "forms" && !activeFolder && <section className="tvv-archive-list">
      {visibleFolders.map((folder) => <button type="button" className="tvv-archive-folder" key={folder.id} onClick={() => setFolderId(folder.id)}>
        <span><FolderOpen size={19} /></span><b>{folder.title}</b><small>{folder.items.length} tÃ i liá»‡u</small><ChevronRight size={20} />
      </button>)}
      {!visibleFolders.length && <p className="tvv-empty">KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u phÃ¹ há»£p.</p>}
    </section>}

    {view === "forms" && activeFolder && <section className="tvv-archive-list">
      <button type="button" className="tvv-archive-back" onClick={() => { setFolderId(""); setSelectedFile(null); }}><ChevronLeft size={18} />{activeFolder.title}</button>
      {documents.map((item) => <button type="button" className="tvv-archive-file" key={item.id} onClick={() => item.file && setSelectedFile({ title: item.title, file: item.file })}>
        <span>PDF</span><b>{item.title}</b><small>{item.size ?? "PDF"}</small><ChevronRight size={20} />
      </button>)}
      {!documents.length && <p className="tvv-empty">KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u phÃ¹ há»£p.</p>}
    </section>}

    {view === "guides" && <section className="tvv-archive-list">
      {visibleGuides.map((guide) => <button type="button" className="tvv-archive-file" key={guide.id} onClick={() => guide.pdfUrl && setSelectedFile({ title: guide.title, file: guide.pdfUrl })} disabled={!guide.pdfUrl}>
        <span>{guide.type === "youtube" ? "YT" : "PDF"}</span><b>{guide.title}</b><small>{guide.type === "youtube" ? "Video hÆ°á»›ng dáº«n" : `${guide.pageCount || 0} trang`}</small>{guide.pdfUrl ? <ChevronRight size={20} /> : <BookOpen size={19} />}
      </button>)}
      {!visibleGuides.length && <p className="tvv-empty">KhÃ´ng tÃ¬m tháº¥y hÆ°á»›ng dáº«n phÃ¹ há»£p.</p>}
    </section>}

    {view === "faq" && <section className="tvv-archive-list">
      {visibleFaq.map((item, index) => <article className="tvv-archive-faq" key={item.id ?? index}><b>{item.question ?? item.title}</b><p>{item.answer}</p></article>)}
      {!visibleFaq.length && <p className="tvv-empty">KhÃ´ng tÃ¬m tháº¥y cÃ¢u há»i phÃ¹ há»£p.</p>}
    </section>}

    {selectedFile && <div className="tvv-archive-viewer-backdrop" role="presentation" onClick={() => setSelectedFile(null)}>
      <section className="tvv-archive-viewer" role="dialog" aria-modal="true" aria-label={selectedFile.title} onClick={(event) => event.stopPropagation()}>
        <header><span><FileText size={18} /><b>{selectedFile.title}</b></span><button type="button" onClick={() => setSelectedFile(null)} aria-label="ÄÃ³ng">Ã—</button></header>
        <iframe src={archiveFileSrc(selectedFile.file)} title={selectedFile.title} />
        <a href={archiveFileSrc(selectedFile.file)} download><Download size={16} />Táº£i xuá»‘ng</a>
      </section>
    </div>}
  </section>;
}

function UserLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/user/auth", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({ error: "May chu khong tra ve JSON." }));
    setBusy(false);
    if (!response.ok) return setError(payload.error || "KhÃ´ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c.");
    onSuccess();
  }
  return <main className="tvv-user-login"><form onSubmit={submit}><ShieldCheck size={44} /><h1>ÄÄƒng nháº­p TVV</h1><p>Sá»­ dá»¥ng mÃ£ TVV vÃ  máº­t kháº©u cá»§a báº¡n.</p><label>MÃ£ TVV<input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="characters" required /></label><label>Máº­t kháº©u<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="tvv-user-error">{error}</div>}<button disabled={busy}>{busy ? "Äang Ä‘Äƒng nháº­pâ€¦" : "ÄÄƒng nháº­p"}</button><small>Máº­t kháº©u máº·c Ä‘á»‹nh: 123456</small></form></main>;
}

function Profile({ advisor, contracts, onAvatarChange, onLogout }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  useEffect(() => { fetch("/api/user/profile", { cache: "no-store" }).then((response) => response.json()).then((payload) => setProfile(payload.profile ?? null)); }, []);
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const payload = await response.json();
    setMessage(response.ok ? "ÄÃ£ thay Ä‘á»•i máº­t kháº©u." : payload.error);
    if (response.ok) { setCurrentPassword(""); setNewPassword(""); }
  }
  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/user/profile", { method: "POST", body: new FormData(form) });
    const payload = await response.json();
    setMessage(response.ok ? "ÄÃ£ cáº­p nháº­t avatar." : payload.error);
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
  const date = (value?: string) => value ? formatDateVi(value) : "â€”";
  return <section className="tvv-content tvv-subpage tvv-after-sub-header"><section className="tvv-card tvv-profile-card"><div className="tvv-profile">
    {profile?.avatar_url ? <img className="tvv-profile-avatar" src={profile.avatar_url} alt="Avatar" /> : <UserRound size={58} />}
    <b>{profile?.full_name || advisor?.name}</b><span>{profile?.advisor_code || advisor?.code}</span><strong>{contracts.length} há»£p Ä‘á»“ng trong thÃ¡ng</strong>
  </div>
  <div className="tvv-profile-details"><div><span>NgÃ y báº¯t Ä‘áº§u lÃ m viá»‡c</span><b>{date(profile?.start_date)}</b></div><div><span>Tráº¡ng thÃ¡i</span><b>{profile?.advisor_status || "â€”"}</b></div><div><span>Chá»©c vá»¥ TVV</span><b>{profile?.advisor_position || "â€”"}</b></div><div><span>NgÃ y hiá»‡u lá»±c chá»©c vá»¥</span><b>{date(profile?.position_effective_date)}</b></div></div>
  {message && <div className="tvv-profile-message">{message}</div>}
  <form className="tvv-profile-form" onSubmit={uploadAvatar}><h3>áº¢nh Ä‘áº¡i diá»‡n</h3>
    <label className="tvv-avatar-picker">
      <span className="tvv-avatar-picker-icon"><Camera size={23} /></span>
      <span className="tvv-avatar-picker-copy"><b>{avatarFileName || "Chá»n áº£nh Ä‘áº¡i diá»‡n"}</b><small>{avatarFileName ? "Nháº¥n Ä‘á»ƒ chá»n áº£nh khÃ¡c" : "JPG, PNG hoáº·c WEBP"}</small></span>
      <span className="tvv-avatar-picker-action">Chá»n áº£nh</span>
      <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setAvatarFileName(event.target.files?.[0]?.name || "")} />
    </label>
    <small className="tvv-avatar-limit">Dung lÆ°á»£ng áº£nh pháº£i nhá» hÆ¡n 5 MB.</small><button disabled={!avatarFileName}>Cáº­p nháº­t avatar</button></form>
  <form className="tvv-profile-form" onSubmit={changePassword}><h3>Äá»•i máº­t kháº©u</h3><input type="password" placeholder="Máº­t kháº©u hiá»‡n táº¡i" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><input type="password" placeholder="Máº­t kháº©u má»›i (Ã­t nháº¥t 6 kÃ½ tá»±)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} /><button>Äá»•i máº­t kháº©u</button></form>
  <button className="tvv-logout-button" onClick={logout}>ÄÄƒng xuáº¥t</button>
  </section></section>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<[Tab, string, any]> = [["overview", "Tá»•ng quan", Home], ["contracts", "Há»£p Ä‘á»“ng", ClipboardList], ["calculator", "Thu nháº­p", Calculator], ["contests", "Thi Ä‘ua", Trophy], ["illustration", "Minh hoáº¡", FileText]];
  return <nav className="tvv-bottom-nav" aria-label="Äiá»u hÆ°á»›ng chÃ­nh">{items.map(([id, label, Icon]) => <button type="button" key={id} className={`${tab === id ? "active" : ""}${id === "calculator" ? " income-nav" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={25} /><span>{label}</span></button>)}</nav>;
}
