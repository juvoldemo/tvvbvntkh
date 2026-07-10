create table if not exists public.tvv_target_registrations (
  id uuid primary key default gen_random_uuid(),
  target_month date not null,
  advisor_code text not null,
  advisor_name text,
  revenue_target numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(target_month, advisor_code)
);

create index if not exists idx_tvv_target_registrations_advisor_month
  on public.tvv_target_registrations(advisor_code, target_month desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tvv_target_registrations'
  ) then
    alter publication supabase_realtime add table public.tvv_target_registrations;
  end if;
end $$;
