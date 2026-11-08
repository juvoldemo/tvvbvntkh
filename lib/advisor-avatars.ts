import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeAdvisorCode } from "@/lib/user-auth";

export const ADVISOR_IMAGE_BUCKET = "advisor-images";

export async function getAdvisorAvatars() {
  const supabase = getSupabaseAdmin();
  const avatars = new Map<string, string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("advisor_profiles")
      .select("advisor_code,image_path,image_url")
      .order("advisor_code").range(offset, offset + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const path = String(row.image_path ?? "").trim().replace(/^\/+/, "")
        .replace(/^advisor-images\//, "");
      const url = path
        ? supabase.storage.from(ADVISOR_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
        : String(row.image_url ?? "").trim();
      if (url) avatars.set(normalizeAdvisorCode(row.advisor_code), url);
    }
    if (!data || data.length < pageSize) break;
  }
  return avatars;
}

export function applyAdvisorAvatars<T extends { advisor_code: unknown; avatar_url?: string | null }>(
  rows: T[], avatars: Map<string, string>
) {
  for (const row of rows) row.avatar_url = avatars.get(normalizeAdvisorCode(row.advisor_code)) ?? null;
  return rows;
}
