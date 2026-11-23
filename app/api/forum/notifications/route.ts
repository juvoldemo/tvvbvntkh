import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";

export const dynamic = "force-dynamic";
function notificationFailure(error: unknown) {
  if (["42P01", "PGRST205"].includes((error as { code?: string })?.code || "")) {
    return forumFailure(new ForumError("Vui lòng chạy supabase/forum-notifications.sql trên Supabase để bật thông báo diễn đàn.", 503));
  }
  return forumFailure(error);
}
export async function GET(request: NextRequest) {
  try {
    const account = await forumAccount(request);
    const { data, error } = await getSupabaseAdmin().from("forum_notifications")
      .select("id,topic_id,kind,created_at,read_at,forum_topics!inner(title)")
      .eq("recipient_code", account.advisor_code).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const events = (data || []).map(row => ({
      id: `forum:${row.id}`, topic_id: row.topic_id,
      title: row.kind === "comment" ? "Có bình luận mới trên diễn đàn" : "Có tương tác mới trên diễn đàn",
      content: `${row.kind === "comment" ? "Bình luận mới" : row.kind === "like" ? "Lượt thích mới" : "Lượt không thích mới"} trong bài “${(row.forum_topics as unknown as { title: string }).title}”.`,
      created_at: row.created_at, event_date: null, read_at: row.read_at,
    }));
    return NextResponse.json({ events }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return notificationFailure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    const body = await request.json();
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id: unknown) => typeof id !== "string" || !uuidPattern.test(id))) throw new ForumError("Danh sách thông báo không hợp lệ.");
    const { error } = await getSupabaseAdmin().from("forum_notifications")
      .update({ read_at: new Date().toISOString() }).eq("recipient_code", account.advisor_code).in("id", body.ids).is("read_at", null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return notificationFailure(error); }
}
