import { NextRequest, NextResponse } from "next/server";
import { canViewForum, readForumSettings } from "@/lib/forum-settings-server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const settings = await readForumSettings();
    return NextResponse.json(canViewForum(request, settings) ? settings : { visible: false, banner: "", adminOnly: settings.adminOnly }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch { return NextResponse.json({ error: "Không tải được cấu hình diễn đàn." }, { status: 503 }); }
}
