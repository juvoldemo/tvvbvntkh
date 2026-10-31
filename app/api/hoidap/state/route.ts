import { NextResponse } from "next/server";
import { activeDiscussionProgram } from "@/lib/hoidap-server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({ program: await activeDiscussionProgram() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa tải được chương trình đang hoạt động." }, { status: 503 });
  }
}
