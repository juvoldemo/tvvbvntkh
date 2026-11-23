import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";
import { canViewForum, readForumSettings } from "@/lib/forum-settings-server";
import { forumDemoProfiles } from "@/lib/forum-demo";
import { FORUM_FILE_LIMIT, FORUM_MAX_FILES, type ForumAttachment, type ForumAuthor } from "@/lib/forum";

export const FORUM_BUCKET = "forum-files";
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ForumError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function forumAccount(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) throw new ForumError("Vui lòng đăng nhập để sử dụng diễn đàn.", 401);
  if (!canViewForum(request, await readForumSettings())) throw new ForumError("Diễn đàn hiện không khả dụng cho tài khoản này.", 403);
  const { data, error } = await getSupabaseAdmin().from("authorized_users").select("advisor_code,full_name,group_name,avatar_url").eq("advisor_code", code).maybeSingle();
  if (error) throw error;
  if (!data) throw new ForumError("Tài khoản không còn quyền truy cập.", 403);
  return data;
}
export function forumFailure(error: unknown) {
  if (error instanceof ForumError) return NextResponse.json({ error: error.message }, { status: error.status });
  const code = (error as { code?: string })?.code;
  if (code === "PGRST202" || code === "42883") return NextResponse.json({ error: "Vui lòng chạy supabase/forum-reactions.sql trên Supabase để bật thích/không thích." }, { status: 503 });
  if (code === "42P01" || code === "PGRST205") return NextResponse.json({ error: "Diễn đàn chưa được khởi tạo. Vui lòng chạy supabase/forum.sql trên Supabase." }, { status: 503 });
  console.error("Forum request failed", error instanceof Error ? error.message : code);
  return NextResponse.json({ error: "Không thể tải hoặc lưu dữ liệu diễn đàn. Vui lòng thử lại." }, { status: 500 });
}
export type StoredAttachment = Omit<ForumAttachment, "url"> & { path: string };
type UploadReceipt = { id: string; name: string; size: number; owner: string; expires: number };
function receiptSignature(payload: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest("hex");
}
export function signForumUpload(receipt: UploadReceipt) {
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${payload}.${receiptSignature(payload)}`;
}
function verifyForumUpload(token: string, owner: string): UploadReceipt {
  const [payload, signature = ""] = token.split(".");
  if (!payload) throw new ForumError("Tệp đính kèm không hợp lệ.");
  const expected = receiptSignature(payload);
  if (!/^[0-9a-f]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ForumError("Tệp đính kèm không hợp lệ.");
  let receipt: UploadReceipt;
  try { receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new ForumError("Tệp đính kèm không hợp lệ."); }
  if (receipt.owner !== owner || receipt.expires < Date.now() || !uuidPattern.test(receipt.id)) throw new ForumError("Phiên tải tệp đã hết hạn. Vui lòng chọn lại tệp.");
  return receipt;
}
function rasterMime(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
    : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 ? "image/png"
    : String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/) ? "image/gif"
    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" ? "image/webp" : "application/octet-stream";
}
export async function preparedForumFiles(form: FormData, owner: string, imagesOnly = false): Promise<StoredAttachment[]> {
  let tokens: unknown;
  try { tokens = JSON.parse(String(form.get("uploads") || "[]")); }
  catch { throw new ForumError("Danh sách tệp không hợp lệ."); }
  if (!Array.isArray(tokens) || tokens.length > FORUM_MAX_FILES || tokens.some(token => typeof token !== "string" || token.length > 3000)) throw new ForumError("Danh sách tệp không hợp lệ.");
  const files: StoredAttachment[] = [];
  for (const token of tokens) {
    const receipt = verifyForumUpload(token, owner);
    const { data, error } = await getSupabaseAdmin().storage.from(FORUM_BUCKET).download(receipt.id);
    if (error || !data) throw new ForumError("Tệp chưa được tải lên hoàn tất. Vui lòng chọn lại tệp.");
    if (data.size !== receipt.size || !data.size || data.size >= FORUM_FILE_LIMIT) throw new ForumError("Tệp đính kèm phải nhỏ hơn 5 MB và đúng dung lượng đã khai báo.");
    const mime = rasterMime(new Uint8Array(await data.arrayBuffer()));
    if (imagesOnly && !mime.startsWith("image/")) throw new ForumError("Bình luận chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WEBP.");
    files.push({ id: receipt.id, path: receipt.id, name: receipt.name, size: data.size, mime });
  }
  return files;
}
type StoredRow = { id: string; author_code: string; anonymous: boolean; attachments: StoredAttachment[]; [key: string]: unknown };
function anonymousForumName(authorCode: string, topicId: string) {
  // A secret-keyed pseudorandom code: stable per member within one topic,
  // without exposing a reversible account identifier or linking different topics.
  const digest = createHmac("sha256", process.env.USER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(JSON.stringify(["forum-anonymous", topicId, authorCode])).digest("hex");
  return `Ẩn danh ${1000 + (parseInt(digest.slice(0, 8), 16) % 9000)}`;
}
export async function presentForumRows(rows: StoredRow[], topicId?: string) {
  const codes = [...new Set(rows.filter(row => !row.anonymous && !forumDemoProfiles[row.author_code]).map(row => row.author_code))];
  const profiles = new Map<string, { full_name: string; group_name: string; avatar_url: string | null }>();
  if (codes.length) {
    const { data, error } = await getSupabaseAdmin().from("authorized_users").select("advisor_code,full_name,group_name,avatar_url").in("advisor_code", codes);
    if (error) throw error;
    for (const profile of data || []) profiles.set(profile.advisor_code, profile);
    const { data: avatars, error: avatarError } = await getSupabaseAdmin().from("advisor_profiles").select("advisor_code,image_url,image_path").in("advisor_code", codes);
    if (avatarError) throw avatarError;
    for (const avatar of avatars || []) {
      const profile = profiles.get(avatar.advisor_code);
      if (profile) profile.avatar_url = avatar.image_path
        ? getSupabaseAdmin().storage.from("advisor-images").getPublicUrl(String(avatar.image_path).replace(/^\/+|^advisor-images\//g, "")).data.publicUrl
        : avatar.image_url || profile.avatar_url;
    }
  }
  return rows.map(row => {
    const profile = forumDemoProfiles[row.author_code] || profiles.get(row.author_code);
    const author: ForumAuthor = row.anonymous
      ? { name: anonymousForumName(row.author_code, topicId || row.id), group: "", avatar: null, anonymous: true }
      : { name: profile?.full_name || "Thành viên", group: profile?.group_name || "", avatar: profile?.avatar_url || null, anonymous: false };
    // Explicit public fields: never send author_code, storage paths, or other account fields.
    const attachments = (row.attachments || []).map(file => ({ id: file.id, name: file.name, size: file.size, mime: file.mime,
      url: `/api/forum/file?topic=${topicId || row.id}${topicId ? `&comment=${row.id}` : ""}&attachment=${file.id}` }));
    return topicId
      ? { id: row.id, topic_id: row.topic_id, parent_id: row.parent_id, content: row.content, sticker: row.sticker, created_at: row.created_at, author, attachments }
      : { id: row.id, title: row.title, content: row.content, created_at: row.created_at, last_activity_at: row.last_activity_at, comment_count: row.comment_count, author, attachments };
  });
}
export async function forumForm(request: NextRequest) {
  if (Number(request.headers.get("content-length")) > 21 * 1024 * 1024) throw new ForumError("Tổng dung lượng đính kèm quá lớn.", 413);
  const form = await request.formData();
  const entries = form.getAll("files");
  if (entries.some(file => !(file instanceof File))) throw new ForumError("Tệp đính kèm không hợp lệ.");
  const files = entries as File[];
  if (files.length > FORUM_MAX_FILES) throw new ForumError(`Chỉ được đính kèm tối đa ${FORUM_MAX_FILES} tệp.`);
  for (const file of files) {
    if (!file.size || file.size >= FORUM_FILE_LIMIT) throw new ForumError("Mỗi ảnh hoặc tệp phải có dung lượng lớn hơn 0 và nhỏ hơn 5 MB.");
  }
  return { form, files };
}
export async function uploadForumFiles(files: File[], imagesOnly = false): Promise<StoredAttachment[]> {
  const uploaded: StoredAttachment[] = [];
  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Render only verified raster images. SVG/HTML and other files are downloads.
      const mime = rasterMime(bytes);
      if (imagesOnly && !mime.startsWith("image/")) throw new ForumError("Bình luận chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WEBP.");
      const id = crypto.randomUUID();
      const path = `${id}`;
      const { error } = await getSupabaseAdmin().storage.from(FORUM_BUCKET).upload(path, bytes, { contentType: mime });
      if (error) throw error;
      uploaded.push({ id, path, name: file.name.replace(/[\r\n\x00-\x1f]/g, "").slice(0, 200), size: file.size, mime });
    }
    return uploaded;
  } catch (error) {
    await removeForumFiles(uploaded);
    throw error;
  }
}
export async function removeForumFiles(files: StoredAttachment[]) {
  if (files.length) await getSupabaseAdmin().storage.from(FORUM_BUCKET).remove(files.map(file => file.path));
}
export function checkForumOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) throw new ForumError("Yêu cầu không hợp lệ.", 403);
}
