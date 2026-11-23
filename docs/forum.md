# Diễn đàn

Mở **Tổng quan → Diễn đàn**. Mục này có ở trang tổng quan của mọi vai trò đã đăng nhập.

Quản lý tại **admin-data → Tạo thư → Diễn đàn**: tải banner PNG/JPG/WebP tối đa 20 MB, xem trước, khôi phục banner mặc định, bật/tắt và chọn tất cả người dùng hoặc chỉ admin. Bấm **Lưu thay đổi** để áp dụng. Cấu hình lưu tại `archive/data/forum-settings.json`, dùng bucket archive hiện có; không cần thêm SQL. Khi chưa có cấu hình, mặc định hiển thị cho mọi người với `BG DD2.png`. Banner cập nhật khi tải lại, focus cửa sổ hoặc mỗi 30 giây. API diễn đàn kiểm tra quyền cho cả đọc, đăng, sửa, xóa, phản ứng và tải tệp. “Chỉ admin” yêu cầu tài khoản user đang đăng nhập có mã `ADMIN`. Cookie của trang admin-data không cấp thêm quyền cho user thường hoặc trưởng nhóm trong cùng trình duyệt; sử dụng diễn đàn vẫn yêu cầu tài khoản user hợp lệ.

Kiểm tra cấu hình và quyền: `npx tsx scripts/test-forum-settings.ts` (Storage giả lập).

## Khởi tạo Supabase

Chạy toàn bộ `supabase/forum.sql` trong SQL Editor của đúng dự án Supabase. Script tạo bảng chủ đề, bình luận, trigger cập nhật số bình luận/thời gian hoạt động và bucket riêng tư `forum-files`. Script có thể chạy lại.

Kiểm tra sau khi chạy:

```powershell
npx tsx scripts/check-forum-storage.ts
```

Cả `tablesReady` và `privateBucketReady` phải là `true`. Mã nguồn không tự thay đổi cấu trúc cơ sở dữ liệu trên môi trường thật.

## Hành vi

- Tìm kiếm theo tiêu đề, không phân biệt chữ hoa/thường. Danh sách sắp theo hoạt động gần nhất; mỗi lần tải 30 chủ đề.
- Bài đăng có tiêu đề tối đa 200 ký tự, nội dung tối đa 20.000 ký tự. Bình luận tối đa 10.000 ký tự.
- Mỗi bài hoặc bình luận đính kèm tối đa 4 tệp; mỗi tệp phải lớn hơn 0 và **nhỏ hơn** 5 × 1024 × 1024 byte. Bình luận chỉ nhận ảnh JPEG, PNG, GIF, WEBP; bài đăng nhận thêm các loại file để tải xuống.
- Ảnh/tệp tải trực tiếp đến Supabase bằng URL tải lên có chữ ký, tránh chuyển phần nhị phân qua request Next.js. Biên nhận được ký bằng khóa máy chủ, gắn với tài khoản và hết hạn sau một giờ. Máy chủ kiểm lại dung lượng và chữ ký định dạng ảnh trước khi gắn tệp vào nội dung.
- Tệp ở bucket riêng tư. Tải/xem qua API yêu cầu phiên đăng nhập hợp lệ; không trả đường dẫn lưu trữ cho người đọc. File ngoài định dạng ảnh được phục vụ dạng tải xuống, với `nosniff` và CSP sandbox.
- Chế độ ẩn danh che tên, nhóm, avatar và mã tài khoản trong dữ liệu trả về cho người đọc. Cơ sở dữ liệu vẫn lưu mã tác giả để quản trị; đây là ẩn danh với thành viên, không phải xóa danh tính khỏi hệ thống.
- Bình luận nhận sticker, ảnh hoặc chữ. Trả lời phải trỏ đến bình luận thuộc cùng chủ đề. Trên màn hình hẹp, giới hạn thụt lề hai cấp.
- Thời gian hiển thị `HH:mm DD/MM/YYYY`, theo múi giờ `Asia/Ho_Chi_Minh`.
- Tác giả có nút ba chấm bên phải phần thông tin người đăng, gồm chỉnh sửa tiêu đề/nội dung và xóa bài. Bài ẩn danh vẫn cho tác giả quản lý. API kiểm tra tài khoản sở hữu ở cả PATCH và DELETE, không nhận mã tác giả từ trình duyệt. Xóa cần xác nhận và xóa cả bình luận qua khóa ngoại; chỉnh sửa giữ nguyên ảnh và thời gian hoạt động thảo luận. Không cần thêm migration cho chức năng này.
- Tệp đã tải lên nhưng người dùng hủy hoặc đóng trang chưa đăng sẽ còn trong bucket. Khi bảo trì kho, chỉ xóa tệp không được tham chiếu bởi `forum_topics.attachments` hay `forum_comments.attachments` và đã tạo hơn 24 giờ; không xóa dựa trên tuổi tệp đơn thuần.

## Kiểm tra

### Thích/không thích và phản hồi tại chỗ

Chạy thêm `supabase/forum-reactions.sql` trong Supabase SQL Editor (cả cài mới lẫn cơ sở dữ liệu đang dùng). Mỗi tài khoản có tối đa một lựa chọn cho mỗi bình luận; chọn lại để bỏ, chọn nút còn lại để chuyển. Tổng số được tính trong SQL và không trả danh tính người tương tác về trình duyệt. Bảng bật RLS, chỉ API máy chủ được đọc/ghi. Chưa chạy migration thì vẫn đọc được thảo luận, thao tác tương tác sẽ báo cần cập nhật SQL.

Nút Trả lời mở khung nhập ngay dưới bình luận được chọn, trước các phản hồi con, tự cuộn và đặt con trỏ vào khung nhập. Khung viết bình luận chung vẫn dùng để đăng bình luận mới.

Kiểm tra tương tác: `npx.cmd tsx scripts/test-forum-reactions.ts` (dữ liệu giả lập, không chạm Supabase thật).

Dữ liệu minh họa được tạo bằng `npx tsx scripts/seed-forum-demo.ts`: 3 bài có ảnh, mỗi bài có 5 phản hồi hiển thị tên và 3 phản hồi ẩn danh, không đính kèm ảnh trong phản hồi. Theo yêu cầu, người trả lời được gán từ 8 tài khoản thành viên có sẵn; đây vẫn là nội dung mẫu, không phải phát ngôn do thành viên tự đăng. Lưu ý này được ghi ngay đầu bài. Script dùng ID cố định để chạy lại không nhân đôi dữ liệu và chỉ chỉnh sửa các phản hồi mẫu có ID đã định trước. Không tạo tài khoản mới.

```powershell
npx tsc --noEmit --incremental false
npm run lint
npx tsx scripts/test-forum-api.ts
node scripts/test-forum-ui.mjs
```

Kiểm tra giao diện cần dev server tại `http://localhost:3000` (có thể đổi bằng `FORUM_TEST_URL`). Hai bộ test dùng dữ liệu giả lập, không ghi bài vào Supabase thật. Test API kiểm tra quyền, che danh tính, chống giả tác giả, nguồn request, giới hạn tệp, biên nhận tải lên, nội dung ảnh, quan hệ trả lời và tải file có xác thực. Test giao diện kiểm tra luồng đăng/trả lời, sticker, ẩn danh, tìm kiếm, lỗi và bố cục ở 375/768/1280px. Trigger SQL và lưu tệp thật cần kiểm tra thêm sau khi chạy migration.

Ảnh kiểm tra nằm ở `outputs/forum/`. Probe nhanh ở 375/1280px không phát hiện tràn ngang; màu placeholder đã được chỉnh theo màu chữ phụ. Mục P1 của probe về tiêu đề trắng được loại sau khi xem ảnh: công cụ tính nền trang sáng nhưng header thực tế có nền gradient xanh đậm `#004b7a`. Cảnh báo chữ 10px/thanh cuộn thuộc khung điều hướng cũ; lỗi dashboard 503 là phản hồi giả lập có chủ đích của test, không phải API diễn đàn.
