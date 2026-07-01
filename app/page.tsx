"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Calculator, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, GripVertical, Gift, Home, Hourglass, Info, Search, ShieldCheck, Trash2, Trophy, UserRound, XCircle } from "lucide-react";
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
  const monthOptions = useMemo(() => monthOptionsUntilCurrent(), []);

  useEffect(() => {
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
    if (!advisor) return;
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
  }, [advisor, drafts, month]);

  const stats = useMemo(() => {
    const total = myContracts.length;
    const issued = myContracts.filter((row: any) => normalizeStatusText(row.policy_status) === "co hieu luc").length;
    const invalid = myContracts.filter((row: any) => ["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"].includes(normalizeStatusText(row.policy_status))).length;
    return { total, issued, pending: Math.max(total - issued - invalid, 0), invalid };
  }, [myContracts]);
  const notificationCount = Math.min(99, stats.pending + stats.invalid + Number((estimate ?? emptyEstimate)?.eligibleProgramCount ?? 0));

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
          {tab === "overview" ? (
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
          {tab === "profile" && <Profile advisor={advisor} contracts={myContracts} />}
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

function Profile({ advisor, contracts }: any) {
  return <section className="tvv-content tvv-subpage tvv-after-sub-header"><section className="tvv-card"><h2>Cá nhân</h2><div className="tvv-profile"><UserRound size={42} /><b>{advisor?.name}</b><span>{advisor?.code}</span><p>{advisor?.ban} / {advisor?.group}</p><strong>{contracts.length} hợp đồng trong tháng</strong></div></section></section>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<[Tab, string, any]> = [["overview", "Tổng quan", Home], ["contracts", "Hợp đồng", ClipboardList], ["calculator", "Tính thưởng", Calculator], ["contests", "Thi đua", Trophy], ["profile", "Cá nhân", UserRound]];
  return <nav className="tvv-bottom-nav" aria-label="Điều hướng chính">{items.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={25} /><span>{label}</span></button>)}</nav>;
}
