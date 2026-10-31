"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Send } from "lucide-react";
import { discussionGroups, discussionQuestions } from "@/lib/hoidap";
import styles from "./hoidap.module.css";

type Group = typeof discussionGroups[number];
type Answers = string[];
const blank: Answers = ["", "", ""];

export default function Discussion({ group }: { group?: Group }) {
  const [answers, setAnswers] = useState<Answers>(blank);
  const [program, setProgram] = useState<1 | 2 | null>(null);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/hoidap/state", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setProgram(data.program === 2 ? 2 : 1);
      } catch {
        if (!controller.signal.aborted) setError("Chưa tải được chương trình. Vui lòng kiểm tra kết nối hoặc tải lại trang.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!group || !program) return;
    const controller = new AbortController();
    const key = program === 2 ? `hoidap-draft:2:${group.slug}` : `hoidap-draft:${group.slug}`;
    setReady(false);
    setError("");
    setMessage("");
    setAnswers(program === 2 ? [""] : blank);
    setDraftStatus("");
    const load = async () => {
      try {
        let draft: unknown = null;
        try {
          const raw = localStorage.getItem(key);
          draft = raw ? JSON.parse(raw) : null;
        } catch { /* Still load the saved submission if browser storage is unavailable. */ }
        if (Array.isArray(draft) && draft.length === (program === 2 ? 1 : 3) && draft.every(value => typeof value === "string")) {
          setAnswers(draft as Answers);
          setDraftStatus("Đã khôi phục bản nháp trên thiết bị này.");
          return;
        }
        const response = await fetch(`/api/hoidap?group=${group.slug}&program=${program}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (result.answers) {
          setAnswers(result.answers);
          setMessage("Đã tải bài trả lời của nhóm. Bạn có thể chỉnh sửa và gửi lại.");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Chưa tải được bài trả lời. Vui lòng tải lại trang.");
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    };
    void load();
    return () => controller.abort();
  }, [group, program]);

  function changeAnswer(index: number, value: string) {
    const next = [...answers] as Answers;
    next[index] = value;
    setAnswers(next);
    setMessage("");
    if (!group) return;
    try {
      localStorage.setItem(program === 2 ? `hoidap-draft:2:${group.slug}` : `hoidap-draft:${group.slug}`, JSON.stringify(next));
      setDraftStatus("Bản nháp đã lưu trên thiết bị này. Bấm Gửi bài trả lời để nộp.");
    } catch {
      setDraftStatus("Trình duyệt không lưu được bản nháp. Hãy gửi bài trước khi đóng trang.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group || !program || !ready || saving) return;
    setError("");
    setMessage("");
    if (answers.some(answer => !answer.trim())) {
      setError("Vui lòng nhập đầy đủ câu trả lời trước khi gửi.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/hoidap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: group.slug, program, answers })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa gửi được bài trả lời.");
      setMessage("Đã gửi bài trả lời của nhóm thành công.");
      setDraftStatus("");
      try { localStorage.removeItem(program === 2 ? `hoidap-draft:2:${group.slug}` : `hoidap-draft:${group.slug}`); } catch { /* Submission already saved. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không kết nối được máy chủ. Vui lòng thử gửi lại.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/hoidap/${slug}`);
      setCopied(slug);
      setError("");
    } catch {
      setError("Không sao chép được. Hãy mở nhóm và sao chép đường dẫn trên thanh địa chỉ.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {!group && <Link className={styles.back} href="/"><ArrowLeft size={16} />Trang chủ</Link>}
        <header className={styles.header}>
          <h1>{group ? group.name : "Hỏi đáp theo nhóm"}</h1>
          {!group && <p>Chọn nhóm của bạn để phân tích tình huống và đề xuất cách làm tốt hơn.</p>}
        </header>

        {!group ? <>
          {program === 2 ? <section className={styles.overview}><div><h2>Những giải pháp cải thiện kỹ năng</h2><p>Chọn nhóm để nhập những giải pháp cải thiện kỹ năng của nhóm.</p></div></section> : <section className={styles.overview} aria-label="Ba câu hỏi thảo luận">
            {discussionQuestions.map((question, index) => <div key={question.title}>
              <span className={styles.step}>0{index + 1}</span>
              <h2>{question.title}</h2><p>{question.text}</p>
            </div>)}
          </section>}
          <section aria-labelledby="groups-title">
            <div className={styles.sectionHeading}><h2 id="groups-title">6 nhóm · 6 bước bán hàng</h2><span>Mỗi nhóm một đường link</span></div>
            <div className={styles.groups}>
              {discussionGroups.map((item, index) => <article className={styles.group} key={item.slug}>
                <span className={styles.step}>NHÓM {index + 1}</span>
                <Link href={`/hoidap/${item.slug}`} className={styles.groupLink}><h3>{item.name}</h3><ArrowUpRight size={20} /></Link>
                <div className={styles.groupFooter}><Link href={`/hoidap/${item.slug}`}>Vào trả lời</Link><button type="button" onClick={() => void copyLink(item.slug)}>{copied === item.slug ? <Check size={15} /> : <Copy size={15} />}{copied === item.slug ? "Đã sao chép" : "Sao chép link"}</button></div>
              </article>)}
            </div>
          </section>
          <p className={styles.note}>Link nhóm dùng chung cho các thành viên, không cần đăng nhập. Mỗi nhóm có một bài trả lời; gửi lại sẽ cập nhật bài của nhóm.</p>
          {copied && <p role="status" className={styles.srOnly}>Đã sao chép đường link nhóm.</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </> : <form onSubmit={submit} className={`${styles.form}${program === 2 ? ` ${styles.solutionsForm}` : ""}`}>
          {(program === 2 ? [{ title: "NHỮNG GIẢI PHÁP CẢI THIỆN KỸ NĂNG", text: `Những giải pháp cải thiện kỹ năng ${group.name}` }] : discussionQuestions).map((question, index) => <div className={styles.question} key={question.title}>
            <label htmlFor={`answer-${index}`}><span className={styles.step}>{program === 2 ? "CHƯƠNG TRÌNH 2" : `CÂU ${index + 1} · ${question.title}`}</span><span className={styles.questionText}>{question.text}</span></label>
            <textarea id={`answer-${index}`} value={answers[index] ?? ""} onChange={event => changeAnswer(index, event.target.value)} required maxLength={10000} rows={program === 2 ? 12 : 7} disabled={!ready || saving} placeholder="Nhập câu trả lời của nhóm…" />
          </div>)}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {message && <p role="status" className={styles.success}>{message}</p>}
          <div className={styles.submitRow}><p role="status">{!ready ? "Đang tải bài trả lời…" : draftStatus}</p><button className={styles.submit} disabled={!ready || saving} type="submit"><Send size={16} />{saving ? "Đang gửi…" : "Gửi bài trả lời"}</button></div>
        </form>}
      </div>
    </main>
  );
}
