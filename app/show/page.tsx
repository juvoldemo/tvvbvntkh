"use client";

import { useEffect, useRef, useState } from "react";
import { GitCompareArrows, LockKeyhole, RefreshCcw, Target, TrendingUp, UserRound, Users, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

type Advisor = { advisorCode: string; advisorName: string; revenueTarget: number };
type Group = { groupName: string; leaderName: string; advisorCount: number; revenueTarget: number; advisors: Advisor[] };
type Comparison = { groupName: string; advisorCount: number; advisorTarget: number; leaderTarget: number; difference: number };
type ShowData = { month: string; groupCount: number; advisorCount: number; revenueTarget: number; groups: Group[]; leaderGroupCount: number; leaderAdvisorCount: number; leaderRevenueTarget: number; leaderGroups: Group[]; comparisons: Comparison[] };
type View = "advisor" | "leader" | "comparison";

function compactMoney(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
}
function fullMoney(value: number) { return `${Number(value || 0).toLocaleString("vi-VN")} đ`; }
function transitionName(groupName: string) { return `target-group-${groupName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`; }

export default function TargetShowPage() {
  const [data, setData] = useState<ShowData | null>(null);
  const [view, setView] = useState<View>("advisor");
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("Đang kết nối Realtime");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [accessView, setAccessView] = useState<View | null>(null);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const hasData = useRef(false);

  useEffect(() => {
    let active = true; let refreshTimer: number | undefined;
    const load = () => fetch("/api/show-targets", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Không tải được dữ liệu");
      if (active) { setData(payload); setError(""); hasData.current = true; }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu"); });
    void load(); const pollingTimer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 3000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) { setRealtimeStatus("Chưa cấu hình Realtime"); return () => { active = false; window.clearInterval(pollingTimer); }; }
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const refresh = () => { if (refreshTimer) window.clearTimeout(refreshTimer); refreshTimer = window.setTimeout(load, 150); };
    const localChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("tvv-target-updates") : null; if (localChannel) localChannel.onmessage = refresh;
    const channel = supabase.channel("target-show-live").on("postgres_changes", { event: "*", schema: "public", table: "tvv_target_registrations" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "team_target_registrations" }, refresh).subscribe((status) => { if (active) setRealtimeStatus(status === "SUBSCRIBED" ? "Đang cập nhật trực tiếp" : status === "CHANNEL_ERROR" ? "Mất kết nối Realtime" : "Đang kết nối Realtime"); });
    return () => { active = false; if (refreshTimer) window.clearTimeout(refreshTimer); window.clearInterval(pollingTimer); localChannel?.close(); void supabase.removeChannel(channel); };
  }, []);

  async function resetTargets(event: React.FormEvent) {
    event.preventDefault(); setResetBusy(true); setResetError("");
    try { const response = await fetch("/api/show-targets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: data?.month, password: resetPassword }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Không reset được dữ liệu."); window.location.reload(); }
    catch (reason) { setResetError(reason instanceof Error ? reason.message : "Không reset được dữ liệu."); } finally { setResetBusy(false); }
  }

  function requestProtectedView(nextView: View) {
    setAccessView(nextView); setAccessPassword(""); setAccessError("");
  }
  function confirmProtectedView(event: React.FormEvent) {
    event.preventDefault();
    if (accessPassword !== "5875") { setAccessError("Mật khẩu không đúng."); return; }
    if (accessView) setView(accessView);
    setAccessView(null); setAccessPassword(""); setAccessError("");
  }

  const groups = view === "leader" ? (data?.leaderGroups ?? []) : (data?.groups ?? []);
  const groupCount = view === "leader" ? data?.leaderGroupCount : data?.groupCount;
  const advisorCount = view === "leader" ? data?.leaderAdvisorCount : data?.advisorCount;
  const revenueTarget = view === "leader" ? data?.leaderRevenueTarget : data?.revenueTarget;
  return <main className="target-show-page">
    <header className="target-show-header"><div><span><Target size={28} /></span><div><h1>Mục Tiêu Kinh Doanh</h1><p>Tháng {data ? `${data.month.slice(5, 7)}/${data.month.slice(0, 4)}` : "--/----"}</p></div></div><aside><small><i className="target-show-live-dot" />{realtimeStatus}</small><button type="button" aria-label="Reset dữ liệu" title="Reset dữ liệu" onClick={() => { setResetError(""); setResetOpen(true); }}><RefreshCcw size={18} /></button></aside></header>
    <nav className="target-show-tabs" aria-label="Chế độ xem"><button className={view === "advisor" ? "active" : ""} onClick={() => setView("advisor")}><UserRound size={17} />TVV đăng ký</button><button className={view === "leader" ? "active" : ""} onClick={() => requestProtectedView("leader")}><Users size={17} />Trưởng nhóm</button><button className={view === "comparison" ? "active" : ""} onClick={() => requestProtectedView("comparison")}><GitCompareArrows size={17} />So sánh</button></nav>
    {view !== "comparison" && <section className="target-show-summary"><article><span><Users /></span><div><small>Tổng số nhóm</small><strong>{groupCount ?? 0}</strong></div></article><article><span><UserRound /></span><div><small>{view === "leader" ? "Tổng TVV được giao" : "Tổng TVV đăng ký"}</small><strong>{advisorCount ?? 0}</strong></div></article><article><span><TrendingUp /></span><div><small>Tổng doanh thu</small><strong>{compactMoney(revenueTarget ?? 0)}</strong></div></article></section>}
    {error && <p className="target-show-error">{error}</p>}
    {view !== "comparison" && <section className="target-show-groups">{groups.map((group, index) => <article className={`target-show-group${index === 0 && group.revenueTarget > 0 ? " is-leader" : ""}`} style={{ viewTransitionName: transitionName(`${view}-${group.groupName}`) }} key={group.groupName}><header><i>{index + 1}</i><div><h2>{group.groupName}</h2><small className="target-show-leader">{group.leaderName}</small><p><b>{compactMoney(group.revenueTarget)}</b><span>{group.advisorCount} TVV</span></p></div></header><div className="target-show-advisors">{group.advisors.map((advisor) => <div key={advisor.advisorCode || advisor.advisorName}><span><b>{advisor.advisorName}</b></span><strong>{compactMoney(advisor.revenueTarget)}</strong></div>)}{!group.advisors.length && <p>Chưa có TVV đăng ký</p>}</div></article>)}</section>}
    {view === "comparison" && <section className="target-comparison"><header><div><h2>Bảng so sánh mục tiêu theo nhóm</h2><p>Chỉ cộng những TVV xuất hiện và khớp ở cả hai bên</p></div><strong>{data?.comparisons.length ?? 0} nhóm</strong></header><div className="target-comparison-table"><table><thead><tr><th>Hạng</th><th>Nhóm</th><th>TVV khớp</th><th>Tổng TVV đăng ký</th><th>Tổng trưởng nhóm đăng ký</th><th>Chênh lệch</th></tr></thead><tbody>{(data?.comparisons ?? []).map((row, index) => <tr key={row.groupName}><td><i className={`rank-${index + 1}`}>{index + 1}</i></td><td><b>{row.groupName}</b></td><td>{row.advisorCount} TVV</td><td><strong>{fullMoney(row.advisorTarget)}</strong></td><td>{fullMoney(row.leaderTarget)}</td><td><em className={row.difference > 0 ? "positive" : row.difference < 0 ? "negative" : "equal"}>{row.difference > 0 ? "+" : ""}{fullMoney(row.difference)}</em></td></tr>)}{!data?.comparisons.length && <tr><td colSpan={6} className="target-comparison-empty">Chưa có TVV khớp giữa hai bên trong tháng này.</td></tr>}</tbody></table></div></section>}
    {resetOpen && <div className="target-reset-backdrop" onClick={() => setResetOpen(false)}><form className="target-reset-modal" role="dialog" aria-modal="true" onSubmit={resetTargets} onClick={(event) => event.stopPropagation()}><header><span><LockKeyhole size={20} /></span><div><h2>Reset dữ liệu tháng {data?.month.slice(5, 7)}/{data?.month.slice(0, 4)}</h2><p>Toàn bộ mục tiêu TVV trong tháng sẽ bị xóa.</p></div><button type="button" onClick={() => setResetOpen(false)} aria-label="Đóng"><X size={19} /></button></header><label>Mật khẩu xác nhận<input autoFocus type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Nhập mật khẩu" /></label>{resetError && <p className="target-reset-error">{resetError}</p>}<button className="target-reset-submit" type="submit" disabled={resetBusy || !resetPassword}>{resetBusy ? "Đang reset..." : "Xác nhận reset"}</button></form></div>}
    {accessView && <div className="target-reset-backdrop" onClick={() => setAccessView(null)}><form className="target-reset-modal target-access-modal" role="dialog" aria-modal="true" aria-label="Nhập mật khẩu truy cập" onSubmit={confirmProtectedView} onClick={(event) => event.stopPropagation()}><header><span><LockKeyhole size={20} /></span><div><h2>Truy cập {accessView === "leader" ? "Trưởng nhóm" : "So sánh"}</h2><p>Vui lòng nhập mật khẩu để xem nội dung này.</p></div><button type="button" onClick={() => setAccessView(null)} aria-label="Đóng"><X size={19} /></button></header><label>Mật khẩu truy cập<input autoFocus type="password" inputMode="numeric" value={accessPassword} onChange={(event) => { setAccessPassword(event.target.value); setAccessError(""); }} placeholder="Nhập mật khẩu" /></label>{accessError && <p className="target-reset-error">{accessError}</p>}<button className="target-reset-submit" type="submit" disabled={!accessPassword}>Xác nhận</button></form></div>}
  </main>;
}
