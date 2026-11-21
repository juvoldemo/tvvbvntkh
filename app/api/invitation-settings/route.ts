import { NextResponse } from "next/server";
import { readInvitationSettings } from "@/lib/invitation-settings-server";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await readInvitationSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Không tải được cấu hình thư mời." }, { status: 503 }); }
}
