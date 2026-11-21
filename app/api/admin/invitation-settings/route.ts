import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { uploadArchiveFile } from "@/lib/archive-content";
import { readInvitationSettings, saveInvitationSettings } from "@/lib/invitation-settings-server";
import { validateInvitationSettings } from "@/lib/invitation-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try { return NextResponse.json(await readInvitationSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Không tải được cấu hình thư mời." }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const value: unknown = await request.json();
    if (!validateInvitationSettings(value)) return NextResponse.json({ error: "Cấu hình không hợp lệ." }, { status: 400 });
    await saveInvitationSettings(value);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Không lưu được cấu hình thư mời." }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const types: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
    if (!(file instanceof File) || !types[file.type] || file.size > 20 * 1024 * 1024 || !file.size) return NextResponse.json({ error: "Chọn ảnh PNG, JPG hoặc WebP, tối đa 20 MB." }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const b = new Uint8Array(bytes);
    const detected = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 ? "image/png" : b[0] === 255 && b[1] === 216 && b[2] === 255 ? "image/jpeg" : String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" ? "image/webp" : null;
    if (detected !== file.type) return NextResponse.json({ error: "Nội dung ảnh không hợp lệ." }, { status: 400 });
    const path = `uploads/invitations/${randomUUID()}.${types[file.type]}`;
    await uploadArchiveFile(path, bytes, file.type);
    return NextResponse.json({ url: `/api/archive/file?path=${encodeURIComponent(path)}` });
  } catch { return NextResponse.json({ error: "Không tải ảnh lên được." }, { status: 500 }); }
}
