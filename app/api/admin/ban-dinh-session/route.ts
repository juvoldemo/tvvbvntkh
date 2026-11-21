import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readBanDinhSession, readBanDinhSettings, saveBanDinhSession } from "@/lib/ban-dinh-server";
export const dynamic = "force-dynamic";
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    if (!["start", "end"].includes(body?.action)) return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
    if (body.action === "start" && !(await readBanDinhSettings()).visible) return NextResponse.json({ error: "Hãy lưu banner và bật hiển thị trên giao diện user trước khi bắt đầu." }, { status: 400 });
    const current = await readBanDinhSession();
    const session = body.action === "start"
      ? current.running ? current : { ...current, running: true, startedAt: new Date().toISOString(), endedAt: null }
      : !current.running ? current : { ...current, running: false, endedAt: new Date().toISOString() };
    await saveBanDinhSession(session);
    return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không thay đổi được trạng thái. Vui lòng thử lại." }, { status: 503 }); }
}
