"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, RemoveFormatting, Undo2, Redo2, Smile } from "lucide-react";
import styles from "./Forum.module.css";

const PREFIX = "forum-rich-v1:";
export const POST_STICKERS = Array.from(new Set(Array.from(
  "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 🤗 🤭 🤫 🤔 🫡 🤐 😐 😑 🙄 😏 😴 🤤 😮 😲 😳 🥺 😢 😭 😤 😠 🤯 😱 🥶 🥵 🤒 🤕 🤧 😷 🤠 🥸 🤓 🧐 😈 👻 🤖 💩 🎃 😺 😸 😹 😻 🙈 🙉 🙊 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💤 👋 🤚 ✋ 🖐️ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 💪 🫶 👀 🧠 🌟 ⭐ ✨ ⚡ 🔥 🌈 ☀️ 🌙 ☁️ ❄️ 🌸 🌷 🌹 🌻 🍀 🌿 🌳 🐶 🐱 🐻 🐼 🐰 🦊 🦁 🐯 🐸 🐣 🦋 🐝 🐬 🦄 🍎 🍊 🍋 🍉 🍇 🍓 🍒 🍑 🥑 🍕 🍔 🍟 🍰 🎂 🍫 🍬 ☕ 🧋 🥤 🎉 🎊 🎈 🎁 🎀 🏆 🥇 🥈 🥉 🏅 🎯 🚀 ✈️ 🚗 🏠 💡 📚 ✏️ 📝 📌 📍 📣 🔔 💰 💎 ✅ ❌ ❓ ❗ 💬".split(" ")
)));
type Node = string | { tag: string; children: Node[] };
const tags = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li"]);
function read(value: string): Node[] | null {
  if (!value.startsWith(PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(value.slice(PREFIX.length));
    function valid(nodes: unknown, depth = 0): nodes is Node[] {
      return depth < 40 && Array.isArray(nodes) && nodes.every(node => typeof node === "string" || (node && typeof node === "object" && tags.has(node.tag) && valid(node.children, depth + 1)));
    }
    return valid(parsed) ? parsed : null;
  } catch { return null; }
}
function plain(nodes: Node[]): string {
  return nodes.map(node => typeof node === "string" ? node : plain(node.children)).join("");
}
export function forumHasContent(value: string) {
  const nodes = read(value);
  return Boolean((nodes ? plain(nodes) : value).trim());
}
function render(nodes: Node[]): React.ReactNode {
  return nodes.map((node, index) => typeof node === "string" ? node : createElement(tags.has(node.tag) ? node.tag : "span", { key: index }, node.tag === "br" ? undefined : render(node.children)));
}
export function ForumContent({ value }: { value: string }) {
  const nodes = read(value);
  return <div className={styles.richContent}>{nodes ? render(nodes) : value}</div>;
}
export default function ForumEditor({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const [active, setActive] = useState<string[]>([]);
  const [stickersOpen, setStickersOpen] = useState(false);
  const selection = useRef<Range | null>(null);
  const stickerPicker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stickersOpen) return;
    const close = (event: PointerEvent) => { if (!stickerPicker.current?.contains(event.target as globalThis.Node)) setStickersOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setStickersOpen(false); editor.current?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [stickersOpen]);
  function rememberSelection() {
    const current = window.getSelection();
    if (current?.rangeCount && editor.current?.contains(current.getRangeAt(0).commonAncestorContainer)) selection.current = current.getRangeAt(0).cloneRange();
  }
  function insertSticker(sticker: string) {
    const element = editor.current;
    if (!element || disabled) return;
    element.focus();
    const current = window.getSelection();
    if (current) {
      const range = selection.current && element.contains(selection.current.commonAncestorContainer) ? selection.current : document.createRange();
      if (range !== selection.current) { range.selectNodeContents(element); range.collapse(false); }
      current.removeAllRanges(); current.addRange(range);
    }
    document.execCommand("insertText", false, sticker);
    sync(); rememberSelection(); setStickersOpen(false);
  }
  useEffect(() => {
    const element = editor.current;
    if (!element || value === lastValue.current) return;
    element.replaceChildren();
    function append(parent: globalThis.Node, nodes: Node[]) {
      nodes.forEach(node => {
        if (typeof node === "string") parent.appendChild(document.createTextNode(node));
        else { const child = document.createElement(tags.has(node.tag) ? node.tag : "span"); append(child, node.children); parent.appendChild(child); }
      });
    }
    const nodes = read(value);
    if (nodes) append(element, nodes); else element.textContent = value;
    lastValue.current = value;
  }, [value]);
  function sync() {
    if (!editor.current) return;
    function collect(parent: globalThis.Node): Node[] {
      return Array.from(parent.childNodes).flatMap((node): Node[] => {
        if (node.nodeType === 3) return [node.textContent || ""];
        if (!(node instanceof HTMLElement)) return [];
        const children = collect(node);
        const tag = node.tagName.toLowerCase();
        return tags.has(tag) ? [{ tag, children }] : children;
      });
    }
    const nodes = collect(editor.current);
    const next = plain(nodes).trim() ? PREFIX + JSON.stringify(nodes) : "";
    lastValue.current = next;
    onChange(next);
    updateActive();
  }
  function updateActive() {
    setActive(["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"].filter(command => document.queryCommandState(command)));
  }
  const tools = [
    ["bold", "Chữ đậm (Ctrl+B)", Bold], ["italic", "Chữ nghiêng (Ctrl+I)", Italic],
    ["underline", "Gạch chân (Ctrl+U)", Underline], ["insertUnorderedList", "Gạch đầu dòng", List],
    ["insertOrderedList", "Danh sách đánh số", ListOrdered], ["removeFormat", "Xóa định dạng", RemoveFormatting],
    ["undo", "Hoàn tác", Undo2], ["redo", "Làm lại", Redo2],
  ] as const;
  return <div className={styles.editorWrap}>
    <div className={styles.editorToolbar} role="toolbar" aria-label="Định dạng nội dung">
      {tools.map(([command, label, Icon]) => <button key={command} type="button" title={label} aria-label={label} aria-pressed={active.includes(command)} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { editor.current?.focus(); document.execCommand(command); sync(); }}><Icon size={15} /></button>)}
      <div ref={stickerPicker} className={styles.editorStickerPicker}>
        <button type="button" title="Thêm sticker" aria-label="Thêm sticker" aria-expanded={stickersOpen && !disabled} disabled={disabled} onMouseDown={event => { event.preventDefault(); rememberSelection(); }} onClick={() => { rememberSelection(); setStickersOpen(open => !open); }}><Smile size={15} /></button>
        {stickersOpen && !disabled && <div className={styles.stickerOptions} role="group" aria-label="Chọn sticker">{POST_STICKERS.map(sticker => <button type="button" key={sticker} aria-label={`Chèn sticker ${sticker}`} onMouseDown={event => event.preventDefault()} onClick={() => insertSticker(sticker)}>{sticker}</button>)}</div>}
      </div>
    </div>
    <div ref={editor} className={styles.richEditor} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label="Nội dung" aria-multiline="true" aria-required="true" data-placeholder="Chia sẻ câu hỏi hoặc kinh nghiệm của bạn…" onInput={sync} onKeyUp={updateActive} onMouseUp={updateActive} onPaste={event => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); sync(); }} />
  </div>;
}
