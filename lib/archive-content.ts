import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

export async function readArchiveContent<T>(key: ArchiveContentKey): Promise<T> {
  try {
    const raw = await readFile(dataPath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallbackContent[key] as T;
  }
}

export async function writeArchiveContent(key: ArchiveContentKey, value: unknown) {
  await mkdir(path.join(archiveRoot, "data"), { recursive: true });
  await writeFile(dataPath(key), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
