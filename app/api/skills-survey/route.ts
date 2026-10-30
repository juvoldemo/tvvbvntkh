import { NextRequest, NextResponse } from "next/server";
import { userCodeFromRequest } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { evaluateSkillsSurvey } from "@/lib/skills-survey-scoring";
import { saveSkillsSurveyReport } from "@/lib/skills-survey-reports";

export async function POST(request: NextRequest) {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (payload?.advisorCode !== advisorCode) return NextResponse.json({ error: "Phiên đăng nhập đã thay đổi. Vui lòng mở lại khảo sát." }, { status: 409 });
  const answers = payload?.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers) || Object.keys(answers).length !== 24) {
    return NextResponse.json({ error: "Vui lòng trả lời đủ 24 câu khảo sát." }, { status: 400 });
  }
  const assessment = evaluateSkillsSurvey(answers);
  if (!assessment) return NextResponse.json({ error: "Câu trả lời khảo sát không hợp lệ." }, { status: 400 });
  try {
    const { data: profile, error } = await getSupabaseAdmin().from("authorized_users")
      .select("advisor_code,full_name,group_name,is_active").eq("advisor_code", advisorCode).single();
    if (error || !profile || !profile.is_active) return NextResponse.json({ error: "Tài khoản không còn quyền truy cập." }, { status: 403 });
    const updatedAt = new Date().toISOString();
    await saveSkillsSurveyReport({
      advisorCode: profile.advisor_code, advisorName: profile.full_name || profile.advisor_code,
      groupName: profile.group_name || "", answers,
      skillScores: assessment.skills.map((skill) => skill.score),
      total: assessment.total, average: assessment.average,
      classification: assessment.classification.label, scoringVersion: "sales-skills-v1", updatedAt
    });
    return NextResponse.json({ ok: true, updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa lưu được kết quả khảo sát. Vui lòng thử lại." }, { status: 503 });
  }
}
