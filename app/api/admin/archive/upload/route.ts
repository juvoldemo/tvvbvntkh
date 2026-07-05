import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { archiveFileSizeLabel, getArchivePublicPath, safeArchiveFileName } from "@/lib/archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "forms");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Vui lòng tải lên file PDF." }, { status: 400 });
  }

  const baseName = safeArchiveFileName(file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`, `archive-${Date.now()}.pdf`);
  const fileName = kind === "guides" ? `${Date.now()}-${baseName}` : baseName;
  const relativeDir = kind === "guides" ? ["uploads", "guides"] : ["pdfs"];
  const targetDir = getArchivePublicPath(...relativeDir);

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), Buffer.from(await file.arrayBuffer()));

  const publicPath = `/${[...relativeDir, fileName].join("/")}`;
  return NextResponse.json({
    file: publicPath,
    pdfUrl: publicPath,
    size: archiveFileSizeLabel(file.size)
  });
}
