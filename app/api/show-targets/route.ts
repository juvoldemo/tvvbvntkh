import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";

const EXCLUDED_GROUP = "Nhóm PA - NKH";
const DISPLAY_GROUPS = [
  "Ánh Dương", "Duyên Phát", "Đại Thắng", "Hiệp Phát", "Hồng Đức", "Hồng Phát",
  "Hùng Phát", "Hưng Thịnh", "Nha Trang 4", "Nha Trang 5", "Nha Trang 5 Sao",
  "Phát Thắng", "Quyết Thắng", "Sao Mai", "Sen Vàng", "Tài Phát", "Tâm An",
  "Tâm Nhiên", "Tấn Phát", "Thành Phú", "Thuận Phát", "Thư Thịnh"
];

function monthStart(value: string | null) {
  const month = String(value || new Date().toISOString().slice(0, 7)).slice(0, 7);
  return `${month}-01`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const targetMonth = monthStart(request.nextUrl.searchParams.get("month"));
    const [{ data: users, error: userError }, { data: registrations, error: registrationError }] = await Promise.all([
      supabase.from("authorized_users")
        .select("advisor_code,full_name,advisor_position,group_name,is_active")
        .neq("group_name", EXCLUDED_GROUP),
      supabase.from("tvv_target_registrations")
        .select("advisor_code,advisor_name,revenue_target,updated_at")
        .eq("target_month", targetMonth)
    ]);
    if (userError) throw userError;
    const missingRegistrationTable = registrationError?.code === "42P01" || registrationError?.code === "PGRST205";
    if (registrationError && !missingRegistrationTable) throw registrationError;
    let effectiveRegistrations: any[] = registrations ?? [];
    if (missingRegistrationTable) {
      const { data: fallbackRows, error: fallbackError } = await supabase.from("team_target_registrations")
        .select("leader_code,leader_name,revenue_target,updated_at,selected_advisors")
        .eq("target_month", targetMonth)
        .like("group_name", "__TVV_TARGET__%");
      if (fallbackError) throw fallbackError;
      effectiveRegistrations = (fallbackRows ?? []).map((row: any) => ({
        advisor_code: row.leader_code,
        advisor_name: row.leader_name,
        revenue_target: row.revenue_target,
        updated_at: row.updated_at
      }));
    }

    const displayGroupSet = new Set(DISPLAY_GROUPS);
    const activeUsers = (users ?? []).filter((user: any) => user.is_active === true && displayGroupSet.has(String(user.group_name || "").trim()));
    const userByCode = new Map(activeUsers.map((user: any) => [String(user.advisor_code || "").trim(), user]));
    const leaderByGroup = new Map<string, string>();
    for (const user of users ?? []) {
      if (user.is_active !== true) continue;
      const managedGroup = managedTeamName(user.advisor_code, user.advisor_position, user.full_name, user.group_name);
      if (managedGroup && displayGroupSet.has(managedGroup) && !leaderByGroup.has(managedGroup)) {
        leaderByGroup.set(managedGroup, String(user.full_name || "").trim());
      }
    }
    const groupNames = [...DISPLAY_GROUPS];

    const advisorsByGroup = new Map<string, any[]>();
    for (const registration of effectiveRegistrations) {
      const user: any = userByCode.get(String(registration.advisor_code || "").trim());
      if (!user) continue;
      const groupName = String(user.group_name || "").trim();
      const revenueTarget = Number(registration.revenue_target || 0);
      if (!groupName || groupName === EXCLUDED_GROUP || revenueTarget <= 0) continue;
      const advisor = {
        advisorCode: registration.advisor_code,
        advisorName: registration.advisor_name || user.full_name || "TVV",
        revenueTarget,
        updatedAt: registration.updated_at
      };
      advisorsByGroup.set(groupName, [...(advisorsByGroup.get(groupName) ?? []), advisor]);
    }

    const originalOrder = new Map(groupNames.map((name, index) => [name, index]));
    const groups = groupNames.map((groupName) => {
      const advisors = (advisorsByGroup.get(groupName) ?? [])
        .sort((a, b) => b.revenueTarget - a.revenueTarget || a.advisorName.localeCompare(b.advisorName, "vi"));
      return {
        groupName,
        leaderName: leaderByGroup.get(groupName) || "Chưa cập nhật trưởng nhóm",
        advisorCount: advisors.length,
        revenueTarget: advisors.reduce((sum, advisor) => sum + advisor.revenueTarget, 0),
        advisors
      };
    }).sort((a, b) => b.revenueTarget - a.revenueTarget
      || b.advisorCount - a.advisorCount
      || Number(originalOrder.get(a.groupName) ?? 0) - Number(originalOrder.get(b.groupName) ?? 0));

    return NextResponse.json({
      month: targetMonth.slice(0, 7),
      groupCount: groups.length,
      advisorCount: groups.reduce((sum, group) => sum + group.advisorCount, 0),
      revenueTarget: groups.reduce((sum, group) => sum + group.revenueTarget, 0),
      groups,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được bảng mục tiêu." }, { status: 500 });
  }
}
