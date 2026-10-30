import { getSupabaseAdmin } from "@/lib/supabase";

export type SkillsSurveyReport = {
  advisorCode: string;
  advisorName: string;
  groupName: string;
  answers: Record<number, number>;
  skillScores: number[];
  total: number;
  average: number;
  classification: string;
  scoringVersion: string;
  updatedAt: string;
};

const BUCKET = "skills-survey-reports";
let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketReady) bucketReady = (async () => {
    const { error } = await getSupabaseAdmin().storage.createBucket(BUCKET, {
      public: false, fileSizeLimit: 64 * 1024, allowedMimeTypes: ["application/json"]
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  })().catch((error) => { bucketReady = null; throw error; });
  await bucketReady;
}

export async function saveSkillsSurveyReport(report: SkillsSurveyReport) {
  await ensureBucket();
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).upload(
    `results/${encodeURIComponent(report.advisorCode)}.json`,
    JSON.stringify(report),
    { contentType: "application/json", upsert: true, cacheControl: "0" }
  );
  if (error) throw error;
}

async function listReportPaths() {
  await ensureBucket();
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  const files: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list("results", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    files.push(...(data ?? []).filter((file) => file.name.endsWith(".json")).map((file) => file.name));
    if (!data || data.length < 100) break;
  }
  return files.map((name) => `results/${name}`);
}

export async function listSkillsSurveyReports() {
  const files = await listReportPaths();
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  const reports: SkillsSurveyReport[] = [];
  for (let offset = 0; offset < files.length; offset += 20) {
    const batch = await Promise.all(files.slice(offset, offset + 20).map(async (name) => {
      const { data, error } = await storage.download(name);
      if (error || !data) throw error || new Error("Không thể đọc kết quả khảo sát.");
      return JSON.parse(await data.text()) as SkillsSurveyReport;
    }));
    reports.push(...batch);
  }
  return reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteAllSkillsSurveyReports() {
  const paths = await listReportPaths();
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  // Enumerate before removing to avoid skipping pages as the folder shrinks.
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await storage.remove(paths.slice(offset, offset + 100));
    if (error) throw error;
  }
  return paths.length;
}
