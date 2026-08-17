# Chức năng Hội nghị khách hàng

## 1. Tổng quan

Chức năng **Hội nghị khách hàng** hỗ trợ ADO quản lý danh sách khách hàng đăng ký tham dự hội nghị, theo dõi kết quả phát sinh hợp đồng từ dữ liệu BC02, ghi chú quá trình chăm sóc và xuất dữ liệu phục vụ báo cáo.

Chức năng được tích hợp vào giao diện ADO dưới dạng:

- Một khối truy cập nhanh **Hội nghị khách hàng** trên trang Tổng quan.
- Một trang riêng toàn màn hình có hai chế độ:
  - **Theo dõi**: xem các hội nghị và kết quả đối soát.
  - **Upload**: tạo hội nghị và tải danh sách khách hàng đăng ký từ Excel.

## 2. Đối tượng sử dụng và phân quyền

### 2.1. Quyền xem

- Tất cả tài khoản có vai trò ADO đều xem được toàn bộ hội nghị đã tạo.
- Danh sách hội nghị là dữ liệu dùng chung giữa các ADO, không giới hạn theo người tạo hoặc nhóm ADO quản lý.
- Tài khoản BOSS cũng được cấp quyền truy cập tương đương ADO.

### 2.2. Quyền upload

- Mọi ADO có thể tạo hội nghị và upload danh sách đăng ký.
- Tên nhóm trong file Excel không bắt buộc phải thuộc phạm vi nhóm mà ADO đang quản lý.
- Hệ thống vẫn tiếp nhận và đối soát các dòng thuộc nhóm ngoài phạm vi quản lý.

### 2.3. Quyền ghi chú và xuất báo cáo

- Mọi ADO đều có thể mở khách hàng, xem và cập nhật ghi chú.
- Mọi ADO đều có thể xuất Excel của bất kỳ hội nghị nào.

### 2.4. Quyền xóa

- Chỉ ADO đã tạo hội nghị mới nhìn thấy và sử dụng nút **Xóa**.
- Khi xóa, hệ thống yêu cầu xác nhận.
- Hội nghị và toàn bộ danh sách khách hàng đăng ký liên quan sẽ bị xóa nhờ quan hệ `on delete cascade`.

## 3. Giao diện Tổng quan ADO

Trang Tổng quan ADO có thêm khối **Hội nghị khách hàng**.

Khi bấm vào khối này, hệ thống mở trang Hội nghị khách hàng và hiển thị thanh lựa chọn:

- **Theo dõi**
- **Upload**

Trạng thái đang chọn có nền xanh đậm, chữ và icon màu trắng. Trạng thái chưa chọn có nền trắng, chữ xanh xám.

## 4. Tạo hội nghị và upload Excel

### 4.1. Thông tin nhập trên giao diện

ADO cần nhập đủ:

1. **Tên hội nghị**.
2. **Từ ngày**.
3. **Đến ngày**.
4. **File Excel** chứa danh sách đăng ký.

Nút Upload chỉ được bật khi đã nhập đầy đủ các thông tin trên.

### 4.2. Quy tắc khoảng ngày

- Khoảng ngày được chọn trực tiếp trên giao diện, không nằm trong file Excel.
- `Từ ngày` không được sau `Đến ngày`.
- Khoảng ngày được áp dụng chung cho toàn bộ khách hàng trong hội nghị.
- Khoảng ngày này được sử dụng khi đối soát hợp đồng BC02.

### 4.3. Cấu trúc file Excel

File upload gồm đúng các cột nghiệp vụ sau:

| Cột | Bắt buộc | Ý nghĩa |
|---|---:|---|
| Mã TVV | Có | Mã tư vấn viên dùng để đối soát BC02 |
| Tên TVV | Có | Tên tư vấn viên hiển thị trên giao diện và báo cáo |
| Nhóm | Có | Nhóm tại thời điểm đăng ký |
| Tên khách hàng | Có | Tên khách dùng để so khớp BMBH hoặc NĐBH |
| Phí đăng ký | Không bắt buộc phải lớn hơn 0 | Số phí khách hàng đăng ký tại hội nghị |

Hệ thống chấp nhận file `.xlsx`, `.xls` và `.csv`.

Các tên cột có dấu hoặc không dấu tương đương đều được nhận diện. Ví dụ `Mã TVV`, `Ma TVV` hoặc `advisor_code`.

### 4.4. File Excel mẫu

Nút **Tải mẫu Excel** tạo file `mau-hoi-nghi-khach-hang.xlsx` với:

- Đúng năm cột được hỗ trợ.
- Một dòng dữ liệu minh họa.
- Độ rộng cột đã được thiết lập để dễ nhập liệu.

### 4.5. Kết quả upload

Sau khi upload thành công:

- Hệ thống tạo một bản ghi hội nghị.
- Từng dòng Excel được lưu thành một khách hàng đăng ký.
- Giao diện chuyển về chế độ Theo dõi.
- Hiển thị thông báo số khách hàng đã được tạo.

## 5. Theo dõi hội nghị

### 5.1. Thẻ hội nghị

Mỗi hội nghị hiển thị:

- Tên hội nghị.
- Khoảng thời gian từ ngày đến ngày.
- Tổng số khách đăng ký.
- **Tổng phí đăng ký** lấy trực tiếp từ cột `Phí đăng ký` trong file Excel.

Tổng phí trên thẻ không phải doanh thu đã chốt từ BC02.

### 5.2. Chi tiết hội nghị

Khi mở một hội nghị, phần tổng hợp hiển thị:

- **Có hợp đồng**: số khách hàng tìm thấy ít nhất một hợp đồng hợp lệ.
- **Tổng AFYP**: tổng AFYP của tất cả hợp đồng khớp điều kiện đối soát.

Khối tổng số khách đăng ký không lặp lại trong phần chi tiết vì số này đã có trên thẻ hội nghị.

### 5.3. Thông tin từng khách hàng

Mỗi khách hàng hiển thị:

- Tên khách hàng.
- Tên TVV.
- Cột **Đăng ký**: phí đăng ký lấy từ Excel.
- Cột **Chốt**: AFYP thực tế tìm thấy từ BC02.

Mã TVV và tên nhóm không hiển thị trong danh sách, nhưng vẫn được lưu để đối soát và xuất báo cáo.

Nếu chưa có hợp đồng hợp lệ, cột Chốt hiển thị dấu `—`.

### 5.4. Thứ tự danh sách

Danh sách khách hàng được sắp xếp theo thứ tự:

1. Khách có hợp đồng được đưa lên đầu.
2. Trong nhóm có hợp đồng, khách có AFYP cao hơn đứng trước.
3. Khách chưa ghi nhận hợp đồng nằm phía dưới và được sắp xếp theo tên.

## 6. Quy tắc đối soát BC02

Một khách hàng được ghi nhận có hợp đồng khi đồng thời thỏa mãn tất cả điều kiện:

1. **Mã TVV** trong file upload giống mã tư vấn viên `agent_code` trong BC02.
2. **Ngày thu** `paid_date` nằm trong khoảng `Từ ngày` đến `Đến ngày` của hội nghị, bao gồm cả hai ngày biên.
3. **Tên khách hàng** trong file upload trùng với một trong hai trường:
   - Bên mua bảo hiểm `policy_owner`.
   - Người được bảo hiểm `insured_name`.
4. Hợp đồng vượt qua bộ lọc hợp đồng được ghi nhận của hệ thống (`isCountedRevenueRecord`).

### 6.1. Chuẩn hóa tên

Trước khi so sánh, tên được chuẩn hóa bằng cách:

- Chuyển về chữ thường.
- Bỏ dấu tiếng Việt.
- Chuyển `đ` thành `d`.
- Chuẩn hóa khoảng trắng thừa.

Sau chuẩn hóa, tên phải bằng nhau hoàn toàn. Hệ thống không dùng so khớp gần đúng hoặc chứa một phần tên.

### 6.2. Hợp đồng trùng lặp

Dữ liệu BC02 được khử trùng lặp bằng hàm `dedupeRevenueRecordsByContract` trước khi tính số hợp đồng và AFYP.

### 6.3. Nhiều hợp đồng cho một khách hàng

Nếu cùng một khách hàng có nhiều hợp đồng hợp lệ trong khoảng thời gian:

- Khách hàng chỉ được tính một lần trong số khách có hợp đồng.
- Cột Chốt và Tổng AFYP cộng AFYP của tất cả hợp đồng khớp.
- `contractCount` lưu số lượng hợp đồng tìm thấy cho khách hàng đó trong dữ liệu API trả về.

## 7. Ghi chú khách hàng

### 7.1. Mở popup ghi chú

Tên khách hàng là một nút tương tác. Khi bấm vào tên, hệ thống mở popup gồm:

- Tên khách hàng.
- Tên TVV phụ trách.
- Ô nhập nội dung ghi chú.
- Thông tin người và thời gian cập nhật gần nhất nếu đã có ghi chú.
- Nút **Hủy** và **Lưu ghi chú**.

### 7.2. Lưu ghi chú

- Nội dung ghi chú tối đa 5.000 ký tự.
- Ghi chú rỗng được lưu thành `null`, tương đương xóa nội dung ghi chú hiện tại.
- Khi lưu, hệ thống ghi nhận:
  - Nội dung ghi chú.
  - Mã ADO thực hiện cập nhật.
  - Thời gian cập nhật.
- Sau khi lưu thành công, danh sách hội nghị được tải lại để hiển thị dữ liệu mới nhất.

### 7.3. Hiển thị ghi chú trong danh sách

Nếu khách hàng đã có ghi chú, một phần nội dung được hiển thị ngắn gọn dưới tên TVV. Nội dung dài được cắt bằng dấu ba chấm để không làm vỡ giao diện.

## 8. Xuất báo cáo Excel

Trong chi tiết hội nghị có nút **Xuất Excel**.

Mọi ADO được phép xuất báo cáo. File được đặt tên theo tên hội nghị đã chuẩn hóa và gồm các cột:

| Cột | Nguồn dữ liệu |
|---|---|
| Mã TVV | File upload |
| Tên TVV | File upload |
| Nhóm | File upload |
| Tên khách hàng | File upload |
| Phí đăng ký | File upload |
| Ghi chú | Ghi chú được ADO cập nhật |
| Người cập nhật | Mã ADO cập nhật ghi chú gần nhất |
| Thời gian cập nhật | Thời điểm lưu ghi chú gần nhất |

Nút **Xuất Excel** và **Xóa** được căn giữa, có cùng kích thước. Với hội nghị do ADO khác tạo, chỉ nút Xuất Excel được hiển thị.

## 9. Cấu trúc dữ liệu Supabase

Migration nằm tại:

`supabase/customer-conferences.sql`

### 9.1. Bảng `customer_conferences`

| Trường | Kiểu | Mô tả |
|---|---|---|
| id | uuid | Khóa chính |
| ado_code | text | Mã ADO tạo hội nghị |
| conference_name | text | Tên hội nghị |
| date_from | date | Ngày bắt đầu đối soát |
| date_to | date | Ngày kết thúc đối soát |
| source_file | text | Tên file upload ban đầu |
| created_at | timestamptz | Thời gian tạo |

### 9.2. Bảng `customer_conference_registrations`

| Trường | Kiểu | Mô tả |
|---|---|---|
| id | uuid | Khóa chính |
| conference_id | uuid | Khóa ngoại đến hội nghị |
| advisor_code | text | Mã TVV dùng để đối soát |
| advisor_name | text | Tên TVV |
| group_name | text | Tên nhóm từ Excel |
| customer_name | text | Tên khách hàng |
| registration_fee | numeric | Phí đăng ký |
| note | text | Nội dung ghi chú |
| note_updated_by | text | Mã ADO cập nhật ghi chú gần nhất |
| note_updated_at | timestamptz | Thời gian cập nhật ghi chú gần nhất |
| created_at | timestamptz | Thời gian tạo dòng đăng ký |

Quan hệ `conference_id` dùng `on delete cascade`, vì vậy xóa hội nghị sẽ xóa toàn bộ đăng ký thuộc hội nghị đó.

## 10. API

### `GET /api/customer-conferences`

- Yêu cầu đăng nhập ADO hoặc BOSS.
- Trả về toàn bộ hội nghị dùng chung.
- Tải danh sách đăng ký của từng hội nghị.
- Đối soát BC02 và tính trạng thái tham gia, số hợp đồng, AFYP, tổng phí đăng ký.
- Trả thêm `canManage` để giao diện quyết định có hiển thị nút Xóa hay không.

### `POST /api/customer-conferences`

- Yêu cầu đăng nhập ADO hoặc BOSS.
- Nhận `multipart/form-data` gồm:
  - `conferenceName`
  - `dateFrom`
  - `dateTo`
  - `file`
- Tạo hội nghị và danh sách đăng ký.
- Không giới hạn nhóm trong file theo phạm vi ADO.

### `GET /api/customer-conferences/template`

- Tạo và tải file Excel mẫu.

### `GET /api/customer-conferences/:id/export`

- Yêu cầu quyền ADO hoặc BOSS.
- Xuất danh sách đăng ký và thông tin ghi chú thành Excel.

### `DELETE /api/customer-conferences/:id`

- Chỉ xóa khi `ado_code` của hội nghị trùng tài khoản đang đăng nhập.
- Xóa hội nghị và dữ liệu đăng ký liên quan.

### `PATCH /api/customer-conferences/registrations/:id/note`

- Yêu cầu quyền ADO hoặc BOSS.
- Body JSON: `{ "note": "Nội dung ghi chú" }`.
- Lưu ghi chú, người cập nhật và thời gian cập nhật.

## 11. Các file mã nguồn chính

| File | Vai trò |
|---|---|
| `app/page.tsx` | Giao diện tổng quan, upload, theo dõi, popup ghi chú |
| `app/globals.css` | CSS cơ bản của chức năng hội nghị |
| `app/design-system.css` | CSS ưu tiên theo giao diện ADO, chống ghi đè màu |
| `app/api/customer-conferences/route.ts` | API danh sách, upload và đối soát BC02 |
| `app/api/customer-conferences/template/route.ts` | Tạo file Excel mẫu |
| `app/api/customer-conferences/[id]/route.ts` | Xóa hội nghị |
| `app/api/customer-conferences/[id]/export/route.ts` | Xuất Excel |
| `app/api/customer-conferences/registrations/[id]/note/route.ts` | Lưu ghi chú |
| `supabase/customer-conferences.sql` | Schema và migration Supabase |

## 12. Checklist triển khai

1. Chạy toàn bộ nội dung `supabase/customer-conferences.sql` trong Supabase SQL Editor.
2. Xác nhận hai bảng đã được tạo.
3. Xác nhận ba cột ghi chú đã tồn tại:
   - `note`
   - `note_updated_by`
   - `note_updated_at`
4. Triển khai mã nguồn mới.
5. Đăng nhập bằng một tài khoản ADO và tải file mẫu.
6. Tạo hội nghị thử nghiệm với khoảng ngày hợp lệ.
7. Upload danh sách có ít nhất một khách khớp BC02 và một khách chưa khớp.
8. Kiểm tra thứ tự khách có hợp đồng nằm trên cùng.
9. Đăng nhập bằng ADO khác và xác nhận nhìn thấy cùng hội nghị.
10. Thêm ghi chú bằng ADO khác và kiểm tra người cập nhật/thời gian cập nhật.
11. Xuất Excel và kiểm tra các cột ghi chú.
12. Xác nhận ADO không phải người tạo không thấy nút Xóa.

## 13. Lưu ý vận hành

- Dữ liệu ghi chú là dữ liệu dùng chung; lần lưu mới sẽ thay thế ghi chú hiện tại và cập nhật người sửa gần nhất.
- Việc tên khách hàng phải trùng hoàn toàn sau chuẩn hóa giúp hạn chế ghi nhận sai, nhưng có thể bỏ sót trường hợp BC02 và Excel dùng tên viết tắt hoặc khác thứ tự. Khi cần, có thể mở rộng bằng cơ chế duyệt thủ công hoặc bảng bí danh.
- Tổng AFYP được tính động từ BC02 mỗi lần tải danh sách, không được lưu cố định trong bảng hội nghị.
- Phí đăng ký được lưu cố định theo file upload.
- Nếu dữ liệu BC02 thay đổi, trạng thái Chốt và Tổng AFYP có thể thay đổi theo lần tải tiếp theo.
- Không nên mở quyền truy cập trực tiếp các bảng này từ trình duyệt. Các thao tác hiện đi qua API server sử dụng Supabase service role và kiểm tra phiên đăng nhập ADO.
