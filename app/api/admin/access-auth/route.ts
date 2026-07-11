import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE, accessSessionToken, isAccessRequest, isValidAccessPassword } from "@/lib/admin-access-auth";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(request) && isAccessRequest(request) });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!isValidAccessPassword(String(body.password || ""))) return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, accessSessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  return response;
}
