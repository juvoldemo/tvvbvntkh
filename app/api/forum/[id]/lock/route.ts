import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";
import { canModerateForum } from "@/lib/forum-moderation";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (!canModerateForum(account.advisor_code)) throw new ForumError("Chỉ admin được khóa hoặc mở khóa bài viết.", 403);
    if (!uuidPattern.test(params.id)) throw new ForumError("Chủ đề không hợp lệ.", 404);
    const body = await request.json();
    if (typeof body.locked !== "boolean") throw new ForumError("Trạng thái khóa không hợp lệ.");
    const { data, error } = await getSupabaseAdmin().from("forum_topics")
      .update({ locked_at: body.locked ? new Date().toISOString() : null })
      .eq("id", params.id).select("id,locked_at").maybeSingle();
    if (error?.code === "42703" || error?.code === "PGRST204") throw new ForumError("Vui lòng chạy supabase/forum-moderation.sql trên Supabase để bật quản trị diễn đàn.", 503);
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bài đăng.", 404);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
