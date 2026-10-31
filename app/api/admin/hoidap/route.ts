import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { discussionGroups } from "@/lib/hoidap";
import { getSupabaseAdmin } from "@/lib/supabase";
import { activeDiscussionProgram, discussionTable } from "@/lib/hoidap-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  try {
    const program = await activeDiscussionProgram();
    const { data, error } = await getSupabaseAdmin().from(discussionTable(program)).select("group_slug,answers,updated_at");
    if (error) throw error;
    return NextResponse.json({ program, groups: discussionGroups.map(group => {
      const record = data?.find(row => row.group_slug === group.slug);
      return { ...group, answers: record?.answers ?? null, updatedAt: record?.updated_at ?? null };
    }) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa tải được bài trả lời. Vui lòng kiểm tra kết nối và bảng sales_discussion_answers trên Supabase rồi thử lại." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (payload?.confirm !== "reset-all-padlet-answers") {
    return NextResponse.json({ error: "Chưa xác nhận reset bài trả lời của cả 6 nhóm." }, { status: 400 });
  }
  try {
    const program = await activeDiscussionProgram();
    if (payload.program !== program) return NextResponse.json({ error: "Chương trình đã thay đổi. Hãy làm mới trước khi reset." }, { status: 409 });
    const { error } = await getSupabaseAdmin().from(discussionTable(program)).delete()
      .in("group_slug", discussionGroups.map(group => group.slug));
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa reset được bài trả lời. Vui lòng thử lại." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (![1, 2].includes(payload?.program)) return NextResponse.json({ error: "Chương trình không hợp lệ." }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().from("sales_discussion_settings").upsert({ id: true, active_program: payload.program });
    if (error) throw error;
    return NextResponse.json({ ok: true, program: payload.program });
  } catch {
    return NextResponse.json({ error: "Chưa kích hoạt được chương trình. Vui lòng chạy file sales-discussion-program-2.sql trên Supabase và thử lại." }, { status: 503 });
  }
}
