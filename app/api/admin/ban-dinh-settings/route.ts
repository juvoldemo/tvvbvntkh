import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readBanDinhSettings, saveBanDinhSettings } from "@/lib/ban-dinh-server";
import { validBanDinhSettings } from "@/lib/ban-dinh";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try { return NextResponse.json(await readBanDinhSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Không tải được cấu hình." }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const value: unknown = await request.json();
    if (!validBanDinhSettings(value)) return NextResponse.json({ error: "Vui lòng upload banner trước khi bật hiển thị." }, { status: 400 });
    // Older tabs do not send showImage; saving a banner must preserve it.
    const current = await readBanDinhSettings();
    const next = { ...value, showImage: value.showImage ?? current.showImage, adminOnly: value.adminOnly ?? current.adminOnly ?? false };
    await saveBanDinhSettings(next);
    const saved = await readBanDinhSettings();
    if (saved.banner !== next.banner || saved.visible !== next.visible || saved.showImage !== next.showImage || saved.adminOnly !== next.adminOnly) throw new Error("Settings read-back mismatch");
    return NextResponse.json({ ok: true, settings: saved }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không lưu được cấu hình." }, { status: 503 }); }
}
