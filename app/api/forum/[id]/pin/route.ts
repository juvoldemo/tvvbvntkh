import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (account.advisor_code !== "ADMIN") throw new ForumError("Chỉ admin được ghim bài viết.", 403);
    if (!uuidPattern.test(params.id)) throw new ForumError("Chủ đề không hợp lệ.", 404);
    const body = await request.json();
    if (typeof body.pinned !== "boolean") throw new ForumError("Trạng thái ghim không hợp lệ.");
    const { data, error } = await getSupabaseAdmin().from("forum_topics")
      .update({ pinned_at: body.pinned ? new Date().toISOString() : null })
      .eq("id", params.id).select("id,pinned_at").maybeSingle();
    if (error?.code === "42703" || error?.code === "PGRST204") throw new ForumError("Vui lòng chạy supabase/forum-pins.sql trên Supabase để bật ghim bài viết.", 503);
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bài đăng.", 404);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
