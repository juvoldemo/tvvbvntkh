import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword, normalizeAdvisorCode } from "@/lib/user-auth";

function text(row: Record<string, unknown>, names: string[]) {
  const key = Object.keys(row).find((item) => names.includes(item.trim().toLowerCase()));
  return key ? String(row[key] ?? "").trim() : "";
}

function dateValue(row: Record<string, unknown>, names: string[]) {
  const key = Object.keys(row).find((item) => names.includes(item.trim().toLowerCase()));
  if (!key || row[key] === "") return null;
  const value = row[key];
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const users: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("authorized_users")
      .select("id,advisor_code,full_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,is_active,created_at")
      .order("full_name")
      .range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    users.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Vui lòng chọn file Excel hoặc CSV." }, { status: 400 });

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
    const users = rows.map((row) => ({
      advisor_code: normalizeAdvisorCode(text(row, ["mã tvv", "ma tvv", "advisor_code", "code"])),
      full_name: text(row, ["tên tvv", "ten tvv", "full_name", "name"]),
      start_date: dateValue(row, ["ngày bắt đầu làm việc", "ngay bat dau lam viec"]),
      advisor_status: text(row, ["trạng thái tvv", "trang thai tvv"]) || null,
      advisor_position: text(row, ["chức vụ tvv", "chuc vu tvv"]) || null,
      position_effective_date: dateValue(row, ["ngày hiệu lực chức vụ", "ngay hieu luc chuc vu"]),
      birth_day: Number(text(row, ["ngày sinh ( ngày )", "ngày sinh (ngày)", "ngay sinh ( ngay )", "ngay sinh (ngay)"])) || null,
      birth_month: Number(text(row, ["ngày sinh ( tháng )", "ngày sinh (tháng)", "ngay sinh ( thang )", "ngay sinh (thang)"])) || null,
      is_active: true
    })).filter((row) =>
      row.advisor_code &&
      row.full_name &&
      String(row.advisor_status || "").trim().toUpperCase() !== "PA"
    );
    if (!users.length) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu. File cần có cột “Mã TVV” và “Tên TVV”." }, { status: 422 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("authorized_users").select("advisor_code,password_hash");
    const passwords = new Map((existing ?? []).map((item) => [item.advisor_code, item.password_hash]));
    const defaultPasswordHash = hashPassword("123456");
    const usersWithPasswords = users.map((user) => ({ ...user, password_hash: passwords.get(user.advisor_code) || defaultPasswordHash, updated_at: new Date().toISOString() }));
    const { error: disableError } = await supabase.from("authorized_users").update({ is_active: false }).eq("is_active", true);
    if (disableError) throw disableError;
    const { error } = await supabase.from("authorized_users").upsert(usersWithPasswords, { onConflict: "advisor_code" });
    if (error) throw error;
    return NextResponse.json({ ok: true, count: users.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không đọc được file." }, { status: 500 });
  }
}
