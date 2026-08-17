import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: conference, error: findError } = await supabase.from("customer_conferences")
    .select("id").eq("id", params.id).eq("ado_code", code).maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!conference) return NextResponse.json({ error: "Không tìm thấy hội nghị hoặc bạn không có quyền xóa." }, { status: 404 });
  const { error } = await supabase.from("customer_conferences").delete().eq("id", conference.id).eq("ado_code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

