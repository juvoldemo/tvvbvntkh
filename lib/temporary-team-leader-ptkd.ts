type TemporaryPtkdMonthlyRow = {
  groupName: string;
  leaderName: string;
  fyp: number;
  hdc: number;
  rate: number;
  fyc: number;
  reward: number;
};

type TemporaryPtkdMonthlyFields = {
  fyp: number;
  source: "temporary-ptkd-2026-07";
  sourceLeaderName: string;
};

type TemporaryMappedResult<T extends { monthly: Record<string, any> }> =
  Omit<T, "monthly"> & {
    monthly: T["monthly"] & Partial<TemporaryPtkdMonthlyFields>;
  };

const TEMPORARY_PTKD_MONTH = "2026-07";

const JULY_2026_PTKD_ROWS: TemporaryPtkdMonthlyRow[] = [
  { groupName: "Nha Trang 5", leaderName: "Lương Thị Thái", fyp: 560_840_985, hdc: 6, rate: 0.30, fyc: 148_706_121, reward: 44_611_836 },
  { groupName: "Quyết Thắng", leaderName: "Phạm Thu", fyp: 352_948_035, hdc: 6, rate: 0.26, fyc: 99_413_801, reward: 25_847_588 },
  { groupName: "Nha Trang 4", leaderName: "Thái Thị Từ", fyp: 302_943_620, hdc: 3, rate: 0.22, fyc: 89_844_724, reward: 19_765_839 },
  { groupName: "Tâm Phát", leaderName: "Lưu Thanh Sơn", fyp: 274_876_625, hdc: 5, rate: 0.26, fyc: 73_483_147, reward: 19_105_618 },
  { groupName: "Hoàng Phát", leaderName: "Huỳnh Thị Vân Anh", fyp: 221_917_610, hdc: 6, rate: 0.26, fyc: 62_604_261, reward: 16_277_108 },
  { groupName: "Thành Phú", leaderName: "Lê Thị Tịnh", fyp: 191_674_268, hdc: 6, rate: 0.22, fyc: 49_924_714, reward: 10_983_437 },
  { groupName: "Hiệp Phát", leaderName: "Nguyễn Thị Mỹ Loan", fyp: 161_696_041, hdc: 5, rate: 0.22, fyc: 42_704_235, reward: 9_394_932 },
  { groupName: "Hưng Thịnh", leaderName: "Trần Thị Xuân Thu", fyp: 141_520_500, hdc: 5, rate: 0.22, fyc: 38_237_912, reward: 8_412_341 },
  { groupName: "Nguyên Phát", leaderName: "Nguyễn Thị Minh Trang", fyp: 146_863_650, hdc: 3, rate: 0.20, fyc: 42_022_500, reward: 8_404_500 },
  { groupName: "Phát Thắng", leaderName: "Đoàn Thị Bích", fyp: 103_449_374, hdc: 4, rate: 0.20, fyc: 29_069_728, reward: 5_813_946 },
  { groupName: "Hồng Đức", leaderName: "Lê Thị Thành", fyp: 95_283_781, hdc: 3, rate: 0.18, fyc: 27_496_756, reward: 4_949_416 },
  { groupName: "Tâm Đức", leaderName: "Cao Thị Thanh Mai", fyp: 111_306_460, hdc: 1, rate: 0.10, fyc: 33_261_292, reward: 3_326_129 },
  { groupName: "Nha Trang 5 Sao", leaderName: "Trần Thị Mỹ Vân", fyp: 58_912_690, hdc: 2, rate: 0.14, fyc: 16_554_263, reward: 2_317_597 },
  { groupName: "Thuận Phát", leaderName: "Nguyễn Thị Nga", fyp: 51_561_124, hdc: 2, rate: 0.14, fyc: 14_712_225, reward: 2_059_711 },
  { groupName: "Hưng Phát", leaderName: "Nguyễn Thiện Tín", fyp: 51_459_160, hdc: 2, rate: 0.14, fyc: 13_007_482, reward: 1_821_047 },
  { groupName: "Tâm Nhiên", leaderName: "Lê Thị Hồng Đào", fyp: 59_691_454, hdc: 1, rate: 0.10, fyc: 16_375_147, reward: 1_637_515 },
  { groupName: "Đại Thắng", leaderName: "Nguyễn Thị Trang Châu", fyp: 40_355_850, hdc: 2, rate: 0.14, fyc: 11_196_638, reward: 1_567_529 },
  { groupName: "Sao Mai", leaderName: "Hoàng Huyền Trang", fyp: 27_684_166, hdc: 1, rate: 0.10, fyc: 7_979_040, reward: 797_904 },
  { groupName: "Tấn Phát", leaderName: "Nguyễn Thị Thu Thảo", fyp: 27_164_852, hdc: 1, rate: 0.10, fyc: 7_882_970, reward: 788_297 },
  { groupName: "Ánh Dương", leaderName: "Đoàn Thị Kim Thúy", fyp: 25_832_721, hdc: 1, rate: 0.10, fyc: 7_342_070, reward: 734_207 },
  { groupName: "Thư Thịnh", leaderName: "Nguyễn Thị Minh Thư", fyp: 15_367_125, hdc: 1, rate: 0.10, fyc: 4_573_425, reward: 457_343 },
  { groupName: "Tâm An", leaderName: "Nguyễn Võ Thanh Thúy", fyp: 15_500_600, hdc: 1, rate: 0.10, fyc: 4_500_120, reward: 450_012 },
  { groupName: "Sen Vàng", leaderName: "Đoàn Thị Mỹ Châu", fyp: 0, hdc: 0, rate: 0.10, fyc: 0, reward: 0 },
  { groupName: "Tài Phát", leaderName: "Nguyễn Thị Thu Diệu", fyp: 0, hdc: 0, rate: 0.10, fyc: 0, reward: 0 },
  { groupName: "Duyên Phát", leaderName: "Nguyễn Thị Ngọc Duyên", fyp: 0, hdc: 0, rate: 0.10, fyc: 0, reward: 0 }
];

function normalizeLookup(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const JULY_2026_PTKD_BY_GROUP = new Map(
  JULY_2026_PTKD_ROWS.map((row) => [normalizeLookup(row.groupName), row])
);

export function getTemporaryTeamLeaderPtkd(month: string, groupName: string) {
  if (month !== TEMPORARY_PTKD_MONTH) return null;
  return JULY_2026_PTKD_BY_GROUP.get(normalizeLookup(groupName)) ?? null;
}

export function applyTemporaryTeamLeaderPtkd<T extends { monthly: Record<string, any>; totalEstimatedReward?: number }>(
  result: T,
  month: string,
  groupName: string
): TemporaryMappedResult<T> {
  const override = getTemporaryTeamLeaderPtkd(month, groupName);
  if (!override) return result as TemporaryMappedResult<T>;
  const previousMonthlyReward = Number(result.monthly.reward) || 0;
  const totalEstimatedReward = result.totalEstimatedReward == null
    ? undefined
    : Math.max(0, Number(result.totalEstimatedReward) - previousMonthlyReward + override.reward);
  return {
    ...result,
    ...(totalEstimatedReward == null ? {} : { totalEstimatedReward }),
    monthly: {
      ...result.monthly,
      ip: override.fyp,
      fyp: override.fyp,
      hdc: override.hdc,
      rate: override.rate,
      fyc: override.fyc,
      reward: override.reward,
      source: "temporary-ptkd-2026-07",
      sourceLeaderName: override.leaderName
    }
  } as TemporaryMappedResult<T>;
}

export const temporaryTeamLeaderPtkdRows = JULY_2026_PTKD_ROWS;
