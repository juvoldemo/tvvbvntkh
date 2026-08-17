import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export const USER_COOKIE = "bvnt_user_session";

function secret() {
  return process.env.USER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "bvnt-local-secret";
}

export function normalizeAdvisorCode(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "").toUpperCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

const VISIBLE_PASSWORD_PREFIX = "plain:";

export function visiblePasswordRecord(password: string) {
  return `${VISIBLE_PASSWORD_PREFIX}${Buffer.from(password, "utf8").toString("base64url")}`;
}

export function revealVisiblePassword(stored: string) {
  if (!stored.startsWith(VISIBLE_PASSWORD_PREFIX)) return "";
  try {
    return Buffer.from(stored.slice(VISIBLE_PASSWORD_PREFIX.length), "base64url").toString("utf8");
  } catch {
    return "";
  }
}

export function randomStrongPassword(length = 12) {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%^&*_-+=?"
  ];
  const alphabet = groups.join("");
  const chars = groups.map((group) => group[randomBytes(1)[0] % group.length]);
  while (chars.length < length) chars.push(alphabet[randomBytes(1)[0] % alphabet.length]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBytes(1)[0] % (index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
}

export function verifyPassword(password: string, stored: string) {
  const visiblePassword = revealVisiblePassword(stored);
  if (visiblePassword) {
    return Buffer.byteLength(password) === Buffer.byteLength(visiblePassword)
      && timingSafeEqual(Buffer.from(password), Buffer.from(visiblePassword));
  }
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function createUserToken(code: string) {
  const normalized = normalizeAdvisorCode(code);
  const signature = createHmac("sha256", secret()).update(normalized).digest("hex");
  return `${normalized}.${signature}`;
}

export function userCodeFromRequest(request: NextRequest) {
  const token = request.cookies.get(USER_COOKIE)?.value || "";
  const separator = token.lastIndexOf(".");
  if (separator < 1) return "";
  const code = normalizeAdvisorCode(token.slice(0, separator));
  const supplied = token.slice(separator + 1);
  const expected = createHmac("sha256", secret()).update(code).digest("hex");
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) ? code : "";
}
