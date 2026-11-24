-- Additive, safe to rerun. Existing topics and comments stay visible/unlocked.
begin;
alter table public.forum_topics add column if not exists locked_at timestamptz;
alter table public.forum_comments add column if not exists hidden_at timestamptz;

-- Serialize comment writes with topic locking, including requests already in flight.
create or replace function public.forum_check_comment_write() returns trigger
language plpgsql set search_path = public as $$
declare topic_locked timestamptz; parent_hidden timestamptz;
begin
  select locked_at into topic_locked from public.forum_topics where id = new.topic_id for update;
  if topic_locked is not null then
    raise exception using errcode = 'P0001', message = 'FORUM_TOPIC_LOCKED';
  end if;
  if tg_op = 'UPDATE' and old.hidden_at is not null then
    raise exception using errcode = 'P0001', message = 'FORUM_COMMENT_HIDDEN';
  end if;
  if new.parent_id is not null then
    select hidden_at into parent_hidden from public.forum_comments where id = new.parent_id and topic_id = new.topic_id for update;
    if parent_hidden is not null then
      raise exception using errcode = 'P0001', message = 'FORUM_COMMENT_HIDDEN';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists forum_check_comment_insert on public.forum_comments;
create trigger forum_check_comment_insert before insert on public.forum_comments
  for each row execute function public.forum_check_comment_write();
drop trigger if exists forum_check_comment_edit on public.forum_comments;
create trigger forum_check_comment_edit before update of content, sticker, attachments on public.forum_comments
  for each row execute function public.forum_check_comment_write();
commit;
notify pgrst, 'reload schema';
