-- Required by /api/events for audience targeting and generated-event deduplication.
alter table public.admin_events
  add column if not exists event_type text,
  add column if not exists event_key text;

create unique index if not exists uniq_admin_events_event_key
  on public.admin_events(event_key);

-- Make PostgREST see the new columns immediately after this migration is run.
notify pgrst, 'reload schema';
