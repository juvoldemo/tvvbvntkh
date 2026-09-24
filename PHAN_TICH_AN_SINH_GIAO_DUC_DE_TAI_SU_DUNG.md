# Phân tích sản phẩm An Sinh Giáo Dục (AUVL09) để tái sử dụng

> Mục đích: tài liệu bàn giao nghiệp vụ và cách trình bày của minh hoạ hiện tại, để đội dự án khác có thể làm sản phẩm tương tự. Đây là mô hình minh hoạ nội bộ; không thay thế bảng minh hoạ/hợp đồng do doanh nghiệp bảo hiểm phát hành.

## 1. Mô hình sản phẩm đang thể hiện

**An Sinh Giáo Dục** là bảo hiểm liên kết đơn vị hướng đến trẻ em: phụ huynh đóng phí theo năm, hợp đồng đáo hạn khi con đạt một độ tuổi học vấn đã chọn. Giá trị hợp đồng được minh hoạ ở hai giả định lãi suất, đồng thời có quyền lợi bảo vệ và các khoản thưởng theo mốc.

### Đối tượng và thời hạn

| Nội dung | Quy tắc hiện tại |
|---|---|
| Người được bảo hiểm | Con, tuổi 0–15 tại ngày lập kế hoạch |
| Tuổi đáo hạn lựa chọn | 18, 22 hoặc 25 |
| Thời hạn hợp đồng | `tuổi đáo hạn − tuổi hiện tại`; chỉ hợp lệ từ 10–20 năm |
| Bên mua bảo hiểm | Từ đủ 18 tuổi; ngày sinh được dùng cho quyền lợi tai nạn của bên mua |
| Phí cơ bản | Phí quy năm, nộp đầu mỗi năm |
| STBH gốc | Từ 10 đến 20 lần phí cơ bản năm |
| Đóng phí | Bộ máy tính hỗ trợ 4 năm đến hết thời hạn; giao diện hiện hành mặc định đóng đủ toàn bộ thời hạn |

### Quyền lợi chính

1. **STBH gia tăng theo năm**

   `STBH gia tăng = STBH gốc × [1 + (năm hợp đồng − 1) × 5%]`

   Với trẻ dưới 4 tuổi, phần STBH dùng cho rủi ro được điều chỉnh theo hệ số `(tuổi + 1) × 20%`; từ 4 tuổi áp dụng 100%.

2. **Quyền lợi tử vong**

   Trong bảng hiện hành, cột bảo vệ là quyền lợi tử vong tại kịch bản 4,76%, không chỉ là STBH gia tăng:

   `max(STBH gia tăng đã điều chỉnh, 200% phí cơ bản lũy kế, tài khoản cơ bản) + tài khoản đóng thêm − nợ`.

3. **Tử vong do tai nạn của bên mua bảo hiểm**

   `min(50% × STBH gia tăng, 200.000.000 đồng)`.

   Đây là quyền lợi một lần, phụ thuộc việc được chấp nhận bảo hiểm và chỉ còn hiệu lực trước kỷ niệm hợp đồng mà bên mua đạt 70 tuổi. Khi đưa sang dự án khác, cần để đây là công thức/mốc điều kiện thay vì hiển thị một số tiền cố định.

4. **Thưởng học vấn**

   Mỗi mốc đủ điều kiện có giá trị bằng `10% phí cơ bản năm`. Mốc tuổi theo tuổi đáo hạn: 18 tuổi: 18/22/25; 22 tuổi: 18/22/25; 25 tuổi: 22/25. Bộ tính chỉ đưa vào các mốc cách ngày hiệu lực ít nhất 4 năm và chỉ trả khi số năm đã chọn đóng phí đủ điều kiện của mốc.

5. **Quyền lợi đáo hạn**

   Năm cuối bảng không dùng giá trị hoàn lại thông thường mà hiển thị trực tiếp quyền lợi đáo hạn đã bao gồm thưởng. Khi đóng đủ phí, cơ chế bảo vệ mức tối thiểu được mô hình hoá gần đúng là:

   `max(tài khoản cơ bản sau thưởng/đảm bảo, tổng phí cơ bản − thưởng học vấn) + tài khoản đóng thêm − nợ`.

## 2. Logic mô phỏng tài chính

Mô hình chạy song song 3 kịch bản: 4,25%, 4,76% và lãi tối thiểu/cam kết. Hai kịch bản đầu được hiển thị cho người dùng; kịch bản lãi tối thiểu dùng để kiểm tra mức đảm bảo.

### Luồng mỗi năm

1. Thu phí đầu năm (nếu còn trong thời gian đóng phí).
2. Khấu trừ phí ban đầu theo năm hợp đồng: năm 1: 50%; năm 2: 30%; năm 3–5: 20%; các năm sau theo thời hạn, sau đó về 0%.
3. Cộng thưởng học vấn ở đầu năm kế tiếp sau kỷ niệm xét thưởng vào tài khoản đóng thêm.
4. Mỗi tháng: thu phí quản lý hợp đồng, thu phí rủi ro, xử lý nợ, sau đó tính lãi tháng.
5. Cuối năm: lập giá trị tài khoản, giá trị hoàn lại, quyền lợi tử vong; riêng năm cuối lập quyền lợi đáo hạn.

### Phí và lãi

- Phí quản lý hợp đồng: 30.000 đồng/tháng năm 2026, tăng 1.000 đồng theo năm dương lịch, tối đa 70.000 đồng/tháng.
- Phí rủi ro: lấy phần chênh giữa mức bảo vệ yêu cầu và tài khoản cơ bản, nhân tỷ lệ rủi ro theo tuổi/giới tính, thu theo tháng. Bảng tỷ lệ hiện áp dụng tuổi 0–25.
- Lãi tháng: `(1 + lãi năm)^(1/12) − 1`.
- Lãi tối thiểu theo năm trong mô hình: 2,5%; 2,0%; 1,5%; 1,0% (năm 4–10); 0,5% (từ năm 11).

### Các tình huống cần bảo toàn khi chuyển đổi

- Thiếu tiền trong 4 năm đầu được ghi thành nợ; từ năm 5, nếu tài khoản không đủ chi phí thì dừng mô phỏng. Các giá trị không còn khả dụng hiển thị `—`, không hiển thị 0 để tránh gây hiểu nhầm.
- Không cộng thưởng đáo hạn vào các năm trước; chỉ cộng trong quyền lợi năm cuối.
- So sánh kịch bản thực với kịch bản tối thiểu ở từng điểm kết thúc năm để bảo vệ mức đảm bảo.
- Phạm vi hiện chưa mô phỏng đóng thêm chủ động, rút tiền, phí phụ trội, thay đổi bên mua hoặc biến động lãi thực tế.

## 3. Cách trình bày trên minh hoạ hiện tại

### Luồng trải nghiệm

1. Người dùng chọn **An Sinh Giáo Dục** trong bộ chọn sản phẩm.
2. Form chuyển ngữ cảnh: “Họ và tên con”, ngày sinh con, giới tính, phí cơ bản năm, STBH gốc và nút chọn đáo hạn 18/22/25 tuổi.
3. Các nút tuổi đáo hạn không hợp lệ bị khoá; dưới nút luôn giải thích thời hạn hợp đồng, số năm đóng phí và tuổi đáo hạn.
4. Sau khi hợp lệ, kết quả mở ở phần **“Giá trị hoàn lại minh hoạ”**, đơn vị **nghìn đồng**.
5. Có hai chế độ xem: **Mốc nổi bật** (rút gọn) và **Toàn bộ** (từng năm).

### Bảng kết quả

| Cột | Ý nghĩa hiển thị |
|---|---|
| Năm / Tuổi | Gộp “Năm n” và tuổi của con để người xem gắn kết tiền với hành trình học tập |
| Phí BH lũy kế | Tổng phí cơ bản đã nộp đến cuối năm |
| Quyền lợi tử vong (4,76%) | Giá trị bảo vệ hiện tại theo kịch bản cao; riêng ASGD mới có cột này |
| Giá trị hoàn lại 4,25% | Kịch bản lãi thấp |
| Giá trị hoàn lại 4,76% | Kịch bản lãi cao |

Hai cột giá trị hoàn lại đặt chung dưới một tiêu đề nhóm để người dùng đọc như một so sánh, không như hai sản phẩm khác nhau. Năm đáo hạn dùng chính kết quả đáo hạn (đã gồm thưởng), do đó cần gắn nhãn/tooltip rõ nếu tái thiết kế.

### Hệ thống thị giác

- Nền xanh đậm/xanh ngọc tạo cảm giác tin cậy; vàng đồng dùng cho điểm nhấn giáo dục, mốc thời gian và số tiền quan trọng.
- Số liệu tài chính căn phải; “giá trị hoàn lại” dùng màu cam/vàng để nổi bật; cột bảo vệ dùng xanh đậm.
- Hàng đáo hạn có nền xanh rất nhạt, đường viền trên rõ hơn và màu tiền nổi bật.
- Bảng cố định bố cục cột, hỗ trợ cuộn ngang trên di động.
- Nút lựa chọn đáo hạn là chip bo góc: trạng thái chọn nền xanh đậm/chữ trắng, trạng thái bị khoá giảm độ mờ.
- Hỗ trợ bàn phím bằng viền focus vàng; ở màn hình nhỏ, các thẻ và chip chuyển một cột/toàn chiều ngang.

### Nguyên tắc nội dung

- Ưu tiên một con số hành động được: phí lũy kế, bảo vệ và giá trị nhận lại.
- Luôn hiển thị hai lãi suất cạnh nhau; không hứa hẹn đây là lợi suất chắc chắn.
- Giữ tuyên bố cuối bảng: kết quả chỉ là mô phỏng nội bộ, giá trị chính thức theo bảng minh hoạ do doanh nghiệp phát hành.
- Không dùng tiền tệ quá dài trong bảng: quy đổi sang nghìn đồng nhất quán và ghi đơn vị ngay cạnh tiêu đề.

## 4. Blueprint để làm dự án tương tự

### Tách lớp nghiệp vụ

Nên tách thành bốn lớp độc lập:

| Lớp | Trách nhiệm |
|---|---|
| `productRules` | Điều kiện tuổi, kỳ hạn, hệ số STBH, quyền lợi, mốc thưởng, biểu phí |
| `projectionEngine` | Mô phỏng tháng/năm, tài khoản, nợ, lãi, giá trị hoàn lại/đáo hạn |
| `scenarioService` | Chạy các lãi suất, áp dụng mức đảm bảo, trả về các dòng đã chuẩn hoá |
| `presentation` | Form theo ngữ cảnh, bảng mốc/toàn bộ, định dạng tiền, trạng thái không khả dụng |

Đầu ra chuẩn nên là một mảng theo năm: `policyYear`, `age`, `premium`, `cumulativePremium`, `protectionBenefit`, `cashValueLow`, `cashValueHigh`, `maturityBenefit?`, `status`. UI không tự tính lại số tiền.

### Checklist triển khai

- [ ] Chốt nguồn chuẩn cho điều khoản, biểu phí, lãi suất và điều kiện quyền lợi.
- [ ] Định nghĩa rõ “tuổi tính bảo hiểm”, ngày hiệu lực, kỳ thu phí và thời điểm trả thưởng.
- [ ] Đưa mọi tỷ lệ vào dữ liệu cấu hình có phiên bản/ngày hiệu lực, không nhúng rải rác trong giao diện.
- [ ] Tách giá trị hoàn lại giữa năm với quyền lợi đáo hạn cuối kỳ.
- [ ] Thiết kế trạng thái `unavailable/depleted` thay vì thay bằng 0.
- [ ] Kiểm thử biên tuổi, kỳ hạn, hệ số STBH, đủ/thiếu phí, đáo hạn và từng giới tính.
- [ ] Đối soát tối thiểu một bộ PDF mẫu cho từng tình huống đóng phí; đặt ngưỡng sai số và nêu rõ cách làm tròn.
- [ ] Ghi rõ giả định và disclaimer trong UI/PDF xuất ra.

## 5. Lưu ý khi sao chép

1. **Đừng sao chép số tiền mẫu thành quy tắc.** Tỷ lệ, phí rủi ro và mốc thưởng phải lấy từ sản phẩm đích.
2. **Đừng gọi giá trị 4,25%/4,76% là cam kết.** Đây là kịch bản minh hoạ; chỉ mức được điều khoản xác định mới là cam kết.
3. **Phân biệt STBH và quyền lợi chi trả.** Cột hiện tại là quyền lợi tử vong, còn STBH gia tăng chỉ là một thành phần của phép tính.
4. **Mô hình hiện gần khớp, chưa khớp tuyệt đối PDF.** Với hồ sơ mẫu 13 năm, chênh khoảng 0,29–0,40 triệu đồng ở giá trị đáo hạn; nguyên nhân còn mở là quy ước tính phí rủi ro, tuổi theo ngày, lãi theo ngày và số dư bình quân chính thức.
5. **Giao diện hiện mặc định đóng đủ phí toàn kỳ.** Nếu sản phẩm đích có nhiều lịch đóng phí, phải cho người dùng chọn và phản ánh lựa chọn ấy đồng thời trong phí lũy kế lẫn mô phỏng.

## 6. Nguồn trong dự án hiện tại

- Điều khoản: `An sinh giáo dục/Quy tắc điều khoản.pdf`
- Hệ số bảo hiểm: `An sinh giáo dục/Hệ-Số-Bảo-Hiểm-AUVL09.pdf`
- Bảng tỷ lệ rủi ro: `An sinh giáo dục/Tỷ lệ phí rủi ro.PNG`
- Hồ sơ đối soát: `An sinh giáo dục/B26007301126_260911.pdf`
- Bộ tính: `server/anSinhGiaoDuc.js`
- Giao diện/luồng hiển thị: `index.html`, `script.js`, `anSinhGiaoDuc.css`
- Ghi chú giả định và kết quả đối soát chi tiết: `AN_SINH_GIAO_DUC.md`
