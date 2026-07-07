import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";

function monthStart(value: string) {
  return `${String(value || new Date().toISOString().slice(0, 7)).slice(0, 7)}-01`;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

async function teamContext(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return { error: NextResponse.json({ error: "Chua dang nhap." }, { status: 401 }) };
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,advisor_position")
    .eq("advisor_code", code)
    .single();
  if (error) throw error;
  const groupName = managedTeamName(profile.advisor_code, profile.advisor_position);
  if (!groupName) return { error: NextResponse.json({ error: "Tai khoan chua duoc gan nhom quan ly." }, { status: 403 }) };
  return { supabase, profile, groupName };
}

export async function GET(request: NextRequest) {
  try {
    const context = await teamContext(request);
    if (context.error) return context.error;
    const { supabase, groupName } = context;
    const targetMonth = monthStart(request.nextUrl.searchParams.get("month") || "");
    const { data, error } = await supabase
      .from("team_target_registrations")
      .select("*")
      .eq("target_month", targetMonth)
      .eq("group_name", groupName)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ registration: data ?? null });
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
    const selectedAdvisors = Array.isArray(body.selectedAdvisors)
      ? body.selectedAdvisors.map((item: any) => ({
        advisor_code: String(item.advisor_code || item.agentCode || "").trim(),
        full_name: String(item.full_name || item.agentName || "").trim()
      })).filter((item: any) => item.advisor_code || item.full_name)
      : [];
    const payload = {
      target_month: targetMonth,
      leader_code: profile.advisor_code,
      leader_name: profile.full_name,
      group_name: groupName,
      revenue_target: numberValue(body.revenueTarget),
      active_advisor_target: Math.round(numberValue(body.activeAdvisorTarget)),
      reward_target: numberValue(body.rewardTarget),
      selected_advisors: selectedAdvisors,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("team_target_registrations")
      .upsert(payload, { onConflict: "target_month,group_name" })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ registration: data });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Khong luu duoc dang ky muc tieu.") }, { status: 500 });
  }
}
