-- Admin pin operations use the server-only service role after authorization.
alter table public.forum_topics add column if not exists pinned_at timestamptz;
create index if not exists forum_topics_pinned_activity_idx
  on public.forum_topics (pinned_at desc nulls last, last_activity_at desc, id desc);
notify pgrst, 'reload schema';
