import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

function safeFileName(value: unknown) {
  return String(value ?? "hoi-nghi-khach-hang")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "hoi-nghi-khach-hang";
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const code = userCodeFromRequest(request);
  if (!code) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("authorized_users").select("advisor_code,full_name").eq("advisor_code", code).maybeSingle();
  if (!profile || (!managedAdoScope(profile.advisor_code, profile.full_name) && !isBossAccount(code))) return NextResponse.json({ error: "Không có quyền xuất báo cáo hội nghị." }, { status: 403 });
  const { data: conference, error } = await supabase.from("customer_conferences")
    .select("id,ado_code,conference_name,date_from,date_to,source_file")
    .eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!conference) return NextResponse.json({ error: "Không tìm thấy hội nghị hoặc bạn không có quyền xuất file." }, { status: 404 });
  const { data: registrations, error: registrationError } = await supabase.from("customer_conference_registrations")
    .select("advisor_code,advisor_name,group_name,customer_name,registration_fee,note,note_updated_by,note_updated_at")
    .eq("conference_id", conference.id).order("created_at");
  if (registrationError) return NextResponse.json({ error: registrationError.message }, { status: 500 });
  const rows = (registrations ?? []).map((row) => ({
    "Mã TVV": row.advisor_code,
    "Tên TVV": row.advisor_name,
    "Nhóm": row.group_name,
    "Tên khách hàng": row.customer_name,
    "Phí đăng ký": Number(row.registration_fee) || 0,
    "Ghi chú": row.note || "",
    "Người cập nhật": row.note_updated_by || "",
    "Thời gian cập nhật": row.note_updated_at ? new Date(row.note_updated_at).toLocaleString("vi-VN") : ""
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: ["Mã TVV", "Tên TVV", "Nhóm", "Tên khách hàng", "Phí đăng ký", "Ghi chú", "Người cập nhật", "Thời gian cập nhật"] });
  worksheet["!cols"] = [{ wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 45 }, { wch: 18 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách đăng ký");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(output, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeFileName(conference.conference_name)}.xlsx"`,
    "Cache-Control": "no-store"
  }});
}
