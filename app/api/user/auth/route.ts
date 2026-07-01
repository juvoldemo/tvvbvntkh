import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, createUserToken, normalizeAdvisorCode, userCodeFromRequest, verifyPassword } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const code = userCodeFromRequest(request);
  return NextResponse.json({ authenticated: Boolean(code), advisorCode: code || null });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code = normalizeAdvisorCode(body.username);
  const password = String(body.password || "");
  const { data, error } = await getSupabaseAdmin()
    .from("authorized_users")
    .select("advisor_code,password_hash,is_active")
    .eq("advisor_code", code)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.is_active || !verifyPassword(password, data.password_hash || "")) {
    return NextResponse.json({ error: "Mã TVV hoặc mật khẩu không đúng." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, advisorCode: code });
  response.cookies.set(USER_COOKIE, createUserToken(code), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 30
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
