import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DashboardFilters, MonthlyTarget, RevenueRecord } from "@/lib/types";
import { buildAfypPlanSummary, buildAfypPlanTable } from "@/lib/afyp-plan";
import { applyFilters, buildAdsDebugReport, buildAdsReport, buildAgentRanking, buildGroupRanking, buildOverview, buildStatusReport, buildTimeSeries, buildYearPlanSeries, countDistinct, countDistinctActiveAgents, filterOptions, isCountedRevenueRecord, sortContractDetails, sumAfyp, sumIp } from "@/lib/reports";
import { getVietnamToday, monthBounds, toMonthStart } from "@/lib/format";
import { buildStarVietReport, type StarVietRecord } from "@/lib/star-viet";
import { getAdsMonthlyTarget, normalizeAdsName, resolveAdsName } from "@/lib/ads-plan";
import { buildAdoReport } from "@/lib/ado-report";
import { userCodeFromRequest } from "@/lib/user-auth";

function visibleName(value: unknown, codePattern: RegExp) {
  const name = String(value ?? "").trim();
  return name && !codePattern.test(name) ? name : "";
}

function buildAdsPlanActuals(records: RevenueRecord[], filters: DashboardFilters) {
  if (!filters.ads) return null;

  const selectedMonth = Number(filters.month.slice(5, 7));
  const quarterStart = (Math.ceil(selectedMonth / 3) - 1) * 3 + 1;
  const quarterEnd = quarterStart + 2;
  const filteredRecords = records.filter((record) => {
    const recordMonth = Number(record.paid_date.slice(5, 7));
    if (filters.ban && record.ban_name !== filters.ban) return false;
    if (filters.group && record.group_name !== filters.group) return false;
    if (filters.agent && visibleName(record.agent_name, /^D\d+/i) !== filters.agent) return false;
    if (normalizeAdsName(resolveAdsName(record.ads_name, record.ban_name, record.group_name)) !== normalizeAdsName(filters.ads)) return false;
    if (filters.status && record.policy_status !== filters.status) return false;
    return Number.isFinite(recordMonth);
  }).filter(isCountedRevenueRecord);

  const sum = (items: RevenueRecord[]) => items.reduce((total, record) => total + (Number(record.afyp) || 0), 0);
  return {
    monthlyActual: sum(filteredRecords.filter((record) => record.paid_date.slice(0, 7) === filters.month.slice(0, 7))),
    quarterActual: sum(filteredRecords.filter((record) => {
      const recordMonth = Number(record.paid_date.slice(5, 7));
      return recordMonth >= quarterStart && recordMonth <= quarterEnd;
    })),
    yearActual: sum(filteredRecords)
  };
}

function previousMonthKey(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNo = Number(month.slice(5, 7));
  const date = new Date(year, monthNo - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildAgentIpPeriods(records: RevenueRecord[], month: string) {
  const selectedMonth = month.slice(0, 7);
  const selectedMonthNo = Number(selectedMonth.slice(5, 7));
  const quarterStart = Math.floor((selectedMonthNo - 1) / 3) * 3 + 1;
  const quarterEnd = quarterStart + 2;
  const rows = new Map<string, { agentCode: string; agentName: string; monthIp: number; quarterIp: number; yearIp: number }>();

  records.filter(isCountedRevenueRecord).forEach((record) => {
    const agentCode = String(record.agent_code ?? "").trim();
    const agentName = String(record.agent_name ?? "").trim();
    const key = agentCode || agentName;
    if (!key) return;
    const current = rows.get(key) ?? { agentCode, agentName, monthIp: 0, quarterIp: 0, yearIp: 0 };
    const ip = Number(record.ip) || 0;
    const recordMonth = Number(record.paid_date.slice(5, 7));
    current.yearIp += ip;
    if (recordMonth >= quarterStart && recordMonth <= quarterEnd) current.quarterIp += ip;
    if (record.paid_date.slice(0, 7) === selectedMonth) current.monthIp += ip;
    rows.set(key, current);
  });

  return [...rows.values()];
}

function periodCutoffDay(month: string) {
  const today = getVietnamToday();
  if (today.slice(0, 7) === month.slice(0, 7)) return Number(today.slice(8, 10));
  return monthBounds(month).totalDays;
}

function samePeriodPreviousFilters(filters: DashboardFilters) {
  const prevMonth = previousMonthKey(filters.month);
  const prevBounds = monthBounds(prevMonth);
  const targetDay = filters.paidDate ? Number(filters.paidDate.slice(8, 10)) : periodCutoffDay(filters.month);
  const cappedDay = Math.min(Math.max(targetDay || 1, 1), prevBounds.totalDays);
  const paidDate = filters.paidDate ? `${prevMonth}-${String(cappedDay).padStart(2, "0")}` : undefined;
  return {
    ...filters,
    month: prevMonth,
    paidDate
  };
}

function buildOverviewComparisons(current: ReturnType<typeof buildOverview>, previousRecords: RevenueRecord[], previousActiveAgentRecords = previousRecords) {
  const metrics = {
    monthlyAfyp: sumAfyp(previousRecords),
    monthlyIp: sumIp(previousRecords),
    totalContracts: countDistinct(previousRecords, "contract_no"),
    activeAgents: countDistinctActiveAgents(previousActiveAgentRecords)
  };
  const build = (currentValue: number, previousValue: number) => {
    if (previousValue <= 0) return { percent: null, direction: "none" as const, hasPrevious: false };
    const percent = ((currentValue - previousValue) / previousValue) * 100;
    return {
      percent,
      direction: percent > 0 ? "up" as const : percent < 0 ? "down" as const : "flat" as const,
      hasPrevious: true
    };
  };
  return {
    monthlyAfyp: build(Number(current.monthlyAfyp ?? 0), metrics.monthlyAfyp),
    monthlyIp: build(Number(current.monthlyIp ?? 0), metrics.monthlyIp),
    totalContracts: build(Number(current.totalContracts ?? 0), metrics.totalContracts),
    activeAgents: build(Number(current.activeAgents ?? 0), metrics.activeAgents)
  };
}

export async function GET(request: NextRequest) {
  try {
    const signedInAdvisorCode = userCodeFromRequest(request);
    const params = request.nextUrl.searchParams;
    const month = params.get("month") || new Date().toISOString().slice(0, 7);
    const filters: DashboardFilters = {
      month,
      paidDate: params.get("paidDate") || undefined,
      ban: params.get("ban") || undefined,
      group: params.get("group") || undefined,
      agent: params.get("agent") || undefined,
      ads: params.get("ads") || undefined,
      status: params.get("status") || undefined
    };
    const { start, end } = monthBounds(month);
    const previousFilters = samePeriodPreviousFilters(filters);
    const previousBounds = monthBounds(previousFilters.month);
    const previousCutoffDay = previousFilters.paidDate ? Number(previousFilters.paidDate.slice(8, 10)) : Math.min(periodCutoffDay(month), previousBounds.totalDays);
    const previousEnd = `${previousFilters.month}-${String(previousCutoffDay).padStart(2, "0")}`;
    const supabase = getSupabaseAdmin();

    const advisorScope = <T extends { ilike: (column: string, pattern: string) => T }>(query: T) =>
      signedInAdvisorCode ? query.ilike("agent_code", signedInAdvisorCode) : query;
    const [{ data: records, error: recordsError }, { data: previousRecords, error: previousRecordsError }, { data: previousMonthRecords, error: previousMonthRecordsError }, { data: yearRecords, error: yearRecordsError }, { data: target, error: targetError }, { data: latestUpload }, { data: uploadsByMonth }] = await Promise.all([
      advisorScope(supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month)).gte("paid_date", start).lte("paid_date", end)),
      advisorScope(supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(previousFilters.month)).gte("paid_date", previousBounds.start).lte("paid_date", previousEnd)),
      advisorScope(supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(previousFilters.month)).gte("paid_date", previousBounds.start).lte("paid_date", previousBounds.end)),
      advisorScope(supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").gte("paid_date", "2026-01-01").lte("paid_date", "2026-12-31")),
      supabase.from("monthly_targets").select("*").eq("target_month", toMonthStart(month)).eq("target_level", "company").is("target_code", null).maybeSingle(),
      supabase.from("upload_batches").select("*").eq("data_month", toMonthStart(month)).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("upload_batches").select("data_month, uploaded_at").order("uploaded_at", { ascending: false })
    ]);

    if (recordsError) throw recordsError;
    if (previousRecordsError) throw previousRecordsError;
    if (previousMonthRecordsError) throw previousMonthRecordsError;
    if (yearRecordsError) throw yearRecordsError;
    if (targetError) throw targetError;

    const availableMonths = [...new Set(((uploadsByMonth ?? []) as Array<{ data_month?: string | null }>).map((item) => String(item.data_month ?? "").slice(0, 7)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a));

    const withDisplayContractNo = (items: RevenueRecord[]) => items.map((record) => ({
      ...record,
      contract_no_display: record.contract_no?.startsWith("Num-") ? "Num" : record.contract_no
    }));
    const allRecords = withDisplayContractNo((records ?? []) as RevenueRecord[]);
    const allPreviousRecords = withDisplayContractNo((previousRecords ?? []) as RevenueRecord[]);
    const allPreviousMonthRecords = withDisplayContractNo((previousMonthRecords ?? []) as RevenueRecord[]);
    const allYearRecords = withDisplayContractNo((yearRecords ?? []) as RevenueRecord[]);
    const starYear = Number(month.slice(0, 4)) || new Date().getFullYear();
    const { data: starVietRecords, error: starVietError } = await supabase
      .from("star_viet_records")
      .select("*")
      .eq("data_year", starYear);
    const filteredRecords = sortContractDetails(applyFilters(allRecords, filters));
    const previousFilteredRecords = sortContractDetails(applyFilters(allPreviousRecords, previousFilters));
    const previousMonthActiveAgentFilters = { ...previousFilters, paidDate: undefined };
    const previousMonthFilteredRecords = sortContractDetails(applyFilters(allPreviousMonthRecords, previousMonthActiveAgentFilters));
    const countedRecords = sortContractDetails(filteredRecords.filter(isCountedRevenueRecord));
    const previousCountedRecords = sortContractDetails(previousFilteredRecords.filter(isCountedRevenueRecord));
    const previousMonthCountedRecords = sortContractDetails(previousMonthFilteredRecords.filter(isCountedRevenueRecord));
    const countedYearRecords = sortContractDetails(allYearRecords.filter(isCountedRevenueRecord));
    const companyTarget = target as MonthlyTarget | null;
    const planTable = buildAfypPlanTable(countedYearRecords);
    const adsMonthlyTarget = filters.ads ? getAdsMonthlyTarget(filters.ads, month) : 0;
    const adsDebug = buildAdsDebugReport(countedRecords, month);
    const overview = buildOverview(countedRecords, month, companyTarget);
    if (filters.ads) {
      overview.monthlyTargetAfyp = adsMonthlyTarget;
      overview.achievementRate = adsMonthlyTarget > 0 ? (overview.monthlyAfyp / adsMonthlyTarget) * 100 : null;
    }

    return NextResponse.json({
      month,
      availableMonths,
      updatedAt: latestUpload?.uploaded_at ?? null,
      options: filterOptions(allRecords),
      overview,
      overviewComparisons: buildOverviewComparisons(overview, previousCountedRecords, previousMonthCountedRecords),
      overviewGroups: buildGroupRanking(countedRecords),
      overviewAgents: buildAgentRanking(countedRecords),
      overviewTimeSeries: buildTimeSeries(countedRecords, month, companyTarget),
      overviewContracts: countedRecords.slice(0, 500),
      adsPlanActuals: buildAdsPlanActuals(countedYearRecords, filters),
      adsDebug,
      planSummary: buildAfypPlanSummary(month, countedYearRecords, companyTarget),
      planTable,
      groups: buildGroupRanking(countedRecords),
      agents: buildAgentRanking(countedRecords),
      agentIpPeriods: buildAgentIpPeriods(allYearRecords, month),
      yearStatusContracts: sortContractDetails(allYearRecords),
      yearContracts: countedYearRecords.slice(0, 5000),
      statuses: buildStatusReport(countedRecords, filteredRecords),
      statusContracts: filteredRecords,
      timeSeries: {
        ...buildTimeSeries(countedRecords, month, companyTarget),
        yearPlanRows: buildYearPlanSeries(planTable)
      },
      ads: buildAdsReport(countedRecords),
      ado: buildAdoReport(allYearRecords, month, filters),
      starViet: buildStarVietReport(starVietError ? [] : (starVietRecords ?? []) as StarVietRecord[]),
      starVietWarning: starVietError ? "Chưa có bảng dữ liệu Sao Việt. Vui lòng chạy schema mới trước khi upload." : null,
      competitionContracts: allRecords,
      contracts: countedRecords.slice(0, 500)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
