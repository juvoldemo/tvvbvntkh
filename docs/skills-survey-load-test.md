# Test tải khảo sát kỹ năng

Lệnh xem kế hoạch, không tạo tài khoản hoặc gửi bài:

```powershell
npm run test:survey-load -- --url https://www.bandothunhap.com --users 100
```

Chạy thật sau khi được phép tạo và dọn tài khoản test trên website đích:

```powershell
npm run test:survey-load -- --url https://www.bandothunhap.com --users 100 --execute
```

Script đọc cấu hình Supabase từ `.env.local`, không in mật khẩu hay khóa. Supabase phải là dự án mà website đích đang dùng. Script thử 1 tài khoản trước: đăng nhập thật, gửi bài, tải kết quả từ Storage và đối chiếu danh tính, 24 đáp án, tổng điểm và điểm kỹ năng. Nếu bước này thất bại, script dừng trước khi tạo 100 người dùng.

Sau bước thử, tạo 100 tài khoản có mã riêng theo lần chạy, đăng nhập rải trong 10 giây, đọc phiên đăng nhập và tải HTML trang chủ. Khi tất cả phiên đã sẵn sàng, gửi bài gần cùng lúc. Kết quả được đối chiếu trực tiếp trong Storage theo từng mã TVV. Báo cáo JSON lưu tại `outputs/load-tests/`, có số yêu cầu, trạng thái HTTP, thời gian p50/p95/tối đa và lỗi từng bước.

Phạm vi là tải HTTP của đăng nhập, phiên, trang chủ và API nộp bài 24 câu. Không mở 100 trình duyệt, không chạy các yêu cầu dashboard phát sinh từ JavaScript và không đo trải nghiệm làm từng câu trên giao diện. Thời gian đo là góc nhìn từ máy chạy test; kết quả không bảo đảm chịu tải ở mọi thời điểm.

Cuối lượt, script vô hiệu hóa tài khoản của chính lượt chạy, xóa đúng các file kết quả test và xóa các tài khoản đó. Không sử dụng API xóa toàn bộ khảo sát. Nếu dọn lỗi, báo cáo chứa danh sách mã cần dọn. Không đóng tiến trình giữa chừng; nếu tiến trình bị ngắt đột ngột cần kiểm tra dữ liệu test còn lại.
