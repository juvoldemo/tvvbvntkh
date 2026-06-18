import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown confirm rule error.";
}

function validateRule(rule: any) {
  if (!rule || typeof rule !== "object") throw new Error("Rule JSON không hợp lệ.");
  for (const key of ["program_name", "start_date", "end_date", "reward_rules"]) {
    if (!(key in rule)) throw new Error(`Rule JSON thiếu trường ${key}.`);
  }
  if (!Array.isArray(rule.reward_rules)) throw new Error("reward_rules phải là mảng.");
  return rule;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = String(body.program_id || body.programId || "").trim();
    if (!programId) return NextResponse.json({ error: "Thiếu program_id." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: currentProgram, error: currentError } = await supabase
      .from("competition_programs")
      .select("ai_rule, confirmed_rule")
      .eq("id", programId)
      .single();
    if (currentError) throw new Error(errorMessage(currentError));

    const requestedRule = body.confirmed_rule ?? body.confirmedRule;
    const confirmedRule = validateRule(requestedRule ?? currentProgram?.confirmed_rule ?? currentProgram?.ai_rule);
    const { data, error } = await supabase
      .from("competition_programs")
      .update({
        confirmed_rule: confirmedRule,
        program_name: confirmedRule.program_name,
        status: "Đã xác nhận rule",
        start_date: confirmedRule.start_date || null,
        end_date: confirmedRule.end_date || null,
        issue_deadline: confirmedRule.issue_deadline || null,
        target_types: confirmedRule.target_types || [],
        confidence: Number(confirmedRule.confidence ?? 0),
        needs_review: Boolean(confirmedRule.needs_review ?? false),
        updated_at: new Date().toISOString()
      })
      .eq("id", programId)
      .select("*")
      .single();
    if (error) throw new Error(errorMessage(error));
    return NextResponse.json({ program: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
