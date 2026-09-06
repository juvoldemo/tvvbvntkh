"use client";

import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Bell, BookOpen, CalendarPlus, CheckCircle2, Clock3, Database, Download, FileText, Grid2X2, HelpCircle, Home, Image as ImageIcon, LogOut, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Target, Trash2, Trophy, Upload, UserCircle, Users, X } from "lucide-react";

type EventItem = { id: string; title: string; content: string; event_date: string | null; event_type?: string | null; created_at: string };
type EventAudience = "board_leader" | "team_leader" | "advisor";
type CompetitionAudience = "all" | "team_leader";
type CompetitionProgram = { id: string; programName: string; status: string; startDate?: string; endDate?: string; isHidden?: boolean; displayAudience?: CompetitionAudience };
type UserItem = { id: string; advisor_code: string; full_name: string; group_name: string | null; start_date: string | null; advisor_status: string | null; advisor_position: string | null; position_effective_date: string | null; birth_day: number | null; birth_month: number | null; password_plain: string | null; is_active: boolean };
type AdminTab = "home" | "events" | "competitions" | "analytics" | "data" | "targets" | "activities" | "archive" | "about" | "access";
type AnalyticsPeriod = "day" | "week" | "month";
type AnalyticsTimelineItem = { eventName: string; tabName?: string | null; durationSeconds?: number | null; actionName?: string | null; createdAt: string };
type AnalyticsRow = { sessionId: string; advisorCode: string; fullName: string; groupName: string; position: string; visits: number; actions: number; summaryExports: number; totalSeconds: number; longestTab: string; longestTabSeconds: number; firstAccess: string; lastAccess: string; devices: string[]; tabs: Record<string, number>; timeline: AnalyticsTimelineItem[] };
type AnalyticsUser = { advisorCode: string; fullName: string; groupName: string; position: string; lastAccess: string | null };
type InvitationRankingItem = { advisorCode: string; fullName: string; groupName: string; position: string; count: number };
type AnalyticsData = { rows: AnalyticsRow[]; summary: { uniqueAdvisors: number; sessions: number; actions: number; summaryExports: number; invitationsCreated: number; totalSeconds: number; averageSeconds: number; viewOnlySessions: number; shortSessions: number }; invitationRanking: InvitationRankingItem[]; trends: Array<{ label: string; sessions: number; advisors: number; seconds: number }>; tabStats: Array<{ tabName: string; views: number; seconds: number; advisors: number }>; groups: Array<{ groupName: string; advisors: number; sessions: number; seconds: number; actions: number }>; neverAccessed: AnalyticsUser[]; inactive7Days: AnalyticsUser[]; inactive30Days: AnalyticsUser[] };
type TeamActivity = { id: string; content: string; scheduled_date: string; scheduled_time: string; scheduled_at: string; completed: boolean; completed_at: string | null; photo_url: string | null };
type ActivityGroup = { id: string; group_name: string; leader_code: string; leader_name: string; revenue_target: number; active_advisor_target: number; selected_advisors: unknown[]; updated_at: string; activities: TeamActivity[]; activityError?: string | null };
type AdminRewardAudience = "tvv" | "leaders";
type AdminRewardPeriod = "month" | "quarter";
type RewardParticipant = { code: string; name: string; groupName?: string; contractCount: number; ip: number; fyp: number; fyc: number; reward: number; detail: string };
type RewardProgram = { id: string; name: string; period: string; totalReward: number; achievedCount: number; participants: RewardParticipant[] };
type AdminRewardData = { month: string; period: AdminRewardPeriod; tvv: RewardProgram[]; leaders: RewardProgram[] };
type TargetRegistration = { id: string; target_month: string; leader_name: string | null; group_name: string; revenue_target: number; active_advisor_target: number; reward_target: number; selected_advisors: Array<{ advisor_code?: string; agentCode?: string; full_name?: string; agentName?: string; revenue_target?: number; revenueTarget?: number }>; updated_at: string };
type TargetRegistrationCycle = { activeMonth: string; nextMonth: string; previousMonth: string | null; savedMonths: string[]; activeMonthSaved: boolean; canRollback: boolean; startedAt: string | null; savedAt: string | null; updatedAt: string | null };
type ArchiveTab = "forms" | "guides" | "faq";
type ArchiveDocument = { id: string; title: string; file?: string; size?: string };
type ArchiveFolder = { id: string; title: string; items: ArchiveDocument[] };
type ArchiveForms = { folders: ArchiveFolder[] };
type ArchiveGuide = { id: string; category?: string; title: string; description?: string; summary?: string; type?: "pdf" | "youtube"; pdfUrl?: string; pageCount?: number; youtubeUrl?: string; youtubeId?: string; isActive?: boolean; order?: number; createdAt?: string };
type ArchiveFaq = { id: string; question: string; answer: string };
type AboutItem = { id: string; title: string; content: string; imageUrl?: string };
type AboutSection = { id: string; title: string; description: string; items: AboutItem[] };
type AboutContent = { sections: AboutSection[] };
export default function AdminDataPage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [accessError, setAccessError] = useState("");
  const [accessSearch, setAccessSearch] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [copiedAccessCell, setCopiedAccessCell] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [competitionPrograms, setCompetitionPrograms] = useState<CompetitionProgram[]>([]);
  const [competitionAudienceBusy, setCompetitionAudienceBusy] = useState("");
  const [competitionStatusView, setCompetitionStatusView] = useState<"ongoing" | "ended">("ongoing");
  const [activeTab, setActiveTab] = useState<AdminTab>("home");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("day");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [rewardData, setRewardData] = useState<AdminRewardData | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardAudience, setRewardAudience] = useState<AdminRewardAudience>("tvv");
  const [rewardPeriod, setRewardPeriod] = useState<AdminRewardPeriod>("month");
  const [rewardMonth, setRewardMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetRegistrations, setTargetRegistrations] = useState<TargetRegistration[]>([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetCycle, setTargetCycle] = useState<TargetRegistrationCycle | null>(null);
  const [targetCycleBusy, setTargetCycleBusy] = useState(false);
  const [activityMonth, setActivityMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventAudiences, setEventAudiences] = useState<EventAudience[]>(["board_leader", "team_leader", "advisor"]);
  const [archiveForms, setArchiveForms] = useState<ArchiveForms>({ folders: [] });
  const [archiveGuides, setArchiveGuides] = useState<ArchiveGuide[]>([]);
  const [archiveFaq, setArchiveFaq] = useState<ArchiveFaq[]>([]);
  const [aboutContent, setAboutContent] = useState<AboutContent>({ sections: [] });

  const loadData = useCallback(async () => {
    const [eventResponse, competitionResponse, formsResponse, guidesResponse, faqResponse, aboutResponse] = await Promise.all([
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/competition?includeHidden=1", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=forms", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=guides", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=faq", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=about", { cache: "no-store" })
    ]);
    const [eventPayload, competitionPayload, formsPayload, guidesPayload, faqPayload, aboutPayload] = await Promise.all([
      eventResponse.json(),
      competitionResponse.json(),
      formsResponse.json(),
      guidesResponse.json(),
      faqResponse.json(),
      aboutResponse.json()
    ]);
    if (eventResponse.ok) setEvents(eventPayload.events ?? []);
    if (competitionResponse.ok) setCompetitionPrograms(competitionPayload.programs ?? []);
    if (formsResponse.ok) setArchiveForms(formsPayload ?? { folders: [] });
    if (guidesResponse.ok) setArchiveGuides(guidesPayload ?? []);
    if (faqResponse.ok) setArchiveFaq(faqPayload ?? []);
    if (aboutResponse.ok) setAboutContent(aboutPayload ?? { sections: [] });
  }, []);

  const loadUsers = useCallback(async () => {
    setAccessLoading(true);
    try {
      const response = await fetch("/api/admin/access-list", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Không tải được danh sách truy cập.");
      setUsers(payload.users ?? []);
    } finally {
      setAccessLoading(false);
    }
  }, []);

  async function copyAccessValue(value: string, cellKey: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("textarea");
        input.value = value;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setCopiedAccessCell(cellKey);
      window.setTimeout(() => setCopiedAccessCell((current) => current === cellKey ? "" : current), 1500);
    } catch {
      setAccessError("Không thể sao chép. Vui lòng thử lại.");
    }
  }

  useEffect(() => {
    if (!authenticated || activeTab !== "access") return;
    void loadUsers().catch((error) => setAccessError(error instanceof Error ? error.message : "Không tải được danh sách truy cập."));
  }, [activeTab, authenticated, loadUsers]);

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((admin) => {
        setAuthenticated(Boolean(admin.authenticated));
        if (admin.authenticated) loadData();
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

  const loadTargetCycle = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/target-registration-cycle", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được chu kỳ mục tiêu.");
      setTargetCycle(payload.cycle ?? null);
      if (payload.cycle?.activeMonth) setTargetMonth(payload.cycle.activeMonth);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được chu kỳ mục tiêu.");
    }
  }, []);

  useEffect(() => {
    if (authenticated && activeTab === "targets") void loadTargetCycle();
  }, [activeTab, authenticated, loadTargetCycle]);

  useEffect(() => {
    if (authenticated && activeTab === "targets") void loadTargetRegistrations();
  }, [activeTab, authenticated, loadTargetRegistrations]);

  const loadActivities = useCallback(async () => {
    setActivityLoading(true);
    setActivityError("");
    try {
      const response = await fetch(`/api/admin/team-activities?month=${activityMonth}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Không tải được theo dõi hoạt động.");
      setActivityGroups(payload.groups ?? []);
    } catch (error) {
      setActivityGroups([]);
      setActivityError(error instanceof Error ? error.message : "Không tải được theo dõi hoạt động.");
    } finally {
      setActivityLoading(false);
    }
  }, [activityMonth]);

  useEffect(() => {
    if (authenticated && activeTab === "activities") void loadActivities();
  }, [activeTab, authenticated, loadActivities]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    const response = await fetch(`/api/analytics?period=${analyticsPeriod}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setAnalyticsLoading(false);
    if (!response.ok) { setMessage(payload.error || "Không tải được analytics."); return; }
    setAnalyticsData(payload);
  }, [analyticsPeriod]);

  useEffect(() => {
    if (authenticated && (activeTab === "home" || activeTab === "analytics")) void loadAnalytics();
  }, [activeTab, authenticated, loadAnalytics]);

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

  async function updateTargetCycle(action: "save_current" | "start_next" | "rollback_previous") {
    if (!targetCycle || targetCycleBusy) return;
    if (action === "start_next" && !window.confirm(
      `Bắt đầu đăng ký mục tiêu tháng ${targetCycle.nextMonth.slice(5, 7)}/${targetCycle.nextMonth.slice(0, 4)} cho toàn bộ Trưởng nhóm?`
    )) return;
    if (action === "rollback_previous" && targetCycle.previousMonth && !window.confirm(
      `Quay lại và mở khóa mục tiêu tháng ${targetCycle.previousMonth.slice(5, 7)}/${targetCycle.previousMonth.slice(0, 4)} cho toàn bộ Trưởng nhóm? Dữ liệu tháng ${targetCycle.activeMonth.slice(5, 7)} vẫn được giữ lại.`
    )) return;
    setTargetCycleBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/target-registration-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Không cập nhật được chu kỳ mục tiêu.");
      setTargetCycle(payload.cycle);
      setTargetMonth(payload.cycle.activeMonth);
      setMessage(payload.message || "Đã cập nhật chu kỳ mục tiêu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không cập nhật được chu kỳ mục tiêu.");
    } finally {
      setTargetCycleBusy(false);
    }
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
      body: JSON.stringify({ title, content, eventDate: eventDate ? new Date(eventDate).toISOString() : "", audiences: eventAudiences })
    });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? (eventDate ? "Đã hẹn lịch gửi thông báo." : "Đã gửi thông báo.") : payload.error);
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

  async function toggleCompetitionAudience(program: CompetitionProgram) {
    const nextAudience: CompetitionAudience = program.displayAudience === "team_leader" ? "all" : "team_leader";
    setCompetitionAudienceBusy(program.id);
    setMessage("");
    const response = await fetch("/api/competition", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: program.id, display_audience: nextAudience })
    });
    const payload = await response.json().catch(() => ({}));
    setCompetitionAudienceBusy("");
    if (!response.ok) {
      setMessage(payload.error || "Không cập nhật được đối tượng hiển thị của chương trình.");
      return;
    }
    setCompetitionPrograms((current) => current.map((item) => item.id === program.id ? { ...item, displayAudience: nextAudience } : item));
    setMessage(nextAudience === "team_leader"
      ? `“${program.programName}” hiện chỉ hiển thị cho trưởng nhóm.`
      : `“${program.programName}” hiện hiển thị cho tất cả mọi người.`);
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

  const normalizedAccessSearch = accessSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const activeAccessUsers = users.filter((user) => user.is_active);
  const filteredAccessUsers = activeAccessUsers.filter((user) => !normalizedAccessSearch || `${user.full_name} ${user.advisor_code}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedAccessSearch));
  const today = todayText();
  const ongoingCompetitionPrograms = competitionPrograms.filter((program) => !program.endDate || program.endDate >= today);
  const endedCompetitionPrograms = competitionPrograms.filter((program) => Boolean(program.endDate && program.endDate < today));
  const visibleCompetitionPrograms = competitionStatusView === "ongoing" ? ongoingCompetitionPrograms : endedCompetitionPrograms;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><span>BVNT Khánh Hòa</span><h1>Quản trị dữ liệu</h1></div>
        <div className="admin-header-actions">
          <button type="button" aria-label="Thông báo" onClick={() => setActiveTab("events")}><Bell /></button>
          <button type="button" aria-label="Danh sách truy cập" onClick={() => setActiveTab("access")}><UserCircle /></button>
          <button type="button" aria-label="Đăng xuất" onClick={logout}><LogOut /></button>
        </div>
      </header>
      {message && <div className="admin-message">{message}</div>}

      <nav className="admin-main-tabs" aria-label="Quản trị dữ liệu">
        <button type="button" className={activeTab === "events" ? "active" : ""} onClick={() => setActiveTab("events")}><CalendarPlus size={17} />Thông báo</button>
        <button type="button" className={activeTab === "competitions" ? "active" : ""} onClick={() => { setActiveTab("competitions"); setAccessError(""); }}><Trophy size={17} />Chương trình thi đua</button>
        <button type="button" className={activeTab === "analytics" ? "active" : ""} onClick={() => { setActiveTab("analytics"); setAccessError(""); }}><BarChart3 size={17} />Analytics</button>
        <button type="button" className={activeTab === "data" ? "active" : ""} onClick={() => { setActiveTab("data"); setAccessError(""); }}><BarChart3 size={17} />Dữ liệu</button>
        <button type="button" className={activeTab === "targets" ? "active" : ""} onClick={() => { setActiveTab("targets"); setAccessError(""); }}><Target size={17} />Mục tiêu</button>
        <button type="button" className={activeTab === "activities" ? "active" : ""} onClick={() => { setActiveTab("activities"); setAccessError(""); }}><CheckCircle2 size={17} />Theo dõi hoạt động</button>
        <button type="button" className={activeTab === "archive" ? "active" : ""} onClick={() => { setActiveTab("archive"); setAccessError(""); }}><BookOpen size={17} />Kho tài liệu</button>
        <button type="button" className={activeTab === "about" ? "active" : ""} onClick={() => { setActiveTab("about"); setAccessError(""); }}><ShieldCheck size={17} />Cẩm nang tư vấn</button>
        <button type="button" className={activeTab === "access" ? "active" : ""} onClick={() => { setActiveTab("access"); setAccessError(""); }}><Users size={17} />Danh sách truy cập</button>
      </nav>

      <section className="admin-panel-area">
        {activeTab === "home" && <AdminHomeDashboard data={analyticsData} period={analyticsPeriod} setPeriod={setAnalyticsPeriod} onNavigate={setActiveTab} />}
        {activeTab === "access" && <article className="admin-card">
          <div className="admin-card-title"><Users /><div><h2>Danh sách được truy cập</h2><p>Upload Excel hoặc CSV; tài khoản mới có mật khẩu random gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p></div></div>
          <form onSubmit={uploadList}>
            <label className="admin-file"><Upload /><span>Chọn file dữ liệu TVV theo định dạng APM01</span><input name="file" type="file" accept=".xlsx,.xls,.csv" required /></label>
            <button disabled={busy}>Upload danh sách</button>
          </form>
          <div className="admin-access-actions">
            <button type="button" className="admin-secondary" disabled={busy || users.filter((user) => user.is_active).length === 0} onClick={randomizeAccessPasswords}>Tạo mật khẩu random cho tất cả TVV</button>
            <button type="button" className="admin-secondary" disabled={busy || users.filter((user) => user.is_active).length === 0} onClick={exportAccessList}><Download size={17} />Xuất danh sách Excel</button>
          </div>
          <div className="admin-access-search"><Search size={18} /><input type="search" value={accessSearch} onChange={(event) => setAccessSearch(event.target.value)} placeholder="Tìm theo tên hoặc mã TVV" /></div>
          {accessError && <div className="admin-message error">{accessError}</div>}
          <div className="admin-count">{accessLoading ? "Đang tải danh sách..." : `${activeAccessUsers.length} người đang được cấp quyền${accessSearch ? ` · Tìm thấy ${filteredAccessUsers.length}` : ""}`}</div>
          <div className="admin-table-wrap admin-access-table"><table><thead><tr><th>Mã TVV</th><th>Tên TVV</th><th>Mật khẩu hiện tại</th><th>Nhóm</th><th>Chức vụ</th></tr></thead><tbody>
            {filteredAccessUsers.map((user) => {
              const codeKey = `${user.id}-code`;
              const passwordKey = `${user.id}-password`;
              return <tr key={user.id}>
                <td><button type="button" className="admin-copy-cell" title="Bấm để sao chép mã TVV" onClick={() => void copyAccessValue(user.advisor_code, codeKey)}>{copiedAccessCell === codeKey ? "Đã sao chép" : user.advisor_code}</button></td>
                <td>{user.full_name}</td>
                <td><button type="button" className="admin-copy-cell admin-copy-password" title={user.password_plain ? "Bấm để sao chép mật khẩu" : "Chưa có mật khẩu"} disabled={!user.password_plain} onClick={() => user.password_plain && void copyAccessValue(user.password_plain, passwordKey)}><code className="admin-password-code">{copiedAccessCell === passwordKey ? "Đã sao chép" : user.password_plain || "Chưa tạo"}</code></button></td>
                <td>{user.group_name || "—"}</td><td>{user.advisor_position || "—"}</td>
              </tr>;
            })}
            {!accessLoading && !filteredAccessUsers.length && <tr><td colSpan={5}>{accessSearch ? "Không tìm thấy TVV phù hợp." : "Chưa có người dùng được cấp quyền."}</td></tr>}
          </tbody></table></div>
          <div className="admin-access-mobile-list">
            {filteredAccessUsers.map((user) => {
              const codeKey = `${user.id}-mobile-code`;
              const passwordKey = `${user.id}-mobile-password`;
              return <article key={user.id} className="admin-access-mobile-card">
                <header><div><small>Tên TVV</small><strong>{user.full_name}</strong></div><span>{user.advisor_position || "—"}</span></header>
                <dl>
                  <div><dt>Mã TVV</dt><dd><button type="button" className="admin-copy-cell" title="Bấm để sao chép mã TVV" onClick={() => void copyAccessValue(user.advisor_code, codeKey)}>{copiedAccessCell === codeKey ? "Đã sao chép" : user.advisor_code}</button></dd></div>
                  <div><dt>Mật khẩu</dt><dd><button type="button" className="admin-copy-cell admin-copy-password" title={user.password_plain ? "Bấm để sao chép mật khẩu" : "Chưa có mật khẩu"} disabled={!user.password_plain} onClick={() => user.password_plain && void copyAccessValue(user.password_plain, passwordKey)}><code className="admin-password-code">{copiedAccessCell === passwordKey ? "Đã sao chép" : user.password_plain || "Chưa tạo"}</code></button></dd></div>
                  <div><dt>Nhóm</dt><dd>{user.group_name || "—"}</dd></div>
                </dl>
              </article>;
            })}
            {!accessLoading && !filteredAccessUsers.length && <p className="admin-data-empty">{accessSearch ? "Không tìm thấy TVV phù hợp." : "Chưa có người dùng được cấp quyền."}</p>}
          </div>
        </article>}

        {activeTab === "events" && <article className="admin-card">
          <div className="admin-card-title"><CalendarPlus /><div><h2>Tạo thông báo</h2><p>Bỏ trống thời gian để gửi ngay, hoặc chọn thời gian để hẹn lịch gửi.</p></div></div>
          <form className="admin-event-form" onSubmit={createEvent}>
            <label>Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} /></label>
            <label>Thời gian gửi thông báo (không bắt buộc)<input type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <fieldset className="admin-event-audiences"><legend>Đối tượng nhận</legend>
              {([["board_leader", "Trưởng ban"], ["team_leader", "Trưởng nhóm"], ["advisor", "Tư vấn viên"]] as const).map(([id, label]) => <label key={id}><input type="checkbox" checked={eventAudiences.includes(id)} onChange={(event) => setEventAudiences((current) => event.target.checked ? [...current, id] : current.filter((item) => item !== id))} /><span>{label}</span></label>)}
            </fieldset>
            <label>Nội dung<textarea value={content} onChange={(event) => setContent(event.target.value)} required rows={5} maxLength={1000} /></label>
            <button disabled={busy || eventAudiences.length === 0}><Bell size={17} /> {eventDate ? "Hẹn gửi thông báo" : "Gửi thông báo ngay"}</button>
          </form>
          <div className="admin-event-list">
            {events.map((item) => <div key={item.id}><div><b>{item.title}</b><p>{item.content}</p><small>{item.event_date ? `Gửi lúc ${new Date(item.event_date).toLocaleString("vi-VN")}` : "Gửi ngay"}</small></div><button onClick={() => removeEvent(item.id)}>Xóa</button></div>)}
          </div>
        </article>}

        {activeTab === "competitions" && <article className="admin-card admin-competition-audience-card">
          <div className="admin-card-title"><Trophy /><div><h2>Đối tượng xem chương trình thi đua</h2><p>Bật “Chỉ trưởng nhóm” cho chương trình đặc biệt. Khi tắt, chương trình được hiển thị cho tất cả mọi người.</p></div></div>
          <div className="admin-competition-status-tabs" role="tablist" aria-label="Trạng thái chương trình thi đua">
            <button type="button" role="tab" aria-selected={competitionStatusView === "ongoing"} className={competitionStatusView === "ongoing" ? "active" : ""} onClick={() => setCompetitionStatusView("ongoing")}><span>Đang diễn ra</span><strong>{ongoingCompetitionPrograms.length}</strong></button>
            <button type="button" role="tab" aria-selected={competitionStatusView === "ended"} className={competitionStatusView === "ended" ? "active" : ""} onClick={() => setCompetitionStatusView("ended")}><span>Đã kết thúc</span><strong>{endedCompetitionPrograms.length}</strong></button>
          </div>
          <div className="admin-competition-audience-list">
            {visibleCompetitionPrograms.map((program) => {
              const leadersOnly = program.displayAudience === "team_leader";
              return <section key={program.id} className={leadersOnly ? "leaders-only" : ""}>
                <div><h3>{program.programName}</h3><p>{program.startDate || "—"} đến {program.endDate || "—"} · {program.isHidden ? "Đang ẩn" : program.status || "Chưa có trạng thái"}</p></div>
                <div className="admin-competition-audience-control">
                  <small>Đối tượng hiển thị</small>
                  <button type="button" role="switch" aria-checked={leadersOnly} aria-label={`Đối tượng hiển thị của ${program.programName}: ${leadersOnly ? "chỉ trưởng nhóm" : "tất cả mọi người"}`} className={`admin-audience-switch${leadersOnly ? " active" : ""}`} disabled={competitionAudienceBusy === program.id} onClick={() => toggleCompetitionAudience(program)}>
                    <i aria-hidden="true" />
                    <span className="all-option">Mọi người</span>
                    <span className="leader-option">Trưởng nhóm</span>
                  </button>
                </div>
              </section>;
            })}
            {!visibleCompetitionPrograms.length && <p className="admin-data-empty">{competitionStatusView === "ongoing" ? "Không có chương trình thi đua đang diễn ra." : "Chưa có chương trình thi đua đã kết thúc."}</p>}
          </div>
        </article>}

        {activeTab === "analytics" && <AnalyticsPanel period={analyticsPeriod} setPeriod={setAnalyticsPeriod} data={analyticsData} loading={analyticsLoading} onReload={loadAnalytics} />}

        {activeTab === "data" && <AdminDataSummary data={rewardData} loading={rewardLoading} audience={rewardAudience} period={rewardPeriod} selectedMonth={rewardMonth} setAudience={setRewardAudience} setPeriod={setRewardPeriod} setSelectedMonth={setRewardMonth} onReload={loadRewardData} />}

        {activeTab === "targets" && <AdminTargetSummary month={targetMonth} setMonth={setTargetMonth} registrations={targetRegistrations} loading={targetLoading} cycle={targetCycle} cycleBusy={targetCycleBusy} onCycleAction={updateTargetCycle} onReload={loadTargetRegistrations} onDelete={removeTargetRegistration} />}

        {activeTab === "activities" && <AdminActivityTracking month={activityMonth} setMonth={setActivityMonth} groups={activityGroups} loading={activityLoading} error={activityError} onReload={loadActivities} />}

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
        {activeTab === "about" && <AboutAdminPanel content={aboutContent} setContent={setAboutContent} onSaved={loadData} setMessage={setMessage} />}
      </section>
      <nav className="admin-bottom-nav" aria-label="Điều hướng nhanh">
        <button type="button" className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><Home /><span>Tổng quan</span></button>
        <button type="button" className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}><BarChart3 /><span>Analytics</span></button>
        <button type="button" className={activeTab === "data" ? "active" : ""} onClick={() => setActiveTab("data")}><Database /><span>Dữ liệu</span></button>
        <button type="button" className={!(["home", "analytics", "data"] as AdminTab[]).includes(activeTab) ? "active" : ""} onClick={() => setActiveTab("events")}><Grid2X2 /><span>Thêm</span></button>
      </nav>
    </main>
  );
}

function AdminHomeDashboard({ data, period, setPeriod, onNavigate }: {
  data: AnalyticsData | null; period: AnalyticsPeriod;
  setPeriod: Dispatch<SetStateAction<AnalyticsPeriod>>;
  onNavigate: Dispatch<SetStateAction<AdminTab>>;
}) {
  const summary = data?.summary ?? { uniqueAdvisors: 0, sessions: 0, actions: 0, summaryExports: 0, invitationsCreated: 0, totalSeconds: 0, averageSeconds: 0, viewOnlySessions: 0, shortSessions: 0 };
  const metrics = [
    { label: "Lượt truy cập", value: summary.actions, icon: BarChart3 },
    { label: "TVV hoạt động", value: summary.uniqueAdvisors, icon: Users },
    { label: "Phiên hôm nay", value: summary.sessions, icon: FileText },
    { label: "Tổng thời gian truy cập", value: formatAdminDuration(summary.totalSeconds), icon: Clock3 }
  ];
  const shortcuts: Array<{ tab: AdminTab; label: string; icon: typeof Bell }> = [
    { tab: "events", label: "Thông báo", icon: Bell }, { tab: "competitions", label: "Thi đua", icon: Trophy },
    { tab: "data", label: "Dữ liệu", icon: BarChart3 }, { tab: "targets", label: "Mục tiêu", icon: Target },
    { tab: "activities", label: "Hoạt động", icon: CheckCircle2 }, { tab: "archive", label: "Tài liệu", icon: BookOpen },
    { tab: "about", label: "Cẩm nang", icon: ShieldCheck }, { tab: "access", label: "Truy cập", icon: UserCircle }
  ];
  const rawTrends = data?.trends ?? [];
  const trends = period === "day"
    ? rawTrends.reduce<Array<{ label: string; sessions: number; advisors: number; seconds: number }>>((groups, item, index) => {
        if (index % 2 === 0) {
          const next = rawTrends[index + 1];
          const shortHour = (label: string) => label.replace(":00", "").padStart(2, "0");
          groups.push({
            label: next ? `${shortHour(item.label)}–${shortHour(next.label)}` : shortHour(item.label),
            sessions: item.sessions + (next?.sessions ?? 0),
            advisors: Math.max(item.advisors, next?.advisors ?? 0),
            seconds: item.seconds + (next?.seconds ?? 0)
          });
        }
        return groups;
      }, [])
    : rawTrends;
  const maxTrend = Math.max(1, ...trends.map((item) => item.sessions));
  const totalTrendSessions = trends.reduce((sum, item) => sum + item.sessions, 0);
  return <div className="admin-home-dashboard">
    <section className="admin-home-section admin-home-overview">
      <header><h2>Tổng quan hôm nay</h2></header>
      <div className="admin-home-metrics">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label}><i><Icon /></i><div><span>{metric.label}</span><strong>{metric.value}</strong></div><small>Thống kê theo kỳ đang chọn</small></article>; })}</div>
    </section>
    <section className="admin-home-section admin-home-shortcuts"><h2>Quản lý nhanh</h2><div>{shortcuts.map((item) => { const Icon = item.icon; return <button type="button" key={item.tab} aria-label={item.label} title={item.label} onClick={() => onNavigate(item.tab)}><Icon /></button>; })}</div></section>
    <section className="admin-home-section admin-home-chart">
      <header className="admin-chart-heading"><div><h2>Phân tích truy cập</h2><p>Xu hướng số phiên truy cập theo từng khoảng thời gian.</p></div><div className="admin-chart-total"><span><i />Tổng trong kỳ</span><strong>{totalTrendSessions} phiên</strong></div></header>
      <div className="admin-home-periods">{(["day", "week", "month"] as AnalyticsPeriod[]).map((item) => <button type="button" key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item === "day" ? "Ngày" : item === "week" ? "Tuần" : "Tháng"}</button>)}</div>
      <div className="admin-home-bar-chart" role="img" aria-label="Biểu đồ số phiên truy cập">{trends.length ? <div className="admin-trend-bars">{trends.map((item) => <figure key={item.label} title={`${item.label}: ${item.sessions} phiên, ${item.advisors} TVV`}><div><span style={{ height: `${Math.max(8, item.sessions / maxTrend * 100)}%` }}><b>{item.sessions}</b></span></div><figcaption>{item.label}</figcaption></figure>)}</div> : <p>Chưa có dữ liệu truy cập trong kỳ này.</p>}</div>
      <footer><button type="button" onClick={() => onNavigate("analytics")}><FileText />Chi tiết phiên</button><button type="button" onClick={() => onNavigate("analytics")}><Trophy />Xếp hạng TVV</button></footer>
    </section>
  </div>;
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function formatAdminDuration(seconds: number) {
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}g ${Math.round((seconds % 3600) / 60)}p`
    : seconds >= 60
      ? `${Math.floor(seconds / 60)}p ${seconds % 60}s`
      : `${seconds}s`;
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

function AdminTargetSummary({ month, setMonth, registrations, loading, cycle, cycleBusy, onCycleAction, onReload, onDelete }: {
  month: string;
  setMonth: (value: string) => void;
  registrations: TargetRegistration[];
  loading: boolean;
  cycle: TargetRegistrationCycle | null;
  cycleBusy: boolean;
  onCycleAction: (action: "save_current" | "start_next" | "rollback_previous") => void;
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
  const monthLabel = (value?: string | null) => value ? `Tháng ${Number(value.slice(5, 7))}/${value.slice(0, 4)}` : "—";

  return (
    <article className="admin-card admin-target-card">
      <div className="admin-card-title"><Target /><div><h2>Đăng ký mục tiêu</h2><p>Theo dõi mục tiêu từng nhóm và doanh thu trưởng nhóm đăng ký cho từng TVV cụ thể.</p></div></div>
      {cycle && <section className="admin-target-cycle">
        <div className="admin-target-cycle-status">
          <span>Đang mở đăng ký</span>
          <strong>{monthLabel(cycle.activeMonth)}</strong>
          <small>{cycle.activeMonthSaved ? "Đã lưu dữ liệu tháng này" : "Chưa lưu dữ liệu tháng này"}</small>
        </div>
        <div className="admin-target-cycle-next">
          <span>Mục tiêu tháng tiếp theo</span>
          <strong>{monthLabel(cycle.nextMonth)}</strong>
          <small>Sẵn sàng mở đồng loạt cho Trưởng nhóm</small>
        </div>
        <div className="admin-target-cycle-actions">
          {cycle.canRollback && cycle.previousMonth && <button className="rollback" type="button" disabled={cycleBusy} onClick={() => onCycleAction("rollback_previous")}><RotateCcw size={16} />Quay lại tháng {Number(cycle.previousMonth.slice(5, 7))}</button>}
          <button type="button" disabled={cycleBusy || cycle.activeMonthSaved} onClick={() => onCycleAction("save_current")}><Save size={16} />{cycle.activeMonthSaved ? "Đã lưu" : `Lưu tháng ${Number(cycle.activeMonth.slice(5, 7))}`}</button>
          <button className="start" type="button" disabled={cycleBusy || !cycle.activeMonthSaved} onClick={() => onCycleAction("start_next")}><CalendarPlus size={16} />{cycleBusy ? "Đang cập nhật..." : `Bắt đầu tháng ${Number(cycle.nextMonth.slice(5, 7))}`}</button>
        </div>
      </section>}
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

function AdminActivityTracking({ month, setMonth, groups, loading, error, onReload }: {
  month: string; setMonth: (value: string) => void; groups: ActivityGroup[]; loading: boolean; error: string; onReload: () => void;
}) {
  const [listView, setListView] = useState<"groups" | "plans" | "completed" | "evidence">("groups");
  const activityCount = groups.reduce((sum, group) => sum + group.activities.length, 0);
  const completedCount = groups.reduce((sum, group) => sum + group.activities.filter((item) => item.completed).length, 0);
  const evidenceCount = groups.reduce((sum, group) => sum + group.activities.filter((item) => item.photo_url).length, 0);
  const viewLabels = { groups: "Nhóm đã đăng ký mục tiêu", plans: "Kế hoạch thực hiện", completed: "Hoạt động hoàn thành", evidence: "Hình ảnh minh chứng" };
  const visibleGroups = groups.map((group) => ({
    ...group,
    visibleActivities: listView === "plans" ? group.activities
      : listView === "completed" ? group.activities.filter((item) => item.completed)
      : listView === "evidence" ? group.activities.filter((item) => item.photo_url)
      : []
  })).filter((group) => listView === "groups" || group.visibleActivities.length > 0);
  return <article className="admin-card admin-activity-tracking">
    <div className="admin-card-title"><CheckCircle2 /><div><h2>Theo dõi hoạt động</h2><p>Nhóm đã đăng ký mục tiêu, kế hoạch thực hiện và hình ảnh minh chứng theo tháng.</p></div></div>
    <div className="admin-target-toolbar"><label>Tháng<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><button type="button" disabled={loading} onClick={onReload}>{loading ? "Đang tải..." : "Tải dữ liệu"}</button></div>
    <div className="admin-data-overview admin-activity-overview"><button type="button" className={listView === "groups" ? "active" : ""} onClick={() => setListView("groups")}><strong>{groups.length}</strong><span>nhóm đã đăng ký mục tiêu</span></button><button type="button" className={listView === "plans" ? "active" : ""} onClick={() => setListView("plans")}><strong>{activityCount}</strong><span>kế hoạch thực hiện</span></button><button type="button" className={listView === "completed" ? "active" : ""} onClick={() => setListView("completed")}><strong>{completedCount}</strong><span>hoạt động hoàn thành</span></button><button type="button" className={listView === "evidence" ? "active" : ""} onClick={() => setListView("evidence")}><strong>{evidenceCount}</strong><span>hình ảnh minh chứng</span></button></div>
    {error && <div className="admin-message error">{error}</div>}
    {!loading && !error && !groups.length && <div className="admin-data-empty">Chưa có nhóm đăng ký mục tiêu trong tháng này.</div>}
    {!loading && !error && groups.length > 0 && <div className="admin-activity-list-heading"><h3>{viewLabels[listView]}</h3><span>{listView === "groups" ? visibleGroups.length : visibleGroups.reduce((sum, group) => sum + group.visibleActivities.length, 0)} mục</span></div>}
    {!loading && !error && groups.length > 0 && !visibleGroups.length && <div className="admin-data-empty">Chưa có dữ liệu trong danh sách này.</div>}
    <div className="admin-activity-groups">{visibleGroups.map((group) => <section key={group.id} className="admin-activity-group">
      <header><div><h3>{group.group_name}</h3><p>{group.leader_name || group.leader_code} · Cập nhật {new Date(group.updated_at).toLocaleString("vi-VN")}</p></div><span>{group.activities.filter((item) => item.completed).length}/{group.activities.length} hoàn thành</span></header>
      <div className="admin-activity-targets"><span><b>{formatMoney(group.revenue_target)}</b>Mục tiêu doanh thu</span><span><b>{group.active_advisor_target || 0}</b>TVV mục tiêu</span><span><b>{Array.isArray(group.selected_advisors) ? group.selected_advisors.length : 0}</b>TVV được giao</span></div>
      {group.activityError && <p className="admin-activity-error">{group.activityError}</p>}
      {listView === "groups" && !group.activityError && !group.activities.length && <p className="admin-activity-empty">Nhóm đã đăng ký mục tiêu nhưng chưa lập kế hoạch hành động.</p>}
      {listView !== "groups" && <div className="admin-activity-list">{group.visibleActivities.map((activity) => <article key={activity.id} className={activity.completed ? "completed" : ""}><div className="admin-activity-status">{activity.completed ? <CheckCircle2 size={18} /> : <CalendarPlus size={18} />}</div><div><strong>{activity.content}</strong><small>{new Date(activity.scheduled_at).toLocaleString("vi-VN")}{activity.completed_at ? ` · Hoàn thành ${new Date(activity.completed_at).toLocaleString("vi-VN")}` : " · Chưa hoàn thành"}</small></div>{activity.photo_url ? <a href={activity.photo_url} target="_blank" rel="noreferrer" className="admin-activity-photo"><img src={activity.photo_url} alt={`Minh chứng ${activity.content}`} /><span>Xem ảnh</span></a> : <span className="admin-activity-no-photo">Chưa có ảnh</span>}</article>)}</div>}
    </section>)}</div>
  </article>;
}

function AnalyticsPanel({ period, setPeriod, data, loading, onReload }: { period: AnalyticsPeriod; setPeriod: (value: AnalyticsPeriod) => void; data: AnalyticsData | null; loading: boolean; onReload: () => void }) {
  const [selectedSession, setSelectedSession] = useState<AnalyticsRow | null>(null);
  const [alertView, setAlertView] = useState<"never" | "inactive7" | "inactive30">("never");
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showAccessRanking, setShowAccessRanking] = useState(false);
  const [showInvitationRanking, setShowInvitationRanking] = useState(false);
  const rows = data?.rows ?? [];
  const summary = data?.summary ?? { uniqueAdvisors: 0, sessions: 0, actions: 0, summaryExports: 0, invitationsCreated: 0, totalSeconds: 0, averageSeconds: 0, viewOnlySessions: 0, shortSessions: 0 };
  const tabLabels: Record<string, string> = { overview: "Tổng quan", contracts: "Hợp đồng", calculator: "Thu nhập", contests: "Thi đua", leaderboard: "Bảng xếp hạng", illustration: "Minh họa", profile: "Cá nhân", archive: "Kho tài liệu" };
  const duration = (seconds: number) => seconds >= 3600 ? `${Math.floor(seconds / 3600)}g ${Math.round((seconds % 3600) / 60)}p` : seconds >= 60 ? `${Math.floor(seconds / 60)}p ${seconds % 60}s` : `${seconds}s`;
  const maxTrend = Math.max(1, ...(data?.trends ?? []).map((item) => item.sessions));
  const maxTabSeconds = Math.max(1, ...(data?.tabStats ?? []).map((item) => item.seconds));
  const alertRows = alertView === "never" ? data?.neverAccessed ?? [] : alertView === "inactive7" ? data?.inactive7Days ?? [] : data?.inactive30Days ?? [];
  const newestSessions = [...rows].sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());
  const rankingMap = new Map<string, { advisorCode: string; fullName: string; groupName: string; position: string; sessions: number; totalSeconds: number; actions: number; summaryExports: number; lastAccess: string }>();
  for (const row of rows) {
    const current = rankingMap.get(row.advisorCode) || { advisorCode: row.advisorCode, fullName: row.fullName, groupName: row.groupName, position: row.position, sessions: 0, totalSeconds: 0, actions: 0, summaryExports: 0, lastAccess: row.lastAccess };
    current.sessions += 1; current.totalSeconds += row.totalSeconds; current.actions += row.actions; current.summaryExports += row.summaryExports;
    if (new Date(row.lastAccess).getTime() > new Date(current.lastAccess).getTime()) current.lastAccess = row.lastAccess;
    rankingMap.set(row.advisorCode, current);
  }
  const accessRanking = [...rankingMap.values()].sort((a, b) => b.sessions - a.sessions || b.totalSeconds - a.totalSeconds || b.actions - a.actions);
  return <article className="admin-card admin-analytics-card">
    <div className="admin-card-title"><BarChart3 /><div><h2>Phân tích truy cập</h2><p>Theo dõi lượt đăng nhập, tương tác và thời gian sử dụng theo mã TVV.</p></div></div>
    <div className="admin-analytics-toolbar">
      <div>{([["day", "Theo ngày"], ["week", "Theo tuần"], ["month", "Theo tháng"]] as const).map(([id, label]) => <button type="button" className={period === id && !showSessionDetails && !showAccessRanking ? "active" : ""} key={id} onClick={() => { setPeriod(id); setShowSessionDetails(false); setShowAccessRanking(false); }}>{label}</button>)}<button type="button" className={showSessionDetails ? "active" : ""} onClick={() => { setShowSessionDetails(true); setShowAccessRanking(false); }}>Chi tiết từng phiên</button><button type="button" className={showAccessRanking ? "active" : ""} onClick={() => { setShowAccessRanking(true); setShowSessionDetails(false); }}>Bảng xếp hạng TVV truy cập</button></div>
      <button type="button" onClick={onReload} disabled={loading}>{loading ? "Đang tải..." : "Làm mới"}</button>
    </div>
    {showInvitationRanking && <div className="admin-analytics-modal-backdrop" onClick={() => setShowInvitationRanking(false)}><section className="admin-analytics-modal admin-invitation-ranking-modal" role="dialog" aria-modal="true" aria-labelledby="invitation-ranking-title" onClick={(event) => event.stopPropagation()}><header><div><h3 id="invitation-ranking-title">Thư mời HNKH VIP theo TVV</h3><p>{summary.invitationsCreated} thư mời HNKH VIP đã được tạo · xếp theo số lượng giảm dần</p></div><button type="button" onClick={() => setShowInvitationRanking(false)} aria-label="Đóng"><X size={22} /></button></header><div className="admin-invitation-ranking-list">{(data?.invitationRanking ?? []).map((item, index) => <div key={item.advisorCode}><b className={`admin-rank-number rank-${index + 1}`}>{index + 1}</b><span><strong>{item.fullName}</strong><small>{item.advisorCode} · {item.groupName}{item.position !== "—" ? ` · ${item.position}` : ""}</small></span><em>{item.count}<small> thư</small></em></div>)}{!(data?.invitationRanking ?? []).length && <p>Chưa có dữ liệu tạo thư mời HNKH VIP.</p>}</div></section></div>}
    {!showSessionDetails && !showAccessRanking && <><div className="admin-analytics-summary admin-analytics-summary-full">
      <span><strong>{summary.uniqueAdvisors}</strong> TVV truy cập</span><span><strong>{summary.sessions}</strong> phiên truy cập</span><span><strong>{summary.actions}</strong> thao tác</span><button type="button" className="admin-analytics-summary-action" onClick={() => setShowInvitationRanking(true)} aria-haspopup="dialog"><strong>{summary.invitationsCreated}</strong> thư mời HNKH VIP</button><span><strong>{duration(summary.averageSeconds)}</strong> trung bình/phiên</span><span><strong>{summary.summaryExports}</strong> lượt xuất tóm tắt</span><span><strong>{summary.viewOnlySessions}</strong> phiên chỉ xem</span>
    </div>

    <section className="admin-analytics-grid">
      <div className="admin-analytics-box"><h3>Xu hướng truy cập</h3><p>Số phiên theo {period === "day" ? "khung giờ" : "ngày"}</p><div className="admin-trend-chart">{(data?.trends ?? []).map((item) => <div key={item.label} title={`${item.sessions} phiên, ${item.advisors} TVV`}><span><i style={{ height: `${Math.max(6, item.sessions / maxTrend * 100)}%` }} /></span><b>{item.sessions}</b><small>{item.label}</small></div>)}</div></div>
      <div className="admin-analytics-box"><h3>Mức độ sử dụng tab</h3><p>Lượt xem và tổng thời gian</p><div className="admin-tab-usage">{(data?.tabStats ?? []).map((item) => <div key={item.tabName}><header><b>{tabLabels[item.tabName] || item.tabName}</b><small>{item.views} lượt · {duration(item.seconds)}</small></header><span><i style={{ width: `${Math.max(3, item.seconds / maxTabSeconds * 100)}%` }} /></span></div>)}</div></div>
    </section>

    <section className="admin-analytics-box"><h3>Phân tích theo nhóm</h3><div className="admin-group-analytics">{(data?.groups ?? []).map((group) => <div key={group.groupName}><b>{group.groupName}</b><span>{group.advisors} TVV</span><span>{group.sessions} phiên</span><span>{duration(group.seconds)}</span><span>{group.actions} thao tác</span></div>)}</div></section>

    <section className="admin-analytics-box admin-alert-box"><h3>Cảnh báo cần chú ý</h3><div className="admin-alert-tabs"><button type="button" className={alertView === "never" ? "active" : ""} onClick={() => setAlertView("never")}>Chưa từng truy cập ({data?.neverAccessed?.length ?? 0})</button><button type="button" className={alertView === "inactive7" ? "active" : ""} onClick={() => setAlertView("inactive7")}>Không vào 7 ngày ({data?.inactive7Days?.length ?? 0})</button><button type="button" className={alertView === "inactive30" ? "active" : ""} onClick={() => setAlertView("inactive30")}>Không vào 30 ngày ({data?.inactive30Days?.length ?? 0})</button></div><div className="admin-alert-users">{alertRows.slice(0, 50).map((user) => <div key={user.advisorCode}><b>{user.advisorCode}</b><span>{user.fullName}</span><small>{user.groupName}{user.lastAccess ? ` · Lần cuối ${new Date(user.lastAccess).toLocaleDateString("vi-VN")}` : ""}</small></div>)}{!alertRows.length && <p>Không có TVV trong nhóm cảnh báo này.</p>}</div></section></>}

    {showSessionDetails && <><h3 className="admin-session-title">Chi tiết từng phiên</h3>
    <div className="admin-table-wrap"><table><thead><tr><th>Mã TVV</th><th>Họ tên</th><th>Nhóm / chức vụ</th><th>Lượt truy cập</th><th>Hoạt động</th><th>Tổng thời gian</th><th>Tab lâu nhất</th><th>Lần cuối</th></tr></thead><tbody>
      {newestSessions.map((row) => <tr className="admin-analytics-session-row" key={row.sessionId} onClick={() => setSelectedSession(row)}><td><b>{row.advisorCode}</b><small>{row.devices.join(", ")}</small></td><td>{row.fullName}</td><td>{row.groupName}<small>{row.position}</small></td><td>1</td><td>{row.actions ? <>{row.actions} thao tác{row.summaryExports > 0 && <small>Xuất tóm tắt: {row.summaryExports} lần</small>}</> : "Chỉ xem"}</td><td>{duration(row.totalSeconds)}</td><td>{tabLabels[row.longestTab] || row.longestTab}<small>{duration(row.longestTabSeconds)}</small></td><td>{new Date(row.lastAccess).toLocaleString("vi-VN")}</td></tr>)}
      {!loading && !rows.length && <tr><td colSpan={8}>Chưa có dữ liệu trong khoảng thời gian này.</td></tr>}
    </tbody></table></div></>}
    {showAccessRanking && <><h3 className="admin-session-title">Bảng xếp hạng TVV truy cập</h3><div className="admin-table-wrap"><table><thead><tr><th>Hạng</th><th>Mã TVV</th><th>Họ tên</th><th>Nhóm / chức vụ</th><th>Số phiên</th><th>Tổng thời gian</th><th>Thao tác</th><th>Xuất tóm tắt</th><th>Lần cuối</th></tr></thead><tbody>{accessRanking.map((item, index) => <tr key={item.advisorCode}><td><b className={`admin-rank-number rank-${index + 1}`}>{index + 1}</b></td><td><b>{item.advisorCode}</b></td><td>{item.fullName}</td><td>{item.groupName}<small>{item.position}</small></td><td><b>{item.sessions}</b></td><td>{duration(item.totalSeconds)}</td><td>{item.actions}</td><td>{item.summaryExports}</td><td>{new Date(item.lastAccess).toLocaleString("vi-VN")}</td></tr>)}{!loading && !accessRanking.length && <tr><td colSpan={9}>Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</td></tr>}</tbody></table></div></>}
    {selectedSession && <div className="admin-analytics-modal-backdrop" onClick={() => setSelectedSession(null)}><section className="admin-analytics-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><header><div><h3>{selectedSession.fullName}</h3><p>{selectedSession.advisorCode} · {selectedSession.groupName}</p></div><button type="button" onClick={() => setSelectedSession(null)} aria-label="Đóng"><X size={22} /></button></header><div className="admin-session-metrics"><span><b>Bắt đầu</b>{new Date(selectedSession.firstAccess).toLocaleString("vi-VN")}</span><span><b>Gần nhất</b>{new Date(selectedSession.lastAccess).toLocaleString("vi-VN")}</span><span><b>Thời lượng</b>{duration(selectedSession.totalSeconds)}</span><span><b>Thiết bị</b>{selectedSession.devices.join(", ")}</span></div><h4>Thời gian theo tab</h4><div className="admin-session-tabs">{Object.entries(selectedSession.tabs).sort((a, b) => b[1] - a[1]).map(([tabName, seconds]) => <div key={tabName}><b>{tabLabels[tabName] || tabName}</b><span>{duration(seconds)}</span></div>)}</div><h4>Dòng thời gian hoạt động</h4><div className="admin-session-timeline">{selectedSession.timeline.map((item, index) => <div key={`${item.createdAt}-${index}`}><time>{new Date(item.createdAt).toLocaleTimeString("vi-VN")}</time><span>{item.eventName === "session_start" ? "Bắt đầu phiên" : item.eventName === "tab_view" ? `Mở tab ${tabLabels[item.tabName || ""] || item.tabName}` : item.eventName === "tab_duration" ? `Ở tab ${tabLabels[item.tabName || ""] || item.tabName}: ${duration(Number(item.durationSeconds) || 0)}` : item.actionName || "Thao tác"}</span></div>)}</div></section></div>}
  </article>;
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

function AboutAdminPanel({ content, setContent, onSaved, setMessage }: {
  content: AboutContent;
  setContent: Dispatch<SetStateAction<AboutContent>>;
  onSaved: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<AboutSection["id"]>("payment-images");
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  const replaceSection = (sectionId: AboutSection["id"], replacement: AboutSection | ((section: AboutSection) => AboutSection)) => {
    setContent((current) => {
      const next = {
        sections: current.sections.map((section) => section.id === sectionId
          ? typeof replacement === "function" ? replacement(section) : replacement
          : section)
      };
      contentRef.current = next;
      return next;
    });
  };
  const updateSection = (_index: number, section: AboutSection) => replaceSection(section.id, section);

  async function uploadImages(sectionIndex: number, files?: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    const section = contentRef.current.sections[sectionIndex];
    if (!section) return;
    setUploadingId(section.id);
    try {
      const uploadedItems: AboutItem[] = [];
      for (const [fileIndex, file] of selectedFiles.entries()) {
        const formData = new FormData();
        formData.append("kind", "about");
        formData.append("file", file);
        const response = await fetch("/api/admin/archive/upload", { method: "POST", body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Không thể tải ảnh ${file.name}.`);
        uploadedItems.push({ id: `${section.id}-${Date.now()}-${fileIndex}`, title: "", content: "", imageUrl: result.imageUrl });
      }
      const latestSection = contentRef.current.sections.find((item) => item.id === section.id) ?? section;
      const nextContent = {
        sections: contentRef.current.sections.map((item) => item.id === section.id
          ? { ...latestSection, items: [...latestSection.items, ...uploadedItems] }
          : item)
      };
      contentRef.current = nextContent;
      setContent(nextContent);

      const saveResponse = await fetch("/api/admin/archive/content?key=about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextContent)
      });
      const saveResult = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) throw new Error(saveResult.error || "Ảnh đã tải lên nhưng chưa thể lưu vào nội dung.");
      setMessage(`Đã tải và lưu ${uploadedItems.length} ảnh.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải ảnh lên.");
    } finally {
      setUploadingId("");
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/archive/content?key=about", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(response.ok ? "Đã lưu nội dung Cẩm nang tư vấn" : payload.error || "Không thể lưu nội dung.");
    if (response.ok) await onSaved();
  }

  const selectedSectionIndex = Math.max(0, content.sections.findIndex((section) => section.id === selectedSectionId));
  const selectedSection = content.sections[selectedSectionIndex];

  function addSection() {
    const section: AboutSection = { id: `handbook-${Date.now()}`, title: "Tiêu đề mới", description: "", items: [] };
    const next = { sections: [...contentRef.current.sections, section] };
    contentRef.current = next;
    setContent(next);
    setSelectedSectionId(section.id);
  }

  function removeSection(sectionId: string) {
    const nextSections = contentRef.current.sections.filter((section) => section.id !== sectionId);
    const next = { sections: nextSections };
    contentRef.current = next;
    setContent(next);
    setSelectedSectionId(nextSections[0]?.id ?? "");
  }

  return <article className="admin-card admin-archive-card admin-about-card">
    <div className="admin-card-title"><ShieldCheck /><div><h2>Cẩm nang tư vấn</h2><p>Thêm đầu mục và cập nhật tiêu đề, nội dung hiển thị trên ứng dụng.</p></div></div>
    <div className="admin-about-toolbar"><button type="button" onClick={addSection}><Plus size={17} />Thêm đầu mục</button></div>
    <nav className="admin-about-section-tabs" aria-label="Chọn đầu mục Cẩm nang tư vấn">
      {content.sections.map((section) => <button type="button" key={section.id} className={selectedSectionId === section.id ? "active" : ""} onClick={() => setSelectedSectionId(section.id)}><span>{section.title || "Chưa đặt tiêu đề"}</span><small>{section.description.trim() ? "Đã có nội dung" : "Chưa có nội dung"}</small></button>)}
    </nav>
    {selectedSection && <div className="admin-archive-editor">
      <section className="admin-archive-group" key={selectedSection.id}>
        <label>Tiêu đề<input value={selectedSection.title} onChange={(event) => updateSection(selectedSectionIndex, { ...selectedSection, title: event.target.value })} placeholder="Nhập tiêu đề đầu mục" /></label>
        <label>Nội dung<textarea rows={12} value={selectedSection.description} onChange={(event) => updateSection(selectedSectionIndex, { ...selectedSection, description: event.target.value })} placeholder="Nhập nội dung tư vấn..." /></label>
        <div className="admin-about-editor-actions"><button type="button" className="admin-danger" onClick={() => removeSection(selectedSection.id)}><Trash2 size={15} />Xóa đầu mục</button></div>
        <label className="admin-about-multi-upload"><Upload size={18} /><span>{uploadingId === selectedSection.id ? "Đang tải ảnh..." : "Chọn và tải nhiều ảnh"}</span><small>Mỗi ảnh sẽ được tạo thành một dòng riêng.</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingId === selectedSection.id} onChange={(event) => { void uploadImages(selectedSectionIndex, event.target.files); event.target.value = ""; }} /></label>
        {selectedSection.items.map((item, itemIndex) => <div className="admin-about-item" key={item.id}>
          {item.imageUrl ? <img className="admin-about-image-preview" src={`/api/archive/file?path=${encodeURIComponent(item.imageUrl)}`} alt={`Ảnh ${itemIndex + 1}`} /> : <span className="admin-about-image-empty">Chưa có ảnh</span>}
          <input value={item.imageUrl ?? ""} onChange={(event) => updateSection(selectedSectionIndex, { ...selectedSection, items: selectedSection.items.map((entry, i) => i === itemIndex ? { ...entry, imageUrl: event.target.value } : entry) })} placeholder="Đường dẫn ảnh" />
          <button type="button" className="admin-danger" onClick={() => updateSection(selectedSectionIndex, { ...selectedSection, items: selectedSection.items.filter((_, i) => i !== itemIndex) })}><Trash2 size={15} />Xóa</button>
        </div>)}
      </section>
    </div>}
    <button type="button" disabled={saving} onClick={save}><Save size={17} />{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
  </article>;
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
