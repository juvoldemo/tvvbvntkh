import * as XLSX from "xlsx";

export type StarVietSource = "kpi04" | "bc02" | "kpi05_group" | "snapshot_agent" | "snapshot_group";

export type StarVietSnapshotSource = Extract<StarVietSource, "snapshot_agent" | "snapshot_group">;

export type StarVietGroupInheritance = {
  parentGroupName: string;
  parentAgentCode?: string | null;
  childGroupName: string;
  childAgentCode?: string | null;
  rate: number;
};

export type StarVietRecord = {
  data_year: number;
  source: StarVietSource;
  data_month?: string | null;
  agent_code?: string | null;
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
  excludeDateAliases?: string[];
};

const DEFAULT_GROUP_NAME = "Chưa có nhóm";
export const STAR_VIET_GROUP_MONTHS = [
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11"
];
const AFYP_COLUMN_ALIASES = ["afyp"];
const FYP_COLUMN_ALIASES = ["fyp"];
const TOPUP_COLUMN_ALIASES = ["phi dong them", "phi dong them ngay"];
const AGENT_CODE_ALIASES = ["ma tvv hoat dong", "ma dai ly", "ma tvv", "ma dl", "agent code", "agent_code"];
const PRE_CONSIDERATION_CANCEL_DATE_ALIASES = ["ngay huy (truoc ngay huy can nhac)", "ngay huy truoc ngay huy can nhac"];
// Chương trình nhân đôi xét ngày hiệu lực hợp đồng, không xét ngày phát hành.
const KPI04_CONTRACT_DATE_COLUMN_ALIASES = ["ngay hieu luc"];
const DOUBLE_BONUS_START = new Date(2026, 2, 5);
const DOUBLE_BONUS_END = new Date(2026, 2, 26);
const TVV_DOUBLE_BONUS_CAP = 200_000_000;
const GROUP_LEADER_DOUBLE_BONUS_CAP = 400_000_000;
const BAN_LEADER_DOUBLE_BONUS_CAP = 800_000_000;
const TOPUP_BONUS_RATE = 0.1;
const STAR_VIET_APPLICATION_NO_ALIASES = ["giay yeu cau", "so giay yeu cau", "so gyc", "gyc", "application_no", "application no"];
const STAR_VIET_CONTRACT_NO_ALIASES = ["hop dong", "so hop dong", "so hd", "contract_no", "contract no", "policy_no", "policy no"];

// Mã trưởng nhóm là khóa chính để đối chiếu. Tên nhóm cha trong bảng nghiệp vụ
// đôi khi là tên Ban (ví dụ Hoàng Phát/Tâm Phát), nên chỉ dùng tên làm fallback.
export const STAR_VIET_GROUP_INHERITANCES: StarVietGroupInheritance[] = [
  { parentGroupName: "Nguyên Phát", parentAgentCode: "D102129306", childGroupName: "Hiệp Phát", childAgentCode: "D102141858", rate: 1 },
  { parentGroupName: "Hoàng Phát", parentAgentCode: "D102114757", childGroupName: "Bảo Việt Khánh Hòa", childAgentCode: "D102143449", rate: 1 },
  { parentGroupName: "Hồng Đức", parentAgentCode: "D1021A37H6", childGroupName: "Hồng Phát", childAgentCode: "D1021A3KRX", rate: 0.5 },
  { parentGroupName: "Sen Vàng", parentAgentCode: "D1021A3RSK", childGroupName: "Sao Mai", childAgentCode: "D246402676", rate: 0.5 },
  { parentGroupName: "Tâm Phát", parentAgentCode: "D1021A37H6", childGroupName: "Tâm Đức", childAgentCode: "D248679542", rate: 1 },
  { parentGroupName: "Khánh Hòa 2", parentAgentCode: "D1021A3RSK", childGroupName: "Ánh Dương", childAgentCode: "D251143802", rate: 1 },
  { parentGroupName: "Nha Trang 5", parentAgentCode: "D102114757", childGroupName: "Nha Trang 5 Sao", childAgentCode: "D251185646", rate: 0.5 },
  { parentGroupName: "Nha Trang 5", parentAgentCode: "D102114757", childGroupName: "Nha Trang 5 Sao", childAgentCode: "D251185646", rate: 0 },
  { parentGroupName: "Đại Thắng", parentAgentCode: "D102144961", childGroupName: "Phát Thắng", childAgentCode: "D251200445", rate: 0.5 },
  { parentGroupName: "Hoàng Phát", parentAgentCode: "D251185646", childGroupName: "Thư Thịnh", childAgentCode: "D251420618", rate: 1 },
  { parentGroupName: "Tâm Phát", parentAgentCode: "D102143032", childGroupName: "Tâm An", childAgentCode: "D251500997", rate: 1 }
];

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

const STAR_VIET_GROUP_LEVELS = [
  { key: "none", rank: "Chưa đạt", tickets: 0, threshold: 0, tone: "none" },
  { key: "gold_1", rank: "Hạng Vàng", tickets: 1, threshold: 1_600_000_000, tone: "gold" },
  { key: "platinum_1", rank: "Hạng Bạch Kim", tickets: 1, threshold: 3_500_000_000, tone: "platinum" },
  { key: "platinum_2", rank: "Hạng Bạch Kim", tickets: 2, threshold: 5_500_000_000, tone: "platinum" },
  { key: "diamond_1", rank: "Hạng Kim Cương", tickets: 1, threshold: 7_000_000_000, tone: "diamond" },
  { key: "diamond_2", rank: "Hạng Kim Cương", tickets: 2, threshold: 13_000_000_000, tone: "diamond" }
];

export function normalizeText(value: unknown) {
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

function normalizeContractIdentity(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function starVietContractKeys(record: StarVietRecord) {
  const rawData = record.raw_data ?? {};
  const keys = new Set<string>();
  for (const [header, value] of Object.entries(rawData)) {
    const normalizedHeader = normalizeText(header);
    const isApplicationNo = STAR_VIET_APPLICATION_NO_ALIASES.some((alias) => normalizedHeader === alias);
    const isContractNo = STAR_VIET_CONTRACT_NO_ALIASES.some((alias) => normalizedHeader === alias);
    if (!isApplicationNo && !isContractNo) continue;
    const identity = normalizeContractIdentity(value);
    if (identity && identity !== "-") keys.add(identity);
  }
  return [...keys];
}

export function recentStarVietMonthKeys(currentMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(currentMonth.slice(0, 7));
  if (!match) return [currentMonth.slice(0, 7)].filter(Boolean);
  const current = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return [1, 0].map((offset) => {
    const date = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function mergeStarVietKpi04AndBc02(kpi04Records: StarVietRecord[], bc02Records: StarVietRecord[]) {
  const kpi04ContractKeys = new Set(kpi04Records.flatMap(starVietContractKeys));
  const selectedBc02 = new Map<string, StarVietRecord>();
  bc02Records.forEach((record, index) => {
    const contractKeys = starVietContractKeys(record);
    if (contractKeys.some((key) => kpi04ContractKeys.has(key))) return;
    const uniqueKey = contractKeys[0] || `unkeyed:${index}:${normalizeText(record.agent_name)}:${Number(record.afyp || 0)}`;
    if (!selectedBc02.has(uniqueKey)) selectedBc02.set(uniqueKey, record);
  });
  return [...kpi04Records, ...selectedBc02.values()];
}

export function hasDetailedKpi05ContractHistory(records: StarVietRecord[]) {
  const kpi05Records = records.filter((record) => record.source === "kpi05_group");
  return kpi05Records.length > 0 && kpi05Records.every((record) => Array.isArray(record.raw_data?.line_items));
}

function kpi05ContractPresenceByMonth(records: StarVietRecord[]) {
  const presence = new Map<string, Set<string>>();
  records.filter((record) => record.source === "kpi05_group").forEach((record) => {
    const month = String(record.data_month ?? record.raw_data?.data_month ?? "").slice(0, 7);
    if (!month) return;
    const lineItems = Array.isArray(record.raw_data?.line_items) ? record.raw_data.line_items : [];
    lineItems.forEach((lineItem) => {
      const itemRecord: StarVietRecord = { ...record, raw_data: lineItem as Record<string, unknown> };
      starVietContractKeys(itemRecord).forEach((key) => {
        const months = presence.get(key) ?? new Set<string>();
        months.add(month);
        presence.set(key, months);
      });
    });
  });
  return presence;
}

function allocatedKpi04Fyp(record: StarVietRecord, presence: Map<string, Set<string>>, useKpi05Allocation: boolean) {
  const fullYearFyp = getKpi04Fyp(record);
  if (!useKpi05Allocation) return fullYearFyp;
  const activeMonths = new Set<string>();
  starVietContractKeys(record).forEach((key) => presence.get(key)?.forEach((month) => activeMonths.add(month)));
  return fullYearFyp / 12 * Math.min(activeMonths.size, 12);
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

function isCodeLikeGroupHeader(header: unknown) {
  const normalized = normalizeText(header);
  return /\b(ma|code|id)\b/.test(normalized);
}

function groupNameColumnIndex(headers: unknown[]) {
  const aliases = ["ten nhom", "nhom", "group"];
  const normalizedAliases = aliases.map((alias) => normalizeText(alias));
  const exactIndex = headers.findIndex((header) => normalizedAliases.includes(normalizeText(header)));
  if (exactIndex >= 0) return exactIndex;
  return headers.findIndex((header) => matchesAlias(header, aliases) && !isCodeLikeGroupHeader(header));
}

function firstGroupNameValue(row: unknown[], headers: unknown[], preferredIndex: number) {
  const preferredValue = preferredIndex >= 0 ? String(row[preferredIndex] ?? "").trim() : "";
  if (preferredValue) return preferredValue;
  const exactIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => ["ten nhom", "nhom", "group"].includes(normalizeText(header)))
    .map(({ index }) => index);
  for (const index of exactIndexes) {
    const value = String(row[index] ?? "").trim();
    if (value) return value;
  }
  return "";
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

function buildBestEffortHeaders(rows: unknown[][]) {
  if (rows.length >= 2) {
    const twoRowHeaders = buildTwoRowHeaders(rows);
    if (groupNameColumnIndex(twoRowHeaders) >= 0 && columnIndex(twoRowHeaders, FYP_COLUMN_ALIASES) >= 0) {
      return { headers: twoRowHeaders, dataStartIndex: 2, headerRowNumber: 2 };
    }
  }
  const firstRowHeaders = (rows[0] ?? []).map((header, index) => normalizeText(header) || `column_${index}`);
  return { headers: firstRowHeaders, dataStartIndex: 1, headerRowNumber: 1 };
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

function normalizedAgentCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function agentIdentityKey(record: StarVietRecord) {
  const rawData = record.raw_data ?? {};
  let code = normalizedAgentCode(record.agent_code ?? rawData.agent_code);
  if (!code) {
    for (const [key, value] of Object.entries(rawData)) {
      if (matchesAlias(key, AGENT_CODE_ALIASES)) {
        code = normalizedAgentCode(value);
        if (code) break;
      }
    }
  }
  return code ? `code:${code}` : `name:${normalizeText(record.agent_name)}`;
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
  const excludeDateIndex = config.excludeDateAliases ? columnIndex(headers, config.excludeDateAliases) : -1;
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
    if (excludeDateIndex >= 0 && parseDateValue(row[excludeDateIndex])) return;
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
      agent_code: firstValue(row, headers, AGENT_CODE_ALIASES) || null,
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
    excludeDateAliases: PRE_CONSIDERATION_CANCEL_DATE_ALIASES,
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

export function parseSaoVietKPI05Group(buffer: ArrayBuffer, fileName: string, month: string): StarVietParseResult {
  const rawRows = sheetRowsFromFile(buffer, fileName);
  const errors: StarVietParseResult["errors"] = [];
  const monthKey = month.slice(0, 7);
  const year = Number(monthKey.slice(0, 4)) || 2026;

  if (!STAR_VIET_GROUP_MONTHS.includes(monthKey)) {
    return { records: [], preview: [], errors: [{ message: "KPI05 Sao Việt nhóm chỉ nhận từ 2025-12 đến 2026-11." }], totalAfyp: 0 };
  }
  if (rawRows.length < 2) {
    return { records: [], preview: [], errors: [{ message: "File KPI05 nhóm thiếu header hoặc dữ liệu." }], totalAfyp: 0 };
  }

  const { headers, dataStartIndex, headerRowNumber } = buildBestEffortHeaders(rawRows);
  const groupIndex = groupNameColumnIndex(headers);
  const banIndex = columnIndex(headers, ["ten ban", "ban", "phong kinh doanh"]);
  const fypIndex = columnIndex(headers, FYP_COLUMN_ALIASES);
  const contractDateIndex = columnIndex(headers, KPI04_CONTRACT_DATE_COLUMN_ALIASES);
  const missing = [
    groupIndex < 0 ? "Tên nhóm" : "",
    fypIndex < 0 ? "FYP" : ""
  ].filter(Boolean);
  if (missing.length) {
    return {
      records: [],
      preview: [],
      errors: [{ row: headerRowNumber, message: `File KPI05 nhóm thiếu cột: ${missing.join(", ")}. Cột đọc được: ${headers.map((header) => normalizeText(header)).filter(Boolean).join(", ") || "(trống)"}` }],
      totalAfyp: 0
    };
  }

  const grouped = new Map<string, StarVietRecord>();
  const competitionFypByGroup = new Map<string, number>();
  const leaderLevelByGroup = new Map<string, "ban" | "group">();
  rawRows.slice(dataStartIndex).forEach((row, offset) => {
    const rowNumber = dataStartIndex + offset + 1;
    const banName = banIndex >= 0 ? String(row[banIndex] ?? "").trim() : "";
    const explicitGroupName = firstGroupNameValue(row, headers, groupIndex);
    const groupName = explicitGroupName || banName;
    const fyp = parseMoney(row[fypIndex]);
    if (!groupName && fyp === 0) return;
    if (!groupName) {
      errors.push({ row: rowNumber, message: "Dòng dữ liệu không có Tên nhóm hoặc Ban." });
      return;
    }
    const key = normalizeText(groupName);
    const leaderLevel = explicitGroupName ? "group" : "ban";
    leaderLevelByGroup.set(key, leaderLevelByGroup.get(key) === "group" ? "group" : leaderLevel);
    if (contractDateIndex >= 0 && isDateInDoubleBonusPeriod(row[contractDateIndex])) {
      competitionFypByGroup.set(key, (competitionFypByGroup.get(key) ?? 0) + fyp);
    }
    const rawData = Object.fromEntries(headers.map((header, index) => [String(header || `column_${index}`), row[index] ?? ""]));
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        data_year: year,
        data_month: `${monthKey}-01`,
        source: "kpi05_group",
        agent_name: groupName,
        group_name: groupName,
        afyp: fyp,
        policy_status: null,
        raw_data: { ...rawData, ban_name: banName, data_month: `${monthKey}-01`, source_row_count: 1, line_items: [rawData] }
      });
      return;
    }
    current.afyp += fyp;
    current.raw_data = {
      ...(current.raw_data ?? {}),
      source_row_count: Number(current.raw_data?.source_row_count ?? 1) + 1,
      line_items: [...(Array.isArray(current.raw_data?.line_items) ? current.raw_data.line_items : []), rawData]
    };
  });

  const records = [...grouped].map(([key, record]) => {
    const baseFyp = Number(record.afyp || 0);
    const competitionFyp = competitionFypByGroup.get(key) ?? 0;
    const leaderLevel = leaderLevelByGroup.get(key) ?? "group";
    const doubleBonusAfyp = leaderLevel === "ban"
      ? doubleBonusAmount(competitionFyp, 150_000_000, 300_000_000, BAN_LEADER_DOUBLE_BONUS_CAP)
      : doubleBonusAmount(competitionFyp, 80_000_000, 120_000_000, GROUP_LEADER_DOUBLE_BONUS_CAP);
    return {
      ...record,
      afyp: baseFyp + doubleBonusAfyp,
      raw_data: {
        ...(record.raw_data ?? {}),
        base_fyp: baseFyp,
        competition_fyp: competitionFyp,
        leader_level: leaderLevel,
        double_bonus_afyp: doubleBonusAfyp,
        sao_viet_group_fyp: baseFyp + doubleBonusAfyp
      }
    };
  });
  return {
    records,
    preview: records.slice(0, 10),
    errors,
    totalAfyp: records.reduce((sum, record) => sum + Number(record.afyp || 0), 0)
  };
}

function exactColumnIndex(headers: unknown[], aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeText));
  return headers.findIndex((header) => normalizedAliases.has(normalizeText(header)));
}

function canonicalSnapshotGroupName(groupName: string, agentCode: string) {
  const code = normalizedAgentCode(agentCode);
  const childAlias = STAR_VIET_GROUP_INHERITANCES.find((item) => normalizedAgentCode(item.childAgentCode) === code);
  return childAlias?.childGroupName || groupName;
}

export function parseSaoVietSnapshot(
  buffer: ArrayBuffer,
  fileName: string,
  source: StarVietSnapshotSource,
  asOfDate: string
): StarVietParseResult {
  const rawRows = sheetRowsFromFile(buffer, fileName);
  const errors: StarVietParseResult["errors"] = [];
  const normalizedAsOfDate = String(asOfDate ?? "").slice(0, 10);
  const year = Number(normalizedAsOfDate.slice(0, 4));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedAsOfDate) || !parseDateValue(normalizedAsOfDate)) {
    return { records: [], preview: [], errors: [{ message: "Ngày chốt Sao Việt không hợp lệ." }], totalAfyp: 0 };
  }
  if (rawRows.length < 3) {
    return { records: [], preview: [], errors: [{ message: "File Sao Việt thiếu header hoặc dữ liệu." }], totalAfyp: 0 };
  }

  const { headers, dataStartIndex, headerRowNumber } = buildBestEffortHeaders(rawRows);
  const groupIndex = exactColumnIndex(headers, ["nhóm", "tên nhóm"]);
  const codeIndex = exactColumnIndex(headers, ["mã tvv", "mã đại lý", "mã dl", "agent code", "agent_code"]);
  const nameIndex = exactColumnIndex(headers, ["tên", "tên tvv", "tên đại lý", "họ tên"]);
  const roleIndex = exactColumnIndex(headers, ["chức vụ", "vai trò"]);
  const valueIndex = exactColumnIndex(headers, ["tổng fypktm", "tổng fyp ktm", "fypktm", "fyp ktm", "fyp"]);
  const missing = [
    groupIndex < 0 ? "Nhóm" : "",
    codeIndex < 0 ? "Mã TVV" : "",
    nameIndex < 0 ? "Tên" : "",
    valueIndex < 0 ? "Tổng FYPKTM" : ""
  ].filter(Boolean);
  if (missing.length) {
    return {
      records: [],
      preview: [],
      errors: [{ row: headerRowNumber, message: `File Sao Việt thiếu cột: ${missing.join(", ")}.` }],
      totalAfyp: 0
    };
  }

  const records: StarVietRecord[] = [];
  const seenCodes = new Map<string, number>();
  rawRows.slice(dataStartIndex).forEach((row, offset) => {
    const rowNumber = dataStartIndex + offset + 1;
    const originalGroupName = String(row[groupIndex] ?? "").trim();
    const agentCode = normalizedAgentCode(row[codeIndex]);
    const agentName = String(row[nameIndex] ?? "").trim();
    const role = roleIndex >= 0 ? String(row[roleIndex] ?? "").trim() : "";
    const afyp = parseMoney(row[valueIndex]);
    if (!originalGroupName && !agentCode && !agentName && afyp === 0) return;
    if (!originalGroupName || !agentCode || !agentName) {
      errors.push({ row: rowNumber, message: "Dòng dữ liệu phải có đủ Nhóm, Mã TVV và Tên." });
      return;
    }
    if (seenCodes.has(agentCode)) {
      errors.push({ row: rowNumber, message: `Mã TVV ${agentCode} bị trùng với dòng ${seenCodes.get(agentCode)}.` });
      return;
    }
    seenCodes.set(agentCode, rowNumber);

    const groupName = source === "snapshot_group"
      ? canonicalSnapshotGroupName(originalGroupName, agentCode)
      : originalGroupName;
    const rawData = Object.fromEntries(headers.map((header, index) => [String(header || `column_${index}`), row[index] ?? ""]));
    records.push({
      data_year: year,
      data_month: normalizedAsOfDate,
      source,
      agent_code: agentCode,
      agent_name: agentName,
      group_name: groupName,
      afyp,
      policy_status: role || null,
      raw_data: {
        ...rawData,
        original_group_name: originalGroupName,
        snapshot_as_of_date: normalizedAsOfDate,
        snapshot_type: source,
        base_afyp: afyp
      }
    });
  });

  return {
    records,
    preview: records.slice(0, 10),
    errors,
    totalAfyp: records.reduce((sum, record) => sum + Number(record.afyp || 0), 0)
  };
}

export function latestStarVietSnapshotDate(records: StarVietRecord[], source: StarVietSnapshotSource) {
  return records
    .filter((record) => record.source === source)
    .map((record) => String(record.data_month ?? record.raw_data?.snapshot_as_of_date ?? "").slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort((a, b) => b.localeCompare(a))[0] ?? "";
}

export function starVietBc02AfterSnapshot(records: StarVietRecord[], snapshotDate: string) {
  if (!snapshotDate) return [];
  return records.filter((record) => {
    if (record.source !== "bc02") return false;
    const effectiveDate = String(record.raw_data?.paid_date ?? record.data_month ?? "").slice(0, 10);
    return effectiveDate > snapshotDate;
  });
}

export function parseStarVietFile(buffer: ArrayBuffer, fileName: string, source: StarVietSource, year: number): StarVietParseResult {
  if (source === "kpi05_group") return parseSaoVietKPI05Group(buffer, fileName, `${year}-01`);
  if (source === "snapshot_agent" || source === "snapshot_group") {
    return { records: [], preview: [], errors: [{ message: "File snapshot Sao Việt cần có ngày chốt." }], totalAfyp: 0 };
  }
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

function currentGroupLevel(totalAfyp: number) {
  return [...STAR_VIET_GROUP_LEVELS].reverse().find((level) => totalAfyp >= level.threshold) ?? STAR_VIET_GROUP_LEVELS[0];
}

function nextGroupLevel(totalAfyp: number) {
  return STAR_VIET_GROUP_LEVELS.find((level) => level.threshold > totalAfyp) ?? null;
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

function doubleBonusAmount(competitionFyp: number, lowerThreshold: number, upperThreshold: number, cap: number) {
  const multiplier = competitionFyp >= upperThreshold
    ? 2
    : competitionFyp >= lowerThreshold
      ? 1.5
      : 1;
  return Math.min(competitionFyp * (multiplier - 1), cap);
}

function getKpi04Fyp(record: StarVietRecord) {
  return parseMoney(rawValue(record, FYP_COLUMN_ALIASES));
}

export function competitionMultiplier(competitionFyp: number) {
  if (competitionFyp >= 50_000_000) return 2;
  if (competitionFyp >= 30_000_000) return 1.5;
  return 1;
}

export function calculateTopupBonus(records: StarVietRecord[]) {
  const topupAmount = records.reduce((sum, record) => sum + parseMoney(rawValue(record, TOPUP_COLUMN_ALIASES)), 0);
  return topupAmount * TOPUP_BONUS_RATE;
}

export function calculateTotalSaoVietAfyp(records: StarVietRecord[]) {
  const snapshotItems = records.filter((record) => record.source === "snapshot_agent");
  const bc02Afyp = records.filter((record) => record.source === "bc02").reduce((sum, record) => sum + Number(record.afyp || 0), 0);
  if (snapshotItems.length) {
    return snapshotItems.reduce((sum, record) => sum + Number(record.afyp || 0), 0) + bc02Afyp;
  }
  const kpi04Items = records.filter((record) => record.source === "kpi04");
  const useKpi05Allocation = hasDetailedKpi05ContractHistory(records);
  const kpi05Presence = kpi05ContractPresenceByMonth(records);
  const competitionFyp = kpi04Items.reduce((sum, record) => isDateInDoubleBonusPeriod(rawValue(record, KPI04_CONTRACT_DATE_COLUMN_ALIASES)) ? sum + allocatedKpi04Fyp(record, kpi05Presence, useKpi05Allocation) : sum, 0);
  const kpi04FypTotal = kpi04Items.reduce((sum, record) => sum + allocatedKpi04Fyp(record, kpi05Presence, useKpi05Allocation), 0);
  const doubledBonus = doubleBonusAmount(competitionFyp, 30_000_000, 50_000_000, TVV_DOUBLE_BONUS_CAP);
  const kpi04Total = kpi04FypTotal + doubledBonus + calculateTopupBonus(kpi04Items);
  return (kpi04Items.length ? kpi04Total : 0) + bc02Afyp;
}

export function buildStarVietReport(records: StarVietRecord[]) {
  const useKpi05Allocation = hasDetailedKpi05ContractHistory(records);
  const kpi05Presence = kpi05ContractPresenceByMonth(records);
  const snapshotAsOfDate = latestStarVietSnapshotDate(records, "snapshot_agent");
  const grouped = new Map<string, StarVietRecord[]>();
  records.filter((record) => record.source !== "kpi05_group" && record.source !== "snapshot_group").forEach((record) => {
    const key = agentIdentityKey(record);
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  const rows = [...grouped.values()]
    .map((items) => {
      const bc02Items = items.filter((item) => item.source === "bc02");
      const kpi04Items = items.filter((item) => item.source === "kpi04");
      const snapshotItems = items.filter((item) => item.source === "snapshot_agent");
      const snapshotAfyp = snapshotItems.reduce((sum, item) => sum + Number(item.afyp || 0), 0);
      const kpi04Fyp = snapshotItems.length
        ? 0
        : kpi04Items.reduce((sum, item) => sum + allocatedKpi04Fyp(item, kpi05Presence, useKpi05Allocation), 0);
      const competitionFyp = snapshotItems.length
        ? 0
        : kpi04Items.reduce((sum, item) => isDateInDoubleBonusPeriod(rawValue(item, KPI04_CONTRACT_DATE_COLUMN_ALIASES)) ? sum + allocatedKpi04Fyp(item, kpi05Presence, useKpi05Allocation) : sum, 0);
      const competitionFactor = snapshotItems.length ? 1 : competitionMultiplier(competitionFyp);
      const doubleBonusAfyp = snapshotItems.length ? 0 : doubleBonusAmount(competitionFyp, 30_000_000, 50_000_000, TVV_DOUBLE_BONUS_CAP);
      const kpi04SaoVietFyp = kpi04Fyp + doubleBonusAfyp;
      const bc02Afyp = bc02Items.reduce((sum, item) => sum + Number(item.afyp || 0), 0);
      const topupBonusAfyp = snapshotItems.length ? 0 : calculateTopupBonus(kpi04Items);
      const baseAfyp = snapshotItems.length ? snapshotAfyp : kpi04SaoVietFyp + topupBonusAfyp;
      const totalAfyp = baseAfyp + bc02Afyp;
      const level = currentLevel(totalAfyp);
      const next = nextLevel(totalAfyp);
      const nextThreshold = next?.threshold ?? totalAfyp;
      const progress = next ? Math.min(100, (totalAfyp / next.threshold) * 100) : 100;
      const sourceItems = snapshotItems.length ? snapshotItems : kpi04Items.length ? kpi04Items : bc02Items;
      return {
        agentCode: normalizedAgentCode(sourceItems[0]?.agent_code ?? items[0]?.agent_code),
        agentName: sourceItems[0]?.agent_name ?? items[0]?.agent_name ?? "",
        groupName: sourceItems.find((item) => item.group_name)?.group_name ?? items.find((item) => item.group_name)?.group_name ?? "",
        source: snapshotItems.length ? "snapshot+bc02" : kpi04Items.length ? "kpi04+bc02" : "bc02",
        snapshotAfyp,
        snapshotAsOfDate: snapshotItems.length ? String(snapshotItems[0]?.data_month ?? "").slice(0, 10) : "",
        baseAfyp,
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
      nearNextAgents: rows.filter((row) => row.remainingToNext > 0 && row.remainingToNext < 100_000_000).length,
      snapshotAsOfDate
    },
    options: {
      groups: [...new Set(rows.map((row) => row.groupName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
      ranks: ["Chưa đạt", "Hạng Vàng", "Hạng Bạch Kim", "Hạng Kim Cương"]
    }
  };
}

export function buildStarVietGroupReport(
  records: StarVietRecord[],
  inheritances: StarVietGroupInheritance[] = STAR_VIET_GROUP_INHERITANCES
) {
  type GroupCandidate = {
    groupName: string;
    leaderCode: string;
    leaderName: string;
    monthly: Record<string, number>;
    totalAfyp: number;
    bc02Afyp: number;
    source: "kpi04" | "kpi05_group" | "snapshot_group" | "bc02";
  };

  function groupedByName(items: StarVietRecord[]) {
    const grouped = new Map<string, StarVietRecord[]>();
    items.forEach((record) => {
      const key = normalizeText(record.group_name || record.agent_name);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    });
    return grouped;
  }

  const snapshotAsOfDate = latestStarVietSnapshotDate(records, "snapshot_group");
  const snapshotCandidates = new Map<string, GroupCandidate>();
  groupedByName(records.filter((record) => record.source === "snapshot_group" && String(record.data_month ?? "").slice(0, 10) === snapshotAsOfDate)).forEach((items, key) => {
    snapshotCandidates.set(key, {
      groupName: items[0]?.group_name || "",
      leaderCode: normalizedAgentCode(items[0]?.agent_code),
      leaderName: items[0]?.agent_name || "",
      monthly: {},
      totalAfyp: items.reduce((sum, item) => sum + Number(item.afyp || 0), 0),
      bc02Afyp: 0,
      source: "snapshot_group"
    });
  });

  const kpi04Candidates = new Map<string, GroupCandidate>();
  if (!snapshotCandidates.size) {
    groupedByName(records.filter((record) => record.source === "kpi04")).forEach((items, key) => {
      const baseFyp = items.reduce((sum, item) => sum + getKpi04Fyp(item), 0);
      const competitionFyp = items.reduce((sum, item) => (
        isDateInDoubleBonusPeriod(rawValue(item, KPI04_CONTRACT_DATE_COLUMN_ALIASES)) ? sum + getKpi04Fyp(item) : sum
      ), 0);
      const hasExplicitGroup = items.some((item) => String(rawValue(item, ["ten nhom", "nhom", "group"])).trim());
      const doubleBonusAfyp = hasExplicitGroup
        ? doubleBonusAmount(competitionFyp, 80_000_000, 120_000_000, GROUP_LEADER_DOUBLE_BONUS_CAP)
        : doubleBonusAmount(competitionFyp, 150_000_000, 300_000_000, BAN_LEADER_DOUBLE_BONUS_CAP);
      kpi04Candidates.set(key, {
        groupName: items[0]?.group_name || items[0]?.agent_name || "",
        leaderCode: "",
        leaderName: "",
        monthly: {},
        totalAfyp: baseFyp + doubleBonusAfyp,
        bc02Afyp: 0,
        source: "kpi04"
      });
    });
  }

  const kpi05Candidates = new Map<string, GroupCandidate>();
  if (!snapshotCandidates.size) {
    groupedByName(records
      .filter((record) => record.source === "kpi05_group")
      .filter((record) => STAR_VIET_GROUP_MONTHS.includes(String(record.data_month ?? "").slice(0, 7)))
    ).forEach((items, key) => {
      const monthly = Object.fromEntries(STAR_VIET_GROUP_MONTHS.map((month) => [
        month,
        items
          .filter((item) => String(item.data_month ?? "").slice(0, 7) === month)
          .reduce((sum, item) => sum + Number(item.afyp || 0), 0)
      ]));
      kpi05Candidates.set(key, {
        groupName: items[0]?.group_name || items[0]?.agent_name || "",
        leaderCode: "",
        leaderName: "",
        monthly,
        totalAfyp: items.reduce((sum, item) => sum + Number(item.afyp || 0), 0),
        bc02Afyp: 0,
        source: "kpi05_group"
      });
    });
  }

  const bc02ByGroup = new Map<string, { groupName: string; afyp: number }>();
  groupedByName(records.filter((record) => record.source === "bc02")).forEach((items, key) => {
    bc02ByGroup.set(key, {
      groupName: items[0]?.group_name || items[0]?.agent_name || "",
      afyp: items.reduce((sum, item) => sum + Number(item.afyp || 0), 0)
    });
  });

  const baseCandidates = snapshotCandidates.size ? snapshotCandidates : new Map([...kpi05Candidates, ...kpi04Candidates]);
  const candidateByKey = new Map<string, GroupCandidate>();
  [...new Set([...baseCandidates.keys(), ...bc02ByGroup.keys()])].forEach((key) => {
    const base = baseCandidates.get(key);
    const bc02 = bc02ByGroup.get(key);
    candidateByKey.set(key, base
      ? { ...base, totalAfyp: base.totalAfyp + (bc02?.afyp ?? 0), bc02Afyp: bc02?.afyp ?? 0 }
      : {
        groupName: bc02?.groupName ?? "",
        leaderCode: "",
        leaderName: "",
        monthly: {},
        totalAfyp: bc02?.afyp ?? 0,
        bc02Afyp: bc02?.afyp ?? 0,
        source: "bc02"
      });
  });

  const candidateKeyByLeaderCode = new Map<string, string>();
  candidateByKey.forEach((candidate, key) => {
    const code = normalizedAgentCode(candidate.leaderCode);
    if (code) candidateKeyByLeaderCode.set(code, key);
  });
  const inheritedByKey = new Map<string, number>();
  const inheritanceDetailsByKey = new Map<string, Array<{ childGroupName: string; rate: number; afyp: number }>>();
  inheritances.filter((item) => Number(item.rate) > 0).forEach((item) => {
    const childKey = candidateKeyByLeaderCode.get(normalizedAgentCode(item.childAgentCode))
      ?? normalizeText(item.childGroupName);
    const child = candidateByKey.get(childKey);
    if (!child) return;

    let parentKey = candidateKeyByLeaderCode.get(normalizedAgentCode(item.parentAgentCode))
      ?? normalizeText(item.parentGroupName);
    if (!candidateByKey.has(parentKey)) {
      candidateByKey.set(parentKey, {
        groupName: item.parentGroupName,
        leaderCode: normalizedAgentCode(item.parentAgentCode),
        leaderName: "",
        monthly: {},
        totalAfyp: 0,
        bc02Afyp: 0,
        source: snapshotCandidates.size ? "snapshot_group" : "bc02"
      });
      const parentCode = normalizedAgentCode(item.parentAgentCode);
      if (parentCode) candidateKeyByLeaderCode.set(parentCode, parentKey);
    }
    parentKey = candidateKeyByLeaderCode.get(normalizedAgentCode(item.parentAgentCode)) ?? parentKey;
    if (parentKey === childKey) return;
    // Snapshot đã bao gồm toàn bộ thừa hưởng đến ngày chốt. Chỉ thừa hưởng
    // phần BC02 phát sinh sau ngày chốt để không cộng lại dữ liệu lịch sử.
    const inheritableAfyp = snapshotCandidates.size ? child.bc02Afyp : child.totalAfyp;
    const inheritedAfyp = inheritableAfyp * Number(item.rate);
    if (inheritedAfyp === 0) return;
    inheritedByKey.set(parentKey, (inheritedByKey.get(parentKey) ?? 0) + inheritedAfyp);
    inheritanceDetailsByKey.set(parentKey, [
      ...(inheritanceDetailsByKey.get(parentKey) ?? []),
      { childGroupName: child.groupName || item.childGroupName, rate: Number(item.rate), afyp: inheritedAfyp }
    ]);
  });

  const rows = [...candidateByKey.entries()]
    .map(([key, candidate]) => {
      const directAfyp = candidate.totalAfyp;
      const inheritedAfyp = inheritedByKey.get(key) ?? 0;
      const totalAfyp = directAfyp + inheritedAfyp;
      const level = currentGroupLevel(totalAfyp);
      const next = nextGroupLevel(totalAfyp);
      return {
        groupName: candidate.groupName,
        leaderCode: candidate.leaderCode,
        leaderName: candidate.leaderName,
        monthly: candidate.monthly,
        source: candidate.source,
        directAfyp,
        inheritedAfyp,
        inheritanceDetails: inheritanceDetailsByKey.get(key) ?? [],
        totalAfyp,
        currentRank: level.rank,
        currentTickets: level.tickets,
        rankTone: level.tone,
        nextRank: next ? `${next.rank} ${String(next.tickets).padStart(2, "0")} vé` : "Đã đạt mốc cao nhất",
        nextThreshold: next?.threshold ?? totalAfyp,
        remainingToNext: next ? Math.max(next.threshold - totalAfyp, 0) : 0,
        progress: next ? Math.min(100, (totalAfyp / next.threshold) * 100) : 100
      };
    })
    .sort((a, b) => b.totalAfyp - a.totalAfyp)
    .map((row, index) => ({ rank: index + 1, ...row }));

  return {
    rows,
    months: snapshotCandidates.size ? [] : STAR_VIET_GROUP_MONTHS,
    summary: {
      totalGroups: rows.length,
      achievedGroups: rows.filter((row) => row.totalAfyp >= 1_600_000_000).length,
      totalAfyp: rows.reduce((sum, row) => sum + row.totalAfyp, 0),
      nearNextGroups: rows.filter((row) => row.remainingToNext > 0 && row.remainingToNext < 500_000_000).length,
      inheritedAfyp: rows.reduce((sum, row) => sum + row.inheritedAfyp, 0),
      snapshotAsOfDate
    },
    options: {
      groups: rows.map((row) => row.groupName).sort((a, b) => a.localeCompare(b, "vi")),
      ranks: ["Chưa đạt", "Hạng Vàng", "Hạng Bạch Kim", "Hạng Kim Cương"]
    }
  };
}
