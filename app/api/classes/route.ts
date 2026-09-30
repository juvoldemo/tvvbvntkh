import { NextRequest, NextResponse } from "next/server";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

const TRAINING_LOCATIONS = new Set(["Trụ sở BVNT Khánh Hoà", "VPKV Cam Ranh", "VPKV Diên Khánh", "VPKV Ninh Hoà", "VPKV Vạn Ninh"]);
const TRAINING_INSTRUCTORS = new Set(["Đỗ Thị Khánh Ngọc", "Nguyễn Thóc", "Nguyễn Thị Mai Trang", "Nguyễn Thành Nhân", "Đinh Quốc Tiến", "Trần Xuân Thu", "Nguyễn Thị Trầm"]);

async function access(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("authorized_users").select("advisor_code,full_name").eq("advisor_code", code).maybeSingle();
  if (!data || (!managedAdoScope(data.advisor_code, data.full_name) && !isBossAccount(code))) return null;
  return supabase;
}

export async function GET(request: NextRequest) {
  const supabase = await access(request);
  if (!supabase) return NextResponse.json({ error: "Không có quyền truy cập lịch đào tạo." }, { status: 403 });
  const month = new URL(request.url).searchParams.get("month");
  const query = supabase.from("class_schedules").select("id,class_name,instructor_name,location,scheduled_at,created_at").order("scheduled_at");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNo] = month.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, monthNo, 1)).toISOString().slice(0, 10);
    query.gte("scheduled_at", `${month}-01`).lt("scheduled_at", nextMonth);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const supabase = await access(request);
  if (!supabase) return NextResponse.json({ error: "Không có quyền đăng ký đào tạo." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const class_name = String(body?.className || "").trim();
  const instructor_name = String(body?.instructorName || "").trim();
  const location = String(body?.location || "").trim();
  const scheduled_at = String(body?.scheduledAt || "");
  if (!class_name || !instructor_name || !location || !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_at)) {
    return NextResponse.json({ error: "Vui lòng nhập đủ ngày đăng ký, nội dung, địa chỉ và giảng viên." }, { status: 400 });
  }
  if (!TRAINING_LOCATIONS.has(location) || !TRAINING_INSTRUCTORS.has(instructor_name)) {
    return NextResponse.json({ error: "Vui lòng chọn địa chỉ và giảng viên trong danh sách." }, { status: 400 });
  }
  const { data, error } = await supabase.from("class_schedules").insert({ class_name, instructor_name, location, scheduled_at }).select("id,class_name,instructor_name,location,scheduled_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ class: data }, { status: 201 });
}
