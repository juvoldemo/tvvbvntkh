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
