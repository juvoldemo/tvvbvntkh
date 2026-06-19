/**
 * Fetches NEW BC02 without screen coordinates, archives the export, then imports it
 * into Supabase. Adjust the optional BC02_*_SELECTOR variables when the source UI changes.
 */
import { mkdir, copyFile, stat } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import * as XLSX from "xlsx";
import { parseRevenueCsv } from "../lib/csv";
import { getSupabaseAdmin } from "../lib/supabase";
import { toMonthStart } from "../lib/format";

// Local development keeps secrets in .env.local; real environment variables still win.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });

const root = process.cwd();
const directories = {
  downloads: path.join(root, "downloads"),
  raw: path.join(root, "data", "raw"),
  processed: path.join(root, "data", "processed"),
  debug: path.join(root, "debug")
};

function log(step: string) { console.log(`[BC02] ${step}`); }
function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}. Hãy điền vào .env.local.`);
  return value;
}
function stamp(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}`;
}
async function screenshot(page: Page, reason: string) {
  await mkdir(directories.debug, { recursive: true });
  const file = path.join(directories.debug, `bc02_${stamp()}_${reason}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  return file;
}

/** Tries semantic locators first; optional CSS selectors are an escape hatch for UI changes. */
async function firstVisible(candidates: Locator[], label: string, page: Page) {
  for (const candidate of candidates) {
    if (await candidate.first().isVisible().catch(() => false)) return candidate.first();
  }
  const image = await screenshot(page, "selector-not-found");
  throw new Error(`Không tìm thấy ${label}. Screenshot đã lưu: ${image}`);
}
async function fillFirst(page: Page, candidates: Locator[], value: string, label: string) {
  const target = await firstVisible(candidates, label, page);
  await target.fill(value);
}
async function clickFirst(page: Page, candidates: Locator[], label: string) {
  const target = await firstVisible(candidates, label, page);
  await target.click();
}

function csvFromDownload(file: string) {
  if (path.extname(file).toLowerCase() === ".csv") return readFileSync(file, "utf8");
  const workbook = XLSX.readFile(file, { cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("File Excel tải về không có worksheet nào.");
  return XLSX.utils.sheet_to_csv(firstSheet, { FS: "," });
}

async function importIntoDashboard(csv: string, fileName: string, fileSize: number, month: string) {
  log("Kiểm tra dữ liệu trước khi nạp vào dashboard");
  const parsed = parseRevenueCsv(csv, month);
  if (parsed.errors.length) {
    const details = parsed.errors.slice(0, 10).map((e) => `dòng ${e.row ?? "?"}: ${e.message}`).join("; ");
    throw new Error(`File BC02 không hợp lệ (${parsed.errors.length} lỗi): ${details}`);
  }
  if (!parsed.records.length) throw new Error("File BC02 không có bản ghi để nạp.");

  const supabase = getSupabaseAdmin();
  const dataMonth = toMonthStart(month);
  log(`Nạp ${parsed.records.length} bản ghi vào Supabase cho tháng ${month}`);
  const { error: removeError } = await supabase.from("revenue_records").delete().eq("data_month", dataMonth);
  if (removeError) throw new Error(`Không thể thay dữ liệu tháng cũ: ${removeError.message}`);

  const uploadedAt = new Date().toISOString();
  const records = parsed.records.map(({ contract_no_display: _display, ...record }) => ({
    ...record, data_month: dataMonth, first_seen_at: uploadedAt, is_new_in_batch: true
  }));
  for (let i = 0; i < records.length; i += 500) {
    let { error } = await supabase.from("revenue_records").insert(records.slice(i, i + 500));
    // Supports older schemas that have not yet received the two audit columns.
    if (error && /first_seen_at|is_new_in_batch/i.test(error.message)) {
      const compatible = records.slice(i, i + 500).map(({ first_seen_at: _a, is_new_in_batch: _b, ...record }) => record);
      ({ error } = await supabase.from("revenue_records").insert(compatible));
    }
    if (error) throw new Error(`Không thể nạp dữ liệu vào Supabase: ${error.message}`);
  }
  const { error: batchError } = await supabase.from("upload_batches").insert({
    data_month: dataMonth, file_name: fileName, file_size: fileSize, row_count: records.length,
    total_afyp: parsed.totalAfyp, total_ip: parsed.totalIp, status: "success", uploaded_by: "playwright", uploaded_by_name: "Playwright BC02"
  });
  if (batchError) console.warn(`[BC02] Đã nạp dữ liệu, nhưng không ghi được lịch sử upload: ${batchError.message}`);
}

async function main() {
  const url = required("DATA_SOURCE_URL");
  const username = required("DATA_SOURCE_USERNAME");
  const password = required("DATA_SOURCE_PASSWORD");
  const month = process.env.BC02_DATA_MONTH?.trim() || new Date().toISOString().slice(0, 7);
  await Promise.all(Object.values(directories).map((directory) => mkdir(directory, { recursive: true })));
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
  const page = await browser.newPage({ acceptDownloads: true });
  try {
    log("Mở trang nguồn dữ liệu");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await fillFirst(page, [
      ...(process.env.BC02_USERNAME_SELECTOR ? [page.locator(process.env.BC02_USERNAME_SELECTOR)] : []),
      page.getByLabel(/tên đăng nhập|username|user name|email/i), page.locator('input[name="username"], input[name="email"], input[type="email"]')
    ], username, "ô tên đăng nhập");
    await fillFirst(page, [
      ...(process.env.BC02_PASSWORD_SELECTOR ? [page.locator(process.env.BC02_PASSWORD_SELECTOR)] : []),
      page.getByLabel(/mật khẩu|password/i), page.locator('input[type="password"], input[name="password"]')
    ], password, "ô mật khẩu");
    await clickFirst(page, [
      ...(process.env.BC02_LOGIN_BUTTON_SELECTOR ? [page.locator(process.env.BC02_LOGIN_BUTTON_SELECTOR)] : []),
      page.getByRole("button", { name: /đăng nhập|login|sign in/i }), page.locator('button[type="submit"], input[type="submit"]')
    ], "nút đăng nhập");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    if (await page.getByText(/đăng nhập thất bại|invalid|sai mật khẩu|không đúng/i).first().isVisible().catch(() => false)) {
      throw new Error("Đăng nhập thất bại: website báo sai tài khoản hoặc mật khẩu.");
    }
    log("Đăng nhập thành công, mở NEW BC02");
    await clickFirst(page, [page.getByRole("link", { name: /new\s*bc02/i }), page.getByRole("button", { name: /new\s*bc02/i }), page.getByText(/new\s*bc02/i)], "mục NEW BC02");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    log("Yêu cầu xuất file");
    const exportCandidates = [
      ...(process.env.BC02_EXPORT_BUTTON_SELECTOR ? [page.locator(process.env.BC02_EXPORT_BUTTON_SELECTOR)] : []),
      page.getByRole("button", { name: /xuất|export|tải xuống|download/i }), page.getByRole("link", { name: /xuất|export|tải xuống|download/i })
    ];
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await clickFirst(page, exportCandidates, "nút xuất dữ liệu");
    if (process.env.BC02_CONFIRM_EXPORT_SELECTOR) await clickFirst(page, [page.locator(process.env.BC02_CONFIRM_EXPORT_SELECTOR)], "nút xác nhận xuất dữ liệu");
    const download = await downloadPromise;
    const extension = path.extname(download.suggestedFilename()).toLowerCase() || ".xlsx";
    if (![".xlsx", ".xls", ".csv"].includes(extension)) throw new Error(`Định dạng file tải xuống không được hỗ trợ: ${extension}`);
    const downloaded = path.join(directories.downloads, `bc02_${stamp()}${extension}`);
    await download.saveAs(downloaded);
    log(`Đã lưu file tải xuống: ${path.relative(root, downloaded)}`);
    const rawFile = path.join(directories.raw, path.basename(downloaded));
    await copyFile(downloaded, rawFile);
    const csv = csvFromDownload(downloaded);
    const processedFile = path.join(directories.processed, `${path.parse(downloaded).name}.csv`);
    writeFileSync(processedFile, csv, "utf8");
    await importIntoDashboard(csv, path.basename(downloaded), (await stat(downloaded)).size, month);
    log("Hoàn tất. Dashboard sẽ đọc dữ liệu mới từ Supabase ngay lần tải lại kế tiếp.");
  } catch (error) {
    const image = await screenshot(page, "failed");
    throw new Error(`${error instanceof Error ? error.message : String(error)} Screenshot: ${image}`);
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(`[BC02] LỖI: ${error.message}`); process.exitCode = 1; });
