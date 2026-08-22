import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import recoveryIdentifiers from "@/data/password-recovery-identifiers.json";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeAdvisorCode, revealVisiblePassword } from "@/lib/user-auth";

const identifiers = new Map(
  recoveryIdentifiers.map((item) => [normalizeAdvisorCode(item.advisorCode), String(item.identifier).trim()])
);

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function isBlocked(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt <= now) {
    attempts.delete(key);
    return false;
  }
  return Boolean(current && current.count >= MAX_ATTEMPTS);
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  const next = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + ATTEMPT_WINDOW_MS }
    : { ...current, count: current.count + 1 };
  attempts.set(key, next);
  return next.count >= MAX_ATTEMPTS;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const key = requesterKey(request);
  if (isBlocked(key)) {
    return NextResponse.json(
      { error: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const advisorCode = normalizeAdvisorCode(body.advisorCode);
  const identifier = String(body.identifier ?? "").trim();
  const expectedIdentifier = identifiers.get(advisorCode);
  const invalidMessage = "Mã TVV hoặc mã số không đúng.";

  if (!advisorCode || !identifier || !expectedIdentifier || !safeEqual(identifier, expectedIdentifier)) {
    if (registerFailedAttempt(key)) {
      return NextResponse.json(
        { error: "Bạn đã nhập sai 3 lần. Vui lòng thử lại sau 15 phút." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: invalidMessage }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  let { data, error } = await supabase
    .from("authorized_users")
    .select("password_hash,password_plain,is_active")
    .eq("advisor_code", advisorCode)
    .maybeSingle();

  if (error && error.message.includes("password_plain")) {
    const fallback = await supabase
      .from("authorized_users")
      .select("password_hash,is_active")
      .eq("advisor_code", advisorCode)
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, password_plain: null } : null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: "Không thể lấy mật khẩu lúc này." }, { status: 500 });
  if (!data?.is_active) {
    if (registerFailedAttempt(key)) {
      return NextResponse.json(
        { error: "Bạn đã nhập sai 3 lần. Vui lòng thử lại sau 15 phút." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: invalidMessage }, { status: 401 });
  }

  const password = revealVisiblePassword(String(data.password_hash || "")) || String(data.password_plain || "");
  if (!password) {
    return NextResponse.json(
      { error: "Tài khoản này chưa có mật khẩu có thể lấy lại. Vui lòng liên hệ quản trị viên." },
      { status: 409 }
    );
  }

  attempts.delete(key);
  return NextResponse.json({ password }, { headers: { "Cache-Control": "no-store" } });
}
