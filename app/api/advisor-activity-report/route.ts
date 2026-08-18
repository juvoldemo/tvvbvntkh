import { NextRequest, NextResponse } from "next/server";
import { getAdvisorActivityActor } from "@/lib/advisor-activity-auth";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdvisorActivityActor(request);
    if (!actor) return NextResponse.json({ error: "Bạn chưa đăng nhập hoặc không có quyền ADO." }, { status: 401 });
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Tháng không hợp lệ." }, { status: 400 });
    const monthStart = `${month}-01`;
    const selectedDate = new Date(`${monthStart}T00:00:00Z`);
    const previousMonthStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
    const nextMonthStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const monthEnd = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const [rosterResult, revenueResult, previousRevenueResult, conferencesResult] = await Promise.all([
      actor.supabase.from("authorized_users").select("advisor_code,full_name,group_name,start_date,advisor_position,updated_at")
        .eq("is_active", true).eq("advisor_status", "Hoạt động").in("group_name", actor.groups).order("group_name").order("full_name"),
      actor.supabase.from("revenue_records").select("*").eq("data_month", monthStart).in("group_name", actor.groups),
      actor.supabase.from("revenue_records").select("*").eq("data_month", previousMonthStart).in("group_name", actor.groups),
      actor.supabase.from("customer_conferences").select("id,activity_type,date_from,date_to")
        .lte("date_from", monthEnd).gte("date_to", monthStart)
    ]);
    if (rosterResult.error) throw rosterResult.error;
    if (revenueResult.error) throw revenueResult.error;
    if (previousRevenueResult.error) throw previousRevenueResult.error;
    if (conferencesResult.error) throw conferencesResult.error;
    const roster = rosterResult.data ?? [];
    const codes = roster.map((row: any) => row.advisor_code);
    const conferenceIds = (conferencesResult.data ?? []).map((row: any) => row.id);
    const [notes, registrations] = await Promise.all([
      codes.length ? actor.supabase.from("advisor_activity_notes").select("id,advisor_code,source_role,note,created_by,created_at")
        .in("advisor_code", codes).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      conferenceIds.length ? actor.supabase.from("customer_conference_registrations").select("advisor_code,conference_id")
        .in("conference_id", conferenceIds).in("advisor_code", codes) : Promise.resolve({ data: [], error: null })
    ]);
    if (notes.error) throw notes.error;
    if (registrations.error) throw registrations.error;
    const latest = new Map<string, any>();
    for (const note of notes.data ?? []) {
      const key = `${note.advisor_code}:${note.source_role}`;
      if (!latest.has(key)) latest.set(key, note);
    }
    const revenue = (revenueResult.data ?? []).filter(isCountedRevenueRecord);
    const previousContractCodes = new Set((previousRevenueResult.data ?? []).filter(isCountedRevenueRecord).map((row: any) => String(row.agent_code || "").trim().toUpperCase()));
    const activityTypeByConference = new Map((conferencesResult.data ?? []).map((row: any) => [row.id, String(row.activity_type || "conference").toLowerCase()]));
    const activityTypesByAdvisor = new Map<string, Set<string>>();
    for (const registration of registrations.data ?? []) {
      const code = String(registration.advisor_code || "").trim().toUpperCase();
      if (!activityTypesByAdvisor.has(code)) activityTypesByAdvisor.set(code, new Set());
      activityTypesByAdvisor.get(code)!.add(activityTypeByConference.get(registration.conference_id) || "conference");
    }
    const rows = roster.map((advisor: any) => {
      const mine = dedupeRevenueRecordsByContract(revenue.filter((record: any) => String(record.agent_code || "").trim() === advisor.advisor_code));
      const advisorCode = String(advisor.advisor_code || "").trim().toUpperCase();
      const activityTypes = activityTypesByAdvisor.get(advisorCode) ?? new Set<string>();
      const isNewOrPreviouslyInactive = String(advisor.start_date || "") >= monthStart && String(advisor.start_date || "") < nextMonthStart
        || !previousContractCodes.has(advisorCode);
      const classification = activityTypes.has("tvcn") ? "tvcn"
        : activityTypes.has("conference") ? "conference"
        : activityTypes.has("other") ? "other"
        : isNewOrPreviouslyInactive ? "new_advisor"
        : "conference_no_registration";
      return {
        advisorCode: advisor.advisor_code, advisorName: advisor.full_name, groupName: advisor.group_name,
        startDate: advisor.start_date, position: advisor.advisor_position,
        contractCount: mine.length, totalIp: mine.reduce((sum: number, row: any) => sum + (Number(row.ip) || 0), 0),
        classification,
        latestNotes: { ad: latest.get(`${advisor.advisor_code}:ad`) ?? null, cql: latest.get(`${advisor.advisor_code}:cql`) ?? null, note: latest.get(`${advisor.advisor_code}:note`) ?? null }
      };
    });
    return NextResponse.json({ month, groups: actor.groups, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được báo cáo." }, { status: 500 });
  }
}
