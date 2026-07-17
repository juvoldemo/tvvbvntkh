const BOARD_BY_LEADER: Record<string, { boardName: string; groups: string[] }> = {
  "huynh thi van anh": {
    boardName: "Hoàng Phát",
    groups: ["Hoàng Phát", "Nha Trang 4", "Nha Trang 5", "Nha Trang 5 Sao", "Quyết Thắng", "Thành Phú", "Thư Thịnh", "Thuận Phát"]
  },
  "nguyen thi minh trang": {
    boardName: "Nguyên Phát",
    groups: ["Nguyên Phát", "Duyên Phát", "Hiệp Phát", "Tài Phát"]
  },
  "luu thanh son": {
    boardName: "Tâm Phát",
    groups: ["Tâm Phát", "Đại Thắng", "Hồng Đức", "Hồng Phát", "Phát Thắng", "Tâm An", "Tâm Đức", "Tâm Nhiên"]
  }
};

export function normalizeBoardText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function managedBoardScope(fullName: unknown) {
  return BOARD_BY_LEADER[normalizeBoardText(fullName)] ?? null;
}
