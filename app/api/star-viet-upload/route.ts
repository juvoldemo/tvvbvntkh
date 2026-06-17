import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseStarVietFile, type StarVietSource } from "@/lib/star-viet";
import { getUploadUserName } from "@/lib/upload-users";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "{}" ? serialized : "Unknown Sao Việt upload error.";
  } catch {
    return "Unknown Sao Việt upload error.";
  }
}

function isSource(value: string): value is StarVietSource {
  return value === "kpi04" || value === "bc02";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const mode = String(formData.get("mode") || "preview");
    const sourceValue = String(formData.get("source") || "");
    const year = Number(formData.get("year") || new Date().getFullYear());
    const uploadPassword = String(formData.get("uploadPassword") || "").trim();
    const uploadedByCode = String(formData.get("uploadedBy") || uploadPassword || "").trim();
    const uploadedByName = getUploadUserName(uploadedByCode) || getUploadUserName(uploadPassword) || String(formData.get("uploadedByName") || "").trim();
    const file = formData.get("file");

    if (!isSource(sourceValue)) {
      return NextResponse.json({ error: "Nguồn dữ liệu Sao Việt không hợp lệ." }, { status: 400 });
    }
    if (!Number.isFinite(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: "Năm dữ liệu Sao Việt không hợp lệ." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn file Sao Việt." }, { status: 400 });
    }
    if (mode === "commit" && (!uploadedByCode || !uploadedByName)) {
      return NextResponse.json({ error: "Không xác định được người upload. Vui lòng nhập lại mật khẩu upload." }, { status: 401 });
    }

    const parsed = parseStarVietFile(await file.arrayBuffer(), file.name, sourceValue, year);
    const hasErrors = parsed.errors.length > 0;

    if (mode !== "commit" || hasErrors) {
      return NextResponse.json({
        ok: !hasErrors,
        mode: "preview",
        preview: parsed.preview,
        errors: parsed.errors,
        rowCount: parsed.records.length,
        totalAfyp: parsed.totalAfyp
      }, { status: hasErrors ? 422 : 200 });
    }

    const supabase = getSupabaseAdmin();
    const { error: deleteError } = await supabase
      .from("star_viet_records")
      .delete()
      .eq("data_year", year)
      .eq("source", sourceValue);
    if (deleteError) throw new Error(getErrorMessage(deleteError));

    const rows = parsed.records.map((record) => ({
      ...record,
      uploaded_at: new Date().toISOString()
    }));
    const chunkSize = 500;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const { error: insertError } = await supabase
        .from("star_viet_records")
        .insert(rows.slice(index, index + chunkSize));
      if (insertError) throw new Error(getErrorMessage(insertError));
    }

    return NextResponse.json({
      ok: true,
      upload: {
        source: sourceValue,
        data_year: year,
        uploaded_by: uploadedByCode || null,
        uploaded_by_name: uploadedByName || null,
        file_name: file.name,
        row_count: parsed.records.length,
        total_afyp: parsed.totalAfyp,
        uploaded_at: new Date().toISOString()
      },
      rowCount: parsed.records.length,
      totalAfyp: parsed.totalAfyp
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
