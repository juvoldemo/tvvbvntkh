import { getAdsMonthlyTarget, getAdsQuarterTarget, getAdsYearTarget, ADS_MASTER_NAMES, findAdsMasterName, resolveAdsName } from "./ads-plan";
import type { DashboardFilters, RevenueRecord } from "./types";

export const ADO_DEPARTMENTS: Record<string, string> = {
  "Nguyễn Thị Mai Trang": "PTKD 1", "Nguyễn Thị Trầm": "PTKD 1", "�inh Quốc Tiến": "PTKD 1",
  "Nguyễn Th�c": "PTKD 2", "Trần Xu�n Thu": "PTKD 2", "Nguyễn Th�nh Nh�n": "PTKD 2"
};
const ADO_DISPLAY_NAMES: Record<string, string> = { "Nguyễn Thị Tr�m": "Nguyễn Thị Trầm" };
const canonicalAdoName = (name: string) => ADO_DISPLAY_NAMES[name] ?? name;
const departmentForAdo = (name: string) => {
  const direct = ADO_DEPARTMENTS[name];
  if (direct) return direct;
  const masterName = findAdsMasterName(name) || name;
  const masterIndex = ADS_MASTER_NAMES.findIndex((item) => item === masterName);
  if (masterIndex >= 0 && masterIndex <= 2) return "PTKD 1";
  if (masterIndex >= 3 && masterIndex <= 5) return "PTKD 2";
  return "Chua phan phong";
};
const kpiSourceName = (name: string) => name;
const EXCLUDED = ["ycbh het hieu luc", "het hieu luc", "tu choi", "tri hoan"];
const norm = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
const sum = (records: RevenueRecord[], key: "afyp" | "ip") => records.reduce((total, record) => total + Number(record[key] ?? 0), 0);
const adoNameForRecord = (record: RevenueRecord) => canonicalAdoName(resolveAdsName(record.ads_name, record.ban_name, record.group_name));
const isMaiTrangDsoKhanhHoaRevenue = (adoName: string, record: RevenueRecord) => {
  if (norm(adoName) !== "nguyen thi mai trang") return false;
  const location = [record.ban_name, record.group_name].map(norm).join(" ");
  return location.includes("dso khanh hoa") || location.includes("khanh hoa 2") || location.includes("banca");
};
const contractKey = (record: RevenueRecord, index: number) => {
  const applicationNo = String(record.application_no ?? "").trim();
  if (applicationNo) return `application:${norm(applicationNo)}`;
  const contractNo = String(record.contract_no ?? "").trim();
  if (contractNo && !contractNo.startsWith("Num-")) return `contract:${norm(contractNo)}`;
  const id = String(record.id ?? "").trim();
  if (id) return `id:${id}`;
  return `row:${record.paid_date}:${norm(record.agent_name)}:${norm(record.policy_owner)}:${record.ip}:${record.afyp}:${index}`;
};
const agentKey = (record: RevenueRecord) => {
  const code = String(record.agent_code ?? "").trim();
  if (code) return `code:${norm(code)}`;
  return norm(record.agent_name);
};
const countContracts = (records: RevenueRecord[]) => new Set(records.map(contractKey)).size;
const countAgents = (records: RevenueRecord[]) => new Set(records.map(agentKey).filter(Boolean)).size;

export function getAdoKpiByMonth(name: string, month: string) { return getAdsMonthlyTarget(name, month); }
export function getAdoQuarterKpi(name: string, month: string) { return getAdsQuarterTarget(name, month); }
export function getAdoYearKpi(name: string) { return getAdsYearTarget(name); }

export function buildAdoReport(records: RevenueRecord[], month: string, filters: DashboardFilters = { month }) {
  const year = month.slice(0, 4); const monthNo = Number(month.slice(5, 7));
  const quarterStart = (Math.ceil(monthNo / 3) - 1) * 3 + 1;
  const end = `${month}-${String(new Date(Number(year), monthNo, 0).getDate()).padStart(2, "0")}`;
  const valid = records.filter((record) => !EXCLUDED.some((status) => norm(record.policy_status).includes(status))).filter((record) => {
    if (filters.ban && record.ban_name !== filters.ban) return false; if (filters.group && record.group_name !== filters.group) return false;
    if (filters.agent && record.agent_name !== filters.agent) return false; if (filters.ads && resolveAdsName(record.ads_name, record.ban_name, record.group_name) !== filters.ads) return false;
    return !filters.status || record.policy_status === filters.status;
  });
  const rawAdoNames = valid.map((record) => String(record.ads_name ?? "")).filter(Boolean);
  const normalizedActualNames = valid.map(adoNameForRecord).filter(Boolean);
  const finalAdoNames = [...new Set([...ADS_MASTER_NAMES.map(canonicalAdoName), ...normalizedActualNames])];
  console.log("ADO raw from BC02", rawAdoNames);
  console.log("ADO normalized from BC02", normalizedActualNames);
  console.log("ADO KPI list", ADS_MASTER_NAMES.map(canonicalAdoName));
  console.log("ADO final render list", finalAdoNames);
  if (!finalAdoNames.includes("Nguyễn Thị Trầm")) console.warn("Nguyễn Thị Trầm missing from ADO final list", { rawAdoNames, normalizedActualNames });
  const rows = finalAdoNames.map((adoName) => {
    const sourceName = kpiSourceName(adoName);
    const mine = valid.filter((record) => adoNameForRecord(record) === adoName && !isMaiTrangDsoKhanhHoaRevenue(adoName, record) && record.paid_date <= end && record.paid_date.startsWith(year));
    const monthly = mine.filter((record) => record.paid_date.slice(0, 7) === month);
    const quarter = mine.filter((record) => { const n = Number(record.paid_date.slice(5, 7)); return n >= quarterStart && n <= monthNo; });
    const monthlyAfyp = sum(monthly, "afyp"), quarterAfyp = sum(quarter, "afyp"), yearAfyp = sum(mine, "afyp");
    const monthlyKpi = getAdoKpiByMonth(sourceName, month), quarterKpi = getAdoQuarterKpi(sourceName, month), yearKpi = getAdoYearKpi(sourceName);
    return { adoName, sourceName, department: departmentForAdo(sourceName), monthlyAfyp, quarterAfyp, yearAfyp, monthlyKpi, quarterKpi, yearKpi, monthlyRate: monthlyKpi ? monthlyAfyp / monthlyKpi * 100 : 0, quarterRate: quarterKpi ? quarterAfyp / quarterKpi * 100 : 0, yearRate: yearKpi ? yearAfyp / yearKpi * 100 : 0, ip: sum(monthly, "ip"), quarterIp: sum(quarter, "ip"), yearIp: sum(mine, "ip"), contractCount: countContracts(monthly), quarterContractCount: countContracts(quarter), yearContractCount: countContracts(mine), agentCount: countAgents(monthly), quarterAgentCount: countAgents(quarter), yearAgentCount: countAgents(mine), periodRecordCounts: { month: monthly.length, quarter: quarter.length, year: mine.length } };
  });
  const totalMonth = rows.reduce((total, row) => total + row.monthlyAfyp, 0);
  const departments = ["PTKD 1", "PTKD 2"].map((department) => {
    const items = rows.filter((row) => row.department === department); const aggregate = (key: keyof typeof items[number]) => items.reduce((total, row) => total + Number(row[key] ?? 0), 0);
    const monthlyAfyp = aggregate("monthlyAfyp"), quarterAfyp = aggregate("quarterAfyp"), yearAfyp = aggregate("yearAfyp"); const monthlyKpi = aggregate("monthlyKpi"), quarterKpi = aggregate("quarterKpi"), yearKpi = aggregate("yearKpi");
    const records = valid.filter((record) => {
      const adoName = adoNameForRecord(record);
      return departmentForAdo(adoName) === department && !isMaiTrangDsoKhanhHoaRevenue(adoName, record) && record.paid_date <= end && record.paid_date.startsWith(year);
    });
    const monthly = records.filter((record) => record.paid_date.slice(0, 7) === month);
    const quarter = records.filter((record) => { const n = Number(record.paid_date.slice(5, 7)); return n >= quarterStart && n <= monthNo; });
    return { department, monthlyAfyp, quarterAfyp, yearAfyp, monthlyKpi, quarterKpi, yearKpi, monthlyRate: monthlyKpi ? monthlyAfyp / monthlyKpi * 100 : 0, quarterRate: quarterKpi ? quarterAfyp / quarterKpi * 100 : 0, yearRate: yearKpi ? yearAfyp / yearKpi * 100 : 0, ip: sum(monthly, "ip"), quarterIp: sum(quarter, "ip"), yearIp: sum(records, "ip"), contractCount: countContracts(monthly), quarterContractCount: countContracts(quarter), yearContractCount: countContracts(records), agentCount: countAgents(monthly), quarterAgentCount: countAgents(quarter), yearAgentCount: countAgents(records), periodRecordCounts: { month: monthly.length, quarter: quarter.length, year: records.length } };
  });
  return { rows: rows.map((row) => ({ ...row, share: totalMonth ? row.monthlyAfyp / totalMonth * 100 : 0 })), departments };
}
