import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { deleteAllSkillsSurveyReports, listSkillsSurveyReports } from "@/lib/skills-survey-reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  try {
    return NextResponse.json({ reports: await listSkillsSurveyReports() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể tải kết quả khảo sát. Vui lòng thử lại." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (payload?.confirm !== "delete-all-survey-results") return NextResponse.json({ error: "Chưa xác nhận xoá toàn bộ kết quả khảo sát." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, deleted: await deleteAllSkillsSurveyReports() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa xoá được toàn bộ kết quả. Vui lòng làm mới và thử lại." }, { status: 503 });
  }
}
