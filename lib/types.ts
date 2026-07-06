export type TargetLevel = "company" | "ban" | "group" | "agent" | "ads";

export type RevenueRecord = {
  id?: string;
  data_month: string;
  company_code?: string | null;
  company_name?: string | null;
  ban_code?: string | null;
  ban_name: string;
  group_code?: string | null;
  group_name: string;
  agent_code: string;
  agent_name: string;
  application_no?: string | null;
  group_contract_no?: string | null;
  contract_no: string;
  contract_no_display?: string;
  premium_due_date?: string | null;
  policy_status?: string | null;
  paid_date: string;
  updated_date?: string | null;
  issued_date?: string | null;
  policy_owner?: string | null;
  insured_name?: string | null;
  insured_dob?: string | null;
  invoice_no?: string | null;
  invoice_status?: string | null;
  ads_code?: string | null;
  ads_name?: string | null;
  ip: number;
  afyp: number;
  raw_data?: Record<string, unknown>;
  upload_batch_id?: string | null;
  first_seen_at?: string | null;
  is_new_in_batch?: boolean | null;
  created_at?: string;
};

export type UploadBatch = {
  id: string;
  data_month: string;
  file_name: string | null;
  file_size: number | null;
  row_count: number;
  total_afyp: number;
  total_ip: number;
  uploaded_at: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  status: "success" | "failed";
  error_message: string | null;
};

export type MonthlyTarget = {
  id: string;
  target_month: string;
  target_level: TargetLevel;
  target_code: string | null;
  target_name: string | null;
  afyp_target: number;
  created_at: string;
  updated_at: string;
};

export type DashboardFilters = {
  month: string;
  paidDate?: string;
  ban?: string;
  group?: string;
  agent?: string;
  ads?: string;
  status?: string;
};

export type ValidationError = {
  row?: number;
  field?: string;
  message: string;
};

export type ParsedRevenueCsv = {
  records: RevenueRecord[];
  preview: RevenueRecord[];
  errors: ValidationError[];
  totalAfyp: number;
  totalIp: number;
  adsDebugRows?: Array<{
    ban: string;
    nhom: string;
    ads: string;
    tvv: string;
    adsNormalized: string;
    matchedAds: string;
    kpi: number | null;
  }>;
  adsSummary?: {
    totalRecords: number;
    recordsWithAds: number;
    recordsWithoutAds: number;
    missingGroups: string[];
  };
};
