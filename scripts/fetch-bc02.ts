/**
 * Downloads NEW_BC02 from SAP and imports it into the dashboard.
 * Credentials and the stable SAP Files URL come only from environment variables.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { expect } from "playwright/test";
import * as XLSX from "xlsx";
import dotenv from "dotenv";
import { parseRevenueCsv } from "../lib/csv";
import { toMonthStart } from "../lib/format";
import { getSupabaseAdmin } from "../lib/supabase";

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
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

function stamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

async function screenshot(page: Page, reason: string) {
  await mkdir(directories.debug, { recursive: true });
  const file = path.join(directories.debug, `bc02_${stamp()}_${reason}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  return file;
}

async function safeClick(page: Page, locator: Locator, label: string) {
  try {
    await locator.waitFor({ state: "visible", timeout: 120_000 });
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toBeEnabled({ timeout: 120_000 });
    await locator.click({ timeout: 120_000 });
    console.log(`Clicked: ${label}`);
  } catch (error) {
    const image = await screenshot(page, "click-failed");
    log(`Lỗi click ${label}. Screenshot: ${image}`);
    throw error;
  }
}

async function waitForReady(page: Page, label: string) {
  console.log(`Waiting: ${label}`);
  await page.waitForLoadState("domcontentloaded", { timeout: 120_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
}

async function firstVisible(page: Page, candidates: Locator[], label: string) {
  try {
    return await Promise.any(candidates.map(async (candidate) => {
      const locator = candidate.first();
      await locator.waitFor({ state: "visible", timeout: 120_000 });
      return locator;
    }));
  } catch {
    const image = await screenshot(page, "selector-not-found");
    throw new Error(`Không tìm thấy ${label} sau 120 giây. Screenshot: ${image}`);
  }
}

async function fillFirst(page: Page, candidates: Locator[], value: string, label: string) {
  const locator = await firstVisible(page, candidates, label);
  try {
    await locator.waitFor({ state: "visible", timeout: 120_000 });
    await expect(locator).toBeEnabled({ timeout: 120_000 });
    await locator.fill(value, { timeout: 120_000 });
  } catch (error) {
    const image = await screenshot(page, "fill-failed");
    log(`Lỗi nhập ${label}. Screenshot: ${image}`);
    throw error;
  }
}

async function csvFromDownload(file: string) {
  if (path.extname(file).toLowerCase() === ".csv") return readFileSync(file, "utf8");
  const workbook = XLSX.readFile(file, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("File Excel tải về không có worksheet.");
  return XLSX.utils.sheet_to_csv(sheet, { FS: "," });
}

async function importIntoDashboard(csv: string, fileName: string, fileSize: number, month: string) {
  const parsed = parseRevenueCsv(csv, month);
  if (parsed.errors.length) {
    const details = parsed.errors.slice(0, 10).map((error) => `dòng ${error.row ?? "?"}: ${error.message}`).join("; ");
    throw new Error(`File BC02 không hợp lệ (${parsed.errors.length} lỗi): ${details}`);
  }
  if (!parsed.records.length) throw new Error("File BC02 không có bản ghi để nạp.");

  const supabase = getSupabaseAdmin();
  const dataMonth = toMonthStart(month);
  const { error: removeError } = await supabase.from("revenue_records").delete().eq("data_month", dataMonth);
  if (removeError) throw new Error(`Không thể thay dữ liệu tháng cũ: ${removeError.message}`);

  const uploadedAt = new Date().toISOString();
  const records = parsed.records.map(({ contract_no_display: _display, ...record }) => ({
    ...record, data_month: dataMonth, first_seen_at: uploadedAt, is_new_in_batch: true
  }));
  for (let index = 0; index < records.length; index += 500) {
    let { error } = await supabase.from("revenue_records").insert(records.slice(index, index + 500));
    if (error && /first_seen_at|is_new_in_batch/i.test(error.message)) {
      const compatible = records.slice(index, index + 500).map(({ first_seen_at: _a, is_new_in_batch: _b, ...record }) => record);
      ({ error } = await supabase.from("revenue_records").insert(compatible));
    }
    if (error) throw new Error(`Không thể nạp dữ liệu vào Supabase: ${error.message}`);
  }
  const { error: batchError } = await supabase.from("upload_batches").insert({
    data_month: dataMonth, file_name: fileName, file_size: fileSize, row_count: records.length,
    total_afyp: parsed.totalAfyp, total_ip: parsed.totalIp, status: "success", uploaded_by: "playwright", uploaded_by_name: "Playwright BC02"
  });
  if (batchError) console.warn(`[BC02] Không ghi được lịch sử upload: ${batchError.message}`);
}

async function main() {
  const url = required("DATA_SOURCE_URL");
  const username = required("DATA_SOURCE_USERNAME");
  const password = required("DATA_SOURCE_PASSWORD");
  const month = process.env.BC02_DATA_MONTH?.trim() || new Date().toISOString().slice(0, 7);
  if (!url.includes("/sap/fpa/ui/app.html#/files&/f/myfiles")) {
    throw new Error("DATA_SOURCE_URL phải là URL SAP Files: https://o3drc4mex6gwdbwimp2ktcm.ap10.sapanalytics.cloud/sap/fpa/ui/app.html#/files&/f/myfiles");
  }

  await Promise.all(Object.values(directories).map((directory) => mkdir(directory, { recursive: true })));
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
  const page = await browser.newPage({ acceptDownloads: true });
  let activePage: Page = page;

  try {
    log("Mở SAP Files từ DATA_SOURCE_URL");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitForReady(page, "trang đăng nhập SAP");
    await fillFirst(page, [
      ...(process.env.BC02_USERNAME_SELECTOR ? [page.locator(process.env.BC02_USERNAME_SELECTOR)] : []),
      page.getByRole("textbox", { name: "Email or User Name" }),
      page.getByLabel(/email or user name|username|user name|email/i)
    ], username, "Email or User Name");
    await fillFirst(page, [
      ...(process.env.BC02_PASSWORD_SELECTOR ? [page.locator(process.env.BC02_PASSWORD_SELECTOR)] : []),
      page.getByRole("textbox", { name: "Password" }),
      page.getByLabel(/password/i)
    ], password, "Password");
    await safeClick(page, page.getByRole("button", { name: "Log On" }), "Log On");
    await waitForReady(page, "đăng nhập SAP");
    await page.waitForTimeout(10_000);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitForReady(page, "SAP Files");

    const page1Promise = page.waitForEvent("popup", { timeout: 120_000 });
    await safeClick(page, page.getByText("NEW_BC02 - Doanh thu bảo hiểm"), "NEW_BC02 - Doanh thu bảo hiểm");
    const page1 = await page1Promise;
    activePage = page1;
    await waitForReady(page1, "popup NEW_BC02");
    await page1.waitForTimeout(10_000);

    // All report operations after this point use page1, the NEW_BC02 popup.
    await safeClick(page1, page1.getByRole("rowheader", { name: "Kênh Đại lý" }).nth(3), "Kênh Đại lý");
    await safeClick(page1, page1.getByRole("button", { name: "Thêm thao tác BC02 - Doanh" }), "Thêm thao tác BC02");
    await safeClick(page1, page1.getByRole("listitem").filter({ hasText: /^Xuất\.\.\.$/ }), "Xuất...");
    await safeClick(page1, page1.getByRole("combobox").filter({ hasText: "Quan điểm" }), "Quan điểm");
    await safeClick(page1, page1.locator("#ui5wc_55-content > .ui5-li-text-wrapper > .ui5-li-title"), "lựa chọn quan điểm");

    const downloadPromise = page1.waitForEvent("download", { timeout: 180_000 });
    await safeClick(page1, page1.getByRole("button", { name: "Xuất" }), "Xuất");
    await page1.waitForTimeout(5_000);
    const download = await downloadPromise;
    const rawFile = path.join(directories.raw, `bc02_${stamp()}.xlsx`);
    await download.saveAs(rawFile);

    const downloaded = path.join(directories.downloads, path.basename(rawFile));
    await copyFile(rawFile, downloaded);
    const csv = await csvFromDownload(rawFile);
    const processedFile = path.join(directories.processed, `${path.parse(rawFile).name}.csv`);
    writeFileSync(processedFile, csv, "utf8");
    await importIntoDashboard(csv, path.basename(rawFile), (await stat(rawFile)).size, month);
    log(`Hoàn tất. File gốc: ${path.relative(root, rawFile)}`);
  } catch (error) {
    const image = await screenshot(activePage, "failed");
    log(`LỖI tại ${activePage.url() || "trang chưa tải"}. Screenshot: ${image}`);
    throw new Error(`${error instanceof Error ? error.message : String(error)} Screenshot: ${image}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[BC02] LỖI: ${error.message}`);
  process.exitCode = 1;
});
