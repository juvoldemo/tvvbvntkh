alter table authorized_users
  add column if not exists password_plain text;
