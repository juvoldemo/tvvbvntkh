export const UPLOAD_USERS: Record<string, string> = {
  "4827": "Nguyễn Thị Mai Trang",
  "7391": "Nguyễn Thành Nhân",
  "1658": "Nguyễn Thóc",
  "9042": "Trần Xuân Thu",
  "3167": "Đinh Quốc Tiến",
  "5824": "Nguyễn Thị Trầm",
  "6419": "Phạm Thị Thành",
  "2705": "Nguyễn Hùng Phương",
  "8936": "Đỗ Thị Khánh Ngọc",
  "4572": "Nguyễn Hoàng Vũ",
  "1289": "Phan Hữu Tuân",
  "7064": "Trần Trịnh Thị Trinh",
  "9358": "Lê Thị Hòa",
  "2146": "Trần Huy Mạnh"
};

export function getUploadUserName(password: string) {
  return UPLOAD_USERS[password.trim()] ?? "";
}
