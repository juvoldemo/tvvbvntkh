import { getSupabaseAdmin } from "./supabase";
import { uploadArchiveFile } from "./archive-content";
import { defaultInvitationSettings, InvitationSettings, validateInvitationSettings } from "./invitation-settings";

export async function readInvitationSettings(): Promise<InvitationSettings> {
  const { data, error } = await getSupabaseAdmin().storage.from("archive").download("data/invitation-settings.json");
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
  await uploadArchiveFile("data/invitation-settings.json", bytes.buffer, "application/json");
}
