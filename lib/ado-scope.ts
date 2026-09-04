export type AdoScope = {
  username: string;
  fullName: string;
  department: string;
  groups: string[];
};

const ADO_SCOPES: AdoScope[] = [
  {
    username: "nguyenthimaitrang",
    fullName: "Nguyễn Thị Mai Trang",
    department: "PTKD 1",
    groups: ["Banca", "Hoàng Phát", "Quyết Thắng"],
  },
  {
    username: "nguyenthitram",
    fullName: "Nguyễn Thị Trầm",
    department: "PTKD 1",
    groups: ["Nha Trang 4", "Nha Trang 5", "Nha Trang 5 Sao", "Thư Thịnh"]
  },
  {
    username: "nguyenthanhnhan",
    fullName: "Nguyễn Thành Nhân",
    department: "PTKD 2",
    groups: ["Thành Phú", "Thuận Phát", "Duyên Phát", "Hiệp Phát", "Nguyên Phát", "Tài Phát"],
  },
  {
    username: "dinhquoctien",
    fullName: "Đinh Quốc Tiến",
    department: "PTKD 1",
    groups: ["Ánh Dương", "Hưng Thịnh", "Sao Mai", "Sen Vàng"]
  },
  {
    username: "tranxuanthu",
    fullName: "Trần Xuân Thu",
    department: "PTKD 2",
    groups: ["Đại Thắng", "Hồng Đức", "Phát Thắng", "Tâm Đức"]
  },
  {
    username: "nguyenthoc",
    fullName: "Nguyễn Thóc",
    department: "PTKD 2",
    groups: ["Hồng Phát", "Tâm An", "Tâm Nhiên", "Tâm Phát", "Hùng Phát", "Tấn Phát"],
  }
];

export function normalizeAdoText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

export function managedAdoScope(advisorCode: unknown, fullName?: unknown) {
  const normalizedCode = normalizeAdoText(advisorCode);
  const normalizedName = normalizeAdoText(fullName);
  return ADO_SCOPES.find((scope) =>
    normalizeAdoText(scope.username) === normalizedCode
    || normalizeAdoText(scope.fullName) === normalizedName
  ) ?? null;
}

export function isBossAccount(advisorCode: unknown) {
  return normalizeAdoText(advisorCode) === "boss";
}

export const ADO_ACCOUNT_SEEDS = ADO_SCOPES.map(({ username, fullName, department }) => ({
  advisor_code: username,
  full_name: fullName,
  group_name: department,
  advisor_position: "ADO"
}));

export const MANAGEMENT_ACCOUNT_SEEDS = [
  ...ADO_ACCOUNT_SEEDS,
  {
    advisor_code: "boss",
    full_name: "Boss",
    group_name: "Toàn công ty",
    advisor_position: "BOSS"
  }
];
