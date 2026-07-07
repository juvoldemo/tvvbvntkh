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
