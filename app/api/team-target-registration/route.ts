import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";
import { readTargetRegistrationCycle } from "@/lib/target-registration-cycle";
import { userCodeFromRequest } from "@/lib/user-auth";
import { broadcastAdoManagementChange } from "@/lib/ado-live";

function monthStart(value: string) {
  return `${String(value || new Date().toISOString().slice(0, 7)).slice(0, 7)}-01`;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const TEAM_TARGET_MONTHLY_THRESHOLDS = [
  { min: 400_000_000, rates: [0.3, 0.28, 0.26, 0.1] },
  { min: 200_000_000, rates: [0.26, 0.22, 0.2, 0.1] },
  { min: 100_000_000, rates: [0.22, 0.2, 0.18, 0.1] },
  { min: 50_000_000, rates: [0.2, 0.18, 0.14, 0.1] },
  { min: 0, rates: [0, 0.16, 0.14, 0.1] }
];

function activeAdvisorColumn(activeAdvisors: number) {
  if (activeAdvisors >= 5) return 0;
  if (activeAdvisors >= 3) return 1;
  if (activeAdvisors === 2) return 2;
  return 3;
}

function calculateRewardTarget(revenueTarget: number, activeAdvisors: number) {
  const threshold = TEAM_TARGET_MONTHLY_THRESHOLDS.find((item) => revenueTarget >= item.min) ?? TEAM_TARGET_MONTHLY_THRESHOLDS.at(-1)!;
  const rate = threshold.rates[activeAdvisorColumn(activeAdvisors)] ?? 0;
  return Math.round(revenueTarget * 0.3 * rate);
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [value.message, value.details, value.hint, value.code].filter(Boolean).map(String);
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}

function missingTable(error: any) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function fallbackGroup(advisorCode: string) {
  return `__TVV_TARGET__${advisorCode}`;
}

async function teamContext(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return { error: NextResponse.json({ error: "Chua dang nhap." }, { status: 401 }) };
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,advisor_position,group_name")
    .eq("advisor_code", code)
    .single();
  if (error) throw error;
  const groupName = managedTeamName(profile.advisor_code, profile.advisor_position, profile.full_name, profile.group_name);
  if (!groupName) return { error: NextResponse.json({ error: "Tai khoan chua duoc gan nhom quan ly." }, { status: 403 }) };
  return { supabase, profile, groupName };
}

export async function GET(request: NextRequest) {
  try {
    const context = await teamContext(request);
    if (context.error) return context.error;
    const { supabase, profile, groupName } = context;
    const requestedMonth = request.nextUrl.searchParams.get("month");
    const cycle = requestedMonth ? null : await readTargetRegistrationCycle(supabase);
    const targetMonth = monthStart(requestedMonth || cycle?.activeMonth || "");
    const [{ data, error }, { data: teamUsers, error: teamUsersError }] = await Promise.all([
      supabase
        .from("team_target_registrations")
        .select("*")
        .eq("target_month", targetMonth)
        .eq("group_name", groupName)
        .maybeSingle(),
      supabase
        .from("authorized_users")
        .select("advisor_code")
        .eq("is_active", true)
        .eq("group_name", groupName)
    ]);
    if (error) throw error;
    if (teamUsersError) throw teamUsersError;

    const advisorCodes = [...new Set([
      profile.advisor_code,
      ...(teamUsers ?? []).map((item: any) => String(item.advisor_code || "").trim())
    ].filter(Boolean))];
    let personalRegistrations: any[] = [];
    if (advisorCodes.length) {
      const { data: personalRows, error: personalError } = await supabase
        .from("tvv_target_registrations")
        .select("advisor_code,advisor_name,revenue_target,updated_at")
        .eq("target_month", targetMonth)
        .in("advisor_code", advisorCodes);
      if (!personalError) {
        personalRegistrations = personalRows ?? [];
      } else if (missingTable(personalError)) {
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("team_target_registrations")
          .select("leader_code,leader_name,revenue_target,updated_at")
          .eq("target_month", targetMonth)
          .in("leader_code", advisorCodes)
          .in("group_name", advisorCodes.map(fallbackGroup));
        if (fallbackError) throw fallbackError;
        personalRegistrations = (fallbackRows ?? []).map((item: any) => ({
          advisor_code: item.leader_code,
          advisor_name: item.leader_name,
          revenue_target: item.revenue_target,
          updated_at: item.updated_at
        }));
      } else {
        throw personalError;
      }
    }

    return NextResponse.json({
      registration: data ? { ...data, personal_advisor_targets: personalRegistrations } : null
    });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Khong tai duoc dang ky muc tieu.") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await teamContext(request);
    if (context.error) return context.error;
    const { supabase, profile, groupName } = context;
    const body = await request.json();
    const targetMonth = monthStart(body.month);
    const cycle = await readTargetRegistrationCycle(supabase);
    if (targetMonth.slice(0, 7) !== cycle.activeMonth) {
      return NextResponse.json({
        error: `Đợt đăng ký tháng ${targetMonth.slice(5, 7)}/${targetMonth.slice(0, 4)} đã đóng. Tháng đang mở là ${cycle.activeMonth.slice(5, 7)}/${cycle.activeMonth.slice(0, 4)}.`,
        activeMonth: cycle.activeMonth
      }, { status: 409 });
    }
    if (cycle.activeMonthSaved) {
      return NextResponse.json({
        error: `Mục tiêu tháng ${cycle.activeMonth.slice(5, 7)}/${cycle.activeMonth.slice(0, 4)} đã được quản trị lưu và khóa.`,
        activeMonth: cycle.activeMonth
      }, { status: 409 });
    }
    const selectedAdvisors = Array.isArray(body.selectedAdvisors)
      ? body.selectedAdvisors.map((item: any) => ({
        advisor_code: String(item.advisor_code || item.agentCode || "").trim(),
        full_name: String(item.full_name || item.agentName || "").trim(),
        revenue_target: numberValue(item.revenue_target ?? item.revenueTarget)
      })).filter((item: any) => item.advisor_code || item.full_name)
      : [];
    const revenueTarget = selectedAdvisors.reduce((sum: number, item: any) => sum + numberValue(item.revenue_target), 0);
    const activeAdvisorTarget = selectedAdvisors.length;
    const payload = {
      target_month: targetMonth,
      leader_code: profile.advisor_code,
      leader_name: profile.full_name,
      group_name: groupName,
      revenue_target: revenueTarget,
      active_advisor_target: activeAdvisorTarget,
      reward_target: calculateRewardTarget(revenueTarget, activeAdvisorTarget),
      selected_advisors: selectedAdvisors,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("team_target_registrations")
      .upsert(payload, { onConflict: "target_month,group_name" })
      .select("*")
      .single();
    if (error) throw error;
    await broadcastAdoManagementChange(supabase, "target", targetMonth.slice(0, 7), profile.advisor_code);
    return NextResponse.json({ registration: data });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Khong luu duoc dang ky muc tieu.") }, { status: 500 });
  }
}
