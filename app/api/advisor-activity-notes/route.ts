import { NextRequest, NextResponse } from "next/server";
import { advisorIsInActorScope, getAdvisorActivityActor } from "@/lib/advisor-activity-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdvisorActivityActor(request);
    if (!actor) return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 401 });
    const advisorCode = String(request.nextUrl.searchParams.get("advisorCode") || "").trim().toUpperCase();
    if (!advisorCode || !(await advisorIsInActorScope(actor, advisorCode))) return NextResponse.json({ error: "TVV nằm ngoài phạm vi quản lý." }, { status: 403 });
    const { data, error } = await actor.supabase.from("advisor_activity_notes").select("id,advisor_code,source_role,note,created_by,created_at")
      .eq("advisor_code", advisorCode).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ notes: data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được ghi chú." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdvisorActivityActor(request);
    if (!actor) return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 401 });
    const body = await request.json();
    const advisorCode = String(body.advisorCode || "").trim().toUpperCase();
    const note = String(body.note || "").trim();
    if (!note) return NextResponse.json({ error: "Ghi chú không được để trống." }, { status: 400 });
    if (note.length > 4000) return NextResponse.json({ error: "Ghi chú tối đa 4.000 ký tự." }, { status: 400 });
    if (!(await advisorIsInActorScope(actor, advisorCode))) return NextResponse.json({ error: "TVV nằm ngoài phạm vi quản lý." }, { status: 403 });
    const { data, error } = await actor.supabase.from("advisor_activity_notes")
      .insert({ advisor_code: advisorCode, source_role: "ad", note, created_by: actor.name }).select("id,advisor_code,source_role,note,created_by,created_at").single();
    if (error) throw error;
    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không lưu được ghi chú." }, { status: 500 }); }
}
