-- Chạy thủ công trong Supabase SQL Editor sau khi kiểm tra trên môi trường staging.
-- Admin hiện dùng cookie riêng và service-role ở server, không dùng Supabase Auth.
create table if not exists public.admin_invitation_history (
  id uuid primary key default gen_random_uuid(),
  salutation text not null check (salutation in ('Ông', 'Bà', 'Anh', 'Chị', 'Em', 'Quý khách')),
  guest_name text not null check (char_length(guest_name) between 2 and 60),
  display_name text not null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  downloaded_at timestamptz null,
  shared_at timestamptz null,
  constraint admin_invitation_history_has_action check (downloaded_at is not null or shared_at is not null)
);
create index if not exists admin_invitation_history_created_at_idx on public.admin_invitation_history (created_at desc);
alter table public.admin_invitation_history enable row level security;
-- Không mở policy client: chỉ API đã kiểm tra cookie admin và dùng service-role được truy cập.
-- Nếu chuyển sang Supabase Auth, thêm FK created_by -> auth.users(id) và policy theo vai trò admin.
