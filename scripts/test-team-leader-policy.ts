import assert from "node:assert/strict";
import { calculateTeamLeaderPolicy } from "../lib/team-leader-policy";
import type { RevenueRecord } from "../lib/types";

function record(code: string, ip: number, paidDate: string, status = "Có hiệu lực"): RevenueRecord {
  return {
    data_month: `${paidDate.slice(0, 7)}-01`,
    ban_name: "Ban",
    group_name: "Nhóm A",
    agent_code: code,
    agent_name: code,
    contract_no: `${code}-${paidDate}-${ip}`,
    paid_date: paidDate,
    issued_date: paidDate,
    policy_status: status,
    ip,
    afyp: ip
  };
}

function calculate(overrides: Partial<Parameters<typeof calculateTeamLeaderPolicy>[0]> = {}) {
  const rows = overrides.groupRecords ?? [
    record("A1", 100_000_000, "2026-06-01"),
    record("A2", 80_000_000, "2026-06-02"),
    record("A3", 70_000_000, "2026-06-03")
  ];
  return calculateTeamLeaderPolicy({
    month: "2026-06",
    groupName: "Nhóm A",
    positionEffectiveDate: "2026-01-15",
    groupRecords: rows,
    latestGroupByAdvisor: new Map(rows.map((row) => [row.agent_code, "Nhóm A"])),
    fycRows: [{
      data_month: "2026-06-01",
      agent_code: rows[0]?.agent_code || "A1",
      fyc: 30_000_000,
      raw_data: { application_nos: rows.map((row) => row.contract_no) }
    }],
    advisorProfiles: [],
    asOfDate: "2026-07-04",
    ...overrides
  });
}

const base = calculate();
assert.equal(base.monthly.ip, 250_000_000);
assert.equal(base.monthly.hdc, 3);
assert.equal(base.monthly.rate, 0.22);
assert.equal(base.monthly.reward, 6_600_000);
assert.equal(base.quarterly.rate, 0.04);
assert.equal(base.quarterly.reward, 1_200_000);
assert.equal(base.newManager?.reward, 5_000_000);
assert.equal(base.monthly.milestones[0]?.missing, 150_000_000);
assert.equal(base.quarterly.milestones[0]?.missing, 20_000_000);
assert.equal(base.annual.milestones[0]?.projectedReward, 6_000_000);

const refunded = calculate({
  groupRecords: [
    record("A1", 100_000_000, "2026-06-01", "Hoàn phí"),
    record("A2", 60_000_000, "2026-06-02")
  ]
});
assert.equal(refunded.monthly.ip, 60_000_000);
assert.equal(refunded.monthly.hdc, 1);

const recruited = calculate({
  groupRecords: [record("NEW", 160_000_000, "2026-05-10")],
  latestGroupByAdvisor: new Map([["NEW", "Nhóm A"]]),
  advisorProfiles: [{ advisor_code: "NEW", start_date: "2025-10-01" }]
});
assert.equal(recruited.quarterly.hasNewAdvisor, true);
assert.equal(recruited.quarterly.rate, 0.09);

const expiredManager = calculate({ positionEffectiveDate: "2025-05-31" });
assert.equal(expiredManager.newManager, null);

const issuedNextMonthRow = record("A1", 50_000_000, "2026-06-29");
issuedNextMonthRow.issued_date = "2026-07-01";
const issuedNextMonth = calculate({ groupRecords: [issuedNextMonthRow] });
assert.equal(issuedNextMonth.monthly.ip, 0);
assert.equal(issuedNextMonth.quarterly.ip, 0);

const kpi05ReplacesKpi04AndBc02 = calculate({
  fycRows: [
    {
      data_month: "2026-06-01",
      reward_source: "kpi04",
      agent_code: "A1",
      fyc: 30_000_000,
      raw_data: { application_nos: ["A1-2026-06-01-100000000"] }
    },
    {
      data_month: "2026-06-01",
      reward_source: "kpi05",
      agent_code: "A1",
      fyc: 40_000_000,
      raw_data: { application_nos: ["KPI05-A1"] }
    }
  ]
});
assert.equal(kpi05ReplacesKpi04AndBc02.monthly.kpi04Fyc, 0);
assert.equal(kpi05ReplacesKpi04AndBc02.monthly.kpi05Fyc, 40_000_000);
assert.equal(kpi05ReplacesKpi04AndBc02.monthly.bc02Fyc, 45_000_000);
assert.equal(kpi05ReplacesKpi04AndBc02.monthly.fyc, 85_000_000);
assert.equal(kpi05ReplacesKpi04AndBc02.monthly.reward, 18_700_000);
assert.equal(kpi05ReplacesKpi04AndBc02.annual.kpi04Fyc, 0);
assert.equal(kpi05ReplacesKpi04AndBc02.annual.kpi05Fyc, 40_000_000);

console.log("Team leader policy tests passed.");
