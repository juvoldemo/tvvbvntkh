import assert from "node:assert/strict";
import { calculatePolicyRewards } from "../lib/tvv-policy-rewards";

const kpi = (month: string, overrides: Record<string, any> = {}) => ({
  id: `${month}-${overrides.agent_code ?? "A01"}`,
  data_month: `${month}-01`,
  agent_code: "A01",
  agent_name: "TVV Một",
  ban_name: "Ban A",
  group_name: "Nhóm 1",
  ip: 12_000_000,
  fyc: 10_000_000,
  fyp: 24_000_000,
  raw_data: { application_nos: [`GYC-${month}`] },
  ...overrides
});
const bc02 = (date: string, applicationNo: string, overrides: Record<string, any> = {}) => ({
  id: applicationNo,
  paid_date: date,
  data_month: `${date.slice(0, 7)}-01`,
  agent_code: "A01",
  agent_name: "TVV Một",
  ban_name: "Ban A",
  group_name: "Nhóm 1",
  application_no: applicationNo,
  contract_no: applicationNo,
  ip: 10_000_000,
  afyp: 10_000_000,
  ...overrides
});

const monthly = calculatePolicyRewards({ selectedMonth: "2026-01", kpi04: [kpi("2026-01")], bc02: [] });
assert.equal(monthly.monthly[0].reward, 1_000_000, "thưởng tháng dùng 10% tổng FYC");

const quarterly = calculatePolicyRewards({
  selectedMonth: "2026-03",
  kpi04: [kpi("2026-01"), kpi("2026-02"), kpi("2026-03")],
  bc02: []
});
assert.equal(quarterly.quarterly[0].rate, 0.1, "FYP quý 72 triệu dùng bậc 10%");
assert.equal(quarterly.quarterly[0].reward, 3_000_000);

const bc02OnlyQuarter = calculatePolicyRewards({
  selectedMonth: "2026-03",
  kpi04: [],
  bc02: [
    bc02("2026-01-10", "B01", { ip: 150_000_000 }),
    bc02("2026-02-10", "B02", { ip: 150_000_000 }),
    bc02("2026-03-10", "B03", { ip: 110_033_500 })
  ]
});
assert.equal(bc02OnlyQuarter.quarterly[0].totalFyc, 123_010_050);
assert.equal(bc02OnlyQuarter.quarterly[0].rate, 0.13, "BC02 không có FYP phải fallback bằng tổng FYC ước tính");
assert.equal(bc02OnlyQuarter.quarterly[0].reward, 15_991_306.5);

const calculatorQuarter = calculatePolicyRewards({
  selectedMonth: "2026-07",
  kpi04: [],
  bc02: [bc02("2026-07-15", "POLICY-DRAFT", { ip: 35_000_000, estimated_fyp: 35_000_000 })]
});
assert.equal(calculatorQuarter.quarterly[0].rate, 0.08, "hợp đồng dự kiến 35 triệu phải đạt bậc thưởng quý 8%");
assert.equal(calculatorQuarter.quarterly[0].reward, 840_000);

const movedGroup = calculatePolicyRewards({
  selectedMonth: "2026-03",
  kpi04: [
    kpi("2026-01", { group_name: "Nhóm cũ" }),
    kpi("2026-02", { group_name: "Nhóm mới" }),
    kpi("2026-03", { group_name: "Nhóm mới" })
  ],
  bc02: [],
  filters: { agentCode: "A01" }
});
assert.equal(movedGroup.quarterly[0].fyp, 72_000_000, "phải gom toàn bộ lịch sử theo mã TVV dù đổi nhóm");

const month13 = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: ["01", "02", "03", "04", "05", "06"].map((month) => kpi(`2026-${month}`)),
  bc02: []
});
assert.deepEqual(month13.month13[0].achievedQuarters, [1, 2]);
assert.equal(month13.month13[0].reward, 3_000_000);

const deduped = calculatePolicyRewards({
  selectedMonth: "2026-01",
  kpi04: [kpi("2026-01", { raw_data: { application_nos: [" gyc 001 "] } })],
  bc02: [bc02("2026-01-10", "GYC001"), bc02("2026-01-11", "NEW001")]
});
assert.equal(deduped.rewardMonthContracts.filter((row: any) => row.source === "bc02").length, 1);
assert.equal(deduped.monthly[0].estimatedFyc, 3_000_000);

const filtered = calculatePolicyRewards({
  selectedMonth: "2026-01",
  kpi04: [kpi("2026-01"), kpi("2026-01", { agent_code: "A02", agent_name: "TVV Hai", group_name: "Nhóm 2" })],
  bc02: [],
  filters: { ban: "Ban A", group: "Nhóm 1", agentCode: "A01" }
});
assert.equal(filtered.monthly.length, 1);
assert.equal(filtered.monthly[0].agentCode, "A01");

console.log("TVV policy reward tests passed.");
