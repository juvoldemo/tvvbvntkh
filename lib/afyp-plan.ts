import type { MonthlyTarget, RevenueRecord } from "./types";

export type AfypMonthlyPlan = {
  month: number;
  monthKey: string;
  rate: number;
  planMillion: number;
  planVnd: number;
};

export const AFYP_PLAN_YEAR = 2026;

export const AFYP_2026_MONTHLY_PLAN: AfypMonthlyPlan[] = [
  { month: 1, monthKey: "2026-01", rate: 6.5, planMillion: 3510, planVnd: 3_510_000_000 },
  { month: 2, monthKey: "2026-02", rate: 5.0, planMillion: 2700, planVnd: 2_700_000_000 },
  { month: 3, monthKey: "2026-03", rate: 8.5, planMillion: 4590, planVnd: 4_590_000_000 },
  { month: 4, monthKey: "2026-04", rate: 8.0, planMillion: 4320, planVnd: 4_320_000_000 },
  { month: 5, monthKey: "2026-05", rate: 8.5, planMillion: 4590, planVnd: 4_590_000_000 },
  { month: 6, monthKey: "2026-06", rate: 9.0, planMillion: 4860, planVnd: 4_860_000_000 },
  { month: 7, monthKey: "2026-07", rate: 8.5, planMillion: 4590, planVnd: 4_590_000_000 },
  { month: 8, monthKey: "2026-08", rate: 8.5, planMillion: 4590, planVnd: 4_590_000_000 },
  { month: 9, monthKey: "2026-09", rate: 8.5, planMillion: 4590, planVnd: 4_590_000_000 },
  { month: 10, monthKey: "2026-10", rate: 9.0, planMillion: 4860, planVnd: 4_860_000_000 },
  { month: 11, monthKey: "2026-11", rate: 9.5, planMillion: 5130, planVnd: 5_130_000_000 },
  { month: 12, monthKey: "2026-12", rate: 10.5, planMillion: 5670, planVnd: 5_670_000_000 }
];

export const AFYP_2026_YEARLY_PLAN = 54_000_000_000;

function sumAfyp(records: RevenueRecord[]) {
  return records.reduce((sum, record) => sum + (Number(record.afyp) || 0), 0);
}

function monthNumber(month: string) {
  return Number(month.slice(5, 7));
}

function progress(actual: number, plan: number, overLabel: string) {
  const remaining = Math.max(plan - actual, 0);
  const over = Math.max(actual - plan, 0);
  return {
    plan,
    actual,
    remaining,
    over,
    progressPercent: plan > 0 ? (actual / plan) * 100 : null,
    status: over > 0 ? overLabel : null
  };
}

export function getFixedMonthlyPlan(month: string) {
  return AFYP_2026_MONTHLY_PLAN.find((item) => item.monthKey === month.slice(0, 7)) ?? null;
}

export function getEffectiveMonthlyPlan(month: string, target?: MonthlyTarget | null) {
  const adminTarget = Number(target?.afyp_target) || 0;
  if (adminTarget > 0) {
    return {
      plan: adminTarget,
      source: "admin" as const,
      fixedPlan: getFixedMonthlyPlan(month)
    };
  }

  const fixedPlan = getFixedMonthlyPlan(month);
  return {
    plan: fixedPlan?.planVnd ?? 0,
    source: fixedPlan ? ("fixed_2026" as const) : ("none" as const),
    fixedPlan
  };
}

export function buildAfypPlanSummary(month: string, yearRecords: RevenueRecord[], target?: MonthlyTarget | null) {
  const selectedMonth = monthNumber(month);
  const effectiveMonthlyPlan = getEffectiveMonthlyPlan(month, target);
  const monthlyActual = sumAfyp(yearRecords.filter((record) => record.paid_date.slice(0, 7) === month.slice(0, 7)));
  const ytdRecords = yearRecords.filter((record) => Number(record.paid_date.slice(5, 7)) <= selectedMonth);
  const ytdActual = sumAfyp(ytdRecords);
  const yearlyActual = sumAfyp(yearRecords);
  const ytdPlan = AFYP_2026_MONTHLY_PLAN
    .filter((item) => item.month <= selectedMonth)
    .reduce((sum, item) => sum + item.planVnd, 0);

  return {
    year: AFYP_PLAN_YEAR,
    monthly: {
      ...progress(monthlyActual, effectiveMonthlyPlan.plan, "Vượt kế hoạch"),
      source: effectiveMonthlyPlan.source,
      fixedPlan: effectiveMonthlyPlan.fixedPlan
    },
    ytd: progress(ytdActual, ytdPlan, "Vượt kế hoạch lũy kế"),
    yearly: progress(yearlyActual, AFYP_2026_YEARLY_PLAN, "Vượt kế hoạch năm")
  };
}

export function buildAfypPlanTable(yearRecords: RevenueRecord[]) {
  let cumulativeActual = 0;
  let cumulativePlan = 0;

  return AFYP_2026_MONTHLY_PLAN.map((plan) => {
    const actual = sumAfyp(yearRecords.filter((record) => record.paid_date.slice(0, 7) === plan.monthKey));
    cumulativeActual += actual;
    cumulativePlan += plan.planVnd;
    return {
      ...plan,
      actual,
      remaining: Math.max(plan.planVnd - actual, 0),
      progressPercent: plan.planVnd > 0 ? (actual / plan.planVnd) * 100 : null,
      cumulativePlan,
      cumulativeActual
    };
  });
}
