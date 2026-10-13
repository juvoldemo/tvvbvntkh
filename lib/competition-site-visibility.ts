import { getSupabaseAdmin } from "@/lib/supabase";

// Private website settings only. Shared competition_programs rows are untouched.
const BUCKET = "tvvbvntkh-site-settings";
const FOLDER = "competition-visibility";
let bucketReady: Promise<void> | undefined;

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const storage = getSupabaseAdmin().storage;
      const { error } = await storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 1024,
        allowedMimeTypes: ["application/json"]
      });
      // Concurrent server instances may create the bucket at the same time.
      if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    })().catch(error => { bucketReady = undefined; throw error; });
  }
  await bucketReady;
}

export async function siteHiddenCompetitionIds(): Promise<Set<string>> {
  await ensureBucket();
  const ids = new Set<string>();
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(FOLDER, {
      limit: 1000, offset, sortBy: { column: "name", order: "asc" }
    });
    if (error) throw error;
    for (const file of data ?? []) {
      if (file.id && file.name.endsWith(".json")) ids.add(file.name.slice(0, -5));
    }
    if ((data ?? []).length < 1000) break;
  }
  return ids;
}

export async function setCompetitionSiteHidden(id: string, hidden: boolean) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid competition ID");
  await ensureBucket();
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  const objectPath = FOLDER + "/" + id + ".json";
  // One object per program avoids losing other changes across server instances.
  const { error } = hidden
    ? await storage.upload(objectPath, JSON.stringify({ hidden: true }), {
        contentType: "application/json", cacheControl: "0", upsert: true
      })
    : await storage.remove([objectPath]);
  if (error) throw error;
}
