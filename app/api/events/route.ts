import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("admin_events")
      .select("id,title,content,event_date,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được thông báo." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const eventDate = String(body.eventDate || "").trim() || null;
  if (!title || !content) return NextResponse.json({ error: "Vui lòng nhập tiêu đề và nội dung." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("admin_events")
    .insert({ title, content, event_date: eventDate })
    .select("id,title,content,event_date,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu mã sự kiện." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("admin_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
