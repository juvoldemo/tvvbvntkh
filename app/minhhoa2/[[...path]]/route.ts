import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const projectRoot = path.resolve(process.cwd(), "minhhoa2");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  _request: Request,
  { params }: { params: { path?: string[] } },
) {
  const requestedPath = params.path?.length ? params.path.join("/") : "index.html";
  const filePath = path.resolve(projectRoot, requestedPath);

  if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) {
    return new NextResponse("Đường dẫn không hợp lệ.", { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    const resolvedFile = fileStat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const extension = path.extname(resolvedFile).toLowerCase();
    const file = await readFile(resolvedFile);
    const body = extension === ".html"
      ? file.toString("utf8").replace("<head>", '<head>\n    <base href="/minhhoa2/" />')
      : file;
    const contentType = contentTypes[extension] ?? "application/octet-stream";

    return new NextResponse(body, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new NextResponse("Không tìm thấy tệp.", { status: 404 });
  }
}
