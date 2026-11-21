"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Maximize, RotateCcw, Save, X } from "lucide-react";
import { BanDinhReportSummary, BanDinhSession, BanDinhSettings, validBanDinhSettings } from "@/lib/ban-dinh";
import "./ban-dinh-show.css";
import BanDinhArrivals from "./BanDinhArrivals";
import { InvitationUpload } from "./InvitationSettingsPanel";

export default function BanDinhSettingsPanel() {
  const [settings, setSettings] = useState<BanDinhSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"banner" | "showImage" | null>(null);
  const [showName, setShowName] = useState("");
  const [showError, setShowError] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [showRatio, setShowRatio] = useState(16 / 9);
  const [previewKind, setPreviewKind] = useState<"banner" | "showImage">("banner");
  const showDialog = useRef<HTMLDialogElement>(null);
  const showFullscreen = useRef<HTMLDivElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const [resetting, setResetting] = useState(false);
  function openShow() {
    const dialog = showDialog.current;
    if (!dialog || !settings?.showImage) return;
    setShowError(false);
    setShowActive(true);
    void loadReports(true);
    document.documentElement.classList.add("ban-dinh-show-open");
    // Open the modal after fullscreen so it is above the fullscreen backdrop
    // in the browser's top layer, rather than hidden behind a black surface.
    if (!document.fullscreenElement && showFullscreen.current?.requestFullscreen) {
      void showFullscreen.current.requestFullscreen({ navigationUI: "hide" }).then(() => {
        if (dialog.isConnected && !dialog.open) dialog.showModal();
      }).catch(() => {
        if (dialog.isConnected && !dialog.open) dialog.showModal();
        setNotice("Trình duyệt chưa cho phép toàn màn hình. Bạn có thể nhấn F11.");
      });
    } else if (!dialog.open) dialog.showModal();
  }
  function closeShow() {
    setShowActive(false);
    document.documentElement.classList.remove("ban-dinh-show-open");
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    showDialog.current?.close();
  }
  useEffect(() => {
    const onFullscreenChange = () => { if (!document.fullscreenElement) { setShowActive(false); showDialog.current?.close(); document.documentElement.classList.remove("ban-dinh-show-open"); } };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => { document.removeEventListener("fullscreenchange", onFullscreenChange); document.documentElement.classList.remove("ban-dinh-show-open"); };
  }, []);
  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [reports, setReports] = useState<BanDinhReportSummary | null>(null);
  const [reportError, setReportError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<BanDinhSession | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sessionRef = useRef<BanDinhSession | null>(null);
  const applySession = useCallback((next: BanDinhSession) => {
    if (!next || typeof next.running !== "boolean") throw new Error("Trạng thái nhận số liệu không hợp lệ.");
    const version = (value: BanDinhSession | null) => Date.parse(value?.endedAt || value?.startedAt || "") || 0;
    // A delayed report must not reopen a session that was already ended.
    if (version(next) < version(sessionRef.current)) return;
    sessionRef.current = next;
    setSession(next);
  }, []);
  async function exportStatistics() {
    if (exporting) return;
    setExporting(true); setNotice("");
    try {
      const response = await fetch("/api/admin/ban-dinh-export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Không xuất được thống kê.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "ban-dinh-3.0.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setNotice((e as Error).message); }
    finally { setExporting(false); }
  }
  const reportRequest = useRef<AbortController | null>(null);
  const loadReports = useCallback(async (force = false) => {
    if (reportRequest.current && !force) return;
    reportRequest.current?.abort();
    const controller = new AbortController();
    reportRequest.current = controller; setRefreshing(true);
    try {
      const response = await fetch("/api/admin/ban-dinh-reports", { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.rows) || !result.totals || typeof result.session?.running !== "boolean") throw new Error(result.error || "Không tải được số liệu.");
      if (!controller.signal.aborted) { setReports(result); applySession(result.session); setReportError(""); }
    } catch (e) { if (!controller.signal.aborted) setReportError((e as Error).message); }
    finally { if (reportRequest.current === controller) { reportRequest.current = null; setRefreshing(false); } }
  }, [applySession]);
  useEffect(() => {
    void loadReports();
    return () => { reportRequest.current?.abort(); reportRequest.current = null; };
  }, [loadReports]);
  useEffect(() => {
    if (!session?.running || sessionBusy) return;
    const refresh = () => { void loadReports(); };
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [session?.running, sessionBusy, loadReports]);
  async function changeSession(action: "start" | "end") {
    if (sessionBusy) return;
    if (action === "end" && !window.confirm("Kết thúc nhận số liệu Bán đỉnh 3.0?\n\nTVV sẽ không thể nhập hoặc chỉnh sửa số liệu. Trang thống kê sẽ ngừng tự cập nhật.")) return;
    setSessionBusy(true); setNotice("");
    reportRequest.current?.abort(); reportRequest.current = null;
    try {
      const response = await fetch("/api/admin/ban-dinh-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không đổi được trạng thái.");
      applySession(result.session);
      setNotice(action === "end" ? "Đã kết thúc nhận số liệu." : "Đã bắt đầu nhận số liệu.");
      void loadReports(true);
    } catch (e) { setNotice((e as Error).message); }
    finally { setSessionBusy(false); }
  }
  async function resetStatistics() {
    if (resetting || sessionBusy || busy) return;
    setResetting(true); setSessionBusy(true); setNotice("");
    reportRequest.current?.abort(); reportRequest.current = null;
    try {
      const response = await fetch("/api/admin/ban-dinh-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không reset được số liệu.");
      applySession(result.session);
      setReports({ rows: [], totals: { users: 0, consultations: 0, contracts: 0 } });
      setReportError("");
      resetDialog.current?.close();
      setNotice("Đã reset số liệu về 0. Hình ảnh được giữ nguyên. Bấm Bắt đầu để nhận số liệu mới.");
    } catch (e) { resetDialog.current?.close(); setNotice((e as Error).message); }
    finally { setResetting(false); setSessionBusy(false); }
  }
  async function load() {
    setNotice("");
    try {
      const r = await fetch("/api/admin/ban-dinh-settings", { cache: "no-store" });
      const data: unknown = await r.json();
      if (!r.ok || !validBanDinhSettings(data)) throw new Error("Không tải được cấu hình Bán đỉnh 3.0.");
      setSettings(data);
    } catch (e) { setNotice((e as Error).message); }
  }
  useEffect(() => { void load(); }, []);
  async function upload(kind: "banner" | "showImage", file?: File) {
    if (!file || busy || !settings) return;
    setPreviewKind(kind);
    setBusy(true); setUploading(kind); setNotice("");
    try {
      if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("Ảnh cần nhỏ hơn hoặc bằng 20 MB.");
      const img = await createImageBitmap(file);
      const pixels = img.width * img.height; img.close();
      if (pixels > 40000000) throw new Error("Vui lòng chọn ảnh dưới 40 triệu điểm ảnh.");
      const form = new FormData(); form.set("file", file);
      const r = await fetch("/api/admin/invitation-settings", { method: "POST", body: form });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Không tải ảnh lên được.");
      const next = { ...settings, [kind]: result.url };
      setSettings(next);
      if (kind === "banner") setName(file.name); else setShowName(file.name);
      setDirty(true);
      const saved = await fetch("/api/admin/ban-dinh-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const savedResult = await saved.json();
      if (!saved.ok) throw new Error(savedResult.error || "Ảnh đã tải lên nhưng chưa lưu được cấu hình. Bấm Lưu thay đổi để thử lại.");
      setDirty(false);
      setNotice(`Đã tải ${kind === "banner" ? "banner" : "ảnh Show"}. Đã tự động lưu.`);
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); setUploading(null); }
  }
  async function save() {
    if (!settings || busy) return;
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/admin/ban-dinh-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Không lưu được banner.");
      setDirty(false); setNotice("Đã lưu thay đổi.");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  if (!settings) return <article className="admin-card invitation-settings">{notice ? <><p role="alert">{notice}</p><button onClick={() => void load()}>Thử lại</button></> : "Đang tải cấu hình..."}</article>;
  const presentationImage = settings.showImage;
  const previewImage = settings[previewKind];
  const statisticsOverlay = <>
    <div className="ban-dinh-show-participants" aria-label="Số TVV đã tham gia"><strong>{reports ? reports.totals.users.toLocaleString("vi-VN") : "—"}</strong></div>
    <div className="ban-dinh-show-total ban-dinh-show-consultations" aria-label="Tổng số cuộc tư vấn cá nhân"><span>{reports ? reports.totals.consultations.toLocaleString("vi-VN") : "—"}</span></div>
    <div className="ban-dinh-show-total ban-dinh-show-contracts" aria-label="Tổng số hợp đồng khai thác mới"><span>{reports ? reports.totals.contracts.toLocaleString("vi-VN") : "—"}</span></div>
  </>;
  return <article className="admin-card invitation-settings">
    <header className="invitation-settings-header"><h2>Bán đỉnh 3.0</h2><div className="invitation-settings-actions"><button disabled={busy || !dirty} onClick={() => void save()}><Save size={18} />Lưu thay đổi</button></div></header>
    {notice && <p className="admin-count" role="status">{notice}</p>}
    <div className="ban-dinh-session-controls"><span role="status">{session ? session.running ? "Đang nhận số liệu · Cập nhật mỗi 2 giây" : session.endedAt ? "Đã kết thúc · TVV không thể nhập số liệu" : "Chưa bắt đầu · TVV chưa thể nhập số liệu" : "Đang tải trạng thái..."}</span><div><button type="button" disabled={!session || session.running || sessionBusy || busy} onClick={() => void changeSession("start")}>Bắt đầu</button><button type="button" disabled={!presentationImage || busy} onClick={openShow} title={presentationImage ? "Hiển thị ảnh toàn màn hình" : "Tải ảnh Show lên trước"}><Maximize size={15} />Show</button><button type="button" disabled={exporting} onClick={() => void exportStatistics()}><Download size={15} />{exporting ? "Đang xuất..." : "Thống kê"}</button><button type="button" disabled={!session?.running || sessionBusy || busy} onClick={() => void changeSession("end")}>Kết thúc</button><button type="button" className="ban-dinh-reset-button" disabled={busy || sessionBusy} onClick={() => resetDialog.current?.showModal()}><RotateCcw size={15} />Reset</button></div></div>
    <div className="invitation-settings-grid">
      <fieldset className="invitation-settings-controls" disabled={busy}>
        <label className="invitation-visibility"><span>Hiện trên giao diện user</span><input type="checkbox" checked={settings.visible} onChange={e => { setSettings({ ...settings, visible: e.target.checked }); setDirty(true); setNotice(""); }} /></label>
        <label className="invitation-visibility"><span>Chỉ hiện cho admin</span><input type="checkbox" checked={Boolean(settings.adminOnly)} onChange={e => { setSettings({ ...settings, adminOnly: e.target.checked }); setDirty(true); setNotice(""); }} /></label>
        <div className={`ban-dinh-preview-choice${previewKind === "banner" ? " selected" : ""}`} onClickCapture={() => setPreviewKind("banner")} onFocusCapture={() => setPreviewKind("banner")}>
          <InvitationUpload title="Banner Bán đỉnh 3.0" fileName={name} uploading={uploading === "banner"} disabled={busy} onSelect={file => void upload("banner", file)} />
        </div>
        <div className={`ban-dinh-preview-choice${previewKind === "showImage" ? " selected" : ""}`} onClickCapture={() => setPreviewKind("showImage")} onFocusCapture={() => setPreviewKind("showImage")}>
          <InvitationUpload title="Ảnh Show" fileName={showName} uploading={uploading === "showImage"} disabled={busy} onSelect={file => void upload("showImage", file)} />
        </div>
      </fieldset>
      <div className="ban-dinh-admin-preview">{previewImage ? <div className="ban-dinh-show-stage ban-dinh-show-preview"><img src={previewImage} alt={previewKind === "banner" ? "Banner Bán đỉnh 3.0" : "Ảnh Show Bán đỉnh 3.0"} />{previewKind === "showImage" && statisticsOverlay}</div> : <p>{previewKind === "banner" ? "Chưa có banner" : "Chưa có ảnh Show. Vui lòng chọn ảnh để tải lên."}</p>}
        <section className="ban-dinh-fields-preview">
          <header className="ban-dinh-report-heading"><strong>Số liệu đã ghi nhận{reports ? ` · ${reports.totals.users} người` : ""}</strong><button type="button" disabled={refreshing} onClick={() => void loadReports()} aria-label="Làm mới số liệu"><RotateCcw size={15} />{refreshing ? "Đang tải..." : "Làm mới"}</button></header>
          {reportError && <p role="alert">{reportError}{reports ? " Đang hiển thị số liệu tải thành công gần nhất." : ""}</p>}
          <div className="ban-dinh-report-totals"><div><span>Số cuộc tư vấn cá nhân</span><strong>{reports ? reports.totals.consultations.toLocaleString("vi-VN") : "—"}</strong></div><div><span>Số hợp đồng khai thác mới</span><strong>{reports ? reports.totals.contracts.toLocaleString("vi-VN") : "—"}</strong></div></div>
          {reports && !reports.rows.length && <p>Chưa có user lưu số liệu.</p>}
        </section>
      </div>
    </div>
    {reports && reports.rows.length > 0 && <div className="ban-dinh-report-table"><table><thead><tr><th>TVV</th><th>Số cuộc tư vấn cá nhân</th><th>Số hợp đồng khai thác mới</th><th>Cập nhật</th></tr></thead><tbody>{reports.rows.map(row => <tr key={row.advisorCode}><td><strong>{row.advisorName}</strong><small>{row.advisorCode}</small></td><td>{row.consultations.toLocaleString("vi-VN")}</td><td>{row.contracts.toLocaleString("vi-VN")}</td><td>{new Date(row.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td></tr>)}</tbody></table></div>}
    <dialog ref={resetDialog} className="ban-dinh-reset-dialog" aria-labelledby="ban-dinh-reset-title" onCancel={event => { if (resetting) event.preventDefault(); }}>
      <h3 id="ban-dinh-reset-title">Reset số liệu Bán đỉnh 3.0?</h3>
      <p>Số TVV tham gia, số cuộc tư vấn và số hợp đồng sẽ về 0. Hệ thống sẽ dừng nhận số liệu.</p>
      <p>Banner và Ảnh Show vẫn được giữ nguyên.</p>
      <div><button type="button" disabled={resetting} onClick={() => resetDialog.current?.close()}>Hủy</button><button type="button" className="ban-dinh-reset-button" disabled={resetting} onClick={() => void resetStatistics()}>{resetting ? "Đang reset..." : "Xác nhận reset"}</button></div>
    </dialog>
    <div ref={showFullscreen} className="ban-dinh-fullscreen-root">
    <dialog ref={showDialog} className="ban-dinh-show-dialog" aria-label="Ảnh Show Bán đỉnh 3.0" onCancel={event => { event.preventDefault(); closeShow(); }}>
      <button type="button" className="ban-dinh-show-close" onClick={closeShow} aria-label="Đóng ảnh Show"><X size={22} /></button>
      {showError ? <p role="alert">Không tải được ảnh Show. Vui lòng đóng và tải ảnh lên lại.</p> : presentationImage && <div className="ban-dinh-show-stage" style={{ width: `min(100vw, calc(100dvh * ${showRatio}))`, aspectRatio: showRatio }}>
        <img src={presentationImage} alt="Ảnh Show Bán đỉnh 3.0" onLoad={event => setShowRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} onError={() => setShowError(true)} />
        {statisticsOverlay}
        {reportError && <div className="ban-dinh-show-report-error" role="status">{reports ? "Chưa cập nhật được số liệu mới nhất" : "Không tải được số liệu"}</div>}
      </div>}
      <BanDinhArrivals reports={reports} active={showActive} />
    </dialog>
    </div>
  </article>;
}
