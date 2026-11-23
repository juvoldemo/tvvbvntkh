"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Save, Upload } from "lucide-react";
import { InvitationSettings, validateInvitationSettings } from "@/lib/invitation-settings";
import { drawConfiguredInvitation } from "@/lib/invitation-renderer";
import { canvasToBlob, downloadInvitationFile } from "@/lib/invitation-canvas";
import { requestInvitationSettings } from "@/lib/invitation-settings-request";

export default function InvitationSettingsPanel() {
  const [settings, setSettings] = useState<InvitationSettings | null>(null);
  const [sample, setSample] = useState("Nguyễn Văn An");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"banner" | "image" | null>(null);
  const [uploadNames, setUploadNames] = useState({ banner: "", image: "" });
  const [dirty, setDirty] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState("");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const renderId = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  async function load() {
    setLoading(true); setNotice("");
    try {
      const data = await requestInvitationSettings({ cache: "no-store" });
      if (!validateInvitationSettings(data)) throw new Error("Không tải được cấu hình thư mời.");
      setSettings(data); setDirty(false);
    } catch (e) { setNotice((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!settings?.image) return;
    setImage(null); setImageError("");
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImageError("Không tải được ảnh mẫu. Vui lòng upload lại.");
    img.src = settings.image;
    return () => { img.onload = null; img.onerror = null; };
  }, [settings?.image]);
  useEffect(() => {
    const id = ++renderId.current;
    if (!settings || !image || !canvas) return;
    const target = canvas;
    const buffer = document.createElement("canvas");
    void drawConfiguredInvitation(buffer, image, sample.trim(), settings).then(() => {
      if (id !== renderId.current) return;
      target.width = buffer.width; target.height = buffer.height;
      target.getContext("2d")?.drawImage(buffer, 0, 0);
    }).catch(() => setImageError("Không tạo được bản xem trước."));
    return () => { renderId.current++; };
  }, [settings, image, sample, canvas]);

  function update(patch: Partial<InvitationSettings>) {
    setSettings(current => current ? { ...current, ...patch } : current); setDirty(true); setNotice("");
  }
  function text(patch: Partial<InvitationSettings["text"]>) {
    setSettings(current => current ? { ...current, text: { ...current.text, ...patch } } : current); setDirty(true); setNotice("");
  }
  async function upload(kind: "banner" | "image", file?: File) {
    if (!file || busy) return;
    setBusy(true); setUploading(kind); setNotice("");
    try {
      if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("Ảnh cần nhỏ hơn hoặc bằng 20 MB.");
      const decoded = await createImageBitmap(file);
      const pixels = decoded.width * decoded.height;
      decoded.close();
      if (pixels > 40000000) throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh dưới 40 triệu điểm ảnh.");
      const form = new FormData(); form.set("file", file);
      const result = await requestInvitationSettings({ method: "POST", body: form }) as { url?: string; error?: string };
      if (!result.url) throw new Error(result.error || "Không tải ảnh lên được.");
      update({ [kind]: result.url });
      setUploadNames(current => ({ ...current, [kind]: file.name }));
      setNotice("Đã tải ảnh lên. Bấm Lưu thay đổi để áp dụng cho user.");
    } catch (e) { setNotice((e as Error).message || "Không đọc được ảnh."); }
    finally { setBusy(false); setUploading(null); }
  }
  async function save() {
    if (!settings || busy) return;
    if (!validateInvitationSettings(settings)) { setNotice("Vui lòng kiểm tra tiêu đề và các thông số chữ."); return; }
    setBusy(true); setNotice("");
    try {
      await requestInvitationSettings({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      setDirty(false); setNotice("Đã lưu. Giao diện user sẽ cập nhật trong tối đa 30 giây hoặc khi tải lại trang.");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  function position(event: PointerEvent<HTMLDivElement>) {
    if (busy || !image || !preview.current) return;
    const rect = preview.current.getBoundingClientRect();
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
    text({ x: clamp((event.clientX - rect.left) / rect.width * 100), y: clamp((event.clientY - rect.top) / rect.height * 100) });
  }
  async function download() {
    const current = settingsRef.current;
    if (!current || !image) return;
    try {
      const target = document.createElement("canvas");
      await drawConfiguredInvitation(target, image, sample.trim(), current);
      downloadInvitationFile(new File([await canvasToBlob(target)], "thu-moi-xem-truoc.png", { type: "image/png" }));
    } catch { setNotice("Không xuất được ảnh xem trước."); }
  }

  if (loading) return <article className="admin-card">Đang tải cấu hình thư mời...</article>;
  if (!settings) return <article className="admin-card"><p role="alert">{notice}</p><button onClick={() => void load()}>Thử lại</button></article>;
  return <article className="admin-card invitation-settings">
    <header className="invitation-settings-header"><div><h2>Tạo thư</h2></div><div className="invitation-settings-actions"><button disabled={busy || !dirty} onClick={() => void save()}><Save size={18} />{busy ? "Đang xử lý..." : "Lưu thay đổi"}</button><button type="button" disabled={!image || busy} onClick={() => void download()}><Download size={16} />Tải thử PNG</button></div></header>
    {notice && <p className="admin-count" role="status">{notice}</p>}
    <div className="invitation-settings-grid">
      <fieldset disabled={busy} className="invitation-settings-controls">
        <label className="invitation-visibility"><span>Hiện trên giao diện user</span><input type="checkbox" checked={settings.visible} onChange={e => update({ visible: e.target.checked })} /></label>
        <InvitationUpload title="Banner trên trang chủ" fileName={uploadNames.banner} uploading={uploading === "banner"} disabled={busy} onSelect={file => void upload("banner", file)} />
        <img className="invitation-banner-preview" src={settings.banner} alt="Banner thư mời" />
        <InvitationUpload title="Ảnh mẫu thư mời" fileName={uploadNames.image} uploading={uploading === "image"} disabled={busy} onSelect={file => void upload("image", file)} />
        <label>Tên khách hàng xem thử<input value={sample} maxLength={60} onChange={e => setSample(e.target.value.replace(/[\r\n]/g, " "))} /></label>
        <div className="invitation-text-controls">
          <label>Cỡ chữ (% chiều rộng)<input type="number" min={.5} max={15} step={.1} value={settings.text.size} onChange={e => text({ size: Number(e.target.value) })} /></label>
          <label>Độ rộng tên (%)<input type="number" min={5} max={100} step={1} value={settings.text.width} onChange={e => text({ width: Number(e.target.value) })} /></label>
          <label>Màu tên<input type="color" value={settings.text.color} onChange={e => text({ color: e.target.value })} /></label>
          <label>Căn tên<select value={settings.text.align} onChange={e => text({ align: e.target.value as CanvasTextAlign })}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>
        </div>
      </fieldset>
      <section className="invitation-settings-preview">
        {imageError ? <p role="alert">{imageError}</p> : !image ? <p>Đang tải ảnh mẫu...</p> : null}
        <div ref={preview} className="invitation-position-preview" style={{ display: image && !imageError ? "block" : "none" }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); position(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) position(e); }} onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>
          <canvas ref={setCanvas} />
          <span className="invitation-position-marker" style={{ left: `${settings.text.x}%`, top: `${settings.text.y}%` }} aria-hidden="true" />
        </div>
      </section>
    </div>
  </article>;
}

export function InvitationUpload({ title, fileName, uploading, disabled, onSelect }: {
  title: string; fileName: string; uploading: boolean; disabled: boolean; onSelect: (file?: File) => void;
}) {
  return <div className={`invitation-upload-box${disabled ? " disabled" : ""}`} tabIndex={disabled ? -1 : 0} role="group" aria-label={title} onClick={e => { if (!(e.target as HTMLElement).closest("label, input")) e.currentTarget.focus(); }} onPaste={e => {
    if (disabled) return;
    const item = Array.from(e.clipboardData.items).find(item => item.kind === "file" && item.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    onSelect(file);
  }}>
    <span className="invitation-upload-icon">{uploading ? <LoaderCircle size={21} className="hnkh-spin" /> : <Upload size={21} />}</span>
    <span className="invitation-upload-copy"><strong>{title}</strong><small title={fileName}>{uploading ? "Đang tải ảnh..." : fileName || "PNG, JPG, WebP · Tối đa 20 MB"}</small><small>Bấm vào khối rồi Ctrl+V để dán ảnh</small></span>
    <label className="invitation-upload-trigger">{uploading ? "Đang tải" : "Chọn ảnh"}
    <input aria-label={title} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e => { onSelect(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  </div>;
}
