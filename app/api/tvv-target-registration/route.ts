import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

function monthStart(value: unknown) {
  return `${String(value || new Date().toISOString().slice(0, 7)).slice(0, 7)}-01`;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Không lưu được mục tiêu TVV.";
}

export async function GET(request: NextRequest) {
  try {
    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("tvv_target_registrations")
      .select("*")
      .eq("target_month", monthStart(request.nextUrl.searchParams.get("month")))
      .eq("advisor_code", advisorCode)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ registration: data ?? null });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const advisorCode = userCodeFromRequest(request);
    if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const body = await request.json();
    const revenueTarget = Number(body.revenueTarget);
    if (!Number.isFinite(revenueTarget) || revenueTarget <= 0) {
      return NextResponse.json({ error: "Vui lòng nhập doanh thu mục tiêu lớn hơn 0." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase.from("authorized_users")
      .select("advisor_code,full_name")
      .eq("advisor_code", advisorCode)
      .single();
    if (profileError) throw profileError;
    const payload = {
      target_month: monthStart(body.month),
      advisor_code: advisorCode,
      advisor_name: profile.full_name,
      revenue_target: Math.round(revenueTarget),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("tvv_target_registrations")
      .upsert(payload, { onConflict: "target_month,advisor_code" })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ registration: data });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) }, { status: 500 });
  }
}
