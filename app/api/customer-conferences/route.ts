import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isBossAccount, managedAdoScope } from "@/lib/ado-scope";
import { dedupeRevenueRecordsByContract, isCountedRevenueRecord } from "@/lib/reports";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeAdvisorCode, userCodeFromRequest } from "@/lib/user-auth";

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
}

function cell(row: Record<string, unknown>, aliases: string[]) {
  const wanted = aliases.map(normalized);
  const key = Object.keys(row).find((item) => wanted.includes(normalized(item)));
  return key ? row[key] : "";
}

function money(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d,-]/g, "").replace(/,/g, "");
  return Number(cleaned) || 0;
}

async function access(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("authorized_users").select("advisor_code,full_name").eq("advisor_code", code).maybeSingle();
  if (!data) return null;
  const scope = managedAdoScope(data.advisor_code, data.full_name);
  if (!scope && !isBossAccount(code)) return null;
  return { code, supabase, groups: scope?.groups ?? null };
}

export async function GET(request: NextRequest) {
  const auth = await access(request);
  if (!auth) return NextResponse.json({ error: "Không có quyền truy cập hội nghị khách hàng." }, { status: 403 });
  const { data: conferences, error } = await auth.supabase.from("customer_conferences").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!conferences?.length) return NextResponse.json({ conferences: [] });
  const ids = conferences.map((item) => item.id);
  const { data: registrations, error: registrationError } = await auth.supabase.from("customer_conference_registrations").select("*").in("conference_id", ids).order("customer_name");
  if (registrationError) return NextResponse.json({ error: registrationError.message }, { status: 500 });
  const codes = [...new Set((registrations ?? []).map((item) => normalizeAdvisorCode(item.advisor_code)).filter(Boolean))];
  const firstDate = conferences.reduce((value, item) => value < item.date_from ? value : item.date_from, conferences[0].date_from);
  const lastDate = conferences.reduce((value, item) => value > item.date_to ? value : item.date_to, conferences[0].date_to);
  const { data: rawContracts, error: contractError } = codes.length
    ? await auth.supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").in("agent_code", codes).gte("paid_date", firstDate).lte("paid_date", lastDate)
    : { data: [], error: null };
  if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 });
  const contracts = dedupeRevenueRecordsByContract(rawContracts ?? []).filter(isCountedRevenueRecord);
  const result = conferences.map((conference) => {
    const rows = (registrations ?? []).filter((item) => item.conference_id === conference.id).map((registration) => {
      const customer = normalized(registration.customer_name);
      const matches = contracts.filter((contract: any) =>
        normalizeAdvisorCode(contract.agent_code) === normalizeAdvisorCode(registration.advisor_code)
        && contract.paid_date >= conference.date_from && contract.paid_date <= conference.date_to
        && (normalized(contract.policy_owner) === customer || normalized(contract.insured_name) === customer)
      );
      return { ...registration, attended: matches.length > 0, revenue: matches.reduce((sum: number, item: any) => sum + (Number(item.afyp) || 0), 0), contractCount: matches.length };
    }).sort((left, right) =>
      Number(right.attended) - Number(left.attended)
      || right.revenue - left.revenue
      || String(left.customer_name).localeCompare(String(right.customer_name), "vi")
    );
    return { ...conference, canManage: conference.ado_code === auth.code, registrations: rows, registeredCustomers: rows.length, attendedCustomers: rows.filter((item) => item.attended).length, totalRevenue: rows.reduce((sum, item) => sum + item.revenue, 0), totalFees: rows.reduce((sum, item) => sum + (Number(item.registration_fee) || 0), 0) };
  });
  return NextResponse.json({ conferences: result }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await access(request);
  if (!auth) return NextResponse.json({ error: "Không có quyền upload hội nghị khách hàng." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  const conferenceName = String(form.get("conferenceName") || "").trim();
  const dateFrom = String(form.get("dateFrom") || "");
  const dateTo = String(form.get("dateTo") || "");
  if (!(file instanceof File) || !conferenceName || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return NextResponse.json({ error: "Vui lòng nhập tên hội nghị, chọn khoảng ngày và file Excel." }, { status: 400 });
  if (dateFrom > dateTo) return NextResponse.json({ error: "Từ ngày không được sau Đến ngày." }, { status: 422 });
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const rows = sourceRows.map((row) => ({
      advisor_code: normalizeAdvisorCode(cell(row, ["Mã TVV", "Ma TVV", "advisor_code"])),
      advisor_name: String(cell(row, ["Tên TVV", "Ten TVV", "advisor_name"])).trim(),
      group_name: String(cell(row, ["Nhóm", "Nhom", "group_name"])).trim(),
      customer_name: String(cell(row, ["Tên khách hàng", "Ten khach hang", "customer_name"])).trim(),
      registration_fee: money(cell(row, ["Phí đăng ký", "Phi dang ky", "registration_fee"]))
    })).filter((row) => row.advisor_code && row.advisor_name && row.group_name && row.customer_name);
    if (!rows.length) return NextResponse.json({ error: "Không tìm thấy dòng hợp lệ. File cần đủ Mã TVV, Tên TVV, Nhóm, Tên khách hàng và Phí đăng ký." }, { status: 422 });
    const { data: conference, error } = await auth.supabase.from("customer_conferences").insert({ ado_code: auth.code, conference_name: conferenceName, date_from: dateFrom, date_to: dateTo, source_file: file.name }).select("id").single();
    if (error) throw error;
    const { error: insertError } = await auth.supabase.from("customer_conference_registrations").insert(rows.map((row) => ({ ...row, conference_id: conference.id })));
    if (insertError) { await auth.supabase.from("customer_conferences").delete().eq("id", conference.id); throw insertError; }
    return NextResponse.json({ ok: true, id: conference.id, count: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đọc file hội nghị." }, { status: 500 });
  }
}
