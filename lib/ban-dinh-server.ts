import { getSupabaseAdmin } from "./supabase";
import { randomUUID } from "node:crypto";
import { BanDinhSession, BanDinhSettings, defaultBanDinhSession, defaultBanDinhSettings, validBanDinhSettings } from "./ban-dinh";

export async function readBanDinhSettings(): Promise<BanDinhSettings> {
  const { data, error } = await getSupabaseAdmin().storage.from("archive").download("data/ban-dinh-settings.json", { cacheNonce: randomUUID() }, { cache: "no-store" });
  if (error) {
    if (["404", "400"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) return defaultBanDinhSettings;
    throw error;
  }
  const value: unknown = JSON.parse(await data.text());
  if (!validBanDinhSettings(value)) throw new Error("Cấu hình Bán đỉnh 3.0 không hợp lệ.");
  return value;
}
export async function saveBanDinhSettings(value: BanDinhSettings) {
  const { error } = await getSupabaseAdmin().storage.from("archive").upload("data/ban-dinh-settings.json", JSON.stringify(value), { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw error;
}

export async function readBanDinhSession(): Promise<BanDinhSession> {
  const { data, error } = await getSupabaseAdmin().storage.from("archive").download("data/ban-dinh-session.json", { cacheNonce: randomUUID() }, { cache: "no-store" });
  if (error) {
    if (["404", "400"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) return defaultBanDinhSession;
    throw error;
  }
  const value = JSON.parse(await data.text());
  if (typeof value?.running !== "boolean" || !(value.startedAt === null || typeof value.startedAt === "string") || !(value.endedAt === null || typeof value.endedAt === "string")) throw new Error("Invalid session");
  if (value.reportPrefix !== undefined && !/^rounds\/[a-f0-9-]{36}$/.test(value.reportPrefix)) throw new Error("Invalid report prefix");
  return value;
}
export async function saveBanDinhSession(value: BanDinhSession) {
  const { error } = await getSupabaseAdmin().storage.from("archive").upload("data/ban-dinh-session.json", JSON.stringify(value), { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw error;
}
