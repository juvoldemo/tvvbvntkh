import { config } from "dotenv";
import { getSupabaseAdmin } from "../lib/supabase";
config({ path: ".env.local", quiet: true });
async function main() {
  const db = getSupabaseAdmin();
  const { error } = await db.from("forum_topics").select("id,author_code,attachments,comment_count,last_activity_at").limit(0);
  const { error: commentsError } = await db.from("forum_comments").select("id,topic_id,parent_id,attachments").limit(0);
  const { data: bucket, error: bucketError } = await db.storage.getBucket("forum-files");
  console.log(JSON.stringify({ tablesReady: !error && !commentsError, tableErrorCode: error?.code || commentsError?.code, privateBucketReady: !!bucket && !bucket.public, bucketError: bucketError?.message }));
}
main().catch(() => { console.error("Unable to check forum storage configuration."); process.exitCode = 1; });
