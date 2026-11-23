-- Run after forum.sql and forum-reactions.sql. Safe to rerun.
begin;
create table if not exists public.forum_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_code text not null,
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  kind text not null check (kind in ('comment', 'like', 'dislike')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists forum_notifications_recipient on public.forum_notifications(recipient_code, created_at desc);
create index if not exists forum_comments_participant on public.forum_comments(topic_id, author_code);
alter table public.forum_notifications enable row level security;
revoke all on public.forum_notifications from anon, authenticated;
grant all on public.forum_notifications to service_role;

create or replace function public.forum_notify_activity() returns trigger
language plpgsql set search_path = public as $$
declare
  target_topic uuid;
  target_comment uuid;
  activity_kind text;
begin
  if tg_table_name = 'forum_comments' then
    target_topic := new.topic_id;
    target_comment := new.id;
    activity_kind := 'comment';
  else
    if tg_op = 'UPDATE' then
      if new.reaction = old.reaction then return new; end if;
    end if;
    select topic_id into target_topic from public.forum_comments where id = new.comment_id;
    target_comment := new.comment_id;
    activity_kind := new.reaction;
  end if;
  insert into public.forum_notifications(recipient_code, topic_id, comment_id, kind)
  select participants.author_code, target_topic, target_comment, activity_kind
  from (
    select author_code from public.forum_topics where id = target_topic
    union
    select author_code from public.forum_comments where topic_id = target_topic
  ) participants
  where participants.author_code <> new.author_code;
  return new;
end;
$$;
drop trigger if exists forum_notify_comment on public.forum_comments;
create trigger forum_notify_comment after insert on public.forum_comments
  for each row execute function public.forum_notify_activity();
drop trigger if exists forum_notify_reaction on public.forum_comment_reactions;
create trigger forum_notify_reaction after insert or update on public.forum_comment_reactions
  for each row execute function public.forum_notify_activity();
revoke all on function public.forum_notify_activity() from public, anon, authenticated;
grant execute on function public.forum_notify_activity() to service_role;
commit;
