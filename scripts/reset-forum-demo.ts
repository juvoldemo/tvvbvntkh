import { config } from "dotenv";
import { randomInt, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { getSupabaseAdmin } from "../lib/supabase";
import { FORUM_BUCKET, presentForumRows } from "../lib/forum-server";
config({ path: ".env.local", quiet: true });
const subjects = ["Lập kế hoạch tuần", "Chuẩn bị cuộc hẹn đầu tiên", "Lắng nghe nhu cầu khách hàng", "Theo dõi sau tư vấn", "Hỗ trợ thành viên mới", "Chia sẻ tài liệu trong nhóm", "Quản lý lịch hẹn", "Thực hành tình huống tư vấn", "Duy trì động lực làm việc", "Tổ chức họp nhóm hiệu quả", "Ghi chú sau cuộc gặp", "Phối hợp cùng đồng nghiệp", "Học tập qua tình huống thực tế", "Sắp xếp công việc ưu tiên", "Chuẩn bị hội nghị khách hàng", "Trao đổi kỹ năng đặt câu hỏi", "Xây dựng thói quen hằng ngày", "Theo dõi mục tiêu tháng", "Cải thiện trải nghiệm khách hàng", "Nhìn lại kết quả cuối tuần"];
const messages = ["Mình thường chuẩn bị danh sách việc cần làm từ hôm trước, rồi chọn ba việc quan trọng nhất để bắt đầu.", "Mình ghi lại nhu cầu cụ thể và các câu hỏi còn vướng để trao đổi tiếp trong buổi hẹn sau.", "Nhóm mình dành thời gian thực hành theo cặp rồi góp ý từng tình huống. Cách này khá dễ áp dụng.", "Theo mình nên chia công việc thành các bước nhỏ và cập nhật tiến độ vào cuối ngày.", "Mình muốn tham khảo thêm cách mọi người xử lý khi lịch hẹn thay đổi đột xuất.", "Mình dùng lịch điện thoại để nhắc việc và bảng theo dõi để tránh bỏ sót những nội dung cần phản hồi.", "Cảm ơn mọi người đã chia sẻ. Mình sẽ thử áp dụng trong tuần tới và ghi lại những điểm cần cải thiện.", "Mình thấy trao đổi sớm với người đồng hành giúp giải quyết vướng mắc nhanh hơn."];
const pick = <T,>(values: T[]): T => values[randomInt(values.length)];
async function main() {
  assert.ok(process.argv.includes("--replace-all"), "Require --replace-all to replace existing forum posts.");
  const db = getSupabaseAdmin();
  async function all(table: string) {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from(table).select("*").order(table === "forum_comment_reactions" ? "comment_id" : "id").range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
  }
  const { data: accounts, error: accountError } = await db.from("authorized_users").select("advisor_code,full_name,group_name").order("advisor_code").limit(1000);
  if (accountError) throw accountError;
  const members = (accounts || []).filter(row => row.full_name?.trim() && !/ADMIN|TEST|DEMO/i.test(row.advisor_code));
  assert.ok(members.length >= 8, "Need eight existing real member accounts.");
  const oldTopics = await all("forum_topics");
  const oldComments = await all("forum_comments");
  const { data: reactionProbe, error: reactionError } = await db.from("forum_comment_reactions").select("comment_id").limit(1);
  if (reactionError && !["42P01", "PGRST205"].includes(reactionError.code)) throw reactionError;
  const oldReactions = reactionError ? [] : await all("forum_comment_reactions");
  const directory = `outputs/forum/reset-${Date.now()}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/backup.json`, JSON.stringify({ topics: oldTopics, comments: oldComments, reactions: oldReactions }, null, 2));
  const images: { id: string; path: string; name: string; size: number; mime: string }[] = [];
  for (const name of ["Thưởng năng suất tháng.png", "Thưởng phát triển hệ thống.png", "Thưởng Quý.png"]) {
    const bytes = await readFile(`public/${name}`);
    assert.ok(bytes.length < 5 * 1024 * 1024);
    const id = randomUUID();
    const { error } = await db.storage.from(FORUM_BUCKET).upload(id, bytes, { contentType: "image/png" });
    if (error) throw error;
    images.push({ id, path: id, name, size: bytes.length, mime: "image/png" });
  }
  const attachment = () => randomInt(2) ? [pick(images)] : [];
  const notice = "Dữ liệu mẫu kiểm thử giao diện, được gán cho tài khoản thật có sẵn trong hệ thống; không phải nội dung do các thành viên tự đăng.";
  const createdIds: string[] = [];
  const manifest: { id: string; roots: number; replies: number }[] = [];
  const now = Date.now();
  for (let index = 0; index < 20; index++) {
    const id = randomUUID();
    const start = now - (20 - index) * 90 * 60 * 1000;
    const { error } = await db.from("forum_topics").insert({ id, author_code: pick(members).advisor_code, anonymous: false, title: `[Bài mẫu ${index + 1}] ${subjects[index]}`, content: `${notice}\n\nCùng chia sẻ kinh nghiệm về ${subjects[index].toLowerCase()}. Bạn thường chuẩn bị như thế nào? Có cách làm nào giúp bạn tiết kiệm thời gian và phối hợp hiệu quả hơn?\n\nẢnh đính kèm (nếu có) chỉ dùng để minh họa kiểm thử.`, attachments: attachment(), created_at: new Date(start).toISOString(), last_activity_at: new Date(start).toISOString() });
    if (error) throw error;
    createdIds.push(id);
    await writeFile(`${directory}/created-ids.json`, JSON.stringify(createdIds));
    const roots = randomInt(5, 16);
    let replies = 0;
    const parents: string[] = [];
    async function comment(parent: string | null, text: string) {
      const commentId = randomUUID();
      const { error } = await db.from("forum_comments").insert({ id: commentId, topic_id: id, parent_id: parent, author_code: pick(members).advisor_code, anonymous: false, content: `[Phản hồi mẫu] ${text}`, attachments: attachment(), created_at: new Date(start + (parents.length + replies + 1) * 60000).toISOString() });
      if (error) throw error;
      return commentId;
    }
    for (let root = 0; root < roots; root++) {
      const parent = await comment(null, pick(messages)); parents.push(parent);
      for (let child = 0, count = randomInt(4); child < count; child++) {
        const reply = await comment(parent, pick(messages)); replies++;
        if (randomInt(4) === 0) { await comment(reply, "Cảm ơn bạn, mình đồng ý. Mình sẽ thử cách này và chia sẻ thêm kết quả."); replies++; }
      }
    }
    manifest.push({ id, roots, replies });
    console.log(`Prepared topic ${index + 1}/20: ${roots} root comments, ${replies} nested replies.`);
  }
  // Verify all new content before deleting any existing discussion.
  const realCodes = new Set(members.map(member => member.advisor_code));
  for (const item of manifest) {
    const { data: topic, error } = await db.from("forum_topics").select("*").eq("id", item.id).single();
    if (error) throw error;
    const { data: comments, error: commentsError } = await db.from("forum_comments").select("*").eq("topic_id", item.id);
    if (commentsError) throw commentsError;
    assert.equal(comments!.filter(row => !row.parent_id).length, item.roots);
    assert.equal(comments!.length, item.roots + item.replies);
    assert.equal(topic.comment_count, comments!.length);
    assert.ok(realCodes.has(topic.author_code) && comments!.every(row => realCodes.has(row.author_code)));
    const visible = await presentForumRows([topic]);
    assert.ok(members.some(member => member.full_name === visible[0].author.name));
  }
  // Delete child comments together so the self-referencing FK remains valid.
  for (let start = 0; start < oldTopics.length; start += 100) {
    const ids = oldTopics.slice(start, start + 100).map(row => row.id);
    const { error: commentsError } = await db.from("forum_comments").delete().in("topic_id", ids);
    if (commentsError) throw commentsError;
    const { error } = await db.from("forum_topics").delete().in("id", ids);
    if (error) throw error;
  }
  const finalTopics = await all("forum_topics");
  assert.equal(finalTopics.length, 20);
  const finalComments = await all("forum_comments");
  const summary = { topics: 20, rootComments: manifest.reduce((sum, row) => sum + row.roots, 0), nestedReplies: manifest.reduce((sum, row) => sum + row.replies, 0), topicsWithImages: finalTopics.filter(row => row.attachments.length).length, commentsWithImages: finalComments.filter(row => row.attachments.length).length, deletedTopics: oldTopics.length, deletedComments: oldComments.length, realAccountsVerified: true, paginationTestTopics: manifest.filter(row => row.roots > 10).length, backup: directory };
  await writeFile(`${directory}/summary.json`, JSON.stringify({ ...summary, manifest }, null, 2));
  console.log(JSON.stringify(summary));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
