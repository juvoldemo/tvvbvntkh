export function canModerateForum(code: string) { return code === "ADMIN"; }

// A hidden comment remains in the thread so its replies keep their context.
// Its payload is withheld from regular members, including attachment URLs.
export function redactHiddenComment<T extends { hidden_at?: unknown; content?: unknown; sticker?: unknown; attachments: unknown[] }>(comment: T, admin: boolean): T {
  return comment.hidden_at && !admin ? { ...comment, content: "", sticker: null, attachments: [] } : comment;
}
