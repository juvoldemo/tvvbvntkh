import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const publicRoot = path.join(process.cwd(), "Kho lưu trữ", "public");

function safeArchivePath(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  const filePath = path.resolve(publicRoot, normalized);
  const rootPath = path.resolve(publicRoot);
  if (!filePath.startsWith(rootPath + path.sep)) return null;
  return filePath;
}

export async function GET(request: NextRequest) {
  const filePath = safeArchivePath(request.nextUrl.searchParams.get("path"));
  if (!filePath) {
    return NextResponse.json({ error: "File không hợp lệ." }, { status: 400 });
  }

  try {
    const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    const fileName = path.basename(filePath);
    const isPdf = fileName.toLowerCase().endsWith(".pdf");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
}
