"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, FileText, ImagePlus, LoaderCircle, MessageCircle, MoreHorizontal, Pencil, Paperclip, Plus, Reply, Search, ShieldCheck, Trash2, ThumbsUp, ThumbsDown, UserRound, X } from "lucide-react";
import HeroAvatar from "@/app/HeroAvatar";
import { FORUM_FILE_LIMIT, FORUM_MAX_FILES, forumTime, type ForumAttachment, type ForumAuthor, type ForumComment, type ForumTopic } from "@/lib/forum";
import styles from "./Forum.module.css";
import ForumEditor, { ForumContent, forumHasContent } from "./ForumEditor";
import { ForumSettings } from "@/lib/forum-settings";

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({ error: "Máy chủ không phản hồi. Vui lòng thử lại." }));
  if (!response.ok) throw new Error(data.error || "Không thể thực hiện yêu cầu.");
  return data;
}
function Author({ author }: { author: ForumAuthor }) {
  return <div className={styles.author}><span className={styles.avatar}>{author.anonymous ? <UserRound size={20} /> : <HeroAvatar src={author.avatar} />}</span><div><b>{author.name}</b>{author.group && <small>{author.group}</small>}</div>{author.anonymous && <ShieldCheck size={16} aria-label="Đăng ẩn danh" />}</div>;
}
async function uploadAttachments(files: File[]) {
  const receipts: string[] = [];
  for (const file of files) {
    const prepared = await readResponse(await fetch("/api/forum/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size }) }));
    const uploaded = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file });
    if (!uploaded.ok) throw new Error(`Không thể tải tệp ${file.name}. Vui lòng thử lại.`);
    receipts.push(prepared.receipt);
  }
  return receipts;
}
function PostManagement({ topic, onChanged, onDeleted }: { topic: ForumTopic; onChanged: (title: string, content: string, attachments: ForumAttachment[]) => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [title, setTitle] = useState(topic.title);
  const [content, setContent] = useState(topic.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retained, setRetained] = useState<ForumAttachment[]>(topic.attachments);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const urls = files.map(file => file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
    setPreviews(urls);
    return () => urls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  }, [files]);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  useEffect(() => { if (mode) dialog.current?.showModal(); }, [mode]);
  function close() { dialog.current?.close(); setMode(null); trigger.current?.focus(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const uploads = mode === "edit" ? await uploadAttachments(files) : [];
      const result = await readResponse(await fetch(`/api/forum/${topic.id}`, mode === "edit"
        ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content, retainedIds: retained.map(file => file.id), uploads }) }
        : { method: "DELETE" }));
      if (mode === "edit") { onChanged(result.title, result.content, result.attachments); setFiles([]); close(); }
      else { dialog.current?.close(); onDeleted(); }
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể lưu thay đổi."); }
    finally { setBusy(false); }
  }
  return <div ref={container} className={styles.management}>
    <button ref={trigger} type="button" aria-label="Tùy chọn bài đăng" aria-expanded={open} onClick={() => setOpen(value => !value)}><MoreHorizontal size={22} /></button>
    {open && <div className={styles.postMenu}>
      <button type="button" onClick={() => { setTitle(topic.title); setContent(topic.content); setRetained(topic.attachments); setFiles([]); setError(""); setMode("edit"); setOpen(false); }}><Pencil size={16} />Chỉnh sửa</button>
      <button type="button" className={styles.deleteAction} onClick={() => { setError(""); setMode("delete"); setOpen(false); }}><Trash2 size={16} />Xóa bài đăng</button>
    </div>}
    {mode && <dialog ref={dialog} className={styles.manageDialog} aria-labelledby="forum-manage-title" onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
      <form onSubmit={submit}><h2 id="forum-manage-title">{mode === "edit" ? "Chỉnh sửa bài đăng" : "Xóa bài đăng?"}</h2>
        {mode === "edit" ? <fieldset disabled={busy}><label className={styles.field}>Tiêu đề <span>*</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} /></label><div className={styles.field}>Nội dung <span>*</span><ForumEditor value={content} onChange={setContent} disabled={busy} /></div></fieldset>
          : <p>Bài đăng và toàn bộ bình luận bên dưới sẽ bị xóa. Bạn không thể hoàn tác thao tác này.</p>}
        {mode === "edit" && <fieldset className={styles.editAttachments} disabled={busy}><legend>Ảnh / tệp đính kèm</legend>
          <div className={styles.pendingFiles}>{retained.map(file => <div key={file.id}>{file.mime.startsWith("image/") ? <img src={file.url} alt={file.name} /> : <FileText size={24} />}<span>{file.name}</span><button type="button" aria-label={`Xóa ${file.name}`} onClick={() => setRetained(current => current.filter(item => item.id !== file.id))}><X size={16} /></button></div>)}
            {files.map((file, index) => <div key={`${file.name}-${index}`}>{previews[index] ? <img src={previews[index]} alt={file.name} /> : <FileText size={24} />}<span>{file.name}<small>Ảnh / tệp mới</small></span><button type="button" aria-label={`Bỏ ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={16} /></button></div>)}</div>
          <button type="button" onClick={() => picker.current?.click()}><ImagePlus size={18} />Thêm ảnh / tệp</button>
          <input ref={picker} type="file" multiple hidden onChange={event => { const selected = Array.from(event.target.files || []); event.target.value = ""; setError(""); if (retained.length + files.length + selected.length > FORUM_MAX_FILES) { setError("Tối đa 4 ảnh hoặc tệp đính kèm."); return; } if (selected.some(file => !file.size || file.size >= FORUM_FILE_LIMIT)) { setError("Mỗi ảnh hoặc tệp phải lớn hơn 0 và nhỏ hơn 5 MB."); return; } setFiles(current => [...current, ...selected]); }} />
          <p className={styles.hint}>Xóa ảnh cũ và thêm ảnh mới để thay thế. Tối đa 4 tệp, mỗi tệp nhỏ hơn 5 MB.</p>
        </fieldset>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.formActions}><button type="button" disabled={busy} onClick={close}>Hủy</button><button type="submit" className={mode === "delete" ? styles.deleteAction : styles.primary} disabled={busy || (mode === "edit" && (!title.trim() || !forumHasContent(content)))}>{busy ? "Đang xử lý…" : mode === "edit" ? "Lưu thay đổi" : "Xóa bài đăng"}</button></div>
      </form>
    </dialog>}
  </div>;
}
function Attachments({ files }: { files: ForumAttachment[] }) {
  const [selected, setSelected] = useState<ForumAttachment | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected && !dialog.current?.open) dialog.current?.showModal(); }, [selected]);
  if (!files.length) return null;
  return <div className={styles.attachments}>{files.map(file => file.mime.startsWith("image/")
    ? <button type="button" key={file.id} className={styles.imageLink} aria-label={`Xem ảnh ${file.name}`} onClick={() => setSelected(file)}><img src={file.url} alt={file.name} loading="lazy" /></button>
    : <a className={styles.fileLink} href={file.url} key={file.id}><FileText size={20} /><span><b>{file.name}</b><small>{(file.size / 1024 / 1024).toFixed(2)} MB · Tải xuống</small></span></a>)}
    <dialog ref={dialog} className={styles.imageDialog} aria-label={selected ? `Ảnh ${selected.name}` : "Xem ảnh"} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <div className={styles.imageDialogBody}><button type="button" className={styles.imageClose} aria-label="Đóng ảnh" onClick={() => dialog.current?.close()}><X size={20} /></button><img src={selected.url} alt={selected.name} /><p>{selected.name}</p></div>}
    </dialog>
  </div>;
}
export function ForumShortcut({ onOpen, embedded = false }: { onOpen: () => void; embedded?: boolean }) {
  const [settings, setSettings] = useState<ForumSettings | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/forum-settings", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const value = await response.json();
        if (active) setSettings(value);
      } catch { if (active) setSettings(null); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    window.addEventListener("focus", load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, []);
  if (!settings?.visible || !settings.banner) return null;
  return <section className={`${embedded ? styles.embedded : "tvv-content"} ${styles.forum} ${styles.shortcutSection}`}><button className={styles.shortcut} type="button" onClick={onOpen} aria-label="Mở Diễn đàn"><img src={settings.banner} alt="Diễn đàn BVNT Khánh Hòa" /></button></section>;
}
function Composer({ topic, replyTo, onCancelReply, onSubmit, onCancel }: {
  topic?: boolean; replyTo?: ForumComment | null; onCancelReply?: () => void;
  onSubmit: (form: FormData) => Promise<void>; onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const urls = files.map(file => file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
    setPreviews(urls);
    return () => urls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  }, [files]);
  function chooseFiles(selected: File[]) {
    setError("");
    if (files.length + selected.length > FORUM_MAX_FILES) { setError(`Tối đa ${FORUM_MAX_FILES} tệp đính kèm.`); return; }
    if (selected.some(file => !file.size || file.size >= FORUM_FILE_LIMIT)) { setError("Mỗi ảnh hoặc tệp phải lớn hơn 0 và nhỏ hơn 5 MB."); return; }
    if (!topic && selected.some(file => !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type))) { setError("Chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WEBP trong bình luận."); return; }
    setFiles(current => [...current, ...selected]);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("title", title.trim()); form.set("content", content.trim()); form.set("anonymous", String(anonymous));

      if (replyTo) form.set("parentId", replyTo.id);
      const uploads: string[] = [];
      for (const file of files) {
        const prepared = await readResponse(await fetch("/api/forum/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size }) }));
        const uploaded = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file });
        if (!uploaded.ok) throw new Error(`Không thể tải tệp ${file.name}. Vui lòng thử lại.`);
        uploads.push(prepared.receipt);
      }
      form.set("uploads", JSON.stringify(uploads));
      await onSubmit(form);
      setTitle(""); setContent(""); setFiles([]);
      onCancelReply?.();
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể gửi. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <form className={`${styles.composer} ${!topic ? styles.commentComposer : ""}`} onSubmit={submit} aria-label={topic ? "Tạo bài đăng" : "Viết bình luận"}>
    {replyTo && <div className={styles.replyTarget}><Reply size={16} /><span>Trả lời <b>{replyTo.author.name}</b></span><button type="button" aria-label="Hủy trả lời bình luận" onClick={onCancelReply} disabled={busy}><X size={16} /></button></div>}
    <fieldset disabled={busy}>
      {topic && <label className={styles.field}>Tiêu đề <span>*</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Bạn muốn thảo luận về điều gì?" maxLength={200} required /></label>}
      <div className={styles.field}>{topic ? <>Nội dung <span>*</span><ForumEditor value={content} onChange={setContent} disabled={busy} /></> : <label>Bình luận<textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Chia sẻ ý kiến của bạn…" maxLength={10000} rows={3} /></label>}</div>
      {!!files.length && <div className={styles.pendingFiles}>{files.map((file, index) => <div key={`${file.name}-${index}`}>{previews[index] ? <img src={previews[index]} alt="" /> : <FileText size={24} />}<span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" aria-label={`Bỏ ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={16} /></button></div>)}</div>}
      <div className={`${styles.tools} ${topic ? styles.uploadTools : ""}`}>
        <button type="button" onClick={() => fileRef.current?.click()}>{topic ? <Paperclip size={18} /> : <ImagePlus size={18} />}{topic ? "Ảnh / tệp" : "Thêm ảnh"}</button>
        {!topic && <label className={styles.anonymous}><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} /><span>Trả lời ẩn danh</span></label>}
        {topic && <p className={styles.hint}>Tối đa {FORUM_MAX_FILES} ảnh hoặc tệp, mỗi tệp nhỏ hơn 5 MB.</p>}
        <input ref={fileRef} type="file" multiple hidden accept={topic ? undefined : "image/jpeg,image/png,image/gif,image/webp"} onChange={event => { chooseFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
      </div>
      {topic && <label className={styles.anonymous}><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} /><span>Đăng ẩn danh</span></label>}
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.formActions}>{onCancel && <button type="button" onClick={onCancel} disabled={busy}>Hủy</button>}<button className={styles.primary} type="submit" disabled={busy || (topic ? !title.trim() || !forumHasContent(content) : !content.trim() && !files.length)}>{busy && <LoaderCircle size={16} className={styles.spinning} />}{busy ? "Đang gửi…" : topic ? "Đăng bài" : "Gửi trả lời"}</button></div>
  </form>;
}

export default function Forum() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ topic: ForumTopic; comments: ForumComment[]; hasMore: boolean; totalPages?: number; page?: number } | null>(null);
  const [commentPage, setCommentPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [replyTo, setReplyTo] = useState<ForumComment | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const composer = useRef<HTMLDivElement>(null);
  const reacting = useRef(new Set<string>());
  const [reactionBusy, setReactionBusy] = useState<Set<string>>(new Set());
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (topicId || creating) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/forum?q=${encodeURIComponent(query)}&page=${page}`, { signal: controller.signal, cache: "no-store" }).then(readResponse).then(data => {
      setTopics(current => page ? [...new Map([...current, ...data.topics].map((item: ForumTopic) => [item.id, item])).values()] : data.topics); setHasMore(data.hasMore);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, topicId, creating, retry]);
  useEffect(() => {
    if (!topicId) return;
    const controller = new AbortController();
    setDetail(null); setLoading(true); setError(""); setReplyTo(null); setCommentPage(0);
    fetch(`/api/forum/${topicId}`, { signal: controller.signal, cache: "no-store" }).then(readResponse).then(setDetail)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [topicId, retry]);
  const back = useCallback(() => { setTopicId(null); setDetail(null); setCreating(false); setReplyTo(null); setPage(0); setError(""); }, []);
  async function changeCommentPage(target: number | "last") {
    if (!topicId || moreLoading) return;
    setMoreLoading(true); setError("");
    try {
      const data = await readResponse(await fetch(`/api/forum/${topicId}?page=${target}`, { cache: "no-store" }));
      setDetail(data); setCommentPage(data.page || 0); setReplyTo(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể tải bình luận."); }
    finally { setMoreLoading(false); }
  }
  async function sendComment(form: FormData) {
    const data = await readResponse(await fetch(`/api/forum/${topicId}`, { method: "POST", body: form }));
    setDetail(current => current ? { ...current, topic: { ...current.topic, comment_count: current.topic.comment_count + 1 }, comments: [...current.comments, data.comment] } : current);
    if (!form.get("parentId")) await changeCommentPage("last");
  }
  function startReply(comment: ForumComment) {
    setReplyTo(comment);
    requestAnimationFrame(() => { composer.current?.scrollIntoView({ behavior: "smooth", block: "center" }); composer.current?.querySelector("textarea")?.focus({ preventScroll: true }); });
  }
  async function reactToComment(comment: ForumComment, reaction: "like" | "dislike") {
    if (reacting.current.has(comment.id)) return;
    reacting.current.add(comment.id);
    setReactionBusy(new Set(reacting.current));
    const currentTopic = topicId;
    try {
      const data = await readResponse(await fetch(`/api/forum/${currentTopic}/reactions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId: comment.id, reaction: comment.my_reaction === reaction ? null : reaction }) }));
      setDetail(current => current?.topic.id === currentTopic ? { ...current, comments: current.comments.map(item => item.id === comment.id ? { ...item, likes: data.likes, dislikes: data.dislikes, my_reaction: data.my_reaction } : item) } : current);
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể lưu tương tác."); }
    finally { reacting.current.delete(comment.id); setReactionBusy(new Set(reacting.current)); }
  }
  const comments = detail?.comments || [];
  const children = new Map<string | null, ForumComment[]>();
  const knownIds = new Set(comments.map(comment => comment.id));
  comments.forEach(comment => {
    const parent = comment.parent_id && knownIds.has(comment.parent_id) ? comment.parent_id : null;
    children.set(parent, [...(children.get(parent) || []), comment]);
  });
  function renderComment(comment: ForumComment, depth = 0): React.ReactNode {
    const parent = comment.parent_id ? comments.find(item => item.id === comment.parent_id) : null;
    return <article className={`${styles.comment} ${depth ? styles.nested : ""}`} key={comment.id}>
      <Author author={comment.author} />
      {depth >= 2 && parent && <small className={styles.replyLabel}>Trả lời {parent.author.name}</small>}
      <div className={styles.commentBody}>{comment.content && <p>{comment.content}</p>}{comment.sticker && <span className={styles.sticker} role="img" aria-label={`Sticker ${comment.sticker}`}>{comment.sticker}</span>}<Attachments files={comment.attachments} /><div className={styles.commentFooter}><time dateTime={comment.created_at}>{forumTime(comment.created_at)}</time><button type="button" aria-label={`Thích: ${comment.likes || 0}`} aria-pressed={comment.my_reaction === "like"} disabled={reactionBusy.has(comment.id)} onClick={() => reactToComment(comment, "like")}><ThumbsUp size={14} /><span>{comment.likes || 0}</span></button><button type="button" aria-label={`Không thích: ${comment.dislikes || 0}`} aria-pressed={comment.my_reaction === "dislike"} disabled={reactionBusy.has(comment.id)} onClick={() => reactToComment(comment, "dislike")}><ThumbsDown size={14} /><span>{comment.dislikes || 0}</span></button><button type="button" onClick={() => startReply(comment)}><Reply size={14} />Trả lời</button></div></div>
      {replyTo?.id === comment.id && <div ref={composer} className={styles.inlineReply}><Composer key={comment.id} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSubmit={sendComment} /></div>}
      {!!children.get(comment.id)?.length && <div className={depth < 2 ? styles.replies : styles.flatReplies}>{children.get(comment.id)!.map(item => renderComment(item, depth + 1))}</div>}
    </article>;
  }
  return <section className={`tvv-content tvv-subpage tvv-after-sub-header ${styles.forum}`}>
    {(topicId || creating) && <button className={styles.back} type="button" onClick={back}><ArrowLeft size={18} />Danh sách chủ đề</button>}
    {creating ? <div className={`${styles.panel} ${styles.createPanel}`}><h2>Tạo bài đăng</h2><Composer topic onCancel={back} onSubmit={async form => {
      const data = await readResponse(await fetch("/api/forum", { method: "POST", body: form }));
      setCreating(false); setTopicId(data.id);
    }} /></div> : !topicId ? <>
      <div className={styles.search}><Search size={20} /><input aria-label="Tìm kiếm chủ đề thảo luận" placeholder="Tìm kiếm chủ đề đã thảo luận…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch("")}><X size={18} /></button>}</div>
      {error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : <>
        <div className={styles.topicList} aria-busy={loading}>{topics.map(topic => <button type="button" className={styles.topicRow} key={topic.id} onClick={() => setTopicId(topic.id)}><span className={styles.topicIcon}><MessageCircle size={20} /></span><span className={styles.topicText}><b>{topic.title}</b><span><small>{topic.comment_count} lượt thảo luận</small><small>{topic.comment_count ? "Thảo luận cuối" : "Đăng lúc"}: {forumTime(topic.last_activity_at)}</small></span></span><ChevronRight size={18} /></button>)}</div>
        {loading && <div className={styles.loading} role="status"><LoaderCircle className={styles.spinning} size={20} />Đang tải chủ đề…</div>}
        {!loading && !topics.length && <div className={styles.empty}><MessageCircle size={32} /><h3>{query ? "Chưa tìm thấy chủ đề" : "Chưa có chủ đề nào"}</h3><p>{query ? "Thử tìm bằng từ khóa khác hoặc tạo bài đăng mới." : "Hãy bắt đầu cuộc thảo luận đầu tiên."}</p></div>}
        {!loading && hasMore && <button type="button" className={styles.loadMore} onClick={() => setPage(value => value + 1)}>Xem thêm chủ đề</button>}
      </>}
      <div className={styles.createBar}><button type="button" className={styles.primary} onClick={() => { setCreating(true); setError(""); }}><Plus size={20} />Tạo bài đăng</button></div>
    </> : <>
      {loading && <div className={styles.loading} role="status"><LoaderCircle className={styles.spinning} size={20} />Đang tải bài thảo luận…</div>}
      {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
      {detail && <><article className={styles.panel}><div className={styles.postHeading}><Author author={detail.topic.author} />{detail.topic.can_manage && <PostManagement topic={detail.topic} onChanged={(title, content, attachments) => setDetail(current => current ? { ...current, topic: { ...current.topic, title, content, attachments } } : current)} onDeleted={() => { back(); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-label="Tìm kiếm chủ đề thảo luận"]')?.focus()); }} />}</div><h1>{detail.topic.title}</h1><div className={styles.postContent}><ForumContent value={detail.topic.content} /></div><Attachments files={detail.topic.attachments} /><time className={styles.hint} dateTime={detail.topic.created_at}>Đăng lúc {forumTime(detail.topic.created_at)}</time></article>
        <div className={`${styles.panel} ${styles.commentPanel}`}><Composer key={topicId} onSubmit={sendComment} /></div>
        <div className={styles.discussion}><h2>Thảo luận <span>{detail.topic.comment_count}</span></h2>{!comments.length && <p className={styles.hint}>Chưa có bình luận. Hãy chia sẻ ý kiến đầu tiên.</p>}{(children.get(null) || []).map(comment => renderComment(comment))}
          {(detail.totalPages || 1) > 1 && <nav className={styles.commentPagination} aria-label="Trang thảo luận"><button type="button" disabled={moreLoading || commentPage === 0} onClick={() => changeCommentPage(commentPage - 1)}>‹</button>{Array.from(new Set([0, commentPage - 1, commentPage, commentPage + 1, (detail.totalPages || 1) - 1])).filter(value => value >= 0 && value < (detail.totalPages || 1)).sort((a, b) => a - b).map((value, index, pages) => <span key={value}>{index > 0 && value - pages[index - 1] > 1 && <span className={styles.pageEllipsis}>…</span>}<button type="button" aria-label={`Trang ${value + 1}`} aria-current={commentPage === value ? "page" : undefined} disabled={moreLoading} onClick={() => changeCommentPage(value)}>{value + 1}</button></span>)}<button type="button" disabled={moreLoading || commentPage + 1 >= (detail.totalPages || 1)} onClick={() => changeCommentPage(commentPage + 1)}>›</button></nav>}
        </div></>}
    </>}
  </section>;
}
