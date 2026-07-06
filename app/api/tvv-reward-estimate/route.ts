import { NextRequest, NextResponse } from "next/server";
import { getVietnamToday, monthBounds, toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { estimateRewardsForDraftContracts, type DraftRewardContract } from "@/lib/tvv-reward-estimator";
import { calculatePolicyRewards, policyProgramSummaries } from "@/lib/tvv-policy-rewards";
import { userCodeFromRequest } from "@/lib/user-auth";
import { calculateCompetitionReward, getBaseEligibleCompetitionContracts } from "@/src/lib/competition/competitionRuleEngine";
import { dedupeRevenueRecordsByContract } from "@/lib/reports";

function programDateRange(program: any, month: string) {
  const rule = program.confirmed_rule || program.ai_rule || {};
  const bounds = monthBounds(month);
  return {
    start: String(program.start_date || rule.start_date || bounds.start).slice(0, 10),
    end: String(program.end_date || rule.end_date || bounds.end).slice(0, 10)
  };
}

function isPolicyRewardProgram(programName: unknown) {
  const normalized = String(programName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized.includes("thuong nang suat thang") || normalized.includes("thuong quy");
}

function normalizeAdvisorIdentity(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

function contractBelongsToAdvisor(record: any, advisor: { code: string; name: string }) {
  const advisorCode = normalizeAdvisorIdentity(advisor.code);
  const advisorName = normalizeAdvisorIdentity(advisor.name);
  const recordCode = normalizeAdvisorIdentity(record.agent_code ?? record.tvv_code ?? record.advisor_code);
  const recordName = normalizeAdvisorIdentity(record.agent_name ?? record.tvv ?? record.advisor);
  return Boolean((advisorCode && advisorCode === recordCode) || (advisorName && advisorName === recordName));
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const signedInAdvisorCode = userCodeFromRequest(request);
    const month = String(payload.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const advisor = {
      code: signedInAdvisorCode || String(payload.advisor?.code || ""),
      name: String(payload.advisor?.name || ""),
      ban: String(payload.advisor?.ban || ""),
      group: String(payload.advisor?.group || ""),
      ads: String(payload.advisor?.ads || "")
    };
    const draftContracts = (Array.isArray(payload.draftContracts) ? payload.draftContracts : []) as DraftRewardContract[];
    if (!advisor.name && !advisor.code) {
      return NextResponse.json({ error: "Thiếu thông tin TVV." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const year = month.slice(0, 4);
    const advisorProfileQuery = advisor.code
      ? supabase.from("authorized_users").select("advisor_code,start_date").eq("advisor_code", advisor.code)
      : supabase.from("authorized_users").select("advisor_code,start_date");
    const [{ data: programs, error: programError }, { data: policyRecords, error: policyError }, { data: yearContracts, error: yearContractsError }, { data: advisorProfiles, error: advisorProfilesError }] = await Promise.all([
      supabase.from("competition_programs").select("*"),
      supabase.from("tvv_reward_policy_records").select("*").gte("data_month", `${year}-01-01`).lte("data_month", `${year}-12-31`),
      supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").gte("paid_date", `${year}-01-01`).lte("paid_date", `${year}-12-31`),
      advisorProfileQuery
    ]);
    if (programError) throw programError;
    if (yearContractsError) throw yearContractsError;
    if (advisorProfilesError) throw advisorProfilesError;

    const calculablePrograms = (programs ?? []).filter((program: any) => program.confirmed_rule);
    const ranges = calculablePrograms.map((program: any) => programDateRange(program, month));
    const start = ranges.map((range) => range.start).sort()[0] || monthBounds(month).start;
    const end = ranges.map((range) => range.end).sort().at(-1) || monthBounds(month).end;
    const { data: contracts, error: contractError } = await supabase
      .from("revenue_records")
      .select("*")
      .neq("data_month", "2099-01-01")
      .gte("paid_date", start)
      .lte("paid_date", end);
    if (contractError) throw contractError;
    const dedupedContracts = dedupeRevenueRecordsByContract((contracts ?? []) as any);
    const dedupedYearContracts = dedupeRevenueRecordsByContract((yearContracts ?? []) as any);

    const competitionRules = calculablePrograms.map((program: any) => ({
      id: program.id,
      programName: program.program_name || program.confirmed_rule?.program_name || "Chương trình thi đua",
      status: program.status,
      isHidden: program.is_hidden === true || program.is_hidden === "true" || program.is_hidden === 1,
      range: programDateRange(program, month),
      rule: {
        ...program.confirmed_rule,
        id: program.id,
        program_name: program.program_name || program.confirmed_rule?.program_name,
        start_date: program.start_date || program.confirmed_rule?.start_date,
        end_date: program.end_date || program.confirmed_rule?.end_date,
        issue_deadline: program.issue_deadline || program.confirmed_rule?.issue_deadline
      }
    }));

    let result = {
      rewardByProgram: [] as any[],
      eligibleProgramCount: 0,
      totalEstimatedReward: 0,
      rewardByDraftContract: [] as any[]
    };
    try {
      result = estimateRewardsForDraftContracts({
        draftContracts,
        currentContracts: dedupedContracts,
        competitionRules,
        advisor
      });
    } catch (error) {
      console.error("[tvv-reward-estimate] reward estimate failed", error);
    }

    const today = getVietnamToday();
    const currentAdvisorContracts = dedupedContracts.filter((record: any) => contractBelongsToAdvisor(record, advisor));
    const actualRewardByProgram = new Map(competitionRules.map((program: any) => {
      try {
        const actual = calculateCompetitionReward(program.rule, currentAdvisorContracts);
        const advisorReward = actual.tvvRewardResults.reduce((sum: number, row: any) => sum + Number(row.rewardAmount ?? 0), 0);
        const contractReward = actual.contractRewardResults.reduce((sum: number, row: any) => sum + Number(row.rewardAmount ?? 0), 0);
        const advisorContractCount = actual.tvvRewardResults.reduce((sum: number, row: any) => sum + Number(row.contractCount ?? 0), 0);
        const contractRewardCount = actual.contractRewardResults.length;
        const primaryRule = program.rule.reward_rules?.[0];
        const milestoneTiers = primaryRule?.thresholds ?? program.rule.thresholds ?? program.rule.tiers ?? [];
        const metricText = normalizeAdvisorIdentity(
          primaryRule?.calculation_logic ?? program.rule.calculation_logic ?? program.rule.metric_type
        );
        const usesIp = metricText.includes("ip") || metricText.includes("pdt") || metricText.includes("phi dau tien");
        const milestoneCurrentBasis = actual.tvvRewardResults.reduce(
          (sum: number, row: any) => sum + Number(usesIp ? row.totalIP : row.totalAFYP),
          0
        );
        const participatingContracts = getBaseEligibleCompetitionContracts(program.rule, currentAdvisorContracts)
          .map((contract: any) => ({
            applicationNo: contract.applicationNo || contract.gyc_no || "",
            policyOwner: contract.customer || contract.customer_name || "Chưa có tên BMBH",
            status: contract.status || "Chưa có trạng thái"
          }));
        return [program.id, {
          actualContractCount: Math.max(advisorContractCount, contractRewardCount),
          actualReward: advisorReward + contractReward,
          isEligible: advisorReward + contractReward > 0,
          milestoneType: milestoneTiers.length ? "revenue-tier" : undefined,
          milestoneMetricLabel: usesIp ? "Phí đầu tiên (IP)" : "AFYP",
          milestoneCurrentBasis,
          milestoneCurrentReward: advisorReward + contractReward,
          milestoneContractCount: Math.max(advisorContractCount, contractRewardCount),
          milestoneTiers,
          participatingContracts
        }];
      } catch (error) {
        console.error(`[tvv-reward-estimate] actual competition calculation failed for ${program.id}`, error);
        return [program.id, { actualContractCount: 0, actualReward: 0, isEligible: false }];
      }
    }));
    const allProgramSummaries = (programs ?? [])
      .map((program: any) => ({
        id: program.id,
        programName: program.program_name || program.confirmed_rule?.program_name || program.ai_rule?.program_name || "Chương trình thi đua",
        originalFileUrl: program.original_file_url || null,
        originalFileName: program.original_file_name || null,
        issueDeadline: program.issue_deadline || program.confirmed_rule?.issue_deadline || program.ai_rule?.issue_deadline || null,
        status: program.status,
        isHidden: program.is_hidden === true || program.is_hidden === "true" || program.is_hidden === 1,
        range: programDateRange(program, month)
      }))
      .filter((program: any) => !program.isHidden)
      .sort((a: any, b: any) => a.range.end.localeCompare(b.range.end) || a.range.start.localeCompare(b.range.start))
      .map((program: any) => {
        const actual = actualRewardByProgram.get(program.id) as any;
        return {
          programId: program.id,
          programName: program.programName,
          originalFileUrl: program.originalFileUrl,
          originalFileName: program.originalFileName,
          issueDeadline: program.issueDeadline,
          status: program.status,
          startDate: program.range.start,
          endDate: program.range.end,
          estimatedReward: Number(actual?.actualReward ?? 0),
          actualContractCount: Number(actual?.actualContractCount ?? 0),
          matchedContracts: [],
          isEligible: Boolean(actual?.isEligible),
          milestoneType: actual?.milestoneType,
          milestoneMetricLabel: actual?.milestoneMetricLabel,
          milestoneCurrentBasis: Number(actual?.milestoneCurrentBasis ?? 0),
          milestoneCurrentReward: Number(actual?.milestoneCurrentReward ?? 0),
          milestoneContractCount: Number(actual?.milestoneContractCount ?? 0),
          milestoneTiers: actual?.milestoneTiers ?? [],
          participatingContracts: actual?.participatingContracts ?? []
        };
      });
    const ongoingPrograms = allProgramSummaries.filter((program: any) => program.startDate <= today && program.endDate >= today);
    const endedPrograms = allProgramSummaries.filter((program: any) => program.endDate < today);
    const configuredPolicyPrograms = allProgramSummaries.filter((program: any) => isPolicyRewardProgram(program.programName));
    const missingPolicyTable = policyError?.code === "42P01" || policyError?.code === "PGRST205";
    if (policyError && !missingPolicyTable) throw policyError;
    const policyResult = calculatePolicyRewards({
      selectedMonth: month,
      kpi04: policyRecords ?? [],
      bc02: dedupedYearContracts,
      advisorProfiles: advisorProfiles ?? [],
      filters: {
        agentCode: advisor.code || undefined,
        agent: advisor.code ? undefined : advisor.name || undefined,
        // Mã TVV là khóa nghiệp vụ xuyên suốt. Không lọc thêm ban/nhóm/ADS
        // khi đã có mã vì các thông tin tổ chức có thể thay đổi giữa các tháng.
        ban: advisor.code ? undefined : advisor.ban || undefined,
        group: advisor.code ? undefined : advisor.group || undefined,
        ads: advisor.code ? undefined : advisor.ads || undefined
      }
    });
    const calculatedPolicyPrograms = missingPolicyTable ? [] : policyProgramSummaries(policyResult, month);
    const draftPolicyContracts = draftContracts.map((draft, index) => ({
      id: `policy-draft-${draft.id}`,
      data_month: `${draft.expectedPaidDate.slice(0, 7)}-01`,
      paid_date: draft.expectedPaidDate,
      agent_code: advisor.code,
      agent_name: advisor.name,
      ban_name: advisor.ban,
      group_name: advisor.group,
      ads_name: advisor.ads,
      application_no: `POLICY-DRAFT-${index + 1}-${draft.id}`,
      contract_no: `POLICY-DRAFT-${index + 1}-${draft.id}`,
      ip: Number(draft.premium) || 0,
      afyp: Number(draft.premium) || 0,
      estimated_fyp: Number(draft.premium) || 0,
      policy_status: draft.status || "Chờ phát hành",
      raw_data: { draft_id: draft.id, is_reward_estimate: true }
    }));
    const projectedPolicyResult = calculatePolicyRewards({
      selectedMonth: month,
      kpi04: policyRecords ?? [],
      bc02: [...dedupedYearContracts, ...draftPolicyContracts],
      advisorProfiles: advisorProfiles ?? [],
      filters: {
        agentCode: advisor.code || undefined,
        agent: advisor.code ? undefined : advisor.name || undefined,
        ban: advisor.code ? undefined : advisor.ban || undefined,
        group: advisor.code ? undefined : advisor.group || undefined,
        ads: advisor.code ? undefined : advisor.ads || undefined
      }
    });
    const projectedPolicyPrograms = missingPolicyTable ? [] : policyProgramSummaries(projectedPolicyResult, month);
    const draftEstimatedFyc = draftContracts.reduce((sum, draft) => sum + (Number(draft.premium) || 0) * 0.3, 0);
    const calculatorPolicyPrograms = projectedPolicyPrograms.map((projected, index) => {
      const current = calculatedPolicyPrograms[index];
      const currentRow = current?.rows?.[0];
      const projectedRow = projected.rows?.[0];
      const currentReward = Number(current?.estimatedReward ?? 0);
      const projectedReward = Number(projected.estimatedReward ?? 0);
      const calculatedIncrease = Math.max(0, projectedReward - currentReward);
      // Trong máy tính, mọi hợp đồng dự kiến đều thể hiện phần đóng góp tối
      // thiểu vào thưởng quý theo bậc đầu tiên: FYC dự kiến × 8%.
      const incrementalReward = projected.programId === "policy-quarterly"
        ? Math.max(calculatedIncrease, draftEstimatedFyc * 0.08)
        : calculatedIncrease;
      return {
        ...projected,
        currentReward,
        projectedReward: currentReward + incrementalReward,
        incrementalReward,
        currentRate: Number(currentRow?.rate ?? 0),
        projectedRate: Number(projectedRow?.rate ?? 0),
        currentAchieved: Boolean(currentRow?.achieved),
        projectedAchieved: Boolean(projectedRow?.achieved),
        currentIp: Number(currentRow?.ip ?? 0),
        projectedIp: Number(projectedRow?.ip ?? 0),
        currentFyp: Number(currentRow?.fyp ?? 0),
        projectedFyp: Number(projectedRow?.fyp ?? 0),
        currentTotalFyc: Number(currentRow?.totalFyc ?? 0),
        projectedTotalFyc: Number(projectedRow?.totalFyc ?? 0),
        nextTierMinimum: projectedRow?.nextTierMinimum ?? null,
        missingToNextTier: Number(projectedRow?.missingToNextTier ?? 0),
        isPolicyProjection: true
      };
    }).filter((program) => program.programId !== "policy-month-13");
    const policyIncrementalReward = calculatorPolicyPrograms.reduce((sum, program) => sum + program.incrementalReward, 0);
    const commissionReward = draftContracts.reduce((sum, draft) => sum + (Number(draft.premium) || 0) * 0.3, 0);
    const totalDraftPremium = draftContracts.reduce((sum, draft) => sum + (Number(draft.premium) || 0), 0);
    const competitionRewardByDraft = new Map(
      (result.rewardByDraftContract ?? []).map((row: any) => [row.draftId, Number(row.estimatedReward ?? 0)])
    );
    const calculatorDraftRewards = draftContracts.map((draft) => {
      const premium = Number(draft.premium) || 0;
      const premiumShare = totalDraftPremium > 0 ? premium / totalDraftPremium : 0;
      const commission = premium * 0.3;
      const competitionReward = Number(competitionRewardByDraft.get(draft.id) ?? 0);
      const policyReward = policyIncrementalReward * premiumShare;
      return {
        draftId: draft.id,
        estimatedReward: commission + competitionReward + policyReward,
        commissionReward: commission,
        competitionReward,
        policyReward
      };
    });
    const calculatorPrograms = [
      ...(result.rewardByProgram ?? []).map((program: any) => ({
        ...program,
        currentReward: Number(program.currentReward ?? 0),
        projectedReward: Number(program.projectedReward ?? program.estimatedReward ?? 0),
        incrementalReward: Number(program.estimatedReward ?? 0),
        isPolicyProjection: false
      })),
      ...calculatorPolicyPrograms,
      {
        programId: "acquisition-commission",
        programName: "Hoa hồng khai thác",
        period: "Phí đóng × 30%",
        estimatedReward: commissionReward,
        currentReward: 0,
        projectedReward: commissionReward,
        incrementalReward: commissionReward,
        isPolicyProjection: false,
        isCommission: true
      }
    ];

    return NextResponse.json({
      month: toMonthStart(month).slice(0, 7),
      ...result,
      rewardByDraftContract: calculatorDraftRewards,
      ongoingPrograms,
      endedPrograms,
      policyRewardPrograms: calculatedPolicyPrograms.length ? calculatedPolicyPrograms : configuredPolicyPrograms,
      rewardMonthContracts: policyResult.rewardMonthContracts,
      rewardYearContracts: policyResult.rewardYearContracts,
      calculatorPrograms,
      calculatorTotalEstimatedReward: Number(result.totalEstimatedReward ?? 0) + policyIncrementalReward + commissionReward,
      calculatorEligibleProgramCount: calculatorPrograms.filter((program: any) => !program.isCommission && Number(program.incrementalReward ?? 0) > 0).length,
      policyWarnings: missingPolicyTable
        ? ["Chưa có bảng dữ liệu thưởng chính sách. Vui lòng chạy migration tạo bảng trước khi upload."]
        : policyResult.warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tính được thưởng dự kiến.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
