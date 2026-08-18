import { NextResponse } from "next/server";

// Phân loại hiện được tổng hợp tự động từ dữ liệu nguồn trong API báo cáo.
export async function POST() {
  return NextResponse.json({ error: "Phân loại được hệ thống tự động xác định và không thể nhập thủ công." }, { status: 405 });
}
