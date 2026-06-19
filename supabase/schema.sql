create extension if not exists pgcrypto;

create table if not exists revenue_records (
  id uuid primary key default gen_random_uuid(),
  data_month date not null,
  company_code text,
  company_name text,
  ban_code text,
  ban_name text not null,
  group_code text,
  group_name text not null,
  agent_code text,
  agent_name text not null,
  application_no text,
  group_contract_no text,
  contract_no text not null,
  premium_due_date date,
  policy_status text,
  paid_date date not null,
  updated_date date,
  issued_date date,
  policy_owner text,
  insured_name text,
  insured_dob date,
  invoice_no text,
  invoice_status text,
  ads_code text,
  ads_name text,
  ip numeric default 0,
  afyp numeric default 0,
  raw_data jsonb,
  upload_batch_id uuid,
  first_seen_at timestamptz,
  is_new_in_batch boolean default false,
  created_at timestamptz default now()
);

create table if not exists upload_batches (
  id uuid primary key default gen_random_uuid(),
  data_month date not null,
  file_name text,
  file_size bigint,
  row_count int default 0,
  total_afyp numeric default 0,
  total_ip numeric default 0,
  uploaded_at timestamptz default now(),
  uploaded_by text,
  uploaded_by_name text,
  status text default 'success',
  error_message text
);

alter table upload_batches add column if not exists uploaded_by text;
alter table upload_batches add column if not exists uploaded_by_name text;
alter table upload_batches add column if not exists file_name text;
alter table upload_batches add column if not exists file_size bigint;
alter table upload_batches add column if not exists row_count int default 0;
alter table upload_batches add column if not exists total_afyp numeric default 0;
alter table upload_batches add column if not exists total_ip numeric default 0;
alter table upload_batches add column if not exists status text default 'success';
alter table upload_batches add column if not exists error_message text;

alter table revenue_records add column if not exists company_code text;
alter table revenue_records add column if not exists company_name text;
alter table revenue_records add column if not exists ban_code text;
alter table revenue_records add column if not exists group_code text;
alter table revenue_records add column if not exists application_no text;
alter table revenue_records add column if not exists group_contract_no text;
alter table revenue_records add column if not exists premium_due_date date;
alter table revenue_records add column if not exists updated_date date;
alter table revenue_records add column if not exists issued_date date;
alter table revenue_records add column if not exists policy_owner text;
alter table revenue_records add column if not exists insured_name text;
alter table revenue_records add column if not exists insured_dob date;
alter table revenue_records add column if not exists invoice_no text;
alter table revenue_records add column if not exists invoice_status text;
alter table revenue_records add column if not exists ads_code text;
alter table revenue_records add column if not exists ads_name text;
alter table revenue_records add column if not exists raw_data jsonb;
alter table revenue_records add column if not exists upload_batch_id uuid;
alter table revenue_records add column if not exists first_seen_at timestamptz;
alter table revenue_records add column if not exists is_new_in_batch boolean default false;

create table if not exists monthly_targets (
  id uuid primary key default gen_random_uuid(),
  target_month date not null,
  target_level text not null default 'company',
  target_code text,
  target_name text,
  afyp_target numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists star_viet_records (
  id uuid primary key default gen_random_uuid(),
  data_year int not null,
  source text not null check (source in ('kpi04', 'bc02')),
  agent_name text not null,
  group_name text,
  afyp numeric default 0,
  policy_status text,
  raw_data jsonb,
  uploaded_at timestamptz default now()
);

create index if not exists idx_star_viet_records_year on star_viet_records(data_year);
create index if not exists idx_star_viet_records_source on star_viet_records(source);
create index if not exists idx_star_viet_records_agent on star_viet_records(agent_name);

create index if not exists idx_revenue_records_data_month on revenue_records(data_month);
create index if not exists idx_revenue_records_paid_date on revenue_records(paid_date);
create index if not exists idx_revenue_records_first_seen on revenue_records(first_seen_at);
create index if not exists idx_revenue_records_new_batch on revenue_records(data_month, is_new_in_batch);
create index if not exists idx_revenue_records_ban on revenue_records(ban_name);
create index if not exists idx_revenue_records_group on revenue_records(group_name);
create index if not exists idx_revenue_records_agent on revenue_records(agent_code);
create index if not exists idx_revenue_records_ads on revenue_records(ads_code);
create index if not exists idx_revenue_records_status on revenue_records(policy_status);
create unique index if not exists uniq_revenue_contract_month on revenue_records(data_month, contract_no);
create unique index if not exists uniq_company_target_month on monthly_targets(target_month, target_level) where target_level = 'company' and target_code is null;

create table if not exists competition_programs (
  id uuid primary key default gen_random_uuid(),
  program_name text not null,
  original_file_url text,
  original_file_name text,
  extracted_text text,
  ai_summary text,
  ai_rule jsonb,
  confirmed_rule jsonb,
  status text default 'Mới upload',
  start_date date,
  end_date date,
  issue_deadline date,
  target_types jsonb default '[]'::jsonb,
  confidence numeric default 0,
  needs_review boolean default true,
  is_hidden boolean default false,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_calculated_at timestamptz
);

alter table competition_programs add column if not exists is_hidden boolean default false;

create table if not exists competition_results (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references competition_programs(id) on delete cascade,
  result_summary jsonb,
  total_eligible_advisors integer default 0,
  total_eligible_contracts integer default 0,
  total_excluded_contracts integer default 0,
  total_ip numeric default 0,
  total_afyp numeric default 0,
  total_reward numeric default 0,
  calculated_at timestamptz default now(),
  calculated_by text
);

create table if not exists competition_reward_contracts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references competition_programs(id) on delete cascade,
  result_id uuid references competition_results(id) on delete cascade,
  contract_id text,
  gyc_no text,
  contract_no text,
  collection_date date,
  issue_date date,
  tvv text,
  team text,
  ads text,
  customer_name text,
  product_name text,
  ip numeric default 0,
  afyp numeric default 0,
  status text,
  reward_name text,
  reward_type text,
  reward_amount numeric default 0,
  reward_formula text,
  reason text,
  is_eligible boolean default true,
  first_seen_at timestamptz,
  created_at timestamptz default now()
);

alter table competition_reward_contracts
  add column if not exists first_seen_at timestamptz;

create table if not exists competition_contract_snapshots (
  id uuid primary key default gen_random_uuid(),
  month_key text not null,
  upload_batch_id text,
  uploaded_at timestamptz default now(),
  contract_unique_key text not null,
  gyc_no text,
  contract_no text,
  collection_date date,
  issue_date date,
  tvv text,
  team text,
  ads text,
  customer_name text,
  product_name text,
  ip numeric,
  afyp numeric,
  status text,
  raw_data jsonb,
  is_new_in_batch boolean default false,
  first_seen_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists competition_reward_advisors (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references competition_programs(id) on delete cascade,
  result_id uuid references competition_results(id) on delete cascade,
  tvv text,
  team text,
  ads text,
  eligible_contract_count integer default 0,
  total_ip numeric default 0,
  total_afyp numeric default 0,
  reward_amount numeric default 0,
  achieved_reward_names jsonb default '[]'::jsonb,
  note text,
  created_at timestamptz default now()
);

create table if not exists competition_reward_groups (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references competition_programs(id) on delete cascade,
  result_id uuid references competition_results(id) on delete cascade,
  team text,
  total_ip numeric default 0,
  total_afyp numeric default 0,
  active_advisor_count integer default 0,
  eligible_contract_count integer default 0,
  reward_per_advisor numeric default 0,
  total_reward numeric default 0,
  achieved_tier text,
  prize_name text,
  note text,
  created_at timestamptz default now()
);

create table if not exists competition_ai_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references competition_programs(id) on delete cascade,
  prompt text,
  ai_response jsonb,
  error text,
  created_at timestamptz default now()
);

create index if not exists idx_competition_programs_status on competition_programs(status);
create index if not exists idx_competition_results_program on competition_results(program_id, calculated_at desc);
create index if not exists idx_competition_reward_contracts_result on competition_reward_contracts(result_id);
create index if not exists idx_competition_reward_advisors_result on competition_reward_advisors(result_id);
create index if not exists idx_competition_reward_groups_result on competition_reward_groups(result_id);
create unique index if not exists uniq_competition_contract_snapshots_month_key on competition_contract_snapshots(month_key, contract_unique_key);
create index if not exists idx_competition_contract_snapshots_month on competition_contract_snapshots(month_key);
create index if not exists idx_competition_contract_snapshots_first_seen on competition_contract_snapshots(first_seen_at);

notify pgrst, 'reload schema';
