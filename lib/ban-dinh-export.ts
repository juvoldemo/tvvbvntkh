import ExcelJS from "exceljs";
import { BanDinhReport } from "./ban-dinh";

const navy = "004B7A", blue = "005987", teal = "087F8C", pale = "EDF5FA", gold = "F2C45E", white = "FFFFFF", ink = "16334B";
const fill = (color: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } });

export function createBanDinhWorkbook(source: BanDinhReport[], exportedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BVNT Khánh Hòa"; workbook.created = exportedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const rows = source.map(row => ({ ...row, groupName: row.groupName?.trim() || "Chưa có nhóm" }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, "vi") || a.advisorName.localeCompare(b.advisorName, "vi") || a.advisorCode.localeCompare(b.advisorCode));
  const groups = new Map<string, { users: number; consultations: number; contracts: number }>();
  for (const row of rows) {
    const group = groups.get(row.groupName) || { users: 0, consultations: 0, contracts: 0 };
    group.users++; group.consultations += row.consultations; group.contracts += row.contracts;
    groups.set(row.groupName, group);
  }
  const totals = rows.reduce((sum, row) => ({ consultations: sum.consultations + row.consultations, contracts: sum.contracts + row.contracts }), { consultations: 0, contracts: 0 });

  function setup(name: string, title: string, widths: number[], headers: string[], accent: string) {
    const sheet = workbook.addWorksheet(name, { properties: { tabColor: { argb: `FF${accent}` }, defaultRowHeight: 24 }, views: [{ state: "normal", showGridLines: false }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:5" } });
    sheet.columns = widths.map(width => ({ width }));
    const last = String.fromCharCode(64 + widths.length);
    sheet.mergeCells(`A1:${last}1`); sheet.getRow(1).height = 36;
    const titleCell = sheet.getCell("A1"); titleCell.value = title; titleCell.fill = fill(navy); titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: `FF${white}` } }; titleCell.alignment = { vertical: "middle", indent: 1 };
    sheet.mergeCells(`A2:${last}2`); sheet.getRow(2).height = 26;
    const meta = sheet.getCell("A2"); meta.value = `BVNT Khánh Hòa   •   Xuất lúc ${exportedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}   •   Số liệu mới nhất đã lưu của từng TVV`;
    meta.font = { name: "Calibri", size: 10, color: { argb: "FF526A83" } }; meta.alignment = { vertical: "middle", indent: 1 };
    sheet.mergeCells(`A3:${last}3`); sheet.getRow(3).height = 32;
    const summary = sheet.getCell("A3"); summary.value = `${rows.length} TVV   |   ${groups.size} nhóm   |   ${totals.consultations.toLocaleString("vi-VN")} cuộc tư vấn   |   ${totals.contracts.toLocaleString("vi-VN")} hợp đồng mới`;
    summary.fill = fill(pale); summary.font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${blue}` } }; summary.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(4).height = 10;
    sheet.getRow(5).values = headers; sheet.getRow(5).height = 38;
    sheet.getRow(5).eachCell(cell => { cell.fill = fill(accent); cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${white}` } }; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; cell.border = { bottom: { style: "medium", color: { argb: `FF${gold}` } } }; });
    sheet.headerFooter.oddFooter = "&LBán đỉnh 3.0&RTrang &P / &N";
    return sheet;
  }
  const tvv = setup("TVV", "BÁN ĐỈNH 3.0  |  THỐNG KÊ TVV", [8, 30, 20, 32, 25, 27], ["STT", "Họ và tên", "Mã TVV", "Nhóm", "Số cuộc tư vấn cá nhân", "Số hợp đồng khai thác mới"], blue);
  rows.forEach((row, index) => tvv.addRow([index + 1, row.advisorName, row.advisorCode, row.groupName, row.consultations, row.contracts]));
  const groupSheet = setup("Nhóm", "BÁN ĐỈNH 3.0  |  THỐNG KÊ THEO NHÓM", [8, 42, 15, 28, 30], ["STT", "Nhóm", "Số TVV", "Số cuộc tư vấn cá nhân", "Số hợp đồng khai thác mới"], teal);
  const groupRows = [...groups].sort((a, b) => b[1].consultations - a[1].consultations || a[0].localeCompare(b[0], "vi"));
  const end = 5 + rows.length;
  groupRows.forEach(([name, group], index) => {
    const row = 6 + index;
    // Escape Excel criteria wildcards so literal group names aggregate correctly.
    const criterion = '"="&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(B' + row + ',"~","~~"),"*","~*"),"?","~?")';
    groupSheet.addRow([index + 1, name,
      { formula: `COUNTIFS('TVV'!$D$6:$D$${end},${criterion})`, result: group.users },
      { formula: `SUMIFS('TVV'!$E$6:$E$${end},'TVV'!$D$6:$D$${end},${criterion})`, result: group.consultations },
      { formula: `SUMIFS('TVV'!$F$6:$F$${end},'TVV'!$D$6:$D$${end},${criterion})`, result: group.contracts }]);
  });
  function finish(sheet: ExcelJS.Worksheet, count: number, numericColumns: number[]) {
    const cols = sheet.columnCount;
    for (let row = 6; row < 6 + count; row++) {
      sheet.getRow(row).height = 30;
      for (let col = 1; col <= cols; col++) {
        const cell = sheet.getCell(row, col);
        cell.font = { name: "Calibri", size: 11, color: { argb: `FF${ink}` } };
        cell.fill = fill(row % 2 ? pale : white);
        cell.alignment = { vertical: "middle", horizontal: col === 1 ? "center" : numericColumns.includes(col) ? "right" : "left", wrapText: true, indent: col > 1 ? 1 : 0 };
        cell.border = { bottom: { style: "hair", color: { argb: "FFDCE8F1" } } };
        if (numericColumns.includes(col)) cell.numFmt = "#,##0";
        if (sheet.name === "TVV" && col === 3) cell.numFmt = "@";
      }
    }
    if (!count) { sheet.mergeCells(6, 1, 6, cols); sheet.getCell(6, 1).value = "Chưa có TVV lưu số liệu"; sheet.getRow(6).height = 28; }
    else sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + count, column: cols } };
    const totalRow = 6 + Math.max(1, count);
    sheet.mergeCells(totalRow, 1, totalRow, numericColumns[0] - 1);
    sheet.getCell(totalRow, 1).value = "TỔNG CỘNG";
    for (const col of numericColumns) {
      const letter = String.fromCharCode(64 + col);
      const total = count ? Array.from({ length: count }, (_, index) => Number(sheet.getCell(6 + index, col).result ?? sheet.getCell(6 + index, col).value)).reduce((a, b) => a + b, 0) : 0;
      sheet.getCell(totalRow, col).value = count ? { formula: `SUM(${letter}6:${letter}${5 + count})`, result: total } : 0;
      sheet.getCell(totalRow, col).numFmt = "#,##0";
    }
    sheet.getRow(totalRow).height = 30;
    for (let col = 1; col <= cols; col++) { const cell = sheet.getCell(totalRow, col); cell.fill = fill(navy); cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${white}` } }; cell.alignment = { vertical: "middle", horizontal: numericColumns.includes(col) ? "right" : "left", indent: 1 }; }
    sheet.pageSetup.printArea = `A1:${String.fromCharCode(64 + cols)}${totalRow}`;
  }
  finish(tvv, rows.length, [5, 6]); finish(groupSheet, groupRows.length, [3, 4, 5]);
  return workbook;
}
