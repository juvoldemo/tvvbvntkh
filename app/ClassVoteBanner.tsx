"use client";

import Image from "next/image";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const choices = ["A", "T", "M"] as const;

export default function ClassVoteBanner({ adoMode = false, adoGroups = [] }: { adoMode?: boolean; adoGroups?: string[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [posterMissing, setPosterMissing] = useState(false);
  const [posterViewerOpen, setPosterViewerOpen] = useState(false);
  const [votingLocked, setVotingLocked] = useState(false);
  const [votingStarted, setVotingStarted] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [results, setResults] = useState<Record<string, Array<{ advisorName: string; advisorCode: string }>>>({ A: [], T: [], M: [] });
  const [registeredAdvisors, setRegisteredAdvisors] = useState<Array<{ advisorName: string; advisorCode: string }>>([]);
  const [companyRegisteredCount, setCompanyRegisteredCount] = useState(0);
  const [resultScope, setResultScope] = useState<"company" | "region">("region");

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  useEffect(() => {
    const refreshVisibility = () => {
      fetch("/api/class-votes", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => { if (payload) { setVotingLocked(Boolean(payload.isLocked)); setVotingStarted(Boolean(payload.isStarted)); } })
        .catch(() => undefined);
    };
    refreshVisibility();
    const timer = window.setInterval(refreshVisibility, 5000);
    return () => window.clearInterval(timer);
  }, []);

  function choose(choice: (typeof choices)[number]) {
    if (saving) return;
    setSelected(choice);
    setMessage("");
    setMessageError(false);
  }

  async function submitVote() {
    if (!selected || saving) return;
    setSaving(true);
    setMessage("");
    setMessageError(false);
    try {
      const response = await fetch("/api/class-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: selected })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể lưu bình chọn.");
      setHasSubmitted(true);
      setMessage("Bình chọn của bạn đã được ghi nhận.");
    } catch (error) {
      setMessageError(true);
      setMessage(error instanceof Error ? error.message : "Không thể lưu bình chọn. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function openResults(scope = resultScope) {
    setResultsOpen(true);
    setResultsLoading(true);
    setResultsError("");
    try {
      const params = adoMode ? `?scope=${scope}` : "";
      const response = await fetch(`/api/class-votes${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải bình chọn của đồng đội.");
      setResults(payload.votes ?? { A: [], T: [], M: [] });
      setRegisteredAdvisors(payload.registeredAdvisors ?? []);
      setCompanyRegisteredCount(Number(payload.companyRegisteredCount) || 0);
      setVotingLocked(Boolean(payload.isLocked)); setVotingStarted(Boolean(payload.isStarted)); setResultScope(payload.scope === "company" ? "company" : "region");
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : "Không thể tải bình chọn của đồng đội.");
    } finally {
      setResultsLoading(false);
    }
  }

  if (!votingStarted) return null;

  return <>
    <button className="tvv-card class-vote-banner" type="button" onClick={() => { if (adoMode) void openResults(); else { setMessage(""); setOpen(true); } }} aria-label={adoMode ? "Xem đồng đội đang chọn gì" : "Mở poster Khẳng định đẳng cấp để bình chọn"}>
      <Image src="/Khẳng định đẳng cấp.png" alt="Khẳng định đẳng cấp" width={1600} height={320} priority />
    </button>
    {open && <div className="class-vote-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
      <section className="class-vote-modal" role="dialog" aria-modal="true" aria-label="Bình chọn Khẳng định đẳng cấp">
        <button className="class-vote-close" type="button" onClick={() => setOpen(false)} disabled={saving} aria-label="Đóng"><X size={22} /></button>
        <div className="class-vote-poster">
          {!posterMissing ? <button type="button" onClick={() => setPosterViewerOpen(true)} aria-label="Mở poster để phóng to"><img src="/Poster Khẳng định đẳng cấp.jpg" alt="Poster Khẳng định đẳng cấp" onError={() => setPosterMissing(true)} /></button> : <p>Chưa tìm thấy ảnh Poster Khẳng định đẳng cấp.jpg trong thư mục public.</p>}
        </div>
        <div className="class-vote-actions" role="group" aria-label="Chọn phương án bình chọn">
          <p>Bạn chọn phương án nào ?</p>
          <small className="class-vote-limit">Bạn chỉ được bình chọn 2 lần.</small>
          <div>{choices.map((choice) => <button key={choice} type="button" className={selected === choice ? "selected" : ""} onClick={() => choose(choice)} disabled={saving} aria-pressed={selected === choice}>{choice}</button>)}</div>
          <button className="class-vote-submit" type="button" onClick={() => void submitVote()} disabled={!selected || saving || votingLocked}>{saving ? <><LoaderCircle className="class-vote-spin" size={18} />Đang chốt…</> : votingLocked ? "Đã khóa chốt" : "Chốt"}</button>
          <button className="class-vote-results-button" type="button" onClick={() => void openResults()} disabled={!hasSubmitted}>{hasSubmitted ? "Xem đồng đội đang chọn gì" : "Hãy chốt để xem đồng đội đang chọn gì"}</button>
          {message && <small className={messageError ? "error" : "success"} role="status">{message}</small>}
        </div>
      </section>
    </div>}
    {posterViewerOpen && <div className="class-poster-viewer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPosterViewerOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Xem poster Khẳng định đẳng cấp">
        <div className="class-poster-viewer-image"><img src="/Poster Khẳng định đẳng cấp.jpg" alt="Poster Khẳng định đẳng cấp" /></div>
      </section>
    </div>}
    {resultsOpen && <div className="class-vote-results-backdrop" role="presentation">
      <section className="class-vote-results" role="dialog" aria-modal="true" aria-label="Ket qua binh chon">
        <header><div>{adoMode ? <div className="class-vote-scope-buttons"><button type="button" className={resultScope === "company" ? "active" : ""} onClick={() => void openResults("company")} disabled={resultsLoading}>{"C\u00f4ng ty"}</button><button type="button" className={resultScope === "region" ? "active" : ""} onClick={() => void openResults("region")} disabled={resultsLoading}>{"Khu v\u1ef1c"}</button><span>{"T\u1ed5ng TVV \u0111\u00e3 \u0111\u0103ng k\u00fd: "}{companyRegisteredCount}</span></div> : <h2>{"\u0110\u1ed3ng \u0111\u1ed9i \u0111ang ch\u1ecdn g\u00ec?"}</h2>}</div><button type="button" onClick={() => setResultsOpen(false)} aria-label={"\u0110\u00f3ng"}><X size={24} /></button></header>
        {resultsLoading ? <div className="class-vote-results-state"><LoaderCircle className="class-vote-spin" />Dang tai...</div> : resultsError ? <div className="class-vote-results-state error">{resultsError}</div> : <div className={`class-vote-results-grid${adoMode ? " ado-results-grid" : ""}`}>{adoMode && <section className="class-vote-result-column registered-advisors"><header><strong>{"TVV \u0111\u00e3 \u0111\u0103ng k\u00fd"}</strong><span>{registeredAdvisors.length}</span></header><div>{registeredAdvisors.length ? registeredAdvisors.map((advisor) => <article key={advisor.advisorCode}><b>{advisor.advisorName}</b></article>) : <p>Chua co TVV dang ky</p>}</div></section>}{choices.map((choice) => <section key={choice} className={`class-vote-result-column choice-${choice}`}><header><strong>{choice}</strong><span>{results[choice]?.length || 0}</span></header><div>{results[choice]?.length ? results[choice].map((vote) => <article key={vote.advisorCode}><b>{vote.advisorName}</b></article>) : <p>Chua co binh chon</p>}</div></section>)}</div>}
      </section>
    </div>}
    {false && resultsOpen && <div className="class-vote-results-backdrop" role="presentation">
      <section className="class-vote-results" role="dialog" aria-modal="true" aria-label="Bình chọn của đồng đội">
        <header><div>{!adoMode && <h2>Đồng đội đang chọn gì ?</h2>}{adoMode && <div className="class-vote-scope-buttons"><button type="button" className={resultScope === "company" ? "active" : ""} onClick={() => void openResults("company")} disabled={resultsLoading}>Công ty</button><button type="button" className={resultScope === "region" ? "active" : ""} onClick={() => void openResults("region")} disabled={resultsLoading}>Khu vực</button></div>}</div><button type="button" onClick={() => setResultsOpen(false)} aria-label="Đóng"><X size={24} /></button></header>
        {resultsLoading ? <div className="class-vote-results-state"><LoaderCircle className="class-vote-spin" />Đang tải bình chọn…</div> : resultsError ? <div className="class-vote-results-state error">{resultsError}</div> : <div className="class-vote-results-grid">{choices.map((choice) => <section key={choice} className={`class-vote-result-column choice-${choice}`}><header><strong>{choice}</strong><span>{results[choice]?.length || 0}</span></header><div>{results[choice]?.length ? results[choice].map((vote) => <article key={vote.advisorCode}><b>{vote.advisorName}</b></article>) : <p>Chưa có bình chọn</p>}</div></section>)}</div>}
      </section>
    </div>}
  </>;
}
