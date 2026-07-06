import assert from "node:assert/strict";
import { buildStarVietReport, competitionMultiplier, type StarVietRecord } from "../lib/star-viet";

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

console.log("Star Việt boundary tests passed.");
