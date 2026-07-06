"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, BookOpen, CalendarPlus, FileText, HelpCircle, LogOut, Plus, Save, ShieldCheck, Trash2, Upload, Users } from "lucide-react";

type EventItem = { id: string; title: string; content: string; event_date: string | null; created_at: string };
type UserItem = { id: string; advisor_code: string; full_name: string; start_date: string | null; advisor_status: string | null; advisor_position: string | null; position_effective_date: string | null; birth_day: number | null; birth_month: number | null; is_active: boolean };
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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [archiveForms, setArchiveForms] = useState<ArchiveForms>({ folders: [] });
  const [archiveGuides, setArchiveGuides] = useState<ArchiveGuide[]>([]);
  const [archiveFaq, setArchiveFaq] = useState<ArchiveFaq[]>([]);

  const loadData = useCallback(async () => {
    const [userResponse, eventResponse, formsResponse, guidesResponse, faqResponse] = await Promise.all([
      fetch("/api/admin/access-list", { cache: "no-store" }),
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=forms", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=guides", { cache: "no-store" }),
      fetch("/api/admin/archive/content?key=faq", { cache: "no-store" })
    ]);
    const [userPayload, eventPayload, formsPayload, guidesPayload, faqPayload] = await Promise.all([
      userResponse.json(),
      eventResponse.json(),
      formsResponse.json(),
      guidesResponse.json(),
      faqResponse.json()
    ]);
    if (userResponse.ok) setUsers(userPayload.users ?? []);
    if (eventResponse.ok) setEvents(eventPayload.events ?? []);
    if (formsResponse.ok) setArchiveForms(formsPayload ?? { folders: [] });
    if (guidesResponse.ok) setArchiveGuides(guidesPayload ?? []);
    if (faqResponse.ok) setArchiveFaq(faqPayload ?? []);
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
        <ArchiveAdminPanel
          forms={archiveForms}
          guides={archiveGuides}
          faq={archiveFaq}
          setForms={setArchiveForms}
          setGuides={setArchiveGuides}
          setFaq={setArchiveFaq}
          onSaved={loadData}
          setMessage={setMessage}
        />
      </section>
    </main>
  );
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
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
