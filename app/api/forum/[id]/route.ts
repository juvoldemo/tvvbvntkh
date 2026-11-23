import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { FORUM_STICKERS, FORUM_MAX_FILES } from "@/lib/forum";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, forumForm, presentForumRows, removeForumFiles, uploadForumFiles, uuidPattern, preparedForumFiles } from "@/lib/forum-server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await forumAccount(request);
    if (!uuidPattern.test(params.id)) throw new ForumError("Chủ đề không hợp lệ.", 404);
    const db = getSupabaseAdmin();
    const { data: topic, error } = await db.from("forum_topics").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!topic) throw new ForumError("Không tìm thấy chủ đề.", 404);
    const rawPage = Number(request.nextUrl.searchParams.get("page") || 0);
    const page = Number.isInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, 10000) : 0;
    const { count, error: countError } = await db.from("forum_comments").select("id", { count: "exact", head: true }).eq("topic_id", params.id).is("parent_id", null);
    if (countError) throw countError;
    const totalPages = Math.max(1, Math.ceil((count || 0) / 10));
    const currentPage = request.nextUrl.searchParams.get("page") === "last" ? totalPages - 1 : Math.min(page, totalPages - 1);
    const { data: comments, error: commentsError } = await db.from("forum_comments").select("*").eq("topic_id", params.id).is("parent_id", null)
      .order("created_at").order("id").range(currentPage * 10, currentPage * 10 + 9);
    if (commentsError) throw commentsError;
    let parents = (comments || []).map(comment => comment.id);
    const seen = new Set(parents);
    while (parents.length) {
      const next: string[] = [];
      for (let start = 0; start < parents.length; start += 100) {
        for (let offset = 0; ; offset += 500) {
          const { data: nested, error: nestedError } = await db.from("forum_comments").select("*").eq("topic_id", params.id).in("parent_id", parents.slice(start, start + 100)).order("created_at").order("id").range(offset, offset + 499);
          if (nestedError) throw nestedError;
          for (const child of nested || []) if (!seen.has(child.id)) { seen.add(child.id); comments!.push(child); next.push(child.id); }
          if (!nested || nested.length < 500) break;
        }
      }
      parents = next;
    }
    const [topics, replies] = await Promise.all([presentForumRows([topic]), presentForumRows(comments || [], params.id)]);
    const { data: reactions, error: reactionsError } = replies.length
      ? await db.rpc("forum_reaction_counts", { comment_ids: replies.map(comment => comment.id), viewer_code: account.advisor_code })
      : { data: [], error: null };
    if (reactionsError && !["PGRST202", "42883", "42P01", "PGRST205"].includes(reactionsError.code)) throw reactionsError;
    const counts = new Map<string, { likes: number; dislikes: number; my_reaction: string | null }>((reactions || []).map((row: { comment_id: string; likes: number; dislikes: number; my_reaction: string | null }) => [row.comment_id, row]));
    return NextResponse.json({ topic: { ...topics[0], can_manage: topic.author_code === account.advisor_code }, comments: replies.map(comment => ({ ...comment, likes: counts.get(comment.id)?.likes || 0, dislikes: counts.get(comment.id)?.dislikes || 0, my_reaction: counts.get(comment.id)?.my_reaction || null })), page: currentPage, totalPages, rootCount: count || 0, hasMore: currentPage + 1 < totalPages }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
async function ownedTopic(request: NextRequest, id: string) {
  checkForumOrigin(request);
  const account = await forumAccount(request);
  if (!uuidPattern.test(id)) throw new ForumError("Chủ đề không hợp lệ.", 404);
  const { data, error } = await getSupabaseAdmin().from("forum_topics").select("id,author_code").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ForumError("Không tìm thấy bài đăng.", 404);
  if (data.author_code !== account.advisor_code) throw new ForumError("Bạn chỉ có thể chỉnh sửa hoặc xóa bài do mình đăng.", 403);
  return account;
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await ownedTopic(request, params.id);
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!title || title.length > 200) throw new ForumError("Tiêu đề cần từ 1 đến 200 ký tự.");
    if (!content || content.length > 20000) throw new ForumError("Nội dung cần từ 1 đến 20.000 ký tự.");
    const { data: current, error: currentError } = await getSupabaseAdmin().from("forum_topics").select("attachments").eq("id", params.id).eq("author_code", account.advisor_code).maybeSingle();
    if (currentError) throw currentError;
    if (!current) throw new ForumError("Không tìm thấy bài đăng.", 404);
    const existing = current.attachments || [];
    const retainedIds: unknown = body.retainedIds ?? existing.map((file: { id: string }) => file.id);
    if (!Array.isArray(retainedIds) || retainedIds.length > FORUM_MAX_FILES || new Set(retainedIds).size !== retainedIds.length || retainedIds.some(id => typeof id !== "string" || !existing.some((file: { id: string }) => file.id === id))) throw new ForumError("Danh sách tệp giữ lại không hợp lệ.");
    const uploadForm = new FormData();
    uploadForm.set("uploads", JSON.stringify(body.uploads ?? []));
    const added = await preparedForumFiles(uploadForm, account.advisor_code);
    if (retainedIds.length + added.length > FORUM_MAX_FILES) throw new ForumError("Tối đa 4 ảnh hoặc tệp đính kèm.");
    const attachments = [...existing.filter((file: { id: string }) => retainedIds.includes(file.id)), ...added];
    if (new Set(attachments.map(file => file.id)).size !== attachments.length) throw new ForumError("Tệp đính kèm bị trùng lặp.");
    const { data, error } = await getSupabaseAdmin().from("forum_topics").update({ title, content, attachments })
      .eq("id", params.id).eq("author_code", account.advisor_code).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bài đăng.", 404);
    return NextResponse.json({ ok: true, title, content, attachments: attachments.map(file => ({ id: file.id, name: file.name, size: file.size, mime: file.mime, url: `/api/forum/file?topic=${params.id}&attachment=${file.id}` })) });
  } catch (error) { return forumFailure(error); }
}
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await ownedTopic(request, params.id);
    const { data, error } = await getSupabaseAdmin().from("forum_topics").delete()
      .eq("id", params.id).eq("author_code", account.advisor_code).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new ForumError("Không tìm thấy bài đăng.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) { return forumFailure(error); }
}
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (!uuidPattern.test(params.id)) throw new ForumError("Chủ đề không hợp lệ.", 404);
    const { form, files } = await forumForm(request);
    const content = String(form.get("content") || "").trim();
    const sticker = String(form.get("sticker") || "") || null;
    const parentId = String(form.get("parentId") || "") || null;
    if (content.length > 10000) throw new ForumError("Bình luận tối đa 10.000 ký tự.");
    if (sticker && !FORUM_STICKERS.includes(sticker as typeof FORUM_STICKERS[number])) throw new ForumError("Sticker không hợp lệ.");
    const prepared = await preparedForumFiles(form, account.advisor_code, true);
    if (prepared.length + files.length > FORUM_MAX_FILES) throw new ForumError("Tối đa 4 ảnh đính kèm.");
    if (!content && !sticker && !files.length && !prepared.length) throw new ForumError("Vui lòng nhập nội dung, chọn sticker hoặc gửi ảnh.");
    const db = getSupabaseAdmin();
    const { data: topic, error: topicError } = await db.from("forum_topics").select("id").eq("id", params.id).maybeSingle();
    if (topicError) throw topicError;
    if (!topic) throw new ForumError("Không tìm thấy chủ đề.", 404);
    if (parentId) {
      if (!uuidPattern.test(parentId)) throw new ForumError("Bình luận được trả lời không hợp lệ.");
      const { data: parent, error } = await db.from("forum_comments").select("id").eq("id", parentId).eq("topic_id", params.id).maybeSingle();
      if (error) throw error;
      if (!parent) throw new ForumError("Không tìm thấy bình luận cần trả lời.");
    }
    const uploaded = await uploadForumFiles(files, true);
    const attachments = [...prepared, ...uploaded];
    const { data, error } = await db.from("forum_comments").insert({ topic_id: params.id, parent_id: parentId, author_code: account.advisor_code, anonymous: form.get("anonymous") === "true", content, sticker, attachments }).select("*").single();
    if (error) { await removeForumFiles(uploaded); throw error; }
    const comments = await presentForumRows([data], params.id);
    return NextResponse.json({ id: data.id, comment: comments[0] }, { status: 201 });
  } catch (error) { return forumFailure(error); }
}
