export const ADS_MONTHLY_PLANS: Record<string, number[]> = {
  "Nguyễn Thị Mai Trang": [715, 550, 935, 880, 935, 990, 935, 935, 935, 990, 1045, 1155],
  "Nguyễn Thị Trầm": [748, 575, 978, 920, 978, 1035, 978, 978, 978, 1035, 1093, 1208],
  "Đinh Quốc Tiến": [293, 225, 383, 360, 383, 405, 383, 383, 383, 405, 428, 473],
  "Nguyễn Thóc": [780, 600, 1020, 960, 1020, 1080, 1020, 1020, 1020, 1080, 1140, 1260],
  "Trần Xuân Thu": [260, 200, 340, 320, 340, 360, 340, 340, 340, 360, 380, 420],
  "Nguyễn Thành Nhân": [715, 550, 935, 880, 935, 990, 935, 935, 935, 990, 1045, 1155]
};

function monthNumber(month: string) {
  const value = Number(month.slice(5, 7));
  return Number.isFinite(value) && value >= 1 && value <= 12 ? value : 1;
}

export function getAdsPlan(adsName: string, month: string) {
  const monthIndex = monthNumber(month) - 1;
  return ADS_MONTHLY_PLANS[adsName]?.[monthIndex] ?? null;
}

export function getAdsMonthlyTarget(adsName: string, month: string) {
  const planMillion = getAdsPlan(adsName, month);
  return planMillion === null ? 0 : planMillion * 1_000_000;
}

export function getAdsQuarterTarget(adsName: string, month: string) {
  const selectedMonth = monthNumber(month);
  const quarterStart = (Math.ceil(selectedMonth / 3) - 1) * 3;
  const plans = ADS_MONTHLY_PLANS[adsName] ?? [];
  return plans.slice(quarterStart, quarterStart + 3).reduce((sum, value) => sum + value * 1_000_000, 0);
}

export function getAdsYearTarget(adsName: string) {
  return (ADS_MONTHLY_PLANS[adsName] ?? []).reduce((sum, value) => sum + value * 1_000_000, 0);
}
