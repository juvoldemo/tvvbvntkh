"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./ban-dinh-form.css";
import { BanDinhSession, validBanDinhCounts } from "@/lib/ban-dinh";

export default function BanDinhPage() {
  const [consultations, setConsultations] = useState("");
  const [contracts, setContracts] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [session, setSession] = useState<BanDinhSession | null>(null);
  const round = useRef<string | null>(null);
  async function load() {
    setLoading(true); setError(""); setBlocked(false);
    try {
      const r = await fetch("/api/ban-dinh", { cache: "no-store" });
      const result = await r.json();
      if (!r.ok) { setBlocked(r.status === 401 || r.status === 403); throw new Error(result.error || "Không tải được số liệu."); }
      setSession(result.session || null);
      round.current = result.session?.reportPrefix || "latest";
      setSubmitted(Boolean(result.entry));
      if (result.entry) {
        if (!validBanDinhCounts(result.entry)) throw new Error("Số liệu đã lưu không hợp lệ.");
        setConsultations(String(result.entry.consultations)); setContracts(String(result.entry.contracts));
      } else { setConsultations(""); setContracts(""); }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const r = await fetch("/api/ban-dinh-session", { cache: "no-store", signal: controller.signal });
        const result = await r.json();
        if (!r.ok || typeof result.session?.running !== "boolean") throw new Error("Invalid status");
        if (!controller.signal.aborted) {
          setSession(result.session);
          if (round.current !== null && round.current !== (result.session.reportPrefix || "latest")) {
            round.current = result.session.reportPrefix || "latest";
            setNotice("");
            void load();
          }
        }
      } catch { if (!controller.signal.aborted) setSession(null); }
      finally { pending = false; }
    }
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || submitted || !session?.running) return;
    const value = { consultations: Number(consultations), contracts: Number(contracts) };
    if (!consultations.trim() || !contracts.trim() || !validBanDinhCounts(value)) { setNotice("Vui lòng nhập số nguyên không âm cho cả hai nội dung."); return; }
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/ban-dinh", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const result = await r.json();
      if (!r.ok) {
        if (result.submitted) { await load(); return; }
        if (r.status === 409) setSession(result.session || null);
        if (r.status === 401 || r.status === 403) { setBlocked(true); setError(result.error); }
        throw new Error(result.error || "Không lưu được số liệu.");
      }
      setSubmitted(true); setNotice("");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="ban-dinh-page"><header><Link href="/" aria-label="Quay lại trang chủ"><ArrowLeft size={22} /></Link><h1>Bán đỉnh 3.0</h1></header>
    <section className="ban-dinh-form-card">
      {loading ? <p role="status">Đang tải số liệu...</p> : error ? <><p role="alert">{error}</p>{blocked ? <Link href="/">Về trang chủ / Đăng nhập</Link> : <button onClick={() => void load()}>Thử lại</button>}</> : <form onSubmit={save}>
        <h2 className="ban-dinh-form-title">Bạn đã sẵn sàng tham gia chiến dịch?<span className="ban-dinh-form-subtitle">Hãy đăng ký mục tiêu ở dưới nhé</span></h2>
        <fieldset disabled={busy || submitted || !session?.running}>
          <label htmlFor="ban-dinh-consultations"><span>Số cuộc tư vấn cá nhân</span><input id="ban-dinh-consultations" type="number" inputMode="numeric" min={0} step={1} required value={consultations} onChange={e => { setConsultations(e.target.value); setNotice(""); }} /></label>
          <label htmlFor="ban-dinh-contracts"><span>Số hợp đồng khai thác mới</span><input id="ban-dinh-contracts" type="number" inputMode="numeric" min={0} step={1} required value={contracts} onChange={e => { setContracts(e.target.value); setNotice(""); }} /></label>
          <button type="submit" disabled={busy || submitted || !session?.running}>{submitted ? "Cảm ơn bạn !" : busy ? "Đang xác nhận..." : "Xác nhận"}</button>
        </fieldset>
        {notice && <p role="status">{notice}</p>}
      </form>}
    </section>
  </main>;
}
