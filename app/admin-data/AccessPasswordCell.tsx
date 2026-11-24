"use client";

import { memo, useEffect, useRef, useState } from "react";
import styles from "./AccessPasswordCell.module.css";

const AccessPasswordCell = memo(function AccessPasswordCell({ user, copied, onCopy, onChanged }: {
  user: { id: string; advisor_code: string; full_name: string; password_plain: string | null };
  copied: boolean; onCopy: () => void; onChanged: (password: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector("button")?.focus();
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(null); trigger.current?.focus(); } };
    const scroll = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", scroll); };
  }, [menu]);
  useEffect(() => { if (editing) dialog.current?.showModal(); }, [editing]);
  function open() { setMenu(null); setPassword(""); setError(""); setEditing(true); }
  return <>
    <button ref={trigger} type="button" className="admin-copy-cell admin-copy-password" title="Bấm để sao chép · Chuột phải để đổi mật khẩu" aria-label={`Mật khẩu của ${user.full_name}. Chuột phải để đổi mật khẩu`} aria-haspopup="menu" aria-expanded={Boolean(menu)}
      onClick={() => { if (user.password_plain) onCopy(); }} onContextMenu={event => { event.preventDefault(); setMenu({ x: Math.max(8, Math.min(event.clientX, window.innerWidth - 188)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 60)) }); }}
      onKeyDown={event => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); open(); } }}>
      <code className="admin-password-code">{copied ? "Đã sao chép" : user.password_plain || "Chưa tạo"}</code>
    </button>
    {menu && <div ref={menuRef} className={styles.menu} role="menu" aria-label="Tùy chọn mật khẩu" style={{ left: menu.x, top: menu.y }}><button type="button" role="menuitem" onClick={open}>Đổi mật khẩu</button></div>}
    {editing && <dialog ref={dialog} className={styles.dialog} aria-labelledby={`password-title-${user.id}`} onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => { setEditing(false); setPassword(""); trigger.current?.focus(); }}>
      <form onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setError("");
        try {
          const response = await fetch("/api/admin/access-list", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, password }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Không thể đổi mật khẩu.");
          onChanged(password); dialog.current?.close();
        } catch (error) { setError(error instanceof Error ? error.message : "Không thể đổi mật khẩu."); }
        finally { setBusy(false); }
      }}>
        <h2 id={`password-title-${user.id}`}>Đổi mật khẩu</h2>
        <p>{user.full_name} · {user.advisor_code}</p>
        <fieldset disabled={busy}>
          <label>Mật khẩu mới<input autoFocus type="password" autoComplete="new-password" value={password} minLength={4} maxLength={128} required aria-describedby={`password-hint-${user.id}`} onChange={event => setPassword(event.target.value)} /></label>
          <p id={`password-hint-${user.id}`}>Mật khẩu từ 4 đến 128 ký tự.</p>
        </fieldset>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button type="button" className="admin-secondary" disabled={busy} onClick={() => dialog.current?.close()}>Hủy</button><button type="submit" className="admin-primary" disabled={busy || password.length < 4 || !password.trim()}>{busy ? "Đang lưu…" : "Lưu mật khẩu"}</button></div>
      </form>
    </dialog>}
  </>;
}, (previous, next) => previous.user === next.user && previous.copied === next.copied);

export default AccessPasswordCell;
