import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSessionToken, isAdminRequest, isValidAdminPassword } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(request) });
}

export async function POST(request: NextRequest) {
  const { password = "" } = await request.json().catch(() => ({}));
  if (!isValidAdminPassword(String(password))) {
    return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
