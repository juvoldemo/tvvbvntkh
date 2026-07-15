import assert from "node:assert/strict";
import { buildStarVietGroupReport, buildStarVietReport, competitionMultiplier, type StarVietRecord } from "../lib/star-viet";

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
  raw_data: { "Ten nhom": "Nhom KPI04", FYP: 100_000_000, "Ngay hieu luc": "05/03/2026" }
};
const groupSummary = buildStarVietGroupReport([groupKpi04]).rows[0];
assert.equal(groupSummary.totalAfyp, 150_000_000);

const displayGroupBeatsRawCode = buildStarVietGroupReport([{
  data_year: 2026,
  source: "kpi04",
  agent_name: "TVV Raw Code",
  group_name: "Quyet Thang",
  afyp: 0,
  raw_data: { "Ten nhom": "U102101033", FYP: 2_028_566_958, "Ngay hieu luc": "27-04-2026" }
}]).rows[0];
assert.equal(displayGroupBeatsRawCode.totalAfyp, 2_028_566_958);

const fallbackSummary = buildStarVietGroupReport([
  { data_year: 2026, data_month: "2026-06-01", source: "kpi05_group", agent_name: "Nhom KPI05", group_name: "Nhom KPI05", afyp: 123_000_000 }
]).rows[0];
assert.equal(fallbackSummary.totalAfyp, 123_000_000);


const julyFallbackSummary = buildStarVietGroupReport([
  { data_year: 2026, data_month: "2026-06-01", source: "kpi05_group", agent_name: "Pham Thu", group_name: "Pham Thu", afyp: 2_000_000_000 },
  { data_year: 2026, data_month: "2026-07-01", source: "kpi05_group", agent_name: "Pham Thu", group_name: "Pham Thu", afyp: 300_000_000 }
]).rows[0];
assert.equal(julyFallbackSummary.totalAfyp, 2_300_000_000);
console.log("Star Việt boundary tests passed.");
