"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, Calculator, Camera, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, GripVertical, Gift, Home, Hourglass, Info, Search, ShieldCheck, Trash2, Trophy, UserRound, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";

type Tab = "overview" | "contracts" | "calculator" | "contests" | "profile";
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

function monthOptionsUntilCurrent() {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonthNo = now.getMonth() + 1;
  return Array.from({ length: currentMonthNo }, (_, index) => {
    const monthNo = index + 1;
    const value = `${year}-${String(monthNo).padStart(2, "0")}`;
    return { value, label: monthLabel(value) };
  });
}

function shortText(value: unknown, maxLength = 86) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

export default function TvvMobilePage() {
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth());
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
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 12 });
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
  const allContracts = data?.statusContracts ?? data?.contracts ?? [];
  const myContracts = useMemo(() => {
    if (!advisor || !allContracts.length) return [];
    return allContracts.filter((row: any) => (advisor.code && row.agent_code === advisor.code) || (!advisor.code && row.agent_name === advisor.name));
  }, [advisor, allContracts]);
  const productOptions = useMemo(() => {
    const names = new Set(myContracts.map((row: any) => row.product_name || row.raw_data?.product || row.raw_data?.["Sản phẩm chính"]).filter(Boolean));
    ["An Thịnh Phúc Niên", "An Tâm Hoạch Định"].forEach((name) => names.add(name));
    return [...names] as string[];
  }, [myContracts]);

  useEffect(() => {
    if (!signedIn || !advisor) return;
    let cancelled = false;
    fetch("/api/tvv-reward-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, advisor, draftContracts: drafts })
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
  const notificationCount = Math.min(99, adminEvents.length);

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
              <div className="tvv-avatar">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : <UserRound size={40} />}</div>
              <div>
                <h1>Xin chào, {advisor?.name || "TVV"} <span>👋</span></h1>
                <p>TVV - {advisor?.code || "Chưa có mã"}</p>
              </div>
              <button ref={notificationButtonRef} className="tvv-icon-button" type="button" aria-label={`Thông báo (${notificationCount})`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell size={28} />
                {notificationCount > 0 && <b>{notificationCount}</b>}
              </button>
              {notificationsOpen && typeof document !== "undefined" && createPortal(
                <div className="tvv-notification-panel" style={{ top: notificationPosition.top, right: notificationPosition.right }}>
                  <div className="tvv-notification-heading"><strong>Thông báo</strong><button type="button" onClick={() => setNotificationsOpen(false)}>×</button></div>
                  {adminEvents.length === 0 ? <p className="tvv-notification-empty">Chưa có thông báo mới.</p> : adminEvents.map((item) => (
                    <article key={item.id}>
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                      <small>{item.event_date ? `Sự kiện: ${new Date(item.event_date).toLocaleString("vi-VN")}` : new Date(item.created_at).toLocaleString("vi-VN")}</small>
                    </article>
                  ))}
                </div>,
                document.body
              )}
              <div className="tvv-hero-period-row">
                <label className="tvv-month-pill">
                  <CalendarDays size={20} />
                  <span>{monthLabel(month)}</span>
                  <ChevronDown size={19} />
                  <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Chọn tháng">
                    {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <div className="tvv-ip-periods" aria-label="IP theo kỳ">
                  <span><small>IP tháng</small><strong>{formatCompactVnd(advisorIpPeriods.monthIp)}</strong></span>
                  <span><small>IP quý</small><strong>{formatCompactVnd(advisorIpPeriods.quarterIp)}</strong></span>
                  <span><small>IP năm</small><strong>{formatCompactVnd(advisorIpPeriods.yearIp)}</strong></span>
                </div>
              </div>
            </div>
          </header>
          ) : (
            <TvvSubHeader title={tab === "contracts" ? "Hợp đồng" : tab === "contests" ? "Thi đua" : "Cá nhân"} onBack={() => setTab("overview")} showHelp={tab === "contests"} />
          )}
          {tab === "overview" && <Overview stats={stats} contracts={myContracts} estimate={estimate ?? emptyEstimate} onTab={setTab} onOpenContract={setSelectedContract} />}
          {tab === "contracts" && <ContractsList contracts={myContracts} onOpenContract={setSelectedContract} />}
          {tab === "contests" && <ContestList estimate={estimate ?? emptyEstimate} />}
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} onAvatarChange={(avatarUrl: string) => setUserProfile((value: any) => ({ ...value, avatar_url: avatarUrl }))} onLogout={() => setSignedIn(false)} />}
        </>
      )}
      {selectedContract && <ContractDetailModal row={selectedContract} onClose={() => setSelectedContract(null)} />}
      <BottomNav tab={tab} setTab={setTab} />
    </main>
  );
}

function TvvSubHeader({ title, onBack, showHelp = false }: { title: string; onBack: () => void; showHelp?: boolean }) {
  return <header className="tvv-calc-header tvv-page-header"><button className="tvv-back-button" onClick={onBack} aria-label="Quay lại tổng quan"><img src="/Icon/arrow-back-up.svg" alt="" /></button><h1>{title}</h1>{showHelp && <span className="tvv-header-help"><Info size={18} /> Hướng dẫn</span>}</header>;
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

function ContestDetailModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [detailTab, setDetailTab] = useState<"overview" | "achieved" | "missing" | "quarters" | "formula">("overview");
  const content = item.conditionText || item.description || item.content || item.ruleText || "Nội dung chương trình đang được cập nhật.";
  const policyRows = Array.isArray(item.rows) ? item.rows : null;
  const tabs = policyRows ? [
    ["overview", "Tổng quan"],
    ["achieved", "TVV đạt"],
    ["missing", "TVV chưa đạt"],
    ...(item.programId === "policy-month-13" ? [["quarters", "Quý đạt"]] : []),
    ["formula", "Cách tính"]
  ] as Array<[typeof detailTab, string]> : [];
  const visibleRows = detailTab === "achieved" ? policyRows?.filter((row: any) => row.achieved)
    : detailTab === "missing" ? policyRows?.filter((row: any) => !row.achieved) : policyRows;
  return <div className="tvv-contest-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contest-detail" role="dialog" aria-modal="true" aria-label="Nội dung chương trình thi đua" onClick={(event) => event.stopPropagation()}>
    <header><div><em>{item.period || "ĐANG DIỄN RA"}</em><h2>{item.programName || "Chương trình thi đua"}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
    {!policyRows && <p className="tvv-contest-detail-date"><CalendarDays size={17} />{formatDateVi(item.startDate)} - {formatDateVi(item.endDate)}</p>}
    {policyRows && <nav className="tvv-policy-detail-tabs">{tabs.map(([id, label]) => <button type="button" className={detailTab === id ? "active" : ""} key={id} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>}
    {(!policyRows || detailTab === "formula") && <div className="tvv-contest-detail-content"><span>{policyRows ? "Cách tính" : "Nội dung chương trình"}</span><p>{content}</p></div>}
    {policyRows && detailTab === "overview" && <div className="tvv-policy-overview">
      <span><small>TVV đạt</small><strong>{item.achievedCount || 0}</strong></span>
      <span><small>Tổng FYC</small><strong>{formatVnd(policyRows.reduce((sum: number, row: any) => sum + Number(row.totalFyc || 0), 0))}</strong></span>
      <span><small>Tổng thưởng</small><strong>{formatVnd(Number(item.estimatedReward || 0))}</strong></span>
    </div>}
    {policyRows && ["achieved", "missing", "quarters"].includes(detailTab) && <div className="tvv-policy-agent-list">
      {(visibleRows ?? []).map((row: any) => <article key={row.agentCode}><div><b>{row.agentName}</b><small>{row.agentCode} · {row.group || row.ban}</small></div><span>{detailTab === "quarters" ? `Quý ${(row.achievedQuarters ?? []).join(", ") || "—"}` : formatVnd(row.reward)}</span></article>)}
      {!visibleRows?.length && <p className="tvv-empty">Chưa có TVV trong danh sách này.</p>}
    </div>}
    {(item.warnings ?? []).map((warning: string) => <p className="tvv-policy-warning" key={warning}><Info size={16} />{warning}</p>)}
    {!policyRows && Number(item.estimatedReward ?? 0) > 0 && <div className="tvv-contest-detail-reward"><span>Ước tính thưởng</span><strong>{formatVnd(Number(item.estimatedReward))}</strong></div>}
  </section></div>;
}

function ContractPreview({ contracts, onAll, onOpenContract }: any) {
  return <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div>{contracts.length ? contracts.slice(0, 5).map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">Chưa có hợp đồng trong tháng này.</p>}</section>;
}

function ContractsList({ contracts, onOpenContract }: any) {
  return <section className="tvv-content tvv-subpage tvv-after-sub-header"><section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><span>{contracts.length} HĐ</span></div>{contracts.length ? contracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} onOpen={onOpenContract} />) : <p className="tvv-empty">Chưa có hợp đồng trong tháng này.</p>}</section></section>;
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
    ["Ngày phát hành", display.issuedDate ? formatDateVi(display.issuedDate) : ""],
    ["IP", formatVnd(Number(row.ip || 0))],
    ["AFYP", formatVnd(Number(row.afyp || 0))]
  ];
  return <div className="tvv-contract-detail-backdrop" role="presentation" onClick={onClose}><section className="tvv-contract-detail" role="dialog" aria-modal="true" aria-label="Chi tiết hợp đồng" onClick={(event) => event.stopPropagation()}><header><div><p>{display.applicationNo}</p><h2>{display.policyOwner}</h2></div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header><div className="tvv-contract-detail-grid">{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>;
}

function CalculatorView(props: any) {
  const { drafts, draftRewards, estimate } = props;
  const calculatorPrograms = estimate?.calculatorPrograms ?? estimate?.rewardByProgram ?? [];
  const calculatorTotal = estimate?.calculatorTotalEstimatedReward ?? estimate?.totalEstimatedReward ?? 0;
  return <section className="tvv-calculator">
    <TvvSubHeader title="Máy tính thưởng" onBack={props.onBack} />
    <section className="tvv-calc-card"><h2>1. Nhập thông tin hợp đồng</h2><div className="tvv-form-grid tvv-form-grid-compact"><label>Phí đóng (PĐT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>đ</span></div></label><label>Ngày nộp phí dự kiến<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" onClick={props.onAdd}>+ Thêm hợp đồng</button></section>
    <section className="tvv-calc-card"><div className="tvv-section-head"><h2>2. Danh sách hợp đồng đã thêm ({drafts.length})</h2>{drafts.length > 0 && <button className="danger" onClick={props.onClear}><Trash2 size={15} /> Xóa tất cả</button>}</div>{drafts.map((draft: DraftContract, index: number) => <article className="tvv-draft-row" key={draft.id}><GripVertical size={17} /><i>{index + 1}</i><div><b>{draft.productName}</b><p>PĐT: {formatVnd(draft.premium)}</p><small>Ngày dự kiến: {formatDateVi(draft.expectedPaidDate)}</small></div><strong><span>Dự kiến thưởng</span><b>{formatVnd(Number(draftRewards.get(draft.id)?.estimatedReward ?? 0))}</b></strong><button onClick={() => props.onRemove(draft.id)}><Trash2 size={18} /></button></article>)}</section>
    <section className="tvv-calc-card"><h2>3. Kết quả ước tính</h2><div className="tvv-result-table tvv-result-table-standalone"><div className="tvv-result-head"><span>Chương trình</span><span>Thưởng cộng thêm</span></div>{calculatorPrograms.filter((item: any) => item.programId !== "policy-month-13").map((item: any, index: number) => {
      const increase = Number(item.incrementalReward ?? item.estimatedReward ?? 0);
      const currentReward = Number(item.currentReward ?? 0);
      return <div className={`tvv-result-row${item.isPolicyProjection ? " policy" : ""}${item.isCommission ? " commission" : ""}`} key={item.programId}><div><span className={`tvv-result-icon tone-${index % 3}`}>{item.isPolicyProjection ? <ShieldCheck size={22} /> : item.isCommission ? <Calculator size={22} /> : index % 3 === 1 ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 52)}</b>{(item.isPolicyProjection || item.isCommission) && <small>{item.period}</small>}</div><strong className={increase > 0 ? "increase" : ""}>{item.isPolicyProjection && currentReward > 0 && <small>Hiện tại {formatVnd(currentReward)}</small>}{increase > 0 ? `+${formatVnd(increase)}` : formatVnd(0)}</strong></div>;
    })}</div><div className="tvv-total"><span>Tổng thưởng cộng thêm dự kiến</span><strong>+{formatVnd(Number(calculatorTotal))}</strong></div><p className="tvv-disclaimer"><Info size={17} /><span><b>Lưu ý</b>Phần màu xanh là số thưởng tăng thêm so với dữ liệu hiện tại. Thưởng chính sách chỉ được xác nhận khi hợp đồng đủ điều kiện và phát hành thành công.</span></p></section>
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
    const payload = await response.json();
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
  return <section className="tvv-content tvv-subpage tvv-after-sub-header"><section className="tvv-card tvv-profile-card"><h2>Cá nhân</h2><div className="tvv-profile">
    {profile?.avatar_url ? <img className="tvv-profile-avatar" src={profile.avatar_url} alt="Avatar" /> : <UserRound size={58} />}
    <b>{profile?.full_name || advisor?.name}</b><span>{profile?.advisor_code || advisor?.code}</span><strong>{contracts.length} hợp đồng trong tháng</strong>
  </div>
  <div className="tvv-profile-details"><div><span>Ngày sinh</span><b>{profile?.birth_day && profile?.birth_month ? `${profile.birth_day}/${profile.birth_month}` : "—"}</b></div><div><span>Ngày bắt đầu làm việc</span><b>{date(profile?.start_date)}</b></div><div><span>Trạng thái</span><b>{profile?.advisor_status || "—"}</b></div><div><span>Chức vụ TVV</span><b>{profile?.advisor_position || "—"}</b></div><div><span>Ngày hiệu lực chức vụ</span><b>{date(profile?.position_effective_date)}</b></div></div>
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
  const items: Array<[Tab, string, any]> = [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Tính thưởng", Calculator], ["contests", "Thi đua", Trophy], ["profile", "Cá nhân", UserRound]];
  return <nav className="tvv-bottom-nav" aria-label="Điều hướng chính">{items.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={25} /><span>{label}</span></button>)}</nav>;
}
