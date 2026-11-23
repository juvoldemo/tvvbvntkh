import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase";
import { userCodeFromRequest } from "./user-auth";
import { defaultForumSettings, ForumSettings, validForumSettings } from "./forum-settings";

export function canViewForum(request: NextRequest, settings: ForumSettings) {
  // Admin-data and the user dashboard share cookies. A management session must
  // not elevate the currently signed-in advisor or team leader.
  return settings.visible && (!settings.adminOnly || userCodeFromRequest(request) === "ADMIN");
}
export async function readForumSettings(): Promise<ForumSettings> {
  const { data, error } = await getSupabaseAdmin().storage.from("archive").download("data/forum-settings.json", { cacheNonce: randomUUID() }, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (error) {
    if (["404", "400"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) return defaultForumSettings;
    throw error;
  }
  const value: unknown = JSON.parse(await data.text());
  if (!validForumSettings(value)) throw new Error("Cấu hình diễn đàn không hợp lệ.");
  return value;
}
export async function saveForumSettings(value: ForumSettings) {
  const { error } = await getSupabaseAdmin().storage.from("archive").upload("data/forum-settings.json", JSON.stringify(value), { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw error;
}
