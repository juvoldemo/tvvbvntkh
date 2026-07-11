"use client";

import { useEffect, useRef, useState } from "react";
import { LockKeyhole, RefreshCcw, Target, TrendingUp, UserRound, Users, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

type Advisor = { advisorCode: string; advisorName: string; revenueTarget: number };
type Group = { groupName: string; leaderName: string; advisorCount: number; revenueTarget: number; advisors: Advisor[] };
type ShowData = { month: string; groupCount: number; advisorCount: number; revenueTarget: number; groups: Group[]; refreshedAt: string };

function compactMoney(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
}

function transitionName(groupName: string) {
  return `target-group-${groupName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`;
}

export default function TargetShowPage() {
  const [data, setData] = useState<ShowData | null>(null);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("Đang kết nối Realtime");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;
    const load = () => fetch("/api/show-targets", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không tải được dữ liệu");
        if (active) {
          const update = () => { setData(payload); setError(""); };
          const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => void };
          if (hasData.current && documentWithTransitions.startViewTransition) documentWithTransitions.startViewTransition(update);
          else update();
          hasData.current = true;
        }
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu"); });
    void load();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setRealtimeStatus("Chưa cấu hình Realtime");
      return () => { active = false; };
    }
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const refresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(load, 150);
    };
    const localChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("tvv-target-updates") : null;
    if (localChannel) localChannel.onmessage = refresh;
    const refreshOnFocus = () => refresh();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    const channel = supabase.channel("target-show-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tvv_target_registrations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_target_registrations" }, refresh)
      .subscribe((status) => {
        if (!active) return;
        setRealtimeStatus(status === "SUBSCRIBED" ? "Đang cập nhật trực tiếp" : status === "CHANNEL_ERROR" ? "Mất kết nối Realtime" : "Đang kết nối Realtime");
      });
    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      localChannel?.close();
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, []);

  async function resetTargets(event: React.FormEvent) {
    event.preventDefault();
    setResetBusy(true);
    setResetError("");
    try {
      const response = await fetch("/api/show-targets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: data?.month, password: resetPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không reset được dữ liệu.");
      setData((current) => current ? {
        ...current,
        groupCount: 0,
        advisorCount: 0,
        revenueTarget: 0,
        groups: []
      } : current);
      setResetPassword("");
      setResetOpen(false);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Không reset được dữ liệu.");
    } finally {
      setResetBusy(false);
    }
  }

  return <main className="target-show-page">
    <header className="target-show-header">
      <div><span><Target size={28} /></span><div><h1>Mục Tiêu Kinh Doanh</h1><p>Tháng {data ? `${data.month.slice(5, 7)}/${data.month.slice(0, 4)}` : "--/----"}</p></div></div>
      <aside><small><i className="target-show-live-dot" />{realtimeStatus}</small><button type="button" aria-label="Reset dữ liệu" title="Reset dữ liệu" onClick={() => { setResetError(""); setResetOpen(true); }}><RefreshCcw size={18} /></button></aside>
    </header>
    <section className="target-show-summary">
      <article><span><Users /></span><div><small>Tổng số nhóm</small><strong>{data?.groupCount ?? 0}</strong></div></article>
      <article><span><UserRound /></span><div><small>Tổng TVV đăng ký</small><strong>{data?.advisorCount ?? 0}</strong></div></article>
      <article><span><TrendingUp /></span><div><small>Tổng doanh thu</small><strong>{compactMoney(data?.revenueTarget ?? 0)}</strong></div></article>
    </section>
    {error && <p className="target-show-error">{error}</p>}
    <section className="target-show-groups">
      {(data?.groups ?? []).map((group, index) => <article className={`target-show-group${index === 0 && group.revenueTarget > 0 ? " is-leader" : ""}`} style={{ viewTransitionName: transitionName(group.groupName) }} key={group.groupName}>
        <header><i>{index + 1}</i><div><h2>{group.groupName}</h2><small className="target-show-leader">{group.leaderName}</small><p><b>{compactMoney(group.revenueTarget)}</b><span>{group.advisorCount} TVV</span></p></div></header>
        <div className="target-show-advisors">
          {group.advisors.map((advisor) => <div key={advisor.advisorCode}><span><b>{advisor.advisorName}</b></span><strong>{compactMoney(advisor.revenueTarget)}</strong></div>)}
          {!group.advisors.length && <p>Chưa có TVV đăng ký</p>}
        </div>
      </article>)}
    </section>
    {resetOpen && <div className="target-reset-backdrop" role="presentation" onClick={() => setResetOpen(false)}><form className="target-reset-modal" role="dialog" aria-modal="true" aria-label="Reset dữ liệu đăng ký" onSubmit={resetTargets} onClick={(event) => event.stopPropagation()}>
      <header><span><LockKeyhole size={20} /></span><div><h2>Reset dữ liệu tháng {data?.month.slice(5, 7)}/{data?.month.slice(0, 4)}</h2><p>Toàn bộ mục tiêu TVV trong tháng sẽ bị xóa.</p></div><button type="button" onClick={() => setResetOpen(false)} aria-label="Đóng"><X size={19} /></button></header>
      <label>Mật khẩu xác nhận<input autoFocus type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} inputMode="numeric" placeholder="Nhập mật khẩu" /></label>
      {resetError && <p className="target-reset-error">{resetError}</p>}
      <button className="target-reset-submit" type="submit" disabled={resetBusy || !resetPassword}>{resetBusy ? "Đang reset..." : "Xác nhận reset"}</button>
    </form></div>}
  </main>;
}
