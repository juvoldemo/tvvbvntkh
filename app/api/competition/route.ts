import { siteHiddenCompetitionIds, setCompetitionSiteHidden } from "@/lib/competition-site-visibility";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCompetitionProgramDetail, listCompetitionPrograms } from "@/src/lib/competition/competitionService";
import { competitionIsVisibleTo, competitionViewerAudience, normalizeCompetitionAudience } from "@/lib/competition-audience";
import { isAdminRequest } from "@/lib/admin-auth";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown competition error.";
}

export async function GET(request: NextRequest) {
  try {
    const admin = isAdminRequest(request);
    const viewerAudience = admin ? "team_leader" : await competitionViewerAudience(request);
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const detail = await getCompetitionProgramDetail(id);
      if (!admin && (detail.program.isHidden || (await siteHiddenCompetitionIds()).has(id) || !competitionIsVisibleTo(detail.program, viewerAudience))) return NextResponse.json({ error: "Không tìm thấy chương trình." }, { status: 404 });
      return NextResponse.json(detail);
    }
    const includeHidden = admin && request.nextUrl.searchParams.get("includeHidden") === "1";
    const programs = await listCompetitionPrograms({ includeHidden, viewerAudience });
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
    if ("site_hidden" in body) {
      if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (typeof body.site_hidden !== "boolean") return NextResponse.json({ error: "Invalid site_hidden" }, { status: 400 });
      if (!("display_audience" in body) && !("displayAudience" in body)) {
        await setCompetitionSiteHidden(programId, body.site_hidden);
        return NextResponse.json({ ok: true });
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("is_hidden" in body || "isHidden" in body) updates.is_hidden = Boolean(body.is_hidden ?? body.isHidden);
    if ("display_audience" in body || "displayAudience" in body) {
      if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
      updates.display_audience = normalizeCompetitionAudience(body.display_audience ?? body.displayAudience);
    }
    const { data, error } = await getSupabaseAdmin()
      .from("competition_programs")
      .update(updates)
      .eq("id", programId)
      .select("*")
      .single();
    if (error) throw error;
    if ("site_hidden" in body) await setCompetitionSiteHidden(programId, body.site_hidden);
    return NextResponse.json({ program: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const programId = String(request.nextUrl.searchParams.get("id") || "").trim();
    if (!programId) return NextResponse.json({ error: "Thiếu program_id." }, { status: 400 });

    const { error } = await getSupabaseAdmin()
      .from("competition_programs")
      .delete()
      .eq("id", programId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
