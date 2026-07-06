import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function vietnamToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, month: Number(value("month")), day: Number(value("day")) };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  if (!(secret && bearer === `Bearer ${secret}`) && !isAdminRequest(request)) {
    return NextResponse.json({ error: "Không có quyền chạy lịch sinh nhật." }, { status: 401 });
  }

  try {
    const today = vietnamToday();
    const supabase = getSupabaseAdmin();
    const { data: advisors, error: advisorError } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name")
      .eq("is_active", true)
      .eq("birth_day", today.day)
      .eq("birth_month", today.month);
    if (advisorError) throw advisorError;

    const events = (advisors ?? []).map((advisor) => ({
      title: `Chúc mừng sinh nhật TVV ${advisor.full_name}`,
      content: `Chúc mừng sinh nhật TVV ${advisor.full_name}. Chúc anh/chị một tuổi mới nhiều sức khỏe, niềm vui và thành công!`,
      event_date: `${today.date}T00:00:00+07:00`,
      event_type: "birthday",
      event_key: `birthday:${today.date}:${advisor.advisor_code}`,
      is_active: true
    }));

    if (events.length) {
      const { error } = await supabase.from("admin_events").upsert(events, { onConflict: "event_key", ignoreDuplicates: true });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, date: today.date, birthdayCount: events.length, advisors: events.map((event) => event.title) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được thông báo sinh nhật." }, { status: 500 });
  }
}
