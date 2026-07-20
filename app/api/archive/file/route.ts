import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { downloadArchiveFile, normalizeArchiveObjectPath } from "@/lib/archive-content";

export const runtime = "nodejs";

function safeArchivePath(value: string | null) {
  if (!value) return null;
  try {
    return normalizeArchiveObjectPath(value);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const objectPath = safeArchivePath(request.nextUrl.searchParams.get("path"));
  if (!objectPath) {
    return NextResponse.json({ error: "File không hợp lệ." }, { status: 400 });
  }

  try {
    const buffer = await downloadArchiveFile(objectPath);
    const fileName = path.basename(objectPath);
    const extension = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
}
