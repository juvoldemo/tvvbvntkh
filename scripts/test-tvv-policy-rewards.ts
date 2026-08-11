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

const monthly = calculatePolicyRewards({ selectedMonth: "2026-01", kpi04: [kpi("2025-12", { ip: 3_000_000 }), kpi("2026-01")], bc02: [] });
assert.equal(monthly.monthly[0].reward, 1_000_000, "thưởng tháng dùng 10% tổng FYC");

const monthlyWithoutPreviousGyc = calculatePolicyRewards({ selectedMonth: "2026-01", kpi04: [kpi("2026-01")], bc02: [] });
assert.equal(monthlyWithoutPreviousGyc.monthly[0].reward, 0, "monthly reward requires previous month GYC with IP from 3 million");

const simulatedPreviousContractQualifies = calculatePolicyRewards({
  selectedMonth: "2026-02",
  kpi04: [],
  bc02: [
    bc02("2026-01-15", "POLICY-DRAFT-01", { ip: 20_000_000, estimated_fyp: 20_000_000, raw_data: { is_reward_estimate: true } }),
    bc02("2026-02-15", "POLICY-DRAFT-02", { ip: 20_000_000, estimated_fyp: 20_000_000, raw_data: { is_reward_estimate: true } })
  ]
});
assert.equal(simulatedPreviousContractQualifies.monthly[0].achieved, true, "hợp đồng mô phỏng tháng trước phải đủ điều kiện thưởng năng suất tháng sau");
assert.equal(simulatedPreviousContractQualifies.monthly[0].reward, 500_000, "thưởng năng suất mô phỏng dùng 10% FYC dự kiến tháng hiện tại");

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
    bc02("2026-01-10", "B01", { ip: 150_000_000, afyp: 150_000_000 }),
    bc02("2026-02-10", "B02", { ip: 150_000_000, afyp: 150_000_000 }),
    bc02("2026-03-10", "B03", { ip: 110_033_500, afyp: 110_033_500 })
  ]
});
assert.equal(bc02OnlyQuarter.quarterly[0].totalFyc, 102_508_375);
assert.equal(bc02OnlyQuarter.quarterly[0].rate, 0.2, "BC02 chưa có FYP dùng AFYP để tạm tính bậc thưởng quý");
assert.equal(bc02OnlyQuarter.quarterly[0].reward, 20_501_675);

const calculatorQuarter = calculatePolicyRewards({
  selectedMonth: "2026-07",
  kpi04: [],
  bc02: [bc02("2026-07-15", "POLICY-DRAFT", { ip: 35_000_000, estimated_fyp: 35_000_000 })]
});
assert.equal(calculatorQuarter.quarterly[0].rate, 0.08, "hợp đồng dự kiến 35 triệu phải đạt bậc thưởng quý 8%");
assert.equal(calculatorQuarter.quarterly[0].reward, 700_000);

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

const newAdvisorMonthly = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [],
  bc02: [bc02("2026-06-20", "NEW-MONTH", { ip: 12_000_000 })],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-06-11" }]
});
assert.equal(newAdvisorMonthly.newAdvisorMonthly[0].reward, 1_000_000, "TVV mới mặc định hoàn thành đào tạo và nhận 1 triệu khi IP tháng từ 12 triệu");

const newAdvisorIncompleteTrainingMonth1 = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [],
  bc02: [bc02("2026-06-20", "NEW-INCOMPLETE-M1", { ip: 12_000_000 })],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-06-11" }],
  newAdvisorTrainingCompleted: false
});
assert.equal(newAdvisorIncompleteTrainingMonth1.newAdvisorMonthly[0].reward, 1_000_000, "TVV chưa hoàn thành đào tạo vẫn nhận 1 triệu trong tháng thâm niên 1-3");

const newAdvisorIncompleteTrainingMonth4 = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [],
  bc02: [bc02("2026-06-20", "NEW-INCOMPLETE-M4", { ip: 12_000_000 })],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-03-11" }],
  newAdvisorTrainingCompleted: false
});
assert.equal(newAdvisorIncompleteTrainingMonth4.newAdvisorMonthly[0].reward, 500_000, "TVV chưa hoàn thành đào tạo nhận 0,5 triệu trong tháng thâm niên 4-12");

const oldAdvisorMonthly = calculatePolicyRewards({
  selectedMonth: "2026-07",
  kpi04: [kpi("2026-07")],
  bc02: [],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2024-01-01" }]
});
assert.equal(oldAdvisorMonthly.newAdvisorMonthly.length, 0, "TVV cũ không hiển thị chương trình thưởng tháng TVV mới");

const newAdvisorStage = calculatePolicyRewards({
  selectedMonth: "2026-07",
  kpi04: [],
  bc02: [
    bc02("2026-06-20", "NEW-STAGE-1", { ip: 50_000_000 }),
    bc02("2026-07-20", "NEW-STAGE-2", { ip: 50_000_000 })
  ],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-06-11" }]
});
assert.equal(newAdvisorStage.newAdvisorStage[0].stageReward, 0, "không trả lại mốc 50 triệu nếu chặng đã đạt từ tháng trước");
assert.equal(newAdvisorStage.newAdvisorStage[0].fastReward, 3_000_000, "chặng 1 đạt 100 triệu cộng thêm thưởng xuất phát nhanh 3 triệu");
assert.equal(newAdvisorStage.newAdvisorStage[0].reward, 3_000_000);

const newAdvisorStageSingleFastStart = calculatePolicyRewards({
  selectedMonth: "2026-07",
  kpi04: [],
  bc02: [bc02("2026-07-20", "NEW-STAGE-FAST", { ip: 100_000_000 })],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-07-01" }]
});
assert.equal(newAdvisorStageSingleFastStart.newAdvisorStage[0].stageReward, 3_000_000, "1 HĐ 100 triệu phải đạt vượt chặng 50 triệu");
assert.equal(newAdvisorStageSingleFastStart.newAdvisorStage[0].fastReward, 3_000_000, "1 HĐ 100 triệu phải đạt thêm xuất phát nhanh");
assert.equal(newAdvisorStageSingleFastStart.newAdvisorStage[0].reward, 6_000_000);

const deduped = calculatePolicyRewards({
  selectedMonth: "2026-01",
  kpi04: [kpi("2026-01", { raw_data: { application_nos: [" gyc 001 "] } })],
  bc02: [bc02("2026-01-10", "GYC001"), bc02("2026-01-11", "NEW001")]
});
assert.equal(deduped.rewardMonthContracts.filter((row: any) => row.source === "bc02").length, 1);
assert.equal(deduped.monthly[0].estimatedFyc, 2_500_000);

const filtered = calculatePolicyRewards({
  selectedMonth: "2026-01",
  kpi04: [kpi("2026-01"), kpi("2026-01", { agent_code: "A02", agent_name: "TVV Hai", group_name: "Nhóm 2" })],
  bc02: [],
  filters: { ban: "Ban A", group: "Nhóm 1", agentCode: "A01" }
});
assert.equal(filtered.monthly.length, 1);
assert.equal(filtered.monthly[0].agentCode, "A01");

const kpi05ReplacesSameAgentMonth = calculatePolicyRewards({
  selectedMonth: "2026-04",
  kpi04: [
    kpi("2026-04", { raw_data: { application_nos: ["KPI04-001"] } }),
    kpi("2026-04", { reward_source: "kpi05", fyp: 40_000_000, fyc: 12_000_000, ip: 40_000_000, raw_data: { application_nos: ["KPI05-NEW"] } })
  ],
  bc02: [bc02("2026-04-10", "BC02-001", { ip: 20_000_000 })]
});
assert.equal(kpi05ReplacesSameAgentMonth.rewardMonthContracts.filter((row: any) => row.source === "kpi04").length, 1);
assert.equal(kpi05ReplacesSameAgentMonth.rewardMonthContracts.filter((row: any) => row.source === "bc02").length, 1);
assert.equal(kpi05ReplacesSameAgentMonth.monthly[0].ip, 32_000_000, "KPI05 không được cộng vào IP tháng");
assert.equal(kpi05ReplacesSameAgentMonth.monthly[0].totalFyc, 27_000_000);

const kpi05RecurringByMonth = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-04", { reward_source: "kpi05", fyp: 20_272_476.3, fyc: 5_800_283.2, ip: 18_081_915, raw_data: { application_nos: ["10000016619993", "10000017728630"] } }),
    kpi("2026-05", { reward_source: "kpi05", fyp: 40_746_145.3, fyc: 11_329_699.6, ip: 38_555_584, raw_data: { application_nos: ["10000016619993", "10000017827130", "10000017847594"] } }),
    kpi("2026-06", { reward_source: "kpi05", fyp: 133_250_361.3, fyc: 38_915_181.5, ip: 130_459_800, raw_data: { application_nos: ["10000016122459", "10000016619993", "10000017968925"] } })
  ],
  bc02: []
});
assert.equal(Math.round(kpi05RecurringByMonth.monthly[0].totalFyc), 38_915_182);
assert.equal(kpi05RecurringByMonth.monthly[0].ip, 0);
assert.equal(Math.round(kpi05RecurringByMonth.monthly[0].reward), 0);
assert.equal(Math.round(kpi05RecurringByMonth.quarterly[0].fyp), 194_268_983);
assert.equal(Math.round(kpi05RecurringByMonth.quarterly[0].totalFyc), 56_045_164);
assert.equal(Math.round(kpi05RecurringByMonth.quarterly[0].reward), 8_406_775);

const newAdvisorQuarter = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-04", { fyp: 233_280_750 / 3, fyc: 68_578_887 / 3 }),
    kpi("2026-05", { fyp: 233_280_750 / 3, fyc: 68_578_887 / 3 }),
    kpi("2026-06", { fyp: 233_280_750 / 3, fyc: 68_578_887 / 3 })
  ],
  bc02: [],
  advisorProfiles: [{ advisor_code: "A01", start_date: "2026-04-13" }]
});
assert.equal(Math.round(newAdvisorQuarter.quarterly[0].qualificationFyp ?? 0), 233_280_750);
assert.equal(newAdvisorQuarter.quarterly[0].rate, 0.15);
assert.equal(Math.round(newAdvisorQuarter.quarterly[0].reward), 10_286_833);

const issueDateWins = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-05", { ip: 3_000_000, raw_data: { application_nos: ["PREV"], "Ngày phát hành": "20/05/2026" } }),
    kpi("2026-05", { raw_data: { application_nos: ["ISSUE-JUNE"], "Ngày hiệu lực": "18/05/2026", "Ngày phát hành": "24/06/2026" } })
  ],
  bc02: []
});
assert.equal(issueDateWins.rewardMonthContracts.some((row: any) => row.raw_data.application_nos.includes("ISSUE-JUNE")), true);

const initialKpi05Duplicate = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-05", { ip: 3_000_000, raw_data: { application_nos: ["PREV"] } }),
    kpi("2026-06", { raw_data: { application_nos: ["SAME"] } }),
    kpi("2026-06", { reward_source: "kpi05", ip: 0, fyp: 12_000_000, fyc: 3_000_000, raw_data: { application_nos: ["SAME"] } })
  ], bc02: []
});
assert.equal(initialKpi05Duplicate.rewardMonthContracts.filter((row: any) => row.raw_data.application_nos.includes("SAME")).length, 1);

const issuedBc02 = calculatePolicyRewards({
  selectedMonth: "2026-06", kpi04: [],
  bc02: [bc02("2026-06-10", "ISSUED-BC02", { issued_date: "2026-06-12" })]
});
assert.equal(issuedBc02.rewardMonthContracts.length, 0);

const excludedContracts = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-06", { agent_code: "D1021A1YNG", agent_name: "Lê Thị Mỹ Châu", raw_data: { application_nos: ["MYCHAU"] } }),
    kpi("2026-06", { raw_data: { application_nos: ["BANCA"], channel: "Banca" } })
  ],
  bc02: [bc02("2026-06-10", "BANCA", { channel_name: "Banca" })]
});
assert.equal(excludedContracts.rewardMonthContracts.length, 0);

const ngocDuyen = calculatePolicyRewards({
  selectedMonth: "2026-06",
  kpi04: [
    kpi("2026-05", { agent_code: "D102143412", agent_name: "Nguyễn Thị Ngọc Duyên", ip: 3_000_000, fyc: 0, fyp: 3_000_000, raw_data: { application_nos: ["PREV-DUYEN"] } }),
    kpi("2026-06", { agent_code: "D102143412", agent_name: "Nguyễn Thị Ngọc Duyên", ip: 20_987_430, fyp: 20_987_430, fyc: 5_030_054, raw_data: { application_nos: ["10000017966953"], "Ngày phát hành": "24/06/2026" } }),
    kpi("2026-06", { reward_source: "kpi05", agent_code: "D102143412", agent_name: "Nguyễn Thị Ngọc Duyên", ip: 0, fyp: 25_088_885, fyc: 7_181_517.1, raw_data: { application_nos: ["10000017072092"] } })
  ], bc02: []
});
assert.equal(ngocDuyen.monthly[0].ip, 20_987_430);
assert.equal(ngocDuyen.monthly[0].rate, 0.1);
assert.equal(ngocDuyen.monthly[0].reward, 1_221_157);

console.log("TVV policy reward tests passed.");
