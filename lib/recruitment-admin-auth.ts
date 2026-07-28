import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export const RECRUITMENT_ADMIN_COOKIE = "bvnt_recruitment_admin_session";

function recruitmentAdminPassword() {
  return process.env.RECRUITMENT_ADMIN_PASSWORD || "05Hv@";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isValidRecruitmentAdminPassword(value: string) {
  return timingSafeEqual(digest(value), digest(recruitmentAdminPassword()));
}

export function recruitmentAdminSessionToken() {
  return createHash("sha256")
    .update(`bvnt-recruitment-admin:${recruitmentAdminPassword()}:${process.env.SUPABASE_SERVICE_ROLE_KEY || "local"}`)
    .digest("hex");
}

export function isRecruitmentAdminRequest(request: NextRequest) {
  const token = request.cookies.get(RECRUITMENT_ADMIN_COOKIE)?.value || "";
  const expected = recruitmentAdminSessionToken();
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
