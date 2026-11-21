import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { saveBanDinhSession } from "@/lib/ban-dinh-server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  if ((await request.json().catch(() => null))?.confirm !== true) return NextResponse.json({ error: "Vui lòng xác nhận reset số liệu." }, { status: 400 });
  try {
    // A fresh round instantly excludes old reports, including writes already
    // in flight. Image settings and historical reports remain intact.
    const session = { running: false, startedAt: null, endedAt: new Date().toISOString(), reportPrefix: `rounds/${randomUUID()}` };
    await saveBanDinhSession(session);
    return NextResponse.json({ session, rows: [], totals: { users: 0, consultations: 0, contracts: 0 } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không reset được số liệu. Vui lòng thử lại." }, { status: 503 }); }
}
