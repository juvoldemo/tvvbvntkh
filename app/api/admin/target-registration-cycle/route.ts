import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  readTargetRegistrationCycle,
  writeTargetRegistrationCycle
} from "@/lib/target-registration-cycle";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
    }
    const cycle = await readTargetRegistrationCycle(getSupabaseAdmin());
    return NextResponse.json({ cycle });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Không tải được chu kỳ mục tiêu."
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Chưa xác thực quản trị." }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const supabase = getSupabaseAdmin();
    const current = await readTargetRegistrationCycle(supabase);
    const now = new Date().toISOString();

    if (action === "save_current") {
      const savedMonths = [...new Set([...current.savedMonths, current.activeMonth])].sort();
      const cycle = await writeTargetRegistrationCycle(supabase, {
        version: 1,
        activeMonth: current.activeMonth,
        savedMonths,
        startedAt: current.startedAt ?? undefined,
        savedAt: now,
        updatedBy: "admin"
      });
      return NextResponse.json({ cycle, message: `Đã lưu mục tiêu tháng ${current.activeMonth.slice(5, 7)}/${current.activeMonth.slice(0, 4)}.` });
    }

    if (action === "start_next") {
      if (!current.activeMonthSaved) {
        return NextResponse.json({
          error: `Cần lưu mục tiêu tháng ${current.activeMonth.slice(5, 7)}/${current.activeMonth.slice(0, 4)} trước khi bắt đầu tháng tiếp theo.`
        }, { status: 409 });
      }
      const cycle = await writeTargetRegistrationCycle(supabase, {
        version: 1,
        activeMonth: current.nextMonth,
        savedMonths: current.savedMonths,
        startedAt: now,
        savedAt: current.savedAt ?? undefined,
        updatedBy: "admin"
      });
      return NextResponse.json({ cycle, message: `Đã bắt đầu đăng ký mục tiêu tháng ${cycle.activeMonth.slice(5, 7)}/${cycle.activeMonth.slice(0, 4)}.` });
    }

    if (action === "rollback_previous") {
      if (!current.previousMonth) {
        return NextResponse.json({ error: "Không có tháng đã lưu trước đó để quay lại." }, { status: 409 });
      }
      const previousMonth = current.previousMonth;
      const cycle = await writeTargetRegistrationCycle(supabase, {
        version: 1,
        activeMonth: previousMonth,
        savedMonths: current.savedMonths.filter((month) => month !== previousMonth),
        startedAt: now,
        savedAt: current.savedAt ?? undefined,
        updatedBy: "admin"
      });
      return NextResponse.json({
        cycle,
        message: `Đã quay lại và mở khóa mục tiêu tháng ${previousMonth.slice(5, 7)}/${previousMonth.slice(0, 4)}. Dữ liệu các tháng sau vẫn được giữ nguyên.`
      });
    }

    return NextResponse.json({ error: "Thao tác chu kỳ mục tiêu không hợp lệ." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Không cập nhật được chu kỳ mục tiêu."
    }, { status: 500 });
  }
}
