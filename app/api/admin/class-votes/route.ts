import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function unauthorized(request: NextRequest) {
  return !isAdminRequest(request);
}

export async function GET(request: NextRequest) {
  if (unauthorized(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: votes, error: votesError }, { data: setting, error: settingError }] = await Promise.all([
    supabase.from("class_votes").select("id,advisor_code,advisor_name,group_name,vote_choice,change_count,updated_at").order("group_name").order("advisor_name"),
    supabase.from("class_vote_settings").select("is_locked,is_started").eq("id", true).maybeSingle()
  ]);
  if (votesError || settingError) return NextResponse.json({ error: (votesError || settingError)?.message || "Không thể tải bình chọn." }, { status: 500 });
  return NextResponse.json({ votes: votes ?? [], isLocked: Boolean(setting?.is_locked), isStarted: Boolean(setting?.is_started) });
}

export async function PATCH(request: NextRequest) {
  if (unauthorized(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const { isLocked, isStarted } = await request.json().catch(() => ({}));
  if (typeof isLocked !== "boolean" && typeof isStarted !== "boolean") return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const { data: current } = await getSupabaseAdmin().from("class_vote_settings").select("is_locked,is_started").eq("id", true).maybeSingle();
  const nextLocked = typeof isLocked === "boolean" ? isLocked : Boolean(current?.is_locked);
  const nextStarted = typeof isStarted === "boolean" ? isStarted : Boolean(current?.is_started);
  const { error } = await getSupabaseAdmin().from("class_vote_settings").upsert({ id: true, is_locked: nextLocked, is_started: nextStarted, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, isLocked: nextLocked, isStarted: nextStarted });
}

export async function DELETE(request: NextRequest) {
  if (unauthorized(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const { error } = await getSupabaseAdmin().from("class_votes").delete().not("id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
