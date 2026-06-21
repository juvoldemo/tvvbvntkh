import { toMonthStart } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateCompetitionReward, normalizeContract, type CompetitionRewardResult, type CompetitionRuleInput } from "./competitionRuleEngine";

type SupabaseClient = ReturnType<typeof getSupabaseAdmin>;

function messageFromError(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function latestResultByProgram(results: any[] = []) {
  const map = new Map<string, any>();
  for (const result of results) {
    const current = map.get(result.program_id);
    if (!current || String(result.calculated_at ?? "").localeCompare(String(current.calculated_at ?? "")) > 0) {
      map.set(result.program_id, result);
    }
  }
  return map;
}

function normalizeProgram(row: any, result?: any) {
  const rule = row.confirmed_rule || row.ai_rule || {};
  const summary = result?.result_summary?.summary || result?.result_summary || {};
  return {
    id: row.id,
    programName: row.program_name || rule.program_name || "Chương trình thi đua",
    originalFileUrl: row.original_file_url,
    originalFileName: row.original_file_name,
    extractedText: row.extracted_text || "",
    aiSummary: row.ai_summary || rule.ai_summary || "",
    aiRule: row.ai_rule,
    confirmedRule: row.confirmed_rule,
    status: row.status || "Mới upload",
    startDate: row.start_date || rule.start_date || "",
    endDate: row.end_date || rule.end_date || "",
    issueDeadline: row.issue_deadline || rule.issue_deadline || "",
    targetTypes: row.target_types || rule.target_types || rule.target_type || [],
    confidence: Number(row.confidence ?? rule.confidence ?? 0),
    needsReview: Boolean(row.needs_review ?? rule.needs_review ?? true),
    isHidden: Boolean(row.is_hidden ?? false),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCalculatedAt: row.last_calculated_at || result?.calculated_at || null,
    latestResultId: result?.id || null,
    totalEligibleAdvisors: Number(result?.total_eligible_advisors ?? summary.totalEligibleAdvisors ?? 0),
    totalEligibleContracts: Number(result?.total_eligible_contracts ?? summary.totalEligibleContracts ?? 0),
    totalExcludedContracts: Number(result?.total_excluded_contracts ?? summary.totalExcludedContracts ?? 0),
    totalIP: Number(result?.total_ip ?? summary.totalIP ?? 0),
    totalAFYP: Number(result?.total_afyp ?? summary.totalAFYP ?? 0),
    totalReward: Number(result?.total_reward ?? summary.totalReward ?? 0),
    recipientTypes: Array.isArray(summary.recipientTypes) ? summary.recipientTypes : []
  };
}

function monthEnd(month: string) {
  const [year, monthNo] = month.slice(0, 7).split("-").map(Number);
  const date = new Date(year, monthNo, 0);
  return `${year}-${String(monthNo).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function competitionDateRange(program: any, month: string) {
  const rule = program?.confirmed_rule || program?.ai_rule || {};
  const fallbackStart = toMonthStart(month);
  const start = String(program?.start_date || rule.start_date || fallbackStart).slice(0, 10);
  const end = String(program?.end_date || rule.end_date || monthEnd(month)).slice(0, 10);
  return { start, end };
}

function dedupeCompetitionContracts(records: any[] = []) {
  const map = new Map<string, any>();
  for (const record of records) {
    const key = String(record.contract_no || record.application_no || record.id || "").trim();
    if (!key) continue;
    const current = map.get(key);
    const recordVersion = `${String(record.data_month ?? "")}|${String(record.updated_date ?? "")}|${String(record.id ?? "")}`;
    const currentVersion = `${String(current?.data_month ?? "")}|${String(current?.updated_date ?? "")}|${String(current?.id ?? "")}`;
    if (!current || recordVersion.localeCompare(currentVersion) > 0) {
      map.set(key, record);
    }
  }
  return [...map.values()];
}

function normalizeRuleText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function inferRewardRecipientType(rewardRule: any) {
  const explicit = String(rewardRule.reward_recipient_type || rewardRule.recipient_type || rewardRule.recipient || rewardRule.condition?.reward_recipient_type || rewardRule.condition?.recipient_type || rewardRule.condition?.recipient || "").trim();
  if (explicit) return explicit;
  const text = normalizeRuleText([
    rewardRule.reward_name,
    rewardRule.prize_name,
    rewardRule.condition_text,
    rewardRule.calculation_logic,
    rewardRule.reward_formula,
    rewardRule.reward_type,
    rewardRule.condition?.type,
    rewardRule.condition?.text,
    rewardRule.condition?.description
  ].join(" "));
  if (isGroupRuleText(text)) return "Nhóm";
  if (text.includes("/tvv") || text.includes("tvv hoat dong") || text.includes("moi tvv") || text.includes("tu van vien")) return "TVV";
  if (text.includes("/hd") || text.includes("/hop dong") || text.includes("moi hd") || text.includes("moi hop dong") || text.includes("pdt/hd")) return "Hợp đồng";
  if (text.includes("/nhom") || text.includes("thuong nhom") || text.includes("moi nhom")) return "Nhóm";
  if (text.includes("/ads") || text.includes("thuong ads")) return "ADS";
  if (text.includes("active_advisor")) return "TVV";
  if (text.includes("per_contract") || text.includes("per_policy") || text.includes("policy_pdt") || text.includes("top_n")) return "Hợp đồng";
  return rewardRule.target_type || "Hợp đồng";
}

function isGroupRuleText(text: string) {
  return [
    "tong doanh thu/nhom",
    "tong doanh thu nhom",
    "doanh thu nhom",
    "tong ip nhom",
    "tong afyp nhom",
    "chi tieu nhom",
    "kpi nhom",
    "nhom dat",
    "theo nhom",
    "moi nhom",
    "nhom co doanh thu",
    "so hd/nhom",
    "so hop dong/nhom",
    "tvv hoat dong trong nhom"
  ].some((phrase) => text.includes(phrase));
}

function normalizeCompetitionRuleForNewlySeenContracts(rule: CompetitionRuleInput) {
  const nextRule = { ...rule, reward_rules: [...(rule.reward_rules ?? [])] };
  nextRule.reward_rules = nextRule.reward_rules.map((rewardRule: any) => {
    const text = normalizeRuleText([
      rewardRule.target_type,
      rewardRule.result_tab,
      rewardRule.reward_name,
      rewardRule.prize_name,
      rewardRule.condition_text,
      rewardRule.calculation_logic,
      rewardRule.reward_formula,
      rewardRule.reward_type,
      rewardRule.condition?.type,
      rewardRule.condition?.text,
      rewardRule.condition?.description,
      rewardRule.condition?.metric
    ].join(" "));
    const isGroup = isGroupRuleText(text);
    const reward_recipient_type = isGroup ? "Nhóm" : inferRewardRecipientType(rewardRule);
    const shouldUseSnapshotOrdering = text.includes("chien binh toc do")
      || text.includes("nop phi som nhat")
      || text.includes("nop phi moi nhat")
      || text.includes("hop dong dau tien")
      || text.includes("top hop dong nop phi")
      || text.includes("ho so nop phi som nhat")
      || text.includes("hop dong phat sinh moi");
    if (!shouldUseSnapshotOrdering) return { ...rewardRule, target_type: isGroup ? "Nhóm" : rewardRule.target_type, reward_recipient_type, result_tab: isGroup ? "Nhóm đạt" : rewardRule.result_tab };
    const newest = text.includes("moi nhat");
    return {
      ...rewardRule,
      reward_recipient_type: "Hợp đồng",
      reward_name: rewardRule.reward_name || rewardRule.prize_name || "Chiến binh tốc độ",
      reward_type: "top_n_newly_seen_contracts",
      target_type: rewardRule.target_type || "Hợp đồng",
      top_n: Number(rewardRule.top_n ?? rewardRule.condition?.limit ?? rewardRule.condition?.top_n ?? 10) || 10,
      order_by: rewardRule.order_by || (newest ? "first_seen_at_desc" : "first_seen_at_asc"),
      min_policy_ip: Number(rewardRule.min_policy_ip ?? rewardRule.condition?.policy_filters?.min_policy_ip ?? nextRule.min_policy_ip ?? 15_000_000) || 15_000_000,
      reward_amount: Number(rewardRule.reward_amount ?? rewardRule.reward?.amount ?? 500_000) || 500_000,
      reward_formula: rewardRule.reward_formula || "500000/HĐ",
      condition_text: rewardRule.condition_text || (newest ? "10 hợp đồng nộp phí mới nhất" : "10 hợp đồng nộp phí sớm nhất")
    };
  });
  return nextRule;
}

function groupRowsFromRewardResult(programId: string, resultId: string | null, rewardResult: CompetitionRewardResult) {
  return rewardResult.eligibleGroups.map((group) => ({
    program_id: programId,
    result_id: resultId,
    team: group.group,
    total_ip: group.totalIP,
    total_afyp: group.totalAFYP,
    active_advisor_count: group.activeAdvisorCount,
    eligible_contract_count: group.eligibleContractCount,
    reward_per_advisor: group.rewardPerAdvisor,
    total_reward: group.totalReward,
    achieved_tier: group.achievedTier,
    prize_name: group.prizeName,
    note: group.note || ""
  }));
}

function compactSnapshotKeyPart(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function competitionContractUniqueKey(record: any, index = 0) {
  const contract = normalizeContract(record, index);
  if (contract.gyc_no) return `gyc:${compactSnapshotKeyPart(contract.gyc_no)}`;
  if (contract.contract_no) return `contract:${compactSnapshotKeyPart(contract.contract_no)}`;
  return [
    "fallback",
    compactSnapshotKeyPart(contract.collection_date),
    compactSnapshotKeyPart(contract.tvv),
    compactSnapshotKeyPart(contract.customer_name),
    String(Number(contract.ip || 0))
  ].join(":");
}

function snapshotRowFromRecord(record: any, monthKey: string, uploadBatchId: string, uploadedAt: string, isNewInBatch: boolean, firstSeenAt: string, index = 0) {
  const contract = normalizeContract(record, index);
  return {
    month_key: monthKey,
    upload_batch_id: uploadBatchId,
    uploaded_at: uploadedAt,
    contract_unique_key: competitionContractUniqueKey(record, index),
    gyc_no: contract.gyc_no || null,
    contract_no: contract.contract_no || null,
    collection_date: contract.collection_date || null,
    issue_date: contract.issue_date || null,
    tvv: contract.tvv || null,
    team: contract.team || null,
    ads: contract.ads || null,
    customer_name: contract.customer_name || null,
    product_name: contract.product_name || null,
    ip: contract.ip,
    afyp: contract.afyp,
    status: contract.status || null,
    raw_data: record,
    is_new_in_batch: isNewInBatch,
    first_seen_at: firstSeenAt
  };
}

export async function syncCompetitionContractSnapshotsAfterUpload(params: {
  monthKey: string;
  uploadBatchId: string;
  uploadedAt?: string | null;
  contracts: any[];
  supabaseClient?: SupabaseClient;
}) {
  const supabase = params.supabaseClient ?? getSupabaseAdmin();
  const uploadedAt = params.uploadedAt || new Date().toISOString();
  const { data: existingRows, error: existingError } = await supabase
    .from("competition_contract_snapshots")
    .select("contract_unique_key, first_seen_at")
    .eq("month_key", params.monthKey);
  if (existingError) throw new Error(messageFromError(existingError));

  const existing = new Map((existingRows ?? []).map((row: any) => [String(row.contract_unique_key), row]));
  const newRows: any[] = [];
  const updateRows: any[] = [];

  params.contracts.forEach((record, index) => {
    const key = competitionContractUniqueKey(record, index);
    const current = existing.get(key);
    if (current) {
      updateRows.push(snapshotRowFromRecord(record, params.monthKey, params.uploadBatchId, uploadedAt, false, current.first_seen_at || uploadedAt, index));
    } else {
      newRows.push(snapshotRowFromRecord(record, params.monthKey, params.uploadBatchId, uploadedAt, true, uploadedAt, index));
    }
  });

  const chunkSize = 500;
  for (let index = 0; index < newRows.length; index += chunkSize) {
    const { error } = await supabase.from("competition_contract_snapshots").insert(newRows.slice(index, index + chunkSize));
    if (error) throw new Error(messageFromError(error));
  }
  for (let index = 0; index < updateRows.length; index += chunkSize) {
    const { error } = await supabase
      .from("competition_contract_snapshots")
      .upsert(updateRows.slice(index, index + chunkSize), { onConflict: "month_key,contract_unique_key" });
    if (error) throw new Error(messageFromError(error));
  }

  console.log("[CTTD SNAPSHOT SYNC]", {
    month_key: params.monthKey,
    upload_batch_id: params.uploadBatchId,
    total_rows: params.contracts.length,
    old_snapshot_count: existingRows?.length ?? 0,
    new_contract_count: newRows.length,
    updated_contract_count: updateRows.length
  });

  return {
    oldSnapshotCount: existingRows?.length ?? 0,
    newContractCount: newRows.length,
    updatedContractCount: updateRows.length
  };
}

async function enrichContractsWithCompetitionSnapshots(supabase: SupabaseClient, monthKey: string, contracts: any[] = []) {
  if (!contracts.length) return contracts;
  const { data: snapshots, error } = await supabase
    .from("competition_contract_snapshots")
    .select("contract_unique_key, first_seen_at, is_new_in_batch, upload_batch_id")
    .eq("month_key", monthKey);
  if (error) throw new Error(messageFromError(error));
  const snapshotMap = new Map((snapshots ?? []).map((row: any) => [String(row.contract_unique_key), row]));
  return contracts.map((contract, index) => {
    const snapshot = snapshotMap.get(competitionContractUniqueKey(contract, index));
    return snapshot
      ? {
        ...contract,
        competition_contract_unique_key: snapshot.contract_unique_key,
        first_seen_at: snapshot.first_seen_at,
        is_new_in_batch: snapshot.is_new_in_batch,
        snapshot_upload_batch_id: snapshot.upload_batch_id
      }
      : contract;
  });
}

export async function listCompetitionPrograms(options: { includeHidden?: boolean } = {}) {
  const supabase = getSupabaseAdmin();
  const [{ data: programs, error: programError }, { data: results, error: resultError }] = await Promise.all([
    supabase.from("competition_programs").select("*").order("created_at", { ascending: false }),
    supabase.from("competition_results").select("*").order("calculated_at", { ascending: false })
  ]);

  if (programError) throw new Error(messageFromError(programError));
  if (resultError) throw new Error(messageFromError(resultError));

  const latest = latestResultByProgram(results ?? []);
  return (programs ?? [])
    .filter((program) => options.includeHidden || !program.is_hidden)
    .map((program) => normalizeProgram(program, latest.get(program.id)));
}

export async function getCompetitionProgramDetail(programId: string) {
  const supabase = getSupabaseAdmin();
  const { data: program, error: programError } = await supabase
    .from("competition_programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (programError) throw new Error(messageFromError(programError));

  const { data: result } = await supabase
    .from("competition_results")
    .select("*")
    .eq("program_id", programId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resultId = result?.id;
  const [{ data: contracts }, { data: advisors }, { data: groups }] = await Promise.all([
    resultId
      ? supabase.from("competition_reward_contracts").select("*").eq("result_id", resultId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    resultId
      ? supabase.from("competition_reward_advisors").select("*").eq("result_id", resultId).order("reward_amount", { ascending: false })
      : Promise.resolve({ data: [] }),
    resultId
      ? supabase.from("competition_reward_groups").select("*").eq("result_id", resultId).order("total_reward", { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  let rewardGroups = groups ?? [];
  if (rewardGroups.length === 0 && program?.confirmed_rule) {
    const range = competitionDateRange(program, String(program.start_date || program.confirmed_rule?.start_date || "").slice(0, 7));
    const { data: sourceContracts } = await supabase
      .from("revenue_records")
      .select("*")
      .gte("paid_date", range.start)
      .lte("paid_date", range.end);
    if ((sourceContracts ?? []).length > 0) {
      const normalizedRule = normalizeCompetitionRuleForNewlySeenContracts(program.confirmed_rule as CompetitionRuleInput);
      const liveRewardResult = calculateCompetitionReward(normalizedRule, dedupeCompetitionContracts(sourceContracts ?? []));
      rewardGroups = groupRowsFromRewardResult(program.id, resultId ?? null, liveRewardResult);
    }
  }

  return {
    program: normalizeProgram(program, result),
    result: result ?? null,
    rewardContracts: contracts ?? [],
    rewardAdvisors: advisors ?? [],
    rewardGroups,
    contractRewardResults: contracts ?? [],
    tvvRewardResults: advisors ?? [],
    groupRewardResults: rewardGroups
  };
}

export async function calculateAndSaveCompetition(programId: string, month: string, calculatedBy = "system", supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? getSupabaseAdmin();
  const { data: program, error: programError } = await supabase
    .from("competition_programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (programError) throw new Error(messageFromError(programError));
  if (!program?.confirmed_rule) throw new Error("Chương trình chưa xác nhận rule. Vui lòng vào tab Rule AI để xác nhận trước khi tính thưởng.");

  const range = competitionDateRange(program, month);
  const { data: contracts, error: contractError } = await supabase
    .from("revenue_records")
    .select("*")
    .gte("paid_date", range.start)
    .lte("paid_date", range.end);
  if (contractError) throw new Error(messageFromError(contractError));
  if (!contracts?.length) throw new Error(`Chưa có dữ liệu hợp đồng trong thời gian thi đua ${range.start} - ${range.end}. Vui lòng upload CSV có chứa khoảng thời gian này trước.`);

  const monthKey = month.slice(0, 7);
  const enrichedContracts = await enrichContractsWithCompetitionSnapshots(supabase, monthKey, contracts ?? []);
  return calculateAndSaveCompetitionFromContracts(supabase, program, enrichedContracts, calculatedBy);
}

async function calculateAndSaveCompetitionFromContracts(supabase: SupabaseClient, program: any, contracts: any[] = [], calculatedBy = "system") {
  const uniqueContracts = dedupeCompetitionContracts(contracts);
  const normalizedRule = normalizeCompetitionRuleForNewlySeenContracts(program.confirmed_rule as CompetitionRuleInput);
  const result = calculateCompetitionReward(normalizedRule, uniqueContracts);
  const { data: savedResult, error: resultError } = await supabase
    .from("competition_results")
    .insert({
      program_id: program.id,
      result_summary: result,
      total_eligible_advisors: result.summary.totalEligibleAdvisors,
      total_eligible_contracts: result.summary.totalEligibleContracts,
      total_excluded_contracts: result.summary.totalExcludedContracts,
      total_ip: result.summary.totalIP,
      total_afyp: result.summary.totalAFYP,
      total_reward: result.summary.totalReward,
      calculated_by: calculatedBy
    })
    .select("*")
    .single();
  if (resultError) throw new Error(messageFromError(resultError));

  await saveRewardRows(supabase, program.id, savedResult.id, result);

  const { error: updateError } = await supabase
    .from("competition_programs")
    .update({
      status: result.summary.totalEligibleContracts > 0 || result.summary.totalEligibleAdvisors > 0 || result.summary.totalEligibleGroups > 0
        ? "Đã tính có kết quả"
        : "Đã tính nhưng không có hợp đồng đạt",
      last_calculated_at: savedResult.calculated_at,
      updated_at: new Date().toISOString()
    })
    .eq("id", program.id);
  if (updateError) throw new Error(messageFromError(updateError));

  return { result: savedResult, rewardResult: result };
}

async function saveRewardRows(supabase: SupabaseClient, programId: string, resultId: string, rewardResult: CompetitionRewardResult) {
  const contractRows = [
    ...rewardResult.eligibleContracts.map((contract) => ({
      program_id: programId,
      result_id: resultId,
      contract_id: String(contract.source?.id ?? contract.contractNo ?? contract.applicationNo ?? ""),
      gyc_no: contract.applicationNo,
      contract_no: contract.contractNo,
      collection_date: contract.paidDate || null,
      issue_date: contract.issuedDate || null,
      tvv: contract.advisor,
      team: contract.group,
      ads: contract.ads,
      customer_name: contract.customer,
      product_name: contract.product,
      ip: contract.ip,
      afyp: contract.afyp,
      status: contract.status,
      reward_name: contract.prizeName,
      reward_type: contract.rewardType,
      reward_amount: contract.rewardAmount,
      reward_formula: contract.rewardFormula,
      reason: contract.reason,
      is_eligible: true,
      first_seen_at: contract.source?.first_seen_at ?? null
    })),
    ...rewardResult.excludedContracts.map((contract) => ({
      program_id: programId,
      result_id: resultId,
      contract_id: String(contract.source?.id ?? contract.contractNo ?? contract.applicationNo ?? ""),
      gyc_no: contract.applicationNo,
      contract_no: contract.contractNo,
      collection_date: contract.source?.paid_date ?? null,
      issue_date: contract.source?.issued_date ?? null,
      tvv: contract.advisor,
      team: contract.group,
      ads: contract.source?.ads_name ?? "",
      customer_name: contract.customer,
      product_name: contract.source?.product_name ?? "",
      ip: contract.ip,
      afyp: contract.afyp,
      status: contract.status,
      reward_name: "",
      reward_type: "",
      reward_amount: 0,
      reward_formula: "",
      reason: contract.reason,
      is_eligible: false,
      first_seen_at: contract.source?.first_seen_at ?? null
    }))
  ];

  const advisorRows = rewardResult.eligibleAdvisors.map((advisor) => ({
    program_id: programId,
    result_id: resultId,
    tvv: advisor.advisor,
    team: advisor.group,
    ads: advisor.ads,
    eligible_contract_count: advisor.contractCount,
    total_ip: advisor.totalIP,
    total_afyp: advisor.totalAFYP,
    reward_amount: advisor.rewardAmount,
    achieved_reward_names: advisor.achievedRewardNames ?? [advisor.prizeName],
    note: advisor.note || advisor.prizeName
  }));

  const chunkSize = 500;
  for (let index = 0; index < contractRows.length; index += chunkSize) {
    const { error } = await supabase.from("competition_reward_contracts").insert(contractRows.slice(index, index + chunkSize));
    if (error) throw new Error(messageFromError(error));
  }
  for (let index = 0; index < advisorRows.length; index += chunkSize) {
    const { error } = await supabase.from("competition_reward_advisors").insert(advisorRows.slice(index, index + chunkSize));
    if (error) throw new Error(messageFromError(error));
  }

  if (rewardResult.eligibleGroups.length > 0) {
    const groupRows = groupRowsFromRewardResult(programId, resultId, rewardResult);
    for (let index = 0; index < groupRows.length; index += chunkSize) {
      const { error } = await supabase.from("competition_reward_groups").insert(groupRows.slice(index, index + chunkSize));
      if (error && !String(error.message || "").includes("competition_reward_groups")) throw new Error(messageFromError(error));
    }
  }
}

export async function recalculateAllCompetitionProgramsAfterUpload(selectedMonth: string, contractsAfterUpload: any[] = [], calculatedBy = "upload") {
  const supabase = getSupabaseAdmin();
  const { data: programs, error } = await supabase
    .from("competition_programs")
    .select("*");
  if (error) throw new Error(messageFromError(error));

  const enrichedContractsAfterUpload = await enrichContractsWithCompetitionSnapshots(supabase, selectedMonth.slice(0, 7), contractsAfterUpload);
  const recalculatedPrograms = [];
  const skippedPrograms = [];
  for (const program of programs ?? []) {
    if (!program.confirmed_rule) {
      skippedPrograms.push({ programId: program.id, programName: program.program_name, reason: "missing confirmed_rule" });
      continue;
    }
    try {
      const calculated = await calculateAndSaveCompetitionFromContracts(supabase, program, enrichedContractsAfterUpload, calculatedBy);
      const summary = calculated.rewardResult.summary;
      console.log("[CTTD RESULT]", {
        programName: program.program_name,
        totalEligibleAdvisors: summary.totalEligibleAdvisors,
        totalEligibleContracts: summary.totalEligibleContracts,
        totalReward: summary.totalReward
      });
      recalculatedPrograms.push({
        programId: program.id,
        programName: program.program_name,
        ok: true,
        totalReward: summary.totalReward
      });
    } catch (error) {
      recalculatedPrograms.push({
        programId: program.id,
        programName: program.program_name,
        ok: false,
        error: messageFromError(error)
      });
    }
  }

  console.log("[CTTD AUTO SYNC]", {
    selectedMonth,
    contractsCount: contractsAfterUpload.length,
    programCount: programs?.length ?? 0,
    recalculatedPrograms,
    skippedPrograms
  });

  return { recalculatedPrograms, skippedPrograms, programCount: programs?.length ?? 0 };
}

export async function recalculateConfirmedCompetitions(month: string, calculatedBy = "upload") {
  const supabase = getSupabaseAdmin();
  const { data: programs, error } = await supabase
    .from("competition_programs")
    .select("id, program_name")
    .not("confirmed_rule", "is", null);
  if (error) throw new Error(messageFromError(error));

  const results = [];
  for (const program of programs ?? []) {
    try {
      const calculated = await calculateAndSaveCompetition(program.id, month, calculatedBy, supabase);
      results.push({ programId: program.id, programName: program.program_name, ok: true, totalReward: calculated.rewardResult.summary.totalReward });
    } catch (error) {
      results.push({ programId: program.id, programName: program.program_name, ok: false, error: messageFromError(error) });
    }
  }

  return results;
}
