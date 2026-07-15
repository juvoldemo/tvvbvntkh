import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord } from "@/lib/reports";
import {
  latestStarVietSnapshotDate,
  mergeStarVietKpi04AndBc02,
  recentStarVietMonthKeys,
  starVietBc02AfterSnapshot,
  type StarVietRecord
} from "@/lib/star-viet";
import type { RevenueRecord } from "@/lib/types";

const PAGE_SIZE = 1000;

export async function readAllPages<T>(makeQuery: (from: number, to: number) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function toBc02Record(record: RevenueRecord, year: number): StarVietRecord {
  return {
    data_year: year,
    data_month: record.paid_date ? `${String(record.paid_date).slice(0, 7)}-01` : null,
    source: "bc02",
    agent_code: record.agent_code,
    agent_name: record.agent_name,
    group_name: record.group_name || record.ban_name || null,
    afyp: Number(record.afyp) || 0,
    policy_status: record.policy_status ?? null,
    raw_data: {
      ...(record.raw_data ?? {}),
      application_no: record.application_no ?? "",
      contract_no: record.contract_no ?? "",
      paid_date: record.paid_date ?? ""
    }
  };
}

export type StarVietData = {
  personalRecords: StarVietRecord[];
  groupRecords: StarVietRecord[];
  storedRecords: StarVietRecord[];
  agentSnapshotDate: string;
  groupSnapshotDate: string;
  warning: string | null;
};

export async function readStarVietData(
  supabase: SupabaseClient,
  selectedMonth: string
): Promise<StarVietData> {
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const [storedRecords, revenueRows] = await Promise.all([
    readAllPages<StarVietRecord>((from, to) => supabase
      .from("star_viet_records")
      .select("id,data_year,data_month,source,agent_code,agent_name,group_name,afyp,policy_status,raw_data,uploaded_at")
      .in("data_year", [selectedYear - 1, selectedYear])
      .range(from, to)),
    readAllPages<RevenueRecord>((from, to) => supabase
      .from("revenue_records")
      .select("*")
      .neq("data_month", "2099-01-01")
      .gte("paid_date", `${selectedYear}-01-01`)
      .lte("paid_date", monthEnd(selectedMonth))
      .range(from, to))
  ]);

  const countedRevenue = dedupeRevenueRecordsByContract(revenueRows.filter(isCountedRevenueRecord));
  const allBc02 = countedRevenue.map((record) => toBc02Record(record, selectedYear));
  const selectedEnd = monthEnd(selectedMonth);
  const eligibleStoredRecords = storedRecords.filter((record) =>
    !record.data_month || String(record.data_month).slice(0, 10) <= selectedEnd
  );
  const agentSnapshotDate = latestStarVietSnapshotDate(eligibleStoredRecords, "snapshot_agent");
  const groupSnapshotDate = latestStarVietSnapshotDate(eligibleStoredRecords, "snapshot_group");
  const latestAgentSnapshot = eligibleStoredRecords.filter((record) =>
    record.source === "snapshot_agent" && String(record.data_month ?? "").slice(0, 10) === agentSnapshotDate
  );
  const latestGroupSnapshot = eligibleStoredRecords.filter((record) =>
    record.source === "snapshot_group" && String(record.data_month ?? "").slice(0, 10) === groupSnapshotDate
  );
  const kpi04 = eligibleStoredRecords.filter((record) => record.source === "kpi04" && record.data_year === selectedYear);
  const recentMonths = new Set(recentStarVietMonthKeys(selectedMonth));
  const recentBc02 = allBc02.filter((record) => recentMonths.has(String(record.raw_data?.paid_date ?? "").slice(0, 7)));
  const legacyRecords = mergeStarVietKpi04AndBc02(kpi04, recentBc02);
  const kpi05History = eligibleStoredRecords.filter((record) =>
    record.source === "kpi05_group" && String(record.data_month ?? "").slice(0, 7) <= selectedMonth
  );

  return {
    personalRecords: agentSnapshotDate
      ? [...latestAgentSnapshot, ...starVietBc02AfterSnapshot(allBc02, agentSnapshotDate)]
      : [...legacyRecords, ...kpi05History],
    groupRecords: groupSnapshotDate
      ? [...latestGroupSnapshot, ...starVietBc02AfterSnapshot(allBc02, groupSnapshotDate)]
      : [...kpi04, ...kpi05History, ...legacyRecords.filter((record) => record.source === "bc02")],
    storedRecords: eligibleStoredRecords,
    agentSnapshotDate,
    groupSnapshotDate,
    warning: !agentSnapshotDate || !groupSnapshotDate
      ? "Chưa đủ snapshot Sao Việt TVV và trưởng nhóm. Hệ thống đang dùng cách tính cũ cho phần chưa có snapshot."
      : null
  };
}

/** @deprecated Prefer readStarVietData so TVV and group snapshot cutoffs stay independent. */
export async function readStarVietRecords(supabase: SupabaseClient, selectedMonth: string): Promise<StarVietRecord[]> {
  return (await readStarVietData(supabase, selectedMonth)).personalRecords;
}
