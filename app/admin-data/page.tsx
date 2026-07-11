"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart3, Bell, BookOpen, CalendarPlus, Download, FileText, HelpCircle, LogOut, Plus, Save, ShieldCheck, Sparkles, Target, Trash2, Upload, Users } from "lucide-react";

type EventItem = { id: string; title: string; content: string; event_date: string | null; created_at: string };
type UserItem = { id: string; advisor_code: string; full_name: string; start_date: string | null; advisor_status: string | null; advisor_position: string | null; position_effective_date: string | null; birth_day: number | null; birth_month: number | null; password_plain: string | null; is_active: boolean };
type AdminTab = "events" | "data" | "targets" | "archive" | "access";
type AdminRewardAudience = "tvv" | "leaders";
type AdminRewardPeriod = "month" | "quarter";
type RewardParticipant = { code: string; name: string; groupName?: string; contractCount: number; ip: number; fyp: number; fyc: number; reward: number; detail: string };
type RewardProgram = { id: string; name: string; period: string; totalReward: number; achievedCount: number; participants: RewardParticipant[] };
type AdminRewardData = { month: string; period: AdminRewardPeriod; tvv: RewardProgram[]; leaders: RewardProgram[] };
type TargetRegistration = { id: string; target_month: string; leader_name: string | null; group_name: string; revenue_target: number; active_advisor_target: number; reward_target: number; selected_advisors: Array<{ advisor_code?: string; agentCode?: string; full_name?: string; agentName?: string; revenue_target?: number; revenueTarget?: number }>; updated_at: string };
type ArchiveTab = "forms" | "guides" | "faq";
type ArchiveDocument = { id: string; title: string; file?: string; size?: string };
type ArchiveFolder = { id: string; title: string; items: ArchiveDocument[] };
type ArchiveForms = { folders: ArchiveFolder[] };
type ArchiveGuide = { id: string; category?: string; title: string; description?: string; summary?: string; type?: "pdf" | "youtube"; pdfUrl?: string; pageCount?: number; youtubeUrl?: string; youtubeId?: string; isActive?: boolean; order?: number; createdAt?: string };
type ArchiveFaq = { id: string; question: string; answer: string };

export default function AdminDataPage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [accessUnlocked, setAccessUnlocked] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("events");
  const [rewardData, setRewardData] = useState<AdminRewardData | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardAudience, setRewardAudience] = useState<AdminRewardAudience>("tvv");
  const [rewardPeriod, setRewardPeriod] = useState<AdminRewardPeriod>("month");
  const [rewardMonth, setRewardMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetRegistrations, setTargetRegistrations] = useState<TargetRegistration[]>([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [archiveForms, setArchiveForms] = useState<ArchiveForms>({ folders: [] });
  const [archiveGuides, setArchiveGuides] = useState<ArchiveGuide[]>([]);
  const [archiveFaq, setArchiveFaq] = useState<ArchiveFaq[]>([]);

  const loadData = useCallback(async () => {
    const [eventResponse, formsResponse, guidesResponse, faqResponse] = await Promise.all([
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=forms", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=guides", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=faq", { cache: "no-store" })
    ]);
    const [eventPayload, formsPayload, guidesPayload, faqPayload] = await Promise.all([
      eventResponse.json(),
      formsResponse.json(),
      guidesResponse.json(),
      faqResponse.json()
    ]);
    if (eventResponse.ok) setEvents(eventPayload.events ?? []);
    if (formsResponse.ok) setArchiveForms(formsPayload ?? { folders: [] });
    if (guidesResponse.ok) setArchiveGuides(guidesPayload ?? []);
    if (faqResponse.ok) setArchiveFaq(faqPayload ?? []);
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/access-list", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Không tải được danh sách truy cập.");
    setUsers(payload.users ?? []);
  }, []);

  async function unlockAccess(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAccessError("");
    const response = await fetch("/api/admin/access-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: accessPassword }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      setAccessError(payload.error || "Không thể xác thực mật khẩu.");
      return;
    }
    try {
      await loadUsers();
      setAccessUnlocked(true);
      setAccessPassword("");
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Không tải được danh sách truy cập.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setAuthenticated(Boolean(payload.authenticated));
        if (payload.authenticated) loadData();
      })
      .finally(() => setReady(true));
  }, [loadData]);

  const loadRewardData = useCallback(async () => {
    setRewardLoading(true);
    try {
      const params = new URLSearchParams({ month: rewardMonth, period: rewardPeriod });
      const response = await fetch(`/api/admin/reward-data?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được dữ liệu thưởng.");
      setRewardData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu thưởng.");
    } finally {
      setRewardLoading(false);
    }
  }, [rewardMonth, rewardPeriod]);

  useEffect(() => {
    if (authenticated && activeTab === "data") loadRewardData();
  }, [activeTab, authenticated, loadRewardData]);

  const loadTargetRegistrations = useCallback(async () => {
    setTargetLoading(true);
    try {
      const response = await fetch(`/api/admin/team-target-registrations?month=${targetMonth}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được đăng ký mục tiêu.");
      setTargetRegistrations(payload.registrations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được đăng ký mục tiêu.");
    } finally {
      setTargetLoading(false);
    }
  }, [targetMonth]);

  useEffect(() => {
    if (authenticated && activeTab === "targets") loadTargetRegistrations();
  }, [activeTab, authenticated, loadTargetRegistrations]);

  async function removeTargetRegistration(id: string, groupName: string) {
    if (!window.confirm(`Xóa đăng ký mục tiêu của nhóm ${groupName}?`)) return;
    setMessage("");
    const response = await fetch(`/api/admin/team-target-registrations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Không xóa được đăng ký mục tiêu.");
      return;
    }
    setMessage("Đã xóa đăng ký mục tiêu.");
    await loadTargetRegistrations();
  }

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
      await loadUsers();
    }
  }

  async function randomizeAccessPasswords() {
    if (!window.confirm("Tạo mật khẩu random mới cho tất cả TVV đang được cấp quyền? Mật khẩu cũ sẽ không dùng để đăng nhập nữa.")) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/access-list", { method: "PUT" });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload.error || "Không tạo được mật khẩu random.");
    setMessage(`Đã tạo mật khẩu random mới cho ${payload.count} TVV.`);
    await loadUsers();
  }

  async function exportAccessList() {
    const activeUsers = users
      .filter((user) => user.is_active)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
    if (activeUsers.length === 0) return;

    try {
      const XLSX = await import("xlsx");
      const rows = activeUsers.map((user) => ({
        "Tên TVV": user.full_name,
        "Mã TVV": user.advisor_code,
        "Mật khẩu": user.password_plain || "Chưa tạo"
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: ["Tên TVV", "Mã TVV", "Mật khẩu"] });
      worksheet["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 22 }];
      worksheet["!autofilter"] = { ref: `A1:C${rows.length + 1}` };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tài khoản TVV");
      const exportDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `danh-sach-tai-khoan-tvv-${exportDate}.xlsx`);
      setMessage(`Đã xuất thông tin đăng nhập của ${activeUsers.length} TVV.`);
    } catch {
      setMessage("Không xuất được danh sách Excel. Vui lòng thử lại.");
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

      <nav className="admin-main-tabs" aria-label="Quản trị dữ liệu">
        <button type="button" className={activeTab === "events" ? "active" : ""} onClick={() => setActiveTab("events")}><CalendarPlus size={17} />Tạo sự kiện</button>
        <button type="button" className={activeTab === "data" ? "active" : ""} onClick={() => setActiveTab("data")}><BarChart3 size={17} />Dữ liệu</button>
        <button type="button" className={activeTab === "targets" ? "active" : ""} onClick={() => setActiveTab("targets")}><Target size={17} />Mục tiêu</button>
        <button type="button" className={activeTab === "archive" ? "active" : ""} onClick={() => setActiveTab("archive")}><BookOpen size={17} />Kho tài liệu</button>
        <button type="button" className={activeTab === "access" ? "active" : ""} onClick={() => { setActiveTab("access"); setAccessError(""); }}><Users size={17} />Danh sách truy cập</button>
      </nav>

      <section className="admin-panel-area">
        {activeTab === "access" && !accessUnlocked && <article className="admin-card admin-access-lock">
          <div className="admin-card-title"><ShieldCheck /><div><h2>Xác thực Danh sách truy cập</h2><p>Nhập mật khẩu riêng để mở nội dung của tab này.</p></div></div>
          <form onSubmit={unlockAccess}>
            <label>Mật khẩu<input type="password" value={accessPassword} onChange={(event) => { setAccessPassword(event.target.value); setAccessError(""); }} autoFocus autoComplete="current-password" required placeholder="Nhập mật khẩu" /></label>
            {accessError && <div className="admin-message error">{accessError}</div>}
            <button disabled={busy || !accessPassword}>{busy ? "Đang kiểm tra…" : "Mở danh sách truy cập"}</button>
          </form>
        </article>}

        {activeTab === "access" && accessUnlocked && <article className="admin-card">
          <div className="admin-card-title"><Users /><div><h2>Danh sách được truy cập</h2><p>Upload Excel hoặc CSV; tài khoản mới có mật khẩu random gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p></div></div>
          <form onSubmit={uploadList}>
            <label className="admin-file"><Upload /><span>Chọn file dữ liệu TVV theo định dạng APM01</span><input name="file" type="file" accept=".xlsx,.xls,.csv" required /></label>
            <button disabled={busy}>Upload danh sách</button>
          </form>
          <div className="admin-access-actions">
            <button type="button" className="admin-secondary" disabled={busy || users.filter((user) => user.is_active).length === 0} onClick={randomizeAccessPasswords}>Tạo mật khẩu random cho tất cả TVV</button>
            <button type="button" className="admin-secondary" disabled={busy || users.filter((user) => user.is_active).length === 0} onClick={exportAccessList}><Download size={17} />Xuất danh sách Excel</button>
          </div>
          <div className="admin-count">{users.filter((user) => user.is_active).length} người đang được cấp quyền</div>
          <div className="admin-table-wrap"><table><thead><tr><th>Mã TVV</th><th>Tên TVV</th><th>Mật khẩu hiện tại</th><th>Trạng thái</th><th>Chức vụ</th></tr></thead><tbody>
            {users.filter((user) => user.is_active).map((user) => <tr key={user.id}><td>{user.advisor_code}</td><td>{user.full_name}</td><td><code className="admin-password-code">{user.password_plain || "Chưa tạo"}</code></td><td>{user.advisor_status || "—"}</td><td>{user.advisor_position || "—"}</td></tr>)}
          </tbody></table></div>
        </article>}

        {activeTab === "events" && <article className="admin-card">
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
        </article>}

        {activeTab === "data" && <AdminDataSummary data={rewardData} loading={rewardLoading} audience={rewardAudience} period={rewardPeriod} selectedMonth={rewardMonth} setAudience={setRewardAudience} setPeriod={setRewardPeriod} setSelectedMonth={setRewardMonth} onReload={loadRewardData} />}

        {activeTab === "targets" && <AdminTargetSummary month={targetMonth} setMonth={setTargetMonth} registrations={targetRegistrations} loading={targetLoading} onReload={loadTargetRegistrations} onDelete={removeTargetRegistration} />}

        {activeTab === "archive" && <ArchiveAdminPanel
          forms={archiveForms}
          guides={archiveGuides}
          faq={archiveFaq}
          setForms={setArchiveForms}
          setGuides={setArchiveGuides}
          setFaq={setArchiveFaq}
          onSaved={loadData}
          setMessage={setMessage}
        />}
      </section>
    </main>
  );
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} đ`;
}

function recentMonths(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - index, 1));
    const value = date.toISOString().slice(0, 7);
    return { value, label: `Tháng ${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}` };
  });
}

function recentQuarters(count = 8) {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  return Array.from({ length: count }, (_, index) => {
    const quarterIndex = currentQuarter - index;
    const year = now.getFullYear() + Math.floor(quarterIndex / 4);
    const quarter = ((quarterIndex % 4) + 4) % 4 + 1;
    const endMonth = quarter * 3;
    const value = `${year}-${String(endMonth).padStart(2, "0")}`;
    return { value, label: `Quý ${quarter}/${year}` };
  });
}

function AdminDataSummary({ data, loading, audience, period, selectedMonth, setAudience, setPeriod, setSelectedMonth, onReload }: {
  data: AdminRewardData | null;
  loading: boolean;
  audience: AdminRewardAudience;
  period: AdminRewardPeriod;
  selectedMonth: string;
  setAudience: (value: AdminRewardAudience) => void;
  setPeriod: (value: AdminRewardPeriod) => void;
  setSelectedMonth: (value: string) => void;
  onReload: () => void;
}) {
  const programs = audience === "tvv" ? data?.tvv ?? [] : data?.leaders ?? [];
  const periodOptions = period === "month" ? recentMonths() : recentQuarters();

  return (
    <article className="admin-card admin-data-card">
      <div className="admin-card-title"><BarChart3 /><div><h2>Dữ liệu</h2><p>Tổng hợp dữ liệu thưởng tháng, quý, tháng 13 và Sao Việt của từng nhóm, từng TVV.</p></div></div>
      <div className="admin-data-actions">
        <button type="button" className={audience === "tvv" ? "active" : ""} onClick={() => setAudience("tvv")}><Users size={17} />TVV</button>
        <button type="button" className={audience === "leaders" ? "active" : ""} onClick={() => setAudience("leaders")}><BarChart3 size={17} />Trưởng nhóm</button>
        <button type="button" onClick={onReload} disabled={loading}><Sparkles size={17} />{loading ? "Đang tải..." : "Tải lại"}</button>
      </div>

      <div className="admin-period-controls">
        <div className="admin-period-modes">
          <button type="button" className={period === "month" ? "active" : ""} onClick={() => { setPeriod("month"); setSelectedMonth(recentMonths(1)[0].value); }}>Theo tháng</button>
          <button type="button" className={period === "quarter" ? "active" : ""} onClick={() => { setPeriod("quarter"); setSelectedMonth(recentQuarters(1)[0].value); }}>Theo quý</button>
        </div>
        <div className="admin-period-list">
          {periodOptions.map((item) => (
            <button type="button" key={`${period}-${item.value}`} className={selectedMonth === item.value ? "active" : ""} onClick={() => setSelectedMonth(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-data-overview">
        <div><strong>{programs.length}</strong><span>chương trình/dữ liệu đang hiển thị</span></div>
        <div><strong>{formatMoney(programs.reduce((sum, item) => sum + item.totalReward, 0))}</strong><span>tổng thưởng đã đạt</span></div>
      </div>

      {loading && <div className="admin-data-empty">Đang tải dữ liệu thưởng...</div>}
      {!loading && programs.length === 0 && <div className="admin-data-empty">Chưa có dữ liệu đạt cho nhóm đối tượng này.</div>}
      {!loading && programs.map((program) => (
        <section className="admin-reward-program" key={program.id}>
          <div className="admin-reward-heading">
            <div>
              <h3>{program.name}</h3>
              <p>{program.period || "Chưa có kỳ xét"} · {program.achievedCount} đối tượng đạt</p>
            </div>
            <strong>{formatMoney(program.totalReward)}</strong>
          </div>
          <div className="admin-table-wrap admin-reward-table">
            <table>
              <thead><tr><th>Đối tượng</th><th>Nhóm</th><th>HĐ</th><th>IP</th><th>FYP/AFYP</th><th>FYC</th><th>Đạt thưởng</th><th>Chi tiết</th></tr></thead>
              <tbody>
                {program.participants.length === 0 && <tr><td colSpan={8}>Chưa có đối tượng đạt trong kỳ này.</td></tr>}
                {program.participants.map((item, index) => (
                  <tr key={`${program.id}-${item.code || item.name}-${index}`}>
                    <td><b>{item.name || item.code || "Chưa có tên"}</b>{item.code && <small>{item.code}</small>}</td>
                    <td>{item.groupName || "—"}</td>
                    <td>{item.contractCount || 0}</td>
                    <td>{formatMoney(item.ip)}</td>
                    <td>{formatMoney(item.fyp)}</td>
                    <td>{formatMoney(item.fyc)}</td>
                    <td><b>{formatMoney(item.reward)}</b></td>
                    <td>{item.detail || "Đạt điều kiện"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </article>
  );
}

function AdminTargetSummary({ month, setMonth, registrations, loading, onReload, onDelete }: {
  month: string;
  setMonth: (value: string) => void;
  registrations: TargetRegistration[];
  loading: boolean;
  onReload: () => void;
  onDelete: (id: string, groupName: string) => void;
}) {
  const [view, setView] = useState<"overview" | "detail">("overview");
  const totals = registrations.reduce((sum, item) => ({
    revenue: sum.revenue + Number(item.revenue_target || 0),
    active: sum.active + Number(item.active_advisor_target || 0),
    reward: sum.reward + Number(item.reward_target || 0),
    advisors: sum.advisors + (Array.isArray(item.selected_advisors) ? item.selected_advisors.length : 0)
  }), { revenue: 0, active: 0, reward: 0, advisors: 0 });
  const sortedRegistrations = [...registrations].sort((a, b) => Number(b.revenue_target || 0) - Number(a.revenue_target || 0));
  const shortName = (value?: string) => {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts.at(-1) || value || "TVV" : "TVV";
  };

  return (
    <article className="admin-card admin-target-card">
      <div className="admin-card-title"><Target /><div><h2>Đăng ký mục tiêu</h2><p>Theo dõi mục tiêu từng nhóm và doanh thu trưởng nhóm đăng ký cho từng TVV cụ thể.</p></div></div>
      <div className="admin-target-toolbar">
        <label>Tháng<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <button type="button" disabled={loading} onClick={onReload}>{loading ? "Đang tải..." : "Tải dữ liệu"}</button>
      </div>
      <div className="admin-data-overview admin-target-overview">
        <div><strong>{registrations.length}</strong><span>nhóm đã đăng ký</span></div>
        <div><strong>{formatMoney(totals.revenue)}</strong><span>tổng doanh thu mục tiêu</span></div>
        <div><strong>{totals.advisors}</strong><span>TVV được đăng ký mục tiêu</span></div>
        <div><strong>{totals.active}</strong><span>lượt hoạt động mục tiêu</span></div>
        <div><strong>{formatMoney(totals.reward)}</strong><span>tổng tiền thưởng mục tiêu</span></div>
        <div><strong>{formatMoney(totals.advisors ? totals.revenue / totals.advisors : 0)}</strong><span>doanh thu mục tiêu bình quân/TVV</span></div>
      </div>
      <div className="admin-target-view-tabs" role="tablist" aria-label="Chọn kiểu xem mục tiêu">
        <button type="button" role="tab" aria-selected={view === "overview"} className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><BarChart3 size={16} />Tổng quát</button>
        <button type="button" role="tab" aria-selected={view === "detail"} className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}><Users size={16} />Chi tiết TVV</button>
      </div>
      <div className="admin-target-list">
        {registrations.length === 0 && <p className="admin-data-empty">{loading ? "Đang tải dữ liệu..." : "Chưa có nhóm đăng ký mục tiêu tháng này."}</p>}
        {view === "overview" && sortedRegistrations.map((item) => {
          const advisors = [...(item.selected_advisors ?? [])];
          return (
            <section className="admin-target-summary-row" key={item.id}>
              <div className="admin-target-summary-main">
                <span>Nhóm</span>
                <h3>{item.group_name}</h3>
                <p>{item.leader_name || "Chưa có tên trưởng nhóm"}</p>
              </div>
              <div className="admin-target-summary-metric"><span>Doanh thu đăng ký</span><strong>{formatMoney(item.revenue_target)}</strong></div>
              <div className="admin-target-summary-metric"><span>TVV hoạt động</span><strong>{item.active_advisor_target}</strong></div>
              <div className="admin-target-summary-advisors">
                <span>Gồm TVV</span>
                <p>{advisors.map((advisor) => shortName(advisor.full_name || advisor.agentName)).join(", ") || "—"}</p>
              </div>
            </section>
          );
        })}
        {view === "detail" && sortedRegistrations.map((item) => {
          const advisors = [...(item.selected_advisors ?? [])].sort((a, b) => Number(b.revenue_target ?? b.revenueTarget ?? 0) - Number(a.revenue_target ?? a.revenueTarget ?? 0));
          return (
            <section className="admin-target-group" key={item.id}>
              <header className="admin-target-group-head">
                <div>
                  <span>Nhóm</span>
                  <h3>{item.group_name}</h3>
                  <p>Trưởng nhóm: <b>{item.leader_name || "—"}</b></p>
                </div>
                <button className="admin-danger admin-row-action" type="button" onClick={() => onDelete(item.id, item.group_name)}><Trash2 size={14} />Xóa</button>
              </header>
              <div className="admin-target-group-metrics">
                <div><span>Doanh thu nhóm</span><strong>{formatMoney(item.revenue_target)}</strong></div>
                <div><span>TVV đăng ký</span><strong>{advisors.length}</strong></div>
                <div><span>Lượt HĐ</span><strong>{item.active_advisor_target}</strong></div>
                <div><span>Tiền thưởng</span><strong>{formatMoney(item.reward_target)}</strong></div>
              </div>
              <div className="admin-target-advisors">
                <div className="admin-target-advisors-head"><strong>Doanh thu đăng ký từng TVV</strong><span>Cập nhật {item.updated_at ? new Date(item.updated_at).toLocaleString("vi-VN") : "—"}</span></div>
                <div className="admin-target-advisor-table">
                  <table>
                    <thead><tr><th>TVV</th><th>Mã TVV</th><th>Doanh thu đăng ký</th><th>Tỷ trọng nhóm</th></tr></thead>
                    <tbody>
                      {advisors.length === 0 && <tr><td colSpan={4}>Chưa có TVV trong đăng ký này.</td></tr>}
                      {advisors.map((advisor, index) => {
                        const advisorTarget = Number(advisor.revenue_target ?? advisor.revenueTarget ?? 0);
                        const advisorName = advisor.full_name || advisor.agentName || "TVV";
                        const advisorCode = advisor.advisor_code || advisor.agentCode || "—";
                        const share = Number(item.revenue_target || 0) > 0 ? Math.round((advisorTarget / Number(item.revenue_target || 0)) * 100) : 0;
                        return (
                          <tr key={`${advisorCode}-${advisorName}-${index}`}>
                            <td><b>{advisorName}</b></td>
                            <td>{advisorCode}</td>
                            <td><strong>{formatMoney(advisorTarget)}</strong></td>
                            <td><span className="admin-target-share"><i style={{ width: `${Math.min(100, share)}%` }} />{share}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function emptyArchiveDocument(): ArchiveDocument {
  return { id: `mau-${Date.now()}`, title: "Mẫu mới.pdf", file: "", size: "" };
}

function emptyArchiveGuide(order: number): ArchiveGuide {
  return {
    id: `huong-dan-${Date.now()}`,
    category: "Hướng dẫn",
    title: "",
    description: "",
    summary: "",
    type: "pdf",
    pdfUrl: "",
    pageCount: 0,
    youtubeUrl: "",
    youtubeId: "",
    isActive: true,
    order,
    createdAt: todayText()
  };
}

function extractYoutubeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] ?? "";
}

function ArchiveAdminPanel({ forms, guides, faq, setForms, setGuides, setFaq, onSaved, setMessage }: {
  forms: ArchiveForms;
  guides: ArchiveGuide[];
  faq: ArchiveFaq[];
  setForms: (value: ArchiveForms) => void;
  setGuides: (value: ArchiveGuide[]) => void;
  setFaq: (value: ArchiveFaq[]) => void;
  onSaved: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [tab, setTab] = useState<ArchiveTab>("forms");
  const [saving, setSaving] = useState(false);

  async function saveArchive(key: ArchiveTab) {
    const value = key === "forms" ? forms : key === "guides" ? guides : faq;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/archive/content?key=${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value)
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(response.ok ? "Đã lưu Kho tài liệu." : payload.error || "Không thể lưu Kho tài liệu.");
    if (response.ok) await onSaved();
  }

  return (
    <article className="admin-card admin-archive-card">
      <div className="admin-card-title"><BookOpen /><div><h2>Kho tài liệu</h2><p>Thêm mẫu biểu, hướng dẫn và FAQ hiển thị trong web.</p></div></div>
      <div className="admin-archive-tabs">
        <button type="button" className={tab === "forms" ? "active" : ""} onClick={() => setTab("forms")}><FileText size={16} />Mẫu biểu</button>
        <button type="button" className={tab === "guides" ? "active" : ""} onClick={() => setTab("guides")}><BookOpen size={16} />Hướng dẫn</button>
        <button type="button" className={tab === "faq" ? "active" : ""} onClick={() => setTab("faq")}><HelpCircle size={16} />FAQ</button>
      </div>

      {tab === "forms" && <ArchiveFormsEditor forms={forms} setForms={setForms} />}
      {tab === "guides" && <ArchiveGuidesEditor guides={guides} setGuides={setGuides} />}
      {tab === "faq" && <ArchiveFaqEditor faq={faq} setFaq={setFaq} />}

      <button type="button" disabled={saving} onClick={() => saveArchive(tab)}><Save size={17} />{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
    </article>
  );
}

function ArchiveFormsEditor({ forms, setForms }: { forms: ArchiveForms; setForms: (value: ArchiveForms) => void }) {
  const [uploadingId, setUploadingId] = useState("");

  const updateFolder = (folderIndex: number, folder: ArchiveFolder) => {
    setForms({ folders: forms.folders.map((item, index) => (index === folderIndex ? folder : item)) });
  };

  async function uploadPdf(folderIndex: number, itemIndex: number, file?: File | null) {
    if (!file) return;
    const item = forms.folders[folderIndex].items[itemIndex];
    setUploadingId(item.id);
    try {
      const formData = new FormData();
      formData.append("kind", "forms");
      formData.append("file", file);
      const response = await fetch("/api/admin/archive/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể upload PDF.");
      const folder = forms.folders[folderIndex];
      updateFolder(folderIndex, {
        ...folder,
        items: folder.items.map((entry, index) => index === itemIndex ? { ...entry, title: file.name, file: result.file, size: result.size } : entry)
      });
    } finally {
      setUploadingId("");
    }
  }

  return <section className="admin-archive-editor">
    <button type="button" className="admin-secondary" onClick={() => setForms({ folders: [...forms.folders, { id: `danh-muc-${Date.now()}`, title: "Danh mục mới", items: [emptyArchiveDocument()] }] })}><Plus size={16} />Thêm danh mục</button>
    {forms.folders.map((folder, folderIndex) => <div className="admin-archive-group" key={folder.id}>
      <label>Tên danh mục<input value={folder.title} onChange={(event) => updateFolder(folderIndex, { ...folder, title: event.target.value })} /></label>
      {folder.items.map((item, itemIndex) => <div className="admin-archive-mini" key={item.id}>
        <input value={item.title} onChange={(event) => updateFolder(folderIndex, { ...folder, items: folder.items.map((entry, index) => index === itemIndex ? { ...entry, title: event.target.value } : entry) })} placeholder="Tên mẫu biểu" />
        <label className="admin-archive-upload"><Upload size={15} />{uploadingId === item.id ? "Đang upload..." : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" onChange={(event) => uploadPdf(folderIndex, itemIndex, event.target.files?.[0])} /></label>
        <input value={item.file ?? ""} onChange={(event) => updateFolder(folderIndex, { ...folder, items: folder.items.map((entry, index) => index === itemIndex ? { ...entry, file: event.target.value } : entry) })} placeholder="/pdfs/file.pdf" />
        <span>{item.size || "Chưa có file"}</span>
        <button type="button" className="admin-danger" onClick={() => updateFolder(folderIndex, { ...folder, items: folder.items.filter((_, index) => index !== itemIndex) })}><Trash2 size={15} />Xóa mẫu</button>
      </div>)}
      <div className="admin-archive-actions">
        <button type="button" className="admin-secondary" onClick={() => updateFolder(folderIndex, { ...folder, items: [...folder.items, emptyArchiveDocument()] })}><Plus size={15} />Thêm mẫu</button>
        <button type="button" className="admin-danger" onClick={() => setForms({ folders: forms.folders.filter((_, index) => index !== folderIndex) })}><Trash2 size={15} />Xóa danh mục</button>
      </div>
    </div>)}
  </section>;
}

function ArchiveGuidesEditor({ guides, setGuides }: { guides: ArchiveGuide[]; setGuides: (value: ArchiveGuide[]) => void }) {
  const [uploadingId, setUploadingId] = useState("");
  const updateGuide = (index: number, guide: ArchiveGuide) => setGuides(guides.map((item, i) => i === index ? guide : item));

  async function uploadPdf(index: number, file?: File | null) {
    if (!file) return;
    const guide = guides[index];
    setUploadingId(guide.id);
    try {
      const formData = new FormData();
      formData.append("kind", "guides");
      formData.append("file", file);
      const response = await fetch("/api/admin/archive/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể upload PDF.");
      updateGuide(index, { ...guide, title: guide.title || file.name.replace(/\.pdf$/i, ""), type: "pdf", pdfUrl: result.pdfUrl, youtubeUrl: "", youtubeId: "", isActive: guide.isActive !== false });
    } finally {
      setUploadingId("");
    }
  }

  return <section className="admin-archive-editor">
    <button type="button" className="admin-secondary" onClick={() => setGuides([...guides, emptyArchiveGuide(guides.length + 1)])}><Plus size={16} />Thêm hướng dẫn</button>
    {guides.map((guide, index) => {
      const type = guide.type ?? (guide.youtubeId ? "youtube" : "pdf");
      return <div className="admin-archive-group" key={guide.id}>
        <label>Tiêu đề<input value={guide.title} onChange={(event) => updateGuide(index, { ...guide, title: event.target.value })} /></label>
        <label>Mô tả<textarea value={guide.description ?? guide.summary ?? ""} onChange={(event) => updateGuide(index, { ...guide, description: event.target.value, summary: event.target.value })} rows={2} /></label>
        <div className="admin-archive-two">
          <label>Loại<select value={type} onChange={(event) => updateGuide(index, { ...guide, type: event.target.value as "pdf" | "youtube" })}><option value="pdf">PDF</option><option value="youtube">YouTube</option></select></label>
          <label>Thứ tự<input type="number" value={guide.order ?? index + 1} onChange={(event) => updateGuide(index, { ...guide, order: Number(event.target.value) || index + 1 })} /></label>
        </div>
        {type === "pdf" ? <>
          <label className="admin-archive-upload"><Upload size={15} />{uploadingId === guide.id ? "Đang upload..." : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" onChange={(event) => uploadPdf(index, event.target.files?.[0])} /></label>
          <input value={guide.pdfUrl ?? ""} onChange={(event) => updateGuide(index, { ...guide, pdfUrl: event.target.value })} placeholder="/uploads/guides/file.pdf" />
        </> : <label>Link YouTube<input value={guide.youtubeUrl ?? ""} onChange={(event) => updateGuide(index, { ...guide, type: "youtube", youtubeUrl: event.target.value, youtubeId: extractYoutubeId(event.target.value), pdfUrl: "", pageCount: 0 })} /></label>}
        <div className="admin-archive-actions">
          <button type="button" className="admin-secondary" onClick={() => updateGuide(index, { ...guide, isActive: guide.isActive === false })}>{guide.isActive === false ? "Đang ẩn" : "Đang hiện"}</button>
          <button type="button" className="admin-danger" onClick={() => setGuides(guides.filter((_, i) => i !== index))}><Trash2 size={15} />Xóa</button>
        </div>
      </div>;
    })}
  </section>;
}

function ArchiveFaqEditor({ faq, setFaq }: { faq: ArchiveFaq[]; setFaq: (value: ArchiveFaq[]) => void }) {
  return <section className="admin-archive-editor">
    <button type="button" className="admin-secondary" onClick={() => setFaq([...faq, { id: `faq-${Date.now()}`, question: "Câu hỏi mới", answer: "" }])}><Plus size={16} />Thêm FAQ</button>
    {faq.map((item, index) => <div className="admin-archive-group" key={item.id}>
      <label>Câu hỏi<input value={item.question} onChange={(event) => setFaq(faq.map((entry, i) => i === index ? { ...entry, question: event.target.value } : entry))} /></label>
      <label>Câu trả lời<textarea value={item.answer} onChange={(event) => setFaq(faq.map((entry, i) => i === index ? { ...entry, answer: event.target.value } : entry))} rows={5} /></label>
      <button type="button" className="admin-danger" onClick={() => setFaq(faq.filter((_, i) => i !== index))}><Trash2 size={15} />Xóa FAQ</button>
    </div>)}
  </section>;
}
