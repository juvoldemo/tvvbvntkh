import { NextRequest, NextResponse } from "next/server";
import { getAdvisorActivityActor } from "@/lib/advisor-activity-auth";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord } from "@/lib/reports";
import { normalizeAdvisorCode } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

function normalizedName(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdvisorActivityActor(request);
    if (!actor) return NextResponse.json({ error: "Bạn chưa đăng nhập hoặc không có quyền ADO." }, { status: 401 });
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Tháng không hợp lệ." }, { status: 400 });
    const monthStart = `${month}-01`;
    const selectedDate = new Date(`${monthStart}T00:00:00Z`);
    const threeMonthWindowStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
    const nextMonthStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const monthEnd = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const [rosterResult, revenueResult, conferencesResult] = await Promise.all([
      actor.supabase.from("authorized_users").select("advisor_code,full_name,group_name,start_date,advisor_position,updated_at")
        .eq("is_active", true).eq("advisor_status", "Hoạt động").in("group_name", actor.groups).order("group_name").order("full_name"),
      actor.supabase.from("revenue_records").select("*").eq("data_month", monthStart).in("group_name", actor.groups),
      actor.supabase.from("customer_conferences").select("id,conference_name,activity_type,date_from,date_to")
        .lte("date_from", monthEnd).gte("date_to", monthStart)
    ]);
    if (rosterResult.error) throw rosterResult.error;
    if (revenueResult.error) throw revenueResult.error;
    if (conferencesResult.error) throw conferencesResult.error;
    const roster = rosterResult.data ?? [];
    const codes = roster.map((row: any) => row.advisor_code);
    const conferenceIds = (conferencesResult.data ?? []).map((row: any) => row.id);
    const [notes, registrations] = await Promise.all([
      codes.length ? actor.supabase.from("advisor_activity_notes").select("id,advisor_code,source_role,note,created_by,created_at")
        .in("advisor_code", codes).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      conferenceIds.length ? actor.supabase.from("customer_conference_registrations").select("id,advisor_code,conference_id,customer_name,registration_fee,ad_note,ad_note_updated_by,ad_note_updated_at,cql_note,cql_note_updated_by,cql_note_updated_at")
        .in("conference_id", conferenceIds).in("advisor_code", codes) : Promise.resolve({ data: [], error: null })
    ]);
    if (notes.error) throw notes.error;
    if (registrations.error) throw registrations.error;
    const conferenceById = new Map((conferencesResult.data ?? []).map((row: any) => [row.id, row]));
    const latest = new Map<string, any>();
    for (const note of notes.data ?? []) {
      const key = `${note.advisor_code}:${note.source_role}`;
      if (!latest.has(key)) latest.set(key, note);
    }
    const revenue = (revenueResult.data ?? []).filter(isCountedRevenueRecord);
    const activityTypeByConference = new Map((conferencesResult.data ?? []).map((row: any) => [row.id, String(row.activity_type || "conference").toLowerCase()]));
    const activityTypesByAdvisor = new Map<string, Set<string>>();
    const conferenceStatsByAdvisor = new Map<string, { registeredCustomers: number; registrationFee: number; customersWithoutRegistration: number }>();
    for (const registration of registrations.data ?? []) {
      const code = normalizeAdvisorCode(registration.advisor_code);
      if (!activityTypesByAdvisor.has(code)) activityTypesByAdvisor.set(code, new Set());
      activityTypesByAdvisor.get(code)!.add(activityTypeByConference.get(registration.conference_id) || "conference");
      const stats = conferenceStatsByAdvisor.get(code) ?? { registeredCustomers: 0, registrationFee: 0, customersWithoutRegistration: 0 };
      const registrationFee = Number(registration.registration_fee) || 0;
      if (registrationFee > 0) {
        stats.registeredCustomers += 1;
        stats.registrationFee += registrationFee;
      } else {
        stats.customersWithoutRegistration += 1;
      }
      conferenceStatsByAdvisor.set(code, stats);
    }
    const rows = roster.map((advisor: any) => {
      const mine = dedupeRevenueRecordsByContract(revenue.filter((record: any) => String(record.agent_code || "").trim() === advisor.advisor_code));
      const advisorCode = String(advisor.advisor_code || "").trim().toUpperCase();
      const activityTypes = activityTypesByAdvisor.get(advisorCode) ?? new Set<string>();
      const conferenceStats = conferenceStatsByAdvisor.get(advisorCode) ?? { registeredCustomers: 0, registrationFee: 0, customersWithoutRegistration: 0 };
      const startDate = String(advisor.start_date || "");
      const isNewOrPreviouslyInactive = mine.length === 0 && startDate >= threeMonthWindowStart && startDate < nextMonthStart;
      const classification = activityTypes.has("tvcn") ? "tvcn"
        : activityTypes.has("conference") ? "conference"
        : activityTypes.has("other") ? "other"
        : isNewOrPreviouslyInactive ? "new_advisor"
        : "conference_no_registration";
      const registeredCustomerDetails = (registrations.data ?? []).filter((registration: any) =>
        normalizeAdvisorCode(registration.advisor_code) === advisorCode && (Number(registration.registration_fee) || 0) > 0
      ).map((registration: any) => {
        const conference: any = conferenceById.get(registration.conference_id);
        const customer = normalizedName(registration.customer_name);
        const matches = conference ? mine.filter((contract: any) =>
          contract.paid_date >= conference.date_from && contract.paid_date <= conference.date_to
          && (normalizedName(contract.policy_owner) === customer || normalizedName(contract.insured_name) === customer)
        ) : [];
        return {
          id: registration.id, customerName: registration.customer_name,
          conferenceName: conference?.conference_name ?? "HNKH", registrationFee: Number(registration.registration_fee) || 0,
          closed: matches.length > 0, contractCount: matches.length,
          revenue: matches.reduce((sum: number, contract: any) => sum + (Number(contract.afyp) || 0), 0),
          statuses: [...new Set(matches.map((contract: any) => String(contract.policy_status || "Đã ghi nhận")))],
          adNote: registration.ad_note ?? "", adNoteUpdatedBy: registration.ad_note_updated_by, adNoteUpdatedAt: registration.ad_note_updated_at,
          cqlNote: registration.cql_note ?? "", cqlNoteUpdatedBy: registration.cql_note_updated_by, cqlNoteUpdatedAt: registration.cql_note_updated_at
        };
      });
      return {
        advisorCode: advisor.advisor_code, advisorName: advisor.full_name, groupName: advisor.group_name,
        startDate: advisor.start_date, position: advisor.advisor_position,
        contractCount: mine.length, totalIp: mine.reduce((sum: number, row: any) => sum + (Number(row.ip) || 0), 0),
        newAdvisorMonth: isNewOrPreviouslyInactive ? Number(startDate.slice(5, 7)) : null,
        registeredCustomers: conferenceStats.registeredCustomers, registrationFee: conferenceStats.registrationFee,
        customersWithoutRegistration: conferenceStats.customersWithoutRegistration,
        registeredCustomerDetails,
        classification,
        latestNotes: { ad: latest.get(`${advisor.advisor_code}:ad`) ?? null, cql: latest.get(`${advisor.advisor_code}:cql`) ?? null, note: latest.get(`${advisor.advisor_code}:note`) ?? null }
      };
    });
    return NextResponse.json({ month, groups: actor.groups, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được báo cáo." }, { status: 500 });
  }
}
