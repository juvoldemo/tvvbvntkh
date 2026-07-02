# Yêu cầu Codex: Tự động gợi ý nghề nghiệp và tự nhảy nhóm nghề nghiệp
Tài liệu này dùng để Codex triển khai chức năng chọn **Nghề nghiệp** và tự động xác định **Nhóm nghề nghiệp** trên web minh họa. Dữ liệu nguồn lấy từ file `danhmucnghenghiep new.xlsx`, sheet `Danh mục nghề_MỚI`, gồm 2 cột: `Phân nhóm nghề` và `Nghề nghiệp`.
## 1. Mục tiêu nghiệp vụ
- Khi vừa mở web, trường **Nhóm nghề nghiệp** mặc định là **Nhóm 1**.
- Trường **Nghề nghiệp** là ô chọn có tìm kiếm. Người dùng chỉ cần nhập một từ khóa liên quan như `kinh`, `bán hàng`, `nông`, `bác sĩ`, `công an`... hệ thống phải hiện ra danh sách nghề phù hợp.
- Khi người dùng chọn một nghề trong danh sách, hệ thống tự động cập nhật **Nhóm nghề nghiệp** theo đúng cột `Phân nhóm nghề` của nghề đó.
- Người dùng không cần nhập nhóm nghề thủ công. Nhóm nghề chỉ là kết quả tự động, có thể để dạng readonly/disabled.
- Nếu chưa chọn nghề hoặc xóa nghề đã chọn, nhóm nghề quay về mặc định **Nhóm 1**.
## 2. Hành vi giao diện cần có
### 2.1. Trạng thái mặc định khi vào web
```text
Nghề nghiệp: để trống hoặc hiển thị placeholder "Tìm nghề nghiệp..."
Nhóm nghề nghiệp: Nhóm 1
```
### 2.2. Khi người dùng nhập từ khóa
- Dropdown phải lọc theo mọi phần trong tên nghề, không chỉ đầu chuỗi.
- Tìm kiếm không phân biệt hoa/thường.
- Tìm kiếm nên bỏ dấu tiếng Việt để gõ `kinh doanh` vẫn ra `Kinh doanh - ...`.
- Nên hỗ trợ tìm theo nhiều từ rời, ví dụ `ban hang tai sap` vẫn ra `Kinh doanh - Bán hàng tại sạp, tại chợ`.
- Mỗi item gợi ý nên hiển thị tên nghề đầy đủ và có thể kèm nhãn nhỏ `Nhóm X` bên phải để người dùng dễ kiểm tra.
### 2.3. Khi người dùng chọn nghề
Ví dụ:
```text
Chọn: Kinh doanh - Bán hàng tại sạp, tại chợ
=> Nhóm nghề nghiệp tự động hiển thị: Nhóm 2
```
### 2.4. Khi nghề không có trong danh sách
- Không tự đoán nhóm nghề.
- Hiển thị cảnh báo nhẹ: `Vui lòng chọn nghề trong danh sách gợi ý để xác định nhóm nghề.`
- Giữ nhóm nghề là **Nhóm 1** hoặc giữ giá trị nhóm cũ cho đến khi người dùng chọn nghề hợp lệ. Khuyến nghị: khi input không khớp nghề đã chọn thì reset về **Nhóm 1**.
## 3. Cấu trúc dữ liệu đề xuất
Tạo một file dữ liệu riêng, ví dụ `src/data/ngheNghiep.js` hoặc `src/data/ngheNghiep.json`. Mỗi nghề là một object:
```js
{
  group: 2,
  groupLabel: "Nhóm 2",
  job: "Kinh doanh - Bán hàng tại sạp, tại chợ",
  searchText: "kinh doanh ban hang tai sap tai cho"
}
```
`searchText` là chuỗi đã chuẩn hóa: chữ thường, bỏ dấu, bỏ ký tự đặc biệt. Có thể tạo sẵn hoặc tạo lúc runtime.
## 4. Hàm chuẩn hóa tìm kiếm
Codex hãy thêm hàm dùng chung:
```js
function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
```
## 5. Logic lọc gợi ý nghề
```js
function filterJobs(keyword, limit = 30) {
  const q = normalizeText(keyword);
  if (!q) return JOBS.slice(0, limit);

  const words = q.split(" ").filter(Boolean);

  return JOBS
    .filter(item => words.every(w => item.searchText.includes(w)))
    .slice(0, limit);
}
```
## 6. Logic chọn nghề và tự cập nhật nhóm
```js
const DEFAULT_JOB_GROUP = 1;

function onSelectJob(selectedJob) {
  setFormValue("ngheNghiep", selectedJob.job);
  setFormValue("nhomNgheNghiep", selectedJob.group);
  setDisplayValue("nhomNgheNghiep", `Nhóm ${selectedJob.group}`);
}

function onJobInputChange(text) {
  setFormValue("ngheNghiep", text);

  const exact = JOBS.find(item => normalizeText(item.job) === normalizeText(text));
  if (exact) {
    setFormValue("nhomNgheNghiep", exact.group);
    setDisplayValue("nhomNgheNghiep", `Nhóm ${exact.group}`);
  } else {
    setFormValue("nhomNgheNghiep", DEFAULT_JOB_GROUP);
    setDisplayValue("nhomNgheNghiep", "Nhóm 1");
  }
}
```
## 7. Yêu cầu tích hợp với form hiện tại
- Không phá layout hiện tại.
- Trường **Nghề nghiệp** vẫn đặt ở vị trí hiện có.
- Dropdown gợi ý nên giống hình minh họa: có ô tìm kiếm, danh sách nghề bên dưới, item đang hover/được chọn có nền khác.
- Trường **Nhóm nghề nghiệp** nằm ngay dưới nghề nghiệp, tự đổi theo nghề đã chọn.
- Nếu đang tính sản phẩm bán kèm theo nhóm nghề, mọi công thức/điều kiện phải lấy từ giá trị `nhomNgheNghiep` tự động này.
- Cần bảo đảm khi xuất tóm tắt hoặc tính quyền lợi, dữ liệu nhóm nghề đã cập nhật đúng sau khi chọn nghề.
## 8. Kiểm thử bắt buộc
| Từ khóa nhập | Nghề chọn | Kết quả nhóm |
|---|---|---|
| `kinh` | `Kinh doanh - Bán hàng tại sạp, tại chợ` | `Nhóm 2` |
| `ban hang online` | `Kinh doanh - Bán hàng online` | theo danh mục bên dưới |
| `nong dan` | `Nông nghiệp - Nông dân, làm ruộng, trồng lúa, trồng mía, làm nương rẫy` | `Nhóm 3` |
| `bac si thu y` | `Nông nghiệp - Bác sĩ thú y` | `Nhóm 2` |
| xóa nghề | không chọn nghề | `Nhóm 1` |
## 9. Danh mục nghề nghiệp theo nhóm
### Nhóm 1
- Nông nghiệp - Chủ trang trại chăn nuôi, Chủ vườn, Chủ đầm
- Kinh doanh - Giám đốc/Quản lý/Chủ cơ sở kinh doanh
- Kinh doanh - Bán hàng online
- Kinh doanh - Nhân viên kinh doanh, nhân viên bán hàng
- Tài chính - Định phí bảo hiểm
- Tài chính - Giao dịch viên ngân hàng và các công việc văn phòng khác
- Tài chính - Cố vấn tài chính
- Tài chính - Cán bộ, kế toán, kiểm toán, chuyên viên kinh tế
- Báo chí - Nhân viên tòa soạn, hành chính, văn thư, hiệu đính
- Hành chính, văn phòng - Lãnh đạo, thủ trưởng các cơ quan, Ban giám đốc, Ban quản lý, Ban điều hành
- Hành chính, văn phòng - Cán bộ quản lý, giám sát, quản đốc, trưởng phòng, phó phòng,…
- Hành chính, văn phòng - Lãnh đạo cấp Trung ương hoặc lãnh đạo tỉnh/thành trực thuộc Trung ương
- Hành chính, văn phòng - Lễ tân, hướng dẫn viên
- Hành chính, văn phòng - Cán bộ, Nhân viên văn phòng
- Hành chính, văn phòng - Thư ký, nhân viên hành chính, văn thư lưu trữ
- Hành chính, văn phòng - Nhà nghiên cứu khoa học
- Hành chính, văn phòng - Kỹ sư làm việc tại văn phòng
- Hành chính, văn phòng - Luật sư
- Hành chính, văn phòng - Thẩm phán
- Hành chính, văn phòng - Kiểm sát viên, kiểm tra viên
- Hành chính, văn phòng - Trợ giúp pháp lý, thư ký tòa án, trợ lý luật sư
- Hành chính, văn phòng - Nhân viên ngoại giao
- Quảng cáo - Thiết kế đồ họa, vi tính
- Dịch vụ - Nhân viên bán vé, soát vé
- Dịch vụ - Phiên dịch viên
- Dịch vụ - Nhân viên pha chế đồ uống, bartender
- Dịch vụ - Giám định thương mại
- Điện - Kỹ sư tư vấn, thiết kế điện
- Điện tử, viễn thông - Lập trình viên, quản trị mạng, kỹ thuật viên
- Điện tử, viễn thông - Kỹ sư điện tử, công nghệ thông tin
- Văn hóa, giải trí - Diễn viên, nghệ sĩ
- Văn hóa, giải trí - Dẫn chương trình (MC), phát thanh viên, bình luận viên
- Văn hóa, giải trí - Người mẫu, PG
- Văn hóa, giải trí - Nhà thơ, nhà văn, nhà phê bình
- Y tế - Giám đốc, quản lý cơ sở y tế, khoa, phòng
- Y tế - Nhân viên hành chính, y tá hành chính
- Y tế - Bác sĩ, nha sĩ, dược sĩ
- Giáo dục - Hiệu trưởng, hiệu phó
- Giáo dục - Giáo viên, Giảng viên, Trợ giảng
- Giáo dục - Giáo viên mầm non
- Giáo dục - Giáo viên thể dục, thể chất
- Giáo dục - Học sinh, sinh viên
- Giáo dục - Trẻ em
- Dệt may - thời trang - Cán bộ kỹ thuật, tổ trưởng, giám sát (KCS, QC)
- Dệt may - thời trang - Nhà thiết kế thời trang, nghiên cứu phát triển mẫu
- Xây dựng - Kiến trúc sư, kỹ sư đồ họa
- Xây dựng - Thiết kế nội thất
- Nghề khác - Tôn giáo, tâm linh - Các chức sắc tôn giáo, cha đạo, nhà sư, nhà chùa, thầy cúng…

### Nhóm 2
- Nông nghiệp - Bác sĩ thú y
- Nông nghiệp - Nuôi ong, chăn nuôi gia súc, gia cầm: bò, lợn, gà,…
- Nông nghiệp - Buôn bán gia súc, gia cầm và nông sản khác: bò, lợn, gà, lúa, gạo, mía, cà phê,…
- Nông nghiệp - Lao động phổ thông, làm vườn, trồng trọt và buôn bán cây
- Lâm nghiệp - Buôn bán thu mua gỗ, lâm sản
- Thủy sản - Công nhân chế biến thủy hải sản
- Kinh doanh - Nhân viên marketing, tiếp thị, giới thiệu sản phẩm
- Kinh doanh - Bán hàng tạp hóa
- Kinh doanh - Bán hàng tại sạp, tại chợ
- Tài chính - Giám định bảo hiểm
- Tài chính - Đại lý bảo hiểm/ Tư vấn tài chính
- Tài chính - Nhân viên tín dụng ngân hàng
- Hàng không - Nhân viên phục vụ mặt đất
- Đường sắt - Nhân viên gác chắn, nhân viên đường sắt
- Hàng hải - Quản lý, giám sát
- Vận tải - Lái xe con cơ quan, văn phòng
- Vận tải - Lái xe tang
- Báo chí - Nhà báo, biên tập viên
- Hành chính, văn phòng - Thu ngân, thủ quỹ
- Hành chính, văn phòng - Nhân viên tổng đài
- Hành chính, văn phòng - Nhân viên hải quan
- Hành chính, văn phòng - Nhà môi giới, broker
- Quảng cáo - Thợ vẽ, lắp đặt biển quảng cáo
- Dịch vụ - Nhân viên phục vụ hoạt động vui chơi, giải trí, thể thao
- Dịch vụ - Hướng dẫn viên du lịch
- Dịch vụ - Nhân viên tại trạm xăng
- Dịch vụ - Nhân viên hồ bơi, bể bơi
- Dịch vụ - Nhân viên phục vụ buồng, phòng khách sạn
- Dịch vụ - Trông xe
- Dịch vụ - Người giúp việc hoặc ô sin
- Dịch vụ - Nhân viên tạp vụ/Lao công
- Dịch vụ - Nhân viên sòng bạc (casino) và các công việc liên quan
- Dịch vụ - Thợ cắt tóc, tạo mẫu tóc, gội đầu, làm móng, trang điểm
- Dịch vụ - Nước sinh hoạt - Nhân viên kỹ thuật
- Dịch vụ - Chủ hiệu cầm đồ và cho vay tiền
- Dịch vụ - Giặt ủi, giặt là
- Dịch vụ - Nhân viên điều hành, phục vụ lễ tang
- Dịch vụ - Thư pháp, ông đồ
- Điện - Giám sát, quản lý, thanh tra ngành điện
- Điện - Thợ lắp ráp sửa chữa điện tử, điện lạnh, điện gia dụng
- Điện tử, viễn thông - Công nhân lắp ráp, nhân viên kỹ thuật
- Văn hóa, giải trí - Đạo diễn, nhà sản xuất phim, sân khấu
- Văn hóa, giải trí - Nghệ sĩ đường phố
- Văn hóa, giải trí - Thợ chụp ảnh, nhiếp ảnh gia, quay phim
- Văn hóa, giải trí - Họa sĩ/Nhà điêu khắc
- Văn hóa, giải trí - Ca sĩ, nhạc sĩ, nhạc công
- Văn hóa, giải trí - Nhân viên đoàn làm phim
- Y tế - Y tá, dược tá, hộ sinh, hộ lý, điều dưỡng
- Giáo dục - Gia sư
- Thể thao - Trọng tài, giám sát trận đấu
- Thể thao - Huấn luyện viên, vận động viên thể thao (Bóng đá, điền kinh, golf)
- Dệt may - thời trang - Công nhân may, thợ may, thêu, đan
- Sản xuất - Thủ kho, quản đốc
- Sản xuất - Kỹ sư làm việc tại công trường, xưởng sản xuất
- Sản xuất - Kỹ thuật viên
- Sản xuất - Giám sát sản xuất, giám sát kỹ thuật
- Sản xuất - Nhân viên kiểm định, kiểm tra chất lượng sản phẩm (KCS)
- Sản xuất - Công nhân kỹ thuật
- Sản xuất - Công nhân lao động (không tiếp xúc với hóa chất)
- Sản xuất - Nghệ nhân, thợ thủ công
- Sản xuất - Thợ lắp ráp, thợ máy, thợ cơ khí
- Xây dựng - Kỹ sư trắc địa, kỹ sư xây dựng
- Xây dựng - Chủ thầu xây dựng, giám sát công trình
- Khai khoáng - Giám sát viên/Quản đốc/Kỹ sư khai thác mỏ làm việc trên mặt đất
- Ngành dầu khí - Cán bộ quản lý, lãnh đạo
- Ngành dầu khí - Kỹ sư, giám sát viên, thanh tra viên
- Ngành dầu khí - Cán bộ, nhân viên khác, làm việc trên tàu phục vụ
- Tài nguyên - Môi trường - Công nhân công viên cây xanh
- Ngành công an - Cảnh sát quản lý hành chính, văn phòng
- Ngành công an - Quản lý trại giam/trung tâm giáo dưỡng
- Quân đội - Hành chính văn phòng
- Quân đội - Quân nhân chuyên nghiệp
- Quân đội - Quân nhân hậu cần - liên lạc
- Quân đội - Công nhân quốc phòng
- Quân đội - Quân nhân Hải quân trên bờ (mọi cấp bậc)
- Nghề khác - Nội trợ
- Nghề khác - Hưu trí
- Nghề khác - Reviewer, Streamer, Gamer, YouTuber

### Nhóm 3
- Nông nghiệp - Nông dân, làm ruộng, trồng lúa, trồng mía, làm nương rẫy
- Nông nghiệp - Công nhân, thợ giết mổ gia súc, gia cầm: bò, lợn, gà,…
- Nông nghiệp - Công nhân bảo quản chế biến nông sản: lúa, gạo, mía đường, cà phê…
- Thủy sản - Người nuôi tôm, nuôi cá, thủy hải sản
- Thủy sản - Buôn bán cá, tôm, buôn bán thủy hải sản
- Kinh doanh - Bán hàng rong, vỉa hè
- Hàng không - Phi công, tiếp viên hàng không, phi hành đoàn (thương mại)
- Hàng không - Thợ bảo dưỡng, tiếp nhiên liệu, vận chuyển hàng hóa
- Đường sắt - Lái tàu hỏa
- Đường sắt - Nhân viên phục vụ trên tàu hỏa
- Đường sắt - Nhân viên điều khiển tín hiệu, bẻ ghi và chuyển hướng tàu hỏa
- Hàng hải - Thợ đóng tàu vỏ gỗ
- Vận tải - Lái xe taxi, xe buýt, xe du lịch
- Vận tải - Lái xe khách (đến 30 chỗ), xe tải hạng nhẹ (dưới 3,5 tấn)
- Vận tải - Nhân viên phụ tàu, phụ xe
- Vận tải - Giáo viên dạy lái xe
- Báo chí - Phóng viên, cộng tác viên báo chí (làm việc trong nước)
- Dịch vụ - Nhân viên mát xa, tẩm quất
- Dịch vụ - Nhân viên giao hàng, vận chuyển hàng hóa, shipper
- Dịch vụ - Đầu bếp, phụ bếp, nấu ăn
- Dịch vụ - Thợ làm bánh
- Dịch vụ - Nhân viên phục vụ, bồi bàn
- Dịch vụ - Công nhân kiểm tra và vận hành thang máy
- Dịch vụ - Thu hồi công nợ, đòi nợ
- Dịch vụ - Trông trẻ tại nhà
- Dịch vụ - Giám định tư pháp: Kỹ thuật hình sự, pháp y
- Điện - Thợ điện dân dụng, thợ lắp đặt hệ thống điện nước
- Văn hóa, giải trí - Thợ xăm hình nghệ thuật
- Văn hóa, giải trí - Diễn viên múa, biên đạo múa
- Văn hóa, giải trí - Nhà ảo thuật
- Văn hóa, giải trí - Nhà khảo cổ học
- Y tế - Kỹ thuật viên y tế
- Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên chuyên khoa bệnh tâm thần
- Y tế - Nhân viên y tế cơ quan, trường học
- Y tế - Nhân viên y tế dự phòng, kiểm dịch
- Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên y tế Trung tâm cai nghiện, trung tâm giáo dưỡng, trại giam
- Thể thao - Huấn luyện viên, vận động viên thể thao khác
- Dệt may - thời trang - Công nhân bảo trì sửa chữa máy, chế tạo khuôn mẫu
- Sản xuất - Công nhân in ấn
- Sản xuất - Lao động phổ thông
- Sản xuất - Công nhân vận hành máy móc
- Sản xuất - Công nhân ngành gốm sứ
- Xây dựng - Thợ bả, thợ sơn, vecni, đánh bóng, trang trí
- Khai khoáng - Lãnh đạo, quản lý, giám sát
- Ngành dầu khí - Nhân viên kho, hậu cần, cấp phát vật tư
- Ngành công an - Cảnh sát kinh tế, an ninh mạng
- Quân đội - Sĩ quan quân đội, sĩ quan an ninh

### Nhóm 4
- Nông nghiệp - Nuôi thú dữ, hổ, báo, gấu, nuôi trăn, rắn, cá sấu…
- Lâm nghiệp - Trồng rừng, chăm sóc rừng
- Lâm nghiệp - Công nhân chế biến gỗ, lâm sản
- Thủy sản - Đánh cá ao/hồ/sông/ven biển đi về trong ngày
- Hàng hải - Thuyền trưởng, thuyền phó, thuyền viên, nhân viên tàu ven biển, tàu cứu hộ
- Đường thủy nội địa - Thuyền trưởng, thuyền viên, lái tàu/phà trên sông hồ, kênh, rạch,…
- Vận tải - Lái xe chuyên dụng (cứu hỏa, cứu thương, cứu hộ, cảnh sát, vệ sinh môi trường, xe chở tiền...)
- Vận tải - Lái xe khách (lớn hơn 30 chỗ), lái xe tải hạng vừa và nặng (từ 3,5 tấn trở lên)
- Vận tải - Lái máy xúc, máy ủi, xe cẩu,…
- Vận tải - Lái xe chở hóa chất, nhiên liệu
- Báo chí - Phóng viên, cộng tác viên báo chí (làm việc tại nước ngoài)
- Quảng cáo - Thợ vẽ, lắp đặt biển quảng cáo ngoài trời, làm việc trên cao
- Dịch vụ - Nhân viên cứu hộ ở bãi biển
- Dịch vụ - Nước sinh hoạt - thợ nước, sửa đường ống, xử lý hóa chất, vệ sinh
- Dịch vụ - Xe ôm/xe ôm công nghệ/Xích lô
- Dịch vụ - Thợ sửa chữa xe máy, sửa chữa ô tô
- Dịch vụ - Nhân viên phục vụ an táng (hỏa táng, chôn cất,…)
- Dịch vụ - Bảo vệ (không trang bị vũ khí)
- Dịch vụ - Thám tử
- Dịch vụ - Buôn bán, sang chiết, vận chuyển gas, khí đốt
- Điện - Công nhân, nhân viên vận hành trạm biến áp
- Điện - Công nhân nhà máy điện (nhiệt điện, thủy điện)
- Y tế - Bác sĩ, y sĩ, y tá, điều dưỡng, nhân viên chuyên khoa truyền nhiễm (lây), lao, HIV, bệnh nhiệt đới
- Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên y tế khoa X-quang, xạ trị
- Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên pháp y
- Dệt may - thời trang - Công nhân sợi, dệt, nhuộm, sấy, là
- Sản xuất - Công nhân lao động có tiếp xúc với hóa chất
- Sản xuất - Lao động tại bến cảng, kho bãi
- Sản xuất - Thợ mộc, làm đồ gỗ
- Sản xuất - Thợ tạc đá, điêu khắc đá
- Sản xuất - Công nhân làm gạch, lò nung
- Sản xuất - Công nhân làm trong ngành thủy tinh
- Sản xuất - Thợ cơ khí, thợ tiện, thợ rèn, thợ gò hàn, thợ cắt
- Xây dựng - Thợ sắt, thợ nhôm kính
- Xây dựng - Công nhân khoan cắt bê tông
- Xây dựng - Thợ xây công trình đường sắt, đường bộ
- Xây dựng - Công nhân vận hành máy công trình, khoan, trộn bê tông, cần cẩu,…
- Xây dựng - Công nhân cầu đường
- Khai khoáng - Giám sát viên/Quản đốc/Kỹ sư khai thác mỏ làm việc dưới mặt đất
- Khai khoáng - Công nhân vận hành máy công trình
- Ngành dầu khí - Cán bộ kỹ thuật, thợ điện, thợ máy làm việc trên tàu phục vụ
- Tài nguyên - Môi trường - Nhân viên vệ sinh
- Tài nguyên - Môi trường - Nhân viên cấp thoát nước
- Ngành công an - Quản giáo, giám thị trại giam/trung tâm giáo dưỡng
- Ngành công an - Cảnh sát quản lý và bảo vệ tư pháp, cảnh vệ
- Quân đội - Quân nhân phục vụ trên tàu mặt nước
- Quân đội - Không quân: lực lượng phục vụ mặt đất
- Quân đội - Quân nhân các binh chủng khác
- Nghề khác - Lao động tự do, lao động có đào tạo

### Nhóm 5
- Lâm nghiệp - Công nhân khai thác gỗ, lâm sản
- Lâm nghiệp - Kiểm lâm
- Thủy sản - Đánh cá biển xa bờ, dài ngày
- Hàng không - Lái máy bay cá nhân
- Đường sắt - Nhân viên tuần đường, sửa đường ray
- Hàng hải - Hoa tiêu, thuyền trưởng, thuyền phó, thủy thủ, nhân viên tàu biển lớn, tàu viễn dương
- Hàng hải - Thợ đóng tàu vỏ sắt thép
- Hàng hải - Nhân viên phục vụ hệ thống thông tin Duyên hải Việt Nam
- Hàng hải - Khai thác viên hệ thống thông tin Duyên hải Việt Nam
- Hàng hải - Kỹ thuật viên hệ thống thông tin Duyên hải Việt Nam
- Hàng hải - Thuyền viên làm việc trên tàu tìm kiếm cứu nạn, trục vớt tài sản chìm đắm, cứu hộ
- Hàng hải - Giám sát viên, điều hành viên hệ thống hành hải tàu thuyền
- Hàng hải - Kỹ thuật viên điều hành hệ thống hành hải tàu thuyền
- Hàng hải - Thuyền viên làm việc trên tàu, ca nô công vụ của cảng vụ hàng hải
- Hàng hải - Thuyền viên làm việc trên tàu, ca nô phục vụ tiếp tế, kiểm tra hệ thống báo hiệu hàng hải đèn biển, luồng hàng hải; đưa đón hoa tiêu hàng hải
- Hàng hải - Kiểm tra tàu, thuyền, công trình thuỷ, báo hiệu hàng hải
- Hàng hải - Kiểm tra công trình biển
- Hàng hải - Lắp đặt, bảo dưỡng, sửa chữa phao tiêu, báo hiệu hàng hải
- Hàng hải - Quản lý và vận hành các thiết bị báo hiệu hàng hải trên luồng hàng hải, cửa sông, dọc theo các sông có vận tải thuỷ
- Hàng hải - Công nhân quản lý, vận hành đèn biển
- Hàng hải - Vận hành, bảo dưỡng, sửa chữa ra- đa ở các trạm ra-đa trong hệ thống lưu thông hàng hải trên luồng
- Hàng hải - Công nhân quản lý vận hành luồng hàng hải
- Hàng hải - Tiếp nhận, truyền phát và xử lý thông tin an ninh, an toàn hàng hải
- Đường thủy nội địa - Công nhân quản lý đường thủy nội địa
- Đường thủy nội địa - Công nhân khảo sát, duy tu, bảo trì đường thủy nội địa
- Đường thủy nội địa - Thuyền trưởng, máy trưởng làm việc trên tàu công tác quản lý đường thủy nội địa
- Vận tải - Lái xe siêu trường, siêu trọng, xe kéo, rơ moóc, container
- Hành chính, văn phòng - Trực tiếp làm hoạt động lưu trữ tại kho, phòng kho lưu trữ, xưởng kỹ thuật bảo quản (nghề độc hại)
- Dịch vụ - Bảo vệ có trang bị vũ khí
- Dịch vụ - Vệ sĩ
- Điện - Thợ điện, thợ đường dây, công tơ, thợ điện nhà cao tầng
- Điện - Cán bộ, nhân viên tại nhà máy điện hạt nhân
- Văn hóa, giải trí - Diễn viên xiếc, diễn viên đóng thế cảnh nguy hiểm (cascadeur)
- Thể thao - Huấn luyện viên, vận động viên môn thể thao mạo hiểm (Leo núi, đua xe, đua moto nước, đua thuyền, đua ngựa, dù lượn, thể dục dụng cụ, vũ đạo giải trí, boxing, đấu kiếm, patin)
- Sản xuất - Công nhân nồi hơi
- Sản xuất - Sản xuất, đóng bao Na2SiF6 (hóa chất Sodium Fluorosilicate)
- Sản xuất - Công nhân khuân vác, bốc xếp, vận chuyển, cửu vạn
- Sản xuất - Công nhân nhà máy xi măng
- Sản xuất - Nhân viên chạy thử xe ôtô, môtô (thử tốc độ, va đập)
- Xây dựng - Công nhân có sử dụng hóa chất, chất nổ
- Xây dựng - Thợ xây nhà cửa, thợ nề, phụ hồ
- Xây dựng - Thợ xây, công nhân xây lắp công trình điện, viễn thông, thông tin liên lạc
- Xây dựng - Thợ lắp đặt điều hòa không khí, hệ thống sưởi
- Xây dựng - Công nhân lau kính, rửa kính nhà cao tầng
- Khai khoáng - Công nhân khai thác mỏ
- Khai khoáng - Công nhân hầm mỏ, hầm lò
- Khai khoáng - Vận hành các thiết bị tuyển than bằng phương pháp tuyển nổi, tuyển từ trong nhà máy sàng tuyển than
- Khai khoáng - Vệ sinh công nghiệp trong các phân xưởng sửa chữa ô tô, thiết bị khai thác mỏ
- Khai khoáng - Bảo vệ tài nguyên, ranh giới mỏ than
- Khai khoáng - Công nhân nạp ắc quy, sửa chữa đèn lò; sửa chữa, cấp phát ắc quy, đèn lò
- Khai khoáng - Công nhân sửa chữa máy bốc rót than nhà máy sàng tuyển than
- Khai khoáng - Thủ kho vật liệu nổ công nghiệp
- Ngành dầu khí - Công nhân khai thác mỏ, dàn khoan, công nhân lắp ráp đường ống
- Ngành dầu khí - Công nhân dầu khí
- Ngành dầu khí - Thuyền trưởng/thuyền viên tàu chở dầu, xà lan chở dầu
- Ngành dầu khí - Giám sát kỹ thuật, kỹ sư dầu khí làm việc tại các vùng đầm lầy, sa mạc, hoặc giàn khoan, tàu khoan, tàu dầu, phao rót dầu trên biển
- Ngành dầu khí - Cán bộ, công nhân viên ngành dầu khí làm việc tại các vùng đầm lầy, sa mạc, hoặc giàn khoan, tàu khoan, tàu dầu, phao rót dầu trên biển
- Ngành dầu khí - Cán bộ, nhân viên làm việc tại các hệ thống kho chứa, trạm phân phối dầu/khí
- Ngành dầu khí - Cán bộ, nhân viên làm việc tại các hệ thống chưng cất, chế biến dầu khí và các sản phẩm hóa dầu
- Hạt nhân, phóng xạ - Lãnh đạo, quản lý, giám sát tại các cơ sở hạt nhân, phóng xạ
- Hạt nhân, phóng xạ - Cán bộ, nhân viên tại cơ sở hạt nhân, phóng xạ
- Hạt nhân, phóng xạ - Cán bộ, nhân viên tại cơ sở thử nghiệm tương thích điện từ
- Tài nguyên - Môi trường - Công nhân xử lý rác thải, vệ sinh cống rãnh, hầm cầu
- Tài nguyên - Môi trường - Khảo sát, đo đạc thành lập bản đồ tài nguyên môi trường biển và hải đảo
- Tài nguyên - Môi trường - Quan trắc các điều kiện tự nhiên, động lực, môi trường, sinh thái biển
- Tài nguyên - Môi trường - Khảo sát địa vật lý biển theo tàu (địa chấn, từ biển, trọng lực biển, sonar, điện từ)
- Tài nguyên - Môi trường - Khảo sát địa vật lý, đo carota lỗ khoan, điều tra tài nguyên nước ở vùng núi, rừng sâu, hải đảo, biên giới và trên biển
- Tài nguyên - Môi trường - Phân tích các thông số môi trường đất, nước, khí, phóng xạ, trầm tích, bùn thải, chất thải nguy hại, chất dioxin/furan, các độc chất khác
- Tài nguyên - Môi trường - Quan trắc tài nguyên nước và các yếu tố thủy văn ở đồng bằng, trung du, vùng sâu, vùng xa hoặc vùng núi, biên giới, hải đảo
- Tài nguyên - Môi trường - Quan trắc tại các khu vực ven biển (đo biến thiên từ ngày đêm, quan trắc nước triều, đo điểm tựa trọng lực, đo câu nối các điểm trắc địa cơ sở phục vụ các dự án điều tra biển)
- Ngành công an - Lính cứu hỏa, cảnh sát phòng cháy chữa cháy
- Ngành công an - Cảnh sát hình sự, điều tra tội phạm
- Ngành công an - Cảnh sát cơ động
- Ngành công an - Cảnh sát giao thông
- Quân đội - Quân nhân phục vụ tàu ngầm
- Quân đội - Hải quân
- Quân đội - Lục quân
- Quân đội - Không quân/phi công quân sự
- Quân đội - Quân nhân quân khí, bộ đội đặc công, đặc nhiệm
- Quân đội - Bộ đội biên phòng, cảnh sát biển
- Nghề khác - Lao động tự do, lao động chưa qua đào tạo
- Nghề khác - Thợ lặn
- Nghề khác - Thất nghiệp/Không nghề nghiệp
- Nghề khác - Các nghề nghiệp rủi ro không phân loại nơi khác

## 10. Dữ liệu dạng JS để Codex có thể copy trực tiếp
```js
export const JOBS = [
  { group: 1, groupLabel: "Nhóm 1", job: "Nông nghiệp - Chủ trang trại chăn nuôi, Chủ vườn, Chủ đầm", searchText: "nong nghiep chu trang trai chan nuoi chu vuon chu dam" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nông nghiệp - Bác sĩ thú y", searchText: "nong nghiep bac si thu y" },
  { group: 3, groupLabel: "Nhóm 3", job: "Nông nghiệp - Nông dân, làm ruộng, trồng lúa, trồng mía, làm nương rẫy", searchText: "nong nghiep nong dan lam ruong trong lua trong mia lam nuong ray" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nông nghiệp - Nuôi ong, chăn nuôi gia súc, gia cầm: bò, lợn, gà,…", searchText: "nong nghiep nuoi ong chan nuoi gia suc gia cam bo lon ga" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nông nghiệp - Buôn bán gia súc, gia cầm và nông sản khác: bò, lợn, gà, lúa, gạo, mía, cà phê,…", searchText: "nong nghiep buon ban gia suc gia cam va nong san khac bo lon ga lua gao mia ca phe" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nông nghiệp - Lao động phổ thông, làm vườn, trồng trọt và buôn bán cây", searchText: "nong nghiep lao dong pho thong lam vuon trong trot va buon ban cay" },
  { group: 3, groupLabel: "Nhóm 3", job: "Nông nghiệp - Công nhân, thợ giết mổ gia súc, gia cầm: bò, lợn, gà,…", searchText: "nong nghiep cong nhan tho giet mo gia suc gia cam bo lon ga" },
  { group: 3, groupLabel: "Nhóm 3", job: "Nông nghiệp - Công nhân bảo quản chế biến nông sản: lúa, gạo, mía đường, cà phê…", searchText: "nong nghiep cong nhan bao quan che bien nong san lua gao mia duong ca phe" },
  { group: 4, groupLabel: "Nhóm 4", job: "Nông nghiệp - Nuôi thú dữ, hổ, báo, gấu, nuôi trăn, rắn, cá sấu…", searchText: "nong nghiep nuoi thu du ho bao gau nuoi tran ran ca sau" },
  { group: 2, groupLabel: "Nhóm 2", job: "Lâm nghiệp - Buôn bán thu mua gỗ, lâm sản", searchText: "lam nghiep buon ban thu mua go lam san" },
  { group: 4, groupLabel: "Nhóm 4", job: "Lâm nghiệp - Trồng rừng, chăm sóc rừng", searchText: "lam nghiep trong rung cham soc rung" },
  { group: 4, groupLabel: "Nhóm 4", job: "Lâm nghiệp - Công nhân chế biến gỗ, lâm sản", searchText: "lam nghiep cong nhan che bien go lam san" },
  { group: 5, groupLabel: "Nhóm 5", job: "Lâm nghiệp - Công nhân khai thác gỗ, lâm sản", searchText: "lam nghiep cong nhan khai thac go lam san" },
  { group: 5, groupLabel: "Nhóm 5", job: "Lâm nghiệp - Kiểm lâm", searchText: "lam nghiep kiem lam" },
  { group: 2, groupLabel: "Nhóm 2", job: "Thủy sản - Công nhân chế biến thủy hải sản", searchText: "thuy san cong nhan che bien thuy hai san" },
  { group: 3, groupLabel: "Nhóm 3", job: "Thủy sản - Người nuôi tôm, nuôi cá, thủy hải sản", searchText: "thuy san nguoi nuoi tom nuoi ca thuy hai san" },
  { group: 3, groupLabel: "Nhóm 3", job: "Thủy sản - Buôn bán cá, tôm, buôn bán thủy hải sản", searchText: "thuy san buon ban ca tom buon ban thuy hai san" },
  { group: 4, groupLabel: "Nhóm 4", job: "Thủy sản - Đánh cá ao/hồ/sông/ven biển đi về trong ngày", searchText: "thuy san danh ca ao ho song ven bien di ve trong ngay" },
  { group: 5, groupLabel: "Nhóm 5", job: "Thủy sản - Đánh cá biển xa bờ, dài ngày", searchText: "thuy san danh ca bien xa bo dai ngay" },
  { group: 1, groupLabel: "Nhóm 1", job: "Kinh doanh - Giám đốc/Quản lý/Chủ cơ sở kinh doanh", searchText: "kinh doanh giam doc quan ly chu co so kinh doanh" },
  { group: 1, groupLabel: "Nhóm 1", job: "Kinh doanh - Bán hàng online", searchText: "kinh doanh ban hang online" },
  { group: 1, groupLabel: "Nhóm 1", job: "Kinh doanh - Nhân viên kinh doanh, nhân viên bán hàng", searchText: "kinh doanh nhan vien kinh doanh nhan vien ban hang" },
  { group: 2, groupLabel: "Nhóm 2", job: "Kinh doanh - Nhân viên marketing, tiếp thị, giới thiệu sản phẩm", searchText: "kinh doanh nhan vien marketing tiep thi gioi thieu san pham" },
  { group: 2, groupLabel: "Nhóm 2", job: "Kinh doanh - Bán hàng tạp hóa", searchText: "kinh doanh ban hang tap hoa" },
  { group: 2, groupLabel: "Nhóm 2", job: "Kinh doanh - Bán hàng tại sạp, tại chợ", searchText: "kinh doanh ban hang tai sap tai cho" },
  { group: 3, groupLabel: "Nhóm 3", job: "Kinh doanh - Bán hàng rong, vỉa hè", searchText: "kinh doanh ban hang rong via he" },
  { group: 1, groupLabel: "Nhóm 1", job: "Tài chính - Định phí bảo hiểm", searchText: "tai chinh dinh phi bao hiem" },
  { group: 1, groupLabel: "Nhóm 1", job: "Tài chính - Giao dịch viên ngân hàng và các công việc văn phòng khác", searchText: "tai chinh giao dich vien ngan hang va cac cong viec van phong khac" },
  { group: 1, groupLabel: "Nhóm 1", job: "Tài chính - Cố vấn tài chính", searchText: "tai chinh co van tai chinh" },
  { group: 1, groupLabel: "Nhóm 1", job: "Tài chính - Cán bộ, kế toán, kiểm toán, chuyên viên kinh tế", searchText: "tai chinh can bo ke toan kiem toan chuyen vien kinh te" },
  { group: 2, groupLabel: "Nhóm 2", job: "Tài chính - Giám định bảo hiểm", searchText: "tai chinh giam dinh bao hiem" },
  { group: 2, groupLabel: "Nhóm 2", job: "Tài chính - Đại lý bảo hiểm/ Tư vấn tài chính", searchText: "tai chinh dai ly bao hiem tu van tai chinh" },
  { group: 2, groupLabel: "Nhóm 2", job: "Tài chính - Nhân viên tín dụng ngân hàng", searchText: "tai chinh nhan vien tin dung ngan hang" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hàng không - Nhân viên phục vụ mặt đất", searchText: "hang khong nhan vien phuc vu mat dat" },
  { group: 3, groupLabel: "Nhóm 3", job: "Hàng không - Phi công, tiếp viên hàng không, phi hành đoàn (thương mại)", searchText: "hang khong phi cong tiep vien hang khong phi hanh doan thuong mai" },
  { group: 3, groupLabel: "Nhóm 3", job: "Hàng không - Thợ bảo dưỡng, tiếp nhiên liệu, vận chuyển hàng hóa", searchText: "hang khong tho bao duong tiep nhien lieu van chuyen hang hoa" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng không - Lái máy bay cá nhân", searchText: "hang khong lai may bay ca nhan" },
  { group: 2, groupLabel: "Nhóm 2", job: "Đường sắt - Nhân viên gác chắn, nhân viên đường sắt", searchText: "duong sat nhan vien gac chan nhan vien duong sat" },
  { group: 3, groupLabel: "Nhóm 3", job: "Đường sắt - Lái tàu hỏa", searchText: "duong sat lai tau hoa" },
  { group: 3, groupLabel: "Nhóm 3", job: "Đường sắt - Nhân viên phục vụ trên tàu hỏa", searchText: "duong sat nhan vien phuc vu tren tau hoa" },
  { group: 3, groupLabel: "Nhóm 3", job: "Đường sắt - Nhân viên điều khiển tín hiệu, bẻ ghi và chuyển hướng tàu hỏa", searchText: "duong sat nhan vien dieu khien tin hieu be ghi va chuyen huong tau hoa" },
  { group: 5, groupLabel: "Nhóm 5", job: "Đường sắt - Nhân viên tuần đường, sửa đường ray", searchText: "duong sat nhan vien tuan duong sua duong ray" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hàng hải - Quản lý, giám sát", searchText: "hang hai quan ly giam sat" },
  { group: 3, groupLabel: "Nhóm 3", job: "Hàng hải - Thợ đóng tàu vỏ gỗ", searchText: "hang hai tho dong tau vo go" },
  { group: 4, groupLabel: "Nhóm 4", job: "Hàng hải - Thuyền trưởng, thuyền phó, thuyền viên, nhân viên tàu ven biển, tàu cứu hộ", searchText: "hang hai thuyen truong thuyen pho thuyen vien nhan vien tau ven bien tau cuu ho" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Hoa tiêu, thuyền trưởng, thuyền phó, thủy thủ, nhân viên tàu biển lớn, tàu viễn dương", searchText: "hang hai hoa tieu thuyen truong thuyen pho thuy thu nhan vien tau bien lon tau vien duong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Thợ đóng tàu vỏ sắt thép", searchText: "hang hai tho dong tau vo sat thep" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Nhân viên phục vụ hệ thống thông tin Duyên hải Việt Nam", searchText: "hang hai nhan vien phuc vu he thong thong tin duyen hai viet nam" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Khai thác viên hệ thống thông tin Duyên hải Việt Nam", searchText: "hang hai khai thac vien he thong thong tin duyen hai viet nam" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Kỹ thuật viên hệ thống thông tin Duyên hải Việt Nam", searchText: "hang hai ky thuat vien he thong thong tin duyen hai viet nam" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Thuyền viên làm việc trên tàu tìm kiếm cứu nạn, trục vớt tài sản chìm đắm, cứu hộ", searchText: "hang hai thuyen vien lam viec tren tau tim kiem cuu nan truc vot tai san chim dam cuu ho" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Giám sát viên, điều hành viên hệ thống hành hải tàu thuyền", searchText: "hang hai giam sat vien dieu hanh vien he thong hanh hai tau thuyen" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Kỹ thuật viên điều hành hệ thống hành hải tàu thuyền", searchText: "hang hai ky thuat vien dieu hanh he thong hanh hai tau thuyen" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Thuyền viên làm việc trên tàu, ca nô công vụ của cảng vụ hàng hải", searchText: "hang hai thuyen vien lam viec tren tau ca no cong vu cua cang vu hang hai" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Thuyền viên làm việc trên tàu, ca nô phục vụ tiếp tế, kiểm tra hệ thống báo hiệu hàng hải đèn biển, luồng hàng hải; đưa đón hoa tiêu hàng hải", searchText: "hang hai thuyen vien lam viec tren tau ca no phuc vu tiep te kiem tra he thong bao hieu hang hai den bien luong hang hai dua don hoa tieu hang hai" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Kiểm tra tàu, thuyền, công trình thuỷ, báo hiệu hàng hải", searchText: "hang hai kiem tra tau thuyen cong trinh thuy bao hieu hang hai" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Kiểm tra công trình biển", searchText: "hang hai kiem tra cong trinh bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Lắp đặt, bảo dưỡng, sửa chữa phao tiêu, báo hiệu hàng hải", searchText: "hang hai lap dat bao duong sua chua phao tieu bao hieu hang hai" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Quản lý và vận hành các thiết bị báo hiệu hàng hải trên luồng hàng hải, cửa sông, dọc theo các sông có vận tải thuỷ", searchText: "hang hai quan ly va van hanh cac thiet bi bao hieu hang hai tren luong hang hai cua song doc theo cac song co van tai thuy" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Công nhân quản lý, vận hành đèn biển", searchText: "hang hai cong nhan quan ly van hanh den bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Vận hành, bảo dưỡng, sửa chữa ra- đa ở các trạm ra-đa trong hệ thống lưu thông hàng hải trên luồng", searchText: "hang hai van hanh bao duong sua chua ra da o cac tram ra da trong he thong luu thong hang hai tren luong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Công nhân quản lý vận hành luồng hàng hải", searchText: "hang hai cong nhan quan ly van hanh luong hang hai" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hàng hải - Tiếp nhận, truyền phát và xử lý thông tin an ninh, an toàn hàng hải", searchText: "hang hai tiep nhan truyen phat va xu ly thong tin an ninh an toan hang hai" },
  { group: 4, groupLabel: "Nhóm 4", job: "Đường thủy nội địa - Thuyền trưởng, thuyền viên, lái tàu/phà trên sông hồ, kênh, rạch,…", searchText: "duong thuy noi dia thuyen truong thuyen vien lai tau pha tren song ho kenh rach" },
  { group: 5, groupLabel: "Nhóm 5", job: "Đường thủy nội địa - Công nhân quản lý đường thủy nội địa", searchText: "duong thuy noi dia cong nhan quan ly duong thuy noi dia" },
  { group: 5, groupLabel: "Nhóm 5", job: "Đường thủy nội địa - Công nhân khảo sát, duy tu, bảo trì đường thủy nội địa", searchText: "duong thuy noi dia cong nhan khao sat duy tu bao tri duong thuy noi dia" },
  { group: 5, groupLabel: "Nhóm 5", job: "Đường thủy nội địa - Thuyền trưởng, máy trưởng làm việc trên tàu công tác quản lý đường thủy nội địa", searchText: "duong thuy noi dia thuyen truong may truong lam viec tren tau cong tac quan ly duong thuy noi dia" },
  { group: 2, groupLabel: "Nhóm 2", job: "Vận tải - Lái xe con cơ quan, văn phòng", searchText: "van tai lai xe con co quan van phong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Vận tải - Lái xe tang", searchText: "van tai lai xe tang" },
  { group: 3, groupLabel: "Nhóm 3", job: "Vận tải - Lái xe taxi, xe buýt, xe du lịch", searchText: "van tai lai xe taxi xe buyt xe du lich" },
  { group: 3, groupLabel: "Nhóm 3", job: "Vận tải - Lái xe khách (đến 30 chỗ), xe tải hạng nhẹ (dưới 3,5 tấn)", searchText: "van tai lai xe khach den 30 cho xe tai hang nhe duoi 3 5 tan" },
  { group: 3, groupLabel: "Nhóm 3", job: "Vận tải - Nhân viên phụ tàu, phụ xe", searchText: "van tai nhan vien phu tau phu xe" },
  { group: 3, groupLabel: "Nhóm 3", job: "Vận tải - Giáo viên dạy lái xe", searchText: "van tai giao vien day lai xe" },
  { group: 4, groupLabel: "Nhóm 4", job: "Vận tải - Lái xe chuyên dụng (cứu hỏa, cứu thương, cứu hộ, cảnh sát, vệ sinh môi trường, xe chở tiền...)", searchText: "van tai lai xe chuyen dung cuu hoa cuu thuong cuu ho canh sat ve sinh moi truong xe cho tien" },
  { group: 4, groupLabel: "Nhóm 4", job: "Vận tải - Lái xe khách (lớn hơn 30 chỗ), lái xe tải hạng vừa và nặng (từ 3,5 tấn trở lên)", searchText: "van tai lai xe khach lon hon 30 cho lai xe tai hang vua va nang tu 3 5 tan tro len" },
  { group: 4, groupLabel: "Nhóm 4", job: "Vận tải - Lái máy xúc, máy ủi, xe cẩu,…", searchText: "van tai lai may xuc may ui xe cau" },
  { group: 4, groupLabel: "Nhóm 4", job: "Vận tải - Lái xe chở hóa chất, nhiên liệu", searchText: "van tai lai xe cho hoa chat nhien lieu" },
  { group: 5, groupLabel: "Nhóm 5", job: "Vận tải - Lái xe siêu trường, siêu trọng, xe kéo, rơ moóc, container", searchText: "van tai lai xe sieu truong sieu trong xe keo ro mooc container" },
  { group: 1, groupLabel: "Nhóm 1", job: "Báo chí - Nhân viên tòa soạn, hành chính, văn thư, hiệu đính", searchText: "bao chi nhan vien toa soan hanh chinh van thu hieu dinh" },
  { group: 2, groupLabel: "Nhóm 2", job: "Báo chí - Nhà báo, biên tập viên", searchText: "bao chi nha bao bien tap vien" },
  { group: 3, groupLabel: "Nhóm 3", job: "Báo chí - Phóng viên, cộng tác viên báo chí (làm việc trong nước)", searchText: "bao chi phong vien cong tac vien bao chi lam viec trong nuoc" },
  { group: 4, groupLabel: "Nhóm 4", job: "Báo chí - Phóng viên, cộng tác viên báo chí (làm việc tại nước ngoài)", searchText: "bao chi phong vien cong tac vien bao chi lam viec tai nuoc ngoai" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Lãnh đạo, thủ trưởng các cơ quan, Ban giám đốc, Ban quản lý, Ban điều hành", searchText: "hanh chinh van phong lanh dao thu truong cac co quan ban giam doc ban quan ly ban dieu hanh" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Cán bộ quản lý, giám sát, quản đốc, trưởng phòng, phó phòng,…", searchText: "hanh chinh van phong can bo quan ly giam sat quan doc truong phong pho phong" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Lãnh đạo cấp Trung ương hoặc lãnh đạo tỉnh/thành trực thuộc Trung ương", searchText: "hanh chinh van phong lanh dao cap trung uong hoac lanh dao tinh thanh truc thuoc trung uong" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Lễ tân, hướng dẫn viên", searchText: "hanh chinh van phong le tan huong dan vien" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Cán bộ, Nhân viên văn phòng", searchText: "hanh chinh van phong can bo nhan vien van phong" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Thư ký, nhân viên hành chính, văn thư lưu trữ", searchText: "hanh chinh van phong thu ky nhan vien hanh chinh van thu luu tru" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Nhà nghiên cứu khoa học", searchText: "hanh chinh van phong nha nghien cuu khoa hoc" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Kỹ sư làm việc tại văn phòng", searchText: "hanh chinh van phong ky su lam viec tai van phong" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Luật sư", searchText: "hanh chinh van phong luat su" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Thẩm phán", searchText: "hanh chinh van phong tham phan" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Kiểm sát viên, kiểm tra viên", searchText: "hanh chinh van phong kiem sat vien kiem tra vien" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Trợ giúp pháp lý, thư ký tòa án, trợ lý luật sư", searchText: "hanh chinh van phong tro giup phap ly thu ky toa an tro ly luat su" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hành chính, văn phòng - Thu ngân, thủ quỹ", searchText: "hanh chinh van phong thu ngan thu quy" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hành chính, văn phòng - Nhân viên tổng đài", searchText: "hanh chinh van phong nhan vien tong dai" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hành chính, văn phòng - Nhân viên hải quan", searchText: "hanh chinh van phong nhan vien hai quan" },
  { group: 2, groupLabel: "Nhóm 2", job: "Hành chính, văn phòng - Nhà môi giới, broker", searchText: "hanh chinh van phong nha moi gioi broker" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hành chính, văn phòng - Trực tiếp làm hoạt động lưu trữ tại kho, phòng kho lưu trữ, xưởng kỹ thuật bảo quản (nghề độc hại)", searchText: "hanh chinh van phong truc tiep lam hoat dong luu tru tai kho phong kho luu tru xuong ky thuat bao quan nghe doc hai" },
  { group: 1, groupLabel: "Nhóm 1", job: "Hành chính, văn phòng - Nhân viên ngoại giao", searchText: "hanh chinh van phong nhan vien ngoai giao" },
  { group: 1, groupLabel: "Nhóm 1", job: "Quảng cáo - Thiết kế đồ họa, vi tính", searchText: "quang cao thiet ke do hoa vi tinh" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quảng cáo - Thợ vẽ, lắp đặt biển quảng cáo", searchText: "quang cao tho ve lap dat bien quang cao" },
  { group: 4, groupLabel: "Nhóm 4", job: "Quảng cáo - Thợ vẽ, lắp đặt biển quảng cáo ngoài trời, làm việc trên cao", searchText: "quang cao tho ve lap dat bien quang cao ngoai troi lam viec tren cao" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dịch vụ - Nhân viên bán vé, soát vé", searchText: "dich vu nhan vien ban ve soat ve" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên phục vụ hoạt động vui chơi, giải trí, thể thao", searchText: "dich vu nhan vien phuc vu hoat dong vui choi giai tri the thao" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dịch vụ - Phiên dịch viên", searchText: "dich vu phien dich vien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Hướng dẫn viên du lịch", searchText: "dich vu huong dan vien du lich" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên tại trạm xăng", searchText: "dich vu nhan vien tai tram xang" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên hồ bơi, bể bơi", searchText: "dich vu nhan vien ho boi be boi" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Nhân viên cứu hộ ở bãi biển", searchText: "dich vu nhan vien cuu ho o bai bien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên phục vụ buồng, phòng khách sạn", searchText: "dich vu nhan vien phuc vu buong phong khach san" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Nhân viên mát xa, tẩm quất", searchText: "dich vu nhan vien mat xa tam quat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Trông xe", searchText: "dich vu trong xe" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Người giúp việc hoặc ô sin", searchText: "dich vu nguoi giup viec hoac o sin" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên tạp vụ/Lao công", searchText: "dich vu nhan vien tap vu lao cong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên sòng bạc (casino) và các công việc liên quan", searchText: "dich vu nhan vien song bac casino va cac cong viec lien quan" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Thợ cắt tóc, tạo mẫu tóc, gội đầu, làm móng, trang điểm", searchText: "dich vu tho cat toc tao mau toc goi dau lam mong trang diem" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nước sinh hoạt - Nhân viên kỹ thuật", searchText: "dich vu nuoc sinh hoat nhan vien ky thuat" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Nước sinh hoạt - thợ nước, sửa đường ống, xử lý hóa chất, vệ sinh", searchText: "dich vu nuoc sinh hoat tho nuoc sua duong ong xu ly hoa chat ve sinh" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Nhân viên giao hàng, vận chuyển hàng hóa, shipper", searchText: "dich vu nhan vien giao hang van chuyen hang hoa shipper" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dịch vụ - Nhân viên pha chế đồ uống, bartender", searchText: "dich vu nhan vien pha che do uong bartender" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Đầu bếp, phụ bếp, nấu ăn", searchText: "dich vu dau bep phu bep nau an" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Thợ làm bánh", searchText: "dich vu tho lam banh" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Nhân viên phục vụ, bồi bàn", searchText: "dich vu nhan vien phuc vu boi ban" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Công nhân kiểm tra và vận hành thang máy", searchText: "dich vu cong nhan kiem tra va van hanh thang may" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Chủ hiệu cầm đồ và cho vay tiền", searchText: "dich vu chu hieu cam do va cho vay tien" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Thu hồi công nợ, đòi nợ", searchText: "dich vu thu hoi cong no doi no" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Trông trẻ tại nhà", searchText: "dich vu trong tre tai nha" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Xe ôm/xe ôm công nghệ/Xích lô", searchText: "dich vu xe om xe om cong nghe xich lo" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Giặt ủi, giặt là", searchText: "dich vu giat ui giat la" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Thợ sửa chữa xe máy, sửa chữa ô tô", searchText: "dich vu tho sua chua xe may sua chua o to" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Nhân viên điều hành, phục vụ lễ tang", searchText: "dich vu nhan vien dieu hanh phuc vu le tang" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Nhân viên phục vụ an táng (hỏa táng, chôn cất,…)", searchText: "dich vu nhan vien phuc vu an tang hoa tang chon cat" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Bảo vệ (không trang bị vũ khí)", searchText: "dich vu bao ve khong trang bi vu khi" },
  { group: 5, groupLabel: "Nhóm 5", job: "Dịch vụ - Bảo vệ có trang bị vũ khí", searchText: "dich vu bao ve co trang bi vu khi" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dịch vụ - Giám định thương mại", searchText: "dich vu giam dinh thuong mai" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dịch vụ - Giám định tư pháp: Kỹ thuật hình sự, pháp y", searchText: "dich vu giam dinh tu phap ky thuat hinh su phap y" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Thám tử", searchText: "dich vu tham tu" },
  { group: 5, groupLabel: "Nhóm 5", job: "Dịch vụ - Vệ sĩ", searchText: "dich vu ve si" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dịch vụ - Buôn bán, sang chiết, vận chuyển gas, khí đốt", searchText: "dich vu buon ban sang chiet van chuyen gas khi dot" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dịch vụ - Thư pháp, ông đồ", searchText: "dich vu thu phap ong do" },
  { group: 1, groupLabel: "Nhóm 1", job: "Điện - Kỹ sư tư vấn, thiết kế điện", searchText: "dien ky su tu van thiet ke dien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Điện - Giám sát, quản lý, thanh tra ngành điện", searchText: "dien giam sat quan ly thanh tra nganh dien" },
  { group: 3, groupLabel: "Nhóm 3", job: "Điện - Thợ điện dân dụng, thợ lắp đặt hệ thống điện nước", searchText: "dien tho dien dan dung tho lap dat he thong dien nuoc" },
  { group: 2, groupLabel: "Nhóm 2", job: "Điện - Thợ lắp ráp sửa chữa điện tử, điện lạnh, điện gia dụng", searchText: "dien tho lap rap sua chua dien tu dien lanh dien gia dung" },
  { group: 4, groupLabel: "Nhóm 4", job: "Điện - Công nhân, nhân viên vận hành trạm biến áp", searchText: "dien cong nhan nhan vien van hanh tram bien ap" },
  { group: 4, groupLabel: "Nhóm 4", job: "Điện - Công nhân nhà máy điện (nhiệt điện, thủy điện)", searchText: "dien cong nhan nha may dien nhiet dien thuy dien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Điện - Thợ điện, thợ đường dây, công tơ, thợ điện nhà cao tầng", searchText: "dien tho dien tho duong day cong to tho dien nha cao tang" },
  { group: 5, groupLabel: "Nhóm 5", job: "Điện - Cán bộ, nhân viên tại nhà máy điện hạt nhân", searchText: "dien can bo nhan vien tai nha may dien hat nhan" },
  { group: 1, groupLabel: "Nhóm 1", job: "Điện tử, viễn thông - Lập trình viên, quản trị mạng, kỹ thuật viên", searchText: "dien tu vien thong lap trinh vien quan tri mang ky thuat vien" },
  { group: 1, groupLabel: "Nhóm 1", job: "Điện tử, viễn thông - Kỹ sư điện tử, công nghệ thông tin", searchText: "dien tu vien thong ky su dien tu cong nghe thong tin" },
  { group: 2, groupLabel: "Nhóm 2", job: "Điện tử, viễn thông - Công nhân lắp ráp, nhân viên kỹ thuật", searchText: "dien tu vien thong cong nhan lap rap nhan vien ky thuat" },
  { group: 1, groupLabel: "Nhóm 1", job: "Văn hóa, giải trí - Diễn viên, nghệ sĩ", searchText: "van hoa giai tri dien vien nghe si" },
  { group: 1, groupLabel: "Nhóm 1", job: "Văn hóa, giải trí - Dẫn chương trình (MC), phát thanh viên, bình luận viên", searchText: "van hoa giai tri dan chuong trinh mc phat thanh vien binh luan vien" },
  { group: 1, groupLabel: "Nhóm 1", job: "Văn hóa, giải trí - Người mẫu, PG", searchText: "van hoa giai tri nguoi mau pg" },
  { group: 1, groupLabel: "Nhóm 1", job: "Văn hóa, giải trí - Nhà thơ, nhà văn, nhà phê bình", searchText: "van hoa giai tri nha tho nha van nha phe binh" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Đạo diễn, nhà sản xuất phim, sân khấu", searchText: "van hoa giai tri dao dien nha san xuat phim san khau" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Nghệ sĩ đường phố", searchText: "van hoa giai tri nghe si duong pho" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Thợ chụp ảnh, nhiếp ảnh gia, quay phim", searchText: "van hoa giai tri tho chup anh nhiep anh gia quay phim" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Họa sĩ/Nhà điêu khắc", searchText: "van hoa giai tri hoa si nha dieu khac" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Ca sĩ, nhạc sĩ, nhạc công", searchText: "van hoa giai tri ca si nhac si nhac cong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Văn hóa, giải trí - Nhân viên đoàn làm phim", searchText: "van hoa giai tri nhan vien doan lam phim" },
  { group: 3, groupLabel: "Nhóm 3", job: "Văn hóa, giải trí - Thợ xăm hình nghệ thuật", searchText: "van hoa giai tri tho xam hinh nghe thuat" },
  { group: 3, groupLabel: "Nhóm 3", job: "Văn hóa, giải trí - Diễn viên múa, biên đạo múa", searchText: "van hoa giai tri dien vien mua bien dao mua" },
  { group: 3, groupLabel: "Nhóm 3", job: "Văn hóa, giải trí - Nhà ảo thuật", searchText: "van hoa giai tri nha ao thuat" },
  { group: 3, groupLabel: "Nhóm 3", job: "Văn hóa, giải trí - Nhà khảo cổ học", searchText: "van hoa giai tri nha khao co hoc" },
  { group: 5, groupLabel: "Nhóm 5", job: "Văn hóa, giải trí - Diễn viên xiếc, diễn viên đóng thế cảnh nguy hiểm (cascadeur)", searchText: "van hoa giai tri dien vien xiec dien vien dong the canh nguy hiem cascadeur" },
  { group: 1, groupLabel: "Nhóm 1", job: "Y tế - Giám đốc, quản lý cơ sở y tế, khoa, phòng", searchText: "y te giam doc quan ly co so y te khoa phong" },
  { group: 3, groupLabel: "Nhóm 3", job: "Y tế - Kỹ thuật viên y tế", searchText: "y te ky thuat vien y te" },
  { group: 1, groupLabel: "Nhóm 1", job: "Y tế - Nhân viên hành chính, y tá hành chính", searchText: "y te nhan vien hanh chinh y ta hanh chinh" },
  { group: 1, groupLabel: "Nhóm 1", job: "Y tế - Bác sĩ, nha sĩ, dược sĩ", searchText: "y te bac si nha si duoc si" },
  { group: 2, groupLabel: "Nhóm 2", job: "Y tế - Y tá, dược tá, hộ sinh, hộ lý, điều dưỡng", searchText: "y te y ta duoc ta ho sinh ho ly dieu duong" },
  { group: 3, groupLabel: "Nhóm 3", job: "Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên chuyên khoa bệnh tâm thần", searchText: "y te bac si y ta dieu duong nhan vien chuyen khoa benh tam than" },
  { group: 3, groupLabel: "Nhóm 3", job: "Y tế - Nhân viên y tế cơ quan, trường học", searchText: "y te nhan vien y te co quan truong hoc" },
  { group: 3, groupLabel: "Nhóm 3", job: "Y tế - Nhân viên y tế dự phòng, kiểm dịch", searchText: "y te nhan vien y te du phong kiem dich" },
  { group: 4, groupLabel: "Nhóm 4", job: "Y tế - Bác sĩ, y sĩ, y tá, điều dưỡng, nhân viên chuyên khoa truyền nhiễm (lây), lao, HIV, bệnh nhiệt đới", searchText: "y te bac si y si y ta dieu duong nhan vien chuyen khoa truyen nhiem lay lao hiv benh nhiet doi" },
  { group: 4, groupLabel: "Nhóm 4", job: "Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên y tế khoa X-quang, xạ trị", searchText: "y te bac si y ta dieu duong nhan vien y te khoa x quang xa tri" },
  { group: 4, groupLabel: "Nhóm 4", job: "Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên pháp y", searchText: "y te bac si y ta dieu duong nhan vien phap y" },
  { group: 3, groupLabel: "Nhóm 3", job: "Y tế - Bác sĩ, y tá, điều dưỡng, nhân viên y tế Trung tâm cai nghiện, trung tâm giáo dưỡng, trại giam", searchText: "y te bac si y ta dieu duong nhan vien y te trung tam cai nghien trung tam giao duong trai giam" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Hiệu trưởng, hiệu phó", searchText: "giao duc hieu truong hieu pho" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Giáo viên, Giảng viên, Trợ giảng", searchText: "giao duc giao vien giang vien tro giang" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Giáo viên mầm non", searchText: "giao duc giao vien mam non" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Giáo viên thể dục, thể chất", searchText: "giao duc giao vien the duc the chat" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Học sinh, sinh viên", searchText: "giao duc hoc sinh sinh vien" },
  { group: 1, groupLabel: "Nhóm 1", job: "Giáo dục - Trẻ em", searchText: "giao duc tre em" },
  { group: 2, groupLabel: "Nhóm 2", job: "Giáo dục - Gia sư", searchText: "giao duc gia su" },
  { group: 2, groupLabel: "Nhóm 2", job: "Thể thao - Trọng tài, giám sát trận đấu", searchText: "the thao trong tai giam sat tran dau" },
  { group: 2, groupLabel: "Nhóm 2", job: "Thể thao - Huấn luyện viên, vận động viên thể thao (Bóng đá, điền kinh, golf)", searchText: "the thao huan luyen vien van dong vien the thao bong da dien kinh golf" },
  { group: 3, groupLabel: "Nhóm 3", job: "Thể thao - Huấn luyện viên, vận động viên thể thao khác", searchText: "the thao huan luyen vien van dong vien the thao khac" },
  { group: 5, groupLabel: "Nhóm 5", job: "Thể thao - Huấn luyện viên, vận động viên môn thể thao mạo hiểm (Leo núi, đua xe, đua moto nước, đua thuyền, đua ngựa, dù lượn, thể dục dụng cụ, vũ đạo giải trí, boxing, đấu kiếm, patin)", searchText: "the thao huan luyen vien van dong vien mon the thao mao hiem leo nui dua xe dua moto nuoc dua thuyen dua ngua du luon the duc dung cu vu dao giai tri boxing dau kiem patin" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dệt may - thời trang - Cán bộ kỹ thuật, tổ trưởng, giám sát (KCS, QC)", searchText: "det may thoi trang can bo ky thuat to truong giam sat kcs qc" },
  { group: 1, groupLabel: "Nhóm 1", job: "Dệt may - thời trang - Nhà thiết kế thời trang, nghiên cứu phát triển mẫu", searchText: "det may thoi trang nha thiet ke thoi trang nghien cuu phat trien mau" },
  { group: 2, groupLabel: "Nhóm 2", job: "Dệt may - thời trang - Công nhân may, thợ may, thêu, đan", searchText: "det may thoi trang cong nhan may tho may theu dan" },
  { group: 3, groupLabel: "Nhóm 3", job: "Dệt may - thời trang - Công nhân bảo trì sửa chữa máy, chế tạo khuôn mẫu", searchText: "det may thoi trang cong nhan bao tri sua chua may che tao khuon mau" },
  { group: 4, groupLabel: "Nhóm 4", job: "Dệt may - thời trang - Công nhân sợi, dệt, nhuộm, sấy, là", searchText: "det may thoi trang cong nhan soi det nhuom say la" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Thủ kho, quản đốc", searchText: "san xuat thu kho quan doc" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Kỹ sư làm việc tại công trường, xưởng sản xuất", searchText: "san xuat ky su lam viec tai cong truong xuong san xuat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Kỹ thuật viên", searchText: "san xuat ky thuat vien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Giám sát sản xuất, giám sát kỹ thuật", searchText: "san xuat giam sat san xuat giam sat ky thuat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Nhân viên kiểm định, kiểm tra chất lượng sản phẩm (KCS)", searchText: "san xuat nhan vien kiem dinh kiem tra chat luong san pham kcs" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Công nhân kỹ thuật", searchText: "san xuat cong nhan ky thuat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Công nhân lao động (không tiếp xúc với hóa chất)", searchText: "san xuat cong nhan lao dong khong tiep xuc voi hoa chat" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Công nhân lao động có tiếp xúc với hóa chất", searchText: "san xuat cong nhan lao dong co tiep xuc voi hoa chat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Nghệ nhân, thợ thủ công", searchText: "san xuat nghe nhan tho thu cong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Sản xuất - Thợ lắp ráp, thợ máy, thợ cơ khí", searchText: "san xuat tho lap rap tho may tho co khi" },
  { group: 3, groupLabel: "Nhóm 3", job: "Sản xuất - Công nhân in ấn", searchText: "san xuat cong nhan in an" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Lao động tại bến cảng, kho bãi", searchText: "san xuat lao dong tai ben cang kho bai" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Thợ mộc, làm đồ gỗ", searchText: "san xuat tho moc lam do go" },
  { group: 5, groupLabel: "Nhóm 5", job: "Sản xuất - Công nhân nồi hơi", searchText: "san xuat cong nhan noi hoi" },
  { group: 5, groupLabel: "Nhóm 5", job: "Sản xuất - Sản xuất, đóng bao Na2SiF6 (hóa chất Sodium Fluorosilicate)", searchText: "san xuat san xuat dong bao na2sif6 hoa chat sodium fluorosilicate" },
  { group: 5, groupLabel: "Nhóm 5", job: "Sản xuất - Công nhân khuân vác, bốc xếp, vận chuyển, cửu vạn", searchText: "san xuat cong nhan khuan vac boc xep van chuyen cuu van" },
  { group: 3, groupLabel: "Nhóm 3", job: "Sản xuất - Lao động phổ thông", searchText: "san xuat lao dong pho thong" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Thợ tạc đá, điêu khắc đá", searchText: "san xuat tho tac da dieu khac da" },
  { group: 3, groupLabel: "Nhóm 3", job: "Sản xuất - Công nhân vận hành máy móc", searchText: "san xuat cong nhan van hanh may moc" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Công nhân làm gạch, lò nung", searchText: "san xuat cong nhan lam gach lo nung" },
  { group: 3, groupLabel: "Nhóm 3", job: "Sản xuất - Công nhân ngành gốm sứ", searchText: "san xuat cong nhan nganh gom su" },
  { group: 5, groupLabel: "Nhóm 5", job: "Sản xuất - Công nhân nhà máy xi măng", searchText: "san xuat cong nhan nha may xi mang" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Công nhân làm trong ngành thủy tinh", searchText: "san xuat cong nhan lam trong nganh thuy tinh" },
  { group: 4, groupLabel: "Nhóm 4", job: "Sản xuất - Thợ cơ khí, thợ tiện, thợ rèn, thợ gò hàn, thợ cắt", searchText: "san xuat tho co khi tho tien tho ren tho go han tho cat" },
  { group: 5, groupLabel: "Nhóm 5", job: "Sản xuất - Nhân viên chạy thử xe ôtô, môtô (thử tốc độ, va đập)", searchText: "san xuat nhan vien chay thu xe oto moto thu toc do va dap" },
  { group: 1, groupLabel: "Nhóm 1", job: "Xây dựng - Kiến trúc sư, kỹ sư đồ họa", searchText: "xay dung kien truc su ky su do hoa" },
  { group: 1, groupLabel: "Nhóm 1", job: "Xây dựng - Thiết kế nội thất", searchText: "xay dung thiet ke noi that" },
  { group: 2, groupLabel: "Nhóm 2", job: "Xây dựng - Kỹ sư trắc địa, kỹ sư xây dựng", searchText: "xay dung ky su trac dia ky su xay dung" },
  { group: 2, groupLabel: "Nhóm 2", job: "Xây dựng - Chủ thầu xây dựng, giám sát công trình", searchText: "xay dung chu thau xay dung giam sat cong trinh" },
  { group: 3, groupLabel: "Nhóm 3", job: "Xây dựng - Thợ bả, thợ sơn, vecni, đánh bóng, trang trí", searchText: "xay dung tho ba tho son vecni danh bong trang tri" },
  { group: 4, groupLabel: "Nhóm 4", job: "Xây dựng - Thợ sắt, thợ nhôm kính", searchText: "xay dung tho sat tho nhom kinh" },
  { group: 4, groupLabel: "Nhóm 4", job: "Xây dựng - Công nhân khoan cắt bê tông", searchText: "xay dung cong nhan khoan cat be tong" },
  { group: 4, groupLabel: "Nhóm 4", job: "Xây dựng - Thợ xây công trình đường sắt, đường bộ", searchText: "xay dung tho xay cong trinh duong sat duong bo" },
  { group: 4, groupLabel: "Nhóm 4", job: "Xây dựng - Công nhân vận hành máy công trình, khoan, trộn bê tông, cần cẩu,…", searchText: "xay dung cong nhan van hanh may cong trinh khoan tron be tong can cau" },
  { group: 4, groupLabel: "Nhóm 4", job: "Xây dựng - Công nhân cầu đường", searchText: "xay dung cong nhan cau duong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Xây dựng - Công nhân có sử dụng hóa chất, chất nổ", searchText: "xay dung cong nhan co su dung hoa chat chat no" },
  { group: 5, groupLabel: "Nhóm 5", job: "Xây dựng - Thợ xây nhà cửa, thợ nề, phụ hồ", searchText: "xay dung tho xay nha cua tho ne phu ho" },
  { group: 5, groupLabel: "Nhóm 5", job: "Xây dựng - Thợ xây, công nhân xây lắp công trình điện, viễn thông, thông tin liên lạc", searchText: "xay dung tho xay cong nhan xay lap cong trinh dien vien thong thong tin lien lac" },
  { group: 5, groupLabel: "Nhóm 5", job: "Xây dựng - Thợ lắp đặt điều hòa không khí, hệ thống sưởi", searchText: "xay dung tho lap dat dieu hoa khong khi he thong suoi" },
  { group: 5, groupLabel: "Nhóm 5", job: "Xây dựng - Công nhân lau kính, rửa kính nhà cao tầng", searchText: "xay dung cong nhan lau kinh rua kinh nha cao tang" },
  { group: 3, groupLabel: "Nhóm 3", job: "Khai khoáng - Lãnh đạo, quản lý, giám sát", searchText: "khai khoang lanh dao quan ly giam sat" },
  { group: 2, groupLabel: "Nhóm 2", job: "Khai khoáng - Giám sát viên/Quản đốc/Kỹ sư khai thác mỏ làm việc trên mặt đất", searchText: "khai khoang giam sat vien quan doc ky su khai thac mo lam viec tren mat dat" },
  { group: 4, groupLabel: "Nhóm 4", job: "Khai khoáng - Giám sát viên/Quản đốc/Kỹ sư khai thác mỏ làm việc dưới mặt đất", searchText: "khai khoang giam sat vien quan doc ky su khai thac mo lam viec duoi mat dat" },
  { group: 4, groupLabel: "Nhóm 4", job: "Khai khoáng - Công nhân vận hành máy công trình", searchText: "khai khoang cong nhan van hanh may cong trinh" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Công nhân khai thác mỏ", searchText: "khai khoang cong nhan khai thac mo" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Công nhân hầm mỏ, hầm lò", searchText: "khai khoang cong nhan ham mo ham lo" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Vận hành các thiết bị tuyển than bằng phương pháp tuyển nổi, tuyển từ trong nhà máy sàng tuyển than", searchText: "khai khoang van hanh cac thiet bi tuyen than bang phuong phap tuyen noi tuyen tu trong nha may sang tuyen than" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Vệ sinh công nghiệp trong các phân xưởng sửa chữa ô tô, thiết bị khai thác mỏ", searchText: "khai khoang ve sinh cong nghiep trong cac phan xuong sua chua o to thiet bi khai thac mo" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Bảo vệ tài nguyên, ranh giới mỏ than", searchText: "khai khoang bao ve tai nguyen ranh gioi mo than" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Công nhân nạp ắc quy, sửa chữa đèn lò; sửa chữa, cấp phát ắc quy, đèn lò", searchText: "khai khoang cong nhan nap ac quy sua chua den lo sua chua cap phat ac quy den lo" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Công nhân sửa chữa máy bốc rót than nhà máy sàng tuyển than", searchText: "khai khoang cong nhan sua chua may boc rot than nha may sang tuyen than" },
  { group: 5, groupLabel: "Nhóm 5", job: "Khai khoáng - Thủ kho vật liệu nổ công nghiệp", searchText: "khai khoang thu kho vat lieu no cong nghiep" },
  { group: 2, groupLabel: "Nhóm 2", job: "Ngành dầu khí - Cán bộ quản lý, lãnh đạo", searchText: "nganh dau khi can bo quan ly lanh dao" },
  { group: 2, groupLabel: "Nhóm 2", job: "Ngành dầu khí - Kỹ sư, giám sát viên, thanh tra viên", searchText: "nganh dau khi ky su giam sat vien thanh tra vien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Ngành dầu khí - Cán bộ, nhân viên khác, làm việc trên tàu phục vụ", searchText: "nganh dau khi can bo nhan vien khac lam viec tren tau phuc vu" },
  { group: 3, groupLabel: "Nhóm 3", job: "Ngành dầu khí - Nhân viên kho, hậu cần, cấp phát vật tư", searchText: "nganh dau khi nhan vien kho hau can cap phat vat tu" },
  { group: 4, groupLabel: "Nhóm 4", job: "Ngành dầu khí - Cán bộ kỹ thuật, thợ điện, thợ máy làm việc trên tàu phục vụ", searchText: "nganh dau khi can bo ky thuat tho dien tho may lam viec tren tau phuc vu" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Công nhân khai thác mỏ, dàn khoan, công nhân lắp ráp đường ống", searchText: "nganh dau khi cong nhan khai thac mo dan khoan cong nhan lap rap duong ong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Công nhân dầu khí", searchText: "nganh dau khi cong nhan dau khi" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Thuyền trưởng/thuyền viên tàu chở dầu, xà lan chở dầu", searchText: "nganh dau khi thuyen truong thuyen vien tau cho dau xa lan cho dau" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Giám sát kỹ thuật, kỹ sư dầu khí làm việc tại các vùng đầm lầy, sa mạc, hoặc giàn khoan, tàu khoan, tàu dầu, phao rót dầu trên biển", searchText: "nganh dau khi giam sat ky thuat ky su dau khi lam viec tai cac vung dam lay sa mac hoac gian khoan tau khoan tau dau phao rot dau tren bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Cán bộ, công nhân viên ngành dầu khí làm việc tại các vùng đầm lầy, sa mạc, hoặc giàn khoan, tàu khoan, tàu dầu, phao rót dầu trên biển", searchText: "nganh dau khi can bo cong nhan vien nganh dau khi lam viec tai cac vung dam lay sa mac hoac gian khoan tau khoan tau dau phao rot dau tren bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Cán bộ, nhân viên làm việc tại các hệ thống kho chứa, trạm phân phối dầu/khí", searchText: "nganh dau khi can bo nhan vien lam viec tai cac he thong kho chua tram phan phoi dau khi" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành dầu khí - Cán bộ, nhân viên làm việc tại các hệ thống chưng cất, chế biến dầu khí và các sản phẩm hóa dầu", searchText: "nganh dau khi can bo nhan vien lam viec tai cac he thong chung cat che bien dau khi va cac san pham hoa dau" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hạt nhân, phóng xạ - Lãnh đạo, quản lý, giám sát tại các cơ sở hạt nhân, phóng xạ", searchText: "hat nhan phong xa lanh dao quan ly giam sat tai cac co so hat nhan phong xa" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hạt nhân, phóng xạ - Cán bộ, nhân viên tại cơ sở hạt nhân, phóng xạ", searchText: "hat nhan phong xa can bo nhan vien tai co so hat nhan phong xa" },
  { group: 5, groupLabel: "Nhóm 5", job: "Hạt nhân, phóng xạ - Cán bộ, nhân viên tại cơ sở thử nghiệm tương thích điện từ", searchText: "hat nhan phong xa can bo nhan vien tai co so thu nghiem tuong thich dien tu" },
  { group: 4, groupLabel: "Nhóm 4", job: "Tài nguyên - Môi trường - Nhân viên vệ sinh", searchText: "tai nguyen moi truong nhan vien ve sinh" },
  { group: 4, groupLabel: "Nhóm 4", job: "Tài nguyên - Môi trường - Nhân viên cấp thoát nước", searchText: "tai nguyen moi truong nhan vien cap thoat nuoc" },
  { group: 2, groupLabel: "Nhóm 2", job: "Tài nguyên - Môi trường - Công nhân công viên cây xanh", searchText: "tai nguyen moi truong cong nhan cong vien cay xanh" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Công nhân xử lý rác thải, vệ sinh cống rãnh, hầm cầu", searchText: "tai nguyen moi truong cong nhan xu ly rac thai ve sinh cong ranh ham cau" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Khảo sát, đo đạc thành lập bản đồ tài nguyên môi trường biển và hải đảo", searchText: "tai nguyen moi truong khao sat do dac thanh lap ban do tai nguyen moi truong bien va hai dao" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Quan trắc các điều kiện tự nhiên, động lực, môi trường, sinh thái biển", searchText: "tai nguyen moi truong quan trac cac dieu kien tu nhien dong luc moi truong sinh thai bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Khảo sát địa vật lý biển theo tàu (địa chấn, từ biển, trọng lực biển, sonar, điện từ)", searchText: "tai nguyen moi truong khao sat dia vat ly bien theo tau dia chan tu bien trong luc bien sonar dien tu" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Khảo sát địa vật lý, đo carota lỗ khoan, điều tra tài nguyên nước ở vùng núi, rừng sâu, hải đảo, biên giới và trên biển", searchText: "tai nguyen moi truong khao sat dia vat ly do carota lo khoan dieu tra tai nguyen nuoc o vung nui rung sau hai dao bien gioi va tren bien" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Phân tích các thông số môi trường đất, nước, khí, phóng xạ, trầm tích, bùn thải, chất thải nguy hại, chất dioxin/furan, các độc chất khác", searchText: "tai nguyen moi truong phan tich cac thong so moi truong dat nuoc khi phong xa tram tich bun thai chat thai nguy hai chat dioxin furan cac doc chat khac" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Quan trắc tài nguyên nước và các yếu tố thủy văn ở đồng bằng, trung du, vùng sâu, vùng xa hoặc vùng núi, biên giới, hải đảo", searchText: "tai nguyen moi truong quan trac tai nguyen nuoc va cac yeu to thuy van o dong bang trung du vung sau vung xa hoac vung nui bien gioi hai dao" },
  { group: 5, groupLabel: "Nhóm 5", job: "Tài nguyên - Môi trường - Quan trắc tại các khu vực ven biển (đo biến thiên từ ngày đêm, quan trắc nước triều, đo điểm tựa trọng lực, đo câu nối các điểm trắc địa cơ sở phục vụ các dự án điều tra biển)", searchText: "tai nguyen moi truong quan trac tai cac khu vuc ven bien do bien thien tu ngay dem quan trac nuoc trieu do diem tua trong luc do cau noi cac diem trac dia co so phuc vu cac du an dieu tra bien" },
  { group: 2, groupLabel: "Nhóm 2", job: "Ngành công an - Cảnh sát quản lý hành chính, văn phòng", searchText: "nganh cong an canh sat quan ly hanh chinh van phong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Ngành công an - Quản lý trại giam/trung tâm giáo dưỡng", searchText: "nganh cong an quan ly trai giam trung tam giao duong" },
  { group: 3, groupLabel: "Nhóm 3", job: "Ngành công an - Cảnh sát kinh tế, an ninh mạng", searchText: "nganh cong an canh sat kinh te an ninh mang" },
  { group: 4, groupLabel: "Nhóm 4", job: "Ngành công an - Quản giáo, giám thị trại giam/trung tâm giáo dưỡng ", searchText: "nganh cong an quan giao giam thi trai giam trung tam giao duong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành công an - Lính cứu hỏa, cảnh sát phòng cháy chữa cháy", searchText: "nganh cong an linh cuu hoa canh sat phong chay chua chay" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành công an - Cảnh sát hình sự, điều tra tội phạm", searchText: "nganh cong an canh sat hinh su dieu tra toi pham" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành công an - Cảnh sát cơ động", searchText: "nganh cong an canh sat co dong" },
  { group: 5, groupLabel: "Nhóm 5", job: "Ngành công an - Cảnh sát giao thông", searchText: "nganh cong an canh sat giao thong" },
  { group: 4, groupLabel: "Nhóm 4", job: "Ngành công an - Cảnh sát quản lý và bảo vệ tư pháp, cảnh vệ", searchText: "nganh cong an canh sat quan ly va bao ve tu phap canh ve" },
  { group: 3, groupLabel: "Nhóm 3", job: "Quân đội - Sĩ quan quân đội, sĩ quan an ninh", searchText: "quan doi si quan quan doi si quan an ninh" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quân đội - Hành chính văn phòng", searchText: "quan doi hanh chinh van phong" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quân đội - Quân nhân chuyên nghiệp", searchText: "quan doi quan nhan chuyen nghiep" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quân đội - Quân nhân hậu cần - liên lạc", searchText: "quan doi quan nhan hau can lien lac" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quân đội - Công nhân quốc phòng", searchText: "quan doi cong nhan quoc phong" },
  { group: 4, groupLabel: "Nhóm 4", job: "Quân đội - Quân nhân phục vụ trên tàu mặt nước", searchText: "quan doi quan nhan phuc vu tren tau mat nuoc" },
  { group: 2, groupLabel: "Nhóm 2", job: "Quân đội - Quân nhân Hải quân trên bờ (mọi cấp bậc)", searchText: "quan doi quan nhan hai quan tren bo moi cap bac" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Quân nhân phục vụ tàu ngầm", searchText: "quan doi quan nhan phuc vu tau ngam" },
  { group: 4, groupLabel: "Nhóm 4", job: "Quân đội - Không quân: lực lượng phục vụ mặt đất", searchText: "quan doi khong quan luc luong phuc vu mat dat" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Hải quân", searchText: "quan doi hai quan" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Lục quân", searchText: "quan doi luc quan" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Không quân/phi công quân sự", searchText: "quan doi khong quan phi cong quan su" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Quân nhân quân khí, bộ đội đặc công, đặc nhiệm", searchText: "quan doi quan nhan quan khi bo doi dac cong dac nhiem" },
  { group: 5, groupLabel: "Nhóm 5", job: "Quân đội - Bộ đội biên phòng, cảnh sát biển", searchText: "quan doi bo doi bien phong canh sat bien" },
  { group: 4, groupLabel: "Nhóm 4", job: "Quân đội - Quân nhân các binh chủng khác", searchText: "quan doi quan nhan cac binh chung khac" },
  { group: 1, groupLabel: "Nhóm 1", job: "Nghề khác - Tôn giáo, tâm linh - Các chức sắc tôn giáo, cha đạo, nhà sư, nhà chùa, thầy cúng…", searchText: "nghe khac ton giao tam linh cac chuc sac ton giao cha dao nha su nha chua thay cung" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nghề khác - Nội trợ", searchText: "nghe khac noi tro" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nghề khác - Hưu trí", searchText: "nghe khac huu tri" },
  { group: 2, groupLabel: "Nhóm 2", job: "Nghề khác - Reviewer, Streamer, Gamer, YouTuber", searchText: "nghe khac reviewer streamer gamer youtuber" },
  { group: 4, groupLabel: "Nhóm 4", job: "Nghề khác - Lao động tự do, lao động có đào tạo", searchText: "nghe khac lao dong tu do lao dong co dao tao" },
  { group: 5, groupLabel: "Nhóm 5", job: "Nghề khác - Lao động tự do, lao động chưa qua đào tạo", searchText: "nghe khac lao dong tu do lao dong chua qua dao tao" },
  { group: 5, groupLabel: "Nhóm 5", job: "Nghề khác - Thợ lặn", searchText: "nghe khac tho lan" },
  { group: 5, groupLabel: "Nhóm 5", job: "Nghề khác - Thất nghiệp/Không nghề nghiệp", searchText: "nghe khac that nghiep khong nghe nghiep" },
  { group: 5, groupLabel: "Nhóm 5", job: "Nghề khác - Các nghề nghiệp rủi ro không phân loại nơi khác", searchText: "nghe khac cac nghe nghiep rui ro khong phan loai noi khac" },
];
```
