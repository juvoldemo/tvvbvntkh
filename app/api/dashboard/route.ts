import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DashboardFilters, MonthlyTarget, RevenueRecord } from "@/lib/types";
import { buildAfypPlanSummary, buildAfypPlanTable } from "@/lib/afyp-plan";
import { applyFilters, buildAdsReport, buildAgentRanking, buildGroupRanking, buildOverview, buildStatusReport, buildTimeSeries, buildYearPlanSeries, countDistinct, countDistinctActiveAgents, filterOptions, isOverviewRevenueRecord, isValidForRanking, sortContractDetails, sumAfyp, sumIp } from "@/lib/reports";
import { getVietnamToday, monthBounds, toMonthStart } from "@/lib/format";
import { buildStarVietReport, type StarVietRecord } from "@/lib/star-viet";
import { getAdsMonthlyTarget } from "@/lib/ads-plan";

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
    if (visibleName(record.ads_name, /^L\d+/i) !== filters.ads) return false;
    if (filters.status && record.policy_status !== filters.status) return false;
    return Number.isFinite(recordMonth);
  }).filter(isOverviewRevenueRecord);

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

function buildOverviewComparisons(current: ReturnType<typeof buildOverview>, previousRecords: RevenueRecord[]) {
  const metrics = {
    monthlyAfyp: sumAfyp(previousRecords),
    monthlyIp: sumIp(previousRecords),
    totalContracts: countDistinct(previousRecords, "contract_no"),
    activeAgents: countDistinctActiveAgents(previousRecords)
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

    const [{ data: records, error: recordsError }, { data: previousRecords, error: previousRecordsError }, { data: yearRecords, error: yearRecordsError }, { data: target, error: targetError }, { data: latestUpload }, { data: uploadsByMonth }] = await Promise.all([
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month)).gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(previousFilters.month)).gte("paid_date", previousBounds.start).lte("paid_date", previousEnd),
      supabase.from("revenue_records").select("*").gte("paid_date", "2026-01-01").lte("paid_date", "2026-12-31"),
      supabase.from("monthly_targets").select("*").eq("target_month", toMonthStart(month)).eq("target_level", "company").is("target_code", null).maybeSingle(),
      supabase.from("upload_batches").select("*").eq("data_month", toMonthStart(month)).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("upload_batches").select("data_month, uploaded_at").order("uploaded_at", { ascending: false })
    ]);

    if (recordsError) throw recordsError;
    if (previousRecordsError) throw previousRecordsError;
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
    const allYearRecords = withDisplayContractNo((yearRecords ?? []) as RevenueRecord[]);
    const starYear = Number(month.slice(0, 4)) || new Date().getFullYear();
    const { data: starVietRecords, error: starVietError } = await supabase
      .from("star_viet_records")
      .select("*")
      .eq("data_year", starYear);
    const filteredRecords = sortContractDetails(applyFilters(allRecords, filters));
    const previousFilteredRecords = sortContractDetails(applyFilters(allPreviousRecords, previousFilters));
    const overviewRevenueRecords = sortContractDetails(filteredRecords.filter(isOverviewRevenueRecord));
    const previousOverviewRevenueRecords = sortContractDetails(previousFilteredRecords.filter(isOverviewRevenueRecord));
    const rankingRecords = filteredRecords.filter(isValidForRanking);
    const companyTarget = target as MonthlyTarget | null;
    const planTable = buildAfypPlanTable(allYearRecords);
    const adsMonthlyTarget = filters.ads ? getAdsMonthlyTarget(filters.ads, month) : 0;
    const overview = buildOverview(overviewRevenueRecords, month, companyTarget);
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
      overviewComparisons: buildOverviewComparisons(overview, previousOverviewRevenueRecords),
      overviewGroups: buildGroupRanking(overviewRevenueRecords),
      overviewAgents: buildAgentRanking(overviewRevenueRecords),
      overviewTimeSeries: buildTimeSeries(overviewRevenueRecords, month, companyTarget),
      overviewContracts: overviewRevenueRecords.slice(0, 500),
      adsPlanActuals: buildAdsPlanActuals(allYearRecords, filters),
      planSummary: buildAfypPlanSummary(month, allYearRecords, companyTarget),
      planTable,
      groups: buildGroupRanking(rankingRecords),
      agents: buildAgentRanking(rankingRecords),
      statuses: buildStatusReport(filteredRecords),
      timeSeries: {
        ...buildTimeSeries(filteredRecords, month, companyTarget),
        yearPlanRows: buildYearPlanSeries(planTable)
      },
      ads: buildAdsReport(filteredRecords),
      starViet: buildStarVietReport(starVietError ? [] : (starVietRecords ?? []) as StarVietRecord[]),
      starVietWarning: starVietError ? "Chưa có bảng dữ liệu Sao Việt. Vui lòng chạy schema mới trước khi upload." : null,
      competitionContracts: allRecords,
      contracts: filteredRecords.slice(0, 500)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
