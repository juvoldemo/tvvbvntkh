# BỘ NHỚ QUYỀN LỢI SPBK CHO CODEX

> Mục đích: file này dùng làm bộ nhớ nghiệp vụ để Codex tạo bảng tóm tắt quyền lợi SPBK khi xuất JPG/PDF.
> 
> Nguyên tắc: Codex phải lấy STBH/hạn mức thực tế từ dữ liệu minh họa của hợp đồng, sau đó áp dụng công thức chi trả dưới đây.
> 
> Ký hiệu:
> - STBH = Số tiền bảo hiểm của chính SPBK đó.
> - PBH năm = Phí bảo hiểm định kỳ năm hoặc Phí bảo hiểm cơ bản định kỳ năm của sản phẩm chính.
> - Chi phí y tế thực tế = chi phí hợp lệ theo hóa đơn/chứng từ, sau khi loại phần đã được bảo hiểm khác chi trả nếu có.
> - Khoản nợ = khoản nợ/phí đến hạn chưa đóng nếu có.
> - "Tối đa" là giới hạn chi trả trước khi trừ khoản nợ nếu có.
> - Khi xuất tóm tắt cho khách hàng: chỉ hiển thị các quyền lợi có tham gia/chọn mua trong hợp đồng.

---

# 1. R21 — BẢO HIỂM BỆNH NAN Y

## 1.1. Cách hiểu sản phẩm

R21 bảo vệ các rủi ro bệnh nan y gồm:

1. Ung thư giai đoạn đầu.
2. Ung thư giai đoạn cuối.
3. Đột quỵ.
4. Nhồi máu cơ tim.

## 1.2. Công thức chi trả theo STBH

| Quyền lợi | Điều kiện kích hoạt | Mức chi trả | Giới hạn/ghi chú |
|---|---|---:|---|
| Ung thư giai đoạn đầu | NĐBH được chẩn đoán ung thư giai đoạn đầu khi SPBK còn hiệu lực và sau thời gian chờ | 25% STBH | Tối đa 500.000.000 đồng; trừ khoản nợ nếu có |
| Ung thư giai đoạn cuối | NĐBH được chẩn đoán ung thư giai đoạn cuối khi SPBK còn hiệu lực và sau thời gian chờ | 100% STBH | Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có; trừ khoản nợ nếu có |
| Đột quỵ | NĐBH được chẩn đoán đột quỵ khi SPBK còn hiệu lực và sau thời gian chờ | 100% STBH | Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có; trừ khoản nợ nếu có |
| Nhồi máu cơ tim | NĐBH được chẩn đoán nhồi máu cơ tim khi SPBK còn hiệu lực và sau thời gian chờ | 100% STBH | Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có; trừ khoản nợ nếu có |

## 1.3. Nguyên tắc chi trả cần ghi nhớ

- Tổng chi trả tối đa cho toàn bộ R21 là 100% STBH trong toàn bộ thời gian hiệu lực, bao gồm tái tục.
- Quyền lợi ung thư giai đoạn đầu chỉ chi trả 1 lần.
- Nếu đã chi trả ung thư giai đoạn đầu, khi sau đó phát sinh ung thư giai đoạn cuối/đột quỵ/nhồi máu cơ tim thì phải khấu trừ phần đã chi trả.
- Nếu NĐBH tử vong trong vòng 14 ngày kể từ ngày được chẩn đoán bệnh tương ứng thì quyền lợi bệnh đó không được chi trả.
- Bệnh phải được bác sĩ chuyên khoa phù hợp của cơ sở y tế tại Việt Nam chẩn đoán và thỏa điều kiện bệnh được bảo hiểm.

## 1.4. Ví dụ để Codex tính

Nếu STBH R21 = 200.000.000:

| Sự kiện | Số tiền hiển thị |
|---|---:|
| Ung thư giai đoạn đầu | 50.000.000 |
| Ung thư giai đoạn cuối, chưa nhận ung thư giai đoạn đầu | 200.000.000 |
| Ung thư giai đoạn cuối, đã nhận ung thư giai đoạn đầu 50 triệu | 150.000.000 |
| Đột quỵ, chưa nhận ung thư giai đoạn đầu | 200.000.000 |
| Nhồi máu cơ tim, chưa nhận ung thư giai đoạn đầu | 200.000.000 |

---

# 2. R22 — BẢO HIỂM THƯƠNG TẬT BỘ PHẬN VĨNH VIỄN DO TAI NẠN 2.0

## 2.1. Cách hiểu sản phẩm

R22 chi trả khi NĐBH bị thương tật bộ phận vĩnh viễn do tai nạn. Số tiền chi trả = tỷ lệ thương tật x STBH.

## 2.2. Bảng tỷ lệ chi trả

| Nhóm | Trường hợp thương tật | Tỷ lệ chi trả trên STBH |
|---|---|---:|
| Mắt | Mất hoàn toàn và không thể phục hồi chức năng nhìn của 01 mắt, bao gồm mất hoàn toàn mắt hoặc mù hoàn toàn | 55% |
| Tai | Mất hoàn toàn và không thể phục hồi chức năng nghe của 02 tai | 75% |
| Tai | Mất hoàn toàn và không thể phục hồi chức năng nghe của 01 tai | 20% |
| Tai | Mất toàn bộ 02 loa tai | 15% |
| Tai | Mất toàn bộ 01 loa tai | 5% |
| Chi trên | Tháo khớp cổ tay | 50% |
| Chi trên | Cắt cụt cẳng tay | 55% |
| Chi trên | Tháo khớp khuỷu tay | 60% |
| Chi trên | Cắt cụt cánh tay | 65% |
| Chi trên | Tháo khớp vai | 70% |
| Ngón tay cái | Mất 01 đốt ngón tay cái | 8% |
| Ngón tay cái | Mất toàn bộ 02 đốt ngón tay cái | 20% |
| Ngón tay | Mất toàn bộ 03 đốt ngón tay trỏ | 9% |
| Ngón tay | Mất toàn bộ 03 đốt ngón tay giữa | 7% |
| Ngón tay | Mất toàn bộ 03 đốt ngón tay áp út | 6% |
| Ngón tay | Mất toàn bộ 03 đốt ngón tay út | 5% |
| Ngón tay | Mất 01 đốt của mỗi ngón tay II, III, IV, V | 2% |
| Ngón tay | Mất 02 đốt của mỗi ngón tay II, III, IV, V | 4% |
| Chi dưới | Mất nửa bàn chân | 35% |
| Chi dưới | Tháo khớp cổ chân | 45% |
| Chi dưới | Cắt cụt cẳng chân | 55% |
| Chi dưới | Tháo khớp gối | 60% |
| Chi dưới | Cắt cụt đùi | 65% |
| Chi dưới | Tháo khớp háng | 70% |
| Ngón chân | Mất toàn bộ ngón chân cái | 7% |
| Ngón chân | Mất toàn bộ một ngón chân khác, trừ ngón chân cái | 3% |
| Khác | Mất hoàn toàn và vĩnh viễn tiếng nói | 50% |
| Khác | Mất hoàn toàn xương hàm dưới | 70% |
| Khác | Mất hoàn toàn xương hàm trên | 80% |

## 2.3. Nguyên tắc tính

- Chi trả = STBH R22 x tỷ lệ tương ứng.
- Nếu một tai nạn gây nhiều thương tật: tổng chi trả tối đa 100% STBH.
- Nếu nhiều tai nạn trong một năm hiệu lực: tổng chi trả tối đa 100% STBH/năm.
- Nếu tổng chi trả đạt 100% STBH thì SPBK chấm dứt hiệu lực.
- Mất hoàn toàn/liệt hoàn toàn và không thể phục hồi chức năng được tính tương đương mất/tháo/cắt cụt bộ phận đó.
- Thương tật phải là hậu quả trực tiếp của tai nạn và phát sinh trong vòng 180 ngày từ ngày tai nạn.

## 2.4. Ví dụ để Codex tính

Nếu STBH R22 = 200.000.000:

| Thương tật | Công thức | Số tiền |
|---|---|---:|
| Mất 1 mắt | 200.000.000 x 55% | 110.000.000 |
| Mất nghe 2 tai | 200.000.000 x 75% | 150.000.000 |
| Tháo khớp vai | 200.000.000 x 70% | 140.000.000 |
| Mất toàn bộ ngón tay cái | 200.000.000 x 20% | 40.000.000 |
| Mất xương hàm trên | 200.000.000 x 80% | 160.000.000 |

---

# 3. R23 — BẢO HIỂM TỬ VONG VÀ THƯƠNG TẬT NGHIÊM TRỌNG DO TAI NẠN

## 3.1. Cách hiểu sản phẩm

R23 chi trả khi NĐBH tử vong do tai nạn hoặc bị thương tật nghiêm trọng do tai nạn.

## 3.2. Quyền lợi tử vong do tai nạn

| Sự kiện | Mức chi trả cơ sở |
|---|---:|
| Tử vong do tai nạn thông thường | 100% STBH |
| Tử vong do tai nạn hàng không thương mại, đi với tư cách hành khách có vé trên chuyến bay được cấp phép | 200% STBH |

## 3.3. Tỷ lệ chi trả theo tuổi đối với quyền lợi tử vong do tai nạn

Sau khi xác định mức chi trả cơ sở ở trên, áp dụng tỷ lệ theo tuổi:

| Thời điểm NĐBH tử vong | Tỷ lệ áp dụng trên số tiền cơ sở |
|---|---:|
| Trước sinh nhật lần thứ 01 | 20% |
| Từ sinh nhật lần thứ 01 đến trước sinh nhật lần thứ 02 | 40% |
| Từ sinh nhật lần thứ 02 đến trước sinh nhật lần thứ 03 | 60% |
| Từ sinh nhật lần thứ 03 đến trước sinh nhật lần thứ 04 | 80% |
| Từ sinh nhật lần thứ 04 trở đi | 100% |

## 3.4. Quyền lợi thương tật nghiêm trọng do tai nạn

| Sự kiện | Mức chi trả cơ sở |
|---|---:|
| Thương tật nghiêm trọng do tai nạn thuộc danh sách được bảo hiểm | 100% STBH |

Áp dụng tỷ lệ theo tuổi tại thời điểm tai nạn dẫn đến thương tật:

| Thời điểm NĐBH bị tai nạn dẫn đến thương tật nghiêm trọng | Tỷ lệ áp dụng trên STBH |
|---|---:|
| Trước sinh nhật lần thứ 01 | 20% |
| Từ sinh nhật lần thứ 01 đến trước sinh nhật lần thứ 02 | 40% |
| Từ sinh nhật lần thứ 02 đến trước sinh nhật lần thứ 03 | 60% |
| Từ sinh nhật lần thứ 03 đến trước sinh nhật lần thứ 04 | 80% |
| Từ sinh nhật lần thứ 04 trở đi | 100% |

## 3.5. Danh sách thương tật nghiêm trọng để hiển thị tóm tắt

Codex có thể hiển thị các nhóm nổi bật:

- Mất hoàn toàn một phần/các phần cơ thể nghiêm trọng.
- Liệt hoàn toàn và không thể phục hồi chức năng tay/chân.
- Mất hoàn toàn và không thể phục hồi chức năng mắt.
- Mất hoàn toàn hoặc liệt hoàn toàn 01 tay và 01 chân.
- Bỏng nặng.
- Hôn mê sâu.
- Mất khả năng sống độc lập.

## 3.6. Nguyên tắc chi trả

- Nếu một tai nạn gây nhiều thương tật nghiêm trọng, chỉ chi trả cho một thương tật nghiêm trọng thỏa điều kiện.
- Thương tật phải là hậu quả trực tiếp của tai nạn trong thời gian SPBK còn hiệu lực và phát sinh trong vòng 180 ngày từ ngày tai nạn.
- Sản phẩm chấm dứt hiệu lực khi đã phát sinh trách nhiệm chi trả tử vong do tai nạn hoặc thương tật nghiêm trọng do tai nạn.

## 3.7. Ví dụ để Codex tính

Nếu STBH R23 = 200.000.000 và NĐBH từ 4 tuổi trở lên:

| Sự kiện | Công thức | Số tiền |
|---|---|---:|
| Tử vong do tai nạn thường | 200.000.000 x 100% | 200.000.000 |
| Tử vong do tai nạn hàng không thương mại | 200.000.000 x 200% | 400.000.000 |
| Thương tật nghiêm trọng do tai nạn | 200.000.000 x 100% | 200.000.000 |

Nếu NĐBH 2 tuổi và STBH 200.000.000:

| Sự kiện | Công thức | Số tiền |
|---|---|---:|
| Tử vong do tai nạn thường | 200.000.000 x 100% x 60% | 120.000.000 |
| Tử vong do tai nạn hàng không | 200.000.000 x 200% x 60% | 240.000.000 |
| Thương tật nghiêm trọng | 200.000.000 x 60% | 120.000.000 |

---

# 4. R24 — HỖ TRỢ ĐÓNG PHÍ BẢO HIỂM DO TỬ VONG

## 4.1. Cách hiểu sản phẩm

R24 không chi trả theo STBH cố định. R24 hỗ trợ đóng phí sản phẩm chính khi NĐBH của SPBK tử vong.

## 4.2. Quyền lợi chính

| Sự kiện | Mức hỗ trợ | Cách chi trả |
|---|---|---|
| NĐBH tử vong trong thời gian SPBK còn hiệu lực | Hỗ trợ đóng phí định kỳ/phí bảo hiểm cơ bản định kỳ của sản phẩm chính, không bao gồm phí đóng thêm | Bắt đầu từ ngày đến hạn đóng phí tiếp theo ngay sau ngày tử vong |
| Thời gian hỗ trợ | Theo thời hạn hỗ trợ đóng phí đã chọn | Kết thúc khi hết thời hạn hỗ trợ hoặc khi sản phẩm chính chấm dứt hiệu lực, tùy thời điểm nào đến trước |

## 4.3. Nội dung Codex cần hiển thị

- Điều kiện: NĐBH của SPBK tử vong.
- Quyền lợi: Công ty hỗ trợ đóng phí sản phẩm chính.
- Phạm vi phí được hỗ trợ: phí bảo hiểm định kỳ/phí cơ bản định kỳ của sản phẩm chính, không gồm phí đóng thêm.
- Thời gian hỗ trợ: từ kỳ phí tiếp theo sau ngày tử vong đến hết thời hạn hỗ trợ đã chọn hoặc khi sản phẩm chính chấm dứt.
- Trong thời gian hỗ trợ, quyền lợi sản phẩm chính tiếp tục duy trì theo quy tắc sản phẩm chính.

## 4.4. Ví dụ để Codex tính

Nếu phí cơ bản định kỳ năm của sản phẩm chính là 30.000.000/năm và thời hạn hỗ trợ còn lại là 10 năm:

| Nội dung | Số tiền |
|---|---:|
| Hỗ trợ mỗi năm | 30.000.000 |
| Tổng giá trị hỗ trợ dự kiến trong 10 năm | 300.000.000 |

Lưu ý: đây là giá trị hỗ trợ đóng phí, không phải số tiền mặt chi trả trực tiếp theo STBH.

---

# 5. R25 — BỆNH LÝ NGHIÊM TRỌNG TOÀN DIỆN

## 5.1. Cách hiểu sản phẩm

R25 bảo vệ bệnh lý nghiêm trọng ở nhiều nhóm bệnh, gồm:

1. Bệnh lý nghiêm trọng giai đoạn đầu.
2. Bệnh lý nghiêm trọng giai đoạn cuối.
3. Bệnh lý nghiêm trọng trẻ em giai đoạn cuối.
4. Bệnh lý nghiêm trọng theo giới tính giai đoạn cuối.
5. Nằm viện đặc biệt do bệnh lý nghiêm trọng giai đoạn đầu đã được chấp thuận chi trả.

## 5.2. Quyền lợi theo STBH

| Quyền lợi | Điều kiện | Mức chi trả | Giới hạn/ghi chú |
|---|---|---:|---|
| BLNT giai đoạn đầu | Chẩn đoán bệnh thuộc Phụ lục giai đoạn đầu sau thời gian chờ | 25% STBH cho mỗi bệnh | Tối đa 500.000.000 đồng/bệnh; tối đa 2 bệnh thuộc 2 nhóm khác nhau |
| BLNT giai đoạn cuối áp dụng mọi độ tuổi | Chẩn đoán bệnh thuộc danh sách giai đoạn cuối | 100% STBH | Chỉ chi trả một lần; trừ quyền lợi giai đoạn đầu/nằm viện đặc biệt đã chi trả nếu có |
| BLNT trẻ em giai đoạn cuối | NĐBH từ 0 đến 17 tuổi tại thời điểm chẩn đoán, bệnh thuộc danh sách trẻ em | 100% STBH | Chỉ chi trả một lần; trừ quyền lợi đã trả nếu có |
| BLNT theo giới tính giai đoạn cuối | Chẩn đoán bệnh thuộc danh sách theo giới tính | 125% STBH | Chỉ chi trả một lần; nếu cùng lúc nhiều bệnh thì chi trả bệnh có số tiền cao nhất |
| Nằm viện đặc biệt | Nằm viện do BLNT giai đoạn đầu đã được chấp thuận chi trả | 10% STBH | Tối đa 100.000.000 đồng; chỉ chi trả một lần |

## 5.3. Điều kiện nằm viện đặc biệt

Được chi trả nếu nằm viện do BLNT giai đoạn đầu đã được chấp thuận và thuộc một trong hai trường hợp:

| Điều kiện nằm viện | Mức chi trả |
|---|---:|
| Điều trị nội trú liên tục từ 21 ngày nằm viện trở lên | 10% STBH, tối đa 100.000.000 |
| Điều trị nội trú liên tục tại ICU từ 10 ngày nằm viện trở lên | 10% STBH, tối đa 100.000.000 |

## 5.4. Nhóm bệnh để Codex tóm tắt

Codex không cần liệt kê toàn bộ bệnh trong JPG nếu không đủ chỗ. Nhưng phải biết R25 có các nhóm:

- Nhóm ung thư.
- Nhóm tim mạch.
- Nhóm thần kinh và cơ xương khớp.
- Nhóm cơ quan chính.
- Nhóm bệnh khác.
- Nhóm bệnh trẻ em.
- Nhóm bệnh theo giới tính.

## 5.5. Nguyên tắc khấu trừ

Khi chi trả BLNT giai đoạn cuối:

Số tiền thực trả = quyền lợi giai đoạn cuối tương ứng - quyền lợi BLNT giai đoạn đầu đã trả - quyền lợi nằm viện đặc biệt đã trả - khoản nợ nếu có.

## 5.6. Ví dụ để Codex tính

Nếu STBH R25 = 200.000.000:

| Sự kiện | Công thức | Số tiền |
|---|---|---:|
| BLNT giai đoạn đầu lần 1 | 200.000.000 x 25% | 50.000.000 |
| BLNT giai đoạn đầu lần 2 khác nhóm | 200.000.000 x 25% | 50.000.000 |
| Nằm viện đặc biệt | 200.000.000 x 10% | 20.000.000 |
| BLNT giai đoạn cuối thông thường, chưa nhận quyền lợi nào | 200.000.000 x 100% | 200.000.000 |
| BLNT giai đoạn cuối theo giới tính, chưa nhận quyền lợi nào | 200.000.000 x 125% | 250.000.000 |
| BLNT giai đoạn cuối thông thường, đã nhận 50 triệu giai đoạn đầu | 200.000.000 - 50.000.000 | 150.000.000 |
| BLNT giai đoạn cuối theo giới tính, đã nhận 50 triệu giai đoạn đầu + 20 triệu nằm viện đặc biệt | 250.000.000 - 50.000.000 - 20.000.000 | 180.000.000 |

---

# 6. R26 — CHĂM SÓC SỨC KHỎE TOÀN DIỆN

## 6.1. Cách hiểu sản phẩm

R26 là sản phẩm chi trả chi phí y tế thực tế. Không tính theo STBH cố định như các SPBK tử vong/bệnh lý.

Công thức chung:

**Số tiền chi trả = Chi phí y tế thực tế - Đồng chi trả, nhưng không vượt Giới hạn bảo hiểm tối đa và Giới hạn phụ.**

## 6.2. Các chương trình bảo hiểm

| Quyền lợi | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Nội trú | 150.000.000/năm | 250.000.000/năm | 500.000.000/năm | 1.000.000.000/năm | 2.000.000.000/năm |
| Ngoại trú | Không áp dụng | 10.000.000/năm | 20.000.000/năm | 40.000.000/năm | 80.000.000/năm |
| Nha khoa | 3.000.000/năm | 5.000.000/năm | 10.000.000/năm | 20.000.000/năm | 20.000.000/năm |
| Thai sản | 15.000.000/năm | 30.000.000/năm | 50.000.000/năm | 100.000.000/năm | 100.000.000/năm |

Ghi nhớ:

- Nội trú là quyền lợi mặc định.
- Ngoại trú, Nha khoa, Thai sản là quyền lợi tùy chọn.
- Nếu Nội trú chấm dứt hiệu lực thì các quyền lợi tùy chọn cũng chấm dứt theo.

## 6.3. Đồng chi trả

| Quyền lợi | Đồng chi trả |
|---|---|
| Nội trú, NĐBH 0–4 tuổi | Khách hàng tự chi trả 20% chi phí y tế thực tế |
| Nội trú, NĐBH từ 5 tuổi trở lên | Khách hàng tự chi trả 0% hoặc 20%, theo giấy chứng nhận/thông báo |
| Ngoại trú | Khách hàng tự chi trả 20% chi phí y tế thực tế |
| Nha khoa | Khách hàng tự chi trả 20% chi phí y tế thực tế |
| Thai sản | Khách hàng tự chi trả 20% chi phí y tế thực tế |

## 6.4. Phạm vi địa lý

| Chương trình | Nội trú | Ngoại trú | Nha khoa | Thai sản |
|---|---|---|---|---|
| Bạc | Việt Nam | Không áp dụng | Việt Nam | Việt Nam |
| Vàng | Việt Nam | Việt Nam | Việt Nam | Việt Nam |
| Bạch Kim | Việt Nam | Việt Nam | Việt Nam | Việt Nam |
| Kim Cương | Việt Nam | Việt Nam | Việt Nam | Việt Nam |
| Lục Bảo | Đông Nam Á cho Nội trú | Việt Nam | Việt Nam | Việt Nam |

## 6.5. Điều trị nội trú — hạn mức chính

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Giới hạn nội trú tối đa/năm | 150.000.000 | 250.000.000 | 500.000.000 | 1.000.000.000 | 2.000.000.000 |
| Điều trị nội trú có phẫu thuật/đợt | 60.000.000 | 120.000.000 | 250.000.000 | 400.000.000 | 800.000.000 |
| Điều trị nội trú không phẫu thuật/đợt | 30.000.000 | 60.000.000 | 125.000.000 | 200.000.000 | 400.000.000 |

## 6.6. Điều trị nội trú — giới hạn phụ

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Phòng & giường, tối đa 60 ngày/năm | 750.000/ngày | 1.250.000/ngày | 2.500.000/ngày | 5.000.000/ngày | 10.000.000/ngày |
| Phòng & giường ICU, tối đa 30 ngày/năm | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |
| Chi phí phẫu thuật | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |
| Điều trị trước nhập viện, 1 lần gần nhất trong 30 ngày trước nhập viện | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |
| Điều trị sau xuất viện, 1 lần gần nhất trong 60 ngày sau xuất viện | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |
| Giường người chăm sóc nếu NĐBH dưới 18 tuổi, tối đa 30 ngày/năm | 300.000/ngày | 500.000/ngày | 700.000/ngày | 1.000.000/ngày | 2.000.000/ngày |
| Chi phí y tế nội trú khác | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |
| Nội trú tổn thương răng do tai nạn | 1.500.000/năm | 2.000.000/năm | 4.000.000/năm | 6.000.000/năm | 8.000.000/năm |

## 6.7. Điều trị ung thư

| Hạng mục | Cách chi trả |
|---|---|
| Chi phí điều trị nội trú ung thư | Tính chung trong giới hạn Phần I Nội trú và các giới hạn phụ liên quan |
| Chi phí điều trị ung thư | Theo giới hạn tối đa của quyền lợi Nội trú |
| Phương pháp được bao gồm | Hóa trị, xạ trị, liệu pháp trúng đích, liệu pháp miễn dịch, liệu pháp nội tiết điều trị ung thư, phẫu thuật điều trị ung thư |
| Không bao gồm | Liệu pháp nội tiết để phòng ngừa ung thư; xạ trị bằng chùm proton |

## 6.8. Cấy ghép nội tạng

Áp dụng cho: thận, tim, gan, phổi, tụy, tủy xương.

| Đối tượng | Hạng mục | Cách chi trả |
|---|---|---|
| Người nhận tạng là NĐBH | Chi phí điều trị nội trú | Tính chung trong giới hạn Nội trú và giới hạn phụ liên quan |
| Người nhận tạng là NĐBH | Chi phí phẫu thuật | Theo giới hạn tối đa của quyền lợi Nội trú |
| Người hiến tạng không phải NĐBH | Chi phí phẫu thuật | 50% chi phí phẫu thuật, không vượt giới hạn tối đa của quyền lợi Nội trú |

## 6.9. Điều trị ngoại trú và điều trị trong ngày đặc biệt thuộc quyền lợi Nội trú

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Chạy thận nhân tạo định kỳ | 3.000.000/năm | 7.000.000/năm | 12.000.000/năm | 15.000.000/năm | 30.000.000/năm |
| Vận chuyển cấp cứu | 1.500.000/năm | 2.000.000/năm | 4.000.000/năm | 6.000.000/năm | 8.000.000/năm |
| Điều trị trong ngày tại khoa cấp cứu, nha khoa trong ngày do tai nạn, sốt xuất huyết, cúm, viêm phổi, bệnh phế quản | 4.000.000/năm | 6.000.000/năm | 12.000.000/năm | 20.000.000/năm | 30.000.000/năm |
| Phẫu thuật trong ngày | 15.000.000/ngày | 30.000.000/ngày | 60.000.000/ngày | 100.000.000/ngày | 200.000.000/ngày |

## 6.10. Gia tăng hạn mức nội trú do tai nạn

| Điều kiện | Quyền lợi |
|---|---|
| Hạn mức nội trú năm đã chi trả hết và phát sinh điều trị nội trú do tai nạn | Tăng thêm 100% giới hạn nội trú tối đa theo năm của chương trình đang tham gia |
| Cách chi trả phần tăng thêm | Chi trả 50% chi phí y tế thực tế, không vượt giới hạn bảo hiểm tối đa và giới hạn phụ |
| Tần suất | Kích hoạt 1 lần duy nhất mỗi năm hiệu lực |
| Chuyển hạn mức | Phần chưa dùng hết không chuyển sang năm sau |

Giá trị tăng thêm theo chương trình:

| Chương trình | Hạn mức tăng thêm do tai nạn |
|---|---:|
| Bạc | 150.000.000 |
| Vàng | 250.000.000 |
| Bạch Kim | 500.000.000 |
| Kim Cương | 1.000.000.000 |
| Lục Bảo | 2.000.000.000 |

## 6.11. Điều trị ngoại trú tùy chọn

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Giới hạn ngoại trú tối đa | Không áp dụng | 10.000.000/năm | 20.000.000/năm | 40.000.000/năm | 80.000.000/năm |
| Đồng chi trả | Không áp dụng | 20% | 20% | 20% | 20% |
| Giới hạn mỗi lần khám/điều trị: khám bệnh, thuốc, kỹ thuật chẩn đoán | Không áp dụng | 1.000.000/lần | 2.000.000/lần | 4.000.000/lần | 8.000.000/lần |
| Số lần khám tối đa | Không áp dụng | 10 lần/năm | 10 lần/năm | 10 lần/năm | 10 lần/năm |
| Vật lý trị liệu | Không áp dụng | 1.000.000/năm | 2.000.000/năm | 4.000.000/năm | 8.000.000/năm |
| Số đợt vật lý trị liệu | Không áp dụng | 1 đợt/năm | 1 đợt/năm | 1 đợt/năm | 1 đợt/năm |

Không tính vào quyền lợi ngoại trú tùy chọn:

- Chi phí điều trị ung thư.
- Chi phí chạy thận nhân tạo định kỳ.
- Vật lý trị liệu nằm ngoài giới hạn riêng.

## 6.12. Nha khoa tùy chọn

Lưu ý: Bạc không có quyền lợi Nha khoa theo bảng chi tiết tùy chọn này. Chương trình tổng có thể thể hiện Nha khoa từ Vàng trở lên trong bảng chi tiết thực tế.

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Giới hạn Nha khoa tối đa | Không áp dụng | 3.000.000/năm | 5.000.000/năm | 10.000.000/năm | 20.000.000/năm |
| Đồng chi trả | Không áp dụng | 20% | 20% | 20% | 20% |
| Điều trị nha khoa | Không áp dụng | 1.000.000/lần | 2.000.000/lần | 3.000.000/lần | 6.000.000/lần |
| Lấy cao răng, 1 lần/năm | Không áp dụng | 500.000/lần | 700.000/lần | 1.000.000/lần | 2.000.000/lần |
| Mão răng và cầu răng | Không áp dụng | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |

## 6.13. Thai sản tùy chọn

| Hạng mục | Bạc | Vàng | Bạch Kim | Kim Cương | Lục Bảo |
|---|---:|---:|---:|---:|---:|
| Giới hạn Thai sản tối đa | Không áp dụng | 15.000.000/năm | 30.000.000/năm | 50.000.000/năm | 100.000.000/năm |
| Đồng chi trả | Không áp dụng | 20% | 20% | 20% | 20% |
| Sinh thường | Không áp dụng | 10.000.000/năm | 20.000.000/năm | 30.000.000/năm | 60.000.000/năm |
| Sinh mổ | Không áp dụng | 15.000.000/năm | 30.000.000/năm | 50.000.000/năm | 100.000.000/năm |
| Biến chứng thai sản | Không áp dụng | 15.000.000/năm | 30.000.000/năm | 50.000.000/năm | 100.000.000/năm |
| Phòng & giường, tối đa 30 ngày/năm cho tổng quyền lợi Thai sản | Không áp dụng | 1.250.000/ngày | 2.500.000/ngày | 5.000.000/ngày | 10.000.000/ngày |
| Phòng & giường ICU, tối đa 15 ngày/năm cho tổng quyền lợi Thai sản | Không áp dụng | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế | Chi phí thực tế |

## 6.14. Thời gian chờ

| Quyền lợi | Thời gian chờ |
|---|---:|
| Tai nạn đối với Nội trú/Ngoại trú/Nha khoa | 0 ngày |
| Bệnh đặc biệt, cấy ghép nội tạng | 90 ngày |
| Bệnh khác | 30 ngày |
| Thai sản | 270 ngày |

## 6.15. Ví dụ R26 hạng Vàng để Codex hiển thị

Nếu khách hàng chọn R26 hạng Vàng, Codex phải hiểu:

| Nhóm quyền lợi | Mức chi trả/hạn mức hạng Vàng |
|---|---:|
| Nội trú tối đa | 250.000.000/năm |
| Nội trú có phẫu thuật | 120.000.000/đợt |
| Nội trú không phẫu thuật | 60.000.000/đợt |
| Phòng & giường | 1.250.000/ngày, tối đa 60 ngày/năm |
| ICU | Chi phí thực tế, tối đa 30 ngày/năm |
| Phẫu thuật | Chi phí thực tế |
| Trước nhập viện | Chi phí thực tế, 1 lần gần nhất trong 30 ngày trước nhập viện |
| Sau xuất viện | Chi phí thực tế, 1 lần gần nhất trong 60 ngày sau xuất viện |
| Giường người chăm sóc dưới 18 tuổi | 500.000/ngày, tối đa 30 ngày/năm |
| Tổn thương răng do tai nạn | 2.000.000/năm |
| Chạy thận định kỳ | 7.000.000/năm |
| Vận chuyển cấp cứu | 2.000.000/năm |
| Điều trị trong ngày đặc biệt | 6.000.000/năm |
| Phẫu thuật trong ngày | 30.000.000/ngày |
| Gia tăng nội trú do tai nạn | Tăng thêm 250.000.000/năm, chi trả 50% chi phí thực tế |
| Ngoại trú tùy chọn | 10.000.000/năm |
| Ngoại trú mỗi lần khám/điều trị | 1.000.000/lần, tối đa 10 lần/năm |
| Vật lý trị liệu | 1.000.000/năm |
| Nha khoa tùy chọn | 3.000.000/năm |
| Điều trị nha khoa | 1.000.000/lần |
| Lấy cao răng | 500.000/lần, 1 lần/năm |
| Mão răng/cầu răng | Chi phí thực tế |
| Thai sản tùy chọn | 15.000.000/năm |
| Sinh thường | 10.000.000/năm |
| Sinh mổ | 15.000.000/năm |
| Biến chứng thai sản | 15.000.000/năm |
| Phòng & giường thai sản | 1.250.000/ngày, tối đa 30 ngày/năm |
| ICU thai sản | Chi phí thực tế, tối đa 15 ngày/năm |

---

# 7. R27 — HỖ TRỢ ĐÓNG PHÍ DO BỆNH LÝ NGHIÊM TRỌNG CHO NGƯỜI ĐƯỢC BẢO HIỂM

## 7.1. Cách hiểu sản phẩm

R27 hỗ trợ đóng phí sản phẩm chính và hỗ trợ tài chính khi NĐBH mắc bệnh lý nghiêm trọng.

## 7.2. Quyền lợi hỗ trợ đóng phí

| Điều kiện | Mức hỗ trợ |
|---|---|
| NĐBH được chẩn đoán mắc BLNT giai đoạn cuối theo danh sách quy định sau thời gian chờ | Công ty hỗ trợ đóng phí bảo hiểm định kỳ/phí bảo hiểm cơ bản định kỳ của sản phẩm chính, không bao gồm phí đóng thêm |

## 7.3. Thời gian hỗ trợ đóng phí

| Nội dung | Quy tắc |
|---|---|
| Bắt đầu | Từ ngày đến hạn đóng phí tiếp theo ngay sau ngày NĐBH được chẩn đoán BLNT giai đoạn cuối |
| Kết thúc | Đến hết thời hạn hỗ trợ đóng phí đã chọn hoặc khi sản phẩm chính chấm dứt hiệu lực, tùy thời điểm nào đến trước |
| Trong thời gian hỗ trợ | Quyền lợi sản phẩm chính tiếp tục duy trì theo quy tắc sản phẩm chính |

## 7.4. Quyền lợi hỗ trợ tài chính

| Điều kiện | Mức chi trả |
|---|---:|
| NĐBH được chẩn đoán BLNT giai đoạn đầu sau thời gian chờ | 100% PBH năm của sản phẩm chính |
| NĐBH được chẩn đoán BLNT giai đoạn cuối sau thời gian chờ | 100% PBH năm của sản phẩm chính |

Ghi chú:

- PBH năm không bao gồm phí bảo hiểm đóng thêm.
- Trừ khoản nợ nếu có.
- Quyền lợi hỗ trợ tài chính chỉ chi trả 1 lần trong toàn bộ thời gian hiệu lực.
- Nếu BLNT giai đoạn cuối thì phải được chấp thuận chi trả theo quyền lợi hỗ trợ đóng phí.

## 7.5. Ví dụ để Codex tính

Nếu phí bảo hiểm cơ bản định kỳ năm của sản phẩm chính là 30.000.000:

| Sự kiện | Số tiền/giá trị hiển thị |
|---|---:|
| BLNT giai đoạn đầu | 30.000.000 tiền hỗ trợ tài chính |
| BLNT giai đoạn cuối | 30.000.000 tiền hỗ trợ tài chính + hỗ trợ đóng phí các kỳ phí tiếp theo |
| Thời hạn hỗ trợ còn lại 10 năm | Giá trị hỗ trợ đóng phí dự kiến 300.000.000 |

---

# 8. R28 — HỖ TRỢ ĐÓNG PHÍ DO BỆNH LÝ NGHIÊM TRỌNG CHO BÊN MUA BẢO HIỂM VÀ NGƯỜI HÔN PHỐI

## 8.1. Cách hiểu sản phẩm

R28 bảo vệ người đóng phí, gồm Bên mua bảo hiểm và/hoặc người hôn phối theo cấu trúc hợp đồng.

## 8.2. Quyền lợi hỗ trợ đóng phí

| Điều kiện | Mức hỗ trợ |
|---|---|
| Người được bảo hiểm của SPBK được chẩn đoán BLNT giai đoạn cuối theo danh sách quy định sau thời gian chờ | Công ty hỗ trợ đóng phí bảo hiểm định kỳ/phí bảo hiểm cơ bản định kỳ của sản phẩm chính, không bao gồm phí đóng thêm |

## 8.3. Thời gian hỗ trợ đóng phí

| Nội dung | Quy tắc |
|---|---|
| Bắt đầu | Từ ngày đến hạn đóng phí tiếp theo ngay sau ngày Người được bảo hiểm của SPBK được chẩn đoán BLNT giai đoạn cuối |
| Kết thúc | Đến hết thời hạn hỗ trợ đóng phí đã chọn hoặc khi sản phẩm chính chấm dứt hiệu lực, tùy thời điểm nào đến trước |
| Trong thời gian hỗ trợ | Quyền lợi sản phẩm chính tiếp tục duy trì theo quy tắc sản phẩm chính |

## 8.4. Quyền lợi hỗ trợ tài chính

| Điều kiện | Mức chi trả |
|---|---:|
| Người được bảo hiểm của SPBK được chẩn đoán BLNT giai đoạn đầu | 100% PBH năm của sản phẩm chính |
| Người được bảo hiểm của SPBK được chẩn đoán BLNT giai đoạn cuối | 100% PBH năm của sản phẩm chính |

Ghi chú:

- PBH năm không bao gồm phí bảo hiểm đóng thêm.
- Trừ khoản nợ nếu có.
- Quyền lợi hỗ trợ tài chính chỉ chi trả 1 lần trong toàn bộ thời gian hiệu lực.
- Nếu BLNT giai đoạn cuối thì phải được chấp thuận chi trả theo quyền lợi hỗ trợ đóng phí.

## 8.5. Ví dụ để Codex tính

Nếu phí bảo hiểm cơ bản định kỳ năm của sản phẩm chính là 30.000.000:

| Sự kiện | Số tiền/giá trị hiển thị |
|---|---:|
| BLNT giai đoạn đầu của BMBH/người hôn phối | 30.000.000 tiền hỗ trợ tài chính |
| BLNT giai đoạn cuối của BMBH/người hôn phối | 30.000.000 tiền hỗ trợ tài chính + hỗ trợ đóng phí các kỳ phí tiếp theo |
| Thời hạn hỗ trợ còn lại 10 năm | Giá trị hỗ trợ đóng phí dự kiến 300.000.000 |

---

# 9. R29 — TRỢ CẤP VIỆN PHÍ VÀ PHẪU THUẬT

## 9.1. Cách hiểu sản phẩm

R29 là sản phẩm trợ cấp tiền mặt theo STBH của SPBK. Không phụ thuộc chi phí thực tế của bệnh viện, miễn sự kiện thuộc phạm vi chi trả và đủ hồ sơ.

## 9.2. Quyền lợi theo STBH

| Quyền lợi | Điều kiện | Mức chi trả |
|---|---|---:|
| Trợ cấp viện phí cơ bản | NĐBH nằm viện và ngày nhập viện sau thời gian chờ | 1 x STBH/ngày nằm viện |
| Trợ cấp viện phí đặc biệt ICU | NĐBH nằm viện tại ICU và ngày nhập viện sau thời gian chờ | 2 x STBH/ngày nằm viện |
| Trợ cấp phẫu thuật cơ bản | NĐBH phải thực hiện phẫu thuật và ngày phẫu thuật sau thời gian chờ | 5 x STBH/lần phẫu thuật |
| Trợ cấp phẫu thuật đặc biệt | NĐBH thực hiện phẫu thuật đặc biệt theo danh sách | 10 x STBH/lần phẫu thuật |
| Hỗ trợ vận chuyển cấp cứu | NĐBH sử dụng dịch vụ vận chuyển cấp cứu được cấp phép để đến cơ sở y tế tại Việt Nam và phải nhập viện điều trị | 2 x STBH/lần, tối đa 1.000.000 đồng/lần |

## 9.3. Giới hạn viện phí

| Nội dung | Giới hạn |
|---|---:|
| Trợ cấp viện phí cơ bản | Tối đa 50 ngày/năm |
| Trợ cấp viện phí ICU | Tối đa 30 ngày/năm |
| Trợ cấp ICU trong toàn bộ thời gian hiệu lực | Tối đa 300 ngày |
| Tổng số ngày viện phí cơ bản + ICU trong 03 năm hiệu lực liên tiếp | Tối đa 100 ngày |
| Số lần nằm viện được chi trả trong 01 năm hiệu lực | Tối đa 03 lần |

## 9.4. Giới hạn phẫu thuật

| Nội dung | Giới hạn |
|---|---:|
| Số lần phẫu thuật được chi trả trong 01 năm hiệu lực | Tối đa 02 lần |
| Số lần phẫu thuật được chi trả trong toàn bộ thời gian hiệu lực | Tối đa 10 lần |
| Mỗi ca phẫu thuật | Chỉ chi trả một lần trợ cấp cơ bản hoặc đặc biệt |
| Nhiều phẫu thuật do cùng tai nạn/cùng bệnh lý/bệnh lý tái phát | Chỉ chi trả một lần, theo quyền lợi thỏa mãn |

## 9.5. Giới hạn tổng

| Nội dung | Giới hạn |
|---|---:|
| Tổng chi trả quyền lợi trợ cấp viện phí + phẫu thuật trong toàn bộ thời gian hiệu lực | Tối đa 1.000 x STBH |
| Khi đạt giới hạn tổng | SPBK chấm dứt hiệu lực |

## 9.6. Giới hạn vận chuyển cấp cứu

| Nội dung | Giới hạn |
|---|---:|
| Mỗi lần vận chuyển cấp cứu | 2 x STBH, tối đa 1.000.000 đồng |
| Số lần/năm | Tối đa 02 lần |
| Số lần toàn bộ thời gian hiệu lực | Tối đa 10 lần |

## 9.7. Thời gian chờ

| Quyền lợi | Thời gian chờ |
|---|---:|
| Tai nạn | 0 ngày |
| Bệnh đặc biệt, phẫu thuật đặc biệt | 90 ngày |
| Bệnh và phẫu thuật khác | 30 ngày |
| Vận chuyển cấp cứu | 0 ngày |

## 9.8. Ví dụ để Codex tính

Nếu STBH R29 = 300.000:

| Sự kiện | Công thức | Số tiền |
|---|---|---:|
| Nằm viện thường 1 ngày | 300.000 x 1 | 300.000 |
| Nằm ICU 1 ngày | 300.000 x 2 | 600.000 |
| Phẫu thuật cơ bản | 300.000 x 5 | 1.500.000 |
| Phẫu thuật đặc biệt | 300.000 x 10 | 3.000.000 |
| Vận chuyển cấp cứu | 300.000 x 2, tối đa 1.000.000 | 600.000 |

Nếu STBH R29 = 700.000:

| Sự kiện | Công thức | Số tiền |
|---|---|---:|
| Nằm viện thường 1 ngày | 700.000 x 1 | 700.000 |
| Nằm ICU 1 ngày | 700.000 x 2 | 1.400.000 |
| Phẫu thuật cơ bản | 700.000 x 5 | 3.500.000 |
| Phẫu thuật đặc biệt | 700.000 x 10 | 7.000.000 |
| Vận chuyển cấp cứu | 700.000 x 2 = 1.400.000 nhưng tối đa 1.000.000 | 1.000.000 |

---

# 10. QUY TẮC CHUNG CHO CODEX KHI TẠO BẢNG TÓM TẮT

## 10.1. Cách lấy dữ liệu

Codex phải lấy từ dữ liệu minh họa thực tế:

- Danh sách SPBK đã chọn.
- STBH từng SPBK.
- Chương trình R26 nếu có: Bạc/Vàng/Bạch Kim/Kim Cương/Lục Bảo.
- R26 có chọn thêm Ngoại trú/Nha khoa/Thai sản hay không.
- Phí bảo hiểm cơ bản định kỳ năm của sản phẩm chính nếu dùng cho R24/R27/R28.
- Tuổi, giới tính, người được bảo hiểm, bên mua bảo hiểm nếu cần.

## 10.2. Cách trình bày mỗi card SPBK

Mỗi SPBK phải hiển thị:

1. Tên SPBK.
2. STBH/hạn mức/hạng chương trình.
3. Quyền lợi chính.
4. Mức chi trả.
5. Giới hạn quan trọng.

Mẫu dòng:

```text
Tên quyền lợi | Mức chi trả | Ghi chú
```

Ví dụ:

```text
Ung thư giai đoạn đầu | 25% STBH = 50.000.000 | Tối đa 500 triệu
Phẫu thuật đặc biệt | 10 x STBH = 3.000.000/lần | Tối đa 10 lần toàn thời hạn
Nội trú hạng Vàng | 250.000.000/năm | Có/không phẫu thuật theo giới hạn đợt
```

## 10.3. Quy tắc tính tiền

- Nếu quyền lợi tính theo % STBH: `số tiền = STBH x tỷ lệ`.
- Nếu quyền lợi tính theo số lần STBH: `số tiền = STBH x số lần`.
- Nếu quyền lợi R26: lấy đúng hạng chương trình và quyền lợi tùy chọn, không tự tính theo STBH.
- Nếu có giới hạn "tối đa", lấy số nhỏ hơn giữa công thức và giới hạn tối đa.
- Nếu có khấu trừ quyền lợi đã trả trước đó, phải trừ phần đã chi trả.
- Nếu có khoản nợ, ghi chú "trừ khoản nợ nếu có", không tự trừ nếu không có dữ liệu khoản nợ.

## 10.4. Quy tắc rút gọn khi xuất JPG

Nếu không đủ diện tích, ưu tiên hiển thị:

1. Quyền lợi tử vong/tai nạn/bệnh nặng có số tiền lớn nhất.
2. Quyền lợi viện phí/phẫu thuật tính theo ngày/lần.
3. Quyền lợi R26 theo hạng chương trình và quyền lợi tùy chọn.
4. Các giới hạn quan trọng: tối đa/năm, tối đa/lần, số lần/năm.

Không đưa:

- Điều khoản loại trừ dài.
- Định nghĩa bệnh dài.
- Hồ sơ yêu cầu chi trả.
- Nội dung pháp lý chi tiết.

## 10.5. Lưu ý pháp lý ngắn ở cuối bảng

Luôn thêm dòng nhỏ cuối bảng:

```text
Lưu ý: Quyền lợi và mức chi trả trên là tóm tắt minh họa, việc chi trả thực tế căn cứ Quy tắc, Điều khoản sản phẩm và hồ sơ yêu cầu giải quyết quyền lợi bảo hiểm được Bảo Việt Nhân thọ chấp thuận.
```
