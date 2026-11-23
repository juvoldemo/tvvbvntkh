-- Safe to rerun on an existing forum database.
begin;
create table if not exists public.forum_comment_reactions (
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  author_code text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  primary key (comment_id, author_code)
);
alter table public.forum_comment_reactions enable row level security;
revoke all on public.forum_comment_reactions from anon, authenticated;
grant all on public.forum_comment_reactions to service_role;
create or replace function public.forum_reaction_counts(comment_ids uuid[], viewer_code text)
returns table(comment_id uuid, likes bigint, dislikes bigint, my_reaction text)
language sql stable set search_path = public as $$
  select r.comment_id,
    count(*) filter (where r.reaction = 'like'),
    count(*) filter (where r.reaction = 'dislike'),
    max(r.reaction) filter (where r.author_code = viewer_code)
  from public.forum_comment_reactions r
  where r.comment_id = any(comment_ids)
  group by r.comment_id;
$$;
revoke all on function public.forum_reaction_counts(uuid[], text) from public, anon, authenticated;
grant execute on function public.forum_reaction_counts(uuid[], text) to service_role;
-- Rank all root comments before pagination; keep replies attached to their root.
create or replace function public.forum_popular_comments(target_topic uuid, page_offset integer default 0)
returns setof public.forum_comments
language sql stable set search_path = public as $$
  select c.*
  from public.forum_comments c
  left join (
    select r.comment_id, count(*) as likes
    from public.forum_comment_reactions r
    join public.forum_comments target on target.id = r.comment_id
    where target.topic_id = target_topic and target.parent_id is null and r.reaction = 'like'
    group by r.comment_id
  ) reactions on reactions.comment_id = c.id
  where c.topic_id = target_topic and c.parent_id is null
  order by coalesce(reactions.likes, 0) desc, c.created_at desc, c.id desc
  limit 10 offset greatest(page_offset, 0);
$$;
revoke all on function public.forum_popular_comments(uuid, integer) from public, anon, authenticated;
grant execute on function public.forum_popular_comments(uuid, integer) to service_role;
commit;
