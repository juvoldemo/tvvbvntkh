import assert from "node:assert/strict";
import { calculateRecruitmentTrainingReward, calculateTeamLeaderPolicy } from "../lib/team-leader-policy";
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
      fyp: 250_000_000,
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
assert.equal(base.newManager?.fyp, 250_000_000);
assert.equal(base.newManager?.fypSource, "bc02");
assert.equal(base.newManagerStatus.eligible, true);
assert.equal(base.monthly.milestones[0]?.missing, 150_000_000);
assert.equal(base.quarterly.milestones[0]?.missing, 20_000_000);
assert.equal(base.annual.milestones[0]?.projectedReward, 6_000_000);
assert.equal(base.recruitmentTraining.activeNewAdvisorCount, 0);
assert.equal(base.recruitmentTraining.milestones[0]?.missing, 1);

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

function recruitmentTraining(advisorIps: number[]) {
  const rows = advisorIps.map((ip, index) => record(`NEW${index + 1}`, ip, "2026-06-10"));
  return calculate({
    groupRecords: rows,
    latestGroupByAdvisor: new Map(rows.map((row) => [String(row.agent_code), "Nhóm A"])),
    fycRows: rows.map((row) => ({
      data_month: "2026-06-01",
      agent_code: row.agent_code,
      agent_name: row.agent_name,
      group_name: "Nhóm A",
      ip: row.ip,
      fyc: Number(row.ip) * 0.3,
      raw_data: { application_nos: [row.contract_no] }
    })),
    advisorProfiles: rows.map((row) => ({
      advisor_code: row.agent_code,
      start_date: "2026-06-01",
      group_name: "Nhóm A",
      is_active: true
    }))
  }).recruitmentTraining;
}

const oneNewAdvisor = recruitmentTraining([13_000_000]);
assert.equal(oneNewAdvisor.activeNewAdvisorCount, 1);
assert.equal(oneNewAdvisor.rate, 1);
assert.equal(oneNewAdvisor.monthlyReward, 1_000_000);
assert.equal(oneNewAdvisor.stageReward, 0);
assert.equal(oneNewAdvisor.reward, 1_000_000);

const simulatedLeaderReward = calculateRecruitmentTrainingReward(1, 1_000_000, 0);
assert.deepEqual(simulatedLeaderReward, {
  activeNewAdvisorCount: 1,
  rate: 1,
  monthlyReward: 1_000_000,
  stageReward: 0,
  totalNewAdvisorReward: 1_000_000,
  reward: 1_000_000
});

const twoNewAdvisors = recruitmentTraining([50_000_000, 13_000_000]);
assert.equal(twoNewAdvisors.activeNewAdvisorCount, 2);
assert.equal(twoNewAdvisors.rate, 1.25);
assert.equal(twoNewAdvisors.monthlyReward, 2_000_000);
assert.equal(twoNewAdvisors.stageReward, 3_000_000);
assert.equal(twoNewAdvisors.totalNewAdvisorReward, 5_000_000);
assert.equal(twoNewAdvisors.reward, 6_250_000);

const threeNewAdvisors = recruitmentTraining([13_000_000, 13_000_000, 13_000_000]);
assert.equal(threeNewAdvisors.activeNewAdvisorCount, 3);
assert.equal(threeNewAdvisors.rate, 1.5);
assert.equal(threeNewAdvisors.totalNewAdvisorReward, 3_000_000);
assert.equal(threeNewAdvisors.reward, 4_500_000);

const earlyAdvisorCurrentRow = record("EARLY-NEW", 13_000_000, "2026-06-20", "CNBH có điều kiện");
const earlyAdvisorPreviousGroupRow = record("EARLY-NEW", 37_000_000, "2026-05-20");
earlyAdvisorPreviousGroupRow.group_name = "Nhóm cũ";
const advisorStartedBeforeNewLeader = calculate({
  positionEffectiveDate: "2026-06-15",
  groupRecords: [earlyAdvisorCurrentRow],
  allRevenueRecords: [earlyAdvisorPreviousGroupRow, earlyAdvisorCurrentRow],
  latestGroupByAdvisor: new Map([["EARLY-NEW", "Nhóm A"]]),
  fycRows: [earlyAdvisorPreviousGroupRow, earlyAdvisorCurrentRow].map((row) => ({
    data_month: `${String(row.paid_date).slice(0, 7)}-01`,
    agent_code: row.agent_code,
    agent_name: row.agent_name,
    group_name: row.group_name,
    ip: row.ip,
    fyc: Number(row.ip) * 0.3,
    raw_data: { application_nos: [row.contract_no] }
  })),
  advisorProfiles: [{ advisor_code: "EARLY-NEW", start_date: "2026-05-13", group_name: "Nhóm A", is_active: true }]
}).recruitmentTraining;
assert.equal(advisorStartedBeforeNewLeader.activeNewAdvisorCount, 1, "TVV mới vào trước ngày hiệu lực của TN mới vẫn được tính");
assert.equal(advisorStartedBeforeNewLeader.monthlyReward, 1_000_000);
assert.equal(advisorStartedBeforeNewLeader.stageReward, 3_000_000, "thưởng chặng dùng lũy kế trong chặng và ghi nhận ở tháng vừa đạt mốc");
assert.equal(advisorStartedBeforeNewLeader.reward, 4_000_000);

const oldLeaderWithNewAdvisor = calculate({
  positionEffectiveDate: "2024-01-01",
  groupRecords: [record("NEW-FOR-OLD", 13_000_000, "2026-06-20")],
  latestGroupByAdvisor: new Map([["NEW-FOR-OLD", "Nhóm A"]]),
  fycRows: [{
    data_month: "2026-06-01",
    agent_code: "NEW-FOR-OLD",
    agent_name: "NEW-FOR-OLD",
    group_name: "Nhóm A",
    ip: 13_000_000,
    fyc: 3_900_000,
    raw_data: { application_nos: ["NEW-FOR-OLD-2026-06-20-13000000"] }
  }],
  advisorProfiles: [{ advisor_code: "NEW-FOR-OLD", start_date: "2026-05-13", group_name: "Nhóm A", is_active: true }]
}).recruitmentTraining;
assert.equal(oldLeaderWithNewAdvisor.activeNewAdvisorCount, 1, "thưởng tuyển luyện không phụ thuộc thâm niên của Trưởng nhóm");
assert.equal(oldLeaderWithNewAdvisor.reward, 1_000_000);

const advisorOutsideNewRewardPeriod = calculate({
  positionEffectiveDate: "2024-01-01",
  groupRecords: [record("OLD-NEW", 13_000_000, "2026-06-10")],
  latestGroupByAdvisor: new Map([["OLD-NEW", "Nhóm A"]]),
  fycRows: [],
  advisorProfiles: [{ advisor_code: "OLD-NEW", start_date: "2025-01-01", group_name: "Nhóm A", is_active: true }]
});
assert.equal(advisorOutsideNewRewardPeriod.recruitmentTraining.activeNewAdvisorCount, 0, "TVV hết kỳ thưởng mới không được tính vào bậc tuyển luyện");
assert.equal(advisorOutsideNewRewardPeriod.recruitmentTraining.reward, 0);
assert.equal(advisorOutsideNewRewardPeriod.recruitmentTraining.milestones[0]?.missing, 1);

function managementReward(hdc: number, fyp: number) {
  const rows = Array.from({ length: hdc }, (_, index) => record(`M${index + 1}`, 13_000_000, "2026-06-10"));
  rows.forEach((row) => { row.afyp = fyp / hdc; });
  return calculate({
    groupRecords: rows,
    latestGroupByAdvisor: new Map(rows.map((row) => [String(row.agent_code), "Nhóm A"])),
    fycRows: []
  }).newManager;
}

assert.equal(managementReward(2, 44_000_000)?.reward, 0);
assert.equal(managementReward(2, 45_000_000)?.reward, 3_000_000);
assert.equal(managementReward(3, 45_000_000)?.reward, 3_000_000);
assert.equal(managementReward(3, 55_000_000)?.reward, 5_000_000);
assert.equal(managementReward(4, 45_000_000)?.reward, 5_000_000);
assert.equal(managementReward(4, 85_000_000)?.reward, 8_000_000);

const conditionalAdvisor = record("CONDITIONAL", 16_000_000, "2026-06-11", "CNBH có điều kiện");
conditionalAdvisor.issued_date = null;
const paidButNotIssuedManager = calculate({
  groupRecords: [record("ISSUED", 30_000_000, "2026-06-10"), conditionalAdvisor],
  latestGroupByAdvisor: new Map([["ISSUED", "Nhóm A"], ["CONDITIONAL", "Nhóm A"]]),
  fycRows: []
}).newManager;
assert.equal(paidButNotIssuedManager?.fyp, 46_000_000);
assert.equal(paidButNotIssuedManager?.hdc, 2, "TVV có IP trên 12 triệu được tính HĐC dù hợp đồng chưa phát hành");
assert.equal(paidButNotIssuedManager?.reward, 3_000_000);

const anniversaryMonth = calculate({ positionEffectiveDate: "2025-06-15" });
assert.equal(anniversaryMonth.newManager, null, "tháng kỷ niệm 12 tháng không còn thuộc kỳ thưởng quản lý mới");
assert.equal(anniversaryMonth.newManagerStatus.eligible, false);
assert.match(anniversaryMonth.newManagerStatus.reason, /12 tháng/);
const monthBeforeAnniversary = calculate({ month: "2026-05", positionEffectiveDate: "2025-06-01" });
assert.notEqual(monthBeforeAnniversary.newManager, null, "tháng liền trước tháng kỷ niệm vẫn thuộc kỳ thưởng quản lý mới");

const expiredManager = calculate({ positionEffectiveDate: "2025-05-31" });
assert.equal(expiredManager.newManager, null);

const issuedNextMonthRow = record("A1", 50_000_000, "2026-06-29");
issuedNextMonthRow.issued_date = "2026-07-01";
const issuedNextMonth = calculate({ groupRecords: [issuedNextMonthRow] });
assert.equal(issuedNextMonth.monthly.ip, 50_000_000, "doanh thu Trưởng nhóm được ghi nhận theo ngày thu");
assert.equal(issuedNextMonth.quarterly.ip, 50_000_000);

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

const projectedContract = calculate({
  month: "2026-08",
  groupRecords: [],
  latestGroupByAdvisor: new Map([["A1", "Nhóm A"]]),
  fycRows: [],
  drafts: [{
    advisorCode: "A1",
    ip: 35_000_000,
    expectedPaidDate: "2026-08-09",
    expectedIssueDate: "2026-08-09"
  }]
});
assert.equal(projectedContract.monthly.ip, 35_000_000);
assert.equal(projectedContract.monthly.hdc, 1);
assert.equal(projectedContract.monthly.fyc, 8_750_000, "hợp đồng dự kiến phải tạo FYC ước tính bằng 25% IP");
assert.equal(projectedContract.monthly.rate, 0.1);
assert.equal(projectedContract.monthly.reward, 875_000, "thưởng PTKD phải được tính từ FYC dự kiến");

console.log("Team leader policy tests passed.");
