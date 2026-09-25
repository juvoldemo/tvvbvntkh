import { NextRequest, NextResponse } from "next/server";
import { admVoteGroups, isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

const choices = new Set(["A", "T", "M"]);

export async function GET(request: NextRequest) {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase.from("authorized_users").select("advisor_code,full_name,group_name").eq("advisor_code", advisorCode).single();
  if (profileError || !profile) return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản." }, { status: 404 });
  const adoScope = managedAdoScope(profile.advisor_code, profile.full_name);
  const requestedScope = String(request.nextUrl.searchParams.get("scope") || "region").trim();
  const groups = adoScope?.groups ?? (profile.group_name ? [profile.group_name] : []);
  if (!groups.length) return NextResponse.json({ error: "Tài khoản chưa có thông tin nhóm." }, { status: 400 });
  const showCompany = Boolean(adoScope && requestedScope === "company");
  const admGroups = admVoteGroups(profile.advisor_code, profile.full_name);
  const showAdm = Boolean(admGroups && requestedScope === "adm");
  const { data: setting } = await supabase.from("class_vote_settings").select("is_locked,is_started").eq("id", true).maybeSingle();
  let votesQuery = supabase.from("class_votes").select("advisor_code,advisor_name,vote_choice").order("advisor_name");
  if (showAdm) votesQuery = votesQuery.in("group_name", admGroups ?? []);
  else if (!showCompany) votesQuery = adoScope ? votesQuery.in("group_name", groups) : votesQuery.eq("group_name", groups[0]);
  const { data, error } = await votesQuery;
  if (error) {
    if (error.message.includes("class_votes")) return NextResponse.json({ error: "Chưa cấu hình bảng bình chọn trên Supabase. Vui lòng áp dụng file supabase/class-votes.sql." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { count: companyRegisteredCount } = await supabase
    .from("class_votes")
    .select("advisor_code", { count: "exact", head: true });
  const votes = { A: [] as Array<{ advisorName: string; advisorCode: string }>, T: [] as Array<{ advisorName: string; advisorCode: string }>, M: [] as Array<{ advisorName: string; advisorCode: string }> };
  const registeredAdvisors: Array<{ advisorName: string; advisorCode: string }> = [];
  for (const vote of data ?? []) {
    registeredAdvisors.push({ advisorName: vote.advisor_name || vote.advisor_code, advisorCode: vote.advisor_code });
    if (vote.vote_choice in votes) votes[vote.vote_choice as "A" | "T" | "M"].push({ advisorName: vote.advisor_name || vote.advisor_code, advisorCode: vote.advisor_code });
  }
  return NextResponse.json({ scope: showCompany ? "company" : showAdm ? "adm" : "region", isAdo: Boolean(adoScope), canViewAdm: Boolean(admGroups), votes, registeredAdvisors, companyRegisteredCount: companyRegisteredCount ?? 0, isLocked: Boolean(setting?.is_locked), isStarted: Boolean(setting?.is_started) });
}

export async function POST(request: NextRequest) {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });

  const { choice } = await request.json().catch(() => ({}));
  if (!choices.has(choice)) return NextResponse.json({ error: "Lựa chọn bình chọn không hợp lệ." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: setting } = await supabase.from("class_vote_settings").select("is_locked,is_started").eq("id", true).maybeSingle();
  if (!setting?.is_started) return NextResponse.json({ error: "Banner chương trình hiện đang ẩn." }, { status: 403 });
  if (setting?.is_locked) return NextResponse.json({ error: "Bình chọn đã được quản trị viên khóa." }, { status: 403 });
  const { data: profile, error: profileError } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,group_name")
    .eq("advisor_code", advisorCode)
    .single();
  if (profileError || !profile) return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản." }, { status: 404 });
  if (isBossAccount(profile.advisor_code) || managedAdoScope(profile.advisor_code, profile.full_name)) {
    return NextResponse.json({ error: "Tài khoản ADO không tham gia bình chọn này." }, { status: 403 });
  }

  const { data: existingVote, error: existingError } = await supabase.from("class_votes")
    .select("vote_choice,change_count")
    .eq("advisor_code", profile.advisor_code)
    .maybeSingle();
  if (existingError) {
    if (existingError.message.includes("class_votes")) return NextResponse.json({ error: "Chưa cấu hình bảng bình chọn trên Supabase. Vui lòng áp dụng file supabase/class-votes.sql." }, { status: 503 });
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const isChanging = Boolean(existingVote && existingVote.vote_choice !== choice);
  if (isChanging && Number(existingVote?.change_count || 0) >= 1) {
    return NextResponse.json({ error: "Bạn đã sử dụng lượt thay đổi bình chọn. Không thể đổi thêm lần nữa." }, { status: 409 });
  }

  const record = {
    advisor_code: profile.advisor_code,
    advisor_name: profile.full_name || null,
    group_name: profile.group_name || null,
    vote_choice: choice,
    updated_at: new Date().toISOString()
  };
  const { error } = existingVote
    ? await supabase.from("class_votes").update({ ...record, change_count: Number(existingVote.change_count || 0) + (isChanging ? 1 : 0) }).eq("advisor_code", profile.advisor_code)
    : await supabase.from("class_votes").insert({ ...record, change_count: 0 });
  if (error) {
    if (error.message.includes("class_votes")) return NextResponse.json({ error: "Chưa cấu hình bảng bình chọn trên Supabase. Vui lòng áp dụng file supabase/class-votes.sql." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, choice, changesRemaining: Math.max(0, 1 - Number(existingVote?.change_count || 0) - (isChanging ? 1 : 0)) });
}
