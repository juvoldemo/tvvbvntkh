create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  page text,
  ip text,
  city text,
  country text,
  device text,
  browser text,
  user_agent text,
  referrer text
);

alter table public.page_views enable row level security;

revoke all on table public.page_views from anon, authenticated;
grant insert on table public.page_views to anon, authenticated;

drop policy if exists "Allow anonymous page view inserts" on public.page_views;
create policy "Allow anonymous page view inserts"
on public.page_views
for insert
to anon, authenticated
with check (true);

-- Không tạo policy SELECT cho anon/authenticated để dữ liệu truy cập
-- không thể bị đọc công khai từ website.

select *
from public.page_views
order by created_at desc
limit 100;

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  event_name text not null,
  event_data jsonb default '{}'::jsonb,
  page text,
  device text,
  browser text,
  user_agent text,
  referrer text
);

alter table public.app_events enable row level security;

revoke all on table public.app_events from anon, authenticated;
grant insert on public.app_events to anon, authenticated;

drop policy if exists "Allow anonymous app event inserts" on public.app_events;
create policy "Allow anonymous app event inserts"
on public.app_events
for insert
to anon, authenticated
with check (true);

-- Tong so lan bam nut Xuat tom tat
select count(*) as summary_export_clicks
from public.app_events
where event_name = 'summary_export_click';

-- So lan bam theo ngay
select
  date_trunc('day', created_at) as day,
  count(*) as summary_export_clicks
from public.app_events
where event_name = 'summary_export_click'
group by day
order by day desc;

-- So lan bam theo vi tri nut: main hoac riders
select
  event_data->>'source' as source,
  count(*) as summary_export_clicks
from public.app_events
where event_name = 'summary_export_click'
group by source
order by summary_export_clicks desc;
