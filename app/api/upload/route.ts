import { NextRequest, NextResponse } from "next/server";
import { parseRevenueCsv } from "@/lib/csv";
import { toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUploadUserName } from "@/lib/upload-users";
import { recalculateAllCompetitionProgramsAfterUpload, syncCompetitionContractSnapshotsAfterUpload } from "@/src/lib/competition/competitionService";

function getUploadErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();

  if (error && typeof error === "object") {
    const details = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error?: unknown;
    };
    const parts = [details.message, details.details, details.hint, details.code]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean);

    if (parts.length) return parts.join(" ");
    if (typeof details.error === "string" && details.error.trim()) return details.error.trim();

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Keep the generic fallback below for non-serializable values.
    }
  }

  return "Unknown upload error.";
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = getUploadErrorMessage(error).toLowerCase();
  const normalizedColumn = columnName.toLowerCase();
  return message.includes("pgrst204") && (
    message.includes(`'${normalizedColumn}'`) ||
    message.includes(`"${normalizedColumn}"`) ||
    message.includes(` ${normalizedColumn} column`)
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const month = String(formData.get("month") || new Date().toISOString().slice(0, 7));
    const mode = String(formData.get("mode") || "preview");
    const uploadPassword = String(formData.get("uploadPassword") || "").trim();
    const uploadedByCode = String(formData.get("uploadedBy") || uploadPassword || "").trim();
    const uploadedByName = getUploadUserName(uploadedByCode) || getUploadUserName(uploadPassword) || String(formData.get("uploadedByName") || "").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chn file CSV." }, { status: 400 });
    }

    if (mode === "commit" && (!uploadedByCode || !uploadedByName)) {
      return NextResponse.json({ error: "Không xác định được ngưi upload. Vui lòng nhập lại mật khẩu upload." }, { status: 401 });
    }

    const text = await file.text();
    const parsed = parseRevenueCsv(text, month);
    const duplicateContracts = new Map<string, number[]>();
    parsed.records.forEach((record, index) => {
      const contractNo = String(record.contract_no ?? "").trim();
      if (!contractNo) return;
      duplicateContracts.set(contractNo, [...(duplicateContracts.get(contractNo) ?? []), index + 2]);
    });
    const duplicateErrors = [...duplicateContracts.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([contractNo, rows]) => ({
        row: rows[0],
        field: "contract_no",
        message: `Số hợp đồng ${contractNo} bị trùng trong file tại các dòng ${rows.join(", ")}.`
      }));
    const errors = [...parsed.errors, ...duplicateErrors];
    const hasErrors = errors.length > 0;
    const selectedMonth = month.slice(0, 7);
    const outOfMonthCount = parsed.records.filter((record) => record.paid_date && record.paid_date.slice(0, 7) !== selectedMonth).length;

    if (mode !== "commit" || hasErrors) {
      return NextResponse.json({
        ok: !hasErrors,
        mode: "preview",
        preview: parsed.preview,
        errors,
        warnings: outOfMonthCount > 0 ? [`Có ${outOfMonthCount} dòng dữ liệu có Ngày thu không thuộc tháng ${selectedMonth}. Vui lòng kiểm tra lại file trước khi ghi đè.`] : [],
        outOfMonthCount,
        rowCount: parsed.records.length,
        totalAfyp: parsed.totalAfyp,
        totalIp: parsed.totalIp
      }, { status: hasErrors ? 422 : 200 });
    }

    const supabase = getSupabaseAdmin();
    const dataMonth = toMonthStart(month);
    const records = parsed.records.map(({ contract_no_display: _contractNoDisplay, ...record }) => ({
      ...record,
      data_month: dataMonth
    }));

    const { error: deleteError } = await supabase.from("revenue_records").delete().eq("data_month", dataMonth);
    if (deleteError) throw new Error(getUploadErrorMessage(deleteError));

    const chunkSize = 500;
    for (let index = 0; index < records.length; index += chunkSize) {
      const { error: insertError } = await supabase.from("revenue_records").insert(records.slice(index, index + chunkSize));
      if (insertError) throw new Error(getUploadErrorMessage(insertError));
    }

    const batchPayload = {
      data_month: dataMonth,
      uploaded_by: uploadedByCode || null,
      uploaded_by_name: uploadedByName || null,
      file_name: file.name,
      file_size: file.size,
      row_count: parsed.records.length,
      total_afyp: parsed.totalAfyp,
      total_ip: parsed.totalIp,
      status: "success"
    };

    let { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert(batchPayload)
      .select("id, uploaded_at, uploaded_by, uploaded_by_name")
      .single();

    if (batchError && isMissingColumnError(batchError, "uploaded_by")) {
      const { uploaded_by: _uploadedBy, uploaded_by_name: _uploadedByName, ...compatibleBatchPayload } = batchPayload;
      const retry = await supabase
        .from("upload_batches")
        .insert(compatibleBatchPayload)
        .select("id, uploaded_at")
        .single();

      batch = retry.data ? { ...retry.data, uploaded_by: uploadedByCode || null, uploaded_by_name: uploadedByName || null } : null;
      batchError = retry.error;
    }

    if (batchError && isMissingColumnError(batchError, "uploaded_by_name")) {
      const { uploaded_by_name: _uploadedByName, ...compatibleBatchPayload } = batchPayload;
      const retry = await supabase
        .from("upload_batches")
        .insert(compatibleBatchPayload)
        .select("id, uploaded_at, uploaded_by")
        .single();

      batch = retry.data ? { ...retry.data, uploaded_by_name: uploadedByName || null } : null;
      batchError = retry.error;
    }

    if (batchError) throw new Error(getUploadErrorMessage(batchError));
    if (!batch) throw new Error("Không tạo được lịch sử upload sau khi ghi dữ liệu.");

    const { error: updateBatchIdError } = await supabase
      .from("revenue_records")
      .update({ upload_batch_id: batch.id })
      .eq("data_month", dataMonth);
    if (updateBatchIdError) throw new Error(getUploadErrorMessage(updateBatchIdError));

    const { data: contractsAfterUpload, error: contractsAfterUploadError } = await supabase
      .from("revenue_records")
      .select("*")
      .eq("data_month", dataMonth);
    if (contractsAfterUploadError) throw new Error(getUploadErrorMessage(contractsAfterUploadError));

    const snapshotSync = await syncCompetitionContractSnapshotsAfterUpload({
      monthKey: selectedMonth,
      uploadBatchId: String(batch.id),
      uploadedAt: batch.uploaded_at,
      contracts: contractsAfterUpload ?? [],
      supabaseClient: supabase
    });

    const competitionRecalculate = await recalculateAllCompetitionProgramsAfterUpload(selectedMonth, contractsAfterUpload ?? [], uploadedByName || uploadedByCode || "upload").catch((error) => {
      console.error("[competition] auto recalculation failed", error);
      return { recalculatedPrograms: [{ ok: false, error: getUploadErrorMessage(error) }], skippedPrograms: [], programCount: 0 };
    });
    const competitionNotice = "Đã cập nhật dữ liệu tháng và tự động đồng bộ Chương trình thi đua.";
    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      upload: {
        id: batch.id,
        data_month: dataMonth,
        uploaded_by: batch.uploaded_by,
        uploaded_by_name: batch.uploaded_by_name,
        uploaded_at: batch.uploaded_at,
        file_name: file.name,
        row_count: parsed.records.length,
        status: "success",
        error_message: null
      },
      warnings: outOfMonthCount > 0 ? [`Có ${outOfMonthCount} dòng dữ liệu có Ngày thu không thuộc tháng ${selectedMonth}.`] : [],
      outOfMonthCount,
      rowCount: parsed.records.length,
      totalAfyp: parsed.totalAfyp,
      totalIp: parsed.totalIp,
      snapshotSync,
      competitionRecalculate,
      competitionNotice
    });
  } catch (error) {
    const message = getUploadErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
