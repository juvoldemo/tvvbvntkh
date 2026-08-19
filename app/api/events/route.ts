import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";
import { cached, clearCached } from "@/lib/server-cache";

const AUDIENCE_PREFIX = "audience:";

function normalizePosition(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}

function audienceRole(position: unknown) {
  const normalized = normalizePosition(position);
  if (normalized === "truong ban") return "board_leader";
  if (normalized === "truong nhom") return "team_leader";
  return "advisor";
}

function eventAudiences(eventType: unknown) {
  const value = String(eventType || "");
  return value.startsWith(AUDIENCE_PREFIX) ? value.slice(AUDIENCE_PREFIX.length).split(",").filter(Boolean) : ["board_leader", "team_leader", "advisor"];
}

export async function GET(request: NextRequest) {
  try {
    const data = await cached("events:active", 10_000, async () => {
      const result = await getSupabaseAdmin().from("admin_events")
        .select("id,title,content,event_date,event_type,created_at")
        .eq("is_active", true).order("created_at", { ascending: false }).limit(50);
      if (result.error) throw result.error;
      return result.data ?? [];
    });
    if (isAdminRequest(request)) return NextResponse.json({ events: data });

    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ events: [] });
    const user = await cached(`events:user:${advisorCode}`, 60_000, async () => {
      const result = await getSupabaseAdmin().from("authorized_users").select("advisor_position")
        .eq("advisor_code", advisorCode).maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    });
    const role = audienceRole(user?.advisor_position);
    const now = Date.now();
    const events = (data ?? []).filter((item: any) => {
      const scheduledAt = item.event_date ? new Date(item.event_date).getTime() : 0;
      return (!scheduledAt || scheduledAt <= now) && eventAudiences(item.event_type).includes(role);
    });
    return NextResponse.json({ events });
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
  const allowedAudiences = ["board_leader", "team_leader", "advisor"];
  const audiences = Array.isArray(body.audiences) ? body.audiences.map(String).filter((item: string) => allowedAudiences.includes(item)) : [];
  if (!title || !content) return NextResponse.json({ error: "Vui lòng nhập tiêu đề và nội dung." }, { status: 400 });
  if (eventDate && new Date(eventDate).getTime() <= Date.now()) return NextResponse.json({ error: "Thời gian hẹn gửi phải ở tương lai." }, { status: 400 });
  if (!audiences.length) return NextResponse.json({ error: "Vui lòng chọn ít nhất một đối tượng nhận." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("admin_events")
    .insert({ title, content, event_date: eventDate, event_type: `${AUDIENCE_PREFIX}${audiences.join(",")}` })
    .select("id,title,content,event_date,event_type,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCached("events:");
  return NextResponse.json({ event: data });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu mã sự kiện." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("admin_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCached("events:");
  return NextResponse.json({ ok: true });
}
