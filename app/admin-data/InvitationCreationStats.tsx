"use client";

import { useEffect, useState } from "react";
import styles from "./InvitationSettingsPanel.module.css";
import { CalendarDays } from "lucide-react";

type AdvisorCount = { advisorCode: string; fullName: string; count: number };

function displayDate(value: string) { return value.split("-").reverse().join(" "); }
function parseDate(value: string): string | null {
  const match = /^(\d{2}) (\d{2}) (\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className={styles.dateField}>
    <label>{label}<input type="text" inputMode="numeric" placeholder="DD MM YYYY" aria-label={`${label} (DD MM YYYY)`} maxLength={10} required value={value} onChange={event => onChange(event.target.value)} /></label>
    <span className={styles.calendarPicker}><CalendarDays size={16} aria-hidden="true" /><input type="date" aria-label={`Chọn ${label.toLowerCase()} trên lịch`} value={parseDate(value) || ""} onChange={event => { if (event.target.value) onChange(displayDate(event.target.value)); }} /></span>
  </div>;
}

export default function InvitationCreationStats() {
  const [rows, setRows] = useState<AdvisorCount[] | null>(null);
  const [error, setError] = useState("");
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [from, setFrom] = useState(() => displayDate(today));
  const [to, setTo] = useState(() => displayDate(today));
  const [request, setRequest] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!request) return;
    let disposed = false;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const params = new URLSearchParams({ period: "day", invitations: "range", from: request!.from, to: request!.to });
        const response = await fetch(`/api/analytics?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Không tải được thống kê thư mời.");
        const data = await response.json();
        if (!Array.isArray(data.invitationRanking)) throw new Error("Dữ liệu thống kê không hợp lệ.");
        if (!disposed) {
          setRows(data.invitationRanking.filter((row: AdvisorCount) => row.count > 0)
            .sort((a: AdvisorCount, b: AdvisorCount) => b.count - a.count || a.advisorCode.localeCompare(b.advisorCode, "vi")));
          setError("");
        }
      } catch {
        if (!disposed) setError("Không tải được thống kê thư mời. Vui lòng thử lại.");
      } finally { pending = false; if (!disposed) setLoading(false); }
    }
    void refresh();
    return () => { disposed = true; controller.abort(); };
  }, [request]);

  return <section className="admin-card" aria-labelledby="invitation-creation-stats-title">
    <header className="invitation-settings-header">
      <div><h2 id="invitation-creation-stats-title">Thống kê thư đã tạo</h2>
        <p>Theo TVV · Giờ Việt Nam</p></div>
    </header>
    <form className={styles.dateFilter} onSubmit={event => {
      event.preventDefault();
      const start = parseDate(from), end = parseDate(to);
      if (!start || !end || start > end) { setError("Nhập ngày theo DD MM YYYY; ngày bắt đầu không được sau ngày kết thúc."); return; }
      setError(""); setLoading(true); setRequest({ from: start, to: end });
    }}>
      <DateField label="Từ ngày" value={from} onChange={setFrom} />
      <DateField label="Đến ngày" value={to} onChange={setTo} />
      <button type="submit" disabled={loading}>{loading ? "Đang tải..." : "Làm mới"}</button>
    </form>
    {error && <p role="alert">{error}{rows !== null && " Đang hiển thị số liệu tải thành công gần nhất."}</p>}
    {rows === null ? <p role="status">{error ? "Chưa có số liệu để hiển thị." : loading ? "Đang tải thống kê..." : "Chọn khoảng ngày và bấm Làm mới để xem thống kê."}</p> : <>
      <p className="admin-count"><strong>{rows.length.toLocaleString("vi-VN")}</strong> TVV đã tạo · <strong>{rows.reduce((sum, row) => sum + row.count, 0).toLocaleString("vi-VN")}</strong> thư</p>
      <div className="admin-table-wrap"><table>
        <thead><tr><th scope="col">Mã TVV</th><th scope="col">Họ tên TVV</th><th scope="col">Số thư đã tạo</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.advisorCode}><td><b>{row.advisorCode}</b></td><td>{row.fullName}</td><td><strong>{row.count.toLocaleString("vi-VN")}</strong></td></tr>)}
          {!rows.length && <tr><td colSpan={3}>Không có TVV tạo thư trong khoảng ngày đã chọn.</td></tr>}
        </tbody>
      </table></div>
    </>}
  </section>;
}
