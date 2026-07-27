# Cổng tuyển dụng TVV

Trang truy cập: `/tuyendung`.

## Khởi tạo Supabase

Trong Supabase SQL Editor, chỉ chạy nội dung file:

```text
supabase/recruitment-pool.sql
```

Không dán file `scripts/import-recruitment-candidates.ts` vào SQL Editor. Đây là
mã Node.js dùng để đọc Excel và phải chạy bằng Terminal/PowerShell trong thư mục
dự án.

## Quy tắc

- Chỉ tài khoản Trưởng nhóm đang hoạt động mới được truy cập.
- Dùng chung Mã TVV và mật khẩu với trang đăng nhập chính.
- Mỗi Trưởng nhóm được giữ tối đa 15 TVV.
- Danh sách hiển thị 20 TVV mỗi trang và đánh số thứ tự liên tục giữa các trang.
- Trưởng nhóm phải bấm xác nhận danh sách trước khi được xem thông tin chi tiết.
- Mỗi lần thêm hoặc bỏ TVV, xác nhận cũ tự hết hiệu lực và phải xác nhận lại.
- Lần chọn ban đầu không tính là lượt sửa.
- Mỗi lần bỏ một TVV đã chọn tính là một lượt sửa; tối đa 3 lượt.
- Một TVV chỉ có thể thuộc về một Trưởng nhóm. API dùng cập nhật có kiểm tra phiên bản để xử lý các lượt chọn đồng thời.
- Giao diện không trả về mã hoặc tên Trưởng nhóm đã giữ TVV.
- Thay đổi được gửi bằng Supabase Realtime Broadcast; giao diện cũng tải lại mỗi 2,5 giây làm phương án dự phòng.

## Cập nhật danh sách Excel

Chạy:

```powershell
npm run import:recruitment -- "C:\duong-dan\Danh sach.xlsx"
```

Dữ liệu chuẩn hóa được lưu tại `data/recruitment-candidates.json`. File Excel cần có hàng tiêu đề tại hàng 4 và các cột: Mã TVV, Tên TVV, Ngày bắt đầu làm việc, Số tháng không hoạt động, Ký quỹ, SĐT, Số GTTT, Ban, Nhóm, TVV tuyển dụng, Tên của TVV tuyển dụng, Địa chỉ.
