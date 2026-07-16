const TEAM_BY_LEADER_CODE: Record<string, string> = {
  D251200445: "Phát Thắng",
  D251143802: "Ánh Dương",
  D1021A3RSK: "Sen Vàng",
  D246402676: "Sao Mai",
  D102146543: "Tâm Nhiên",
  D1021A37H6: "Hồng Đức",
  D102116393: "Thành Phú",
  D102114757: "Nha Trang 5",
  D251420618: "Thư Thịnh",
  D102141858: "Hiệp Phát",
  D102101753: "Thuận Phát",
  D102143412: "Duyên Phát",
  D102141867: "Tài Phát",
  D102122613: "Tấn Phát",
  D102144961: "Đại Thắng",
  D102126424: "Hùng Phát",
  D251500997: "Tâm An",
  D102104583: "Quyết Thắng",
  D102104033: "Nha Trang 4",
  D251185646: "Nha Trang 5 Sao",
  D1021A3KRX: "Hồng Phát",
  D102100541: "Hưng Thịnh",
  D248679542: "Tâm Đức"
};

const TEAM_BY_BOARD_LEADER_NAME: Record<string, string> = {
  "luu thanh son": "Tâm Phát",
  "nguyen thi minh trang": "Nguyên Phát",
  "huynh thi van anh": "Hoàng Phát"
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function managedTeamName(advisorCode: unknown, position?: unknown, fullName?: unknown, groupName?: unknown) {
  const normalizedPosition = normalizeText(position);
  const codeGroup = TEAM_BY_LEADER_CODE[String(advisorCode ?? "").trim().toUpperCase()] ?? "";
  const explicitGroup = String(groupName ?? "").trim();
  if (normalizedPosition === "truong nhom") return codeGroup || explicitGroup;
  if (normalizedPosition === "truong ban") {
    return TEAM_BY_BOARD_LEADER_NAME[normalizeText(fullName)] ?? (codeGroup || explicitGroup);
  }
  return "";
}
