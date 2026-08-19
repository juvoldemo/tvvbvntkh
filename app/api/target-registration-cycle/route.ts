import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readTargetRegistrationCycle } from "@/lib/target-registration-cycle";
import { userCodeFromRequest } from "@/lib/user-auth";
import { cached } from "@/lib/server-cache";

export async function GET(request: NextRequest) {
  try {
    if (!userCodeFromRequest(request)) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const cycle = await cached("target-cycle:active", 15_000, () => readTargetRegistrationCycle(getSupabaseAdmin()));
    return NextResponse.json({ cycle }, { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Không tải được chu kỳ mục tiêu."
    }, { status: 500 });
  }
}
