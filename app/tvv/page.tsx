"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Calculator, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, GripVertical, Gift, HelpCircle, Home, Hourglass, Info, Search, ShieldCheck, Trash2, Trophy, UserRound, XCircle } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { normalizeStatusText } from "@/lib/reports";

type Tab = "overview" | "contracts" | "calculator" | "contests" | "profile";
type DraftContract = { id: string; productName: string; productCode?: string; premium: number; expectedPaidDate: string; expectedIssueDate?: string; status?: string };

const fallbackAdvisor = {
  key: "D1021A1YNG__Lê Thị Mỹ Châu",
  code: "D1021A1YNG",
  name: "Lê Thị Mỹ Châu",
  ban: "",
  group: "",
  ads: ""
};

const fallbackContracts = [
  { id: "demo-1", application_no: "A26004662832", product_name: "Sản phẩm", ip: 25590700, afyp: 25590700, policy_status: "Có hiệu lực" },
  { id: "demo-2", application_no: "A26004669541", product_name: "Sản phẩm", ip: 21316600, afyp: 21316600, policy_status: "Có hiệu lực" },
  { id: "demo-3", application_no: "A26004622002", product_name: "Sản phẩm", ip: 18952600, afyp: 18952600, policy_status: "Có hiệu lực" },
  { id: "demo-4", application_no: "A26004942987", product_name: "Sản phẩm", ip: 15212420, afyp: 15212420, policy_status: "Có hiệu lực" },
  { id: "demo-5", application_no: "A26004258448", product_name: "Sản phẩm", ip: 23119600, afyp: 23119600, policy_status: "Chờ xử lý" }
];

const fallbackEstimate = {
  rewardByProgram: [{
    programId: "demo-program",
    programName: "Thưởng dành cho TB/TN - Hỗ trợ TVV hoạt động thành công",
    conditionText: "TVV đã có hợp đồng trong tháng 06/2026 (trước 25/06) và phát sinh thêm hợp đồng đủ điều kiện.",
    matchedContracts: [{ id: "demo-1" }],
    estimatedReward: 500000
  }],
  eligibleProgramCount: 1,
  totalEstimatedReward: 500000,
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
  const monthOptions = useMemo(() => monthOptionsUntilCurrent(), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const loadingTimer = window.setTimeout(() => {
      if (cancelled) return;
      controller.abort();
      setData(null);
      setEstimate((current: any) => current ?? fallbackEstimate);
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
        setEstimate((current: any) => current ?? fallbackEstimate);
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
  }, [month]);

  const advisorOptions = useMemo(() => (data?.agents ?? []).map((agent: any) => ({
    key: `${agent.agentCode || ""}__${agent.agentName || ""}`,
    code: agent.agentCode || "",
    name: agent.agentName || "TVV",
    ban: agent.banName || "",
    group: agent.groupName || "",
    ads: agent.adsName || ""
  })), [data]);

  const advisor = advisorOptions.find((item: any) => item.key === advisorKey) ?? advisorOptions[0] ?? fallbackAdvisor;
  const allContracts = data?.statusContracts ?? data?.contracts ?? [];
  const myContracts = useMemo(() => {
    if (!advisor) return fallbackContracts;
    const source = allContracts.length ? allContracts : fallbackContracts;
    const filtered = source.filter((row: any) => (advisor.code && row.agent_code === advisor.code) || row.agent_name === advisor.name);
    return filtered.length ? filtered : source;
  }, [advisor, allContracts]);
  const productOptions = useMemo(() => {
    const names = new Set(myContracts.map((row: any) => row.product_name || row.raw_data?.product || row.raw_data?.["Sản phẩm chính"]).filter(Boolean));
    ["An Thịnh Phúc Niên", "An Tâm Hoạch Định"].forEach((name) => names.add(name));
    return [...names] as string[];
  }, [myContracts]);

  useEffect(() => {
    if (!advisor) return;
    let cancelled = false;
    fetch("/api/tvv-reward-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, advisor, draftContracts: drafts })
    })
      .then((response) => response.json())
      .then((payload) => !cancelled && setEstimate(payload))
      .catch(() => !cancelled && setEstimate(fallbackEstimate));
    return () => { cancelled = true; };
  }, [advisor, drafts, month]);

  const stats = useMemo(() => {
    const total = myContracts.length;
    const issued = myContracts.filter((row: any) => normalizeStatusText(row.policy_status) === "co hieu luc").length;
    const invalid = myContracts.filter((row: any) => ["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(normalizeStatusText(row.policy_status))).length;
    return { total, issued, pending: Math.max(total - issued - invalid, 0), invalid };
  }, [myContracts]);
  const notificationCount = Math.min(99, stats.pending + stats.invalid + Number((estimate ?? fallbackEstimate)?.eligibleProgramCount ?? 0));

  function addDraft() {
    const premium = parseMoneyInput(premiumText);
    if (!productName || premium <= 0 || !paidDate) return;
    setDrafts((current) => [...current, { id: crypto.randomUUID(), productName, productCode: productName.includes("Phúc Niên") ? "BV-NCUVL08" : "", premium, expectedPaidDate: paidDate, expectedIssueDate: paidDate, status: "Có hiệu lực" }]);
  }

  const draftRewards = new Map((estimate?.rewardByDraftContract ?? []).map((item: any) => [item.draftId, item]));

  return (
    <main className="tvv-app">
      {tab === "calculator" ? (
        <CalculatorView advisor={advisor} month={month} productName={productName} setProductName={setProductName} productOptions={productOptions} premiumText={premiumText} setPremiumText={(value: string) => setPremiumText(moneyInput(value))} paidDate={paidDate} setPaidDate={setPaidDate} drafts={drafts} draftRewards={draftRewards} estimate={estimate} onBack={() => setTab("overview")} onAdd={addDraft} onRemove={(id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id))} onClear={() => setDrafts([])} />
      ) : (
        <>
          <header className="tvv-hero">
            <div className="tvv-hero-main">
              <div className="tvv-avatar"><UserRound size={40} /></div>
              <div>
                <h1>Xin chào, {advisor?.name || "TVV"} <span>👋</span></h1>
                <p>TVV - {advisor?.code || "Chưa có mã"}</p>
              </div>
              <button className="tvv-icon-button" type="button" aria-label={`Thông báo (${notificationCount})`}>
                <Bell size={28} />
                {notificationCount > 0 && <b>{notificationCount}</b>}
              </button>
              <label className="tvv-month-pill">
                <CalendarDays size={20} />
                <span>{monthLabel(month)}</span>
                <ChevronDown size={19} />
                <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Chọn tháng">
                  {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </header>
          {tab === "overview" && <Overview stats={stats} contracts={myContracts} estimate={estimate ?? fallbackEstimate} onTab={setTab} />}
          {tab === "contracts" && <ContractsList contracts={myContracts} />}
          {tab === "contests" && <ContestList estimate={estimate ?? fallbackEstimate} />}
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} />}
        </>
      )}
      <BottomNav tab={tab} setTab={setTab} />
    </main>
  );
}

function Overview({ stats, contracts, estimate, onTab }: any) {
  const statItems = [
    ["Tổng HĐ", stats.total, ClipboardList, "blue"],
    ["Đã phát hành", stats.issued, ShieldCheck, "green"],
    ["Chờ xử lý", stats.pending, Hourglass, "orange"],
    ["Hết hiệu lực", stats.invalid, XCircle, "red"]
  ];
  return <section className="tvv-content">
    <div className="tvv-stat-card">{statItems.map(([label, value, Icon, tone]: any) => <div className="tvv-stat" key={label}><span className={tone}><Icon size={27} /></span><strong>{value}</strong><p>{label}</p><i /></div>)}</div>
    <ContestPreview estimate={estimate} onAll={() => onTab("contests")} />
    <ContractPreview contracts={contracts} onAll={() => onTab("contracts")} />
  </section>;
}

function ContestPreview({ estimate, onAll }: any) {
  const programs = (estimate?.rewardByProgram ?? []).slice(0, 1);
  return <section className="tvv-card"><div className="tvv-section-head"><h2>Chương trình thi đua</h2><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div>{programs.length ? programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} />) : <p className="tvv-empty">Thêm hợp đồng dự kiến để xem chương trình có thể đạt thưởng.</p>}</section>;
}

function ContestList({ estimate }: any) {
  const programs = estimate?.rewardByProgram ?? [];
  return <section className="tvv-content tvv-subpage"><section className="tvv-card"><div className="tvv-section-head"><h2>Thi đua của tôi</h2></div>{programs.length ? programs.map((item: any, index: number) => <ContestRow key={item.programId} item={item} index={index} />) : <p className="tvv-empty">Chưa có chương trình đạt điều kiện theo dữ liệu hiện tại.</p>}</section></section>;
}

function ContestRow({ item, index }: any) {
  const icons = [Trophy, Gift, ShieldCheck];
  const Icon = icons[index % icons.length];
  const progress = Math.min(100, Math.max(26, (item.matchedContracts?.length ?? 1) * 34));
  return <article className="tvv-contest-row"><span className={`tvv-contest-icon tone-${index % 3}`}><Icon size={40} /></span><div><em>ĐANG DIỄN RA</em><b>{shortText(item.programName, 74)}</b><small><CalendarDays size={14} />01/06/2026 - 30/06/2026</small><p>{shortText(item.conditionText, 118)}</p><i><u style={{ width: `${progress}%` }} /></i><small className="tvv-progress-text">{item.matchedContracts?.length || 1}/2 HĐ đủ điều kiện</small></div><strong>{formatVnd(item.estimatedReward)}</strong><ChevronRight size={24} /></article>;
}

function ContractPreview({ contracts, onAll }: any) {
  return <section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><button onClick={onAll}>Xem tất cả <ChevronRight size={18} /></button></div>{contracts.slice(0, 5).map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} />)}</section>;
}

function ContractsList({ contracts }: any) {
  return <section className="tvv-content tvv-subpage"><section className="tvv-card tvv-contract-card"><div className="tvv-section-head"><h2>Hợp đồng của tôi</h2><span>{contracts.length} HĐ</span></div>{contracts.map((row: any) => <ContractRow key={row.id || row.contract_no} row={row} />)}</section></section>;
}

function ContractRow({ row }: any) {
  const tone = statusTone(row.policy_status);
  const Icon = tone.icon;
  return <article className="tvv-contract-row"><span className={tone.tone}><Icon size={22} /></span><div><b>{row.application_no || row.contract_no || "-"}</b><p>{row.product_name || row.raw_data?.["Sản phẩm chính"] || "Sản phẩm"}</p></div><strong>{formatVnd(Number(row.ip || row.afyp || 0))}<small>Phí đầu tiên</small></strong><em className={tone.tone}>{tone.label}</em><ChevronRight size={20} /></article>;
}

function CalculatorView(props: any) {
  const { productOptions, drafts, draftRewards, estimate } = props;
  return <section className="tvv-calculator">
    <header className="tvv-calc-header"><button onClick={props.onBack}><ArrowLeft size={28} /></button><h1>Máy tính thưởng</h1><span><HelpCircle size={20} /> Hướng dẫn</span></header>
    <section className="tvv-calc-card"><h2>1. Chọn sản phẩm & nhập thông tin hợp đồng</h2><div className="tvv-form-grid"><label>Sản phẩm<select value={props.productName} onChange={(e) => props.setProductName(e.target.value)}>{productOptions.map((name: string) => <option key={name}>{name}</option>)}</select></label><label>Phí đóng (PĐT/IP)<div className="tvv-money-field"><input value={props.premiumText} onChange={(e) => props.setPremiumText(e.target.value)} /><span>đ</span></div></label><label>Ngày nộp phí dự kiến<div className="tvv-date-field"><span>{formatDateVi(props.paidDate)}</span><CalendarDays size={17} /><input type="date" value={props.paidDate} onChange={(e) => props.setPaidDate(e.target.value)} /></div></label></div><button className="tvv-primary" onClick={props.onAdd}>+ Thêm hợp đồng</button></section>
    <section className="tvv-calc-card"><div className="tvv-section-head"><h2>2. Danh sách hợp đồng đã thêm ({drafts.length})</h2>{drafts.length > 0 && <button className="danger" onClick={props.onClear}><Trash2 size={15} /> Xóa tất cả</button>}</div>{drafts.map((draft: DraftContract, index: number) => <article className="tvv-draft-row" key={draft.id}><GripVertical size={17} /><i>{index + 1}</i><div><b>{draft.productName}</b><p>PĐT: {formatVnd(draft.premium)}</p><small>Ngày dự kiến: {formatDateVi(draft.expectedPaidDate)}</small></div><strong><span>Dự kiến thưởng</span><b>{formatVnd(Number(draftRewards.get(draft.id)?.estimatedReward ?? 0))}</b></strong><button onClick={() => props.onRemove(draft.id)}><Trash2 size={18} /></button></article>)}</section>
    <section className="tvv-calc-card"><h2>3. Kết quả ước tính</h2><div className="tvv-result-note"><Gift size={20} /> <span>Hợp đồng của bạn có thể nhận thưởng ở</span> <b>{estimate?.eligibleProgramCount ?? 0} chương trình</b></div><div className="tvv-result-table"><div className="tvv-result-head"><span>Chương trình</span><span>Điều kiện</span><span>Ước tính thưởng</span></div>{(estimate?.rewardByProgram ?? []).map((item: any, index: number) => <div className="tvv-result-row" key={item.programId}><div><span className={`tvv-result-icon tone-${index % 3}`}>{index % 3 === 1 ? <Gift size={22} /> : <Trophy size={22} />}</span><b>{shortText(item.programName, 38)}</b></div><p>{shortText(item.conditionText, 42)}</p><strong>{formatVnd(Number(item.estimatedReward ?? 0))}</strong></div>)}</div><div className="tvv-total"><span>Tổng ước tính tiền thưởng</span><strong>{formatVnd(Number(estimate?.totalEstimatedReward ?? 0))}</strong></div><p className="tvv-disclaimer"><Info size={17} /><span><b>Lưu ý</b>Kết quả trên chỉ mang tính ước tính. Mức thưởng chính thức sẽ được xác nhận khi hợp đồng phát hành thành công.</span></p></section>
  </section>;
}

function Profile({ advisor, contracts }: any) {
  return <section className="tvv-content tvv-subpage"><section className="tvv-card"><h2>Cá nhân</h2><div className="tvv-profile"><UserRound size={42} /><b>{advisor?.name}</b><span>{advisor?.code}</span><p>{advisor?.ban} / {advisor?.group}</p><strong>{contracts.length} hợp đồng trong tháng</strong></div></section></section>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<[Tab, string, any]> = [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Tính thưởng", Calculator], ["contests", "Thi đua", Trophy], ["profile", "Cá nhân", UserRound]];
  return <nav className="tvv-bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={25} /><span>{label}</span></button>)}</nav>;
}
