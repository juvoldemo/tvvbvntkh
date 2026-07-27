-- Chỉ chạy file SQL này trong Supabase SQL Editor.
-- Danh sách TVV được ứng dụng đọc từ data/recruitment-candidates.json,
-- không dán scripts/import-recruitment-candidates.ts vào SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.team_target_registrations (
  id uuid primary key default gen_random_uuid(),
  target_month date not null,
  leader_code text not null,
  leader_name text,
  group_name text not null,
  revenue_target numeric not null default 0,
  active_advisor_target integer not null default 0,
  reward_target numeric not null default 0,
  selected_advisors jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(target_month, group_name)
);

create index if not exists idx_team_target_registrations_month
  on public.team_target_registrations(target_month desc);

create index if not exists idx_team_target_registrations_group
  on public.team_target_registrations(group_name);

insert into public.team_target_registrations (
  target_month,
  leader_code,
  leader_name,
  group_name,
  revenue_target,
  active_advisor_target,
  reward_target,
  selected_advisors,
  updated_at
) values (
  date '2099-12-01',
  '__SYSTEM__',
  'Recruitment Pool',
  '__RECRUITMENT_POOL_LOCK__',
  0,
  0,
  0,
  '{"version":1,"claims":{},"changes":{},"confirmations":{}}'::jsonb,
  now()
)
on conflict (target_month, group_name) do nothing;

commit;

-- Kết quả phải trả về đúng 1 dòng sau khi chạy thành công.
select
  target_month,
  group_name,
  selected_advisors,
  updated_at
from public.team_target_registrations
where target_month = date '2099-12-01'
  and group_name = '__RECRUITMENT_POOL_LOCK__';
