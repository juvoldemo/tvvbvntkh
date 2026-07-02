import type { SupabaseClient } from "@supabase/supabase-js";
import type { StarVietRecord } from "@/lib/star-viet";

const PAGE_SIZE = 1000;

async function readAllPages<T>(makeQuery: (from: number, to: number) => any): Promise<T[]> {
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

export async function readStarVietRecords(
  supabase: SupabaseClient,
  selectedMonth: string,
  advisorCode = ""
): Promise<StarVietRecord[]> {
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const kpi04 = await readAllPages<StarVietRecord>((from, to) =>
    supabase
      .from("star_viet_records")
      .select("id,data_year,source,agent_name,group_name,afyp,policy_status,raw_data")
      .eq("data_year", selectedYear)
      .eq("source", "kpi04")
      .range(from, to)
  );

  const bc02 = await readAllPages<StarVietRecord>((from, to) => {
    let query = supabase
      .from("revenue_records")
      .select("agent_name,agent_code,group_name,ban_name,afyp,policy_status,paid_date,raw_data")
      .eq("data_month", `${selectedMonth}-01`)
      .gte("paid_date", `${selectedMonth}-01`)
      .lte("paid_date", monthEnd(selectedMonth));
    if (advisorCode) query = query.ilike("agent_code", advisorCode);
    return query.range(from, to);
  });

  return [
    ...kpi04,
    ...bc02.map((record) => ({
      ...record,
      data_year: selectedYear,
      source: "bc02" as const
    }))
  ];
}
