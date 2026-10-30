"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Download, RotateCcw, Search, Trash2 } from "lucide-react";
import type { SkillsSurveyReport } from "@/lib/skills-survey-reports";
import { formatSurveyScore, SURVEY_SKILLS } from "@/lib/skills-survey-scoring";
import { summarizeSkillDistribution, summarizeSurveyGroups, SURVEY_SCORE_BANDS } from "@/lib/skills-survey-summary";
import "./skills-survey-admin.css";

export default function SkillsSurveyAdminPanel() {
  const [reports, setReports] = useState<SkillsSurveyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const deletingRef = useRef(false);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    if (deletingRef.current) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/skills-survey", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải kết quả khảo sát.");
      if (version === requestVersion.current) { setReports(payload.reports ?? []); setError(""); }
    } catch (reason) { if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "Không thể tải kết quả khảo sát."); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);

  const groups = useMemo(() => Array.from(new Set(reports.map((row) => row.groupName))).sort((a, b) => a.localeCompare(b, "vi")), [reports]);
  const rows = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
    const query = normalize(search.trim());
    return reports.filter((row) => (!group || row.groupName === group) && (!query || normalize(`${row.advisorCode} ${row.advisorName} ${row.groupName}`).includes(query)));
  }, [reports, search, group]);
  const mean = rows.length ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length : null;
  const skillMeans = SURVEY_SKILLS.map((_, index) => rows.length ? rows.reduce((sum, row) => sum + row.skillScores[index], 0) / rows.length : null);
  const groupSummaries = useMemo(() => summarizeSurveyGroups(rows), [rows]);
  const distribution = useMemo(() => summarizeSkillDistribution(rows), [rows]);

  async function deleteAll() {
    if (!window.confirm("Xoá TẤT CẢ kết quả khảo sát của mọi TVV, bao gồm các nhóm ngoài bộ lọc hiện tại? Thao tác này không thể hoàn tác.")) return;
    deletingRef.current = true;
    ++requestVersion.current;
    setDeleting(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/skills-survey", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "delete-all-survey-results" }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể xoá kết quả khảo sát.");
      setReports([]); setGroup(""); setSearch("");
      setMessage(`Đã xoá ${payload.deleted} kết quả khảo sát.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xoá kết quả khảo sát."); }
    finally { deletingRef.current = false; setDeleting(false); setLoading(false); }
    await load();
  }

  async function exportResults() {
    setExporting(true); setError("");
    try {
    const XLSX = await import("xlsx");
    const records = rows.map((row) => ({
      "Mã TVV": row.advisorCode, "Họ tên": row.advisorName, "Ban/Nhóm": row.groupName,
      ...Object.fromEntries(SURVEY_SKILLS.map((skill, index) => [skill.name, row.skillScores[index]])),
      "Tổng điểm": row.total, "Điểm trung bình": row.average,
      "Phân loại": row.classification,
      "Cập nhật lúc": new Date(row.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })
    }));
    const sheet = XLSX.utils.json_to_sheet(records);
    sheet["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 25 }, ...Array.from({ length: 9 }, () => ({ wch: 22 })), { wch: 25 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Theo TVV");
    const groupedSheet = XLSX.utils.json_to_sheet(groupSummaries.map((row) => ({
      "Ban/Nhóm": row.groupName, "TVV hoàn tất": row.count,
      ...Object.fromEntries(SURVEY_SKILLS.map((skill, index) => [skill.name, row.skillScores[index]])),
      "Tổng điểm nhóm": row.total, "Điểm tổng trung bình": row.averageTotal,
      "Điểm trung bình": row.average, "Phân loại": row.classification
    })));
    groupedSheet["!cols"] = [{ wch: 25 }, ...Array.from({ length: 11 }, () => ({ wch: 22 }))];
    for (const target of [sheet, groupedSheet]) {
      for (const [address, cell] of Object.entries(target)) if (!address.startsWith("!") && cell.t === "n") cell.z = Number.isInteger(cell.v) ? "0" : "0.0";
    }
    XLSX.utils.book_append_sheet(book, groupedSheet, "Theo nhom");
    const distributionSheet = XLSX.utils.json_to_sheet(distribution.map((skill) => ({
      "Kỹ năng": skill.name,
      ...Object.fromEntries(SURVEY_SCORE_BANDS.map((band) => [`${band.label} (${band.range})`, skill.counts[band.tone]])),
      "TVV hoàn tất": skill.total
    })));
    distributionSheet["!cols"] = [{ wch: 28 }, ...SURVEY_SCORE_BANDS.map(() => ({ wch: 32 })), { wch: 18 }];
    XLSX.utils.book_append_sheet(book, distributionSheet, "Phan bo ky nang");
    XLSX.writeFile(book, "tong-hop-khao-sat-ky-nang.xlsx");
    } catch { setError("Không thể tải XLSX. Vui lòng thử lại."); }
    finally { setExporting(false); }
  }

  return <article className="admin-card admin-skills-survey">
    <div className="admin-card-title"><BarChart3 /><div><h2>Khảo sát kỹ năng bán hàng</h2><p>Kết quả mới nhất của mỗi TVV · Tự cập nhật sau 30 giây.</p></div></div>
    <div className="admin-skills-survey-toolbar">
      <label><Search size={16} /><input aria-label="Tìm kết quả khảo sát" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã TVV hoặc nhóm" /></label>
      <select aria-label="Lọc nhóm khảo sát" value={group} onChange={(event) => setGroup(event.target.value)}><option value="">Tất cả nhóm</option>{groups.filter(Boolean).map((name) => <option key={name}>{name}</option>)}</select>
      <button type="button" onClick={() => void load()} disabled={loading || deleting}><RotateCcw size={15} />Làm mới</button>
      <button type="button" onClick={() => void exportResults()} disabled={!rows.length || deleting || exporting}><Download size={15} />{exporting ? "Đang tải…" : "Tải XLSX"}</button>
      <button type="button" className="admin-skills-survey-delete" onClick={() => void deleteAll()} disabled={!reports.length || deleting || loading}><Trash2 size={15} />{deleting ? "Đang xoá…" : "Xoá tất cả"}</button>
    </div>
    {error && <p role="alert" className="admin-skills-survey-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="admin-skills-survey-summary"><div><span>TVV hoàn tất</span><strong>{rows.length}</strong></div><div><span>Điểm trung bình</span><strong>{mean === null ? "—" : formatSurveyScore(mean)}</strong></div><div><span>Tổng điểm trung bình</span><strong>{rows.length ? formatSurveyScore(rows.reduce((sum, row) => sum + row.total, 0) / rows.length) : "—"}</strong></div></div>
    <section className="admin-skill-distribution" aria-labelledby="admin-skill-distribution-title">
      <div className="admin-skill-distribution-heading"><div><h3 id="admin-skill-distribution-title">Số lượng TVV theo mức điểm từng kỹ năng</h3><p>{rows.length} TVV{group ? ` · ${group}` : " · Tất cả nhóm"} · Theo bộ lọc hiện tại</p></div></div>
      <div className="admin-skill-distribution-legend">{SURVEY_SCORE_BANDS.map((band) => <span key={band.tone} className={`band-${band.tone}`}><i />{band.label}<small>{band.range}</small></span>)}</div>
      <div className="admin-skill-distribution-grid">{distribution.map((skill, index) => <article className="admin-skill-distribution-card" key={skill.name}>
        <div className="admin-skill-distribution-card-title"><h4><span>{String(index + 1).padStart(2, "0")}</span>{skill.name}</h4><small>{skill.total} TVV</small></div>
        <div className="admin-skill-distribution-bar" role="img" aria-label={`${skill.name}: ${SURVEY_SCORE_BANDS.map((band) => `${band.label} ${skill.counts[band.tone]} TVV`).join(", ")}`}>
          {SURVEY_SCORE_BANDS.map((band) => skill.counts[band.tone] > 0 && <span key={band.tone} className={`band-${band.tone}`} style={{ width: `${skill.total ? skill.counts[band.tone] / skill.total * 100 : 0}%` }} title={`${band.label}: ${skill.counts[band.tone]} TVV`} />)}
        </div>
        <dl>{SURVEY_SCORE_BANDS.map((band) => <div key={band.tone} className={`band-${band.tone}`}><dt><i />{band.label}</dt><dd>{skill.counts[band.tone]}<small>TVV</small></dd></div>)}</dl>
      </article>)}</div>
      {!rows.length && <p className="admin-skills-survey-caption">{loading ? "Đang tải dữ liệu khảo sát…" : "Chưa có kết quả phù hợp để thống kê."}</p>}
    </section>
    <h3>Tổng hợp theo nhóm</h3>
    <p className="admin-skills-survey-caption">Tổng hợp các TVV đang hiển thị theo bộ lọc. Điểm kỹ năng là trung bình của nhóm; tổng điểm nhóm là tổng điểm của các TVV.</p>
    <div className="admin-table-wrap"><table className="admin-skills-survey-table admin-skills-survey-groups"><thead><tr><th>Ban/Nhóm</th><th>TVV hoàn tất</th>{SURVEY_SKILLS.map((skill) => <th key={skill.name}>{skill.name}</th>)}<th>Tổng điểm nhóm</th><th>Điểm tổng TB</th><th>Điểm TB</th><th>Phân loại</th></tr></thead><tbody>
      {groupSummaries.map((row) => <tr key={row.groupName}><td>{row.groupName}</td><td>{row.count}</td>{row.skillScores.map((score, index) => <td key={index}>{formatSurveyScore(score)}</td>)}<td><strong>{row.total}</strong></td><td>{formatSurveyScore(row.averageTotal)}</td><td><strong>{formatSurveyScore(row.average)}</strong></td><td>{row.classification}</td></tr>)}
      {!groupSummaries.length && <tr><td colSpan={12}>{loading ? "Đang tải kết quả…" : "Chưa có dữ liệu nhóm phù hợp."}</td></tr>}
    </tbody></table></div>
    <h3>Chi tiết theo TVV</h3>
    <div className="admin-table-wrap"><table className="admin-skills-survey-table admin-skills-survey-advisors"><thead><tr><th>Mã TVV</th><th>Họ tên</th><th>Ban/Nhóm</th>{SURVEY_SKILLS.map((skill) => <th key={skill.name}>{skill.name}</th>)}<th>Tổng điểm</th><th>Điểm TB</th><th>Phân loại</th><th>Cập nhật</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.advisorCode}><td>{row.advisorCode}</td><td>{row.advisorName}</td><td>{row.groupName || "—"}</td>{row.skillScores.map((score, index) => <td key={index}>{formatSurveyScore(score)}</td>)}<td><strong>{row.total}</strong></td><td><strong>{formatSurveyScore(row.average)}</strong></td><td>{row.classification}</td><td>{new Date(row.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}</td></tr>)}
        {!rows.length && <tr><td colSpan={13}>{loading ? "Đang tải kết quả…" : reports.length ? "Không có TVV phù hợp bộ lọc." : "Chưa có TVV hoàn tất khảo sát."}</td></tr>}
      </tbody>{rows.length > 0 && <tfoot><tr><td colSpan={3}>Trung bình {rows.length} TVV đang hiển thị</td>{skillMeans.map((score, index) => <td key={index}>{score === null ? "—" : formatSurveyScore(score)}</td>)}<td>{formatSurveyScore(rows.reduce((sum, row) => sum + row.total, 0) / rows.length)}</td><td>{formatSurveyScore(mean!)}</td><td colSpan={2} /></tr></tfoot>}
    </table></div>
  </article>;
}
