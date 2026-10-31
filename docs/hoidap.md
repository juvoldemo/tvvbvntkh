# Hỏi đáp tình huống chị Lan

## Chương trình 2

Chạy thêm `supabase/sales-discussion-program-2.sql` trong Supabase SQL Editor. File này tạo cấu hình chương trình đang mở và bảng lưu giải pháp riêng, giữ nguyên câu trả lời Chương trình 1.

Trong Padlet, bấm **Chương trình 2** để kích hoạt cho cả 6 nhóm. Trang `/hoidap` của mỗi nhóm tự nhận thay đổi trong khoảng 5 giây và hiện một ô trả lời: **Những giải pháp cải thiện kỹ năng [tên nhóm]**. Bản nháp và bài đã gửi tách riêng theo chương trình. Bấm **Chương trình 1** để trở lại bộ ba câu hỏi ban đầu.

Padlet tải bài theo chương trình đang hoạt động khi mở hoặc bấm **Làm mới**. **Reset** chỉ xóa các bài đã gửi của chương trình đang hoạt động, có xác nhận; không xóa bài chương trình còn lại hay bản nháp trên thiết bị người tham gia.

Trang `/hoidap` hiển thị 3 câu hỏi và 6 nhóm, có nút sao chép link theo tên miền đang mở. Có lối vào từ trang tổng quan của dashboard.

Trước khi sử dụng trên website, chạy `supabase/sales-discussion-answers.sql` một lần trong SQL Editor của dự án Supabase hiện tại, rồi triển khai code theo quy trình của website. API dùng cấu hình Supabase phía máy chủ đã có của dashboard.

| Nhóm | Đường dẫn |
| --- | --- |
| Khách hàng tiềm năng | `/hoidap/khach-hang-tiem-nang` |
| Thiết lập cuộc hẹn | `/hoidap/thiet-lap-cuoc-hen` |
| Tiếp cận & tư vấn | `/hoidap/tiep-can-tu-van` |
| Hóa giải sự trì hoãn | `/hoidap/hoa-giai-su-tri-hoan` |
| Chốt hợp đồng | `/hoidap/chot-hop-dong` |
| Bàn giao & phục vụ | `/hoidap/ban-giao-phuc-vu` |

Mỗi nhóm có một bài trả lời gồm đủ 3 câu. Gửi lại cập nhật bài dùng chung; lần gửi sau cùng được giữ. Các nhóm cần thống nhất người nhập bài. Link công khai, không có xác thực: người có link có thể đọc và cập nhật bài của nhóm. Không dùng biểu mẫu này cho thông tin khách hàng nhạy cảm.

Bản nháp lưu riêng theo nhóm trên trình duyệt khi nhập. Bài đã gửi được lưu trên Supabase và tải lại khi mở link trên thiết bị khác. Nếu thiết bị hiện tại có bản nháp, biểu mẫu ưu tiên khôi phục bản nháp đó. Khi chưa cấu hình bảng hoặc mất kết nối, giao diện báo chưa gửi thành công và cho phép thử lại.
