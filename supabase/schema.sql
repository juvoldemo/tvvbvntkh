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
create index if not exists idx_revenue_records_ban on revenue_records(ban_name);
create index if not exists idx_revenue_records_group on revenue_records(group_name);
create index if not exists idx_revenue_records_agent on revenue_records(agent_code);
create index if not exists idx_revenue_records_ads on revenue_records(ads_code);
create index if not exists idx_revenue_records_status on revenue_records(policy_status);
create unique index if not exists uniq_revenue_contract_month on revenue_records(data_month, contract_no);
create unique index if not exists uniq_company_target_month on monthly_targets(target_month, target_level) where target_level = 'company' and target_code is null;

notify pgrst, 'reload schema';
