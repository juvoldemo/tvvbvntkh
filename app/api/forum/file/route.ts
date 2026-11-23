import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { FORUM_BUCKET, forumAccount, ForumError, forumFailure, uuidPattern } from "@/lib/forum-server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await forumAccount(request);
    const topic = request.nextUrl.searchParams.get("topic") || "";
    const comment = request.nextUrl.searchParams.get("comment");
    const attachment = request.nextUrl.searchParams.get("attachment") || "";
    if (![topic, attachment, ...(comment ? [comment] : [])].every(id => uuidPattern.test(id))) throw new ForumError("Tệp không hợp lệ.", 404);
    let query = getSupabaseAdmin().from(comment ? "forum_comments" : "forum_topics").select("attachments").eq("id", comment || topic);
    if (comment) query = query.eq("topic_id", topic);
    const { data: row, error } = await query.maybeSingle();
    if (error) throw error;
    const file = (row?.attachments || []).find((item: { id: string }) => item.id === attachment);
    if (!file) throw new ForumError("Không tìm thấy tệp.", 404);
    const { data, error: downloadError } = await getSupabaseAdmin().storage.from(FORUM_BUCKET).download(file.path);
    if (downloadError || !data) throw new ForumError("Không thể tải tệp.", 404);
    const inline = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mime);
    return new NextResponse(data, { headers: {
      "Content-Type": inline ? file.mime : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": "private, no-store"
    } });
  } catch (error) { return forumFailure(error); }
}
