create table if not exists ado_group_target_registrations (
  id uuid primary key default gen_random_uuid(),
  target_month date not null,
  ado_code text not null,
  ado_name text not null,
  group_name text not null,
  revenue_target numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(target_month, ado_code, group_name)
);

create index if not exists idx_ado_group_targets_month
  on ado_group_target_registrations(target_month desc);
create index if not exists idx_ado_group_targets_code
  on ado_group_target_registrations(ado_code, target_month desc);

insert into authorized_users (
  advisor_code, full_name, group_name, advisor_position,
  password_hash, password_plain, is_active, updated_at
)
values
  ('NGUYENTHIMAITRANG', 'Nguyễn Thị Mai Trang', 'PTKD 1', 'ADO', 'plain:MDAwMA', '0000', true, now()),
  ('NGUYENTHITRAM', 'Nguyễn Thị Trầm', 'PTKD 1', 'ADO', 'plain:MDAwMA', '0000', true, now()),
  ('NGUYENTHANHNHAN', 'Nguyễn Thành Nhân', 'PTKD 2', 'ADO', 'plain:MDAwMA', '0000', true, now()),
  ('DINHQUOCTIEN', 'Đinh Quốc Tiến', 'PTKD 1', 'ADO', 'plain:MDAwMA', '0000', true, now()),
  ('TRANXUANTHU', 'Trần Xuân Thu', 'PTKD 2', 'ADO', 'plain:MDAwMA', '0000', true, now()),
  ('NGUYENTHOC', 'Nguyễn Thóc', 'PTKD 2', 'ADO', 'plain:MDAwMA', '0000', true, now())
on conflict (advisor_code) do update set
  full_name = excluded.full_name,
  group_name = excluded.group_name,
  advisor_position = excluded.advisor_position,
  password_hash = excluded.password_hash,
  password_plain = excluded.password_plain,
  is_active = true,
  updated_at = now();
