create table if not exists public.sales_discussion_settings (
  id boolean primary key default true check (id = true),
  active_program integer not null default 1 check (active_program in (1, 2))
);
insert into public.sales_discussion_settings(id, active_program) values (true, 1) on conflict (id) do nothing;
create table if not exists public.sales_discussion_solutions (
  group_slug text primary key check (group_slug in ('khach-hang-tiem-nang', 'thiet-lap-cuoc-hen', 'tiep-can-tu-van', 'hoa-giai-su-tri-hoan', 'chot-hop-dong', 'ban-giao-phuc-vu')),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 1),
  updated_at timestamptz not null default now()
);
alter table public.sales_discussion_settings enable row level security;
alter table public.sales_discussion_solutions enable row level security;
revoke all on public.sales_discussion_settings, public.sales_discussion_solutions from anon, authenticated;
grant select, insert, update on public.sales_discussion_settings to service_role;
grant select, insert, update, delete on public.sales_discussion_solutions to service_role;
