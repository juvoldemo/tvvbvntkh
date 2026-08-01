import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { InvitationHistoryAction } from "@/lib/invitation-types";
import { buildGuestDisplayName, isInvitationSalutation, normalizeGuestName, validateGuestName } from "@/lib/invitation-validation";

function unavailable(error: unknown) {
  console.error("Invitation history unavailable:", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Lịch sử thư mời chưa được cấu hình." }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const { data, error } = await getSupabaseAdmin().from("admin_invitation_history")
      .select("id,salutation,guest_name,display_name,created_by,created_at,downloaded_at,shared_at")
      .order("created_at", { ascending: false }).limit(10);
    if (error) throw error;
    return NextResponse.json({ history: data ?? [] });
  } catch (error) { return unavailable(error); }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const salutation = typeof record.salutation === "string" ? record.salutation : "";
  const guestName = normalizeGuestName(typeof record.guestName === "string" ? record.guestName : "");
  const action = record.action;
  if (!isInvitationSalutation(salutation) || validateGuestName(guestName) || (action !== "download" && action !== "share")) return NextResponse.json({ error: "Thông tin khách mời không hợp lệ." }, { status: 400 });
  try {
    const timestampColumn: Record<InvitationHistoryAction, string> = { download: "downloaded_at", share: "shared_at" };
    const { data, error } = await getSupabaseAdmin().from("admin_invitation_history").insert({
      salutation, guest_name: guestName, display_name: buildGuestDisplayName(salutation, guestName), [timestampColumn[action]]: new Date().toISOString()
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) { return unavailable(error); }
}
