import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export const ADMIN_ACCESS_COOKIE = "bvnt_admin_access_session";
const accessPassword = () => process.env.ADMIN_ACCESS_PASSWORD || "159357";
const digest = (value: string) => createHash("sha256").update(value).digest();

export function isValidAccessPassword(value: string) {
  return timingSafeEqual(digest(value), digest(accessPassword()));
}

export function accessSessionToken() {
  return createHash("sha256").update(`bvnt-admin-access:${accessPassword()}:${process.env.SUPABASE_SERVICE_ROLE_KEY || "local"}`).digest("hex");
}

export function isAccessRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value || "";
  const expected = accessSessionToken();
  return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
