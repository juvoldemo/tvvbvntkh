-- Mỗi TVV có một bình chọn hiện tại; lần bình chọn sau sẽ cập nhật lựa chọn trước đó.
create table if not exists class_votes (
  id uuid primary key default gen_random_uuid(),
  advisor_code text not null unique,
  advisor_name text,
  group_name text,
  vote_choice text not null check (vote_choice in ('A', 'T', 'M')),
  change_count integer not null default 0 check (change_count between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bổ sung cột khi bảng đã được tạo trước khi có giới hạn đổi lựa chọn.
alter table class_votes add column if not exists change_count integer not null default 0;
alter table class_votes drop constraint if exists class_votes_change_count_check;
alter table class_votes add constraint class_votes_change_count_check check (change_count between 0 and 1);

create table if not exists class_vote_settings (
  id boolean primary key default true check (id),
  is_locked boolean not null default false,
  is_started boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table class_vote_settings add column if not exists is_started boolean not null default false;
insert into class_vote_settings (id, is_locked) values (true, false) on conflict (id) do nothing;

create index if not exists idx_class_votes_group_name on class_votes(group_name);
create index if not exists idx_class_votes_choice on class_votes(vote_choice);

notify pgrst, 'reload schema';
