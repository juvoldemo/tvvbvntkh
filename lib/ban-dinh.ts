export type BanDinhSettings = { banner: string; visible: boolean; showImage?: string; adminOnly?: boolean };
export type BanDinhReport = { advisorCode: string; advisorName: string; groupName: string; consultations: number; contracts: number; updatedAt: string };
export type BanDinhReportSummary = { rows: BanDinhReport[]; totals: { users: number; consultations: number; contracts: number } };
export type BanDinhSession = { running: boolean; startedAt: string | null; endedAt: string | null; reportPrefix?: string };
export const defaultBanDinhSession: BanDinhSession = { running: false, startedAt: null, endedAt: null };
export const defaultBanDinhSettings: BanDinhSettings = { banner: "", visible: false };
export function validBanDinhSettings(value: unknown): value is BanDinhSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as BanDinhSettings;
  return typeof v.visible === "boolean" && typeof v.banner === "string"
    && (v.adminOnly === undefined || typeof v.adminOnly === "boolean")
    && (v.banner === "" || /^\/api\/archive\/file\?path=uploads%2Finvitations%2F[a-zA-Z0-9%._-]+$/.test(v.banner))
    && (v.showImage === undefined || (typeof v.showImage === "string" && (v.showImage === "" || /^\/api\/archive\/file\?path=uploads%2Finvitations%2F[a-zA-Z0-9%._-]+$/.test(v.showImage))))
    && (!v.visible || Boolean(v.banner));
}
export function validBanDinhCounts(value: unknown): value is { consultations: number; contracts: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as { consultations: number; contracts: number };
  return [v.consultations, v.contracts].every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
}
