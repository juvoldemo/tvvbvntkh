# Dashboard doanh thu Bao Viet Nhan tho Khanh Hoa

Next.js + Supabase dashboard for daily revenue tracking from cumulative monthly CSV uploads.

## Setup dashboard

1. Create a Supabase project and run `supabase/schema.sql` in the Supabase SQL editor.
2. Configure the Supabase environment variables for the Vercel project.
3. Run `npm install` and `npm run dev` only when developing the dashboard locally.

## Tự động lấy BC02 trên GitHub Actions

Luồng BC02 chạy trên GitHub Actions, không cần tạo `.env.local` hoặc chạy Playwright trên máy cá nhân. Workflow tự chạy lúc 01:00 mỗi ngày (giờ Việt Nam), hoặc có thể chạy thủ công.

### Tạo GitHub Secrets

Vào repository trên GitHub, chọn **Settings > Secrets and variables > Actions > New repository secret**, rồi tạo các secret sau:

- `DATA_SOURCE_URL`
- `DATA_SOURCE_USERNAME`
- `DATA_SOURCE_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Ba secret đầu là thông tin đăng nhập nguồn BC02. Hai secret Supabase giúp script nạp batch mới vào đúng nơi dashboard đang đọc dữ liệu. Không đưa giá trị secret vào code hoặc file Git.

Nếu repository dùng hạn chế quyền của `GITHUB_TOKEN`, hãy bật **Settings > Actions > General > Workflow permissions > Read and write permissions** để workflow có thể đẩy file dữ liệu mới lên `main`.

### Chạy thủ công

1. Mở **GitHub > Actions > Fetch BC02**.
2. Chọn **Run workflow** rồi xác nhận chạy trên branch `main`.
3. Theo dõi log ở job `fetch`.

Workflow mở website nguồn ở chế độ headless, vào **NEW BC02**, xuất file, lưu bản gốc tại `data/raw/` và CSV chuẩn hoá tại `data/processed/`. Nếu hai thư mục có thay đổi, workflow commit và push với thông điệp `auto: update BC02 data`; Vercel sẽ tự triển khai lại từ commit đó.

Script [scripts/fetch-bc02.ts](scripts/fetch-bc02.ts) không dùng toạ độ màn hình; nó ưu tiên label, role và text. Nếu giao diện nguồn thay đổi, tạo các secret tùy chọn `BC02_USERNAME_SELECTOR`, `BC02_PASSWORD_SELECTOR`, `BC02_LOGIN_BUTTON_SELECTOR`, `BC02_EXPORT_BUTTON_SELECTOR`, hoặc `BC02_CONFIRM_EXPORT_SELECTOR`. Workflow đã truyền sẵn các secret này vào script.

Upload CSV thủ công trong dashboard vẫn được giữ nguyên làm phương án dự phòng.
