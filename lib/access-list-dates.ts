import * as XLSX from "xlsx";

function isoDate(year: number, month: number, day: number) {
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsedCandidate = new Date(`${candidate}T00:00:00Z`);
  return !Number.isNaN(parsedCandidate.getTime()) && parsedCandidate.toISOString().slice(0, 10) === candidate
    ? candidate
    : null;
}

export function parseAccessListDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? isoDate(parsed.y, parsed.m, parsed.d) : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const viDate = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (viDate) {
    const day = Number(viDate[1]);
    const month = Number(viDate[2]);
    const year = viDate[3].length === 2 ? 2000 + Number(viDate[3]) : Number(viDate[3]);
    return isoDate(year, month, day);
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
