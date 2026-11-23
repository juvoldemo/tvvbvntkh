import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { getSupabaseAdmin } from "../lib/supabase";

config({ path: ".env.local", quiet: true });
async function main() {
  const db = getSupabaseAdmin();
  const { data: topics, error } = await db.from("forum_topics").select("id,title,content").like("title", "[Bài mẫu%] %");
  if (error) throw error;
  const directory = `outputs/forum/rewrite-${Date.now()}`;
  await mkdir(directory, { recursive: true });
  const comments: { id: string; topic_id: string; content: string }[] = [];
  for (const topic of topics || []) {
    for (let offset = 0; ; offset += 500) {
      const result = await db.from("forum_comments").select("id,topic_id,content").eq("topic_id", topic.id).like("content", "[Phản hồi mẫu] %").order("id").range(offset, offset + 499);
      if (result.error) throw result.error;
      comments.push(...(result.data || []));
      if ((result.data || []).length < 500) break;
    }
  }
  await writeFile(`${directory}/backup.json`, JSON.stringify({ topics, comments }, null, 2));
  for (const topic of topics || []) {
    const title = topic.title.replace(/^\[Bài mẫu(?: \d+)?\]\s*/u, "");
    const content = topic.content
      .replace(/^Dữ liệu mẫu kiểm thử giao diện[^\n]*\n\n/u, "")
      .replace(/\n\nẢnh đính kèm \(nếu có\) chỉ dùng để minh họa kiểm thử\.$/u, "");
    const result = await db.from("forum_topics").update({ title, content }).eq("id", topic.id).eq("title", topic.title).eq("content", topic.content).select("id").single();
    if (result.error) throw result.error;
  }
  for (const comment of comments) {
    const content = comment.content.replace(/^\[Phản hồi mẫu\]\s*/u, "");
    const result = await db.from("forum_comments").update({ content }).eq("id", comment.id).eq("content", comment.content).select("id").single();
    if (result.error) throw result.error;
  }
  for (const topic of topics || []) {
    const result = await db.from("forum_topics").select("title,content").eq("id", topic.id).single();
    if (result.error) throw result.error;
    assert.ok(!/\[Bài mẫu/.test(result.data.title));
    const remaining = await db.from("forum_comments").select("id", { count: "exact", head: true }).eq("topic_id", topic.id).like("content", "[Phản hồi mẫu] %");
    if (remaining.error) throw remaining.error;
    assert.equal(remaining.count, 0);
  }
  console.log(JSON.stringify({ updatedTopics: topics?.length || 0, updatedComments: comments.length, backup: directory }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
