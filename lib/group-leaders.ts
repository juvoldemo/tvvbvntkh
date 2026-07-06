const GROUP_LEADER_BY_NORMALIZED_NAME: Record<string, string> = {
  "tam phat": "Lưu Thanh Sơn",
  "hoang phat": "Huỳnh Thị Vân Anh",
  "nha trang 5": "Lương Thị Thái",
  "quyet thang": "Phạm Thu",
  "thanh phu": "Lê Thị Tình",
  "hong duc": "Lê Thị Thành",
  "tan phat": "Nguyễn Thị Thu Thảo",
  "nguyen phat": "Nguyễn Thị Minh Trang",
  "hung thinh": "Trần Thị Xuân Thu",
  "sao mai": "Hoàng Huyền Trang",
  "thuan phat": "Nguyễn Thị Nga",
  "nha trang 4": "Thái Thị Tứ",
  "sen vang": "Đoàn Thị Mỹ Châu",
  "anh duong": "Đoàn Thị Kim Thúy",
  "tam an": "Nguyễn Võ Thanh Thúy",
  "hung phat": "Nguyễn Thiện Tín",
  "hong phat": "Trần Thị Ngọc Anh",
  "tai phat": "Nguyễn Thị Thu Diệu",
  "nha trang 5 sao": "Trần Thị Mỹ Vân",
  "thu phat": "Nguyễn Thị Minh Thư",
  "thu thinh": "Nguyễn Thị Minh Thư",
  "duyen phat": "Nguyễn Thị Ngọc Duyên",
  "phat thang": "Đoàn Thị Bích",
  "tam nhien": "Lê Thị Hồng Đào",
  "hiep phat": "Nguyễn Thị Mỹ Loan",
  "dai thang": "Nguyễn Thị Trang Châu"
};

export function groupLeaderName(groupName: unknown) {
  const normalizedGroupName = String(groupName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
  return GROUP_LEADER_BY_NORMALIZED_NAME[normalizedGroupName] ?? "-";
}
