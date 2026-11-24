import { NextRequest, NextResponse } from "next/server";
import { fillMissingPasswords } from "@/lib/access-list-passwords";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { revealVisiblePassword, visiblePasswordRecord } from "@/lib/user-auth";

const accessListFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,password_plain,is_active,created_at";
const accessListFallbackFields = "id,advisor_code,full_name,group_name,start_date,advisor_status,advisor_position,position_effective_date,birth_day,birth_month,password_hash,is_active,created_at";

const canAccess = (request: NextRequest) => isAdminRequest(request);

export async function PATCH(request: NextRequest) {
  if (!canAccess(request)) return NextResponse.json({ error: "Chưa xác thực quyền quản trị." }, { status: 401 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || request.nextUrl.protocol.replace(/:$/, "");
  if (origin && origin !== `${protocol}://${host}`) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return NextResponse.json({ error: "Tài khoản không hợp lệ." }, { status: 400 });
  if (typeof body.password !== "string" || body.password.length < 4 || body.password.length > 128 || !body.password.trim()) return NextResponse.json({ error: "Mật khẩu cần từ 4 đến 128 ký tự." }, { status: 400 });
  try {
    const supabase = getSupabaseAdmin();
    const fields = { password_hash: visiblePasswordRecord(body.password), updated_at: new Date().toISOString() };
    let result = await supabase.from("authorized_users").update({ ...fields, password_plain: body.password }).eq("id", body.id).select("id").maybeSingle();
    if (result.error && missingPasswordPlainColumn(result.error)) result = await supabase.from("authorized_users").update(fields).eq("id", body.id).select("id").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
    return NextResponse.json({ ok: true, id: result.data.id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể đổi mật khẩu. Vui lòng thử lại." }, { status: 500 });
  }
}

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
