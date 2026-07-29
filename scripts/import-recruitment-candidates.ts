import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

type RawRow = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizedKey(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function value(row: RawRow, expected: string) {
  const normalizedExpected = normalizedKey(expected);
  const key = Object.keys(row).find((item) => normalizedKey(item) === normalizedExpected);
  return key ? row[key] : "";
}

function firstValue(row: RawRow, expected: string[]) {
  for (const key of expected) {
    const found = value(row, key);
    if (text(found)) return found;
  }
  return "";
}

function excelDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = text(value);
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : raw.slice(0, 10);
}

const sourcePath = path.resolve(process.argv[2] || "C:/Users/Admin/Downloads/Danh sach de nghi thanh ly khong chuyen doi CC 01.07.2026.xlsx");
const outputPath = path.resolve(process.argv[3] || "data/recruitment-candidates.json");
const requestedSheetName = process.argv[4];
const workbook = XLSX.readFile(sourcePath);
const sheetName = requestedSheetName && workbook.SheetNames.includes(requestedSheetName)
  ? requestedSheetName
  : workbook.SheetNames.includes("Sheet1") ? "Sheet1" : workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
const headerIndex = rawRows.findIndex((row) => row.some((cell) => normalizedKey(cell) === normalizedKey("Mã TVV")));
const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { range: Math.max(0, headerIndex), defval: "" });

const candidates = rows.map((row) => {
  const advisorCode = text(value(row, "Mã TVV")).toUpperCase();
  const recruiterCode = text(value(row, "TVV tuyển dụng")).toUpperCase();
  const recruiterLabel = text(value(row, "Tên của TVV tuyển dụng"));
  const recruiterName = recruiterLabel
    .replace(new RegExp(`\\s*-\\s*${recruiterCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "")
    .trim();
  return {
    id: advisorCode,
    advisorCode,
    advisorName: text(value(row, "Tên TVV")),
    recruiterCode,
    recruiterName: recruiterName || recruiterLabel,
    startDate: excelDate(value(row, "Ngày bắt đầu làm việc")),
    status: text(value(row, "Trạng thái")),
    pdt2017To2025: Number(firstValue(row, ["PĐT từ 2017 đến 12/2025", "PDT từ 2017 đến 12/2025"])) || 0,
    inactiveMonths: Number(value(row, "Số tháng không hoạt động")) || 0,
    deposit: Number(value(row, "Ký quỹ (tại 27.06.2026)")) || 0,
    phone: text(value(row, "SĐT")),
    identityNo: text(value(row, "Số GTTT")),
    department: text(value(row, "Ban")),
    team: text(value(row, "Nhóm")) || text(value(row, "Ban")),
    address: text(value(row, "Địa chỉ"))
  };
}).filter((row) => row.advisorCode && row.advisorName);

const uniqueCandidates = [...new Map(candidates.map((row) => [row.advisorCode, row])).values()];
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(uniqueCandidates, null, 2)}\n`, "utf8");
process.stdout.write(`Đã nhập ${uniqueCandidates.length} TVV vào ${outputPath}\n`);
