import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";

export type ArchiveContentKey = "forms" | "guides" | "faq" | "about";

export type AboutItem = { id: string; title: string; content: string; imageUrl?: string };
export type AboutSection = {
  id: "awards" | "interest" | "benefits" | "payment-images" | "large-benefits";
  title: string;
  description: string;
  items: AboutItem[];
};
export type AboutContent = { sections: AboutSection[] };

export type ArchiveDocument = {
  id: string;
  title: string;
  file?: string;
  size?: string;
};

export type ArchiveFolder = {
  id: string;
  title: string;
  items: ArchiveDocument[];
};

export type ArchiveForms = {
  folders: ArchiveFolder[];
};

export type ArchiveGuide = {
  id: string;
  category?: string;
  title: string;
  description?: string;
  summary?: string;
  type?: "pdf" | "youtube";
  pdfUrl?: string;
  pageCount?: number;
  youtubeUrl?: string;
  youtubeId?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
};

export type ArchiveFaq = {
  id: string;
  question: string;
  answer: string;
};

const archiveRoot = path.join(process.cwd(), "Kho lưu trữ");
export const archiveBucket = "archive";

const dataFiles: Record<ArchiveContentKey, string> = {
  forms: "forms.json",
  guides: "guides.json",
  faq: "faq.json",
  about: "about.json"
};

const fallbackContent: Record<ArchiveContentKey, unknown> = {
  forms: { folders: [] },
  guides: [],
  faq: [],
  about: {
    sections: [
      { id: "payment-images", title: "Thông tin về Bảo Việt Nhân thọ", description: "Những thông tin nổi bật về Bảo Việt Nhân thọ.", items: [] },
      { id: "awards", title: "Danh hiệu Bảo Việt Nhân thọ đạt được", description: "Các giải thưởng, danh hiệu và dấu ấn nổi bật.", items: [] },
      { id: "interest", title: "Lãi suất công bố", description: "Thông tin lãi suất công bố trong 3 năm gần nhất.", items: [] },
      { id: "benefits", title: "Chi trả quyền lợi bảo hiểm", description: "Thông tin tổng hợp về hoạt động chi trả quyền lợi.", items: [] }
    ]
  }
};

function dataPath(key: ArchiveContentKey) {
  return path.join(archiveRoot, "data", dataFiles[key]);
}

function normalizeAboutContent(value: unknown): AboutContent {
  const source = value && typeof value === "object" && "sections" in value && Array.isArray((value as AboutContent).sections)
    ? (value as AboutContent).sections
    : [];
  const byId = new Map(source.map((section) => [section.id, section]));
  const specs: Array<[AboutSection["id"], string, string]> = [
    ["payment-images", "Thông tin về Bảo Việt Nhân thọ", "Những thông tin nổi bật về Bảo Việt Nhân thọ."],
    ["awards", "Danh hiệu Bảo Việt Nhân thọ đạt được", "Các giải thưởng, danh hiệu và dấu ấn nổi bật."],
    ["interest", "Lãi suất công bố", "Thông tin lãi suất công bố trong 3 năm gần nhất."],
    ["benefits", "Chi trả quyền lợi bảo hiểm", "Thông tin tổng hợp về hoạt động chi trả quyền lợi."]
  ];
  return {
    sections: specs.map(([id, defaultTitle, defaultDescription]) => {
      const existing = byId.get(id);
      const legacyTitles = id === "payment-images"
        ? new Set(["Hình ảnh chi trả tiêu biểu"])
        : id === "interest"
          ? new Set(["Lãi suất 5 năm qua", "Lãi suất 3 năm qua"])
          : new Set<string>();
      const legacyDescription = id === "payment-images" ? "Những hình ảnh chi trả quyền lợi tiêu biểu." : id === "interest" ? "Thông tin lãi suất công bố trong 5 năm gần nhất." : "";
      const savedTitle = typeof existing?.title === "string" ? existing.title : null;
      const savedDescription = typeof existing?.description === "string" ? existing.description : null;
      const title = savedTitle !== null && !legacyTitles.has(savedTitle) ? savedTitle : defaultTitle;
      const description = savedDescription !== null && savedDescription !== legacyDescription ? savedDescription : defaultDescription;
      return { ...existing, id, title, description, items: existing?.items ?? [] };
    })
  };
}

export function getArchivePublicPath(...segments: string[]) {
  return path.join(archiveRoot, "public", ...segments);
}

export function normalizeArchiveObjectPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("Đường dẫn file không hợp lệ.");
  }
  return normalized;
}

async function ensureArchiveBucket() {
  const supabase = getSupabaseAdmin();
  const bucketOptions = {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/json", "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]
  };
  const { error } = await supabase.storage.createBucket(archiveBucket, bucketOptions);
  if (error && /already exists|duplicate/i.test(error.message)) {
    const { error: updateError } = await supabase.storage.updateBucket(archiveBucket, bucketOptions);
    if (updateError) throw updateError;
  } else if (error) throw error;
  return supabase;
}

export async function readArchiveContent<T>(key: ArchiveContentKey): Promise<T> {
  try {
    const supabase = await ensureArchiveBucket();
    const { data, error } = await supabase.storage.from(archiveBucket).download(`data/${dataFiles[key]}`);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      return (key === "about" ? normalizeAboutContent(parsed) : parsed) as T;
    }
  } catch {
    // Dùng dữ liệu đóng gói trong project khi Supabase chưa được cấu hình
    // hoặc kho lưu trữ chưa có dữ liệu.
  }

  try {
    const raw = await readFile(dataPath(key), "utf8");
    const parsed = JSON.parse(raw);
    return (key === "about" ? normalizeAboutContent(parsed) : parsed) as T;
  } catch {
    const fallback = fallbackContent[key];
    return (key === "about" ? normalizeAboutContent(fallback) : fallback) as T;
  }
}

export async function writeArchiveContent(key: ArchiveContentKey, value: unknown) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    const supabase = await ensureArchiveBucket();
    const { error } = await supabase.storage
      .from(archiveBucket)
      .upload(`data/${dataFiles[key]}`, content, {
        contentType: "application/json",
        upsert: true
      });
    if (error) throw error;
    return;
  } catch (error) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) throw error;
  }

  await mkdir(path.join(archiveRoot, "data"), { recursive: true });
  await writeFile(dataPath(key), content, "utf8");
}

export async function uploadArchiveFile(objectPath: string, data: ArrayBuffer, contentType: string) {
  const normalized = normalizeArchiveObjectPath(objectPath);
  try {
    const supabase = await ensureArchiveBucket();
    const { error } = await supabase.storage.from(archiveBucket).upload(normalized, data, {
      contentType,
      upsert: true
    });
    if (error) throw error;
    return;
  } catch (error) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) throw error;
  }

  const filePath = getArchivePublicPath(...normalized.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(data));
}

export async function downloadArchiveFile(objectPath: string) {
  const normalized = normalizeArchiveObjectPath(objectPath);
  try {
    const supabase = await ensureArchiveBucket();
    const { data, error } = await supabase.storage.from(archiveBucket).download(normalized);
    if (!error && data) return Buffer.from(await data.arrayBuffer());
  } catch {
    // File cũ nằm trong project vẫn được hỗ trợ.
  }
  return readFile(getArchivePublicPath(...normalized.split("/")));
}

export function isArchiveContentKey(value: string | null): value is ArchiveContentKey {
  return value === "forms" || value === "guides" || value === "faq" || value === "about";
}

export function safeArchiveFileName(name: string, fallback: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)/g, "") || fallback
  );
}

export function archiveFileSizeLabel(size: number) {
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
