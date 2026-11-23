-- Run once in the Supabase SQL editor before enabling the forum.
begin;
create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_code text not null,
  anonymous boolean not null default false,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  comment_count integer not null default 0
);
create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  parent_id uuid,
  author_code text not null,
  anonymous boolean not null default false,
  content text not null default '' check (char_length(content) <= 10000),
  sticker text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, topic_id),
  foreign key (parent_id, topic_id) references public.forum_comments(id, topic_id),
  check (char_length(btrim(content)) > 0 or sticker is not null or jsonb_array_length(attachments) > 0)
);
create index if not exists forum_topics_activity on public.forum_topics(last_activity_at desc, id desc);
create index if not exists forum_comments_topic on public.forum_comments(topic_id, created_at, id);
create or replace function public.forum_comment_activity() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.forum_topics set comment_count = comment_count + 1,
    last_activity_at = greatest(last_activity_at, new.created_at) where id = new.topic_id;
  return new;
end;
$$;
drop trigger if exists forum_comment_activity on public.forum_comments;
create trigger forum_comment_activity after insert on public.forum_comments
  for each row execute function public.forum_comment_activity();
alter table public.forum_topics enable row level security;
alter table public.forum_comments enable row level security;
-- Custom signed application cookies are validated by Next.js. No direct client access.
revoke all on public.forum_topics, public.forum_comments from anon, authenticated;
grant all on public.forum_topics, public.forum_comments to service_role;
insert into storage.buckets(id, name, public, file_size_limit)
values ('forum-files', 'forum-files', false, 5242879)
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit;
commit;
