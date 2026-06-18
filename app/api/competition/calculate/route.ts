import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveCompetition } from "@/src/lib/competition/competitionService";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown calculate competition error.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = String(body.program_id || body.programId || "").trim();
    const month = String(body.month || body.selectedMonth || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const calculatedBy = String(body.calculatedBy || "dashboard");
    if (!programId) return NextResponse.json({ error: "Thiếu program_id." }, { status: 400 });
    const result = await calculateAndSaveCompetition(programId, month, calculatedBy);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
