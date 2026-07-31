import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readTargetRegistrationCycle } from "@/lib/target-registration-cycle";
import { userCodeFromRequest } from "@/lib/user-auth";

function monthStart(value: unknown) {
  return `${String(value || new Date().toISOString().slice(0, 7)).slice(0, 7)}-01`;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Không lưu được mục tiêu TVV.";
}

function missingTable(error: any) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function fallbackGroup(advisorCode: string) {
  return `__TVV_TARGET__${advisorCode}`;
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
    if (!error) return NextResponse.json({ registration: data ?? null });
    if (!missingTable(error)) throw error;
    const { data: fallback, error: fallbackError } = await supabase.from("team_target_registrations")
      .select("*")
      .eq("target_month", monthStart(request.nextUrl.searchParams.get("month")))
      .eq("group_name", fallbackGroup(advisorCode))
      .maybeSingle();
    if (fallbackError) throw fallbackError;
    return NextResponse.json({ registration: fallback ? {
      target_month: fallback.target_month,
      advisor_code: advisorCode,
      advisor_name: fallback.leader_name,
      revenue_target: fallback.revenue_target,
      updated_at: fallback.updated_at
    } : null });
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
    if (!Number.isInteger(revenueTarget) || revenueTarget < 15_000_000 || revenueTarget > 999_000_000 || revenueTarget % 1_000_000 !== 0) {
      return NextResponse.json({ error: "Doanh thu mục tiêu phải từ 15 đến 999 triệu đồng." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const cycle = await readTargetRegistrationCycle(supabase);
    const requestedMonth = monthStart(body.month).slice(0, 7);
    if (requestedMonth !== cycle.activeMonth) {
      return NextResponse.json({
        error: `Đợt đăng ký tháng ${requestedMonth.slice(5, 7)}/${requestedMonth.slice(0, 4)} đã đóng. Tháng đang mở là ${cycle.activeMonth.slice(5, 7)}/${cycle.activeMonth.slice(0, 4)}.`
      }, { status: 409 });
    }
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
    if (!error) return NextResponse.json({ registration: data });
    if (!missingTable(error)) throw error;
    const fallbackPayload = {
      target_month: payload.target_month,
      leader_code: advisorCode,
      leader_name: profile.full_name,
      group_name: fallbackGroup(advisorCode),
      revenue_target: payload.revenue_target,
      active_advisor_target: 1,
      reward_target: 0,
      selected_advisors: [{ advisor_code: advisorCode, full_name: profile.full_name, revenue_target: payload.revenue_target }],
      updated_at: payload.updated_at
    };
    const { data: fallback, error: fallbackError } = await supabase.from("team_target_registrations")
      .upsert(fallbackPayload, { onConflict: "target_month,group_name" })
      .select("*")
      .single();
    if (fallbackError) throw fallbackError;
    return NextResponse.json({ registration: {
      target_month: fallback.target_month,
      advisor_code: advisorCode,
      advisor_name: profile.full_name,
      revenue_target: fallback.revenue_target,
      updated_at: fallback.updated_at
    } });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) }, { status: 500 });
  }
}
