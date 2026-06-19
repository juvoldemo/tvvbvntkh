import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCompetitionProgramDetail, listCompetitionPrograms } from "@/src/lib/competition/competitionService";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown competition error.";
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const detail = await getCompetitionProgramDetail(id);
      return NextResponse.json(detail);
    }
    const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "1";
    const programs = await listCompetitionPrograms({ includeHidden });
    return NextResponse.json({ programs });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = String(body.program_id || body.programId || "").trim();
    if (!programId) return NextResponse.json({ error: "Thiếu program_id." }, { status: 400 });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("is_hidden" in body || "isHidden" in body) updates.is_hidden = Boolean(body.is_hidden ?? body.isHidden);
    const { data, error } = await getSupabaseAdmin()
      .from("competition_programs")
      .update(updates)
      .eq("id", programId)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ program: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
