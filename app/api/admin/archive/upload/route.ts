import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { archiveFileSizeLabel, safeArchiveFileName, uploadArchiveFile } from "@/lib/archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "forms");
  const isAboutImage = kind === "about" && file instanceof File && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  if (!(file instanceof File) || (file.type !== "application/pdf" && !isAboutImage)) {
    return NextResponse.json({ error: kind === "about" ? "Vui lòng tải lên ảnh JPG, PNG, WEBP hoặc GIF." : "Vui lòng tải lên file PDF." }, { status: 400 });
  }

  const baseName = safeArchiveFileName(file.name, `archive-${Date.now()}${isAboutImage ? ".jpg" : ".pdf"}`);
  const fileName = kind === "guides" || kind === "about" ? `${Date.now()}-${baseName}` : baseName;
  const relativeDir = kind === "about" ? ["uploads", "about"] : kind === "guides" ? ["uploads", "guides"] : ["pdfs"];
  const objectPath = [...relativeDir, fileName].join("/");
  await uploadArchiveFile(objectPath, await file.arrayBuffer(), file.type);

  const publicPath = `/${objectPath}`;
  return NextResponse.json({
    file: publicPath,
    pdfUrl: publicPath,
    imageUrl: publicPath,
    size: archiveFileSizeLabel(file.size)
  });
}
