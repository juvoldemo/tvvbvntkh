create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  instructor_name text not null,
  location text not null,
  scheduled_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_schedules_scheduled_at
  on public.class_schedules (scheduled_at);
