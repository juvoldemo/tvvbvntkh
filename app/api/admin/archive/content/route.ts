import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isAccessRequest } from "@/lib/admin-access-auth";
import { isArchiveContentKey, readArchiveContent, writeArchiveContent } from "@/lib/archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getKey(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  return isArchiveContentKey(key) ? key : null;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request) || !isAccessRequest(request)) return NextResponse.json({ error: "Chưa xác thực nội dung bảo mật." }, { status: 401 });
  const key = getKey(request);
  if (!key) return NextResponse.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
  return NextResponse.json(await readArchiveContent(key), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request) || !isAccessRequest(request)) return NextResponse.json({ error: "Chưa xác thực nội dung bảo mật." }, { status: 401 });
  const key = getKey(request);
  if (!key) return NextResponse.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });

  try {
    await writeArchiveContent(key, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu nội dung.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
