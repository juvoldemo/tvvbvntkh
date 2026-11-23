import { NextRequest, NextResponse } from "next/server";
import { forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";
import { getSupabaseAdmin } from "@/lib/supabase";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await forumAccount(request);
    if (account.advisor_code !== "ADMIN") throw new ForumError("Chỉ admin được xem thông tin người đăng ẩn danh.", 403);
    const comment = request.nextUrl.searchParams.get("comment");
    if (!uuidPattern.test(params.id) || (comment !== null && !uuidPattern.test(comment))) throw new ForumError("Bài đăng không hợp lệ.", 404);
    const db = getSupabaseAdmin();
    const query = comment
      ? db.from("forum_comments").select("author_code,anonymous").eq("id", comment).eq("topic_id", params.id)
      : db.from("forum_topics").select("author_code,anonymous").eq("id", params.id);
    const { data: row, error } = await query.maybeSingle();
    if (error) throw error;
    if (!row || !row.anonymous) throw new ForumError("Không tìm thấy bài đăng ẩn danh.", 404);
    const { data: profile, error: profileError } = await db.from("authorized_users").select("advisor_code,full_name,group_name").eq("advisor_code", row.author_code).maybeSingle();
    if (profileError) throw profileError;
    return NextResponse.json({ code: row.author_code, name: profile?.full_name || "Thành viên", group: profile?.group_name || "" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
