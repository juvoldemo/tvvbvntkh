import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { calculatePolicyRewards } from "../lib/tvv-policy-rewards";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Thiếu cấu hình Supabase chỉ đọc.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function readAll(table: string, configure: (query: any) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(supabase.from(table).select("*")).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

function csv(prefix: string) {
  const downloads = path.join(process.env.USERPROFILE || "", "Downloads");
  const fileName = fs.readdirSync(downloads).find((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(".csv"));
  if (!fileName) throw new Error(`Không tìm thấy ${prefix}`);
  return Papa.parse<Record<string, string>>(fs.readFileSync(path.join(downloads, fileName), "utf8"), { header: true, skipEmptyLines: true }).data;
}

const money = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
async function main() {
const [policy, bc02, profiles] = await Promise.all([
  readAll("tvv_reward_policy_records", (q) => q.gte("data_month", "2026-01-01").lte("data_month", "2026-12-31")),
  readAll("revenue_records", (q) => q.neq("data_month", "2099-01-01").gte("paid_date", "2026-01-01").lte("paid_date", "2026-12-31")),
  readAll("authorized_users", (q) => q)
]);
const result = calculatePolicyRewards({ selectedMonth: "2026-06", kpi04: policy, bc02, advisorProfiles: profiles });
const monthlyExpected = new Map(csv("INC51").map((row) => [String(row["Mã đại lý"] || "").trim(), money(row["Thưởng năng suất TVV"])]));
const quarterExpected = new Map(csv("INC14").map((row) => [String(row["Mã TVV"] || "").trim(), money(row[" Tiền thưởng "])]));
const monthly = result.monthly.map((row) => ({ code: row.agentCode, name: row.agentName, calculated: row.reward, expected: monthlyExpected.get(row.agentCode) ?? 0 }))
  .filter((row) => Math.round(row.calculated) !== Math.round(row.expected));
const quarterly = result.quarterly.map((row) => ({ code: row.agentCode, name: row.agentName, calculated: row.reward, expected: quarterExpected.get(row.agentCode) ?? 0 }))
  .filter((row) => Math.round(row.calculated) !== Math.round(row.expected));
console.log(JSON.stringify({ sourceCounts: { policy: policy.length, bc02: bc02.length, profiles: profiles.length }, targets: {
  D102143412: result.monthly.find((row) => row.agentCode === "D102143412"),
  D102122613: result.monthly.find((row) => row.agentCode === "D102122613"),
  D102107632: result.monthly.find((row) => row.agentCode === "D102107632")
}, differences: { monthly, quarterly } }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
