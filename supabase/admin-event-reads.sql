-- Persist notification read state per signed-in advisor across logins and devices.
create table if not exists public.admin_event_reads (
  advisor_code text not null references public.authorized_users(advisor_code) on delete cascade,
  event_id uuid not null references public.admin_events(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (advisor_code, event_id)
);

create index if not exists idx_admin_event_reads_advisor
  on public.admin_event_reads(advisor_code, read_at desc);

alter table public.admin_event_reads enable row level security;
revoke all on table public.admin_event_reads from anon, authenticated;

notify pgrst, 'reload schema';
