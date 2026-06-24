type AnyRecord = Record<string, any>;

export type CompetitionRewardRule = {
  id?: string;
  reward_name?: string;
  prize_name?: string;
  reward_type?: string;
  type?: string;
  metric_type?: string | string[];
  target_type?: string;
  reward_recipient_type?: string;
  result_tab?: string;
  recipient_type?: string;
  recipient?: string;
  scope?: string;
  condition_text?: string;
  calculation_logic?: string;
  thresholds?: AnyRecord[];
  top_n?: number;
  order_by?: string;
  min_policy_ip?: number | null;
  reward_amount?: number;
  reward_formula?: string;
  /** Declarative payout contract.  Old rule fields are kept for backwards compatibility. */
  payout_scope?: "per_contract" | "per_tvv" | "per_group" | "shared_group" | "custom";
  payout_target?: "contract" | "tvv" | "group";
  split_method?: "none" | "equal_per_active_tvv" | "equal_per_qualified_tvv" | "by_metric_ratio";
  threshold_value?: number;
  threshold_operator?: ">=" | ">" | "=" | "<=" | "<";
  display_columns?: string[];
  note_template?: string;
  unachieved_note_template?: string;
  max_reward?: number | null;
  priority?: number;
  condition?: AnyRecord;
  reward?: AnyRecord;
  tiers?: AnyRecord[];
  pdt_reward_tiers?: Array<{ min_pdt?: number; spc_reward?: number | string; other_reward?: number | string }>;
  spc_products?: string[];
  allow_multiple_rewards?: boolean;
};

export type CompetitionRuleInput = {
  id?: string;
  program_name: string;
  start_date: string;
  end_date: string;
  issue_deadline?: string | null;
  target_types?: string[];
  target_type?: string | string[];
  metric_type?: string | string[];
  min_policy_ip?: number | null;
  min_policy_afyp?: number | null;
  eligible_products?: string[];
  excluded_statuses?: string[];
  included_statuses?: string[];
  allow_empty_status?: boolean;
  issue_date_optional?: boolean;
  allow_pending_issue?: boolean;
  reward_rules?: CompetitionRewardRule[];
  max_reward?: number | null;
  notes?: string | string[];
  ai_summary?: string;
  confidence?: number;
  needs_review?: boolean;
};

export type NormalizedCompetitionContract = {
  collection_date: string;
  issue_date: string;
  paidDate: string;
  issuedDate: string;
  ban: string;
  team: string;
  tvv: string;
  advisor: string;
  group: string;
  ads: string;
  gyc_no: string;
  applicationNo: string;
  contract_no: string;
  contractNo: string;
  customer_name: string;
  customer: string;
  product_name: string;
  product: string;
  productCode: string;
  spbk_products: string;
  spbkCount: number;
  ip: number;
  afyp: number;
  status: string;
  first_seen_at?: string;
  firstSeenAt?: string;
  payment_datetime?: string;
  sourceIndex: number;
  source: AnyRecord;
};

export type EligibleContractReward = {
  paidDate: string;
  issuedDate: string;
  applicationNo: string;
  contractNo: string;
  advisor: string;
  group: string;
  ads: string;
  customer: string;
  product: string;
  ip: number;
  afyp: number;
  status: string;
  prizeName: string;
  rewardName?: string;
  rewardType?: string;
  rewardAmount: number;
  rewardFormula?: string;
  rulePriority?: number;
  contractKey?: string;
  reason?: string;
  source: AnyRecord;
};

export type ExcludedContract = {
  applicationNo: string;
  contractNo: string;
  advisor: string;
  group: string;
  customer: string;
  ip: number;
  afyp: number;
  status: string;
  reason: string;
  source: AnyRecord;
};

export type EligibleAdvisorReward = {
  advisor: string;
  group: string;
  ads: string;
  contractCount: number;
  totalIP: number;
  totalAFYP: number;
  prizeName: string;
  rewardAmount: number;
  rulePriority?: number;
  achievedRewardNames?: string[];
  note?: string;
};

export type EligibleGroupReward = {
  group: string;
  totalIP: number;
  totalAFYP: number;
  activeAdvisorCount: number;
  eligibleContractCount: number;
  achievedTier: string;
  rewardPerAdvisor: number;
  totalReward: number;
  /** JSON-rule names retained alongside the existing UI names. */
  group_reward_amount?: number;
  reward_per_tvv?: number;
  qualified_tvv_count?: number;
  active_tvv_count?: number;
  reward_note?: string;
  displayColumns?: string[];
  prizeName: string;
  rulePriority?: number;
  note?: string;
  advisors: Array<{
    advisor: string;
    group: string;
    ads: string;
    contractCount: number;
    totalIP: number;
    totalAFYP: number;
  }>;
};

export type CompetitionRewardResult = {
  summary: {
    totalEligibleGroups: number;
    totalEligibleAdvisors: number;
    totalEligibleContracts: number;
    totalExcludedContracts: number;
    totalReward: number;
    totalIP: number;
    totalAFYP: number;
    recipientTypes: string[];
    warnings?: string[];
    debug?: AnyRecord;
  };
  eligibleGroups: EligibleGroupReward[];
  eligibleAdvisors: EligibleAdvisorReward[];
  eligibleContracts: EligibleContractReward[];
  rewardByContracts: EligibleContractReward[];
  rewardByAdvisors: EligibleAdvisorReward[];
  rewardByGroups: EligibleGroupReward[];
  rewardByAds: AnyRecord[];
  contractRewardResults: EligibleContractReward[];
  tvvRewardResults: EligibleAdvisorReward[];
  groupRewardResults: EligibleGroupReward[];
  excludedContracts: ExcludedContract[];
  warnings: string[];
};

const MONEY_MULTIPLIERS: Array<[RegExp, number]> = [
  [/\b(t|ty|ty dong|ty vnd)\b/i, 1_000_000_000],
  [/\b(tr|trd|trieu|trieu dong|trieu vnd)\b/i, 1_000_000]
];
const SPBK_CODES = ["R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29"];
const SPBK_CODE_PATTERN = /(?:^|[^a-z0-9])(?:bv-)?n?r(21|22|23|24|25|26|27|28|29)(?=[^0-9]|$)/gi;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function valueFrom(record: AnyRecord, aliases: string[]) {
  const sources = [record, record.raw_data].filter((item) => item && typeof item === "object") as AnyRecord[];
  const aliasSet = new Set(aliases.map(normalizeText));

  for (const source of sources) {
    for (const key of aliases) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    for (const [key, value] of Object.entries(source)) {
      if (aliasSet.has(normalizeText(key)) && value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
  }

  return undefined;
}

const PRODUCT_CODE_ALIASES = ["product_code", "productCode", "product_id", "ma_san_pham", "ma_sp", "Mã sản phẩm", "Mã SP", "product", "Sản phẩm chính", "SAN PHAM CHINH", "SẢN PHẨM CHÍNH"];
const PDT_ALIASES = ["pdt", "PDT", "PĐT", "phí đóng thêm", "phi dong them", "PHÍ ĐÓNG THÊM"];
const PERIODIC_PREMIUM_ALIASES = ["periodic_premium", "premium_due", "phí định kỳ", "phi dinh ky", "PHÍ ĐỊNH KỲ"];

function rawContractProductCode(contract: NormalizedCompetitionContract | AnyRecord) {
  const source = (contract as NormalizedCompetitionContract).source ?? contract;
  return valueFrom(source, PRODUCT_CODE_ALIASES) ?? (contract as NormalizedCompetitionContract).productCode ?? (contract as NormalizedCompetitionContract).product_name ?? "";
}

export function getContractProductCode(contract: NormalizedCompetitionContract | AnyRecord) {
  return String(rawContractProductCode(contract) ?? "").trim().toUpperCase();
}

function competitionMetricValue(contract: NormalizedCompetitionContract) {
  const pdt = parseCompetitionMoney(valueFrom(contract.source, PDT_ALIASES));
  if (pdt > 0) return pdt;
  if (contract.ip > 0) return contract.ip;
  return parseCompetitionMoney(valueFrom(contract.source, PERIODIC_PREMIUM_ALIASES));
}

function countSpbkProducts(value: unknown) {
  const text = String(value ?? "");
  if (!text.trim()) return 0;
  return [...text.matchAll(SPBK_CODE_PATTERN)].filter((match) => SPBK_CODES.includes(`R${match[1]}`)).length;
}

function isGenericSpbkProduct(value: unknown) {
  const text = normalizeText(value);
  return text.includes("spbk")
    || text.includes("san pham ban kem")
    || text.includes("san pham bo tro")
    || text.includes("rider");
}

export function parseCompetitionMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalizedWords = normalizeText(raw);
  const multiplier = MONEY_MULTIPLIERS.find(([pattern]) => pattern.test(normalizedWords))?.[1] ?? 1;
  const withoutWords = raw.replace(/tỷ|ty|triệu|trieu|trđ|trd|tr/gi, "");
  const compact = withoutWords.replace(/[^\d,.-]/g, "").trim();
  if (!compact) return 0;

  let normalizedNumber = compact;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    normalizedNumber = lastComma > lastDot ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimalDigits = compact.length - lastComma - 1;
    normalizedNumber = decimalDigits === 3 ? compact.replace(/,/g, "") : compact.replace(",", ".");
  } else if (lastDot > -1) {
    const decimalDigits = compact.length - lastDot - 1;
    normalizedNumber = decimalDigits === 3 ? compact.replace(/\./g, "") : compact;
  }

  const amount = Number(normalizedNumber);
  return Number.isFinite(amount) ? amount * multiplier : 0;
}

export function parseCompetitionDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const normalized = text.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    const year = c.length === 2 ? `20${c}` : c;
    return `${year.padStart(4, "20")}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseCompetitionDateTime(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function normalizeContract(row: AnyRecord, sourceIndex = 0): NormalizedCompetitionContract {
  const collectionDate = parseCompetitionDate(valueFrom(row, ["collection_date", "paid_date", "paidDate", "Ngày thu", "ngay_thu"]));
  const issueDate = parseCompetitionDate(valueFrom(row, ["issue_date", "issued_date", "issuedDate", "Ngày phát hành", "ngay_phat_hanh"]));
  const team = String(valueFrom(row, ["team", "group", "group_name", "groupName", "Nhóm", "Nhom", "nhom"]) ?? "").trim();
  const tvv = String(valueFrom(row, ["tvv", "advisor", "agent_name", "agentName", "Tên TVV", "ten_tvv", "TVV"]) ?? "").trim();
  const gycNo = String(valueFrom(row, ["gyc_no", "application_no", "applicationNo", "Số GYC", "so_gyc", "gyc"]) ?? "").trim();
  const contractNo = String(valueFrom(row, ["contract_no", "contractNo", "policy_no", "policyNo", "Số HĐ", "Số hợp đồng", "so_hop_dong", "Số GYC", "SỐ GYC"]) ?? gycNo).trim();
  const customer = String(valueFrom(row, ["customer_name", "customer", "policy_owner", "insured_name", "Khách hàng", "BMBH", "NĐBH"]) ?? "").trim();
  const product = String(valueFrom(row, ["product_name", "product", "Sản phẩm", "san_pham", "SẢN PHẨM CHÍNH", "SAN PHAM CHINH", "Sáº¢N PHáº¨M CHÃNH"]) ?? "").trim();
  const spbkProducts = String(valueFrom(row, ["spbk", "SPBK", "SẢN PHẨM BỔ TRỢ", "SAN PHAM BO TRO", "Sản phẩm bổ trợ", "san_pham_bo_tro", "Sáº¢N PHáº¨M Bá» TRá»¢"]) ?? "").trim();
  const paymentDateTime = parseCompetitionDateTime(valueFrom(row, ["payment_datetime", "paid_datetime", "created_at", "gio_thu", "Gi? thu", "thoi_diem_nop_phi", "Th?i ?i?m n?p ph?"]));
  const firstSeenAt = parseCompetitionDateTime(valueFrom(row, ["first_seen_at", "firstSeenAt"]));

  return {
    collection_date: collectionDate,
    issue_date: issueDate,
    paidDate: collectionDate,
    issuedDate: issueDate,
    ban: String(valueFrom(row, ["ban", "ban_name", "Ban"]) ?? "").trim(),
    team,
    tvv,
    advisor: tvv,
    group: team,
    ads: String(valueFrom(row, ["ads", "ads_name", "adsName", "Tên ADS", "ten_ads"]) ?? "").trim(),
    gyc_no: gycNo,
    applicationNo: gycNo,
    contract_no: contractNo,
    contractNo,
    customer_name: customer,
    customer,
    product_name: product,
    product,
    productCode: getContractProductCode(row),
    spbk_products: spbkProducts,
    spbkCount: countSpbkProducts(spbkProducts),
    ip: parseCompetitionMoney(valueFrom(row, ["ip", "IP", "Phí thực thu", "Phi thuc thu"])),
    afyp: parseCompetitionMoney(valueFrom(row, ["afyp", "AFYP", "Phí quy năm", "Phi quy nam"])),
    status: String(valueFrom(row, ["status", "policy_status", "policyStatus", "Trạng thái", "Tình trạng", "Tình trạng hồ sơ", "TÌNH TRẠNG HỒ SƠ"]) ?? "").trim(),
    first_seen_at: firstSeenAt,
    firstSeenAt,
    payment_datetime: paymentDateTime,
    sourceIndex,
    source: row
  };
}

export function getRewardContractKey(contract: Partial<EligibleContractReward & NormalizedCompetitionContract & AnyRecord>) {
  const source = contract.source ?? {};
  const applicationNo = String(contract.applicationNo ?? contract.gyc_no ?? source.gyc_no ?? source.application_no ?? "").trim();
  if (applicationNo) return `gyc:${normalizeText(applicationNo)}`;
  const contractNo = String(contract.contractNo ?? contract.contract_no ?? source.contract_no ?? source.policy_no ?? "").trim();
  if (contractNo) return `contract:${normalizeText(contractNo)}`;
  return [
    contract.paidDate ?? contract.collection_date ?? source.collection_date ?? source.paid_date,
    contract.advisor ?? contract.tvv ?? source.tvv,
    contract.customer ?? contract.customer_name ?? source.customer_name ?? source.insured_name,
    contract.ip ?? source.ip,
    contract.afyp ?? source.afyp
  ].map((value) => normalizeText(value)).join("|");
}

export function dedupeRewardContracts(rewardResults: EligibleContractReward[]) {
  const selected = new Map<string, EligibleContractReward>();
  for (const contract of rewardResults) {
    if (!(Number(contract.rewardAmount) > 0)) continue;
    const key = getRewardContractKey(contract);
    const current = selected.get(key);
    if (!current
      || Number(contract.rewardAmount) > Number(current.rewardAmount)
      || (Number(contract.rewardAmount) === Number(current.rewardAmount)
        && Number(contract.rulePriority ?? Number.MAX_SAFE_INTEGER) < Number(current.rulePriority ?? Number.MAX_SAFE_INTEGER))) {
      selected.set(key, { ...contract, contractKey: key });
    }
  }
  return [...selected.values()];
}

function dedupeNormalizedContracts(contracts: NormalizedCompetitionContract[]) {
  const selected = new Map<string, NormalizedCompetitionContract>();
  for (const contract of contracts) {
    const key = getRewardContractKey(contract);
    if (!key) continue;
    const current = selected.get(key);
    if (!current || contract.sourceIndex > current.sourceIndex) selected.set(key, contract);
  }
  return [...selected.values()];
}

function preferHigherReward<T extends { rewardAmount?: number; totalReward?: number; rulePriority?: number }>(candidate: T, current?: T) {
  if (!current) return true;
  const candidateAmount = Number(candidate.rewardAmount ?? candidate.totalReward ?? 0);
  const currentAmount = Number(current.rewardAmount ?? current.totalReward ?? 0);
  return candidateAmount > currentAmount
    || (candidateAmount === currentAmount
      && Number(candidate.rulePriority ?? Number.MAX_SAFE_INTEGER) < Number(current.rulePriority ?? Number.MAX_SAFE_INTEGER));
}

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item) || "-";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function rewardKind(rule: CompetitionRewardRule) {
  return String(rule.reward_type || rule.type || rule.condition?.type || rule.reward?.type || "reward_per_contract");
}

function rewardName(rule: CompetitionRewardRule) {
  return String(rule.reward_name || rule.prize_name || rule.id || "Giải thưởng");
}

function rewardAmount(rule: CompetitionRewardRule) {
  return Number(rule.reward_amount ?? rule.reward?.amount ?? rule.reward?.reward_amount ?? rule.reward?.amount_per_contract ?? 0) || 0;
}

function rewardFormula(rule: CompetitionRewardRule) {
  return String(rule.reward_formula || rule.calculation_logic || rule.condition_text || "");
}

function isContractTargetRule(rule: CompetitionRewardRule) {
  return normalizeText(String(rule.target_type || rule.condition?.target_type || "")).includes("hop dong");
}

type RewardResultScope = "contract" | "tvv" | "group" | "ads" | "company";

function rewardScopeFromText(value: unknown): RewardResultScope | null {
  const target = normalizeText(String(value ?? ""));
  if (!target) return null;
  if (target.includes("ads")) return "ads";
  if (target.includes("cong ty") || target.includes("company")) return "company";
  if (target.includes("nhom") || target.includes("group")) return "group";
  if (target.includes("tvv") || target.includes("tu van") || target.includes("advisor") || target.includes("agent")) return "tvv";
  if (target.includes("policy") || target.includes("contract") || target.includes("hop dong") || target.includes("hd")) return "contract";
  return null;
}

function rewardRecipientScope(rule: CompetitionRewardRule): RewardResultScope {
  if (isGroupRevenueRule(rule)) return "group";
  const explicit = rewardScopeFromText(rule.reward_recipient_type || rule.recipient_type || rule.recipient || rule.condition?.reward_recipient_type || rule.condition?.recipient_type || rule.condition?.recipient);
  if (explicit) return explicit;

  const rewardText = normalizeText([
    rule.reward_name,
    rule.prize_name,
    rule.reward_type,
    rule.reward_formula,
    rule.calculation_logic,
    rule.condition_text,
    rule.condition?.reward_formula,
    rule.condition?.text,
    rule.condition?.description
  ].join(" "));
  if (rewardText.includes("/tvv") || rewardText.includes("tvv hoat dong") || rewardText.includes("moi tvv") || rewardText.includes("tu van vien")) return "tvv";
  if (rewardText.includes("/hd") || rewardText.includes("/hop dong") || rewardText.includes("moi hd") || rewardText.includes("moi hop dong")) return "contract";
  if (rewardText.includes("/nhom") || rewardText.includes("thuong nhom") || rewardText.includes("moi nhom")) return "group";
  if (rewardText.includes("/ads") || rewardText.includes("thuong ads")) return "ads";

  const kind = normalizeText(rewardKind(rule));
  if (kind.includes("active_advisor")) return "tvv";
  if (kind.includes("per_contract") || kind.includes("per_policy") || kind.includes("policy_pdt") || kind.includes("top_n")) return "contract";
  return rewardConditionScope(rule);
}

function rewardRecipientLabel(scope: RewardResultScope) {
  if (scope === "contract") return "Hợp đồng";
  if (scope === "tvv") return "TVV";
  if (scope === "group") return "Nhóm";
  if (scope === "ads") return "ADS";
  return "Công ty";
}

function rewardConditionScope(rule: CompetitionRewardRule): "contract" | "tvv" | "group" {
  const target = normalizeText(String(rule.scope || rule.target_type || rule.condition?.scope || rule.condition?.target_type || ""));
  if (target.includes("nhom") || target.includes("group") || isGroupRevenueRule(rule)) return "group";
  if (target.includes("tvv") || target.includes("tu van") || target.includes("advisor") || target.includes("agent")) return "tvv";
  if (target.includes("policy") || target.includes("contract") || target.includes("hop dong") || target.includes("hd")) return "contract";
  return "contract";
}

function rewardResultTabScope(rule: CompetitionRewardRule): RewardResultScope | null {
  return rewardScopeFromText(rule.result_tab || rule.condition?.result_tab);
}

function shouldCreateAdvisorRows(rule: CompetitionRewardRule, conditionScope: "contract" | "tvv" | "group", recipientScope: RewardResultScope) {
  if (recipientScope !== "tvv") return false;
  if (conditionScope !== "group") return true;
  const text = normalizeText([
    rule.result_tab,
    rule.condition?.result_tab,
    rule.condition_text,
    rule.calculation_logic,
    rule.reward_formula,
    rule.reward_name,
    rule.prize_name
  ].join(" "));
  return text.includes("danh sach tvv") || text.includes("tvv dat thuong rieng") || text.includes("tab tvv") || text.includes("tvv dat");
}

function spbkThresholdFromRule(rule: CompetitionRewardRule) {
  const candidates = [
    rule.condition?.min_spbk_count,
    rule.condition?.min_rider_count,
    rule.condition?.min_supplementary_product_count,
    rule.condition?.spbk_count,
    rule.condition?.rider_count
  ];
  for (const value of candidates) {
    const count = Number(value);
    if (count > 0) return count;
  }

  for (const threshold of rule.thresholds ?? []) {
    const metric = normalizeText(String(threshold.metric || threshold.name || threshold.type || threshold.label || ""));
    if (!isGenericSpbkProduct(metric)) continue;
    const count = Number(threshold.value ?? threshold.min ?? threshold.threshold ?? threshold.count ?? 0);
    if (count > 0) return count;
  }

  const text = normalizeText([rule.condition_text, rule.calculation_logic].join(" "));
  const match = text.match(/(?:it nhat|>=|toi thieu)\s*(\d+)\s*(?:spbk|san pham ban kem|san pham bo tro)/);
  return match ? Number(match[1]) || 0 : 0;
}

function minSpbkCount(rule: CompetitionRuleInput) {
  const ruleCounts = (rule.reward_rules ?? []).map(spbkThresholdFromRule).filter((count) => count > 0);
  const topLevelCandidates = [
    (rule as AnyRecord).min_spbk_count,
    (rule as AnyRecord).min_rider_count,
    (rule as AnyRecord).min_supplementary_product_count
  ].map(Number).filter((count) => count > 0);
  const counts = [...ruleCounts, ...topLevelCandidates];
  if (counts.length > 0) return Math.min(...counts);
  return (rule.eligible_products ?? []).some(isGenericSpbkProduct) ? 1 : 0;
}

function contractRewardLimit(rule: CompetitionRewardRule) {
  const limit = Number(rule.max_reward ?? rule.condition?.max_reward ?? rule.condition?.limit ?? 0);
  return limit > 0 && limit <= 1000 ? limit : 0;
}

function toEligibleContract(contract: NormalizedCompetitionContract, rule: CompetitionRewardRule, amount = rewardAmount(rule), reason?: string): EligibleContractReward {
  return {
    paidDate: contract.collection_date,
    issuedDate: contract.issue_date,
    applicationNo: contract.gyc_no,
    contractNo: contract.contract_no,
    advisor: contract.tvv,
    group: contract.team,
    ads: contract.ads,
    customer: contract.customer_name,
    product: contract.product_name,
    ip: contract.ip,
    afyp: contract.afyp,
    status: contract.status,
    prizeName: rewardName(rule),
    rewardName: rewardName(rule),
    rewardType: rewardKind(rule),
    rewardAmount: amount,
    rewardFormula: rewardFormula(rule),
    reason: reason || rule.condition_text || "Đạt điều kiện rule",
    source: contract.source
  };
}

function toExcluded(contract: NormalizedCompetitionContract, reason: string): ExcludedContract {
  return {
    applicationNo: contract.gyc_no,
    contractNo: contract.contract_no,
    advisor: contract.tvv,
    group: contract.team,
    customer: contract.customer_name,
    ip: contract.ip,
    afyp: contract.afyp,
    status: contract.status,
    reason,
    source: contract.source
  };
}

function findTier(tiers: AnyRecord[], value: number) {
  return [...(tiers ?? [])]
    .filter((tier) => value >= Number(tier.min ?? tier.min_value ?? tier.min_revenue ?? tier.min_group_revenue ?? tier.threshold ?? 0))
    .sort((a, b) => Number(b.min ?? b.min_value ?? b.min_revenue ?? b.min_group_revenue ?? b.threshold ?? 0) - Number(a.min ?? a.min_value ?? a.min_revenue ?? a.min_group_revenue ?? a.threshold ?? 0))[0] ?? null;
}

function tierThreshold(tier: AnyRecord) {
  return Number(tier.min ?? tier.min_value ?? tier.min_revenue ?? tier.min_group_revenue ?? tier.threshold ?? 0);
}

function nextTier(tiers: AnyRecord[], value: number) {
  return [...(tiers ?? [])]
    .filter((tier) => tierThreshold(tier) > value)
    .sort((a, b) => tierThreshold(a) - tierThreshold(b))[0] ?? null;
}

function isGroupRevenueRule(rule: CompetitionRewardRule) {
  const targetText = normalizeText(String(rule.target_type || rule.result_tab || rule.condition?.target_type || rule.condition?.result_tab || ""));
  if (targetText.includes("nhom") || targetText.includes("group")) return true;

  const conditionText = normalizeText([
    rule.condition_text,
    rule.calculation_logic,
    rule.condition?.text,
    rule.condition?.description,
    rule.condition?.metric,
    rule.reward_formula,
    rule.reward_name,
    rule.prize_name
  ].join(" "));
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
  ].some((phrase) => conditionText.includes(phrase));
}

function tierLabel(tier: AnyRecord) {
  const threshold = tierThreshold(tier);
  return threshold > 0 ? `>= ${(threshold / 1_000_000).toLocaleString("vi-VN")} triệu` : String(tier.label ?? tier.name ?? "Đạt mốc");
}

function tierRewardPerAdvisor(tier: AnyRecord, fallback = 0) {
  return Number(tier.reward_per_active_agent ?? tier.reward_per_advisor ?? tier.reward_amount ?? tier.amount ?? fallback) || 0;
}

function groupMetricKind(rule: CompetitionRewardRule): "ip" | "afyp" {
  const text = normalizeText([
    rule.metric_type,
    rule.condition?.metric,
    rule.condition_text,
    rule.calculation_logic,
    rule.reward_formula
  ].join(" "));
  return text.includes("afyp") || text.includes("pdt") ? "afyp" : "ip";
}

function groupRewardMode(rule: CompetitionRewardRule, tier?: AnyRecord | null): "per_advisor" | "group_fixed" | "group_percent" {
  const text = normalizeText([
    rule.reward_formula,
    rule.calculation_logic,
    rule.condition_text,
    rule.reward_name,
    rule.prize_name,
    tier?.reward_formula,
    tier?.formula,
    tier?.reward_type
  ].join(" "));
  if (String(tier?.reward_percent ?? tier?.percent ?? "").trim() || text.includes("%")) return "group_percent";
  if (text.includes("/nhom") || text.includes("thuong nhom") || text.includes("moi nhom") || tier?.reward_per_group || tier?.group_reward) return "group_fixed";
  return "per_advisor";
}

function groupPercentReward(rule: CompetitionRewardRule, tier: AnyRecord | null | undefined, revenue: number) {
  const percentSource = tier?.reward_percent ?? tier?.percent ?? rule.reward?.percent ?? rule.condition?.reward_percent;
  const directPercent = Number(String(percentSource ?? "").replace("%", ""));
  if (directPercent > 0) return revenue * directPercent / 100;
  const text = String(tier?.reward_formula ?? tier?.formula ?? rule.reward_formula ?? rule.calculation_logic ?? "");
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return 0;
  return revenue * Number(match[1].replace(",", ".")) / 100;
}

function groupFixedReward(rule: CompetitionRewardRule, tier: AnyRecord | null | undefined) {
  return Number(tier?.reward_per_group ?? tier?.group_reward ?? tier?.reward_amount ?? tier?.amount ?? rule.reward_amount ?? rule.reward?.amount ?? 0) || 0;
}

type FormulaVariables = Record<"reward_amount" | "group_metric" | "tvv_metric" | "contract_metric" | "threshold_value" | "active_tvv_count" | "qualified_tvv_count" | "contract_count" | "ip" | "afyp" | "fyp", number>;
const FORMULA_VARIABLES = new Set<keyof FormulaVariables>(["reward_amount", "group_metric", "tvv_metric", "contract_metric", "threshold_value", "active_tvv_count", "qualified_tvv_count", "contract_count", "ip", "afyp", "fyp"]);

/**
 * Formula is deliberately a tiny, whitelist-only arithmetic language.  It rejects
 * property access, calls and every identifier outside FORMULA_VARIABLES before a
 * compiled expression is ever created; this is not an unrestricted eval surface.
 */
function calculateRewardFormula(formula: string | undefined, vars: FormulaVariables) {
  if (!formula?.trim()) return null;
  const expression = formula.trim();
  if (!/^[\d\s_a-zA-Z+\-*/%().<>=!?:&|]+$/.test(expression)) throw new Error("Ký tự không được phép trong reward_formula");
  const names = expression.match(/[a-zA-Z_]\w*/g) ?? [];
  if (names.some((name) => !FORMULA_VARIABLES.has(name as keyof FormulaVariables))) throw new Error("Biến không nằm trong whitelist");
  // The grammar above contains only numeric operators, ternary and known variables.
  const values = [...FORMULA_VARIABLES].map((name) => Number(vars[name]) || 0);
  const compiled = Function(...FORMULA_VARIABLES, `"use strict"; return (${expression});`);
  const result = Number(compiled(...values));
  if (!Number.isFinite(result)) throw new Error("Kết quả formula không hợp lệ");
  return result;
}

function passesThreshold(value: number, rule: CompetitionRewardRule) {
  const threshold = Number(rule.threshold_value ?? rule.condition?.threshold_value ?? 0);
  switch (rule.threshold_operator ?? rule.condition?.threshold_operator ?? ">=") {
    case ">": return value > threshold;
    case "=": return value === threshold;
    case "<=": return value <= threshold;
    case "<": return value < threshold;
    default: return value >= threshold;
  }
}

function renderRewardNote(template: string | undefined, values: Record<string, unknown>) {
  if (!template) return "";
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
}

function sortEarliestContracts(contracts: NormalizedCompetitionContract[]) {
  return [...contracts].sort((a, b) =>
    a.collection_date.localeCompare(b.collection_date)
    || a.sourceIndex - b.sourceIndex
    || (a.gyc_no || a.contract_no).localeCompare(b.gyc_no || b.contract_no)
  );
}

function topNLimit(rule: CompetitionRewardRule) {
  return Number(rule.top_n ?? rule.condition?.limit ?? rule.condition?.top_n ?? rule.thresholds?.[0]?.limit ?? 10) || 10;
}

function contractPaymentOrderValue(contract: NormalizedCompetitionContract) {
  return contract.payment_datetime || contract.first_seen_at || "";
}

function calculateGroupRewards(rule: CompetitionRewardRule, contracts: NormalizedCompetitionContract[]) {
  const tiers = rule.thresholds ?? rule.tiers ?? rule.condition?.tiers ?? [];
  return [...groupBy(contracts, (contract) => contract.team).entries()].map(([group, rows]) => {
    const totalIP = rows.reduce((sum, row) => sum + row.ip, 0);
    const totalAFYP = rows.reduce((sum, row) => sum + row.afyp, 0);
    const metricKind = groupMetricKind(rule);
    const metricValue = metricKind === "afyp" ? totalAFYP : totalIP;
    const tier = tiers.length ? findTier(tiers, metricValue) : (passesThreshold(metricValue, rule) ? rule : null);
    const upcomingTier = tier || !tiers.length ? null : nextTier(tiers, metricValue);
    const advisorRows = [...groupBy(rows, (row) => row.tvv).entries()].map(([advisor, advisorContracts]) => ({
      advisor,
      group,
      ads: advisorContracts.find((contract) => contract.ads)?.ads ?? "",
      contractCount: new Set(advisorContracts.map(getRewardContractKey).filter(Boolean)).size,
      totalIP: advisorContracts.reduce((sum, contract) => sum + contract.ip, 0),
      totalAFYP: advisorContracts.reduce((sum, contract) => sum + contract.afyp, 0)
    })).filter((advisor) => advisor.advisor);
    const activeTvvCount = advisorRows.length;
    const minQualifiedContracts = Number(rule.condition?.min_policy_count ?? rule.condition?.active_agent_definition?.min_valid_policy_count ?? 1);
    const qualifiedTvvCount = advisorRows.filter((advisor) => advisor.contractCount >= minQualifiedContracts).length;
    const tierRule = tier ? { ...rule, ...tier } : rule;
    const payoutScope = tierRule.payout_scope;
    const splitMethod = tierRule.split_method ?? "none";
    const baseAmount = tier ? tierRewardPerAdvisor(tier, rewardAmount(rule)) : rewardAmount(rule);
    const formulaVars: FormulaVariables = { reward_amount: baseAmount, group_metric: metricValue, tvv_metric: 0, contract_metric: 0, threshold_value: Number(tierRule.threshold_value ?? tierThreshold(tierRule)), active_tvv_count: activeTvvCount, qualified_tvv_count: qualifiedTvvCount, contract_count: new Set(rows.map(getRewardContractKey).filter(Boolean)).size, ip: totalIP, afyp: totalAFYP, fyp: totalAFYP };
    let formulaAmount: number | null = null;
    if (tier && tierRule.reward_formula) {
      try { formulaAmount = calculateRewardFormula(tierRule.reward_formula, formulaVars); }
      catch (error) { console.warn("[CTTD Reward Formula]", rule.id, error); }
    }
    let rewardPerAdvisor = 0;
    let totalReward = 0;
    if (tier) {
      if (formulaAmount !== null) {
        totalReward = formulaAmount;
        if (payoutScope === "per_tvv") rewardPerAdvisor = baseAmount;
        else if (payoutScope === "shared_group" && splitMethod === "equal_per_active_tvv") rewardPerAdvisor = activeTvvCount ? formulaAmount / activeTvvCount : 0;
        else if (payoutScope === "shared_group" && splitMethod === "equal_per_qualified_tvv") rewardPerAdvisor = qualifiedTvvCount ? formulaAmount / qualifiedTvvCount : 0;
      } else if (payoutScope === "per_group") totalReward = baseAmount;
      else if (payoutScope === "per_tvv") { rewardPerAdvisor = baseAmount; totalReward = baseAmount * qualifiedTvvCount; }
      else if (payoutScope === "shared_group" && splitMethod === "equal_per_active_tvv") { totalReward = baseAmount; rewardPerAdvisor = activeTvvCount ? baseAmount / activeTvvCount : 0; }
      else if (payoutScope === "shared_group" && splitMethod === "equal_per_qualified_tvv") { totalReward = baseAmount; rewardPerAdvisor = qualifiedTvvCount ? baseAmount / qualifiedTvvCount : 0; }
      else {
        const mode = groupRewardMode(rule, tier);
        rewardPerAdvisor = mode === "per_advisor" ? tierRewardPerAdvisor(tier, rewardAmount(rule)) : 0;
        totalReward = mode === "group_percent" ? groupPercentReward(rule, tier, metricValue) : mode === "group_fixed" ? groupFixedReward(rule, tier) : qualifiedTvvCount * rewardPerAdvisor;
      }
    }
    const upcomingRewardPerAdvisor = upcomingTier ? tierRewardPerAdvisor(upcomingTier, rewardAmount(rule)) : 0;
    const upcomingTotalReward = qualifiedTvvCount * upcomingRewardPerAdvisor;
    const nextThreshold = upcomingTier ? tierThreshold(upcomingTier) : Number(rule.threshold_value ?? 0);
    const missingAmount = !tier && nextThreshold > 0 ? Math.max(0, nextThreshold - metricValue) : 0;
    const noteValues = { group, group_metric: metricValue, threshold_value: nextThreshold, missing_amount: missingAmount, missing_amount_vnd: missingAmount.toLocaleString("vi-VN"), reward_amount: totalReward, reward_per_tvv: rewardPerAdvisor, active_tvv_count: activeTvvCount, qualified_tvv_count: qualifiedTvvCount, metric_type: metricKind.toUpperCase() };
    const note = tier
      ? renderRewardNote(tierRule.note_template, noteValues) || rewardName(rule)
      : renderRewardNote(rule.unachieved_note_template ?? rule.note_template, noteValues) || `${rewardName(rule)} - Thiếu ${missingAmount.toLocaleString("vi-VN")} ${metricKind.toUpperCase()} để đạt thưởng`;
    return {
      group,
      totalIP,
      totalAFYP,
      activeAdvisorCount: activeTvvCount,
      eligibleContractCount: new Set(rows.map(getRewardContractKey).filter(Boolean)).size,
      achievedTier: tier ? tierLabel(tier) : (upcomingTier ? `Ch\u01b0a \u0111\u1ea1t ${tierLabel(upcomingTier)}` : "Ch\u01b0a \u0111\u1ea1t"),
      rewardPerAdvisor,
      totalReward,
      group_reward_amount: totalReward,
      reward_per_tvv: rewardPerAdvisor,
      qualified_tvv_count: qualifiedTvvCount,
      active_tvv_count: activeTvvCount,
      reward_note: note,
      displayColumns: rule.display_columns,
      prizeName: rewardName(rule),
      note,
      advisors: advisorRows
    };
  }).sort((a, b) =>
    Number(a.totalReward > 0) - Number(b.totalReward > 0)
    || (a.totalReward > 0 ? b.totalReward - a.totalReward : b.totalIP - a.totalIP)
  );
}

function calculateTopNEarliestContracts(rule: CompetitionRewardRule, contracts: NormalizedCompetitionContract[]) {
  const limit = topNLimit(rule);
  const amount = rewardAmount(rule) || 500_000;
  return sortEarliestContracts(contracts)
    .slice(0, limit)
    .map((contract) => toEligibleContract(contract, rule, amount, `Top ${limit} hợp đồng nộp phí sớm nhất`));
}

function calculateTopNNewlySeenContracts(rule: CompetitionRewardRule, contracts: NormalizedCompetitionContract[]) {
  const limit = topNLimit(rule);
  const amount = rewardAmount(rule) || 500_000;
  const orderBy = String(rule.order_by || rule.condition?.order_by || "first_seen_at_asc");
  const minPolicyIP = Number(rule.min_policy_ip ?? rule.condition?.min_policy_ip ?? 0);
  const candidates = contracts.filter((contract) =>
    Boolean(contractPaymentOrderValue(contract))
    && (minPolicyIP <= 0 || contract.ip >= minPolicyIP)
  );
  const direction = orderBy.includes("desc") ? -1 : 1;
  const selected = [...candidates]
    .sort((a, b) => (
      contractPaymentOrderValue(a).localeCompare(contractPaymentOrderValue(b))
      || a.collection_date.localeCompare(b.collection_date)
      || a.sourceIndex - b.sourceIndex
      || (a.gyc_no || a.contract_no).localeCompare(b.gyc_no || b.contract_no)
    ) * direction)
    .slice(0, limit);

  console.log("[CTTD NEWLY SEEN]", {
    reward_type: "top_n_newly_seen_contracts",
    total_snapshot_contracts: contracts.filter((contract) => contract.first_seen_at).length,
    eligible_new_contracts: candidates.length,
    selected_top_n_contracts: selected.length
  });

  return selected.map((contract) => toEligibleContract(
    contract,
    rule,
    amount,
    `Hợp đồng mới xuất hiện trong dữ liệu upload, thuộc top ${limit} theo thời điểm first_seen_at`
  ));
}

function passesBaseFilters(rule: CompetitionRuleInput, contract: NormalizedCompetitionContract) {
  const reasons: string[] = [];
  if (!contract.collection_date) reasons.push("Thiếu ngày thu");
  if (contract.collection_date && rule.start_date && contract.collection_date < rule.start_date) reasons.push("Ngoài thời gian thi đua");
  if (contract.collection_date && rule.end_date && contract.collection_date > rule.end_date) reasons.push("Ngoài thời gian thi đua");
  if (rule.issue_deadline && contract.issue_date && contract.issue_date > rule.issue_deadline) reasons.push("Ngày phát hành quá hạn");
  if (rule.issue_deadline && !contract.issue_date && !rule.issue_date_optional && !rule.allow_pending_issue) reasons.push("Thiếu ngày phát hành");

  const excludedStatuses = new Set((rule.excluded_statuses ?? []).map(normalizeText).filter(Boolean));
  const includedStatuses = new Set((rule.included_statuses ?? []).map(normalizeText).filter(Boolean));
  const status = normalizeText(contract.status);
  const refundStatuses = new Set(["het hieu luc", "ycbh het hieu luc", "tu choi", "tri hoan", "hoan phi"]);
  if (refundStatuses.has(status)) reasons.push("Hợp đồng hoàn phí chỉ hiển thị, không tính thi đua");
  if (excludedStatuses.has(status)) reasons.push("Trạng thái bị loại");
  if (!status && includedStatuses.size > 0 && !rule.allow_empty_status) reasons.push("Trạng thái trống không được phép");
  if (status && includedStatuses.size > 0 && !includedStatuses.has(status)) reasons.push("Trạng thái không thuộc danh sách được tính");

  if (Number(rule.min_policy_ip ?? 0) > 0 && contract.ip < Number(rule.min_policy_ip)) reasons.push(`IP dưới ${(Number(rule.min_policy_ip) / 1_000_000).toLocaleString("vi-VN")} triệu`);
  if (Number(rule.min_policy_afyp ?? 0) > 0 && contract.afyp < Number(rule.min_policy_afyp)) reasons.push("AFYP/HĐ dưới điều kiện tối thiểu");

  const products = new Set((rule.eligible_products ?? []).map(normalizeText).filter(Boolean));
  const hasGenericSpbkProduct = (rule.eligible_products ?? []).some(isGenericSpbkProduct);
  if (hasGenericSpbkProduct) {
    const requiredSpbkCount = minSpbkCount(rule);
    if (requiredSpbkCount > 0 && contract.spbkCount < requiredSpbkCount) {
      reasons.push(`SPBK dưới ${requiredSpbkCount} sản phẩm`);
    }
  }
  if (products.size > 0 && !hasGenericSpbkProduct && !products.has(normalizeText(contract.product_name))) reasons.push("Sản phẩm không thuộc danh sách được tính");

  return reasons;
}

function calculateContractRewards(rule: CompetitionRewardRule, contracts: NormalizedCompetitionContract[], programMetric?: CompetitionRuleInput["metric_type"]) {
  const kind = rewardKind(rule);
  if (kind === "reward_by_policy_pdt_table") {
    const tiers = [...(rule.pdt_reward_tiers ?? [])]
      .filter((tier) => Number(tier.min_pdt) > 0)
      .sort((a, b) => Number(b.min_pdt) - Number(a.min_pdt));
    const spcProducts = new Set((rule.spc_products ?? []).map((product) => String(product ?? "").trim().toUpperCase()).filter(Boolean));
    return contracts.flatMap((contract) => {
      const metricValue = competitionMetricValue(contract);
      const tier = tiers.find((item) => metricValue >= Number(item.min_pdt));
      if (!tier) {
        console.log("[CTTD FILTER]", { gyc_no: contract.gyc_no, step: "metric", metric_value: metricValue, result: "excluded" });
        return [];
      }
      const rawProductField = rawContractProductCode(contract);
      const productCode = getContractProductCode(contract);
      const isSpc = spcProducts.has(productCode);
      if (spcProducts.size > 0 && !productCode) {
        console.log("[CTTD FILTER]", { gyc_no: contract.gyc_no, step: "product", raw_product_field: rawProductField, result: "missing_product" });
      }
      const rawReward = isSpc ? tier.spc_reward : tier.other_reward;
      const text = String(rawReward ?? "").trim();
      const percent = text.endsWith("%") ? parseCompetitionMoney(text.slice(0, -1)) : 0;
      const amount = percent > 0 ? metricValue * percent / 100 : parseCompetitionMoney(rawReward);
      console.log("[CTTD PDT TABLE]", { gyc_no: contract.gyc_no, raw_product_field: rawProductField, normalized_product_code: productCode, expected_spc_code: [...spcProducts].join(", "), isSPC: isSpc, metric_value: metricValue, threshold_matched: tier.min_pdt, reward_type: percent > 0 ? "percent" : "fixed", reward_amount: amount });
      if (!Number.isFinite(amount) || amount <= 0) return [];
      const eligible = toEligibleContract(contract, rule, amount, `PĐT/HĐ >= ${Number(tier.min_pdt).toLocaleString("vi-VN")}đ`);
      eligible.prizeName = isSpc ? "HĐ SPC An Thịnh Phúc Niên" : "HĐ còn lại";
      eligible.rewardName = eligible.prizeName;
      return [eligible];
    });
  }
  if (kind === "top_n_newly_seen_contracts") return calculateTopNNewlySeenContracts(rule, contracts);
  if (kind === "top_n_earliest_contracts") return calculateTopNEarliestContracts(rule, contracts);
  if (kind === "reward_by_product") {
    const products = new Set([...(rule.condition?.products ?? []), ...(rule.condition?.eligible_products ?? [])].map(normalizeText));
    return contracts
      .filter((contract) => products.size === 0 || products.has(normalizeText(contract.product_name)))
      .map((contract) => toEligibleContract(contract, rule));
  }
  if (["reward_per_contract", "fixed_amount_per_policy", "fixed_amount_per_contract"].includes(kind) || (kind === "reward_by_policy_count" && isContractTargetRule(rule))) {
    const limit = contractRewardLimit(rule);
    const eligible = limit > 0 ? contracts.slice(0, limit) : contracts;
    return eligible.map((contract) => toEligibleContract(contract, rule));
  }
  return [];
}

function advisorSummaryForContracts(contracts: NormalizedCompetitionContract[], rule: CompetitionRewardRule, amount = rewardAmount(rule)) {
  return [...groupBy(contracts, (contract) => contract.tvv).entries()].map(([advisor, rows]) => ({
    advisor,
    group: rows.find((row) => row.team)?.team ?? "",
    ads: rows.find((row) => row.ads)?.ads ?? "",
    contractCount: new Set(rows.map(getRewardContractKey).filter(Boolean)).size,
    totalIP: rows.reduce((sum, row) => sum + row.ip, 0),
    totalAFYP: rows.reduce((sum, row) => sum + row.afyp, 0),
    prizeName: rewardName(rule),
    rewardAmount: amount,
    achievedRewardNames: [rewardName(rule)]
  }));
}

function calculateAdvisorRewards(rule: CompetitionRewardRule, contracts: NormalizedCompetitionContract[]) {
  const kind = rewardKind(rule);
  if (kind === "reward_per_active_advisor") {
    const minCount = Number(rule.condition?.min_policy_count ?? rule.condition?.active_agent_definition?.min_valid_policy_count ?? 1);
    return advisorSummaryForContracts(contracts, rule).filter((advisor) => advisor.contractCount >= minCount);
  }
  if (kind === "reward_by_policy_count") {
    if (isContractTargetRule(rule)) return [];
    const minCount = Number(rule.condition?.min_policy_count ?? rule.thresholds?.[0]?.min_policy_count ?? 1);
    return advisorSummaryForContracts(contracts, rule).filter((advisor) => advisor.contractCount >= minCount);
  }
  if (kind === "reward_by_revenue_tier") {
    return [...groupBy(contracts, (contract) => contract.tvv).entries()].flatMap(([advisor, rows]) => {
      const metric = normalizeText(String(rule.calculation_logic || rule.condition?.metric || "afyp")).includes("ip") ? "ip" : "afyp";
      const total = rows.reduce((sum, row) => sum + (metric === "ip" ? row.ip : row.afyp), 0);
      const tier = findTier(rule.thresholds ?? rule.tiers ?? rule.condition?.tiers ?? [], total);
      if (!tier) return [];
      return [{
        advisor,
        group: rows.find((row) => row.team)?.team ?? "",
        ads: rows.find((row) => row.ads)?.ads ?? "",
        contractCount: new Set(rows.map(getRewardContractKey).filter(Boolean)).size,
        totalIP: rows.reduce((sum, row) => sum + row.ip, 0),
        totalAFYP: rows.reduce((sum, row) => sum + row.afyp, 0),
        prizeName: rewardName(rule),
        rewardAmount: Number(tier.reward_amount ?? tier.rewardAmount ?? tier.amount ?? rule.reward_amount ?? 0) || 0,
        achievedRewardNames: [rewardName(rule)]
      }];
    });
  }
  if (kind === "reward_per_active_advisor_by_group_revenue_tier") {
    const tiers = rule.thresholds ?? rule.tiers ?? rule.condition?.tiers ?? [];
    const minCount = Number(rule.condition?.active_agent_definition?.min_valid_policy_count ?? 1);
    return [...groupBy(contracts, (contract) => contract.team).entries()].flatMap(([, rows]) => {
      const groupRevenue = rows.reduce((sum, row) => sum + row.ip, 0);
      const tier = findTier(tiers, groupRevenue);
      if (!tier) return [];
      const amount = Number(tier.reward_per_active_agent ?? tier.reward_amount ?? tier.amount ?? 0) || 0;
      const note = `${rewardName(rule)} - Nhóm ${rows.find((row) => row.team)?.team ?? "-"} đạt ${tierLabel(tier)}`;
      return advisorSummaryForContracts(rows, rule, amount)
        .filter((advisor) => advisor.contractCount >= minCount)
        .map((advisor) => ({ ...advisor, note }));
    });
  }
  return [];
}

function addAdvisorReward(
  map: Map<string, EligibleAdvisorReward>,
  advisor: string,
  group: string,
  ads: string,
  contractCount: number,
  totalIP: number,
  totalAFYP: number,
  prizeName: string,
  rewardAmount: number
) {
  if (!advisor) return;
  const key = `${normalizeText(advisor)}__${normalizeText(group)}`;
  const current = map.get(key) ?? {
    advisor,
    group,
    ads,
    contractCount: 0,
    totalIP: 0,
    totalAFYP: 0,
    prizeName,
    rewardAmount: 0,
    achievedRewardNames: [],
    note: ""
  };
  current.contractCount += contractCount;
  current.totalIP += totalIP;
  current.totalAFYP += totalAFYP;
  current.rewardAmount += rewardAmount;
  if (ads && !current.ads) current.ads = ads;
  current.achievedRewardNames = [...new Set([...(current.achievedRewardNames ?? []), prizeName])];
  current.prizeName = current.achievedRewardNames.join(", ");
  current.note = current.prizeName;
  map.set(key, current);
}

function advisorRewardKey(advisor: Pick<EligibleAdvisorReward, "advisor" | "group">) {
  return `${normalizeText(advisor.advisor)}__${normalizeText(advisor.group)}`;
}

function groupRewardKey(group: Pick<EligibleGroupReward, "group">) {
  return normalizeText(group.group);
}

export function calculateCompetitionReward(rule: CompetitionRuleInput, contracts: AnyRecord[]): CompetitionRewardResult {
  const warnings: string[] = [];
  const normalizedContracts = contracts.map((contract, index) => normalizeContract(contract, index));
  const eligibleBaseContracts: NormalizedCompetitionContract[] = [];
  const excludedContracts: ExcludedContract[] = [];

  for (const contract of normalizedContracts) {
    const reasons = passesBaseFilters(rule, contract);
    if (reasons.length > 0) {
      const uniqueReasons = [...new Set(reasons)];
      excludedContracts.push(toExcluded(contract, uniqueReasons.join("; ")));
      console.log("[CTTD FILTER]", {
        gyc_no: contract.gyc_no || contract.contract_no,
        steps: uniqueReasons.map((reason) => {
          const normalized = normalizeText(reason);
          if (normalized.includes("san pham")) return "product";
          if (normalized.includes("ngay phat hanh")) return "issue_date";
          if (normalized.includes("ngay thu") || normalized.includes("thoi gian")) return "date";
          if (normalized.includes("trang thai")) return "status";
          if (normalized.includes("ip") || normalized.includes("afyp")) return "metric";
          return "other";
        }),
        reasons: uniqueReasons
      });
    } else eligibleBaseContracts.push(contract);
  }
  if (rule.issue_deadline && eligibleBaseContracts.some((contract) => !contract.issue_date)) {
    warnings.push("Một số hợp đồng chưa có ngày phát hành, chưa loại theo điều kiện phát hành đến.");
  }

  const eligibleContracts: EligibleContractReward[] = [];
  const eligibleGroups: EligibleGroupReward[] = [];
  const advisorRewardMap = new Map<string, EligibleAdvisorReward>();
  const groupRewardMap = new Map<string, EligibleGroupReward>();
  const rewardRules = [...(rule.reward_rules ?? [])].sort((a, b) => Number(a.priority ?? 999) - Number(b.priority ?? 999));
  const excludedKeys = new Set(excludedContracts.map((contract) => contract.contractNo || contract.applicationNo));
  const uniqueEligibleBaseContracts = dedupeNormalizedContracts(eligibleBaseContracts);

  if (rewardRules.length === 0) warnings.push("Chưa có reward_rules để tính thưởng.");

  for (const rewardRule of rewardRules) {
    const kind = rewardKind(rewardRule);
    const conditionScope = rewardConditionScope(rewardRule);
    const recipientScope = rewardRecipientScope(rewardRule);
    const resultTabScope = rewardResultTabScope(rewardRule);
    const shouldOutputGroupRows = conditionScope === "group" || resultTabScope === "group";
    if (kind === "custom_ai_rule") {
      warnings.push(`Rule "${rewardName(rewardRule)}" là custom_ai_rule, cần AI xử lý bổ sung.`);
      continue;
    }
    const rulePriority = Number(rewardRule.priority ?? 999);
    const rewardContracts = recipientScope === "contract" ? calculateContractRewards(rewardRule, uniqueEligibleBaseContracts, rule.metric_type) : [];
    eligibleContracts.push(...rewardContracts.map((contract) => ({ ...contract, rulePriority })));
    const groupRewards = shouldOutputGroupRows ? calculateGroupRewards(rewardRule, uniqueEligibleBaseContracts) : [];
    for (const group of groupRewards) {
      console.log("[CTTD Reward]", rule.program_name, rewardRule.id, rewardRule.target_type, {
        calculatedReward: group.totalReward,
        group_reward_amount: group.group_reward_amount,
        reward_per_tvv: group.reward_per_tvv
      });
      const candidate = { ...group, rulePriority, prizeName: rewardName(rewardRule), note: group.note || rewardName(rewardRule) };
      const key = groupRewardKey(candidate);
      if (Number(candidate.totalReward) > 0 && rewardRule.allow_multiple_rewards) {
        eligibleGroups.push(candidate);
      } else if (key && preferHigherReward(candidate, groupRewardMap.get(key))) {
        groupRewardMap.set(key, candidate);
      }
    }
    if (kind === "top_n_earliest_contracts" || kind === "top_n_newly_seen_contracts") {
      const selectedKeys = new Set(rewardContracts.map((contract) => contract.contractNo || contract.applicationNo));
      for (const contract of eligibleBaseContracts) {
        const key = contract.contract_no || contract.gyc_no;
        if (!selectedKeys.has(key) && !excludedKeys.has(key)) {
          excludedContracts.push(toExcluded(contract, "Không thuộc top 10 hợp đồng nộp phí sớm nhất"));
          excludedKeys.add(key);
        }
      }
    }
    const advisorRewards: EligibleAdvisorReward[] = shouldCreateAdvisorRows(rewardRule, conditionScope, recipientScope) ? calculateAdvisorRewards(rewardRule, uniqueEligibleBaseContracts) : [];
    for (const advisor of advisorRewards) {
      if (!(Number(advisor.rewardAmount) > 0)) continue;
      const candidate: EligibleAdvisorReward = {
        ...advisor,
        rulePriority,
        prizeName: rewardName(rewardRule),
        achievedRewardNames: [rewardName(rewardRule)],
        note: advisor.note || rewardName(rewardRule)
      };
      const key = advisorRewardKey(candidate);
      if (rewardRule.allow_multiple_rewards) {
        const existing = advisorRewardMap.get(`${key}__${rulePriority}__${normalizeText(rewardName(rewardRule))}`);
        if (!existing) advisorRewardMap.set(`${key}__${rulePriority}__${normalizeText(rewardName(rewardRule))}`, candidate);
      } else if (key !== "__" && preferHigherReward(candidate, advisorRewardMap.get(key))) {
        advisorRewardMap.set(key, candidate);
      }
    }
    console.log("[CTTD RULE OUTPUT]", {
      reward_name: rewardName(rewardRule),
      condition_scope: conditionScope,
      recipient_scope: recipientScope,
      result_tab_scope: resultTabScope,
      target_type: rewardRule.target_type || rewardRule.condition?.target_type || "",
      reward_recipient_type: rewardRule.reward_recipient_type || rewardRule.recipient_type || rewardRule.recipient || "",
      reward_type: kind,
      group_rows: groupRewards.length,
      advisor_rows: advisorRewards.length,
      contract_rows: rewardContracts.length
    });
  }

  const uniqueContracts = dedupeRewardContracts(eligibleContracts);
  const eligibleAdvisors = [...advisorRewardMap.values()].sort((a, b) => b.rewardAmount - a.rewardAmount || b.totalIP - a.totalIP);
  const qualifiedAdvisorKeys = new Set(eligibleAdvisors.map((advisor) => `${normalizeText(advisor.advisor)}__${normalizeText(advisor.group)}`).filter((key) => key !== "__"));
  const allGroupResults = [...eligibleGroups, ...groupRewardMap.values()];
  const achievedGroups = allGroupResults.filter((group) => group.totalReward > 0);
  const qualifiedGroupKeys = new Set(achievedGroups.map((group) => normalizeText(group.group)).filter(Boolean));
  const contractRewardTotal = uniqueContracts.reduce((sum, contract) => sum + (Number(contract.rewardAmount) || 0), 0);
  const tvvRewardTotal = eligibleAdvisors.reduce((sum, advisor) => sum + (Number(advisor.rewardAmount) || 0), 0);
  const groupRewardTotal = achievedGroups.reduce((sum, group) => sum + (Number(group.totalReward) || 0), 0);
  const recipientTypes = [...new Set(rewardRules.flatMap((item) => {
    const tabs: RewardResultScope[] = [];
    if (rewardConditionScope(item) === "group" || rewardResultTabScope(item) === "group") tabs.push("group");
    else tabs.push(rewardRecipientScope(item));
    return tabs.filter((scope) => scope !== "company").map(rewardRecipientLabel);
  }))];
  const totalRewardRaw = contractRewardTotal + tvvRewardTotal + groupRewardTotal;
  const moneyCap = Number(rule.max_reward ?? 0);
  const totalReward = moneyCap > 1000 ? Math.min(totalRewardRaw, moneyCap) : totalRewardRaw;
  const excludedStatuses = new Set((rule.excluded_statuses ?? []).map(normalizeText).filter(Boolean));
  const minPolicyIP = Number(rule.min_policy_ip ?? 0);
  const requiredSpbkCount = minSpbkCount(rule);
  const afterDateFilter = normalizedContracts.filter((contract) =>
    Boolean(contract.collection_date)
    && (!rule.start_date || contract.collection_date >= rule.start_date)
    && (!rule.end_date || contract.collection_date <= rule.end_date)
  );
  const afterStatusFilter = afterDateFilter.filter((contract) => !excludedStatuses.has(normalizeText(contract.status)));
  const afterIpFilter = afterStatusFilter.filter((contract) => minPolicyIP <= 0 || contract.ip >= minPolicyIP);
  const afterSpbkFilter = afterIpFilter.filter((contract) => requiredSpbkCount <= 0 || contract.spbkCount >= requiredSpbkCount);
  const afterIssueDateFilter = afterSpbkFilter.filter((contract) => !rule.issue_deadline || !contract.issue_date || contract.issue_date <= rule.issue_deadline);
  const topNRule = rewardRules.find((rewardRule) => ["top_n_earliest_contracts", "top_n_newly_seen_contracts"].includes(rewardKind(rewardRule)));
  const topNRuleLimit = topNRule ? topNLimit(topNRule) : 0;
  const topNSelectedCount = topNRule ? Math.min(topNRuleLimit, afterIssueDateFilter.length) : 0;
  const filterDebug = {
    program_name: rule.program_name,
    reward_type: topNRule ? rewardKind(topNRule) : null,
    inputRows: contracts.length,
    afterCollectionDateFilter: afterDateFilter.length,
    afterExcludedStatusFilter: afterStatusFilter.length,
    afterMinIPFilter: afterIpFilter.length,
    afterSpbkFilter: afterSpbkFilter.length,
    afterIssueDateFilter: afterIssueDateFilter.length,
    topNSelectedContracts: topNSelectedCount
  };
  const contractRulesCount = rewardRules.filter((item) => rewardRecipientScope(item) === "contract").length;
  const tvvRulesCount = rewardRules.filter((item) => rewardRecipientScope(item) === "tvv").length;
  const groupRulesCount = rewardRules.filter((item) => rewardRecipientScope(item) === "group").length;

  const contractKeyCounts = new Map<string, number>();
  for (const contract of uniqueContracts) {
    const key = getRewardContractKey(contract);
    contractKeyCounts.set(key, (contractKeyCounts.get(key) ?? 0) + 1);
  }
  const duplicatedContractKeys = [...contractKeyCounts.entries()].filter(([, count]) => count > 1);
  if (duplicatedContractKeys.length > 0) console.warn("[CTTD DUPLICATE CONTRACT REWARD]", { program: rule.program_name, duplicatedContractKeys });

  for (const advisor of eligibleAdvisors) {
    const sourceRows = uniqueEligibleBaseContracts.filter((contract) => normalizeText(contract.tvv) === normalizeText(advisor.advisor) && normalizeText(contract.team) === normalizeText(advisor.group));
    const uniqueCount = new Set(sourceRows.map(getRewardContractKey).filter(Boolean)).size;
    if (uniqueCount !== Number(advisor.contractCount ?? 0)) {
      console.warn("[CTTD TVV CONTRACT COUNT MISMATCH]", { program: rule.program_name, advisor: advisor.advisor, reported: advisor.contractCount, uniqueGroupedContracts: uniqueCount });
    }
  }

  for (const group of achievedGroups) {
    const sourceRows = uniqueEligibleBaseContracts.filter((contract) => normalizeText(contract.team) === normalizeText(group.group));
    const uniqueCount = new Set(sourceRows.map(getRewardContractKey).filter(Boolean)).size;
    if (uniqueCount !== Number(group.eligibleContractCount ?? 0)) {
      console.warn("[CTTD GROUP CONTRACT COUNT MISMATCH]", { program: rule.program_name, group: group.group, reported: group.eligibleContractCount, uniqueGroupedContracts: uniqueCount });
    }
  }

  console.group(rule.program_name || "Chương trình thi đua");
  console.log("rawContracts count", contracts.length);
  console.log("eligibleContracts count", eligibleBaseContracts.length);
  console.log("uniqueEligibleContracts count", uniqueEligibleBaseContracts.length);
  console.log("contractRules count", contractRulesCount);
  console.log("tvvRules count", tvvRulesCount);
  console.log("groupRules count", groupRulesCount);
  console.log("contractRewardResults count + totalReward", { count: uniqueContracts.length, totalReward: contractRewardTotal });
  console.log("tvvRewardResults count + totalReward", { count: eligibleAdvisors.length, totalReward: tvvRewardTotal });
  console.log("groupRewardResults count + totalReward", { count: achievedGroups.length, totalReward: groupRewardTotal });
  console.groupEnd();

  console.log("[competition] calculateCompetitionReward debug", filterDebug);
  const groupRevenueByTeam = [...groupBy(eligibleBaseContracts, (contract) => contract.team).entries()].map(([team, rows]) => ({
    team,
    totalIP: rows.reduce((sum, row) => sum + row.ip, 0),
    totalAFYP: rows.reduce((sum, row) => sum + row.afyp, 0),
    contracts: new Set(rows.map((row) => row.contract_no || row.gyc_no).filter(Boolean)).size,
    advisors: new Set(rows.map((row) => row.tvv).filter(Boolean)).size
  }));
  console.log("[competition] reward output", {
    eligibleContracts: uniqueContracts.length,
    eligibleGroups: achievedGroups.length,
    eligibleAdvisors: eligibleAdvisors.length,
    groupRevenueByTeam,
    advisorRewardsByTVV: eligibleAdvisors,
    rewardScopes: { contractRules: contractRulesCount, tvvRules: tvvRulesCount, groupRules: groupRulesCount, contractRewardTotal, tvvRewardTotal, groupRewardTotal },
    summaryPreview: {
      totalEligibleGroups: qualifiedGroupKeys.size,
      totalEligibleAdvisors: qualifiedAdvisorKeys.size,
      totalEligibleContracts: uniqueContracts.length,
      totalReward
    }
  });

  const summary = {
    totalEligibleGroups: qualifiedGroupKeys.size,
    totalEligibleAdvisors: qualifiedAdvisorKeys.size,
    totalEligibleContracts: uniqueContracts.length,
    totalExcludedContracts: excludedContracts.length,
    totalReward,
    totalIP: eligibleBaseContracts.reduce((sum, contract) => sum + contract.ip, 0),
    totalAFYP: eligibleBaseContracts.reduce((sum, contract) => sum + contract.afyp, 0),
    recipientTypes,
    warnings,
    debug: {
      inputRows: contracts.length,
      normalizedRows: normalizedContracts.length,
      afterBaseFilters: eligibleBaseContracts.length,
      excludedRows: excludedContracts.length,
      rewardRules: rewardRules.length,
      contractRules: contractRulesCount,
      tvvRules: tvvRulesCount,
      groupRules: groupRulesCount,
      uniqueEligibleContracts: uniqueEligibleBaseContracts.length,
      filterSteps: filterDebug,
      groupRevenueByTeam
    }
  };

  return {
    summary,
    eligibleGroups: allGroupResults,
    eligibleAdvisors,
    eligibleContracts: uniqueContracts,
    rewardByContracts: uniqueContracts,
    rewardByAdvisors: eligibleAdvisors,
    rewardByGroups: allGroupResults,
    rewardByAds: [],
    contractRewardResults: uniqueContracts,
    tvvRewardResults: eligibleAdvisors,
    groupRewardResults: allGroupResults,
    excludedContracts,
    warnings
  };
}
