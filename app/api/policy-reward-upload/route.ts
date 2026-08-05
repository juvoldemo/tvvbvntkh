import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUploadUserName } from "@/lib/upload-users";

type RewardSource = "kpi04" | "kpi05";

const normalizeHeader = (value: unknown) => String(value ?? "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\u0111/g, "d")
  .replace(/\u0110/g, "D")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const normalizeContract = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
const number = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const text = (value: unknown) => String(value ?? "").trim();

function date(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 0) return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
  const raw = text(value);
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

function pick(row: Record<string, unknown>, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizeHeader));
  const key = Object.keys(row).find((header) => aliasSet.has(normalizeHeader(header)));
  return key ? row[key] : undefined;
}

function parseRows(buffer: ArrayBuffer, fileName: string, source: RewardSource, month: string) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const parsed = rows.map((row) => {
    const contractNo = text(pick(row, ["hop dong", "so hop dong", "contract no", "contract_no"]));
    const applicationNo = text(pick(row, ["gyc", "so gyc", "application no", "application_no", "ma gyc"]));
    const applications = [applicationNo, contractNo].map(normalizeContract).filter(Boolean);
    const issuedDate = date(pick(row, ["ngay phat hanh", "issue date", "issued date", "issued_date"]));
    const effectiveDate = date(pick(row, ["ngay hieu luc", "effective date", "effective_date"]));
    const dataMonth = source === "kpi04" && issuedDate ? `${issuedDate.slice(0, 7)}-01` : toMonthStart(month);
    return {
      data_month: dataMonth,
      reward_source: source,
      agent_code: text(pick(row, ["ma tvv", "agent code", "agent_code", "ma dai ly", "ma tu van vien"])),
      agent_name: text(pick(row, ["ten tvv", "agent name", "agent_name", "ten dai ly", "tu van vien"])),
      ban_name: text(pick(row, ["ban", "ban name", "ban_name"])),
      group_name: text(pick(row, ["nhom", "group", "group name", "group_name"])),
      ip: number(pick(row, ["ip", "phi dau tien"])),
      fyp: number(pick(row, ["fyp"])),
      fyc: number(pick(row, ["fyc"])),
      additional_premium: number(pick(row, ["additional premium", "phi bo sung"])),
      raw_data: {
        ...row,
        application_nos: applications,
        application_no: applicationNo,
        contract_no: contractNo,
        issued_date: issuedDate,
        effective_date: effectiveDate
      },
      source_file: fileName
    };
  }).filter((row) => row.agent_code || row.agent_name || row.raw_data.application_nos.length);

  const errors = parsed.flatMap((row, index) => {
    const rowNo = index + 2;
    const rowErrors = [];
    if (!row.agent_code) rowErrors.push({ row: rowNo, field: "agent_code", message: "Thieu ma TVV." });
    if (source === "kpi05" && row.fyp <= 0 && row.fyc <= 0 && row.ip <= 0) rowErrors.push({ row: rowNo, field: "fyp", message: "KPI05 can co FYP/FYC/IP." });
    return rowErrors;
  });
  return { rows: parsed, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const source = String(formData.get("source") || "kpi04").toLowerCase() as RewardSource;
    const month = String(formData.get("month") || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const mode = String(formData.get("mode") || "preview");
    const uploadPassword = String(formData.get("uploadPassword") || "").trim();
    const uploadedByCode = String(formData.get("uploadedBy") || uploadPassword || "").trim();
    const uploadedByName = getUploadUserName(uploadedByCode) || getUploadUserName(uploadPassword) || String(formData.get("uploadedByName") || "").trim();
    const file = formData.get("file");

    if (source !== "kpi04" && source !== "kpi05") return NextResponse.json({ error: "Nguon upload khong hop le." }, { status: 400 });
    if (source === "kpi05" && month < "2026-04") return NextResponse.json({ error: "KPI05 chi duoc upload tu thang 04/2026 tro di." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Chua chon file KPI." }, { status: 400 });
    if (mode === "commit" && (!uploadedByCode || !uploadedByName)) {
      return NextResponse.json({ error: "Khong xac dinh duoc nguoi upload." }, { status: 401 });
    }

    const parsed = parseRows(await file.arrayBuffer(), file.name, source, month);
    if (mode !== "commit" || parsed.errors.length) {
      return NextResponse.json({
        ok: parsed.errors.length === 0,
        mode: "preview",
        source,
        month,
        rowCount: parsed.rows.length,
        totalIp: parsed.rows.reduce((sum, row) => sum + row.ip, 0),
        totalFyp: parsed.rows.reduce((sum, row) => sum + row.fyp, 0),
        totalFyc: parsed.rows.reduce((sum, row) => sum + row.fyc, 0),
        errors: parsed.errors,
        preview: parsed.rows.slice(0, 10)
      }, { status: parsed.errors.length ? 422 : 200 });
    }

    const supabase = getSupabaseAdmin();
    const dataMonth = toMonthStart(month);
    const { error: deleteError } = await supabase
      .from("tvv_reward_policy_records")
      .delete()
      .eq("data_month", dataMonth)
      .eq("reward_source", source);
    if (deleteError) throw deleteError;

    const rows = parsed.rows.map((row) => ({ ...row, uploaded_by: uploadedByCode, uploaded_by_name: uploadedByName }));
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await supabase.from("tvv_reward_policy_records").insert(rows.slice(index, index + 500));
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      source,
      month,
      rowCount: rows.length,
      totalIp: rows.reduce((sum, row) => sum + row.ip, 0),
      totalFyp: rows.reduce((sum, row) => sum + row.fyp, 0),
      totalFyc: rows.reduce((sum, row) => sum + row.fyc, 0)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong upload duoc KPI." }, { status: 500 });
  }
}
