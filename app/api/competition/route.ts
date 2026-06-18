import { NextRequest, NextResponse } from "next/server";
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
    const programs = await listCompetitionPrograms();
    return NextResponse.json({ programs });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
