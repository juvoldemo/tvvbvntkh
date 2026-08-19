import { NextRequest, NextResponse } from "next/server";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("authorized_users").select("advisor_code,full_name").eq("advisor_code", code).maybeSingle();
  if (!profile || (!managedAdoScope(profile.advisor_code, profile.full_name) && !isBossAccount(code))) {
    return NextResponse.json({ error: "Không có quyền ghi chú khách hàng." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const note = String(body.note ?? "").trim();
  const role = body.role === "cql" ? "cql" : body.role === "ad" ? "ad" : null;
  if (note.length > 5000) return NextResponse.json({ error: "Ghi chú không được vượt quá 5.000 ký tự." }, { status: 422 });
  const updatedAt = new Date().toISOString();
  const update = role
    ? { [`${role}_note`]: note || null, [`${role}_note_updated_by`]: code, [`${role}_note_updated_at`]: updatedAt }
    : { note: note || null, note_updated_by: code, note_updated_at: updatedAt };
  const { data, error } = await supabase.from("customer_conference_registrations").update(update).eq("id", params.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Không tìm thấy khách hàng đăng ký." }, { status: 404 });
  return NextResponse.json({ ok: true, ...data });
}
