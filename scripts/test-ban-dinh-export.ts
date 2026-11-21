import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import ExcelJS from "exceljs";
import { createBanDinhWorkbook } from "../lib/ban-dinh-export";

async function main() {
  const rows = [
    { advisorCode: "001", advisorName: "Nguyễn Văn An", groupName: "Nhóm A", consultations: 5, contracts: 10, updatedAt: new Date().toISOString() },
    { advisorCode: "002", advisorName: "Trần Thị Bình", groupName: "Nhóm A", consultations: 7, contracts: 2, updatedAt: new Date().toISOString() },
    { advisorCode: "003", advisorName: "Lê Văn Cường", groupName: "Nhóm *?", consultations: 0, contracts: 3, updatedAt: new Date().toISOString() },
    { advisorCode: "004", advisorName: "Đặng Thị Duyên", groupName: "", consultations: 1, contracts: 0, updatedAt: new Date().toISOString() }
  ];
  const workbook = createBanDinhWorkbook(rows);
  await mkdir("outputs/ban-dinh-export", { recursive: true });
  const path = "outputs/ban-dinh-export/ban-dinh-3.0-test.xlsx";
  await workbook.xlsx.writeFile(path);
  const saved = new ExcelJS.Workbook(); await saved.xlsx.readFile(path);
  assert.deepEqual(saved.worksheets.map(sheet => sheet.name), ["TVV", "Nhóm"]);
  const tvv = saved.getWorksheet("TVV")!, groups = saved.getWorksheet("Nhóm")!;
  assert.equal(tvv.getCell("C6").type, ExcelJS.ValueType.String);
  assert.equal(tvv.getCell("C6").value, "004"); assert.equal(tvv.getCell("C6").numFmt, "@");
  assert.equal(tvv.getCell("E10").result, 13); assert.equal(tvv.getCell("F10").result, 15);
  assert.equal(groups.getCell("C9").result, 4); assert.equal(groups.getCell("D9").result, 13); assert.equal(groups.getCell("E9").result, 15);
  assert.equal(groups.getCell("B6").value, "Nhóm A"); assert.equal(groups.getCell("C6").result, 2);
  assert.ok(String(groups.getCell("D6").formula).startsWith("SUMIFS("));
  assert.equal(tvv.getRow(5).height, 38); assert.ok(tvv.autoFilter);
  for (const sheet of saved.worksheets) {
    assert.equal(sheet.views[0].state, "normal");
    assert.equal(sheet.views[0].showGridLines, false);
    assert.ok(!("xSplit" in sheet.views[0]) && !("ySplit" in sheet.views[0]), "No pane divider should appear in Excel");
  }
  assert.equal(tvv.getCell("E6").numFmt, "#,##0");
  const empty = createBanDinhWorkbook([]); const emptySaved = new ExcelJS.Workbook();
  await emptySaved.xlsx.load(await empty.xlsx.writeBuffer());
  assert.equal(emptySaved.getWorksheet("TVV")!.getCell("E7").value, 0);
  assert.equal(emptySaved.getWorksheet("Nhóm")!.getCell("D7").value, 0);
  console.log(`Export passed: two sheets, group rollups, cached formulas, zero values, leading-zero codes, styles, filters, no pane dividers and empty results. ${path}`);
}
void main();
