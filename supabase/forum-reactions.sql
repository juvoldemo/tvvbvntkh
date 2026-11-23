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
commit;
