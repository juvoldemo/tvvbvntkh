import { NextRequest, NextResponse } from "next/server";
import { FORUM_FILE_LIMIT } from "@/lib/forum";
import { checkForumOrigin, FORUM_BUCKET, forumAccount, ForumError, forumFailure, signForumUpload } from "@/lib/forum-server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    checkForumOrigin(request);
    const account = await forumAccount(request);
    if (Number(request.headers.get("content-length")) > 4096) throw new ForumError("Yêu cầu không hợp lệ.");
    const { name, size } = await request.json();
    if (typeof name !== "string" || !name.trim() || name.length > 255 || !Number.isInteger(size) || size <= 0 || size >= FORUM_FILE_LIMIT) throw new ForumError("Mỗi ảnh hoặc tệp phải có dung lượng lớn hơn 0 và nhỏ hơn 5 MB.");
    const id = crypto.randomUUID();
    const { data, error } = await getSupabaseAdmin().storage.from(FORUM_BUCKET).createSignedUploadUrl(id);
    if (error || !data) throw new ForumError("Chưa thể tải tệp. Vui lòng kiểm tra kho forum-files đã được khởi tạo.", 503);
    const receipt = signForumUpload({ id, name: name.replace(/[\r\n\x00-\x1f]/g, "").slice(0, 200), size, owner: account.advisor_code, expires: Date.now() + 60 * 60 * 1000 });
    return NextResponse.json({ uploadUrl: data.signedUrl, receipt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return forumFailure(error); }
}
