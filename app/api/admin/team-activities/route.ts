import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const DATA_BUCKET = "team-activity-data";

function targetMonth(value: string | null) {
  return /^\d{4}-\d{2}$/.test(value || "") ? value! : new Date().toISOString().slice(0, 7);
}

function leaderFolder(leaderCode: string) {
  return `leaders/${leaderCode.replace(/[^a-z0-9_-]/gi, "_").toUpperCase()}`;
}

async function readLeaderActivities(supabase: ReturnType<typeof getSupabaseAdmin>, leaderCode: string) {
  const folder = leaderFolder(leaderCode);
  const merged = new Map<string, any>();
  const { data: legacyData, error: legacyError } = await supabase.storage.from(DATA_BUCKET).download(`${folder}.json`);
  if (!legacyError && legacyData) {
    const parsed = JSON.parse(await legacyData.text());
    if (Array.isArray(parsed)) parsed.forEach((item: any) => merged.set(String(item.id), item));
  } else if (legacyError && !/not found|does not exist/i.test(legacyError.message)) {
    throw legacyError;
  }

  const activityFolder = `${folder}/activities`;
  const { data: files, error: listError } = await supabase.storage.from(DATA_BUCKET).list(activityFolder, { limit: 1000 });
  if (listError && !/not found|does not exist/i.test(listError.message)) throw listError;
  await Promise.all((files ?? []).filter((file) => file.name.endsWith(".json")).map(async (file) => {
    const { data, error } = await supabase.storage.from(DATA_BUCKET).download(`${activityFolder}/${file.name}`);
    if (error) throw error;
    const item = JSON.parse(await data.text());
    merged.set(String(item.id), item);
  }));
  return [...merged.values()];
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const month = targetMonth(request.nextUrl.searchParams.get("month"));
    const supabase = getSupabaseAdmin();
    const { data: registrations, error } = await supabase.from("team_target_registrations")
      .select("id,group_name,leader_code,leader_name,revenue_target,active_advisor_target,selected_advisors,updated_at")
      .eq("target_month", `${month}-01`)
      .order("group_name");
    if (error) throw error;

    const groups = await Promise.all((registrations ?? []).filter((registration: any) =>
      !String(registration.group_name || "").startsWith("__")
    ).map(async (registration: any) => {
      let activities: any[] = [];
      let activityError: string | null = null;
      try {
        activities = (await readLeaderActivities(supabase, registration.leader_code))
          .filter((item: any) => item.target_month === month)
          .sort((a: any, b: any) => String(a.scheduled_at || "").localeCompare(String(b.scheduled_at || "")));
      } catch (readError) {
        activityError = readError instanceof Error ? readError.message : "Không tải được kế hoạch hoạt động.";
      }
      return { ...registration, activities, activityError };
    }));

    return NextResponse.json({ month, groups }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được theo dõi hoạt động." }, { status: 500 });
  }
}
