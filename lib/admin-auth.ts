import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "bvnt_admin_session";

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "Bv123456@";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isValidAdminPassword(value: string) {
  return timingSafeEqual(digest(value), digest(adminPassword()));
}

export function adminSessionToken() {
  return createHash("sha256")
    .update(`bvnt-admin:${adminPassword()}:${process.env.SUPABASE_SERVICE_ROLE_KEY || "local"}`)
    .digest("hex");
}

export function isAdminRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value || "";
  const expected = adminSessionToken();
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
