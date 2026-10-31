"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { discussionGroups, discussionQuestions } from "@/lib/hoidap";
import styles from "./discussion-padlet.module.css";

type Result = { slug: string; answers: string[] | null; updatedAt: string | null };

export default function DiscussionPadlet({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [program, setProgram] = useState<1 | 2>(1);
  const [switching, setSwitching] = useState(false);
  const resettingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (resettingRef.current) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/hoidap", { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(payload.error || "Không thể tải bài trả lời.");
      setResults(payload.groups ?? []);
      setProgram(payload.program === 2 ? 2 : 1);
      setLoaded(true);
      setError("");
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải bài trả lời.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  async function resetAnswers() {
    if (resettingRef.current) return;
    if (!window.confirm(`Reset sẽ xóa toàn bộ bài trả lời Chương trình ${program} của cả 6 nhóm. Không thể hoàn tác. Bạn có muốn tiếp tục?`)) return;
    resettingRef.current = true;
    requestRef.current?.abort();
    setLoading(false);
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/hoidap", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "reset-all-padlet-answers", program })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Chưa reset được bài trả lời.");
      setResults([]);
      setLoaded(true);
      setMessage("Đã reset bài trả lời của cả 6 nhóm.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa reset được bài trả lời.");
    } finally {
      resettingRef.current = false;
      setResetting(false);
    }
  }

  async function switchProgram() {
    if (switching || resetting || loading) return;
    setSwitching(true);
    setError("");
    setMessage("");
    try {
      const target = program === 1 ? 2 : 1;
      const response = await fetch("/api/admin/hoidap", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program: target })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Chưa chuyển được chương trình.");
      setResults([]);
      setProgram(target);
      await load();
      setMessage(`Đã kích hoạt Chương trình ${target}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa chuyển được chương trình.");
    } finally { setSwitching(false); }
  }

  useEffect(() => {
    void load();
    return () => { requestRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const admin = document.querySelector(".admin-page");
    const wasInert = admin?.hasAttribute("inert");
    document.body.style.overflow = "hidden";
    admin?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = previousOverflow;
      if (!wasInert) admin?.removeAttribute("inert");
    };
  }, []);

  return createPortal(<section className={styles.padlet} aria-label={selectedGroup ? "Padlet · Bài trả lời của nhóm" : "Padlet · Bài trả lời 6 nhóm"}>
    <header className={styles.header}>
      <button type="button" disabled={resetting || switching} onClick={selectedGroup ? () => setSelectedGroup(null) : onBack}><ArrowLeft size={16} />{selectedGroup ? "Tất cả nhóm" : "Khảo sát"}</button>
      <div className={styles.actions}>
        <button type="button" onClick={() => void switchProgram()} disabled={loading || resetting || switching}>{switching ? "Đang kích hoạt…" : `Chương trình ${program === 1 ? 2 : 1}`}</button>
        <button type="button" onClick={() => void resetAnswers()} disabled={loading || resetting || switching}>{resetting ? "Đang reset…" : "Reset"}</button>
        <button type="button" onClick={() => { setMessage(""); void load(); }} disabled={loading || resetting || switching}><RotateCcw size={16} />{loading ? "Đang tải…" : "Làm mới"}</button>
      </div>
    </header>
    {error && <p className={styles.error} role="alert">{error}{loaded ? " Đang hiển thị dữ liệu tải thành công gần nhất." : ""}</p>}
    {message && <p className={styles.message} role="status">{message}</p>}
    <div className={`${styles.list}${selectedGroup ? ` ${styles.single}` : ""}`} aria-busy={loading}>
      {discussionGroups.map((group) => {
        if (selectedGroup && selectedGroup !== group.slug) return null;
        const result = results.find(row => row.slug === group.slug);
        return <article className={styles.card} data-tone={discussionGroups.findIndex(item => item.slug === group.slug) + 1} key={group.slug} tabIndex={0} aria-label={group.name}>
          <header className={styles.groupHeader}><h3>{selectedGroup ? group.name : <button type="button" className={styles.groupButton} onClick={() => setSelectedGroup(group.slug)} aria-label={`Xem riêng ${group.name}`}>{group.name}</button>}</h3></header>
          {(program === 2 ? [{ title: "Những giải pháp cải thiện kỹ năng", text: `Những giải pháp cải thiện kỹ năng ${group.name}` }] : discussionQuestions).map((question, questionIndex) => <section className={styles.answer} key={question.title}>
            <h4 title={question.text}>{program === 2 ? question.title : `CÂU ${questionIndex + 1} · ${question.title}`}</h4>
            <p className={result?.answers?.[questionIndex] ? styles.text : styles.empty}>{result?.answers?.[questionIndex] || (loading ? "Đang tải…" : loaded ? "Chưa có câu trả lời." : "Chưa tải được câu trả lời.")}</p>
          </section>)}
        </article>;
      })}
    </div>
  </section>, document.body);
}
