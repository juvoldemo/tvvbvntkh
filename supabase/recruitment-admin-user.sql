-- Tài khoản chuyên dụng cho màn hình tính thu nhập tuyển dụng.
insert into authorized_users (
  advisor_code,
  full_name,
  start_date,
  advisor_status,
  advisor_position,
  password_hash,
  password_plain,
  is_active,
  updated_at
) values (
  'ADMINTN',
  'Quản trị tuyển dụng',
  current_date,
  'Đang hoạt động',
  'Quản trị tuyển dụng',
  'plain:MDAwMA',
  '0000',
  true,
  now()
)
on conflict (advisor_code) do update set
  full_name = excluded.full_name,
  advisor_status = excluded.advisor_status,
  advisor_position = excluded.advisor_position,
  password_hash = excluded.password_hash,
  password_plain = excluded.password_plain,
  is_active = true,
  updated_at = now();
