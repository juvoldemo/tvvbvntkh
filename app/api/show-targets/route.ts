import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { monthBounds } from "@/lib/format";
import { isCountedRevenueRecord } from "@/lib/reports";
import { managedTeamName } from "@/lib/team-scope";
import type { RevenueRecord } from "@/lib/types";

const PAGE_SIZE = 1000;

async function readAll<T>(queryFactory: (from: number, to: number) => any) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function monthStart(value: string | null) {
  const month = String(value || new Date().toISOString().slice(0, 7)).slice(0, 7);
  return `${month}-01`;
}

function normalized(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const targetMonth = monthStart(request.nextUrl.searchParams.get("month"));
    const bounds = monthBounds(targetMonth.slice(0, 7));
    const [{ data: users, error: userError }, tvvResult, teamResult, revenueRows] = await Promise.all([
      supabase.from("authorized_users").select("advisor_code,full_name,advisor_position,group_name,is_active"),
      supabase.from("tvv_target_registrations").select("advisor_code,advisor_name,revenue_target,updated_at").eq("target_month", targetMonth),
      supabase.from("team_target_registrations").select("leader_code,leader_name,group_name,revenue_target,active_advisor_target,selected_advisors,updated_at").eq("target_month", targetMonth),
      readAll<RevenueRecord>((from, to) => supabase.from("revenue_records")
        .select("data_month,group_name,agent_code,agent_name,contract_no,policy_status,paid_date,ip,afyp,raw_data")
        .eq("data_month", targetMonth)
        .gte("paid_date", bounds.start)
        .lte("paid_date", bounds.end)
        .range(from, to))
    ]);
    if (userError) throw userError;
    const missingTvvTable = tvvResult.error?.code === "42P01" || tvvResult.error?.code === "PGRST205";
    if (tvvResult.error && !missingTvvTable) throw tvvResult.error;
    if (teamResult.error) throw teamResult.error;

    const allTeamRows = teamResult.data ?? [];
    let tvvRows: any[] = tvvResult.data ?? [];
    if (missingTvvTable) {
      tvvRows = allTeamRows.filter((row: any) => String(row.group_name || "").startsWith("__TVV_TARGET__")).map((row: any) => ({
        advisor_code: row.leader_code, advisor_name: row.leader_name, revenue_target: row.revenue_target, updated_at: row.updated_at
      }));
    }
    const teamRows = allTeamRows.filter((row: any) => !String(row.group_name || "").startsWith("__TVV_TARGET__"));
    const actualByCode = new Map<string, number>();
    const actualByNameGroup = new Map<string, number>();
    for (const row of revenueRows.filter(isCountedRevenueRecord)) {
      const revenue = Number(row.ip || 0);
      const codeKey = normalized(row.agent_code);
      const nameGroupKey = `${normalized(row.group_name)}|${normalized(row.agent_name)}`;
      if (codeKey) actualByCode.set(codeKey, (actualByCode.get(codeKey) ?? 0) + revenue);
      if (normalized(row.agent_name)) actualByNameGroup.set(nameGroupKey, (actualByNameGroup.get(nameGroupKey) ?? 0) + revenue);
    }
    const currentRevenue = (advisorCode: unknown, advisorName: unknown, groupName: unknown) => {
      const codeKey = normalized(advisorCode);
      if (codeKey && actualByCode.has(codeKey)) return actualByCode.get(codeKey) ?? 0;
      return actualByNameGroup.get(`${normalized(groupName)}|${normalized(advisorName)}`) ?? 0;
    };
    const activeUsers = (users ?? []).filter((user: any) => user.is_active === true && String(user.group_name || "").trim());
    const userByCode = new Map(activeUsers.map((user: any) => [String(user.advisor_code || "").trim(), user]));
    const leaderByGroup = new Map<string, string>();
    for (const user of users ?? []) {
      if (user.is_active !== true) continue;
      const group = managedTeamName(user.advisor_code, user.advisor_position, user.full_name, user.group_name);
      if (group && !leaderByGroup.has(group)) leaderByGroup.set(group, String(user.full_name || "").trim());
    }

    const advisorsByGroup = new Map<string, any[]>();
    for (const registration of tvvRows) {
      const user: any = userByCode.get(String(registration.advisor_code || "").trim());
      const groupName = String(user?.group_name || "").trim();
      const revenueTarget = Number(registration.revenue_target || 0);
      if (!groupName || revenueTarget <= 0) continue;
      const advisor = { advisorCode: registration.advisor_code, advisorName: registration.advisor_name || user.full_name || "TVV", revenueTarget };
      advisorsByGroup.set(groupName, [...(advisorsByGroup.get(groupName) ?? []), advisor]);
    }

    // A team leader can also act as a TVV. When the leader assigns a target to
    // themselves, include that entry in the TVV view even though it originates
    // from the team registration rather than the personal-registration table.
    for (const row of teamRows) {
      const leaderCode = String(row.leader_code || "").trim();
      const leaderName = String(row.leader_name || leaderByGroup.get(row.group_name) || "Trưởng nhóm").trim();
      const selfTarget = (Array.isArray(row.selected_advisors) ? row.selected_advisors : []).find((item: any) => {
        const advisorCode = String(item.advisor_code || item.agentCode || "").trim();
        const advisorName = String(item.full_name || item.agentName || "").trim();
        return (leaderCode && normalized(advisorCode) === normalized(leaderCode))
          || (!advisorCode && normalized(advisorName) === normalized(leaderName));
      });
      const revenueTarget = Number(selfTarget?.revenue_target ?? selfTarget?.revenueTarget ?? 0);
      const groupName = String(row.group_name || "").trim();
      if (!groupName || revenueTarget <= 0) continue;

      const groupAdvisors = advisorsByGroup.get(groupName) ?? [];
      const alreadyIncluded = groupAdvisors.some((advisor: any) =>
        (leaderCode && normalized(advisor.advisorCode) === normalized(leaderCode))
        || (!leaderCode && normalized(advisor.advisorName) === normalized(leaderName))
      );
      if (!alreadyIncluded) {
        advisorsByGroup.set(groupName, [...groupAdvisors, {
          advisorCode: leaderCode,
          advisorName: String(selfTarget?.full_name || selfTarget?.agentName || leaderName).trim(),
          revenueTarget
        }]);
      }
    }

    const groups = [...advisorsByGroup.entries()].map(([groupName, advisors]) => {
      const enrichedAdvisors = advisors.map((advisor) => ({
        ...advisor,
        currentRevenue: currentRevenue(advisor.advisorCode, advisor.advisorName, groupName)
      })).sort((a, b) => b.revenueTarget - a.revenueTarget || a.advisorName.localeCompare(b.advisorName, "vi"));
      return { groupName, leaderName: leaderByGroup.get(groupName) || "Chưa cập nhật trưởng nhóm", advisorCount: enrichedAdvisors.length, revenueTarget: enrichedAdvisors.reduce((sum, row) => sum + row.revenueTarget, 0), advisors: enrichedAdvisors };
    }).sort((a, b) => b.revenueTarget - a.revenueTarget || b.advisorCount - a.advisorCount);

    const leaderGroups = teamRows.map((row: any) => {
      const advisors = (Array.isArray(row.selected_advisors) ? row.selected_advisors : []).map((item: any) => ({
        advisorCode: String(item.advisor_code || item.agentCode || "").trim(),
        advisorName: String(item.full_name || item.agentName || "TVV").trim(),
        revenueTarget: Number(item.revenue_target ?? item.revenueTarget ?? 0),
        currentRevenue: currentRevenue(item.advisor_code || item.agentCode, item.full_name || item.agentName, row.group_name)
      })).filter((item: any) => item.revenueTarget > 0).sort((a: any, b: any) => b.revenueTarget - a.revenueTarget);
      return { groupName: row.group_name, leaderName: row.leader_name || leaderByGroup.get(row.group_name) || "Trưởng nhóm", advisorCount: advisors.length, revenueTarget: Number(row.revenue_target || 0), advisors };
    }).filter((group: any) => group.revenueTarget > 0 || group.advisorCount > 0).sort((a: any, b: any) => b.revenueTarget - a.revenueTarget);

    const leaderTargetByCode = new Map<string, number>();
    const leaderTargetByNameGroup = new Map<string, number>();
    for (const group of leaderGroups) for (const advisor of group.advisors) {
      if (advisor.advisorCode) leaderTargetByCode.set(normalized(advisor.advisorCode), advisor.revenueTarget);
      leaderTargetByNameGroup.set(`${normalized(group.groupName)}|${normalized(advisor.advisorName)}`, advisor.revenueTarget);
    }
    const matchedComparisons = groups.flatMap((group) => group.advisors.flatMap((advisor) => {
      const codeKey = normalized(advisor.advisorCode);
      const nameGroupKey = `${normalized(group.groupName)}|${normalized(advisor.advisorName)}`;
      const matchedByCode = codeKey ? leaderTargetByCode.has(codeKey) : false;
      const matchedByNameAndGroup = leaderTargetByNameGroup.has(nameGroupKey);
      if (!matchedByCode && !matchedByNameAndGroup) return [];
      const leaderTarget = matchedByCode
        ? leaderTargetByCode.get(codeKey)!
        : leaderTargetByNameGroup.get(nameGroupKey)!;
      return [{ groupName: group.groupName, advisorCode: advisor.advisorCode, advisorName: advisor.advisorName, advisorTarget: advisor.revenueTarget, leaderTarget, difference: advisor.revenueTarget - leaderTarget }];
    }));
    const comparisonByGroup = new Map<string, { groupName: string; advisorCount: number; advisorTarget: number; leaderTarget: number; difference: number }>();
    for (const row of matchedComparisons) {
      const current = comparisonByGroup.get(row.groupName) ?? { groupName: row.groupName, advisorCount: 0, advisorTarget: 0, leaderTarget: 0, difference: 0 };
      current.advisorCount += 1;
      current.advisorTarget += row.advisorTarget;
      current.leaderTarget += row.leaderTarget;
      current.difference = current.advisorTarget - current.leaderTarget;
      comparisonByGroup.set(row.groupName, current);
    }
    const comparisons = [...comparisonByGroup.values()].sort((a, b) => b.advisorTarget - a.advisorTarget || a.groupName.localeCompare(b.groupName, "vi"));

    return NextResponse.json({
      month: targetMonth.slice(0, 7), groupCount: groups.length,
      advisorCount: groups.reduce((sum, group) => sum + group.advisorCount, 0),
      revenueTarget: groups.reduce((sum, group) => sum + group.revenueTarget, 0), groups,
      leaderGroupCount: leaderGroups.length, leaderAdvisorCount: leaderGroups.reduce((sum: number, group: any) => sum + group.advisorCount, 0),
      leaderRevenueTarget: leaderGroups.reduce((sum: number, group: any) => sum + group.revenueTarget, 0), leaderGroups, comparisons,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được bảng mục tiêu." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (String(body.password || "") !== "159357") return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 403 });
    const targetMonth = monthStart(String(body.month || ""));
    const supabase = getSupabaseAdmin();
    const { error: primaryError } = await supabase.from("tvv_target_registrations").delete().eq("target_month", targetMonth);
    const missingPrimaryTable = primaryError?.code === "42P01" || primaryError?.code === "PGRST205";
    if (primaryError && !missingPrimaryTable) throw primaryError;
    const { error: fallbackError } = await supabase.from("team_target_registrations").delete().eq("target_month", targetMonth).like("group_name", "__TVV_TARGET__%");
    if (fallbackError) throw fallbackError;
    return NextResponse.json({ reset: true, month: targetMonth.slice(0, 7) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không reset được dữ liệu." }, { status: 500 });
  }
}
