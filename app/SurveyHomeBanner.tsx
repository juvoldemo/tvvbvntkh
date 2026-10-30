"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Award, Check, ChevronLeft, ChevronRight, Target, X } from "lucide-react";
import questions from "@/lib/skills-survey-questions.json";
import { evaluateSkillsSurvey, formatSurveyScore } from "@/lib/skills-survey-scoring";
import { canAccessSkillsSurvey } from "@/lib/skills-survey-access";
import "./skills-survey.css";

export default function SurveyHomeBanner({ onOpen, advisorCode }: { onOpen: () => void; advisorCode?: string }) {
  if (!canAccessSkillsSurvey(advisorCode)) return null;
  return (
<button type="button" className="tvv-card survey-home-banner" onClick={onOpen} aria-label="Mở khảo sát kỹ năng bán hàng gồm 24 câu hỏi">
    <Image
      src="/Khảo sát/khảo sát.png"
      alt="Khảo sát kỹ năng — Đánh giá năng lực, phát triển bản thân"
      width={2065}
      height={439}
      sizes="100vw"
    />
  </button>
  );
}

export function SkillsSurveyPage({ active, advisorCode, onBack }: { active: boolean; advisorCode: string; onBack: () => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [view, setView] = useState<"question" | "review" | "complete">("question");
  const [checked, setChecked] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const question = questions[current];
  const answered = Object.keys(answers).length;
  const assessment = evaluateSkillsSurvey(answers);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [saveRetry, setSaveRetry] = useState(0);
  const saveQueue = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  const lastSaved = useRef("");
  const answerSignature = JSON.stringify(answers);
  const currentSignature = useRef(answerSignature);
  currentSignature.current = answerSignature;
  const completeAnswers = Boolean(assessment);

  useEffect(() => {
    if (!completeAnswers || !canAccessSkillsSurvey(advisorCode)) return;
    if (answerSignature === lastSaved.current && pendingSaves.current === 0) {
      setSaveStatus("saved");
      setSaveError("");
      return;
    }
    let disposed = false;
    setSaveStatus("saving");
    setSaveError("");
    const timer = window.setTimeout(() => {
      // Serialize updates so an older response cannot overwrite a newer set of answers.
      pendingSaves.current += 1;
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        try {
          const response = await fetch("/api/skills-survey", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ advisorCode, answers: JSON.parse(answerSignature) }), keepalive: true
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Không thể lưu kết quả khảo sát.");
          lastSaved.current = answerSignature;
          if (!disposed && currentSignature.current === answerSignature) setSaveStatus("saved");
        } catch (error) {
          if (!disposed && currentSignature.current === answerSignature) {
            setSaveStatus("error");
            setSaveError(error instanceof Error ? error.message : "Không thể lưu kết quả khảo sát.");
          }
        } finally {
          pendingSaves.current -= 1;
        }
      });
    }, 400);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [advisorCode, answerSignature, completeAnswers, saveRetry]);

  useEffect(() => {
    const retry = () => setSaveRetry((value) => value + 1);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  useEffect(() => {
    if (!active) return;
    tabsRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    bodyRef.current?.scrollTo({ top: 0 });
  }, [current, active, view]);

  function goTo(index: number) {
    setCurrent(index);
    setView("question");
  }

  function review() {
    setChecked(true);
    setView("review");
  }

  if (!active || !canAccessSkillsSurvey(advisorCode)) return null;

  return <section className="skills-survey-page" aria-labelledby="skills-survey-title">
    <div id="skills-survey-dialog" className="skills-survey">
      <header className="skills-survey-header">
        <button className="skills-survey-close" type="button" onClick={onBack} aria-label="Đóng khảo sát"><X size={30} strokeWidth={1.8} /></button>
        <h2 id="skills-survey-title">{view === "complete" ? "Kết quả khảo sát" : "Khảo sát kỹ năng bán hàng"}</h2>
        <button className="skills-survey-check" type="button" onClick={review}>{view === "complete" ? "Xem lại" : "Kiểm tra"}</button>
      </header>
      {view !== "complete" && <nav aria-label="Chọn câu khảo sát" className="skills-survey-tabs" ref={tabsRef}>
        {questions.map((item, index) => <button type="button" key={item.id} aria-current={view === "question" && current === index ? "step" : undefined} className={`${answers[item.id] !== undefined ? "is-answered" : checked ? "is-unanswered" : ""}`} onClick={() => goTo(index)} aria-label={`Câu ${item.id}, ${answers[item.id] !== undefined ? "đã trả lời" : "chưa trả lời"}`}>Câu {item.id}</button>)}
      </nav>}
      <div className="skills-survey-body" ref={bodyRef}>
        {view === "question" && <>
          <div className="skills-survey-meta"><span>CÂU {question.id} / {questions.length}</span><span>Đã chọn {answered}/{questions.length}</span></div>
          <fieldset className="skills-survey-question" key={question.id}>
            <legend>{question.text}</legend>
            <div className="skills-survey-options">
              {question.options.map((option, index) => <label key={index} className={answers[question.id] === index ? "is-selected" : ""}>
                <input type="radio" name={`skills-question-${question.id}`} value={index} checked={answers[question.id] === index} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: index }))} />
                <span className="skills-survey-radio" aria-hidden="true" />
                <span><b>{String.fromCharCode(65 + index)}.</b> {option}</span>
              </label>)}
            </div>
          </fieldset>
        </>}
        {view === "review" && <section className="skills-survey-review">
          <span className="skills-survey-eyebrow">KIỂM TRA LỰA CHỌN</span>
          <h3>Đã trả lời {answered}/{questions.length} câu</h3>
          <p>{answered === questions.length ? "Bạn đã chọn đủ các câu. Có thể xem lại lựa chọn trước khi hoàn tất." : "Chọn một câu bên dưới để bổ sung hoặc thay đổi câu trả lời."}</p>
          <div className="skills-survey-progress"><span style={{ width: `${answered / questions.length * 100}%` }} /></div>
          <div className="skills-survey-grid">{questions.map((item, index) => <button type="button" className={answers[item.id] !== undefined ? "is-answered" : "is-unanswered"} key={item.id} onClick={() => goTo(index)} aria-label={`Câu ${item.id}: ${answers[item.id] !== undefined ? `đã chọn ${String.fromCharCode(65 + answers[item.id])}` : "chưa trả lời"}`}><span>Câu {item.id}</span><strong>{answers[item.id] !== undefined ? String.fromCharCode(65 + answers[item.id]) : "—"}</strong></button>)}</div>
          <div className="skills-survey-key"><span><i className="answered-dot" />Đã trả lời</span><span><i className="unanswered-dot" />Chưa trả lời</span></div>
          <p className="skills-survey-note">Đây là khảo sát trước đào tạo. Màu sắc thể hiện trạng thái trả lời, không đánh giá đúng/sai.</p>
        </section>}
        {view === "complete" && assessment && <section className="skills-assessment" aria-labelledby="skills-assessment-title">
          <header className="skills-assessment-heading">
            <h3 id="skills-assessment-title">PHIẾU ĐÁNH GIÁ 6 KỸ NĂNG</h3>
            <strong className="skills-assessment-average">{formatSurveyScore(assessment.average)}<span>/10</span></strong>
            <span className={`skills-assessment-rating tone-${assessment.classification.tone}`}>{assessment.classification.label}</span>
          </header>
          <div className="skills-assessment-scores">
            {assessment.skills.map((skill) => <div className={`skills-assessment-row tone-${skill.tone}`} key={skill.name}>
              <div className="skills-assessment-row-heading"><span>{skill.name}</span><strong>{formatSurveyScore(skill.score)}</strong></div>
              <div className="skills-assessment-bar" role="meter" aria-label={skill.name} aria-valuemin={0} aria-valuemax={10} aria-valuenow={skill.score} aria-valuetext={`${formatSurveyScore(skill.score)} trên 10, ${skill.label}`}><span style={{ width: `${skill.score * 10}%` }} /></div>
              <div className="skills-assessment-row-detail"><span>{skill.label}</span></div>
            </div>)}
          </div>
          <div className="skills-assessment-insights">
            {assessment.allEqual && <p className="skills-assessment-equal">Cả 6 kỹ năng có cùng mức điểm. Anh/Chị có thể chọn nội dung muốn phát triển trước.</p>}
            <div className="skills-assessment-insight strength"><Award size={19} aria-hidden="true" /><div><h4>Kỹ năng nổi bật</h4>{assessment.strongest.map((skill) => <div key={skill.name}><p className="skills-assessment-skill-name">{skill.name}</p><p>{skill.strength}</p></div>)}</div></div>
            <div className="skills-assessment-insight priority"><Target size={19} aria-hidden="true" /><div><h4>Kỹ năng cần ưu tiên</h4>{assessment.priorities.map((skill) => <div key={skill.name}><p className="skills-assessment-skill-name">{skill.name}</p><p>{skill.priority}</p></div>)}</div></div>
          </div>

        </section>}
      </div>
      {completeAnswers && (view !== "complete" || saveStatus === "error") && <div className={`skills-survey-save-status ${saveStatus}`} role="status">
        {saveStatus === "saving" ? "Đang lưu kết quả khảo sát…" : saveStatus === "saved" ? "Đã lưu kết quả khảo sát về hệ thống." : saveStatus === "error" ? <>{saveError}<button type="button" onClick={() => setSaveRetry((value) => value + 1)}>Thử lưu lại</button></> : ""}
      </div>}
      {view !== "complete" && <footer className="skills-survey-footer">
        {view === "question" ? <>
          <button className="skills-survey-arrow" type="button" disabled={current === 0} onClick={() => goTo(current - 1)} aria-label="Câu trước"><ChevronLeft size={32} /></button>
          <span aria-live="polite">{question.id} / {questions.length}</span>
          <button className="skills-survey-arrow" type="button" onClick={() => current === questions.length - 1 ? assessment ? setView("complete") : review() : goTo(current + 1)} aria-label={current === questions.length - 1 ? assessment ? "Xem phiếu đánh giá kỹ năng" : "Kiểm tra các câu trả lời" : "Câu tiếp theo"}>{current === questions.length - 1 ? <Check size={28} /> : <ChevronRight size={32} />}</button>
        </> : <>
          <button type="button" className="skills-survey-text-button" onClick={() => goTo(current)}>Quay lại</button>
          <button type="button" className="skills-survey-primary" onClick={() => assessment ? setView("complete") : goTo(questions.findIndex((item) => answers[item.id] === undefined))}>{assessment ? "Xem phiếu đánh giá" : "Trả lời câu còn thiếu"}</button>
        </>}
      </footer>}
    </div>
  </section>;
}
