import { NextRequest, NextResponse } from "next/server";
import { userCodeFromRequest } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readBanDinhSession, readBanDinhSettings } from "@/lib/ban-dinh-server";
import { validBanDinhCounts } from "@/lib/ban-dinh";
import { canViewBanDinh } from "@/lib/ban-dinh-access";

export const dynamic = "force-dynamic";
const bucket = "ban-dinh-reports";
async function owner(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return { error: "Bạn chưa đăng nhập.", status: 401 };
  const { data, error } = await getSupabaseAdmin().from("authorized_users").select("advisor_code,is_active").eq("advisor_code", code).single();
  if (error || !data?.is_active) return { error: "Tài khoản không còn quyền truy cập.", status: 403 };
  if (!canViewBanDinh(request, await readBanDinhSettings())) return { error: "Bán đỉnh 3.0 hiện chưa mở cho tài khoản của bạn.", status: 403 };
  return { code };
}
export async function GET(request: NextRequest) {
  try {
    const user = await owner(request);
    if (!user.code) return NextResponse.json({ error: user.error }, { status: user.status });
    const session = await readBanDinhSession();
    const { data, error } = await getSupabaseAdmin().storage.from(bucket).download(`${session.reportPrefix || "latest"}/${encodeURIComponent(user.code)}.json`, { cacheNonce: crypto.randomUUID() }, { cache: "no-store" });
    if (error) {
      if (["404", "400"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) return NextResponse.json({ entry: null, session: await readBanDinhSession() }, { headers: { "Cache-Control": "no-store" } });
      throw error;
    }
    const entry = JSON.parse(await data.text());
    if (entry?.advisorCode !== user.code || !validBanDinhCounts(entry)) throw new Error("Invalid saved data");
    return NextResponse.json({ entry, session: await readBanDinhSession() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không tải được số liệu. Vui lòng thử lại." }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  try {
    const user = await owner(request);
    if (!user.code) return NextResponse.json({ error: user.error }, { status: user.status });
    const session = await readBanDinhSession();
    if (!session.running) return NextResponse.json({ error: "Chưa bắt đầu hoặc đã kết thúc nhận số liệu.", session }, { status: 409 });
    const body: unknown = await request.json().catch(() => null);
    if (!validBanDinhCounts(body)) return NextResponse.json({ error: "Vui lòng nhập số nguyên không âm cho cả hai nội dung." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const created = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: 16384, allowedMimeTypes: ["application/json"] });
    if (created.error && !/already exists|duplicate/i.test(created.error.message)) throw created.error;
    const entry = { advisorCode: user.code, consultations: body.consultations, contracts: body.contracts, updatedAt: new Date().toISOString() };
    const latestSession = await readBanDinhSession();
    if (!latestSession.running || latestSession.startedAt !== session.startedAt || latestSession.reportPrefix !== session.reportPrefix) return NextResponse.json({ error: "Đã kết thúc nhận số liệu.", session: latestSession }, { status: 409 });
    const { error } = await supabase.storage.from(bucket).upload(`${session.reportPrefix || "latest"}/${encodeURIComponent(user.code)}.json`, JSON.stringify(entry), { contentType: "application/json", cacheControl: "0", upsert: false });
    if (error && (/already exists|duplicate/i.test(error.message) || String((error as { statusCode?: string }).statusCode) === "409")) return NextResponse.json({ error: "Bạn đã xác nhận số liệu. Cảm ơn bạn!", submitted: true, session }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ entry }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Chưa lưu được số liệu. Vui lòng thử lại." }, { status: 503 }); }
}
