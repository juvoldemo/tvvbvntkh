export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function formatCompactVnd(value: number) {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  return formatVnd(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function toMonthStart(month: string) {
  return `${month.slice(0, 7)}-01`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayIso() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function getVietnamToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function getVietnamYesterday() {
  const today = getVietnamToday();
  const date = new Date(`${today}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function monthBounds(month: string) {
  const [year, monthNo] = month.slice(0, 7).split("-").map(Number);
  const start = `${year}-${String(monthNo).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthNo, 0);
  const end = `${year}-${String(monthNo).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end, totalDays: endDate.getDate() };
}

export function parseDateValue(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replaceAll(".", "/").replaceAll("-", "/");
  const parts = normalized.split("/");
  if (parts.length === 3) {
    const [a, b, c] = parts.map((part) => part.trim());
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    return `${c.padStart(4, "20")}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function parseMoney(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}
