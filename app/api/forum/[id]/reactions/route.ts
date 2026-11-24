import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    const { commentId, reaction } = await request.json();
    if (!uuidPattern.test(params.id) || typeof commentId !== "string" || !uuidPattern.test(commentId)) throw new ForumError("Bình luận không hợp lệ.");
    if (reaction !== null && reaction !== "like" && reaction !== "dislike") throw new ForumError("Tương tác không hợp lệ.");
    const db = getSupabaseAdmin();
    const { data: comment, error: lookupError } = await db.from("forum_comments").select("*").eq("id", commentId).eq("topic_id", params.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!comment) throw new ForumError("Không tìm thấy bình luận.", 404);
    if (comment.hidden_at) throw new ForumError("Bình luận đã bị ẩn.", 403);
    const result = reaction === null
      ? await db.from("forum_comment_reactions").delete().eq("comment_id", commentId).eq("author_code", account.advisor_code)
      : await db.from("forum_comment_reactions").upsert({ comment_id: commentId, author_code: account.advisor_code, reaction }, { onConflict: "comment_id,author_code" });
    if (result.error) throw result.error;
    const { data, error } = await db.rpc("forum_reaction_counts", { comment_ids: [commentId], viewer_code: account.advisor_code });
    if (error) throw error;
    return NextResponse.json(data?.[0] || { comment_id: commentId, likes: 0, dislikes: 0, my_reaction: null });
  } catch (error) { return forumFailure(error); }
}
