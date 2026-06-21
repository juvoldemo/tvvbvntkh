import * as XLSX from "xlsx";

export type StarVietSource = "kpi04" | "bc02";

export type StarVietRecord = {
  data_year: number;
  source: StarVietSource;
  agent_name: string;
  group_name: string | null;
  afyp: number;
  policy_status?: string | null;
  raw_data?: Record<string, unknown>;
};

export type StarVietParseResult = {
  records: StarVietRecord[];
  preview: StarVietRecord[];
  errors: Array<{ row?: number; message: string }>;
  totalAfyp: number;
};

type ParserConfig = {
  source: StarVietSource;
  agentAliases: string[];
  groupAliases: string[];
  fallbackGroupAliases: string[];
  statusAliases?: string[];
  valueAliases: string[];
  valueLabel: string;
};

const DEFAULT_GROUP_NAME = "Chưa có nhóm";
const AFYP_COLUMN_ALIASES = ["afyp"];
const FYP_COLUMN_ALIASES = ["fyp"];
const TOPUP_COLUMN_ALIASES = ["phi dong them", "phi dong them ngay"];
// Chương trình nhân đôi xét ngày hiệu lực hợp đồng, không xét ngày phát hành.
const KPI04_CONTRACT_DATE_COLUMN_ALIASES = ["ngay hieu luc"];
const DOUBLE_BONUS_START = new Date(2026, 2, 5);
const DOUBLE_BONUS_END = new Date(2026, 2, 26);
const DOUBLE_BONUS_CAP = 200_000_000;
const TOPUP_BONUS_RATE = 0.1;

const EXCLUDED_BC02_STATUSES = new Set([
  "hoan phi",
  "het hieu luc",
  "ycbh het hieu luc",
  "tu choi",
  "tri hoan"
]);

const STAR_VIET_LEVELS = [
  { key: "none", rank: "Chưa đạt", tickets: 0, threshold: 0, tone: "none" },
  { key: "gold_1", rank: "Hạng Vàng", tickets: 1, threshold: 550_000_000, tone: "gold" },
  { key: "platinum_1", rank: "Hạng Bạch Kim", tickets: 1, threshold: 900_000_000, tone: "platinum" },
  { key: "platinum_2", rank: "Hạng Bạch Kim", tickets: 2, threshold: 1_400_000_000, tone: "platinum" },
  { key: "diamond_1", rank: "Hạng Kim Cương", tickets: 1, threshold: 1_600_000_000, tone: "diamond" },
  { key: "diamond_2", rank: "Hạng Kim Cương", tickets: 2, threshold: 3_000_000_000, tone: "diamond" }
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const moneyText = text.replace(/[^\d,.-]/g, "");
  const lastComma = moneyText.lastIndexOf(",");
  const lastDot = moneyText.lastIndexOf(".");
  const decimalSeparator = lastComma >= 0 && lastDot >= 0
    ? (lastComma > lastDot ? "," : ".")
    : "";
  const normalized = decimalSeparator
    ? moneyText
      .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
      .replace(decimalSeparator, ".")
    : moneyText.replace(/[,.](?=\d{3}(\D|$))/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function matchesAlias(header: unknown, aliases: string[]) {
  const normalized = normalizeText(header);
  return aliases.some((alias) => normalized === alias || normalized.includes(alias));
}

function columnIndex(headers: unknown[], aliases: string[]) {
  return headers.findIndex((header) => matchesAlias(header, aliases));
}

function sheetRowsFromFile(buffer: ArrayBuffer, fileName: string) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    // Preserve source values. In particular, do not reinterpret dd-mm-yyyy text
    // as the US mm-dd-yyyy format during CSV imports.
    raw: true,
    cellDates: false
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
}

function buildTwoRowHeaders(rows: unknown[][]) {
  const measureRow = rows[0] ?? [];
  const infoRow = rows[1] ?? [];
  const width = Math.max(measureRow.length, infoRow.length);

  return Array.from({ length: width }, (_, index) => {
    const infoHeader = normalizeText(infoRow[index]);
    const measureHeader = normalizeText(measureRow[index]);
    return infoHeader || measureHeader || `column_${index}`;
  });
}

function missingColumnMessage(source: StarVietSource, headers: unknown[], missing: string[]) {
  const actualColumns = headers.map((header) => normalizeText(header)).filter(Boolean);
  return [
    `File đang lỗi: ${source.toUpperCase()}.`,
    `Đang thiếu: ${missing.join(", ")}.`,
    `Danh sách cột thực tế sau chuẩn hóa: ${actualColumns.length ? actualColumns.join(", ") : "(trống)"}.`,
    "Gợi ý: file này có thể khác format, hãy kiểm tra parser tương ứng."
  ].join(" ");
}

function isBc02Counted(status: unknown) {
  return !EXCLUDED_BC02_STATUSES.has(normalizeText(status));
}

function firstValue(row: unknown[], headers: string[], aliases: string[]) {
  for (const alias of aliases) {
    const index = columnIndex(headers, [alias]);
    const value = index >= 0 ? String(row[index] ?? "").trim() : "";
    if (value) return value;
  }
  return "";
}

function parseSaoVietRows(buffer: ArrayBuffer, fileName: string, year: number, config: ParserConfig): StarVietParseResult {
  const rawRows = sheetRowsFromFile(buffer, fileName);
  const errors: StarVietParseResult["errors"] = [];

  if (rawRows.length < 3) {
    return {
      records: [],
      preview: [],
      errors: [{ message: missingColumnMessage(config.source, [], ["2 dòng header và ít nhất 1 dòng dữ liệu"]) }],
      totalAfyp: 0
    };
  }

  const headers = buildTwoRowHeaders(rawRows);
  const agentIndex = columnIndex(headers, config.agentAliases);
  const valueIndex = columnIndex(headers, config.valueAliases);
  const statusIndex = config.statusAliases ? columnIndex(headers, config.statusAliases) : -1;
  const missing = [
    agentIndex < 0 ? "tên TVV" : "",
    valueIndex < 0 ? config.valueLabel : "",
    config.statusAliases && statusIndex < 0 ? "trạng thái hồ sơ" : ""
  ].filter(Boolean);

  if (missing.length) {
    return {
      records: [],
      preview: [],
      errors: [{ message: missingColumnMessage(config.source, headers, missing) }],
      totalAfyp: 0
    };
  }

  const records: StarVietRecord[] = [];
  rawRows.slice(2).forEach((row, offset) => {
    const rowNumber = offset + 3;
    const agentName = firstValue(row, headers, config.agentAliases);
    const groupName = firstValue(row, headers, [...config.groupAliases, ...config.fallbackGroupAliases]) || DEFAULT_GROUP_NAME;
    const value = parseMoney(row[valueIndex]);
    const status = statusIndex >= 0 ? String(row[statusIndex] ?? "").trim() : "";

    if (!agentName && value === 0 && !status) return;
    if (!agentName) {
      errors.push({ row: rowNumber, message: `File đang lỗi: ${config.source.toUpperCase()}. Đang thiếu: tên TVV.` });
      return;
    }
    if (config.source === "bc02" && !status) {
      errors.push({ row: rowNumber, message: "File đang lỗi: BC02. Đang thiếu: trạng thái hồ sơ." });
      return;
    }
    if (config.source === "bc02" && !isBc02Counted(status)) return;

    const rawData = Object.fromEntries(headers.map((header, index) => [String(header || `column_${index}`), row[index] ?? ""]));
    records.push({
      data_year: year,
      source: config.source,
      agent_name: agentName,
      group_name: groupName,
      afyp: config.source === "bc02" ? value : 0,
      policy_status: status || null,
      raw_data: rawData
    });
  });

  return {
    records,
    preview: records.slice(0, 10),
    errors,
    totalAfyp: records.reduce((sum, record) => sum + record.afyp, 0)
  };
}

export function parseSaoVietKPI04(buffer: ArrayBuffer, fileName: string, year: number): StarVietParseResult {
  return parseSaoVietRows(buffer, fileName, year, {
    source: "kpi04",
    agentAliases: ["ten tvv hoat dong", "ten dai ly"],
    groupAliases: ["ten nhom"],
    fallbackGroupAliases: ["ten ban", "phong gd tvv hoat dong", "phong kinh doanh"],
    valueAliases: FYP_COLUMN_ALIASES,
    valueLabel: "cột FYP để tính Sao Việt"
  });
}

export function parseSaoVietBC02(buffer: ArrayBuffer, fileName: string, year: number): StarVietParseResult {
  return parseSaoVietRows(buffer, fileName, year, {
    source: "bc02",
    agentAliases: ["ten dai ly"],
    groupAliases: ["ten nhom"],
    fallbackGroupAliases: ["ten ban"],
    statusAliases: ["tinh trang ho so"],
    valueAliases: AFYP_COLUMN_ALIASES,
    valueLabel: "cột AFYP"
  });
}

export function parseStarVietFile(buffer: ArrayBuffer, fileName: string, source: StarVietSource, year: number): StarVietParseResult {
  return source === "kpi04"
    ? parseSaoVietKPI04(buffer, fileName, year)
    : parseSaoVietBC02(buffer, fileName, year);
}

function currentLevel(totalAfyp: number) {
  return [...STAR_VIET_LEVELS].reverse().find((level) => totalAfyp >= level.threshold) ?? STAR_VIET_LEVELS[0];
}

function nextLevel(totalAfyp: number) {
  return STAR_VIET_LEVELS.find((level) => level.threshold > totalAfyp) ?? null;
}

function rawValue(record: StarVietRecord, aliases: string[]) {
  const rawData = record.raw_data ?? {};
  for (const [key, value] of Object.entries(rawData)) {
    if (matchesAlias(key, aliases)) return value;
  }
  return "";
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const viMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (viMatch) {
    const year = Number(viMatch[3].length === 2 ? `20${viMatch[3]}` : viMatch[3]);
    const date = new Date(year, Number(viMatch[2]) - 1, Number(viMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function isDateInDoubleBonusPeriod(value: unknown) {
  const date = parseDateValue(value);
  return !!date && date >= DOUBLE_BONUS_START && date <= DOUBLE_BONUS_END;
}

function getKpi04Fyp(record: StarVietRecord) {
  return parseMoney(rawValue(record, FYP_COLUMN_ALIASES));
}

function competitionMultiplier(competitionFyp: number) {
  if (competitionFyp >= 50_000_000) return 2;
  if (competitionFyp >= 30_000_000) return 1.5;
  return 1;
}

export function calculateTopupBonus(records: StarVietRecord[]) {
  const topupAmount = records.reduce((sum, record) => sum + parseMoney(rawValue(record, TOPUP_COLUMN_ALIASES)), 0);
  return topupAmount * TOPUP_BONUS_RATE;
}

export function calculateTotalSaoVietAfyp(records: StarVietRecord[]) {
  const kpi04Items = records.filter((record) => record.source === "kpi04");
  const bc02Afyp = records.filter((record) => record.source === "bc02").reduce((sum, record) => sum + Number(record.afyp || 0), 0);
  const competitionFyp = kpi04Items.reduce((sum, record) => isDateInDoubleBonusPeriod(rawValue(record, KPI04_CONTRACT_DATE_COLUMN_ALIASES)) ? sum + getKpi04Fyp(record) : sum, 0);
  const kpi04FypTotal = kpi04Items.reduce((sum, record) => sum + getKpi04Fyp(record), 0);
  const doubledBonus = Math.min(competitionFyp * (competitionMultiplier(competitionFyp) - 1), DOUBLE_BONUS_CAP);
  return kpi04FypTotal + doubledBonus + bc02Afyp + calculateTopupBonus(records);
}

export function buildStarVietReport(records: StarVietRecord[]) {
  const grouped = new Map<string, StarVietRecord[]>();
  records.forEach((record) => {
    const key = normalizeText(record.agent_name);
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  const rows = [...grouped.values()]
    .map((items) => {
      const bc02Items = items.filter((item) => item.source === "bc02");
      const kpi04Items = items.filter((item) => item.source === "kpi04");
      const kpi04Fyp = kpi04Items.reduce((sum, item) => sum + getKpi04Fyp(item), 0);
      const competitionFyp = kpi04Items.reduce((sum, item) => isDateInDoubleBonusPeriod(rawValue(item, KPI04_CONTRACT_DATE_COLUMN_ALIASES)) ? sum + getKpi04Fyp(item) : sum, 0);
      const competitionFactor = competitionMultiplier(competitionFyp);
      const doubleBonusAfyp = Math.min(competitionFyp * (competitionFactor - 1), DOUBLE_BONUS_CAP);
      const kpi04SaoVietFyp = kpi04Fyp + doubleBonusAfyp;
      const bc02Afyp = bc02Items.reduce((sum, item) => sum + Number(item.afyp || 0), 0);
      const topupBonusAfyp = calculateTopupBonus(items);
      const totalAfyp = kpi04SaoVietFyp + bc02Afyp + topupBonusAfyp;
      const level = currentLevel(totalAfyp);
      const next = nextLevel(totalAfyp);
      const nextThreshold = next?.threshold ?? totalAfyp;
      const progress = next ? Math.min(100, (totalAfyp / next.threshold) * 100) : 100;
      return {
        agentName: items[0]?.agent_name ?? "",
        groupName: bc02Items.find((item) => item.group_name)?.group_name ?? items.find((item) => item.group_name)?.group_name ?? "",
        kpi04Afyp: kpi04SaoVietFyp,
        kpi04Fyp,
        competitionFyp,
        competitionFactor,
        kpi04SaoVietFyp,
        bc02Afyp,
        doubleBonusAfyp,
        topupBonusAfyp,
        totalAfyp,
        currentRank: level.rank,
        currentTickets: level.tickets,
        rankTone: level.tone,
        nextRank: next ? `${next.rank} ${String(next.tickets).padStart(2, "0")} vé` : "Đã đạt mốc cao nhất",
        nextThreshold,
        remainingToNext: next ? Math.max(next.threshold - totalAfyp, 0) : 0,
        progress
      };
    })
    .sort((a, b) => b.totalAfyp - a.totalAfyp)
    .map((row, index) => ({ rank: index + 1, ...row }));

  return {
    rows,
    summary: {
      totalAgents: rows.length,
      achievedAgents: rows.filter((row) => row.totalAfyp >= 550_000_000).length,
      totalAfyp: rows.reduce((sum, row) => sum + row.totalAfyp, 0),
      nearNextAgents: rows.filter((row) => row.remainingToNext > 0 && row.remainingToNext < 100_000_000).length
    },
    options: {
      groups: [...new Set(rows.map((row) => row.groupName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
      ranks: ["Chưa đạt", "Hạng Vàng", "Hạng Bạch Kim", "Hạng Kim Cương"]
    }
  };
}
