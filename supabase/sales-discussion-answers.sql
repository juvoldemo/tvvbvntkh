-- Run once in the Supabase SQL Editor before using /hoidap.
create table if not exists public.sales_discussion_answers (
  group_slug text primary key check (group_slug in (
    'khach-hang-tiem-nang', 'thiet-lap-cuoc-hen', 'tiep-can-tu-van',
    'hoa-giai-su-tri-hoan', 'chot-hop-dong', 'ban-giao-phuc-vu'
  )),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 3),
  updated_at timestamptz not null default now()
);

alter table public.sales_discussion_answers enable row level security;
revoke all on public.sales_discussion_answers from anon, authenticated;
grant select, insert, update, delete on public.sales_discussion_answers to service_role;
