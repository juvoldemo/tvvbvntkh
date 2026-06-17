import { NextRequest, NextResponse } from "next/server";
import { toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";

const COMPANY_NAME = "Bảo Việt Nhân thọ Khánh Hòa";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("monthly_targets")
      .select("*")
      .eq("target_month", toMonthStart(month))
      .eq("target_level", "company")
      .is("target_code", null)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ target: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown target error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const month = String(body.month || new Date().toISOString().slice(0, 7));
    const afypTarget = Number(body.afypTarget || 0);
    if (!Number.isFinite(afypTarget) || afypTarget < 0) {
      return NextResponse.json({ error: "Chỉ tiêu AFYP không hợp lệ." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const baseQuery = supabase
      .from("monthly_targets")
      .select("id")
      .eq("target_month", toMonthStart(month))
      .eq("target_level", "company")
      .is("target_code", null)
      .maybeSingle();
    const { data: existing, error: existingError } = await baseQuery;
    if (existingError) throw existingError;

    const payload = {
        target_month: toMonthStart(month),
        target_level: "company",
        target_code: null,
        target_name: COMPANY_NAME,
        afyp_target: afypTarget,
        updated_at: new Date().toISOString()
      };

    const { data, error } = existing?.id
      ? await supabase.from("monthly_targets").update(payload).eq("id", existing.id).select("*").single()
      : await supabase.from("monthly_targets").insert(payload).select("*").single();
    if (error) throw error;
    return NextResponse.json({ target: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown target error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
