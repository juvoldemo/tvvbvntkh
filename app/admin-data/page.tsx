"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, CalendarPlus, LogOut, ShieldCheck, Upload, Users } from "lucide-react";

type EventItem = { id: string; title: string; content: string; event_date: string | null; created_at: string };
type UserItem = { id: string; advisor_code: string; full_name: string; start_date: string | null; advisor_status: string | null; advisor_position: string | null; position_effective_date: string | null; birth_day: number | null; birth_month: number | null; is_active: boolean };

export default function AdminDataPage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");

  const loadData = useCallback(async () => {
    const [userResponse, eventResponse] = await Promise.all([
      fetch("/api/admin/access-list", { cache: "no-store" }),
      fetch("/api/events", { cache: "no-store" })
    ]);
    const [userPayload, eventPayload] = await Promise.all([userResponse.json(), eventResponse.json()]);
    if (userResponse.ok) setUsers(userPayload.users ?? []);
    if (eventResponse.ok) setEvents(eventPayload.events ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setAuthenticated(Boolean(payload.authenticated));
        if (payload.authenticated) loadData();
      })
      .finally(() => setReady(true));
  }, [loadData]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error || "Không đăng nhập được.");
    setAuthenticated(true);
    setPassword("");
    loadData();
  }

  async function uploadList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/access-list", { method: "POST", body: new FormData(form) });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? `Đã cập nhật ${payload.count} người được phép truy cập.` : payload.error);
    if (response.ok) {
      form.reset();
      await loadData();
    }
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, eventDate })
    });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Đã tạo thông báo cho người dùng." : payload.error);
    if (response.ok) {
      setTitle("");
      setContent("");
      setEventDate("");
      loadData();
    }
  }

  async function removeEvent(id: string) {
    if (!window.confirm("Xóa thông báo này?")) return;
    const response = await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) loadData();
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
  }

  if (!ready) return <main className="admin-page admin-loading">Đang kiểm tra quyền truy cập…</main>;
  if (!authenticated) {
    return (
      <main className="admin-page admin-login">
        <form className="admin-login-card" onSubmit={login}>
          <ShieldCheck size={42} />
          <h1>Quản trị dữ liệu</h1>
          <p>Nhập mật khẩu quản trị để tiếp tục.</p>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required placeholder="Mật khẩu" />
          {message && <div className="admin-message error">{message}</div>}
          <button disabled={busy}>{busy ? "Đang kiểm tra…" : "Truy cập"}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><span>BVNT Khánh Hòa</span><h1>Quản trị dữ liệu</h1></div>
        <button className="admin-secondary" onClick={logout}><LogOut size={17} /> Đăng xuất</button>
      </header>
      {message && <div className="admin-message">{message}</div>}

      <section className="admin-grid">
        <article className="admin-card">
          <div className="admin-card-title"><Users /><div><h2>Danh sách được truy cập</h2><p>Upload Excel hoặc CSV; tài khoản mới có mật khẩu mặc định 123456.</p></div></div>
          <form onSubmit={uploadList}>
            <label className="admin-file"><Upload /><span>Chọn file dữ liệu TVV theo định dạng APM01</span><input name="file" type="file" accept=".xlsx,.xls,.csv" required /></label>
            <button disabled={busy}>Upload danh sách</button>
          </form>
          <div className="admin-count">{users.filter((user) => user.is_active).length} người đang được cấp quyền</div>
          <div className="admin-table-wrap"><table><thead><tr><th>Mã TVV</th><th>Tên TVV</th><th>Trạng thái</th><th>Chức vụ</th></tr></thead><tbody>
            {users.filter((user) => user.is_active).map((user) => <tr key={user.id}><td>{user.advisor_code}</td><td>{user.full_name}</td><td>{user.advisor_status || "—"}</td><td>{user.advisor_position || "—"}</td></tr>)}
          </tbody></table></div>
        </article>

        <article className="admin-card">
          <div className="admin-card-title"><CalendarPlus /><div><h2>Tạo sự kiện</h2><p>Sự kiện sẽ xuất hiện tại chuông thông báo của mọi người.</p></div></div>
          <form className="admin-event-form" onSubmit={createEvent}>
            <label>Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} /></label>
            <label>Thời gian sự kiện<input type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <label>Nội dung<textarea value={content} onChange={(event) => setContent(event.target.value)} required rows={5} maxLength={1000} /></label>
            <button disabled={busy}><Bell size={17} /> Đăng thông báo</button>
          </form>
          <div className="admin-event-list">
            {events.map((item) => <div key={item.id}><div><b>{item.title}</b><p>{item.content}</p><small>{item.event_date ? new Date(item.event_date).toLocaleString("vi-VN") : "Thông báo chung"}</small></div><button onClick={() => removeEvent(item.id)}>Xóa</button></div>)}
          </div>
        </article>
      </section>
    </main>
  );
}
