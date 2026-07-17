import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function canAccess(request: NextRequest) {
  return isAdminRequest(request);
}

export async function GET(request: NextRequest) {
  try {
    if (!canAccess(request)) return NextResponse.json({ error: "Chưa xác thực nội dung bảo mật." }, { status: 401 });
    const month = String(request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const { data, error } = await getSupabaseAdmin()
      .from("team_target_registrations")
      .select("*")
      .eq("target_month", `${month}-01`)
      .order("group_name");
    if (error) throw error;
    return NextResponse.json({ month, registrations: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được đăng ký mục tiêu." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!canAccess(request)) return NextResponse.json({ error: "Chua xac thuc noi dung bao mat." }, { status: 401 });
    const id = String(request.nextUrl.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "Thieu ID dang ky muc tieu." }, { status: 400 });
    const { error } = await getSupabaseAdmin()
      .from("team_target_registrations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong xoa duoc dang ky muc tieu." }, { status: 500 });
  }
}
