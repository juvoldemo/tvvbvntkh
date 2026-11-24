import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForumOrigin, forumAccount, ForumError, forumFailure, forumForm, presentForumRows, removeForumFiles, uploadForumFiles, preparedForumFiles } from "@/lib/forum-server";
import { FORUM_MAX_FILES } from "@/lib/forum";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await forumAccount(request);
    const search = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 200);
    const rawPage = Number(request.nextUrl.searchParams.get("page") || 0);
    const page = Number.isInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, 10000) : 0;
    function topicQuery(withPins: boolean) {
      let query = getSupabaseAdmin().from("forum_topics").select("*", { count: "exact" });
      if (withPins) query = query.order("pinned_at", { ascending: false, nullsFirst: false });
      query = query.order("last_activity_at", { ascending: false }).order("id", { ascending: false }).range(page * 10, page * 10 + 9);
      if (search) query = query.ilike("title", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
      return query;
    }
    let { data, count, error } = await topicQuery(true);
    // Keep the existing forum available until the additive migration is applied.
    if (error?.code === "42703" || error?.code === "PGRST204") ({ data, count, error } = await topicQuery(false));
    if (error) throw error;
    return NextResponse.json({ topics: await presentForumRows(data || []), hasMore: (page + 1) * 10 < (count || 0), totalPages: Math.max(1, Math.ceil((count || 0) / 10)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
export async function POST(request: NextRequest) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    const { form, files } = await forumForm(request);
    const title = String(form.get("title") || "").trim();
    const content = String(form.get("content") || "").trim();
    if (!title || title.length > 200) throw new ForumError("Tiêu đề cần từ 1 đến 200 ký tự.");
    if (!content || content.length > 20000) throw new ForumError("Nội dung cần từ 1 đến 20.000 ký tự.");
    const prepared = await preparedForumFiles(form, account.advisor_code);
    if (prepared.length + files.length > FORUM_MAX_FILES) throw new ForumError("Tối đa 4 tệp đính kèm.");
    const uploaded = await uploadForumFiles(files);
    const attachments = [...prepared, ...uploaded];
    const { data, error } = await getSupabaseAdmin().from("forum_topics").insert({ title, content, anonymous: form.get("anonymous") === "true", author_code: account.advisor_code, attachments }).select("id").single();
    if (error) { await removeForumFiles(uploaded); throw error; }
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return forumFailure(error); }
}
