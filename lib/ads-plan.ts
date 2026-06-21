export const ADS_MONTHLY_PLANS: Record<string, number[]> = {
  "Nguyễn Thị Mai Trang": [715, 550, 935, 880, 935, 990, 935, 935, 935, 990, 1045, 1155],
  "Nguyễn Thị Trầm": [748, 575, 978, 920, 978, 1035, 978, 978, 978, 1035, 1093, 1208],
  "Đinh Quốc Tiến": [293, 225, 383, 360, 383, 405, 383, 383, 383, 405, 428, 473],
  "Nguyễn Thóc": [780, 600, 1020, 960, 1020, 1080, 1020, 1020, 1020, 1080, 1140, 1260],
  "Trần Xuân Thu": [260, 200, 340, 320, 340, 360, 340, 340, 340, 360, 380, 420],
  "Nguyễn Thành Nhân": [715, 550, 935, 880, 935, 990, 935, 935, 935, 990, 1045, 1155]
};

export const ADS_MASTER_NAMES = Object.keys(ADS_MONTHLY_PLANS);

const ADS_GROUP_ASSIGNMENTS: Record<string, string> = {
  "Banca__Banca": "Nguyễn Thị Mai Trang",
  "Hoàng Phát__Hoàng Phát": "Nguyễn Thị Mai Trang",
  "Hoàng Phát__Quyết Thắng": "Nguyễn Thị Mai Trang",
  "Hoàng Phát__Nha Trang 4": "Nguyễn Thị Trầm",
  "Hoàng Phát__Nha Trang 5": "Nguyễn Thị Trầm",
  "Hoàng Phát__Nha Trang 5 Sao": "Nguyễn Thị Trầm",
  "Hoàng Phát__Thư Thịnh": "Nguyễn Thị Trầm",
  "Hoàng Phát__Thành Phú": "Nguyễn Thành Nhân",
  "Hoàng Phát__Thuận Phát": "Nguyễn Thành Nhân",
  "Nguyên Phát__Duyên Phát": "Nguyễn Thành Nhân",
  "Nguyên Phát__Hiệp Phát": "Nguyễn Thành Nhân",
  "Nguyên Phát__Nguyên Phát": "Nguyễn Thành Nhân",
  "Nguyên Phát__Tài Phát": "Nguyễn Thành Nhân",
  "Khánh Hòa 2__Ánh Dương": "Đinh Quốc Tiến",
  "Khánh Hòa 2__Hưng Thịnh": "Đinh Quốc Tiến",
  "Khánh Hòa 2__Sao Mai": "Đinh Quốc Tiến",
  "Khánh Hòa 2__Sen Vàng": "Đinh Quốc Tiến",
  "Tâm Phát__Đại Thắng": "Trần Xuân Thu",
  "Tâm Phát__Hồng Đức": "Trần Xuân Thu",
  "Tâm Phát__Phát Thắng": "Trần Xuân Thu",
  "Tâm Phát__Hồng Phát": "Nguyễn Thóc",
  "Tâm Phát__Tâm An": "Nguyễn Thóc",
  "Tâm Phát__Tâm Nhiên": "Nguyễn Thóc",
  "Tâm Phát__Tâm Phát": "Nguyễn Thóc",
  "Tấn Phát__Hùng Phát": "Nguyễn Thóc",
  "Tấn Phát__Tấn Phát": "Nguyễn Thóc"
};

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function assignmentKey(banName: unknown, groupName: unknown) {
  return `${normalizeKey(banName)}__${normalizeKey(groupName)}`;
}

const NORMALIZED_ADS_NAMES = new Map(ADS_MASTER_NAMES.map((name) => [normalizeKey(name), name]));
const NORMALIZED_GROUP_ASSIGNMENTS = new Map(Object.entries(ADS_GROUP_ASSIGNMENTS).map(([key, adsName]) => {
  const [banName, groupName] = key.split("__");
  return [assignmentKey(banName, groupName), adsName];
}));

export function normalizeAdsName(value: unknown) {
  return normalizeKey(value);
}

export function findAdsMasterName(value: unknown) {
  return NORMALIZED_ADS_NAMES.get(normalizeAdsName(value)) ?? "";
}

export function resolveAdsName(value: unknown, banName?: unknown, groupName?: unknown) {
  const direct = findAdsMasterName(value);
  if (direct) return direct;
  const text = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (text) return text;
  return findAdsByBanGroup(banName, groupName);
}

export function findAdsByBanGroup(banName: unknown, groupName: unknown) {
  return NORMALIZED_GROUP_ASSIGNMENTS.get(assignmentKey(banName, groupName)) ?? "";
}

export function hasAdsKpi(value: unknown) {
  return Boolean(findAdsMasterName(value));
}

function monthNumber(month: string) {
  const value = Number(month.slice(5, 7));
  return Number.isFinite(value) && value >= 1 && value <= 12 ? value : 1;
}

export function getAdsPlan(adsName: string, month: string) {
  const monthIndex = monthNumber(month) - 1;
  const masterName = findAdsMasterName(adsName);
  return masterName ? ADS_MONTHLY_PLANS[masterName]?.[monthIndex] ?? null : null;
}

export function getAdsMonthlyTarget(adsName: string, month: string) {
  const planMillion = getAdsPlan(adsName, month);
  return planMillion === null ? 0 : planMillion * 1_000_000;
}

export function getAdsQuarterTarget(adsName: string, month: string) {
  const selectedMonth = monthNumber(month);
  const quarterStart = (Math.ceil(selectedMonth / 3) - 1) * 3;
  const masterName = findAdsMasterName(adsName);
  const plans = masterName ? ADS_MONTHLY_PLANS[masterName] ?? [] : [];
  return plans.slice(quarterStart, quarterStart + 3).reduce((sum, value) => sum + value * 1_000_000, 0);
}

export function getAdsYearTarget(adsName: string) {
  const masterName = findAdsMasterName(adsName);
  return (masterName ? ADS_MONTHLY_PLANS[masterName] ?? [] : []).reduce((sum, value) => sum + value * 1_000_000, 0);
}
