export const FORUM_FILE_LIMIT = 5 * 1024 * 1024;
export const FORUM_MAX_FILES = 4;
export const FORUM_STICKERS = ["👍", "❤️", "👏", "🎉", "💪", "🙏", "😊", "🌟"] as const;
export type ForumAttachment = { id: string; name: string; size: number; mime: string; url: string };
export type ForumAuthor = { name: string; group: string; avatar: string | null; anonymous: boolean };
export type ForumTopic = { id: string; title: string; content: string; created_at: string; last_activity_at: string; comment_count: number; author: ForumAuthor; attachments: ForumAttachment[]; can_manage?: boolean };
export type ForumComment = { id: string; topic_id: string; parent_id: string | null; content: string; sticker: string | null; created_at: string; author: ForumAuthor; attachments: ForumAttachment[]; likes?: number; dislikes?: number; my_reaction?: "like" | "dislike" | null };
export function forumTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get("hour")}:${get("minute")} ${get("day")}/${get("month")}/${get("year")}`;
}
