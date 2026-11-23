"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { defaultForumSettings, ForumSettings, validForumSettings } from "@/lib/forum-settings";
import { InvitationUpload } from "./InvitationSettingsPanel";

export default function ForumSettingsPanel() {
  const [settings, setSettings] = useState<ForumSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  async function load() {
    setNotice("");
    try {
      const r = await fetch("/api/admin/forum-settings", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok || !validForumSettings(data)) throw new Error(data.error || "Không tải được cấu hình.");
      setSettings(data);
    } catch (e) { setNotice((e as Error).message); }
  }
  useEffect(() => { void load(); }, []);
  function update(patch: Partial<ForumSettings>) { setSettings(s => s ? { ...s, ...patch } : s); setDirty(true); setNotice(""); }
  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true); setUploading(true); setNotice("");
    try {
      if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("Chọn ảnh tối đa 20 MB.");
      const image = await createImageBitmap(file);
      const pixels = image.width * image.height; image.close();
      if (pixels > 40000000) throw new Error("Chọn ảnh dưới 40 triệu điểm ảnh.");
      const body = new FormData(); body.set("file", file);
      const r = await fetch("/api/admin/invitation-settings", { method: "POST", body });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || "Không tải được ảnh.");
      update({ banner: data.url }); setName(file.name);
      setNotice("Đã tải ảnh lên. Bấm Lưu thay đổi để áp dụng.");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); setUploading(false); }
  }
  async function save() {
    if (!settings || busy) return;
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/admin/forum-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await r.json();
      if (!r.ok || !validForumSettings(data.settings)) throw new Error(data.error || "Không lưu được cấu hình.");
      setSettings(data.settings); setDirty(false); setNotice("Đã lưu. Giao diện user cập nhật trong tối đa 30 giây hoặc khi tải lại trang.");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  if (!settings) return <article className="admin-card">{notice ? <><p role="alert">{notice}</p><button onClick={() => void load()}>Thử lại</button></> : "Đang tải cấu hình..."}</article>;
  return <article className="admin-card invitation-settings">
    <header className="invitation-settings-header"><h2>Diễn đàn</h2><div className="invitation-settings-actions"><button disabled={busy || !dirty} onClick={() => void save()}><Save size={18} />{busy ? "Đang xử lý..." : "Lưu thay đổi"}</button></div></header>
    {notice && <p role="status">{notice}</p>}
    <div className="invitation-settings-grid"><fieldset className="invitation-settings-controls" disabled={busy}>
      <label className="invitation-visibility"><span>Hiện chức năng Diễn đàn</span><input type="checkbox" checked={settings.visible} onChange={e => update({ visible: e.target.checked })} /></label>
      <label className="invitation-visibility"><span>Đối tượng hiển thị</span><select value={settings.adminOnly ? "admin" : "all"} onChange={e => update({ adminOnly: e.target.value === "admin" })}><option value="all">Tất cả người dùng</option><option value="admin">Chỉ admin</option></select></label>
      <InvitationUpload title="Banner Diễn đàn" fileName={name} uploading={uploading} disabled={busy} onSelect={file => void upload(file)} />
      <button type="button" className="admin-secondary" onClick={() => { update({ banner: defaultForumSettings.banner }); setName(""); }}>Dùng banner mặc định</button>
    </fieldset><div><img className="invitation-banner-preview" src={settings.banner} alt="Xem trước banner Diễn đàn" /></div></div>
  </article>;
}
