import { NextRequest, NextResponse } from "next/server";
import { findDiscussionGroup } from "@/lib/hoidap";
import { getSupabaseAdmin } from "@/lib/supabase";
import { activeDiscussionProgram, discussionTable } from "@/lib/hoidap-server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json({ error: "Chưa kết nối được nơi lưu bài trả lời. Bản nháp vẫn ở thiết bị này. Vui lòng liên hệ người tổ chức hoặc thử lại sau." }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get("group") || "";
  if (!findDiscussionGroup(group)) return NextResponse.json({ error: "Nhóm không hợp lệ." }, { status: 400 });
  try {
    const program = await activeDiscussionProgram();
    if (request.nextUrl.searchParams.has("program") && Number(request.nextUrl.searchParams.get("program")) !== program) return NextResponse.json({ error: "Chương trình đã thay đổi. Vui lòng đợi giao diện cập nhật." }, { status: 409 });
    const { data, error } = await getSupabaseAdmin().from(discussionTable(program))
      .select("answers,updated_at").eq("group_slug", group).maybeSingle();
    if (error) return unavailable();
    return NextResponse.json({ program, answers: data?.answers ?? null, updatedAt: data?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  // Bound the streamed body as Content-Length is optional and cannot be trusted.
  let body = "";
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Thiếu nội dung trả lời." }, { status: 400 });
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 150000) {
        await reader.cancel();
        return NextResponse.json({ error: "Nội dung vượt quá giới hạn cho phép." }, { status: 413 });
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return NextResponse.json({ error: "Không đọc được nội dung trả lời." }, { status: 400 });
  }
  let payload;
  try { payload = JSON.parse(body); } catch {
    return NextResponse.json({ error: "Nội dung gửi không hợp lệ." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || typeof payload.group !== "string" || !findDiscussionGroup(payload.group)) {
    return NextResponse.json({ error: "Nhóm không hợp lệ." }, { status: 400 });
  }
  const requestedProgram = payload.program ?? 1;
  if (![1, 2].includes(requestedProgram) || !Array.isArray(payload.answers) || payload.answers.length !== (requestedProgram === 2 ? 1 : 3) || payload.answers.some((answer: unknown) => typeof answer !== "string" || !answer.trim() || answer.length > 10000)) {
    return NextResponse.json({ error: "Vui lòng trả lời đầy đủ, tối đa 10.000 ký tự mỗi câu." }, { status: 400 });
  }
  try {
    const program = await activeDiscussionProgram();
    if (program !== requestedProgram) return NextResponse.json({ error: "Chương trình đã thay đổi. Vui lòng đợi giao diện cập nhật rồi gửi lại." }, { status: 409 });
    const { error } = await getSupabaseAdmin().from(discussionTable(program)).upsert({
      group_slug: payload.group,
      answers: payload.answers.map((answer: string) => answer.trim()),
      updated_at: new Date().toISOString()
    }, { onConflict: "group_slug" });
    if (error) return unavailable();
    return NextResponse.json({ ok: true });
  } catch {
    return unavailable();
  }
}
