import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DashboardFilters, MonthlyTarget, RevenueRecord } from "@/lib/types";
import { buildAfypPlanSummary, buildAfypPlanTable } from "@/lib/afyp-plan";
import { applyFilters, buildAdsReport, buildAgentRanking, buildGroupRanking, buildOverview, buildStatusReport, buildTimeSeries, buildYearPlanSeries, filterOptions, isOverviewRevenueRecord, isValidForRanking, sortContractDetails } from "@/lib/reports";
import { monthBounds, toMonthStart } from "@/lib/format";
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
    const supabase = getSupabaseAdmin();

    const [{ data: records, error: recordsError }, { data: yearRecords, error: yearRecordsError }, { data: target, error: targetError }, { data: latestUpload }, { data: uploadsByMonth }] = await Promise.all([
      supabase.from("revenue_records").select("*").eq("data_month", toMonthStart(month)).gte("paid_date", start).lte("paid_date", end),
      supabase.from("revenue_records").select("*").gte("paid_date", "2026-01-01").lte("paid_date", "2026-12-31"),
      supabase.from("monthly_targets").select("*").eq("target_month", toMonthStart(month)).eq("target_level", "company").is("target_code", null).maybeSingle(),
      supabase.from("upload_batches").select("*").eq("data_month", toMonthStart(month)).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("upload_batches").select("data_month, uploaded_at").order("uploaded_at", { ascending: false })
    ]);

    if (recordsError) throw recordsError;
    if (yearRecordsError) throw yearRecordsError;
    if (targetError) throw targetError;

    const availableMonths = [...new Set(((uploadsByMonth ?? []) as Array<{ data_month?: string | null }>).map((item) => String(item.data_month ?? "").slice(0, 7)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a));

    const withDisplayContractNo = (items: RevenueRecord[]) => items.map((record) => ({
      ...record,
      contract_no_display: record.contract_no?.startsWith("Num-") ? "Num" : record.contract_no
    }));
    const allRecords = withDisplayContractNo((records ?? []) as RevenueRecord[]);
    const allYearRecords = withDisplayContractNo((yearRecords ?? []) as RevenueRecord[]);
    const starYear = Number(month.slice(0, 4)) || new Date().getFullYear();
    const { data: starVietRecords, error: starVietError } = await supabase
      .from("star_viet_records")
      .select("*")
      .eq("data_year", starYear);
    const filteredRecords = sortContractDetails(applyFilters(allRecords, filters));
    const overviewRevenueRecords = sortContractDetails(filteredRecords.filter(isOverviewRevenueRecord));
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
      contracts: filteredRecords.slice(0, 500)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
