alter table star_viet_records add column if not exists data_month date;
alter table star_viet_records add column if not exists agent_code text;

alter table star_viet_records drop constraint if exists star_viet_records_source_check;
alter table star_viet_records
  add constraint star_viet_records_source_check
  check (source in ('kpi04', 'bc02', 'kpi05_group', 'snapshot_agent', 'snapshot_group'));

create index if not exists idx_star_viet_records_month
  on star_viet_records(data_month);
create index if not exists idx_star_viet_records_agent_code
  on star_viet_records(agent_code);
create index if not exists idx_star_viet_records_snapshot
  on star_viet_records(source, data_year, data_month desc);
