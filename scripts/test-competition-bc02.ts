import assert from "node:assert/strict";
import { parseRevenueCsv } from "../lib/csv";
import { calculateCompetitionReward } from "../src/lib/competition/competitionRuleEngine";

const header = [
  "SỐ GYC",
  "TÌNH TRẠNG HỒ SƠ",
  "NGÀY THU",
  "NGÀY PHÁT HÀNH",
  "SẢN PHẨM CHÍNH",
  "TÊN TVV",
  "IP",
  "AFYP"
].join(",");

const csv = [
  "Unnamed: 0,Unnamed: 1,Unnamed: 2,Unnamed: 3,Unnamed: 4,Unnamed: 5,IP,AFYP",
  header,
  "A26004825867,Chờ kiểm tra YCBH,23/06/2026,,BV-NCUVL08,TVV A,22041500,22041500",
  "A26004839861,,23/06/2026,,BV-NCUVL08,TVV B,21982850,21982850"
].join("\n");

const parsed = parseRevenueCsv(csv, "2026-06");
assert.deepEqual(parsed.errors, []);

const result = calculateCompetitionReward({
  program_name: "An Thịnh Phúc Niên - Bùng nổ doanh số - Về đích vinh quang",
  start_date: "2026-06-23",
  end_date: "2026-06-23",
  issue_deadline: "2026-06-30",
  issue_date_optional: true,
  allow_pending_issue: true,
  allow_empty_status: true,
  included_statuses: [],
  excluded_statuses: ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực"],
  reward_rules: [{
    id: "pdt",
    reward_type: "reward_by_policy_pdt_table",
    target_type: "policy",
    reward_recipient_type: "Hợp đồng",
    spc_products: ["BV-NCUVL08"],
    pdt_reward_tiers: [{ min_pdt: 20_000_000, spc_reward: "10%", other_reward: "0%" }]
  }]
}, parsed.records);

assert.deepEqual(
  result.eligibleContracts.map((contract) => [contract.applicationNo, contract.rewardAmount]),
  [
    ["A26004825867", 2_204_150],
    ["A26004839861", 2_198_285]
  ]
);

console.log("BC02 competition regression test passed.");

const dateTierResult = calculateCompetitionReward({
  program_name: "Tăng tốc nhanh - Bứt phá mạnh",
  start_date: "2026-08-01",
  end_date: "2026-08-11",
  issue_deadline: "2026-08-25",
  allow_empty_status: true,
  reward_rules: [{
    reward_type: "reward_by_policy_pdt_table",
    target_type: "Hợp đồng",
    reward_recipient_type: "Hợp đồng",
    pdt_reward_tiers: [{ min_pdt: 40_000_000, early_reward: 2_800_000, late_reward: 2_400_000 }],
    date_reward_periods: [
      { start_date: "2026-08-01", end_date: "2026-08-06", reward_key: "early_reward" },
      { start_date: "2026-08-07", end_date: "2026-08-11", reward_key: "late_reward" }
    ]
  }]
}, [
  { gyc_no: "EARLY", paid_date: "2026-08-05", issued_date: "2026-08-20", tvv: "TVV A", ip: 40_000_000, status: "Có hiệu lực" },
  { gyc_no: "LATE", paid_date: "2026-08-09", issued_date: "2026-08-20", tvv: "TVV A", ip: 40_000_000, status: "Có hiệu lực" }
]);

assert.deepEqual(
  dateTierResult.eligibleContracts.map((contract) => [contract.applicationNo, contract.rewardAmount]),
  [["EARLY", 2_800_000], ["LATE", 2_400_000]]
);

console.log("Date-tier competition regression test passed.");
