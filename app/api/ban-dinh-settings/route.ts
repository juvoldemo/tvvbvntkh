import { NextRequest, NextResponse } from "next/server";
import { readBanDinhSettings } from "@/lib/ban-dinh-server";
import { canViewBanDinh } from "@/lib/ban-dinh-access";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const settings = await readBanDinhSettings();
    return NextResponse.json(canViewBanDinh(request, settings) ? settings : { visible: false, banner: "" }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  }
  catch { return NextResponse.json({ error: "Không tải được banner." }, { status: 503 }); }
}
