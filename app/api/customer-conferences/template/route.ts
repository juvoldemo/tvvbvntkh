import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    {
      "Mã TVV": "D102120554",
      "Tên TVV": "Đặng Thị Hoàng Lan",
      "Nhóm": "Tâm Phát",
      "Tên khách hàng": "Nguyễn Văn A",
      "Phí đăng ký": 500000
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 28 }, { wch: 16 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách đăng ký");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(output, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-hoi-nghi-khach-hang.xlsx"',
      "Cache-Control": "no-store"
    }
  });
}
