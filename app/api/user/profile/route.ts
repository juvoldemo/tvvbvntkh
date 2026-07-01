import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword, userCodeFromRequest, verifyPassword } from "@/lib/user-auth";

const fields = "advisor_code,full_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,avatar_url";

export async function GET(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("authorized_users").select(fields).eq("advisor_code", code).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const { currentPassword = "", newPassword = "" } = await request.json().catch(() => ({}));
  if (String(newPassword).length < 6) return NextResponse.json({ error: "Mật khẩu mới cần ít nhất 6 ký tự." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("authorized_users").select("password_hash").eq("advisor_code", code).single();
  if (!data || !verifyPassword(String(currentPassword), data.password_hash || "")) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 401 });
  }
  const { error } = await supabase.from("authorized_users").update({ password_hash: hashPassword(String(newPassword)), updated_at: new Date().toISOString() }).eq("advisor_code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const file = (await request.formData()).get("avatar");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Vui lòng chọn file ảnh." }, { status: 400 });
  if (file.size >= 5 * 1024 * 1024) return NextResponse.json({ error: "Avatar phải nhỏ hơn 5 MB." }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${code}/avatar-${Date.now()}.${extension}`;
  const supabase = getSupabaseAdmin();
  await supabase.storage.createBucket("user-avatars", { public: true, fileSizeLimit: 5 * 1024 * 1024 }).catch(() => undefined);
  const { error: uploadError } = await supabase.storage.from("user-avatars").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const avatarUrl = supabase.storage.from("user-avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("authorized_users").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("advisor_code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ avatarUrl });
}
