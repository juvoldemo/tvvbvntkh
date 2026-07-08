import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { monthBounds, toMonthStart } from "@/lib/format";
import { buildAgentRanking, buildGroupRanking, isCountedRevenueRecord, normalizeStatusText } from "@/lib/reports";
import type { RevenueRecord } from "@/lib/types";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  try {
    const signedInAdvisorCode = userCodeFromRequest(request);
    const requestedAdvisorCode = String(request.nextUrl.searchParams.get("advisorCode") || "").trim().toUpperCase();
    const advisorCode = signedInAdvisorCode || requestedAdvisorCode;
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const { start, end } = monthBounds(month);
    const supabase = getSupabaseAdmin();
    const { data: records, error } = await supabase
      .from("revenue_records")
      .select("*")
      .eq("data_month", toMonthStart(month))
      .gte("paid_date", start)
      .lte("paid_date", end);

    if (error) throw error;

    const countedRecords = ((records ?? []) as RevenueRecord[]).filter(isCountedRevenueRecord);
    const agentRanking = buildAgentRanking(countedRecords);
    const currentAdvisorRank = agentRanking.find(
      (row) => String(row.agentCode).trim().toUpperCase() === advisorCode
    )?.rank ?? null;
    const advisorRecords = ((records ?? []) as RevenueRecord[]).filter(
      (row) => advisorCode && String(row.agent_code ?? "").trim().toUpperCase() === advisorCode
    );
    const issued = advisorRecords.filter((row) => normalizeStatusText(row.policy_status) === "co hieu luc").length;
    const invalidStatuses = new Set(["het hieu luc", "tu choi", "tri hoan", "hoan phi", "ycbh het hieu luc"]);
    const invalid = advisorRecords.filter((row) => invalidStatuses.has(normalizeStatusText(row.policy_status))).length;
    const advisorStats = {
      total: advisorRecords.length,
      issued,
      pending: Math.max(advisorRecords.length - issued - invalid, 0),
      invalid
    };
    const topAgents = agentRanking.slice(0, 10);
    const topAgentCodes = topAgents.map((row) => String(row.agentCode).trim().toUpperCase()).filter(Boolean);
    const { data: profiles } = topAgentCodes.length
      ? await supabase.from("authorized_users").select("advisor_code,avatar_url").in("advisor_code", topAgentCodes)
      : { data: [] };
    const avatarByCode = new Map(
      (profiles ?? []).map((profile: any) => [
        String(profile.advisor_code ?? "").trim().toUpperCase(),
        profile.avatar_url || null
      ])
    );
    const agents = topAgents.map((row) => ({
      ...row,
      avatarUrl: avatarByCode.get(String(row.agentCode).trim().toUpperCase()) ?? null
    }));
    const topGroups = buildGroupRanking(countedRecords).slice(0, 10);
    const { data: leaders } = await supabase
      .from("authorized_users")
      .select("advisor_code,full_name,advisor_position,group_name,avatar_url")
      .eq("is_active", true)
      .not("avatar_url", "is", null);
    const leaderAvatarByGroup = new Map<string, string>();
    (leaders ?? []).forEach((leader: any) => {
      const groupName = managedTeamName(leader.advisor_code, leader.advisor_position, leader.full_name, leader.group_name);
      if (groupName && leader.avatar_url && !leaderAvatarByGroup.has(groupName)) leaderAvatarByGroup.set(groupName, leader.avatar_url);
    });
    const groups = topGroups.map((row) => ({
      ...row,
      avatarUrl: leaderAvatarByGroup.get(row.groupName) ?? null
    }));

    return NextResponse.json({ month, agents, groups, currentAdvisorRank, advisorStats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được bảng xếp hạng.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
