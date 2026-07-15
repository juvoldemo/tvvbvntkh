import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  buildStarVietGroupReport,
  buildStarVietReport,
  mergeStarVietKpi04AndBc02,
  parseSaoVietSnapshot,
  starVietBc02AfterSnapshot,
  type StarVietGroupInheritance,
  type StarVietRecord
} from "../lib/star-viet";
import { readAllPages } from "../lib/star-viet-data";

function workbookBuffer(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer;
}

const parsedAgent = parseSaoVietSnapshot(workbookBuffer([
  ["", "", "", "", ""],
  ["Nhóm", "Mã TVV", "Tên", "Chức vụ", "Tổng FYPKTM"],
  ["Nhóm A", "A001", "TVV A", "Tư vấn tài chính", 100_000_000]
]), "snapshot-agent.xlsx", "snapshot_agent", "2026-07-12");

assert.deepEqual(parsedAgent.errors, []);
assert.equal(parsedAgent.records.length, 1);
assert.equal(parsedAgent.totalAfyp, 100_000_000);

const bc02Records: StarVietRecord[] = [
  { data_year: 2026, data_month: "2026-07-01", source: "bc02", agent_code: "A001", agent_name: "TVV A", group_name: "Nhóm A", afyp: 10_000_000, raw_data: { paid_date: "2026-07-12" } },
  { data_year: 2026, data_month: "2026-07-01", source: "bc02", agent_code: "A001", agent_name: "TVV A", group_name: "Nhóm A", afyp: 20_000_000, raw_data: { paid_date: "2026-07-13" } }
];
const postSnapshotBc02 = starVietBc02AfterSnapshot(bc02Records, "2026-07-12");
assert.equal(postSnapshotBc02.length, 1);
assert.equal(buildStarVietReport([...parsedAgent.records, ...postSnapshotBc02]).rows[0].totalAfyp, 120_000_000);

const mergedWithoutDuplicate = mergeStarVietKpi04AndBc02([
  { data_year: 2026, source: "kpi04", agent_name: "TVV A", group_name: "Nhóm A", afyp: 30_000_000, raw_data: { application_no: "GYC001" } }
], [
  { data_year: 2026, source: "bc02", agent_name: "TVV A", group_name: "Nhóm A", afyp: 30_000_000, raw_data: { application_no: "GYC001", paid_date: "2026-07-13" } },
  { data_year: 2026, source: "bc02", agent_name: "TVV A", group_name: "Nhóm A", afyp: 40_000_000, raw_data: { application_no: "GYC002", paid_date: "2026-07-13" } }
]);
assert.equal(mergedWithoutDuplicate.filter((record) => record.source === "bc02").length, 1);

const groupRecords: StarVietRecord[] = [
  { data_year: 2026, data_month: "2026-07-12", source: "snapshot_group", agent_code: "P001", agent_name: "Trưởng nhóm cha", group_name: "Nhóm Cha", afyp: 100_000_000 },
  { data_year: 2026, data_month: "2026-07-12", source: "snapshot_group", agent_code: "C001", agent_name: "Trưởng nhóm con", group_name: "Nhóm Con", afyp: 40_000_000 },
  { data_year: 2026, data_month: "2026-07-01", source: "bc02", agent_name: "TVV Con", group_name: "Nhóm Con", afyp: 10_000_000, raw_data: { paid_date: "2026-07-13" } }
];
const inheritance: StarVietGroupInheritance[] = [{
  parentGroupName: "Nhóm Cha",
  parentAgentCode: "P001",
  childGroupName: "Nhóm Con",
  childAgentCode: "C001",
  rate: 0.5
}];
const groupReport = buildStarVietGroupReport(groupRecords, inheritance);
const parent = groupReport.rows.find((row) => row.groupName === "Nhóm Cha");
const child = groupReport.rows.find((row) => row.groupName === "Nhóm Con");
assert.equal(parent?.directAfyp, 100_000_000);
assert.equal(parent?.inheritedAfyp, 5_000_000);
assert.equal(parent?.totalAfyp, 105_000_000);
assert.equal(child?.totalAfyp, 50_000_000);

async function testPagination() {
  const source = Array.from({ length: 1_205 }, (_, id) => ({ id }));
  const rows = await readAllPages<{ id: number }>(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
  assert.equal(rows.length, 1_205);
  assert.equal(rows.at(-1)?.id, 1_204);
}

testPagination().then(() => console.log("Star Viet snapshot/cutoff/deduplication/inheritance/pagination regression tests passed."));
