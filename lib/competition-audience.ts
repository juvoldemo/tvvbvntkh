import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";

export type CompetitionAudience = "all" | "team_leader";

export function normalizeCompetitionAudience(value: unknown): CompetitionAudience {
  return value === "team_leader" ? "team_leader" : "all";
}

export function competitionIsVisibleTo(program: any, viewerAudience: CompetitionAudience) {
  return normalizeCompetitionAudience(program?.display_audience ?? program?.displayAudience) === "all"
    || viewerAudience === "team_leader";
}

export async function competitionViewerAudience(request: NextRequest): Promise<CompetitionAudience> {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) return "all";

  const { data } = await getSupabaseAdmin()
    .from("authorized_users")
    .select("advisor_code,full_name,advisor_position,group_name")
    .eq("advisor_code", advisorCode)
    .maybeSingle();

  if (!data) return "all";
  return managedTeamName(data.advisor_code, data.advisor_position, data.full_name, data.group_name)
    ? "team_leader"
    : "all";
}
