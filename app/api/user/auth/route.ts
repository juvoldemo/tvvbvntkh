import { NextRequest, NextResponse } from "next/server";
import { ADO_ACCOUNT_SEEDS } from "@/lib/ado-scope";
import { getSupabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, createUserToken, normalizeAdvisorCode, userCodeFromRequest, verifyPassword, visiblePasswordRecord } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const code = userCodeFromRequest(request);
  return NextResponse.json({ authenticated: Boolean(code), advisorCode: code || null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = normalizeAdvisorCode(body.username);
    const password = String(body.password || "");
    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from("authorized_users")
      .select("advisor_code,password_hash,is_active")
      .eq("advisor_code", code)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Không thể kiểm tra thông tin đăng nhập. Vui lòng thử lại." }, { status: 500 });
    const adoSeed = ADO_ACCOUNT_SEEDS.find((seed) => normalizeAdvisorCode(seed.advisor_code) === code);
    if (adoSeed && !data?.is_active) {
      const account = data
        ? await supabase.from("authorized_users").update({
            full_name: adoSeed.full_name,
            group_name: adoSeed.group_name,
            advisor_position: adoSeed.advisor_position,
            is_active: true,
            updated_at: new Date().toISOString()
          }).eq("advisor_code", code).select("advisor_code,password_hash,is_active").single()
        : await supabase.from("authorized_users").insert({
            ...adoSeed,
            advisor_code: code,
            password_hash: visiblePasswordRecord("0000"),
            is_active: true,
            updated_at: new Date().toISOString()
          }).select("advisor_code,password_hash,is_active").single();
      if (account.error) return NextResponse.json({ error: "Không thể kích hoạt tài khoản ADO. Vui lòng thử lại." }, { status: 500 });
      data = account.data;
    }
    if (!data?.is_active) {
      return NextResponse.json({ error: "Mã TVV không đúng hoặc chưa được kích hoạt.", field: "username" }, { status: 401 });
    }
    if (!verifyPassword(password, data.password_hash || "")) {
      return NextResponse.json({ error: "Mật khẩu không đúng.", field: "password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, advisorCode: code });
    response.cookies.set(USER_COOKIE, createUserToken(code), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Không thể kết nối đến dịch vụ đăng nhập. Vui lòng thử lại." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
