create table if not exists customer_conferences (
  id uuid primary key default gen_random_uuid(),
  ado_code text not null,
  conference_name text not null,
  date_from date not null,
  date_to date not null,
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists customer_conference_registrations (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references customer_conferences(id) on delete cascade,
  advisor_code text not null,
  advisor_name text not null,
  group_name text not null,
  customer_name text not null,
  registration_fee numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_conferences_ado on customer_conferences(ado_code, created_at desc);
create index if not exists idx_customer_conference_registrations_conference on customer_conference_registrations(conference_id);
create index if not exists idx_customer_conference_registrations_advisor on customer_conference_registrations(advisor_code);

alter table customer_conference_registrations add column if not exists note text;
alter table customer_conference_registrations add column if not exists note_updated_by text;
alter table customer_conference_registrations add column if not exists note_updated_at timestamptz;
