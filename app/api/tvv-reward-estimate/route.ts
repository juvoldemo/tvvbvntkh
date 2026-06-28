import { NextRequest, NextResponse } from "next/server";
import { monthBounds, toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { estimateRewardsForDraftContracts, type DraftRewardContract } from "@/lib/tvv-reward-estimator";

function programDateRange(program: any, month: string) {
  const rule = program.confirmed_rule || program.ai_rule || {};
  const bounds = monthBounds(month);
  return {
    start: String(program.start_date || rule.start_date || bounds.start).slice(0, 10),
    end: String(program.end_date || rule.end_date || bounds.end).slice(0, 10)
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const month = String(payload.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const advisor = {
      code: String(payload.advisor?.code || ""),
      name: String(payload.advisor?.name || ""),
      ban: String(payload.advisor?.ban || ""),
      group: String(payload.advisor?.group || ""),
      ads: String(payload.advisor?.ads || "")
    };
    const draftContracts = (Array.isArray(payload.draftContracts) ? payload.draftContracts : []) as DraftRewardContract[];
    if (!advisor.name && !advisor.code) {
      return NextResponse.json({ error: "Thiếu thông tin TVV." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: programs, error: programError } = await supabase
      .from("competition_programs")
      .select("*")
      .not("confirmed_rule", "is", null);
    if (programError) throw programError;

    const ranges = (programs ?? []).map((program: any) => programDateRange(program, month));
    const start = ranges.map((range) => range.start).sort()[0] || monthBounds(month).start;
    const end = ranges.map((range) => range.end).sort().at(-1) || monthBounds(month).end;
    const { data: contracts, error: contractError } = await supabase
      .from("revenue_records")
      .select("*")
      .gte("paid_date", start)
      .lte("paid_date", end);
    if (contractError) throw contractError;

    const result = estimateRewardsForDraftContracts({
      draftContracts,
      currentContracts: contracts ?? [],
      competitionRules: (programs ?? []).map((program: any) => ({
        id: program.id,
        programName: program.program_name || program.confirmed_rule?.program_name || "Chương trình thi đua",
        status: program.status,
        rule: {
          ...program.confirmed_rule,
          id: program.id,
          program_name: program.program_name || program.confirmed_rule?.program_name,
          start_date: program.start_date || program.confirmed_rule?.start_date,
          end_date: program.end_date || program.confirmed_rule?.end_date,
          issue_deadline: program.issue_deadline || program.confirmed_rule?.issue_deadline
        }
      })),
      advisor
    });

    return NextResponse.json({ month: toMonthStart(month).slice(0, 7), ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tính được thưởng dự kiến.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
