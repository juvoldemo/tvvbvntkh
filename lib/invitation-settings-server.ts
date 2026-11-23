import { getSupabaseAdmin } from "./supabase";
import { defaultInvitationSettings, InvitationSettings, validateInvitationSettings } from "./invitation-settings";

export async function readInvitationSettings(): Promise<InvitationSettings> {
  // This mutable JSON controls visibility. Bypass both the Next fetch cache
  // and Storage's cached object URL so users see the same settings as admins.
  const { data, error } = await getSupabaseAdmin().storage.from("archive").download(
    "data/invitation-settings.json",
    { cacheNonce: String(Date.now()) },
    { cache: "no-store", signal: AbortSignal.timeout(15000) }
  );
  if (error) {
    if (["404", "400"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) return defaultInvitationSettings;
    throw error;
  }
  const value: unknown = JSON.parse(await data.text());
  if (!validateInvitationSettings(value)) throw new Error("Cấu hình thư mời không hợp lệ.");
  return value;
}

export async function saveInvitationSettings(value: InvitationSettings) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  // Reading the configuration already requires this bucket. Do not recreate or
  // update its permissions on every save.
  const { error } = await getSupabaseAdmin().storage.from("archive").upload("data/invitation-settings.json", bytes.buffer, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: true
  });
  if (error) throw error;
}
