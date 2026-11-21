import { NextRequest, NextResponse } from "next/server";
import { fillMissingPasswords } from "@/lib/access-list-passwords";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { revealVisiblePassword } from "@/lib/user-auth";

const accessListFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,password_plain,is_active,created_at";
const accessListFallbackFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,is_active,created_at";

const canAccess = (request: NextRequest) => isAdminRequest(request);

function missingPasswordPlainColumn(error: unknown) {
  return Boolean(error && typeof error === "object" && "message" in error && String((error as { message?: string }).message || "").includes("password_plain"));
}

export async function GET(request: NextRequest) {
  if (!canAccess(request)) return NextResponse.json({ error: "Chưa xác thực quyền xem danh sách truy cập." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const users: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabase
      .from("authorized_users")
      .select(accessListFields)
      .order("full_name").order("id")
      .range(from, from + pageSize - 1);
    if (error && missingPasswordPlainColumn(error)) {
      const fallback = await supabase
        .from("authorized_users")
        .select(accessListFallbackFields)
        .order("full_name").order("id")
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
  const publicUsers = users.map(({ password_hash, ...user }) => user);
  return NextResponse.json({ users: publicUsers }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!canAccess(request)) return NextResponse.json({ error: "Chưa xác thực quyền xem danh sách truy cập." }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const rows: Record<string, unknown>[] = [];
    let hasPasswordPlainColumn = true;
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let { data, error } = await supabase.from("authorized_users")
        .select("id,password_hash,password_plain").order("id").range(from, from + pageSize - 1);
      if (error && missingPasswordPlainColumn(error)) {
        hasPasswordPlainColumn = false;
        const fallback = await supabase.from("authorized_users")
          .select("id,password_hash").order("id").range(from, from + pageSize - 1);
        data = fallback.data?.map((user) => ({ ...user, password_plain: null })) ?? [];
        error = fallback.error;
      }
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data ?? []).length < pageSize) break;
    }
    const pending = rows.filter((user) => !revealVisiblePassword(String(user.password_hash || "")) && !user.password_plain);
    const batch = pending.slice(0, 40);
    const count = await fillMissingPasswords(supabase, batch, hasPasswordPlainColumn);
    return NextResponse.json({ ok: true, count, remaining: pending.length > batch.length,
      users: batch.map((user) => ({ id: user.id, password_plain: user.password_plain }))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được mật khẩu random." }, { status: 500 });
  }
}
