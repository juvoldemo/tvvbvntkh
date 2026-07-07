import assert from "node:assert/strict";
import { buildGroupStarVietSummary, buildStarVietReport, competitionMultiplier, type StarVietRecord } from "../lib/star-viet";

assert.equal(competitionMultiplier(29_999_999), 1);
assert.equal(competitionMultiplier(30_000_000), 1.5);
assert.equal(competitionMultiplier(50_000_000), 2);

const kpi: StarVietRecord = {
  data_year: 2026,
  source: "kpi04",
  agent_name: "TVV Test",
  group_name: "Nhóm 1",
  afyp: 0,
  raw_data: { FYP: 250_000_000, "Ngày hiệu lực": "05/03/2026" }
};
assert.equal(buildStarVietReport([kpi]).rows[0].doubleBonusAfyp, 200_000_000);

const cancelledBeforeConsideration: StarVietRecord = {
  data_year: 2026,
  source: "kpi04",
  agent_name: "TVV Huy",
  group_name: "Nhom 1",
  afyp: 0,
  raw_data: { FYP: 100_000_000, "Ngay huy (truoc ngay huy can nhac)": "10/03/2026" }
};
assert.equal(buildStarVietReport([cancelledBeforeConsideration]).rows.length, 0);

const sameNameDifferentCodes = buildStarVietReport([
  { data_year: 2026, source: "kpi04", agent_name: "Nguyen Van A", group_name: "Nhom 1", afyp: 0, raw_data: { "Ma TVV hoat dong": "A001", FYP: 10_000_000 } },
  { data_year: 2026, source: "kpi04", agent_name: "Nguyen Van A", group_name: "Nhom 1", afyp: 0, raw_data: { "Ma TVV hoat dong": "A002", FYP: 20_000_000 } }
]);
assert.equal(sameNameDifferentCodes.rows.length, 2);

const levels = [
  [549_999_999, "Chưa đạt", 0],
  [550_000_000, "Hạng Vàng", 1],
  [900_000_000, "Hạng Bạch Kim", 1],
  [1_400_000_000, "Hạng Bạch Kim", 2],
  [1_600_000_000, "Hạng Kim Cương", 1],
  [3_000_000_000, "Hạng Kim Cương", 2]
] as const;

for (const [afyp, rank, tickets] of levels) {
  const row = buildStarVietReport([{
    data_year: 2026, source: "bc02", agent_name: "TVV Test", agent_code: "D001",
    group_name: "Nhóm 1", afyp, policy_status: "Đã phát hành"
  }]).rows[0];
  assert.equal(row.currentRank, rank);
  assert.equal(row.currentTickets, tickets);
}

const groupKpi04: StarVietRecord = {
  data_year: 2026,
  source: "kpi04",
  agent_name: "TVV Group",
  group_name: "Nhom KPI04",
  afyp: 0,
  raw_data: { FYP: 100_000_000, "Ngay hieu luc": "05/03/2026" }
};
const groupSummary = buildGroupStarVietSummary([groupKpi04], "Nhom KPI04", [
  { reward_source: "kpi05", group_name: "Nhom KPI04", fyp: 999_000_000 }
]);
assert.equal(groupSummary.totalAfyp, 150_000_000);

const displayGroupBeatsRawCode = buildGroupStarVietSummary([{
  data_year: 2026,
  source: "kpi04",
  agent_name: "TVV Raw Code",
  group_name: "Quyet Thang",
  afyp: 0,
  raw_data: { "Ten nhom": "U102101033", FYP: 2_028_566_958, "Ngay hieu luc": "27-04-2026" }
}], "Quyet Thang", [
  { reward_source: "kpi05", group_name: "Quyet Thang", fyp: 1_019_091_958 }
]);
assert.equal(displayGroupBeatsRawCode.totalAfyp, 2_028_566_958);

const fallbackSummary = buildGroupStarVietSummary([], "Nhom KPI05", [
  { reward_source: "kpi05", group_name: "Nhom KPI05", fyp: 123_000_000 }
]);
assert.equal(fallbackSummary.totalAfyp, 123_000_000);

console.log("Star Việt boundary tests passed.");
