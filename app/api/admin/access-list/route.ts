import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeAdvisorCode, randomStrongPassword, revealVisiblePassword, visiblePasswordRecord } from "@/lib/user-auth";

const accessListFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,password_plain,is_active,created_at";
const accessListFallbackFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,is_active,created_at";

function missingPasswordPlainColumn(error: unknown) {
  return Boolean(error && typeof error === "object" && "message" in error && String((error as { message?: string }).message || "").includes("password_plain"));
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

function text(row: Record<string, unknown>, names: string[]) {
  const normalizedNames = names.map(normalizeHeader);
  const key = Object.keys(row).find((item) => normalizedNames.includes(normalizeHeader(item)));
  return key ? String(row[key] ?? "").trim() : "";
}

function dateValue(row: Record<string, unknown>, names: string[]) {
  const normalizedNames = names.map(normalizeHeader);
  const key = Object.keys(row).find((item) => normalizedNames.includes(normalizeHeader(item)));
  if (!key || row[key] === "") return null;
  const value = row[key];
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const month = first <= 12 ? first : second;
    const day = first <= 12 ? second : first;
    const candidate = `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsedCandidate = new Date(`${candidate}T00:00:00Z`);
    if (!Number.isNaN(parsedCandidate.getTime()) && parsedCandidate.toISOString().slice(0, 10) === candidate) return candidate;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function scoreUserRow(row: Record<string, unknown>) {
  return [
    row.full_name,
    row.group_name,
    row.start_date,
    row.advisor_status,
    row.advisor_position,
    row.position_effective_date,
    row.birth_day,
    row.birth_month
  ].reduce((score: number, value: unknown) => score + (value ? 1 : 0), 0);
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const users: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabase
      .from("authorized_users")
      .select(accessListFields)
      .order("full_name")
      .range(from, from + pageSize - 1);
    if (error && missingPasswordPlainColumn(error)) {
      const fallback = await supabase
        .from("authorized_users")
        .select(accessListFallbackFields)
        .order("full_name")
        .range(from, from + pageSize - 1);
      data = fallback.data?.map((user) => ({ ...user, password_plain: revealVisiblePassword(String(user.password_hash || "")) || null })) ?? [];
      error = fallback.error;
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data = (data ?? []).map((user) => ({
      ...user,
      password_plain: revealVisiblePassword(String(user.password_hash || "")) || user.password_plain || null
    }));
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
      advisor_code: normalizeAdvisorCode(text(row, ["ma tvv", "advisor_code", "code"])),
      full_name: text(row, ["ten tvv", "full_name", "name"]),
      group_name: text(row, ["nhom", "group_name", "group"]) || null,
      start_date: dateValue(row, ["ngay bat dau lam viec"]),
      advisor_status: text(row, ["trang thai tvv"]) || null,
      advisor_position: text(row, ["chuc vu tvv"]) || null,
      position_effective_date: dateValue(row, ["ngay hieu luc chuc vu"]),
      birth_day: Number(text(row, ["ngay sinh ( ngay )", "ngay sinh (ngay)"])) || null,
      birth_month: Number(text(row, ["ngay sinh ( thang )", "ngay sinh (thang)"])) || null,
      is_active: true
    })).filter((row) =>
      row.advisor_code &&
      row.full_name &&
      String(row.advisor_status || "").trim().toUpperCase() !== "PA"
    );
    const uniqueUsers = [...users.reduce((map, row) => {
      const current = map.get(row.advisor_code);
      if (!current || scoreUserRow(row) >= scoreUserRow(current)) map.set(row.advisor_code, row);
      return map;
    }, new Map<string, typeof users[number]>()).values()];
    if (!uniqueUsers.length) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu. File cần có cột “Mã TVV” và “Tên TVV”." }, { status: 422 });
    }

    const supabase = getSupabaseAdmin();
    let { data: existing, error: existingError } = await supabase.from("authorized_users").select("advisor_code,password_hash,password_plain");
    let hasPasswordPlainColumn = true;
    if (existingError && missingPasswordPlainColumn(existingError)) {
      const fallback = await supabase.from("authorized_users").select("advisor_code,password_hash");
      existing = fallback.data?.map((item) => ({ ...item, password_plain: revealVisiblePassword(String(item.password_hash || "")) || null })) ?? [];
      existingError = fallback.error;
      hasPasswordPlainColumn = false;
    }
    if (existingError) throw existingError;
    const passwords = new Map((existing ?? []).map((item) => [item.advisor_code, { hash: item.password_hash, plain: item.password_plain }]));
    const usersWithPasswords = uniqueUsers.map((user) => {
      const current = passwords.get(user.advisor_code);
      const plainPassword = current?.plain || randomStrongPassword();
      const currentVisibleHash = current?.plain ? current.hash : "";
      const passwordFields = hasPasswordPlainColumn
        ? { password_hash: currentVisibleHash || visiblePasswordRecord(plainPassword), password_plain: plainPassword }
        : { password_hash: currentVisibleHash || visiblePasswordRecord(plainPassword) };
      return { ...user, ...passwordFields, updated_at: new Date().toISOString() };
    });
    const { error: disableError } = await supabase.from("authorized_users").update({ is_active: false }).eq("is_active", true);
    if (disableError) throw disableError;
    const { error } = await supabase.from("authorized_users").upsert(usersWithPasswords, { onConflict: "advisor_code" });
    if (error) throw error;
    return NextResponse.json({ ok: true, count: uniqueUsers.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không đọc được file." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const rows: Array<{ id: string; advisor_code: string }> = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("authorized_users")
        .select("id,advisor_code")
        .eq("is_active", true)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data ?? []).length < pageSize) break;
    }

    const now = new Date().toISOString();
    const updates = rows.map((user) => {
      const password = randomStrongPassword();
      return {
        id: user.id,
        advisor_code: user.advisor_code,
        password_hash: visiblePasswordRecord(password),
        updated_at: now
      };
    });

    for (const update of updates) {
      const { error } = await supabase
        .from("authorized_users")
        .update({ password_hash: update.password_hash, updated_at: update.updated_at })
        .eq("id", update.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, count: updates.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được mật khẩu random." }, { status: 500 });
  }
}
