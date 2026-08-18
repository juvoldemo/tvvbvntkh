import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { userCodeFromRequest } from "@/lib/user-auth";

export async function getAdvisorActivityActor(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return null;
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase.from("authorized_users")
    .select("advisor_code,full_name").eq("advisor_code", code).eq("is_active", true).maybeSingle();
  if (error || !profile) return null;
  const configured = managedAdoScope(profile.advisor_code, profile.full_name);
  if (configured) return { supabase, code, name: configured.fullName, groups: configured.groups };
  if (!isBossAccount(profile.advisor_code)) return null;
  const { data: rows, error: groupsError } = await supabase.from("authorized_users")
    .select("group_name,advisor_position").eq("is_active", true).not("group_name", "is", null);
  if (groupsError) throw groupsError;
  const excluded = new Set(["ado", "boss"]);
  const groups = [...new Set((rows ?? []).flatMap((row: any) => {
    const group = String(row.group_name || "").trim();
    const position = String(row.advisor_position || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return group && !excluded.has(position) ? [group] : [];
  }))];
  return { supabase, code, name: profile.full_name || "Boss", groups };
}

export async function advisorIsInActorScope(actor: NonNullable<Awaited<ReturnType<typeof getAdvisorActivityActor>>>, advisorCode: string) {
  const { data, error } = await actor.supabase.from("authorized_users").select("advisor_code")
    .eq("advisor_code", advisorCode).eq("is_active", true).eq("advisor_status", "Hoạt động")
    .in("group_name", actor.groups).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
