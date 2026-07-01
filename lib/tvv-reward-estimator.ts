import { calculateCompetitionReward, getRewardContractKey, type CompetitionRuleInput } from "@/src/lib/competition/competitionRuleEngine";

type AnyRecord = Record<string, any>;

export type DraftRewardContract = {
  id: string;
  productName: string;
  productCode?: string;
  premium: number;
  expectedPaidDate: string;
  expectedIssueDate?: string;
  status?: string;
};

export type RewardProgramInput = {
  id: string;
  programName: string;
  rule: CompetitionRuleInput;
  status?: string;
};

export type AdvisorRewardInput = {
  code?: string;
  name: string;
  ban?: string;
  group?: string;
  ads?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

function advisorMatches(record: AnyRecord, advisor: AdvisorRewardInput) {
  const code = normalizeText(advisor.code);
  const name = normalizeText(advisor.name);
  const recordCode = normalizeText(record.agent_code ?? record.tvv_code ?? record.advisor_code);
  const recordName = normalizeText(record.agent_name ?? record.tvv ?? record.advisor);
  return Boolean((code && recordCode === code) || (name && recordName === name));
}

function draftToCompetitionRecord(draft: DraftRewardContract, advisor: AdvisorRewardInput, index: number) {
  return {
    id: `draft-${draft.id}`,
    draft_id: draft.id,
    data_month: `${draft.expectedPaidDate.slice(0, 7)}-01`,
    paid_date: draft.expectedPaidDate,
    collection_date: draft.expectedPaidDate,
    issued_date: draft.expectedIssueDate || draft.expectedPaidDate,
    issue_date: draft.expectedIssueDate || draft.expectedPaidDate,
    agent_code: advisor.code || "",
    agent_name: advisor.name,
    tvv: advisor.name,
    ban_name: advisor.ban || "",
    group_name: advisor.group || "",
    team: advisor.group || "",
    ads_name: advisor.ads || "",
    product_name: draft.productName,
    product_code: draft.productCode || draft.productName,
    application_no: `DRAFT-${index + 1}-${draft.id}`,
    contract_no: `DRAFT-${index + 1}-${draft.id}`,
    policy_owner: "Hợp đồng dự kiến",
    insured_name: "Hợp đồng dự kiến",
    policy_status: draft.status || "Có hiệu lực",
    ip: draft.premium,
    afyp: draft.premium,
    pdt: draft.premium,
    raw_data: {
      draft_id: draft.id,
      product_code: draft.productCode || draft.productName,
      product: draft.productName,
      pdt: draft.premium
    }
  };
}

function contractKeyFromRow(row: AnyRecord) {
  return getRewardContractKey({
    applicationNo: row.application_no,
    contractNo: row.contract_no,
    paidDate: row.paid_date,
    advisor: row.agent_name,
    customer: row.policy_owner,
    ip: row.ip,
    afyp: row.afyp,
    source: row
  });
}

export function estimateRewardsForDraftContracts(params: {
  draftContracts: DraftRewardContract[];
  currentContracts: AnyRecord[];
  competitionRules: RewardProgramInput[];
  advisor: AdvisorRewardInput;
}) {
  const currentAdvisorContracts = params.currentContracts.filter((record) => advisorMatches(record, params.advisor));
  const draftRows = params.draftContracts.map((draft, index) => draftToCompetitionRecord(draft, params.advisor, index));
  const draftKeyById = new Map(draftRows.map((row) => [row.draft_id, contractKeyFromRow(row)]));
  const draftIdByKey = new Map([...draftKeyById.entries()].map(([id, key]) => [key, id]));
  const combinedContracts = [...currentAdvisorContracts, ...draftRows];
  const rewardByDraft = new Map<string, { draftId: string; estimatedReward: number; matchedPrograms: AnyRecord[] }>();
  const rewardByProgram: AnyRecord[] = [];
  const warnings: string[] = [];

  for (const draft of params.draftContracts) {
    rewardByDraft.set(draft.id, { draftId: draft.id, estimatedReward: 0, matchedPrograms: [] });
  }

  for (const program of params.competitionRules) {
    if (!program.rule) continue;
    try {
      const eligibleDraftRows = draftRows.filter((row) =>
        (!program.rule.start_date || row.paid_date >= program.rule.start_date)
        && (!program.rule.end_date || row.paid_date <= program.rule.end_date)
      );
      if (eligibleDraftRows.length === 0) continue;
      const eligibleDraftKeys = new Set(eligibleDraftRows.map(contractKeyFromRow));
      const result = calculateCompetitionReward(program.rule, combinedContracts);
      const baseline = calculateCompetitionReward(program.rule, currentAdvisorContracts);
      const matchedContracts = result.contractRewardResults.filter((contract) => eligibleDraftKeys.has(getRewardContractKey(contract)));
      const matchedAdvisors = result.tvvRewardResults.filter((row) => normalizeText(row.advisor) === normalizeText(params.advisor.name));
      const baselineAdvisors = baseline.tvvRewardResults.filter((row) => normalizeText(row.advisor) === normalizeText(params.advisor.name));
      const projectedTotal = result.contractRewardResults.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0)
        + matchedAdvisors.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0);
      const baselineTotal = baseline.contractRewardResults.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0)
        + baselineAdvisors.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0);
      const estimatedReward = Math.max(0, projectedTotal - baselineTotal);
      if (estimatedReward <= 0) continue;

      const conditionText = [
        program.rule.reward_rules?.[0]?.condition_text,
        program.rule.reward_rules?.[0]?.reward_formula,
        program.rule.ai_summary
      ].find(Boolean) || "Đạt điều kiện chương trình";

      rewardByProgram.push({
        programId: program.id,
        programName: program.programName || program.rule.program_name,
        matchedContracts: matchedContracts.map((contract) => ({
          draftId: draftIdByKey.get(getRewardContractKey(contract)),
          applicationNo: contract.applicationNo,
          product: contract.product,
          ip: contract.ip,
          rewardAmount: contract.rewardAmount
        })),
        conditionText,
        estimatedReward,
        status: program.status || "Đang diễn ra"
      });

      const relatedDraftIds = new Set([
        ...matchedContracts.map((contract) => draftIdByKey.get(getRewardContractKey(contract))).filter(Boolean) as string[],
        ...eligibleDraftRows.map((row) => row.draft_id)
      ]);
      const perDraftReward = relatedDraftIds.size > 0 ? estimatedReward / relatedDraftIds.size : 0;
      for (const draftId of relatedDraftIds) {
        const current = rewardByDraft.get(draftId);
        if (!current) continue;
        current.estimatedReward += perDraftReward;
        current.matchedPrograms.push({ programId: program.id, programName: program.programName, estimatedReward: perDraftReward });
      }
      warnings.push(...(result.warnings ?? []));
    } catch (error) {
      warnings.push(`${program.programName}: ${error instanceof Error ? error.message : "Không tính được rule"}`);
    }
  }

  const totalEstimatedReward = rewardByProgram.reduce((sum, item) => sum + Number(item.estimatedReward ?? 0), 0);
  return {
    rewardByProgram,
    rewardByDraftContract: [...rewardByDraft.values()],
    totalEstimatedReward,
    eligibleProgramCount: rewardByProgram.length,
    warnings: [...new Set(warnings)]
  };
}
