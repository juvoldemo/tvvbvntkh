import { getVietnamToday } from "@/lib/format";

export const TARGET_CYCLE_SENTINEL_MONTH = "2099-11-01";
export const TARGET_CYCLE_SENTINEL_GROUP = "__TARGET_REGISTRATION_CYCLE__";

type TargetCycleMetadata = {
  version: 1;
  activeMonth: string;
  savedMonths: string[];
  startedAt?: string;
  savedAt?: string;
  updatedBy?: string;
};

export type TargetRegistrationCycle = {
  activeMonth: string;
  nextMonth: string;
  previousMonth: string | null;
  savedMonths: string[];
  activeMonthSaved: boolean;
  canRollback: boolean;
  startedAt: string | null;
  savedAt: string | null;
  updatedAt: string | null;
};

function validMonth(value: unknown) {
  const month = String(value ?? "").slice(0, 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "";
}

export function nextTargetMonth(month: string) {
  const normalized = validMonth(month) || getVietnamToday().slice(0, 7);
  const year = Number(normalized.slice(0, 4));
  const monthNo = Number(normalized.slice(5, 7));
  const next = new Date(Date.UTC(year, monthNo, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMetadata(value: unknown): TargetCycleMetadata | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const raw = value as Partial<TargetCycleMetadata>;
  const activeMonth = validMonth(raw.activeMonth);
  if (!activeMonth) return null;
  const savedMonths = [...new Set((Array.isArray(raw.savedMonths) ? raw.savedMonths : [])
    .map(validMonth)
    .filter(Boolean))];
  return {
    version: 1,
    activeMonth,
    savedMonths,
    startedAt: String(raw.startedAt || "") || undefined,
    savedAt: String(raw.savedAt || "") || undefined,
    updatedBy: String(raw.updatedBy || "") || undefined
  };
}

function previousSavedMonth(activeMonth: string, savedMonths: string[]) {
  return savedMonths
    .filter((month) => month < activeMonth)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export async function readTargetRegistrationCycle(supabase: any): Promise<TargetRegistrationCycle> {
  const { data, error } = await supabase
    .from("team_target_registrations")
    .select("selected_advisors,updated_at")
    .eq("target_month", TARGET_CYCLE_SENTINEL_MONTH)
    .eq("group_name", TARGET_CYCLE_SENTINEL_GROUP)
    .maybeSingle();
  if (error) throw error;
  const metadata = parseMetadata(data?.selected_advisors);
  const activeMonth = metadata?.activeMonth || getVietnamToday().slice(0, 7);
  const savedMonths = metadata?.savedMonths ?? [];
  const previousMonth = previousSavedMonth(activeMonth, savedMonths);
  return {
    activeMonth,
    nextMonth: nextTargetMonth(activeMonth),
    previousMonth,
    savedMonths,
    activeMonthSaved: savedMonths.includes(activeMonth),
    canRollback: Boolean(previousMonth),
    startedAt: metadata?.startedAt ?? null,
    savedAt: metadata?.savedAt ?? null,
    updatedAt: data?.updated_at ?? null
  };
}

export async function writeTargetRegistrationCycle(
  supabase: any,
  metadata: TargetCycleMetadata
): Promise<TargetRegistrationCycle> {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("team_target_registrations")
    .upsert({
      target_month: TARGET_CYCLE_SENTINEL_MONTH,
      leader_code: "__SYSTEM__",
      leader_name: "Quản trị chu kỳ mục tiêu",
      group_name: TARGET_CYCLE_SENTINEL_GROUP,
      revenue_target: 0,
      active_advisor_target: 0,
      reward_target: 0,
      selected_advisors: metadata,
      updated_at: updatedAt
    }, { onConflict: "target_month,group_name" });
  if (error) throw error;
  const previousMonth = previousSavedMonth(metadata.activeMonth, metadata.savedMonths);
  return {
    activeMonth: metadata.activeMonth,
    nextMonth: nextTargetMonth(metadata.activeMonth),
    previousMonth,
    savedMonths: metadata.savedMonths,
    activeMonthSaved: metadata.savedMonths.includes(metadata.activeMonth),
    canRollback: Boolean(previousMonth),
    startedAt: metadata.startedAt ?? null,
    savedAt: metadata.savedAt ?? null,
    updatedAt
  };
}
