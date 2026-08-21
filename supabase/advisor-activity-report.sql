-- Báo cáo thúc đẩy TVV. Chạy một lần trong Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.ads_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ads_code text unique,
  ads_name text,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ads_group_assignments (
  id uuid primary key default gen_random_uuid(),
  ads_user_id uuid not null references public.ads_accounts(user_id) on delete cascade,
  group_name text not null,
  created_at timestamptz not null default now(),
  unique (ads_user_id, group_name)
);
create table if not exists public.advisor_activity_classifications (
  advisor_code text primary key,
  advisor_name text not null,
  group_name text not null,
  ado_name text not null,
  classification text not null check (classification in ('new_advisor','conference','conference_no_registration','tvcn','other')),
  classification_month date not null,
  updated_by text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.advisor_activity_notes (
  id uuid primary key default gen_random_uuid(),
  advisor_code text not null,
  source_role text not null check (source_role in ('ad','note','tvcn','other')),
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_by text not null,
  created_at timestamptz not null default now()
);
alter table public.advisor_activity_notes drop constraint if exists advisor_activity_notes_source_role_check;
alter table public.advisor_activity_notes add constraint advisor_activity_notes_source_role_check
  check (source_role in ('ad','note','tvcn','other'));
create index if not exists advisor_activity_notes_advisor_created_idx on public.advisor_activity_notes(advisor_code, created_at desc);
create index if not exists ads_group_assignments_group_idx on public.ads_group_assignments(group_name);

alter table public.ads_accounts enable row level security;
alter table public.ads_group_assignments enable row level security;
alter table public.advisor_activity_classifications enable row level security;
alter table public.advisor_activity_notes enable row level security;

drop policy if exists "ads read own account" on public.ads_accounts;
create policy "ads read own account" on public.ads_accounts for select to authenticated using (user_id = auth.uid() and is_active);
drop policy if exists "ads read own groups" on public.ads_group_assignments;
create policy "ads read own groups" on public.ads_group_assignments for select to authenticated using (ads_user_id = auth.uid());
drop policy if exists "ads read scoped classifications" on public.advisor_activity_classifications;
create policy "ads read scoped classifications" on public.advisor_activity_classifications for select to authenticated using (
  exists (select 1 from public.ads_group_assignments g join public.ads_accounts a on a.user_id=g.ads_user_id
    where g.ads_user_id=auth.uid() and a.is_active and g.group_name=advisor_activity_classifications.group_name)
);
drop policy if exists "ads write scoped classifications" on public.advisor_activity_classifications;
create policy "ads write scoped classifications" on public.advisor_activity_classifications for all to authenticated
using (exists (select 1 from public.ads_group_assignments g where g.ads_user_id=auth.uid() and g.group_name=advisor_activity_classifications.group_name))
with check (exists (select 1 from public.ads_group_assignments g where g.ads_user_id=auth.uid() and g.group_name=advisor_activity_classifications.group_name));
drop policy if exists "ads read scoped notes" on public.advisor_activity_notes;
create policy "ads read scoped notes" on public.advisor_activity_notes for select to authenticated using (
  exists (select 1 from public.authorized_users u join public.ads_group_assignments g on g.group_name=u.group_name
    join public.ads_accounts a on a.user_id=g.ads_user_id where g.ads_user_id=auth.uid() and a.is_active
    and u.advisor_code=advisor_activity_notes.advisor_code and u.is_active)
);
drop policy if exists "ads insert scoped ad notes" on public.advisor_activity_notes;
create policy "ads insert scoped ad notes" on public.advisor_activity_notes for insert to authenticated with check (
  source_role in ('ad','note','tvcn','other') and exists (select 1 from public.authorized_users u join public.ads_group_assignments g on g.group_name=u.group_name
    join public.ads_accounts a on a.user_id=g.ads_user_id where g.ads_user_id=auth.uid() and a.is_active
    and u.advisor_code=advisor_activity_notes.advisor_code and u.is_active)
);
