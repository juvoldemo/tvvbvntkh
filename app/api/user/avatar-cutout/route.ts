import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADVISOR_IMAGE_BUCKET } from "@/lib/advisor-avatars";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

async function currentAvatar(code: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("advisor_profiles")
    .select("image_path,image_url").ilike("advisor_code", code).maybeSingle();
  if (error) throw error;
  const originalPath = String(data?.image_path ?? "").replace(/^\/+/, "").replace(/^advisor-images\//, "");
  const sourceUrl = originalPath
    ? supabase.storage.from(ADVISOR_IMAGE_BUCKET).getPublicUrl(originalPath).data.publicUrl
    : String(data?.image_url ?? "");
  // Invalidate old outputs that may still contain the original background.
  const name = "v2-" + createHash("sha256").update(sourceUrl).digest("hex") + ".png";
  const folder = `${code}/cutouts`;
  return { supabase, sourceUrl, name, folder, path: `${folder}/${name}` };
}

export async function GET(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  try {
    const avatar = await currentAvatar(code);
    if (!avatar.sourceUrl) return NextResponse.json({ avatarUrl: null });
    const { data, error } = await avatar.supabase.storage.from(ADVISOR_IMAGE_BUCKET)
      .list(avatar.folder, { search: avatar.name, limit: 1 });
    if (error) throw error;
    const avatarUrl = data?.some((file) => file.name === avatar.name)
      ? avatar.supabase.storage.from(ADVISOR_IMAGE_BUCKET).getPublicUrl(avatar.path).data.publicUrl : null;
    return NextResponse.json({ sourceUrl: avatar.sourceUrl, avatarUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể đọc avatar đã tách nền." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File) || file.type !== "image/png" || file.size >= 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ảnh tách nền phải là PNG dưới 5 MB." }, { status: 400 });
    }
    const avatar = await currentAvatar(code);
    if (!avatar.sourceUrl || form.get("sourceUrl") !== avatar.sourceUrl) {
      return NextResponse.json({ error: "Ảnh đại diện đã thay đổi, vui lòng tải lại." }, { status: 409 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return NextResponse.json({ error: "File PNG không hợp lệ." }, { status: 400 });
    }
    const { error } = await avatar.supabase.storage.from(ADVISOR_IMAGE_BUCKET)
      .upload(avatar.path, bytes, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    const avatarUrl = avatar.supabase.storage.from(ADVISOR_IMAGE_BUCKET).getPublicUrl(avatar.path).data.publicUrl;
    return NextResponse.json({ sourceUrl: avatar.sourceUrl, avatarUrl });
  } catch {
    return NextResponse.json({ error: "Không thể lưu avatar đã tách nền." }, { status: 500 });
  }
}
