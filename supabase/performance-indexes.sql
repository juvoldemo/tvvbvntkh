-- Run once in Supabase SQL Editor. These indexes match the hottest dashboard
-- filters and avoid scanning the full revenue/event tables under concurrency.
create index if not exists idx_revenue_records_month_paid
  on public.revenue_records(data_month, paid_date);
create index if not exists idx_revenue_records_agent_month_paid
  on public.revenue_records(agent_code, data_month, paid_date);
create index if not exists idx_revenue_records_group_month_paid
  on public.revenue_records(group_name, data_month, paid_date);
create index if not exists idx_upload_batches_month_uploaded
  on public.upload_batches(data_month, uploaded_at desc);
create index if not exists idx_admin_events_active_created
  on public.admin_events(created_at desc) where is_active = true;
create index if not exists idx_authorized_users_code_active
  on public.authorized_users(advisor_code) where is_active = true;
create index if not exists idx_conference_registrations_advisor_conference
  on public.customer_conference_registrations(advisor_code, conference_id);

-- Separate collaboration notes for each registered HNKH customer.
alter table public.customer_conference_registrations
  add column if not exists ad_note text,
  add column if not exists ad_note_updated_by text,
  add column if not exists ad_note_updated_at timestamptz,
  add column if not exists cql_note text,
  add column if not exists cql_note_updated_by text,
  add column if not exists cql_note_updated_at timestamptz;
