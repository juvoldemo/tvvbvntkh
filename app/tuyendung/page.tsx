"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import styles from "./page.module.css";

type SelectionState = "available" | "mine" | "taken";
type ListCandidate = {
  id: string;
  advisorCode: string;
  advisorName: string;
  recruiterName: string;
  pdt2017To2025: number;
  selectionState: SelectionState;
};
type DetailCandidate = {
  id: string;
  advisorCode: string;
  advisorName: string;
  recruiterCode: string;
  recruiterName: string;
  startDate: string;
  inactiveMonths: number;
  pdt2017To2025: number;
  deposit: number;
  phone: string;
  address: string;
};
type Usage = {
  selectedCount: number;
  selectionLimit: number;
  remainingSlots: number;
  changesUsed: number;
  changeLimit: number;
  changesRemaining: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
};
type Leader = { advisorCode: string; fullName: string; groupName: string };
type Payload = {
  leader: Leader;
  usage: Usage;
  candidates: Array<ListCandidate | DetailCandidate>;
  pagination?: { page: number; pageSize: number; pageCount: number; total: number };
};
type AdminLeaderSelection = {
  leaderCode: string;
  leaderName: string;
  groupName: string;
  selectedCount: number;
  changesUsed: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  candidates: DetailCandidate[];
};
type AdminPayload = {
  selections: AdminLeaderSelection[];
  totals: { leaders: number; candidates: number };
  registryUpdatedAt: string;
};

function dateVi(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function phoneHref(value: string) {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export default function RecruitmentPoolPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"list" | "details" | "admin">("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listSort, setListSort] = useState<"name" | "pdt-desc" | "pdt-asc">("name");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [adminPayload, setAdminPayload] = useState<AdminPayload | null>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set());
  const [selectedAdminCandidate, setSelectedAdminCandidate] = useState<DetailCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyCandidate, setBusyCandidate] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [liveStatus, setLiveStatus] = useState("Đang kết nối");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams({
        view: tab,
        page: String(page),
        search: debouncedSearch,
        sort: listSort
      });
      const response = await fetch(`/api/recruitment-pool?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setAuthenticated(false);
        setPayload(null);
        return;
      }
      setAuthenticated(true);
      if (response.status === 403 && tab === "admin") {
        setAdminAuthenticated(false);
        setAdminPayload(null);
        setError("");
        return;
      }
      if (response.status === 403 && tab === "details") {
        setPayload(null);
        setTab("list");
        setPage(1);
        setError(data.error || "Vui lòng xác nhận danh sách trước khi xem chi tiết.");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Không tải được danh sách tuyển dụng.");
      if (tab === "admin") {
        setAdminAuthenticated(true);
        setAdminPayload(data);
      } else {
        setPayload(data);
      }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được danh sách tuyển dụng.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [tab, page, debouncedSearch, listSort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!authenticated) return;
    let refreshTimer: number | undefined;
    const refresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(true), 120);
    };
    const pollingTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 2500);
    const localChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("recruitment-pool-updates") : null;
    if (localChannel) localChannel.onmessage = refresh;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setLiveStatus("Cập nhật mỗi 2,5 giây");
      return () => {
        if (refreshTimer) window.clearTimeout(refreshTimer);
        window.clearInterval(pollingTimer);
        localChannel?.close();
      };
    }
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const channel = supabase
      .channel("recruitment-pool-live")
      .on("broadcast", { event: "changed" }, refresh)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "team_target_registrations",
        filter: "target_month=eq.2099-12-01"
      }, refresh)
      .subscribe((status) => {
        setLiveStatus(status === "SUBSCRIBED" ? "Đang cập nhật trực tiếp" : "Cập nhật mỗi 2,5 giây");
      });
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.clearInterval(pollingTimer);
      localChannel?.close();
      void supabase.removeChannel(channel);
    };
  }, [authenticated, load]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/user/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không đăng nhập được.");
      setAuthenticated(true);
      await load();
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : "Không đăng nhập được.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await Promise.all([
      fetch("/api/user/auth", { method: "DELETE" }),
      fetch("/api/recruitment-pool/admin-auth", { method: "DELETE" })
    ]);
    setAuthenticated(false);
    setPayload(null);
    setAdminPayload(null);
    setAdminAuthenticated(null);
    setUsername("");
    setPassword("");
  }

  async function toggleCandidate(candidate: ListCandidate) {
    if (busyCandidate || candidate.selectionState === "taken") return;
    setBusyCandidate(candidate.advisorCode);
    setError("");
    try {
      const response = await fetch("/api/recruitment-pool", {
        method: candidate.selectionState === "mine" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.advisorCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không cập nhật được lựa chọn.");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("recruitment-pool-updates");
        channel.postMessage({ candidateId: candidate.advisorCode });
        channel.close();
      }
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được lựa chọn.");
      await load(true);
    } finally {
      setBusyCandidate("");
    }
  }

  async function confirmSelections() {
    if (confirmBusy || !payload?.usage.selectedCount) return;
    setConfirmBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recruitment-pool", { method: "PATCH" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không xác nhận được danh sách lựa chọn.");
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xác nhận được danh sách lựa chọn.");
    } finally {
      setConfirmBusy(false);
    }
  }

  async function clearSelections() {
    if (clearBusy || !payload?.usage.selectedCount) return;
    const accepted = window.confirm(
      `Bạn có chắc muốn bỏ chọn tất cả ${payload.usage.selectedCount} TVV?`
    );
    if (!accepted) return;

    setClearBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recruitment-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không bỏ chọn được toàn bộ danh sách.");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("recruitment-pool-updates");
        channel.postMessage({ clearAll: true });
        channel.close();
      }
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không bỏ chọn được toàn bộ danh sách.");
      await load(true);
    } finally {
      setClearBusy(false);
    }
  }

  async function loginAdmin(event: FormEvent) {
    event.preventDefault();
    if (adminBusy || !adminPassword) return;
    setAdminBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recruitment-pool/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không đăng nhập được trang quản trị.");
      setAdminAuthenticated(true);
      setAdminPassword("");
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không đăng nhập được trang quản trị.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function resetAllSelections() {
    if (resetBusy || !adminPayload?.totals.candidates) return;
    const accepted = window.confirm(
      `Reset toàn bộ ${adminPayload.totals.candidates} TVV đã chọn của ${adminPayload.totals.leaders} Trưởng nhóm? Thao tác này không thể hoàn tác.`
    );
    if (!accepted) return;

    setResetBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recruitment-pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-all" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không reset được danh sách.");
      setExpandedLeaders(new Set());
      setSelectedAdminCandidate(null);
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("recruitment-pool-updates");
        channel.postMessage({ resetAll: true });
        channel.close();
      }
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không reset được danh sách.");
    } finally {
      setResetBusy(false);
    }
  }

  function toggleLeader(leaderCode: string) {
    setExpandedLeaders((current) => {
      const next = new Set(current);
      if (next.has(leaderCode)) next.delete(leaderCode);
      else next.add(leaderCode);
      return next;
    });
  }

  const pages = useMemo(() => {
    const count = payload?.pagination?.pageCount ?? 1;
    const current = payload?.pagination?.page ?? 1;
    const start = Math.max(1, Math.min(current - 2, count - 4));
    return Array.from({ length: Math.min(5, count) }, (_, index) => start + index);
  }, [payload?.pagination]);

  if (authenticated === null || (loading && !payload && authenticated !== false)) {
    return <main className={styles.loadingPage}><LoaderCircle className={styles.spin} size={34} /><p>Đang tải cổng tuyển dụng…</p></main>;
  }

  if (!authenticated) {
    return <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.brandMark}><UsersRound size={35} /></div>
        <p className={styles.eyebrow}>BẢO VIỆT NHÂN THỌ</p>
        <h1>Cổng tuyển dụng TVV</h1>
        <p>Dùng chung Mã TVV và mật khẩu đang đăng nhập trên bandothunhap.com.</p>
        <form onSubmit={login}>
          <label><span>Mã TVV Trưởng nhóm</span><div><UserRound size={19} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập Mã TVV" autoCapitalize="characters" autoComplete="username" required /></div></label>
          <label><span>Mật khẩu</span><div><LockKeyhole size={19} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required /></div></label>
          {loginError && <p className={styles.formError}><CircleAlert size={17} />{loginError}</p>}
          <button type="submit" disabled={loginBusy || !username.trim() || !password}>{loginBusy ? <LoaderCircle className={styles.spin} size={19} /> : <ShieldCheck size={19} />}{loginBusy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        </form>
      </section>
    </main>;
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <span className={styles.headerIcon}><UsersRound size={28} /></span>
        <div><p>BẢO VIỆT NHÂN THỌ</p><h1>Danh sách TVV cần tuyển dụng</h1></div>
      </div>
      <div className={styles.headerProfile}>
        <span><i />{liveStatus}</span>
        <div><b>{payload?.leader?.fullName || "Trưởng nhóm"}</b><small>{payload?.leader?.groupName || ""}</small></div>
        <button type="button" onClick={logout} aria-label="Đăng xuất"><LogOut size={19} /></button>
      </div>
    </header>

    <section className={styles.workspace}>
      {tab !== "admin" && <div className={styles.stats}>
        <article><span><BadgeCheck size={23} /></span><div><small>Đã lựa chọn</small><strong>{payload?.usage.selectedCount ?? 0}/{payload?.usage.selectionLimit ?? 15}</strong></div></article>
        <article><span><Clock3 size={23} /></span><div><small>Lượt thay đổi còn lại</small><strong>{payload?.usage.changesRemaining ?? 3}/{payload?.usage.changeLimit ?? 3}</strong></div></article>
        <p>Mỗi lần bỏ một TVV đã chọn được tính là một lượt thay đổi. Trưởng nhóm khác không nhìn thấy người đã chọn.</p>
      </div>}

      <nav className={styles.tabs}>
        <button type="button" className={tab === "list" ? styles.activeTab : ""} onClick={() => { setTab("list"); setPage(1); }}><ListChecks size={19} />Danh sách</button>
        <button
          type="button"
          className={tab === "details" ? styles.activeTab : ""}
          disabled={!payload?.usage.isConfirmed}
          title={!payload?.usage.isConfirmed ? "Hãy xác nhận danh sách trước khi xem chi tiết" : undefined}
          onClick={() => { setTab("details"); setPage(1); }}
        ><UserRound size={19} />Chi tiết lựa chọn {!payload?.usage.isConfirmed && <LockKeyhole size={14} />}<b>{payload?.usage.selectedCount ?? 0}</b></button>
        <button
          type="button"
          className={tab === "admin" ? styles.activeTab : ""}
          onClick={() => { setTab("admin"); setPage(1); setError(""); }}
        ><Settings size={19} />Quản trị<LockKeyhole size={14} /></button>
      </nav>

      {error && <div className={styles.errorBanner}><CircleAlert size={18} /><span>{error}</span></div>}

      {tab === "list" ? <section className={styles.listPanel}>
        <div className={styles.toolbar}>
          <div><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, mã TVV hoặc TVV tuyển dụng…" /></div>
          <label className={styles.sortControl}>
            <span>PĐT</span>
            <select value={listSort} onChange={(event) => { setPage(1); setListSort(event.target.value as typeof listSort); }}>
              <option value="name">Tên A-Z</option>
              <option value="pdt-desc">PĐT lớn trước</option>
              <option value="pdt-asc">PĐT nhỏ trước</option>
            </select>
          </label>
          <p><b>{payload?.pagination?.total ?? 0}</b> TVV · {payload?.pagination?.pageSize ?? 20} người mỗi trang</p>
        </div>
        {loading && payload ? <div className={styles.inlineLoading}><LoaderCircle className={styles.spin} size={21} />Đang cập nhật…</div> : null}
        <div className={`${styles.confirmPanel} ${payload?.usage.isConfirmed ? styles.confirmed : ""}`}>
          <span><ShieldCheck size={24} /></span>
          <div>
            <b>{payload?.usage.isConfirmed ? "Danh sách đã được xác nhận" : "Xác nhận danh sách lựa chọn"}</b>
            <p>{payload?.usage.isConfirmed
              ? "Bạn có thể mở tab Chi tiết lựa chọn. Nếu thay đổi danh sách, bạn cần xác nhận lại."
              : "Sau khi xác nhận, thông tin chi tiết của các TVV bạn đã chọn mới được hiển thị."}</p>
          </div>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.clearAllButton}
              disabled={clearBusy || confirmBusy || !payload?.usage.selectedCount}
              onClick={clearSelections}
            >
              {clearBusy ? <LoaderCircle className={styles.spin} size={19} /> : <Trash2 size={19} />}
              {clearBusy ? "Đang bỏ chọn…" : "Bỏ chọn tất cả"}
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              disabled={confirmBusy || clearBusy || !payload?.usage.selectedCount || payload?.usage.isConfirmed}
              onClick={confirmSelections}
            >
              {confirmBusy ? <LoaderCircle className={styles.spin} size={19} /> : <BadgeCheck size={19} />}
              {confirmBusy ? "Đang xác nhận…" : payload?.usage.isConfirmed ? "Đã xác nhận" : "Xác nhận lựa chọn"}
            </button>
          </div>
        </div>
        <div className={styles.candidateList}>
          {(payload?.candidates as ListCandidate[] ?? []).map((candidate, index) => {
            const isMine = candidate.selectionState === "mine";
            const isTaken = candidate.selectionState === "taken";
            const cannotRelease = isMine && (payload?.usage.changesRemaining ?? 0) <= 0;
            const ordinal = ((payload?.pagination?.page ?? 1) - 1) * (payload?.pagination?.pageSize ?? 20) + index + 1;
            return <button
              type="button"
              key={candidate.advisorCode}
              className={`${styles.candidateRow} ${isMine ? styles.mine : ""} ${isTaken ? styles.taken : ""}`}
              disabled={isTaken || cannotRelease || busyCandidate === candidate.advisorCode}
              onClick={() => toggleCandidate(candidate)}
              title={isTaken ? "TVV này đã được lựa chọn" : cannotRelease ? "Bạn đã hết lượt thay đổi" : undefined}
            >
              <span className={styles.ordinal}>{ordinal}</span>
              <span className={styles.checkbox}>{busyCandidate === candidate.advisorCode ? <LoaderCircle className={styles.spin} size={17} /> : isMine ? <BadgeCheck size={18} /> : null}</span>
              <span className={styles.candidateIdentity}><b>{candidate.advisorName}</b><small>{candidate.advisorCode}</small></span>
              <span className={styles.recruiter}><small>TVV tuyển dụng</small><b>{candidate.recruiterName}</b></span>
              <span className={styles.pdtColumn}><small>PĐT 2017-12/2025</small><b>{money(candidate.pdt2017To2025)}</b></span>
              <span className={styles.state}>{isMine ? "Đã chọn" : isTaken ? "Đã được lựa chọn" : "Có thể chọn"}</span>
            </button>;
          })}
          {!loading && !(payload?.candidates?.length) && <div className={styles.empty}>Không tìm thấy TVV phù hợp.</div>}
        </div>
        {(payload?.pagination?.pageCount ?? 1) > 1 && <div className={styles.pagination}>
          <button type="button" disabled={(payload?.pagination?.page ?? 1) <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={18} />Trước</button>
          <div>{pages.map((item) => <button type="button" key={item} className={item === payload?.pagination?.page ? styles.currentPage : ""} onClick={() => setPage(item)}>{item}</button>)}</div>
          <span>Trang {payload?.pagination?.page}/{payload?.pagination?.pageCount}</span>
          <button type="button" disabled={(payload?.pagination?.page ?? 1) >= (payload?.pagination?.pageCount ?? 1)} onClick={() => setPage((current) => current + 1)}>Sau<ChevronRight size={18} /></button>
        </div>}
      </section> : tab === "details" ? <section className={styles.detailsPanel}>
        <header><div><h2>TVV bạn đã lựa chọn</h2><p>Thông tin chi tiết chỉ hiển thị cho Trưởng nhóm đã chọn TVV này.</p></div><strong>{payload?.usage.selectedCount ?? 0}/15 người</strong></header>
        <div className={styles.detailGrid}>
          {(payload?.candidates as DetailCandidate[] ?? []).map((candidate, index) => <article key={candidate.advisorCode}>
            <header><span>{index + 1}</span><div><h3>{candidate.advisorName}</h3><p>{candidate.advisorCode}</p></div></header>
            <dl>
              <div><dt>TVV tuyển dụng</dt><dd>{candidate.recruiterName || "—"}</dd></div>
              <div><dt>Ngày bắt đầu làm việc</dt><dd>{dateVi(candidate.startDate)}</dd></div>
              <div><dt>Số tháng không hoạt động</dt><dd>{candidate.inactiveMonths} tháng</dd></div>
              <div className={styles.pdtDetail}><dt>PĐT 2017-12/2025</dt><dd>{money(candidate.pdt2017To2025)}</dd></div>
              <div><dt>Ký quỹ</dt><dd>{money(candidate.deposit)}</dd></div>
              <div>
                <dt><Phone size={15} />SĐT</dt>
                <dd>{candidate.phone
                  ? <a className={styles.phoneLink} href={phoneHref(candidate.phone)} aria-label={`Gọi ${candidate.phone}`}>{candidate.phone}</a>
                  : "—"}</dd>
              </div>
              <div className={styles.address}><dt><MapPin size={15} />Địa chỉ</dt><dd>{candidate.address || "—"}</dd></div>
            </dl>
          </article>)}
        </div>
        {!loading && !(payload?.candidates?.length) && <div className={styles.empty}><UserRound size={28} /><b>Bạn chưa lựa chọn TVV nào</b><span>Quay lại tab Danh sách để bắt đầu lựa chọn.</span></div>}
      </section> : adminAuthenticated ? <section className={styles.adminPanel}>
        <header className={styles.adminPanelHeader}>
          <div>
            <span><Settings size={22} /></span>
            <div><h2>Quản trị lựa chọn TVV</h2><p>Theo dõi danh sách của toàn bộ Trưởng nhóm và reset khi cần thiết.</p></div>
          </div>
          <button
            type="button"
            className={styles.resetAllButton}
            disabled={resetBusy || !adminPayload?.totals.candidates}
            onClick={resetAllSelections}
          >
            {resetBusy ? <LoaderCircle className={styles.spin} size={18} /> : <RotateCcw size={18} />}
            {resetBusy ? "Đang reset…" : "Reset tất cả lại từ đầu"}
          </button>
        </header>

        <div className={styles.adminSummary}>
          <article><small>Trưởng nhóm đã chọn</small><strong>{adminPayload?.totals.leaders ?? 0}</strong></article>
          <article><small>Tổng TVV đang được chọn</small><strong>{adminPayload?.totals.candidates ?? 0}</strong></article>
        </div>

        {(adminPayload?.selections.length ?? 0) > 0 ? <div className={styles.adminTableWrap}>
          <table className={styles.adminTable}>
            <thead><tr><th>Trưởng nhóm</th><th>Nhóm</th><th>TVV đã chọn</th><th>Lượt sửa</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {adminPayload?.selections.map((selection) => {
                const expanded = expandedLeaders.has(selection.leaderCode);
                return <Fragment key={selection.leaderCode}>
                  <tr>
                    <td><button type="button" className={styles.leaderNameButton} onClick={() => toggleLeader(selection.leaderCode)}>{selection.leaderName}<small>{selection.leaderCode}</small></button></td>
                    <td>{selection.groupName || "—"}</td>
                    <td><b>{selection.selectedCount}</b> TVV</td>
                    <td>{selection.changesUsed}/3</td>
                    <td><span className={selection.isConfirmed ? styles.adminConfirmed : styles.adminPending}>{selection.isConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}</span></td>
                    <td><button type="button" className={`${styles.expandButton} ${expanded ? styles.expanded : ""}`} onClick={() => toggleLeader(selection.leaderCode)} aria-label={expanded ? "Thu gọn danh sách" : "Mở danh sách"}><ChevronDown size={19} /></button></td>
                  </tr>
                  {expanded && <tr className={styles.expandedRow}><td colSpan={6}>
                    <div className={styles.adminCandidateList}>
                      {selection.candidates.map((candidate, index) => <button type="button" key={candidate.advisorCode} onClick={() => setSelectedAdminCandidate(candidate)}>
                        <span>{index + 1}</span>
                        <div><b>{candidate.advisorName}</b><small>{candidate.advisorCode}</small></div>
                        <em>Xem chi tiết</em>
                      </button>)}
                    </div>
                  </td></tr>}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div> : <div className={styles.empty}><UsersRound size={30} /><b>Chưa có Trưởng nhóm nào lựa chọn TVV</b><span>Danh sách hiện đang ở trạng thái ban đầu.</span></div>}
      </section> : <section className={styles.adminLoginPanel}>
        <span><LockKeyhole size={28} /></span>
        <h2>Đăng nhập Quản trị</h2>
        <p>Nhập mật khẩu quản trị để xem và reset toàn bộ danh sách lựa chọn.</p>
        <form onSubmit={loginAdmin}>
          <div><LockKeyhole size={19} /><input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Mật khẩu quản trị" autoComplete="current-password" autoFocus /></div>
          <button type="submit" disabled={adminBusy || !adminPassword}>{adminBusy ? <LoaderCircle className={styles.spin} size={19} /> : <ShieldCheck size={19} />}{adminBusy ? "Đang kiểm tra…" : "Mở trang quản trị"}</button>
        </form>
      </section>}
    </section>

    {selectedAdminCandidate && <div className={styles.detailModalBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setSelectedAdminCandidate(null);
    }}>
      <section className={styles.detailModal} role="dialog" aria-modal="true" aria-label={`Chi tiết ${selectedAdminCandidate.advisorName}`}>
        <header>
          <div><small>THÔNG TIN TVV</small><h2>{selectedAdminCandidate.advisorName}</h2><p>{selectedAdminCandidate.advisorCode}</p></div>
          <button type="button" onClick={() => setSelectedAdminCandidate(null)} aria-label="Đóng"><X size={21} /></button>
        </header>
        <dl>
          <div><dt>TVV tuyển dụng</dt><dd>{selectedAdminCandidate.recruiterName || "—"}</dd></div>
          <div><dt>Ngày bắt đầu làm việc</dt><dd>{dateVi(selectedAdminCandidate.startDate)}</dd></div>
          <div><dt>Số tháng không hoạt động</dt><dd>{selectedAdminCandidate.inactiveMonths} tháng</dd></div>
          <div className={styles.pdtDetail}><dt>PĐT 2017-12/2025</dt><dd>{money(selectedAdminCandidate.pdt2017To2025)}</dd></div>
          <div><dt>Ký quỹ</dt><dd>{money(selectedAdminCandidate.deposit)}</dd></div>
          <div><dt><Phone size={15} />SĐT</dt><dd>{selectedAdminCandidate.phone ? <a className={styles.phoneLink} href={phoneHref(selectedAdminCandidate.phone)}>{selectedAdminCandidate.phone}</a> : "—"}</dd></div>
          <div className={styles.modalAddress}><dt><MapPin size={15} />Địa chỉ</dt><dd>{selectedAdminCandidate.address || "—"}</dd></div>
        </dl>
      </section>
    </div>}
  </main>;
}
