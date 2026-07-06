import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";

export type ArchiveContentKey = "forms" | "guides" | "faq";

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
  faq: "faq.json"
};

const fallbackContent: Record<ArchiveContentKey, unknown> = {
  forms: { folders: [] },
  guides: [],
  faq: []
};

function dataPath(key: ArchiveContentKey) {
  return path.join(archiveRoot, "data", dataFiles[key]);
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
  const { error } = await supabase.storage.createBucket(archiveBucket, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/json", "application/pdf"]
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return supabase;
}

export async function readArchiveContent<T>(key: ArchiveContentKey): Promise<T> {
  try {
    const supabase = await ensureArchiveBucket();
    const { data, error } = await supabase.storage.from(archiveBucket).download(`data/${dataFiles[key]}`);
    if (!error && data) return JSON.parse(await data.text()) as T;
  } catch {
    // Dùng dữ liệu đóng gói trong project khi Supabase chưa được cấu hình
    // hoặc kho lưu trữ chưa có dữ liệu.
  }

  try {
    const raw = await readFile(dataPath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallbackContent[key] as T;
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
  return value === "forms" || value === "guides" || value === "faq";
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
