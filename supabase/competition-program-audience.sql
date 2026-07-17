-- Chạy một lần trong Supabase SQL Editor trước khi dùng công tắc đối tượng hiển thị.
alter table public.competition_programs
  add column if not exists display_audience text not null default 'all';

update public.competition_programs
set display_audience = 'all'
where display_audience is null
   or display_audience not in ('all', 'team_leader');

alter table public.competition_programs
  drop constraint if exists competition_programs_display_audience_check;

alter table public.competition_programs
  add constraint competition_programs_display_audience_check
  check (display_audience in ('all', 'team_leader'));

create index if not exists idx_competition_programs_display_audience
  on public.competition_programs(display_audience);

-- Làm mới schema cache để API nhận cột mới ngay sau khi chạy migration.
notify pgrst, 'reload schema';
