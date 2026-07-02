"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Bell, CalendarDays, Calculator, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FileText, Filter, GripVertical, Gift, Home, Hourglass, Info, Search, ShieldCheck, Trash2, Trophy, UserRound, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";

type Tab = "overview" | "contracts" | "calculator" | "contests" | "illustration" | "profile";
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

function playNotificationTone() {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const audioContext = new AudioContextCtor();
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
  } catch {
    // Some browsers block page-load audio until the user interacts with the page.
  }
}

export default function TvvMobilePage() {
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth());
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [data, setData] = useState<any>(null);
  const [advisorKey, setAdvisorKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftContract[]>([]);
  const [productName, setProductName] = useState("An Thịnh Phúc Niên");
  const [premiumText, setPremiumText] = useState("35.000.000");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimate, setEstimate] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 12 });
  const [readEventIds, setReadEventIds] = useState<string[]>([]);
  const [readEventsReady, setReadEventsReady] = useState(false);
  const [notificationView, setNotificationView] = useState<"unread" | "read">("unread");
  const [userProfile, setUserProfile] = useState<any>(null);
  const monthOptions = useMemo(() => monthOptionsUntilCurrent(), []);

  useEffect(() => {
    fetch("/api/user/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setSignedIn(Boolean(payload.authenticated)))
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setUserProfile(payload.profile ?? null));
  }, [signedIn]);

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
    const loadingTimer = window.setTimeout(() => {
      if (cancelled) return;
      controller.abort();
      setData(null);
      setEstimate((current: any) => current ?? emptyEstimate);
      setLoading(false);
    }, 6500);

    fetch(`/api/dashboard?month=${month}`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Dashboard API ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        const first = payload?.agents?.[0];
        setAdvisorKey((current) => current || (first ? `${first.agentCode}__${first.agentName}` : ""));
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setEstimate((current: any) => current ?? emptyEstimate);
      })
      .finally(() => {
        window.clearTimeout(loadingTimer);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [month, signedIn]);

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
  const advisorIpPeriods = useMemo(() => {
    const rows = data?.agentIpPeriods ?? [];
    return rows.find((row: any) => (advisor?.code && row.agentCode === advisor.code) || row.agentName === advisor?.name)
      ?? { monthIp: 0, quarterIp: 0, yearIp: 0 };
  }, [advisor, data?.agentIpPeriods]);
  const allContracts = useMemo(() => periodMode === "month"
    ? data?.statusContracts ?? data?.contracts ?? []
    : data?.yearStatusContracts ?? data?.yearContracts ?? [], [data, periodMode]);
  const myContracts = useMemo(() => {
    if (!advisor || !allContracts.length) return [];
    return allContracts.filter((row: any) => ((advisor.code && row.agent_code === advisor.code) || (!advisor.code && row.agent_name === advisor.name)) && recordInPeriod(row, month, periodMode));
  }, [advisor, allContracts, month, periodMode]);
  const productOptions = useMemo(() => {
    const names = new Set(myContracts.map((row: any) => row.product_name || row.raw_data?.product || row.raw_data?.["Sản phẩm chính"]).filter(Boolean));
    ["An Thịnh Phúc Niên", "An Tâm Hoạch Định"].forEach((name) => names.add(name));
    return [...names] as string[];
  }, [myContracts]);

  useEffect(() => {
    if (!signedIn || !advisor) return;
    let cancelled = false;
    const calculationMonth = drafts.at(-1)?.expectedPaidDate?.slice(0, 7) || month;
    fetch("/api/tvv-reward-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: calculationMonth, advisor, draftContracts: drafts })
    })
      .then((response) => response.json())
      .then((payload) => !cancelled && setEstimate(payload))
      .catch(() => !cancelled && setEstimate(emptyEstimate));
    return () => { cancelled = true; };
  }, [advisor, drafts, month, signedIn]);

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
    ? unreadNotifications
    : adminEvents.filter((item) => readEventIds.includes(item.id));

  useEffect(() => {
    if (!signedIn || !readEventsReady || !userProfile?.advisor_code || !unreadNotificationKey) return;
    const storageKey = `bvnt.notifiedEvents.${userProfile.advisor_code}`;
    if (window.sessionStorage.getItem(storageKey) === unreadNotificationKey) return;
    window.sessionStorage.setItem(storageKey, unreadNotificationKey);
    playNotificationTone();
  }, [readEventsReady, signedIn, unreadNotificationKey, userProfile?.advisor_code]);

  function toggleNotifications() {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (!willOpen) return;
    setNotificationView("unread");
  }

  function markEventAsRead(eventId: string) {
    if (readEventIds.includes(eventId)) return;
    const ids = [...readEventIds, eventId];
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

  const draftRewards = new Map((estimate?.rewardByDraftContract ?? []).map((item: any) => [item.draftId, item]));

  if (!authReady) return <main className="tvv-user-login"><p>Đang kiểm tra đăng nhập…</p></main>;
  if (!signedIn) return <UserLoginScreen onSuccess={() => setSignedIn(true)} />;

  return (
    <main className="tvv-app">
      {tab === "calculator" ? (
        <CalculatorView advisor={advisor} month={month} productName={productName} setProductName={setProductName} productOptions={productOptions} premiumText={premiumText} setPremiumText={(value: string) => setPremiumText(moneyInput(value))} paidDate={paidDate} setPaidDate={setPaidDate} drafts={drafts} draftRewards={draftRewards} estimate={estimate} onBack={() => setTab("overview")} onAdd={addDraft} onRemove={(id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id))} onClear={() => setDrafts([])} />
      ) : (
        <>
          {tab === "overview" ? (
          <header className="tvv-hero">
            <div className="tvv-hero-main">
              <button className="tvv-avatar tvv-avatar-button" type="button" onClick={() => setTab("profile")} aria-label="Mở trang cá nhân">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : <UserRound size={40} />}</button>
              <div>
                <h1>Xin chào, {advisor?.name || "TVV"} <span>👋</span></h1>
                <p>TVV - {advisor?.code || "Chưa có mã"}</p>
              </div>
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
                    <article
                      key={item.id}
                      role={notificationView === "unread" ? "button" : undefined}
                      tabIndex={notificationView === "unread" ? 0 : undefined}
                      onClick={() => notificationView === "unread" && markEventAsRead(item.id)}
                      onKeyDown={(event) => {
                        if (notificationView !== "unread" || (event.key !== "Enter" && event.key !== " ")) return;
                        event.preventDefault();
                        markEventAsRead(item.id);
                      }}
                    >
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                      <small>{item.event_date ? `Sự kiện: ${new Date(item.event_date).toLocaleString("vi-VN")}` : new Date(item.created_at).toLocaleString("vi-VN")}</small>
                    </article>
                  ))}
                </div>,
                document.body
              )}
              <div className="tvv-hero-period-row">
                <MonthPicker className="tvv-month-pill" value={month} options={monthOptions} onChange={setMonth} ariaLabel="Chọn tháng" />
              </div>
            </div>
          </header>
          ) : (
            <TvvSubHeader title={tab === "contracts" ? "Hợp đồng" : tab === "contests" ? "Thi đua" : tab === "illustration" ? "Minh hoạ" : "Cá nhân"} onBack={() => setTab("overview")} />
          )}
          {tab === "overview" && <Overview stats={stats} contracts={myContracts} estimate={estimate ?? emptyEstimate} onTab={setTab} onOpenContract={setSelectedContract} />}
          {tab === "contracts" && <ContractsListV2 contracts={myContracts} month={month} monthOptions={monthOptions} periodMode={periodMode} onPeriodModeChange={setPeriodMode} onMonthChange={setMonth} onOpenContract={setSelectedContract} />}
          {tab === "contests" && <ContestList estimate={estimate ?? emptyEstimate} />}
          {tab === "illustration" && <IllustrationView advisor={advisor} contracts={myContracts} estimate={estimate ?? emptyEstimate} onOpenCalculator={() => setTab("calculator")} />}
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} onAvatarChange={(avatarUrl: string) => setUserProfile((value: any) => ({ ...value, avatar_url: avatarUrl }))} onLogout={() => setSignedIn(false)} />}
        </>
      )}
      {selectedContract && <ContractDetailModal row={selectedContract} onClose={() => setSelectedContract(null)} />}
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

function Overview({ stats, contracts, estimate, onTab, onOpenContract }: any) {
  const statItems = [
    ["Tổng HĐ", stats.total, ClipboardList, "blue", "contracts"],
    ["Đã phát hành", stats.issued, ShieldCheck, "green", "contracts"],
    ["Chờ xử lý", stats.pending, Hourglass, "orange", "contracts"],
    ["Hết hiệu lực", stats.invalid, XCircle, "red", "contracts"]
  ];
  return <section className="tvv-content">
    <div className="tvv-stat-card">{statItems.map(([label, value, Icon, tone, target]: any) => <div className="tvv-stat" role="button" tabIndex={0} key={label} onClick={() => onTab(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTab(target); } }} aria-label={`${label}: ${value}. Xem hợp đồng`}><span className={tone}><Icon size={27} /></span><strong>{value}</strong><p>{label}</p><i /></div>)}</div>
    <ContestPreview estimate={estimate} onAll={() => onTab("contests")} />
    <ContractPreview contracts={contracts} onAll={() => onTab("contracts")} onOpenContract={onOpenContract} />
  </section>;
}

function ContestPreview({ estimate, onAll }: any) {
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const programs = estimate?.ongoingPrograms?.length ? estimate.ongoingPrograms : estimate?.rewardByProgram ?? [];
  return <><section className="tvv-card tvv-contest-preview"><div className="tvv-section-head"><h2>Chương trình thi đua</h2><div><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div></div>{programs.length ? <div className="tvv-contest-list">{programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} compact onOpen={setSelectedProgram} />)}</div> : <p className="tvv-empty">Chưa có chương trình thi đua đang diễn ra.</p>}</section>{selectedProgram && <ContestDetailModal item={selectedProgram} onClose={() => setSelectedProgram(null)} />}</>;
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
  if (item.isCommission) {
    const reward = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
    return {
      basisLabel: "Phí đóng",
      currentBasis: reward / 0.3,
      currentReward: reward,
      currentRate: 0,
      currentRateLabel: "30%",
      nextTiers: [
        {
          title: "Hoa hồng hợp đồng hiện tại",
          subtitle: "Phí đóng × 30%",
          missing: 0,
          missingLabel: "hợp đồng",
          estimatedContracts: 1,
          projectedReward: reward,
          incrementalReward: 0
        }
      ]
    };
  }

  const policyRow = Array.isArray(item.rows) ? item.rows[0] : null;
  if (policyRow) {
    const tiers = item.programId === "policy-quarterly" ? POLICY_QUARTER_TIERS : item.programId === "policy-monthly" ? POLICY_MONTH_TIERS : [];
    const basisLabel = item.programId === "policy-quarterly" ? "FYP quý" : "IP tháng";
    const basisValue = item.programId === "policy-quarterly"
      ? Number(policyRow.fypFallback ? policyRow.totalFyc : policyRow.fyp)
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
      nextTiers
    };
  }

  const matchedCount = Math.max(0, item.matchedContracts?.length ?? 0);
  const reward = Number(item.estimatedReward || 0);
  const averageReward = matchedCount > 0 && reward > 0 ? reward / matchedCount : 0;
  const nextTiers = [1, 2].map((step) => ({
    title: `Thêm ${step} HĐ đủ điều kiện`,
    subtitle: averageReward > 0 ? "Minh họa theo thưởng bình quân hiện tại" : "Cần đối chiếu điều kiện chương trình",
    missing: step,
    missingLabel: "hợp đồng",
    estimatedContracts: step,
    projectedReward: averageReward > 0 ? reward + averageReward * step : 0,
    incrementalReward: averageReward > 0 ? averageReward * step : 0
  }));
  return {
    basisLabel: "HĐ đủ điều kiện",
    currentBasis: matchedCount,
    currentReward: reward,
    currentRate: 0,
    currentRateLabel: "",
    nextTiers
  };
}

function ContestDetailModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [detailTab, setDetailTab] = useState<"overview" | "achieved" | "missing" | "quarters" | "formula">("overview");
  const content = item.conditionText || item.description || item.content || item.ruleText || "Nội dung chương trình đang được cập nhật.";
  const policyRows = Array.isArray(item.rows) ? item.rows : null;
  const milestoneInfo = contestNextMilestones(item);
  const achievedQuarters = Array.from(new Set<number>((policyRows ?? []).flatMap((row: any) => Array.isArray(row.achievedQuarters) ? row.achievedQuarters : []).map(Number).filter((quarter: number) => quarter >= 1 && quarter <= 4))).sort((a, b) => a - b);
  const tabs = policyRows ? [
    ["overview", "Tổng quan"]
  ] as Array<[typeof detailTab, string]> : [];
  const visibleRows = detailTab === "achieved" ? policyRows?.filter((row: any) => row.achieved)
    : detailTab === "missing" ? policyRows?.filter((row: any) => !row.achieved) : policyRows;
  return <div className="tvv-contest-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contest-detail" role="dialog" aria-modal="true" aria-label="Nội dung chương trình thi đua" onClick={(event) => event.stopPropagation()}>
    <header><div><em>{item.period || "ĐANG DIỄN RA"}</em><h2>{item.programName || "Chương trình thi đua"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
    {!policyRows && <p className="tvv-contest-detail-date"><CalendarDays size={17} />{formatDateVi(item.startDate)} - {formatDateVi(item.endDate)}</p>}
    {policyRows && tabs.length > 1 && <nav className="tvv-policy-detail-tabs">{tabs.map(([id, label]) => <button type="button" className={detailTab === id ? "active" : ""} key={id} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>}
    {!policyRows && <div className="tvv-contest-detail-content"><span>Nội dung chương trình</span><p>{content}</p></div>}
    {(!policyRows || detailTab === "overview") && <div className="tvv-current-tier-card">
      <span>Hiện tại</span>
      <strong>{milestoneInfo.basisLabel === "hợp đồng" || milestoneInfo.basisLabel === "HĐ đủ điều kiện" ? `${milestoneInfo.currentBasis} HĐ` : formatCompactVnd(milestoneInfo.currentBasis)}</strong>
      {milestoneInfo.currentRateLabel && <em>Bậc hiện tại: {milestoneInfo.currentRateLabel}</em>}
    </div>}
    {(!policyRows || detailTab === "overview") && <div className="tvv-next-milestones">
      <div className="tvv-next-milestones-head">
        <span>Mốc tiếp theo</span>
      </div>
      {milestoneInfo.nextTiers.length ? <div className="tvv-next-milestone-grid">{milestoneInfo.nextTiers.map((tier: any) => (
        <article key={`${tier.title}-${tier.subtitle}`}>
          <div>
            <b>{tier.title}</b>
            <small>{tier.subtitle}</small>
          </div>
          <p>Cần thêm <strong>{tier.missingLabel === "hợp đồng" ? `${tier.missing} HĐ` : formatCompactVnd(tier.missing)}</strong>, khoảng <strong>{tier.estimatedContracts} HĐ</strong></p>
          <footer><span>Dự kiến thưởng</span><strong>{tier.projectedReward > 0 ? formatVnd(tier.projectedReward) : "Chưa đủ dữ liệu"}</strong></footer>
          {tier.incrementalReward > 0 && <em>+{formatVnd(tier.incrementalReward)} so với hiện tại</em>}
        </article>
      ))}</div> : <p className="tvv-empty">TVV đã ở mốc cao nhất hiện có của chương trình này.</p>}
    </div>}
    {policyRows && detailTab === "overview" && <div className="tvv-policy-overview">
      <span><small>TVV đạt</small><strong>{item.achievedCount || 0}</strong></span>
      <span><small>Tổng FYC</small><strong>{formatVnd(policyRows.reduce((sum: number, row: any) => sum + Number(row.totalFyc || 0), 0))}</strong></span>
      <span><small>Tổng thưởng</small><strong>{formatVnd(Number(item.estimatedReward || 0))}</strong></span>
      {item.programId === "policy-month-13" && <span className="tvv-achieved-quarters"><small>Số quý đã đạt</small><strong>{achievedQuarters.length}/4 quý</strong><em>{achievedQuarters.length ? achievedQuarters.map((quarter) => `Quý ${quarter}`).join(" · ") : "Chưa đạt quý nào"}</em></span>}
    </div>}
    {policyRows && ["achieved", "missing", "quarters"].includes(detailTab) && <div className="tvv-policy-agent-list">
      {(visibleRows ?? []).map((row: any) => <article key={row.agentCode}><div><b>{row.agentName}</b><small>{row.agentCode} · {row.group || row.ban}</small></div><span>{detailTab === "quarters" ? `Quý ${(row.achievedQuarters ?? []).join(", ") || "—"}` : formatVnd(row.reward)}</span></article>)}
      {!visibleRows?.length && <p className="tvv-empty">Chưa có TVV trong danh sách này.</p>}
    </div>}
    {(item.warnings ?? []).map((warning: string) => <p className="tvv-policy-warning" key={warning}><Info size={16} />{warning}</p>)}
    {!policyRows && Number(item.estimatedReward ?? 0) > 0 && <div className="tvv-contest-detail-reward"><span>Ước tính thưởng</span><strong>{formatVnd(Number(item.estimatedReward))}</strong></div>}
  </section></div>;
}

function ContractsListV2({ contracts, month, monthOptions, periodMode, onPeriodModeChange, onMonthChange, onOpenContract }: any) {
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "pending" | "refunded">("all");
  const filteredContracts = statusFilter === "all" ? contracts : contracts.filter((row: any) => contractStatusGroup(row) === statusFilter);
  const totalIp = contracts.reduce((sum: number, row: any) => sum + contractIpValue(row), 0);
  const periodOptions = periodMode === "year" ? yearOptionsUntilCurrent() : periodMode === "quarter" ? quarterOptionsUntilCurrent() : monthOptions;
  const issued = contracts.filter((row: any) => contractStatusGroup(row) === "issued").length;
  const pending = contracts.filter((row: any) => contractStatusGroup(row) === "pending").length;
  const refunded = contracts.filter((row: any) => contractStatusGroup(row) === "refunded").length;
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
    ["all", "Tất cả", contracts.length, "blue"],
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
      <article><span>Số hợp đồng</span><i><FileText size={19} /></i><strong>{contracts.length}</strong></article>
      <article className="ct-status-summary"><span>Trạng thái</span><div><small><b className="green" />Đã phát hành</small><strong>{issued}</strong></div><div><small><b className="orange" />Chờ phát hành</small><strong>{pending}</strong></div><div><small><b className="red" />Hoàn phí</small><strong>{refunded}</strong></div></article>
    </div>
    <div className="ct-status-tabs" role="tablist" aria-label="Lọc trạng thái hợp đồng">
      {filters.map(([id, label, count, tone]: any) => <button key={id} type="button" role="tab" aria-selected={statusFilter === id} onClick={() => setStatusFilter(id)}><b className={tone} />{label} ({count})</button>)}
    </div>
    <section className="ct-contract-list">
      <header><h2>Danh sách hợp đồng</h2><span>{filteredContracts.length} HĐ</span></header>
      {filteredContracts.length ? filteredContracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="ct-empty">Chưa có hợp đồng trong {periodTitle.toLowerCase()}.</p>}
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

function ContractRow({ row, onOpen }: any) {
  const tone = statusTone(row.policy_status);
  const Icon = tone.icon;
  const display = contractDisplay(row);
  return <button className="tvv-contract-row" type="button" onClick={() => onOpen?.(row)}><span className={tone.tone}><Icon size={22} /></span><div><b>{display.policyOwner}</b><p>{display.applicationNo}</p></div><strong>{formatVnd(Number(row.ip || row.afyp || 0))}<small>{formatDateVi(display.paidDate)}</small></strong><em className={tone.tone}>{tone.label}</em><ChevronRight size={20} /></button>;
}

function ContractDetailModal({ row, onClose }: { row: any; onClose: () => void }) {
  const display = contractDisplay(row);
  const detailRows = [
    ["BMBH", display.policyOwner || ""],
    ["NĐBH", display.insuredName || ""],
    ["Ngày hiệu lực", display.paidDate ? formatDateVi(display.paidDate) : ""],
    ["Ngày phát hành", display.issuedDate ? formatDateVi(display.issuedDate) : ""],
    ["IP", formatVnd(Number(row.ip || 0))],
    ["AFYP", formatVnd(Number(row.afyp || 0))]
  ];
  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contract-detail" role="dialog" aria-modal="true" aria-label="Chi tiết hợp đồng" onClick={(event) => event.stopPropagation()}><header><div><p>{display.applicationNo}</p><h2>{display.policyOwner}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header><div className="tvv-contract-detail-grid">{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>;
}

function CalculatorView(props: any) {
  const { drafts, draftRewards, estimate } = props;
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const draftCommissionReward = drafts.reduce((sum: number, draft: DraftContract) => sum + (Number(draft.premium) || 0) * 0.3, 0);
  const rawCalculatorPrograms = estimate?.calculatorPrograms ?? estimate?.rewardByProgram ?? [];
  const hasCommissionRow = rawCalculatorPrograms.some((item: any) => item.programId === "acquisition-commission");
  const calculatorPrograms = draftCommissionReward > 0 && !hasCommissionRow
    ? [
      ...rawCalculatorPrograms,
      {
        programId: "acquisition-commission",
        programName: "Hoa hồng khai thác",
        period: "Phí đóng × 30%",
        estimatedReward: draftCommissionReward,
        currentReward: 0,
        projectedReward: draftCommissionReward,
        incrementalReward: draftCommissionReward,
        isPolicyProjection: false,
        isCommission: true
      }
    ]
    : rawCalculatorPrograms;
  const orderedCalculatorPrograms = [...calculatorPrograms]
    .filter((item: any) => item.programId !== "policy-month-13")
    .sort((a: any, b: any) => calculatorProgramOrder(a) - calculatorProgramOrder(b));
  const apiCalculatorTotal = Number(estimate?.calculatorTotalEstimatedReward ?? estimate?.totalEstimatedReward ?? 0);
  const visibleProgramTotal = orderedCalculatorPrograms.reduce((sum: number, item: any) => sum + Number(item.incrementalReward ?? item.estimatedReward ?? 0), 0);
  const calculatorTotal = Math.max(apiCalculatorTotal, visibleProgramTotal, draftCommissionReward);
  return <section className="tvv-calculator">
    <TvvSubHeader title="Máy tính thưởng" onBack={props.onBack} />
    <section className="tvv-calc-card"><h2>1. Nhập thông tin hợp đồng</h2><div className="tvv-form-grid tvv-form-grid-compact"><label>Phí đóng (PĐT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>đ</span></div></label><label>Ngày nộp phí dự kiến<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" onClick={props.onAdd}>+ Thêm hợp đồng</button></section>
    <section className="tvv-calc-card"><div className="tvv-section-head"><h2>2. Danh sách hợp đồng đã thêm ({drafts.length})</h2>{drafts.length > 0 && <button className="danger" onClick={props.onClear}><Trash2 size={15} /> Xóa tất cả</button>}</div>{drafts.map((draft: DraftContract, index: number) => {
      const rewardFromPrograms = Number(draftRewards.get(draft.id)?.estimatedReward ?? 0);
      const fallbackReward = (Number(draft.premium) || 0) * 0.3;
      return <article className="tvv-draft-row" key={draft.id}><GripVertical size={17} /><i>{index + 1}</i><div><b>{draft.productName}</b><p>PĐT: {formatVnd(draft.premium)}</p><small>Ngày dự kiến: {formatDateVi(draft.expectedPaidDate)}</small></div><strong><span>Dự kiến thưởng</span><b>{formatVnd(Math.max(rewardFromPrograms, fallbackReward))}</b></strong><button onClick={() => props.onRemove(draft.id)}><Trash2 size={18} /></button></article>;
    })}</section>
    <section className="tvv-calc-card"><h2>3. Kết quả ước tính</h2><div className="tvv-total"><span>Tổng thưởng cộng thêm dự kiến</span><strong>+{formatVnd(Number(calculatorTotal))}</strong></div><div className="tvv-result-table tvv-result-table-standalone"><div className="tvv-result-head"><span>Chương trình</span><span>Thưởng cộng thêm</span></div>{orderedCalculatorPrograms.map((item: any, index: number) => {
      const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
      const currentReward = Number(item.currentReward ?? 0);
      return <div
        className={`tvv-result-row${item.isPolicyProjection ? " policy" : ""}${item.isCommission ? " commission" : ""}`}
        key={item.programId}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedProgram(item)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setSelectedProgram(item);
        }}
      ><div><span className={`tvv-result-icon tone-${index % 3}`}>{item.isPolicyProjection ? <ShieldCheck size={22} /> : item.isCommission ? <Calculator size={22} /> : index % 3 === 1 ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 52)}</b>{(item.isPolicyProjection || item.isCommission) && <small>{item.period}</small>}</div><strong className={increase > 0 ? "increase" : ""}>{item.isPolicyProjection && currentReward > 0 && <small>Hiện tại {formatVnd(currentReward)}</small>}{increase > 0 ? `+${formatVnd(increase)}` : formatVnd(0)}</strong></div>;
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
    if (!response.ok) return setError(payload.error || "Không đăng nhập được.");
    onSuccess();
  }
  return <main className="tvv-user-login"><form onSubmit={submit}><ShieldCheck size={44} /><h1>Đăng nhập TVV</h1><p>Sử dụng mã TVV và mật khẩu của bạn.</p><label>Mã TVV<input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="characters" required /></label><label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="tvv-user-error">{error}</div>}<button disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button><small>Mật khẩu mặc định: 123456</small></form></main>;
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
    setMessage(response.ok ? "Đã thay đổi mật khẩu." : payload.error);
    if (response.ok) { setCurrentPassword(""); setNewPassword(""); }
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
  <form className="tvv-profile-form" onSubmit={changePassword}><h3>Đổi mật khẩu</h3><input type="password" placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><input type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} /><button>Đổi mật khẩu</button></form>
  <button className="tvv-logout-button" onClick={logout}>Đăng xuất</button>
  </section></section>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<[Tab, string, any]> = [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Thu nhập", Calculator], ["contests", "Thi đua", Trophy], ["illustration", "Minh hoạ", FileText]];
  return <nav className="tvv-bottom-nav" aria-label="Điều hướng chính">{items.map(([id, label, Icon]) => <button type="button" key={id} className={`${tab === id ? "active" : ""}${id === "calculator" ? " income-nav" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => id === "illustration" ? window.location.assign("/minhhoa2/") : setTab(id)}><Icon size={25} /><span>{label}</span></button>)}</nav>;
}
