import { NextRequest, NextResponse } from "next/server";
import {
  isRecruitmentAdminRequest,
  isValidRecruitmentAdminPassword,
  RECRUITMENT_ADMIN_COOKIE,
  recruitmentAdminSessionToken
} from "@/lib/recruitment-admin-auth";
import { userCodeFromRequest } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: Boolean(userCodeFromRequest(request)) && isRecruitmentAdminRequest(request)
  });
}

export async function POST(request: NextRequest) {
  if (!userCodeFromRequest(request)) {
    return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản Trưởng nhóm." }, { status: 401 });
  }
  const { password = "" } = await request.json().catch(() => ({}));
  if (!isValidRecruitmentAdminPassword(String(password))) {
    return NextResponse.json({ error: "Mật khẩu quản trị không đúng." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RECRUITMENT_ADMIN_COOKIE, recruitmentAdminSessionToken(), {
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
  response.cookies.set(RECRUITMENT_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
  return response;
}
