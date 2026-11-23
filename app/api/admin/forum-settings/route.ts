import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readForumSettings, saveForumSettings } from "@/lib/forum-settings-server";
import { validForumSettings } from "@/lib/forum-settings";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try { return NextResponse.json(await readForumSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Không tải được cấu hình diễn đàn." }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const value: unknown = await request.json();
    if (!validForumSettings(value)) return NextResponse.json({ error: "Cấu hình diễn đàn không hợp lệ." }, { status: 400 });
    await saveForumSettings(value);
    return NextResponse.json({ settings: await readForumSettings() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không lưu được cấu hình diễn đàn." }, { status: 503 }); }
}
