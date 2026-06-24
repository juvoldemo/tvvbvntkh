import Papa from "papaparse";
import { findAdsByBanGroup, findAdsMasterName, getAdsPlan, normalizeAdsName, resolveAdsName } from "./ads-plan";
import { parseDateValue, parseMoney, toMonthStart } from "./format";
import type { ParsedRevenueCsv, RevenueRecord, ValidationError } from "./types";

const IMPORTANT_COLUMNS: Record<string, keyof RevenueRecord> = {
  "TÊN BAN": "ban_name",
  "TÊN NHÓM": "group_name",
  "M� TVV": "agent_code",
  "MÃ ĐL": "agent_code",
  "MÃ ĐẠI LÝ": "agent_code",
  "MÃ TƯ VẤN VIÊN": "agent_code",
  "TVV": "agent_name",
  "ĐẠI LÝ": "agent_name",
  "TÊN TVV": "agent_name",
  "TÊN ĐẠI LÝ": "agent_name",
  "HỌ TÊN TVV": "agent_name",
  "HỌ TÊN ĐẠI LÝ": "agent_name",
  "SỐ GYC": "application_no",
  "SỐ HỢP ĐỒNG": "contract_no",
  "TÌNH TRẠNG HỒ SƠ": "policy_status",
  "NGÀY THU": "paid_date",
  "NGÀY CẬP NHẬT": "updated_date",
  "NGÀY PHÁT HÀNH": "issued_date",
  "BÊN MUA BẢO HIỂM (BMBH)": "policy_owner",
  "NGƯỜI ĐƯỢC BẢO HIỂM": "insured_name",
  "M� ADS": "ads_code",
  "CODE ADS": "ads_code",
  "ADS CODE": "ads_code",
  ADS: "ads_name",
  "TÊN ADS": "ads_name",
  "HỌ TÊN ADS": "ads_name",
  IP: "ip",
  AFYP: "afyp"
};

const REQUIRED_KEYS: Array<keyof RevenueRecord> = [
  "agent_name",
  "paid_date",
  "ip",
  "afyp"
];

const DEFAULT_BAN_NAME = "Banca";

/**
 * Excel exports in Vietnam are commonly Windows-1258, while File.text() always
 * assumes UTF-8 and permanently turns invalid bytes into U+FFFD. Decode bytes
 * before parsing so names such as "Tâm Phát Lộc" reach the database intact.
 */
export function decodeRevenueCsv(bytes: ArrayBuffer) {
  const raw = new Uint8Array(bytes);
  const startsWith = (...prefix: number[]) => prefix.every((byte, index) => raw[index] === byte);
  if (startsWith(0xff, 0xfe)) return new TextDecoder("utf-16le").decode(raw);
  if (startsWith(0xfe, 0xff)) return new TextDecoder("utf-16be").decode(raw);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder("windows-1258").decode(raw);
  }
}
function isAgentCodeLike(value: unknown) {
  return /^D\d+/i.test(String(value ?? "").trim());
}

function isAdsCodeLike(value: unknown) {
  return /^L\d+/i.test(String(value ?? "").trim());
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function canonicalHeader(value: unknown) {
  return normalizeHeader(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "D");
}

const CANONICAL_IMPORTANT_COLUMNS = new Map(
  Object.entries(IMPORTANT_COLUMNS).map(([header, key]) => [canonicalHeader(header), key])
);

[
  ["SỐ GYC", "application_no"],
  ["TÌNH TRẠNG HỒ SƠ", "policy_status"],
  ["NGÀY THU", "paid_date"],
  ["NGÀY CẬP NHẬT", "updated_date"],
  ["NGÀY PHÁT HÀNH", "issued_date"],
  ["TÊN BAN", "ban_name"],
  ["TÊN NHÓM", "group_name"],
  ["TÊN TVV", "agent_name"],
  ["MÃ TVV", "agent_code"],
  ["BÊN MUA BẢO HIỂM (BMBH)", "policy_owner"],
  ["NGƯỜI ĐƯỢC BẢO HIỂM", "insured_name"],
  ["IP", "ip"],
  ["AFYP", "afyp"]
].forEach(([header, key]) => CANONICAL_IMPORTANT_COLUMNS.set(canonicalHeader(header), key as keyof RevenueRecord));

function mappedHeaderKey(header: string) {
  return IMPORTANT_COLUMNS[header] ?? CANONICAL_IMPORTANT_COLUMNS.get(canonicalHeader(header));
}

function isRealBc02Header(row: unknown[]) {
  const headers = new Set(row.map(canonicalHeader));
  return headers.has("SO GYC") && headers.has("NGAY THU") && headers.has("SAN PHAM CHINH");
}

function isUnnamedHeaderRow(row: unknown[]) {
  const nonEmpty = row.map((value) => String(value ?? "").trim()).filter(Boolean);
  return nonEmpty.length > 0 && nonEmpty.filter((value) => /^UNNAMED(?::\s*\d+)?$/i.test(value)).length >= Math.ceil(nonEmpty.length / 2);
}

function resolveHeaderLayout(rows: unknown[][]) {
  const promotedHeaderIndex = rows.findIndex((row, index) => index <= 2 && isRealBc02Header(row));
  if (promotedHeaderIndex >= 0) {
    const promotedRow = rows[promotedHeaderIndex] ?? [];
    const precedingRows = rows.slice(0, promotedHeaderIndex);
    const headers = promotedRow.map((value, columnIndex) => {
      const promotedHeader = normalizeHeader(value);
      const inheritedMeasureHeader = precedingRows
        .map((row) => normalizeHeader(row[columnIndex]))
        .find((header) => ["STBH", "PHÍ ĐÓNG THÊM", "PHÍ ĐỊNH KỲ", "IP", "AFYP"].includes(header));
      return inheritedMeasureHeader || promotedHeader;
    });
    return {
      headers,
      dataStartIndex: promotedHeaderIndex + 1
    };
  }
  return { headers: buildHeaders(rows), dataStartIndex: 2 };
}

function buildHeaders(rows: unknown[][]) {
  const measureRow = rows[0] ?? [];
  const infoRow = rows[1] ?? [];
  const headers = infoRow.map((value, index) => {
    const infoHeader = normalizeHeader(value);
    const measureHeader = normalizeHeader(measureRow[index]);
    if (["STBH", "PHÍ ĐÓNG THÊM", "PHÍ ĐỊNH KỲ", "IP", "AFYP"].includes(measureHeader)) {
      return measureHeader;
    }
    return infoHeader || measureHeader;
  });

  return headers;
}

function mapRow(headers: string[], row: unknown[], dataMonth: string, rowNumber: number) {
  const raw: Record<string, unknown> = {};
  const record: Partial<RevenueRecord> = {
    data_month: toMonthStart(dataMonth),
    ip: 0,
    afyp: 0
  };
  const errors: ValidationError[] = [];

  headers.forEach((header, index) => {
    raw[header || `column_${index}`] = row[index] ?? "";
    const key = mappedHeaderKey(header);
    if (!key) return;

    const value = row[index];
    if (key === "paid_date" || key === "updated_date" || key === "issued_date") {
      const parsed = parseDateValue(value);
      if (!parsed && key === "paid_date") errors.push({ row: rowNumber, field: key, message: "Ngày thu sai định dạng hoặc bị trống." });
      (record as Record<string, unknown>)[key] = parsed;
      return;
    }

    if (key === "ip" || key === "afyp") {
      const amount = parseMoney(value);
      if (amount === null) errors.push({ row: rowNumber, field: key, message: `${key.toUpperCase()} không phải số.` });
      (record as Record<string, unknown>)[key] = amount ?? 0;
      return;
    }

    const text = String(value ?? "").trim();
    if (key === "agent_name") {
      if (isAgentCodeLike(text)) {
        record.agent_code = record.agent_code || text;
      } else {
        record.agent_name = text || record.agent_name || undefined;
      }
      return;
    }

    if (key === "agent_code") {
      if (text && !isAgentCodeLike(text) && !record.agent_name) {
        record.agent_name = text;
      } else {
        record.agent_code = text || record.agent_code || undefined;
      }
      return;
    }

    if (key === "ads_name") {
      if (isAdsCodeLike(text)) {
        record.ads_code = record.ads_code || text;
      } else {
        record.ads_name = text || record.ads_name || null;
      }
      return;
    }

    if (key === "ads_code") {
      if (text && !isAdsCodeLike(text) && !record.ads_name) {
        record.ads_name = text;
      } else {
        record.ads_code = text || record.ads_code || null;
      }
      return;
    }

    (record as Record<string, unknown>)[key] = text || null;
  });

  if (isAgentCodeLike(record.agent_name)) {
    record.agent_code = record.agent_code || record.agent_name;
    record.agent_name = undefined;
  }

  if (isAdsCodeLike(record.ads_name)) {
    record.ads_code = record.ads_code || record.ads_name;
    record.ads_name = null;
  }

  record.ban_name = String(record.ban_name ?? "").trim() || DEFAULT_BAN_NAME;
  record.group_name = String(record.group_name ?? "").trim() || record.ban_name;

  const contractNo = String(record.contract_no ?? "").trim();
  if (contractNo) {
    record.contract_no = contractNo;
    record.contract_no_display = contractNo;
  } else if (String(record.application_no ?? "").trim()) {
    record.contract_no = String(record.application_no).trim();
    record.contract_no_display = record.contract_no;
  } else {
    record.contract_no = `Num-${rowNumber}`;
    record.contract_no_display = "Num";
  }

  const adsName = String(record.ads_name ?? "").trim();
  record.ads_name = resolveAdsName(adsName, record.ban_name, record.group_name) || null;

  record.raw_data = raw;

  REQUIRED_KEYS.forEach((key) => {
    const value = record[key];
    if (value === null || value === undefined || value === "") {
      errors.push({ row: rowNumber, field: key, message: `Thiếu dữ liệu bắt buộc: ${String(key)}.` });
    }
  });

  return { record: record as RevenueRecord, errors };
}

function buildAdsParseDebug(records: RevenueRecord[], month: string) {
  return records.map((record) => {
    const ads = String(record.ads_name ?? "").trim();
    const matchedAds = findAdsMasterName(ads) || findAdsByBanGroup(record.ban_name, record.group_name);
    return {
      ban: record.ban_name,
      nhom: record.group_name,
      ads,
      tvv: record.agent_name,
      adsNormalized: normalizeAdsName(ads),
      matchedAds,
      kpi: matchedAds ? getAdsPlan(matchedAds, month) : null
    };
  });
}

function buildAdsParseSummary(records: RevenueRecord[]) {
  const withoutAds = records.filter((record) => !String(record.ads_name ?? "").trim());
  return {
    totalRecords: records.length,
    recordsWithAds: records.length - withoutAds.length,
    recordsWithoutAds: withoutAds.length,
    missingGroups: [...new Set(withoutAds.map((record) => `${record.ban_name} / ${record.group_name}`))].sort()
  };
}

export function parseRevenueCsv(csvText: string, dataMonth: string): ParsedRevenueCsv {
  const parsed = Papa.parse<unknown[]>(csvText, {
    header: false,
    skipEmptyLines: true
  });
  const rows = parsed.data;
  const errors: ValidationError[] = [];

  if (parsed.errors.length) {
    parsed.errors.slice(0, 10).forEach((error) => errors.push({ message: error.message }));
  }

  if (rows.length < 2) {
    return { records: [], preview: [], errors: [{ message: "CSV phải có ít nhất 2 dòng header và 1 dòng dữ liệu." }], totalAfyp: 0, totalIp: 0 };
  }

  const { headers, dataStartIndex } = resolveHeaderLayout(rows);
  const availableKeys = new Set(headers.map(mappedHeaderKey).filter(Boolean));
  REQUIRED_KEYS.forEach((key) => {
    if (!availableKeys.has(key)) errors.push({ field: key, message: `Thiếu cột bắt buộc: ${String(key)}.` });
  });

  if (!headers.includes("IP") || !headers.includes("AFYP")) {
    errors.push({ message: "Không đọc được header đặc biệt của CSV cho IP/AFYP." });
  }

  const records: RevenueRecord[] = [];
  const contractRows = new Map<string, number>();

  rows.slice(dataStartIndex).forEach((row, index) => {
    const rowNumber = index + dataStartIndex + 1;
    const { record, errors: rowErrors } = mapRow(headers, row, dataMonth, rowNumber);
    records.push(record);
    errors.push(...rowErrors);

    if (record.contract_no) {
      const firstRow = contractRows.get(record.contract_no);
      if (firstRow) {
        errors.push({
          row: rowNumber,
          field: "contract_no",
          message: `Số hợp đồng bị trùng với dòng ${firstRow}: ${record.contract_no}.`
        });
      } else {
        contractRows.set(record.contract_no, rowNumber);
      }
    }
  });

  const adsDebugRows = buildAdsParseDebug(records, dataMonth);
  const adsSummary = buildAdsParseSummary(records);

  console.table(adsDebugRows.map(({ ban, nhom, ads, tvv, adsNormalized, matchedAds, kpi }) => ({
    ban,
    nhom,
    ads,
    tvv,
    adsNormalized,
    matchedAds,
    kpi
  })));
  console.log("[ADS parse summary]", adsSummary);

  return {
    records,
    preview: records.slice(0, 10),
    errors,
    totalAfyp: records.reduce((sum, record) => sum + (record.afyp || 0), 0),
    totalIp: records.reduce((sum, record) => sum + (record.ip || 0), 0),
    adsDebugRows,
    adsSummary
  };
}
