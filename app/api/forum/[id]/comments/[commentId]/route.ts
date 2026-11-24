import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";
import { canModerateForum } from "@/lib/forum-moderation";

export async function PUT(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (!canModerateForum(account.advisor_code)) throw new ForumError("Chỉ admin được ẩn hoặc hiện lại bình luận.", 403);
    if (!uuidPattern.test(params.id) || !uuidPattern.test(params.commentId)) throw new ForumError("Bình luận không hợp lệ.", 404);
    const body = await request.json();
    if (typeof body.hidden !== "boolean") throw new ForumError("Trạng thái bình luận không hợp lệ.");
    const { data, error } = await getSupabaseAdmin().from("forum_comments")
      .update({ hidden_at: body.hidden ? new Date().toISOString() : null })
      .eq("id", params.commentId).eq("topic_id", params.id).select("id,hidden_at").maybeSingle();
    if (error?.code === "42703" || error?.code === "PGRST204") throw new ForumError("Vui lòng chạy supabase/forum-moderation.sql trên Supabase để bật quản trị diễn đàn.", 503);
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bình luận.", 404);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (!uuidPattern.test(params.id) || !uuidPattern.test(params.commentId)) throw new ForumError("Bình luận không hợp lệ.", 404);
    const body = await request.json();
    if (typeof body.content !== "string" || body.content.length > 10000) throw new ForumError("Nội dung không được vượt quá 10.000 ký tự.");
    const content = body.content.trim();
    const db = getSupabaseAdmin();
    const { data: current, error: lookupError } = await db.from("forum_comments").select("*")
      .eq("id", params.commentId).eq("topic_id", params.id).eq("author_code", account.advisor_code).maybeSingle();
    if (lookupError) throw lookupError;
    if (!current) throw new ForumError("Bạn chỉ có thể sửa bình luận của mình.", 403);
    if (current.hidden_at) throw new ForumError("Bình luận đã bị ẩn, không thể chỉnh sửa.", 403);
    const { data: topic, error: topicError } = await db.from("forum_topics").select("*").eq("id", params.id).maybeSingle();
    if (topicError) throw topicError;
    if (!topic || topic.locked_at) throw new ForumError("Bài viết đã khóa, không thể chỉnh sửa bình luận.", 403);
    if (!content && !current.sticker && !current.attachments?.length) throw new ForumError("Bình luận không được để trống.");
    const { data, error } = await db.from("forum_comments").update({ content })
      .eq("id", params.commentId).eq("topic_id", params.id).eq("author_code", account.advisor_code).select("id,content").maybeSingle();
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bình luận.", 404);
    return NextResponse.json(data);
  } catch (error) { return forumFailure(error); }
}
