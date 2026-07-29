import { NextRequest, NextResponse } from "next/server";
import { getVietnamToday, monthBounds, toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { estimateRewardsForDraftContracts, type DraftRewardContract } from "@/lib/tvv-reward-estimator";
import { calculatePolicyRewards, policyProgramSummaries } from "@/lib/tvv-policy-rewards";
import { userCodeFromRequest } from "@/lib/user-auth";
import { calculateCompetitionReward, getBaseEligibleCompetitionContracts } from "@/src/lib/competition/competitionRuleEngine";
import { dedupeRevenueRecordsByContract } from "@/lib/reports";
import { isPreTeamLeaderPosition, managedTeamName } from "@/lib/team-scope";
import { competitionIsVisibleTo, competitionViewerAudience } from "@/lib/competition-audience";

const ACQUISITION_COMMISSION_BREAKDOWN = [
  { label: "Năm 1", rate: 0.3 },
  { label: "Năm 2", rate: 0.15 },
  { label: "Năm 3", rate: 0.075 },
  { label: "Năm 4", rate: 0.04 }
];
const ACQUISITION_COMMISSION_TOTAL_RATE = ACQUISITION_COMMISSION_BREAKDOWN.reduce((sum, item) => sum + item.rate, 0);

function acquisitionCommissionLabel() {
  return ACQUISITION_COMMISSION_BREAKDOWN.map((item) => `${item.label} ${Math.round(item.rate * 1000) / 10}%`).join(" + ");
}

function acquisitionCommissionReward(premium: number) {
  return premium * ACQUISITION_COMMISSION_TOTAL_RATE;
}

function firstYearAcquisitionCommissionReward(premium: number) {
  return premium * ACQUISITION_COMMISSION_BREAKDOWN[0].rate;
}

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

function isGiftRewardRule(rule: any) {
  if (rule?.gift_quantity != null || rule?.gift_value != null || rule?.reward?.quantity != null || rule?.reward?.value != null) return true;
  const text = normalizeAdvisorIdentity([
    rule?.reward_value_type,
    rule?.reward_type,
    rule?.reward_name,
    rule?.prize_name,
    rule?.reward?.type,
    rule?.reward?.value_type
  ].filter(Boolean).join(" "));
  return text.includes("gift") || text.includes("qua") || text.includes("san pham") || text.includes("hien vat");
}

function giftLabelsFromResults(rows: any[]) {
  return [...new Set(rows.flatMap((row: any) => [
    ...(Array.isArray(row?.achievedRewardNames) ? row.achievedRewardNames : []),
    row?.prizeName,
    row?.rewardName
  ]).map(normalizeGiftLabel).filter(Boolean))];
}

function normalizeGiftLabel(value: unknown) {
  const original = String(value || "").trim();
  const text = normalizeAdvisorIdentity(original);
  if (text.includes("toshiba")) return "Quạt đứng Toshiba";
  if (text.includes("xiaomi")) return "Máy tính bảng Xiaomi";
  if (text.includes("samsung")) return "Máy tính bảng Samsung";
  if (text.includes("xe") && (text.includes("may") || text.includes("dien"))) return "Xe máy điện";
  return original;
}

function previousMonthKey(month: string) {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function contractBelongsToAdvisor(record: any, advisor: { code: string; name: string }) {
  const advisorCode = normalizeAdvisorIdentity(advisor.code);
  const advisorName = normalizeAdvisorIdentity(advisor.name);
  const recordCode = normalizeAdvisorIdentity(record.agent_code ?? record.tvv_code ?? record.advisor_code);
  const recordName = normalizeAdvisorIdentity(record.agent_name ?? record.tvv ?? record.advisor);
  return Boolean((advisorCode && advisorCode === recordCode) || (advisorName && advisorName === recordName));
}

async function advisorBelongsToManagedGroup(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  advisorCode: string,
  managedGroup: string,
  profileGroupName?: string | null
) {
  if (String(profileGroupName || "").trim() === managedGroup) return true;
  const { data, error } = await supabase
    .from("revenue_records")
    .select("group_name")
    .eq("agent_code", advisorCode)
    .eq("group_name", managedGroup)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const signedInAdvisorCode = userCodeFromRequest(request);
    const recruitmentMode = payload.recruitmentMode === true;
    const supabase = getSupabaseAdmin();
    if (recruitmentMode && signedInAdvisorCode !== "ADMINTN") {
      const { data: signedInProfile, error: signedInError } = signedInAdvisorCode
        ? await supabase
          .from("authorized_users")
          .select("advisor_code,full_name,advisor_position,group_name")
          .eq("advisor_code", signedInAdvisorCode)
          .single()
        : { data: null, error: null };
      const managedGroup = signedInProfile
        ? managedTeamName(
          signedInProfile.advisor_code,
          signedInProfile.advisor_position,
          signedInProfile.full_name,
          signedInProfile.group_name
        )
        : "";
      const isPreTeamLeader = isPreTeamLeaderPosition(signedInProfile?.advisor_position);
      if (signedInError || (!managedGroup && !isPreTeamLeader)) {
        return NextResponse.json({ error: "Tính năng này chỉ dành cho tài khoản tuyển dụng, Tiền trưởng nhóm hoặc Trưởng nhóm." }, { status: 403 });
      }
    }
    const month = String(payload.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const recruitmentTrainingCompleted = payload.trainingCompleted !== false;
    const requestedAdvisor = {
      code: String(payload.advisor?.code || "").trim().toUpperCase(),
      name: String(payload.advisor?.name || ""),
      ban: String(payload.advisor?.ban || ""),
      group: String(payload.advisor?.group || ""),
      ads: String(payload.advisor?.ads || "")
    };
    const viewerAudience = await competitionViewerAudience(request);
    let advisor = recruitmentMode ? {
      code: "ADMINTN",
      name: "TVV mới",
      ban: "",
      group: "",
      ads: ""
    } : {
      ...requestedAdvisor,
      code: signedInAdvisorCode || requestedAdvisor.code
    };
    const draftContracts = (Array.isArray(payload.draftContracts) ? payload.draftContracts : []) as DraftRewardContract[];
    if (!recruitmentMode && signedInAdvisorCode && requestedAdvisor.code && requestedAdvisor.code !== signedInAdvisorCode) {
      const [{ data: signedInProfile, error: signedInError }, { data: targetProfile, error: targetError }] = await Promise.all([
        supabase.from("authorized_users").select("advisor_code,full_name,advisor_position,group_name").eq("advisor_code", signedInAdvisorCode).single(),
        supabase.from("authorized_users").select("advisor_code,full_name,group_name").eq("advisor_code", requestedAdvisor.code).single()
      ]);
      if (signedInError) throw signedInError;
      if (targetError) throw targetError;
      const managedGroup = managedTeamName(
        signedInProfile.advisor_code,
        signedInProfile.advisor_position,
        signedInProfile.full_name,
        signedInProfile.group_name
      );
      const hasPermission = managedGroup
        ? await advisorBelongsToManagedGroup(supabase, requestedAdvisor.code, managedGroup, targetProfile.group_name)
        : false;
      if (!hasPermission) {
        return NextResponse.json({ error: "Khong co quyen tinh thuong cho TVV nay." }, { status: 403 });
      }
      advisor = {
        code: targetProfile.advisor_code,
        name: targetProfile.full_name || requestedAdvisor.name,
        ban: requestedAdvisor.ban,
        group: targetProfile.group_name || requestedAdvisor.group,
        ads: requestedAdvisor.ads
      };
    }
    if (!advisor.name && !advisor.code) {
      return NextResponse.json({ error: "Thiếu thông tin TVV." }, { status: 400 });
    }

    const year = month.slice(0, 4);
    const previousMonth = previousMonthKey(month);
    const yearStart = `${year}-01`;
    const dataStartMonth = previousMonth < yearStart ? previousMonth : yearStart;
    const policyDataStart = `${dataStartMonth}-01`;
    const revenueDataStart = `${dataStartMonth}-01`;
    const advisorProfileQuery = advisor.code
      ? supabase.from("authorized_users").select("advisor_code,start_date").eq("advisor_code", advisor.code)
      : supabase.from("authorized_users").select("advisor_code,start_date");
    const [{ data: programs, error: programError }, { data: policyRecords, error: policyError }, { data: yearContracts, error: yearContractsError }, { data: advisorProfiles, error: advisorProfilesError }] = await Promise.all([
      supabase.from("competition_programs").select("*"),
      supabase.from("tvv_reward_policy_records").select("*").gte("data_month", policyDataStart).lte("data_month", `${year}-12-31`),
      supabase.from("revenue_records").select("*").neq("data_month", "2099-01-01").gte("paid_date", revenueDataStart).lte("paid_date", `${year}-12-31`),
      advisorProfileQuery
    ]);
    if (programError) throw programError;
    if (yearContractsError) throw yearContractsError;
    if (advisorProfilesError) throw advisorProfilesError;
    const effectiveAdvisorProfiles = recruitmentMode
      ? [{
          advisor_code: advisor.code,
          start_date: String(payload.recruitmentStartDate || draftContracts[0]?.expectedPaidDate || `${month}-01`).slice(0, 10)
        }]
      : (advisorProfiles ?? []);

    const visiblePrograms = (programs ?? []).filter((program: any) =>
      program.is_hidden !== true
      && program.is_hidden !== "true"
      && program.is_hidden !== 1
      && competitionIsVisibleTo(program, viewerAudience)
    );
    const calculablePrograms = visiblePrograms.filter((program: any) => program.confirmed_rule);
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
      originalFileUrl: program.original_file_url || null,
      originalFileName: program.original_file_name || null,
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
        const rewardRules = Array.isArray(program.rule.reward_rules) ? program.rule.reward_rules : [];
        const giftRules = rewardRules.filter(isGiftRewardRule);
        const rewardKind = giftRules.length > 0 ? "gift" : "cash";
        const giftLabels = giftLabelsFromResults([...actual.tvvRewardResults, ...actual.contractRewardResults]);
        const hasGiftReward = rewardKind === "gift" && giftLabels.length > 0;
        const milestoneTiers = primaryRule?.thresholds ?? primaryRule?.tiers ?? primaryRule?.condition?.tiers
          ?? program.rule.thresholds ?? program.rule.tiers ?? program.rule.condition?.tiers ?? [];
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
        const milestoneCurrentIp = actual.tvvRewardResults.reduce((sum: number, row: any) => sum + Number(row.totalIP ?? 0), 0)
          || actual.contractRewardResults.reduce((sum: number, row: any) => sum + Number(row.ip ?? 0), 0);
        return [program.id, {
          actualContractCount: Math.max(advisorContractCount, contractRewardCount),
          actualReward: advisorReward + contractReward,
          isEligible: advisorReward + contractReward > 0 || hasGiftReward,
          rewardKind,
          giftLabels,
          milestoneType: milestoneTiers.length ? "revenue-tier" : undefined,
          milestoneMetricLabel: usesIp ? "Phí đầu tiên (IP)" : "AFYP",
          milestoneCurrentBasis,
          milestoneCurrentIp,
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
    const allProgramSummaries = visiblePrograms
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
          rewardKind: actual?.rewardKind ?? "cash",
          giftLabels: actual?.giftLabels ?? [],
          milestoneType: actual?.milestoneType,
          milestoneMetricLabel: actual?.milestoneMetricLabel,
          milestoneCurrentBasis: Number(actual?.milestoneCurrentBasis ?? 0),
          milestoneCurrentIp: Number(actual?.milestoneCurrentIp ?? 0),
          milestoneCurrentReward: Number(actual?.milestoneCurrentReward ?? 0),
          milestoneContractCount: Number(actual?.milestoneContractCount ?? 0),
          milestoneTiers: actual?.milestoneTiers ?? [],
          participatingContracts: actual?.participatingContracts ?? []
        };
      });
    const simulatedMonthBounds = monthBounds(month);
    const ongoingPrograms = allProgramSummaries.filter((program: any) => recruitmentMode
      ? program.startDate <= simulatedMonthBounds.end && program.endDate >= simulatedMonthBounds.start
      : program.startDate <= today && program.endDate >= today);
    const endedPrograms = allProgramSummaries.filter((program: any) => program.endDate < today);
    const configuredPolicyPrograms = allProgramSummaries.filter((program: any) => isPolicyRewardProgram(program.programName));
    const missingPolicyTable = policyError?.code === "42P01" || policyError?.code === "PGRST205";
    if (policyError && !missingPolicyTable) throw policyError;
    const policyResult = calculatePolicyRewards({
      selectedMonth: month,
      kpi04: policyRecords ?? [],
      bc02: dedupedYearContracts,
      advisorProfiles: effectiveAdvisorProfiles,
      newAdvisorTrainingCompleted: recruitmentMode ? recruitmentTrainingCompleted : undefined,
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
      advisorProfiles: effectiveAdvisorProfiles,
      newAdvisorTrainingCompleted: recruitmentMode ? recruitmentTrainingCompleted : undefined,
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
    const calculatedPolicyById = new Map(calculatedPolicyPrograms.map((program) => [program.programId, program]));
    const calculatorPolicyPrograms = projectedPolicyPrograms.map((projected) => {
      const current = calculatedPolicyById.get(projected.programId);
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
    const commissionReward = draftContracts.reduce((sum, draft) => sum + acquisitionCommissionReward(Number(draft.premium) || 0), 0);
    const totalDraftPremium = draftContracts.reduce((sum, draft) => sum + (Number(draft.premium) || 0), 0);
    const competitionRewardByDraft = new Map(
      (result.rewardByDraftContract ?? []).map((row: any) => [row.draftId, Number(row.estimatedReward ?? 0)])
    );
    const calculatorDraftRewards = draftContracts.map((draft) => {
      const premium = Number(draft.premium) || 0;
      const premiumShare = totalDraftPremium > 0 ? premium / totalDraftPremium : 0;
      const commission = acquisitionCommissionReward(premium);
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
        period: acquisitionCommissionLabel(),
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
      calculatorTotalEstimatedReward: Number(result.totalEstimatedReward ?? 0)
        + policyIncrementalReward
        + draftContracts.reduce((sum, draft) => sum + firstYearAcquisitionCommissionReward(Number(draft.premium) || 0), 0),
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
