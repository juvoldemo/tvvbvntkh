import { NextResponse } from "next/server";
import { readBanDinhSession } from "@/lib/ban-dinh-server";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ session: await readBanDinhSession() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Không tải được trạng thái." }, { status: 503 }); }
}
