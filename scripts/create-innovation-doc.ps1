$ErrorActionPreference = 'Stop'

$out = Join-Path (Get-Location) 'Sang_kien_Ban_do_thu_nhap_TVV_BVNT_Khanh_Hoa.docx'
$imgOverview = Join-Path (Get-Location) 'public\Template\Tong quan.png'
$imgContest = Join-Path (Get-Location) 'public\Template\Chương trình thi đua.png'
$imgStar = Join-Path (Get-Location) 'public\Template\Sao Viet.png'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.ScreenUpdating = $false
$doc = $word.Documents.Add()
$doc.PageSetup.TopMargin = $word.CentimetersToPoints(2.0)
$doc.PageSetup.BottomMargin = $word.CentimetersToPoints(2.0)
$doc.PageSetup.LeftMargin = $word.CentimetersToPoints(2.8)
$doc.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)
$doc.PageSetup.PaperSize = 7

$normal = $doc.Styles.Item('Normal')
$normal.Font.Name = 'Times New Roman'; $normal.Font.Size = 13
$normal.ParagraphFormat.Alignment = 3; $normal.ParagraphFormat.LineSpacingRule = 1
$normal.ParagraphFormat.LineSpacing = 18; $normal.ParagraphFormat.SpaceAfter = 6

function Add-P([string]$text, [int]$align = 3, [switch]$bold, [int]$size = 13, [int]$before = 0, [int]$after = 6) {
  $p = $doc.Paragraphs.Add(); $p.Range.Text = $text; $p.Alignment = $align
  $p.Range.Font.Name = 'Times New Roman'; $p.Range.Font.Size = $size; $p.Range.Font.Bold = [int]$bold.IsPresent
  $p.Format.FirstLineIndent = [single]$(if ($align -eq 3) { 28.35 } else { 0 })
  $p.Format.SpaceBefore = $before; $p.Format.SpaceAfter = $after; $p.Format.LineSpacingRule = 1; $p.Format.LineSpacing = 18
  $p.Range.InsertParagraphAfter() | Out-Null
}
function Add-H([string]$text, [int]$level = 1) {
  $size = $(if ($level -eq 1) { 15 } elseif ($level -eq 2) { 14 } else { 13 })
  Add-P $text 0 -bold -size $size -before 10 -after 5
}
function Add-Bullets([string[]]$items) {
  foreach ($item in $items) {
    $p = $doc.Paragraphs.Add(); $p.Range.Text = $item; $p.Range.ListFormat.ApplyBulletDefault()
    $p.Range.Font.Name='Times New Roman'; $p.Range.Font.Size=13; $p.Format.SpaceAfter=4; $p.Format.LineSpacingRule=1; $p.Format.LineSpacing=18
  }
}
function Add-Image([string]$path, [string]$caption) {
  if (Test-Path $path) {
    $p=$doc.Paragraphs.Add(); $p.Alignment=1
    $pic=$p.Range.InlineShapes.AddPicture($path); $pic.LockAspectRatio=-1
    if ($pic.Width -gt $word.CentimetersToPoints(15.2)) { $pic.Width=$word.CentimetersToPoints(15.2) }
    Add-P $caption 1 -size 11 -after 8
  }
}
function Add-PageBreak { $doc.Paragraphs.Add().Range.InsertBreak(7) }
function Add-Table([string[]]$headers, [object[]]$rows, [double[]]$widths) {
  $range=$doc.Paragraphs.Add().Range; $table=$doc.Tables.Add($range,$rows.Count+1,$headers.Count)
  $table.Borders.Enable=1; $table.Range.Font.Name='Times New Roman'; $table.Range.Font.Size=11.5
  for($c=1;$c -le $headers.Count;$c++){ $table.Cell(1,$c).Range.Text=$headers[$c-1]; $table.Cell(1,$c).Range.Bold=1; $table.Cell(1,$c).Shading.BackgroundPatternColor=14277081; if($widths){$table.Columns.Item($c).Width=$word.CentimetersToPoints($widths[$c-1])} }
  for($r=0;$r -lt $rows.Count;$r++){ for($c=0;$c -lt $headers.Count;$c++){ $table.Cell($r+2,$c+1).Range.Text=[string]$rows[$r][$c] } }
  $table.Rows.Alignment=1; $table.Range.ParagraphFormat.SpaceAfter=2
  $doc.Paragraphs.Add() | Out-Null
}

# Cover
Add-P 'TỔNG CÔNG TY BẢO VIỆT NHÂN THỌ' 1 -bold -size 14 -after 2
Add-P 'CÔNG TY BẢO VIỆT NHÂN THỌ KHÁNH HÒA' 1 -bold -size 14 -after 30
Add-P 'SÁNG KIẾN' 1 -bold -size 20 -after 12
Add-P 'XÂY DỰNG “BẢN ĐỒ THU NHẬP” – HỆ THỐNG THEO DÕI DOANH THU, MỤC TIÊU VÀ THI ĐUA DÀNH CHO TƯ VẤN VIÊN' 1 -bold -size 18 -after 24
Add-P 'Lĩnh vực: Chuyển đổi số trong quản trị kinh doanh và hỗ trợ lực lượng tư vấn viên' 1 -size 13 -after 22
Add-P 'Tác giả: .............................................................' 0 -size 13 -after 4
Add-P 'Đơn vị công tác: Công ty Bảo Việt Nhân thọ Khánh Hòa' 0 -size 13 -after 4
Add-P 'Chức vụ: ............................................................' 0 -size 13 -after 30
Add-P 'Khánh Hòa, năm 2026' 1 -bold -size 13
Add-PageBreak

Add-P 'MỤC LỤC' 1 -bold -size 16 -after 12
Add-P 'I. Tóm tắt sáng kiến' 0
Add-P 'II. Sự cần thiết và thực trạng trước khi áp dụng' 0
Add-P 'III. Mục tiêu của sáng kiến' 0
Add-P 'IV. Nội dung và giải pháp thực hiện' 0
Add-P 'V. Tính mới và tính sáng tạo' 0
Add-P 'VI. Ý nghĩa và hiệu quả thực tiễn' 0
Add-P 'VII. Khả năng áp dụng và nhân rộng' 0
Add-P 'VIII. Rủi ro và biện pháp kiểm soát' 0
Add-P 'IX. Kế hoạch triển khai và đánh giá' 0
Add-P 'X. Kết luận và kiến nghị' 0
Add-PageBreak

Add-H 'I. TÓM TẮT SÁNG KIẾN'
Add-P 'Sáng kiến xây dựng một nền tảng web tập trung mang tên “Bản đồ thu nhập”, giúp chuyển dữ liệu kinh doanh rời rạc thành thông tin trực quan, dễ hiểu và có thể hành động ngay. Chương trình tự động tổng hợp doanh thu, hợp đồng, tiến độ kế hoạch, xếp hạng nhóm và tư vấn viên (TVV), kết quả ADO, chương trình thi đua, danh hiệu Sao Việt và dữ liệu thưởng. Người dùng có thể xem trên máy tính hoặc điện thoại, lọc đến từng ngày, ban, nhóm, TVV và ADS, đồng thời truy xuất chi tiết hợp đồng khi cần.'
Add-P 'Điểm cốt lõi của sáng kiến không chỉ là số hóa báo cáo. Hệ thống tạo ra một “bản đồ” nối dữ liệu kết quả với mục tiêu và quyền lợi của từng cá nhân. Nhờ đó, TVV biết mình đang ở đâu, còn thiếu bao nhiêu, cần tập trung vào chỉ tiêu nào và có thể đạt quyền lợi gì; trưởng nhóm có căn cứ điều hành; bộ phận quản lý giảm thời gian tổng hợp, đối chiếu và truyền thông.'

Add-H 'II. SỰ CẦN THIẾT VÀ THỰC TRẠNG TRƯỚC KHI ÁP DỤNG'
Add-H '1. Bối cảnh' 2
Add-P 'Hoạt động kinh doanh bảo hiểm nhân thọ phát sinh dữ liệu hằng ngày với nhiều chiều: doanh thu AFYP, phí IP, hợp đồng, trạng thái hồ sơ, ngày thu, đơn vị, nhóm, TVV, người quản lý và các chương trình thi đua. Cùng một thời điểm, lực lượng kinh doanh còn phải theo dõi kế hoạch tháng, quý, năm, điều kiện thưởng, danh hiệu và mốc quyền lợi. Nếu thông tin chỉ tồn tại ở nhiều bảng tính hoặc thông báo riêng lẻ, người dùng khó hình thành một bức tranh thống nhất.'
Add-H '2. Hạn chế của cách làm cũ' 2
Add-Bullets @(
'Dữ liệu nằm ở nhiều file, nhiều biểu mẫu; việc tổng hợp và đối chiếu phụ thuộc nhiều vào thao tác thủ công.',
'Báo cáo thường phản ánh kết quả đã xảy ra nhưng chưa chỉ rõ khoảng cách tới mục tiêu và mức cần thực hiện mỗi ngày.',
'TVV khó tự tra cứu nhanh vị trí xếp hạng, trạng thái hợp đồng, mức thưởng hoặc mốc danh hiệu tiếp theo.',
'Quy tắc chương trình thi đua đa dạng, dễ xảy ra sai khác khi tính thủ công hoặc giải thích bằng văn bản.',
'Trưởng nhóm thiếu một công cụ thống nhất để giao mục tiêu, theo dõi từng TVV và nhận diện người cần hỗ trợ.',
'Việc tạo bảng vàng, ảnh truyền thông và báo cáo định kỳ tốn thời gian; dữ liệu có nguy cơ lỗi thời ngay sau khi xuất.',
'Quản trị truy cập và theo dõi mức độ sử dụng chương trình chưa được lượng hóa đầy đủ.'
)
Add-H '3. Vấn đề cần giải quyết' 2
Add-P 'Cần một giải pháp đơn giản với người dùng cuối nhưng đủ chặt chẽ về dữ liệu: cập nhật nhanh, tính toán nhất quán, hiển thị trực quan, phân quyền phù hợp, hỗ trợ cả vận hành hằng ngày lẫn công tác thi đua – khen thưởng. Giải pháp phải tận dụng được dữ liệu BC02 hiện có và có khả năng mở rộng khi chính sách thay đổi.'

Add-H 'III. MỤC TIÊU CỦA SÁNG KIẾN'
Add-Bullets @(
'Tập trung hóa dữ liệu kinh doanh và tạo một nguồn thông tin dùng chung, hạn chế báo cáo chồng chéo.',
'Giúp TVV tự theo dõi doanh thu, hợp đồng, mục tiêu, thứ hạng, quyền lợi và hành trình Sao Việt.',
'Giúp trưởng nhóm và cán bộ quản lý phát hiện sớm khoảng cách kế hoạch, đưa ra hành động điều hành kịp thời.',
'Tự động hóa các phép tính lặp lại, chuẩn hóa cách xác định kết quả chương trình thi đua và chính sách thưởng.',
'Rút ngắn thời gian tổng hợp, xuất báo cáo, lập bảng vàng và truyền thông nội bộ.',
'Xây dựng nền tảng có thể triển khai trên web, sử dụng thuận tiện trên nhiều thiết bị và có khả năng nhân rộng.'
)

Add-H 'IV. NỘI DUNG VÀ GIẢI PHÁP THỰC HIỆN'
Add-H '1. Mô hình giải pháp' 2
Add-P 'Hệ thống được phát triển theo mô hình ứng dụng web. Dữ liệu CSV/XLSX được kiểm tra, chuẩn hóa và lưu trữ tập trung; lớp nghiệp vụ thực hiện tính toán AFYP, IP, số hợp đồng, tiến độ kế hoạch, xếp hạng, điều kiện thi đua và thưởng; giao diện trình bày kết quả theo vai trò và cho phép truy vấn chi tiết. Luồng BC02 có thể được tự động lấy theo lịch, đồng thời vẫn duy trì chức năng tải file thủ công làm phương án dự phòng.'
Add-Table @('Lớp','Nội dung','Vai trò') @(
  @('Nguồn dữ liệu','BC02, kế hoạch, mục tiêu, Sao Việt, thể lệ thi đua','Cung cấp dữ liệu đầu vào'),
  @('Xử lý nghiệp vụ','Chuẩn hóa, lọc, tổng hợp, tính tiến độ, xếp hạng, xét điều kiện','Bảo đảm cách tính thống nhất'),
  @('Kho dữ liệu','Supabase và kho nội dung quản trị','Lưu trữ tập trung, cập nhật và truy xuất'),
  @('Giao diện','Dashboard web đáp ứng máy tính/điện thoại','Đưa thông tin đến đúng người, đúng thời điểm'),
  @('Quản trị','Tài khoản, lịch sử tải dữ liệu, analytics, kho lưu trữ','Kiểm soát vận hành và cải tiến liên tục')
) @(2.7,8.0,5.0)

Add-H '2. Các tính năng chính' 2
Add-H '2.1. Tổng quan điều hành' 3
Add-Bullets @(
'Hiển thị AFYP, IP, số hợp đồng, số TVV hoạt động và doanh thu trong ngày.',
'So sánh thực hiện với kế hoạch tháng, quý, năm; thể hiện tỷ lệ hoàn thành, phần còn thiếu và mức bình quân cần đạt mỗi ngày.',
'Biểu đồ theo ngày, theo nhóm và theo TVV; bảng xếp hạng hỗ trợ xem nhanh các đơn vị/cá nhân dẫn đầu.',
'Bộ lọc liên thông theo ngày thu, ban, nhóm, TVV và ADS; bấm vào chỉ tiêu để mở danh sách hợp đồng liên quan.'
)
Add-Image $imgOverview 'Hình 1. Giao diện tổng quan – các chỉ tiêu và tiến độ kế hoạch được trực quan hóa.'
Add-H '2.2. Quản lý hợp đồng' 3
Add-P 'Phân loại hồ sơ theo trạng thái như có hiệu lực, chờ xử lý, hoàn phí và các trạng thái nghiệp vụ khác. Hệ thống đồng thời hiển thị số lượng và AFYP của từng nhóm trạng thái, cho phép mở chi tiết để truy vết đến từng hợp đồng. Tính năng này hỗ trợ xử lý tồn đọng và hạn chế bỏ sót hồ sơ cần tác động.'
Add-H '2.3. Theo dõi nhóm, TVV và ADO' 3
Add-P 'Các bảng xếp hạng nhóm và TVV thể hiện doanh thu, số hợp đồng, số người hoạt động, tỷ trọng và mức bình quân. Phân hệ ADO theo dõi kế hoạch và hiệu quả theo phòng kinh doanh/người phụ trách. Người dùng có thể xuất XLSX, tải ảnh bảng vàng hoặc chia sẻ bảng vàng trên thiết bị di động, phục vụ ghi nhận thành tích và truyền thông nhanh.'
Add-H '2.4. Chương trình thi đua' 3
Add-P 'Chương trình cho phép đưa thể lệ/poster thi đua vào hệ thống, cấu hình thời gian và điều kiện, tính kết quả trên dữ liệu hợp đồng, xếp hạng nhóm/TVV/hợp đồng và chỉ rõ trường hợp bị loại cùng nguyên nhân. Việc xác nhận quy tắc trước khi áp dụng tạo dấu vết kiểm soát và giúp các bên hiểu chung một cách tính.'
Add-Image $imgContest 'Hình 2. Phân hệ chương trình thi đua – theo dõi thể lệ, tiến độ và kết quả.'
Add-H '2.5. Sao Việt và bản đồ quyền lợi' 3
Add-P 'Phân hệ Sao Việt tổng hợp AFYP đủ điều kiện, hạng hiện tại, số vé, mốc tiếp theo, số còn thiếu và tỷ lệ tiến độ. Kết hợp với cơ chế ước tính thưởng theo chính sách, hệ thống biến số liệu doanh thu thành thông tin có ý nghĩa trực tiếp với TVV: kết quả hiện tại gắn với quyền lợi có thể đạt được.'
Add-Image $imgStar 'Hình 3. Theo dõi hành trình Sao Việt và khoảng cách tới mốc tiếp theo.'
Add-H '2.6. Đăng ký mục tiêu' 3
Add-P 'Trưởng nhóm có thể đăng ký mục tiêu doanh thu cho nhóm và từng TVV. Khu vực quản trị tổng hợp số nhóm đăng ký, tổng doanh thu mục tiêu, số TVV, lượt hoạt động, tiền thưởng mục tiêu và doanh thu bình quân. Đây là cầu nối giữa cam kết đầu kỳ và kết quả thực hiện hằng ngày.'
Add-H '2.7. Quản trị dữ liệu và người dùng' 3
Add-Bullets @(
'Tải dữ liệu CSV lũy kế; hỗ trợ CSV/XLSX cho dữ liệu Sao Việt; lưu lịch sử tải và người thực hiện.',
'Quản lý danh sách được truy cập bằng Excel/CSV, sinh mật khẩu và phân phạm vi theo nhóm/vai trò.',
'Quản lý sự kiện, kho tài liệu/nội dung và dữ liệu thưởng theo đối tượng, kỳ báo cáo.',
'Theo dõi analytics: số phiên, người dùng, thời lượng theo tab, hành động, thiết bị và cảnh báo người chưa truy cập hoặc không hoạt động 7/30 ngày.'
)

Add-H '3. Quy trình sử dụng điển hình' 2
Add-Table @('Bước','Thao tác','Kết quả') @(
 @('1','Dữ liệu BC02 được tự động lấy hoặc cán bộ phụ trách tải file lũy kế','Dữ liệu mới được kiểm tra và ghi nhận lịch sử'),
 @('2','Hệ thống chuẩn hóa, tổng hợp và áp dụng các quy tắc nghiệp vụ','Tạo chỉ tiêu, trạng thái, xếp hạng và tiến độ'),
 @('3','TVV/trưởng nhóm đăng nhập và chọn kỳ, bộ lọc cần xem','Nhận bức tranh phù hợp với phạm vi công việc'),
 @('4','Người dùng mở chi tiết hoặc xem phần còn thiếu tới mục tiêu','Xác định hành động ưu tiên trong ngày'),
 @('5','Quản lý xuất bảng vàng/báo cáo, theo dõi analytics','Truyền thông, điều hành và cải tiến mức độ sử dụng')
) @(1.4,8.0,6.3)

Add-H 'V. TÍNH MỚI VÀ TÍNH SÁNG TẠO'
Add-Table @('Nội dung đổi mới','Giá trị nổi bật') @(
 @('Từ “báo cáo kết quả” sang “bản đồ hành động”','Không chỉ cho biết đã đạt bao nhiêu mà còn chỉ rõ còn thiếu bao nhiêu và nhịp độ cần thực hiện.'),
 @('Liên kết doanh thu – mục tiêu – quyền lợi','TVV nhìn thấy mối quan hệ trực tiếp giữa hoạt động kinh doanh, thi đua, thưởng và danh hiệu.'),
 @('Một dữ liệu, nhiều góc nhìn','Cùng nguồn dữ liệu được trình bày cho toàn đơn vị, nhóm, TVV, ADO, hợp đồng và chương trình thi đua.'),
 @('Công cụ tính thi đua có thể cấu hình','Thể lệ được chuyển thành quy tắc kiểm tra được; kết quả có lý do đạt/không đạt.'),
 @('Truyền thông tích hợp','Bảng vàng được tạo trực tiếp từ dữ liệu cập nhật, có thể tải ảnh/XLSX và chia sẻ nhanh.'),
 @('Đo lường việc sử dụng','Analytics giúp đánh giá chuyển đổi số bằng hành vi thực tế, không chỉ bằng việc đã cấp tài khoản.')
) @(6.0,9.7)

Add-H 'VI. Ý NGHĨA VÀ HIỆU QUẢ THỰC TIỄN'
Add-H '1. Đối với tư vấn viên' 2
Add-P 'TVV chủ động tra cứu kết quả mà không phải chờ tổng hợp; hiểu rõ hợp đồng nào đang cần xử lý; biết thứ hạng, mục tiêu, mốc thưởng và danh hiệu tiếp theo. Thông tin minh bạch giúp tăng tính tự quản, tạo động lực thi đua tích cực và biến mục tiêu dài hạn thành hành động hằng ngày.'
Add-H '2. Đối với trưởng nhóm và bộ phận kinh doanh' 2
Add-P 'Trưởng nhóm có bức tranh tức thời về mức độ hoạt động, doanh thu, hợp đồng và khoảng cách kế hoạch của từng thành viên. Việc coaching được chuyển từ nhận định cảm tính sang trao đổi dựa trên dữ liệu. Các nhóm yếu, hồ sơ chờ xử lý hoặc TVV cần hỗ trợ được nhận diện sớm hơn.'
Add-H '3. Đối với công tác quản trị' 2
Add-P 'Một nguồn dữ liệu chung làm giảm việc sao chép, ghép bảng, hỏi đáp lặp lại và sai lệch giữa các báo cáo. Lịch sử tải dữ liệu, phạm vi truy cập và analytics tạo nền tảng kiểm soát. Người quản lý có thể tập trung nhiều hơn vào phân tích và hành động thay vì dành thời gian cho thao tác thủ công.'
Add-H '4. Đối với văn hóa tổ chức' 2
Add-P 'Bảng xếp hạng và bảng vàng cập nhật giúp ghi nhận kịp thời; thông tin quyền lợi rõ ràng tạo sự công bằng; dữ liệu dùng chung khuyến khích thói quen làm việc minh bạch. Hệ thống đồng thời góp phần nâng cao năng lực số của lực lượng kinh doanh.'
Add-H '5. Hiệu quả có thể đo lường' 2
Add-Table @('Chỉ số đề xuất','Cách đo','Kỳ vọng đánh giá') @(
 @('Thời gian lập báo cáo','So sánh số giờ/kỳ trước và sau áp dụng','Giảm thao tác tổng hợp thủ công'),
 @('Độ trễ cập nhật','Khoảng thời gian từ lúc có dữ liệu đến lúc hiển thị','Thông tin đến người dùng sớm hơn'),
 @('Sai lệch báo cáo','Số trường hợp phải điều chỉnh/đối chiếu lại','Giảm nhờ một nguồn dữ liệu và quy tắc chung'),
 @('Mức độ sử dụng','Người dùng hoạt động, phiên, thời lượng, tỷ lệ quay lại','Phản ánh mức độ chấp nhận thực tế'),
 @('Hiệu suất xử lý hồ sơ','Số/tỷ lệ hồ sơ chờ xử lý theo thời gian','Phát hiện và tác động sớm'),
 @('Mức hoàn thành kế hoạch','Tỷ lệ hoàn thành tháng/quý/năm theo nhóm, TVV','Đánh giá tác động tới điều hành kinh doanh')
) @(4.0,6.0,5.7)
Add-P 'Lưu ý: Khi lập hồ sơ nghiệm thu, các chỉ tiêu định lượng cần được điền bằng số liệu đo trước–sau trong cùng điều kiện và cùng kỳ so sánh. Không nên quy kết toàn bộ tăng trưởng doanh thu cho riêng chương trình; nên tách rõ tác động hỗ trợ quản trị với các yếu tố thị trường và chính sách.'

Add-H 'VII. KHẢ NĂNG ÁP DỤNG VÀ NHÂN RỘNG'
Add-P 'Giải pháp vận hành trên trình duyệt, không yêu cầu cài ứng dụng riêng cho từng máy. Kiến trúc tách nguồn dữ liệu, lớp tính toán và giao diện nên có thể bổ sung kỳ báo cáo, chính sách thưởng, chương trình thi đua hoặc đơn vị mới. Mô hình có thể nhân rộng cho các công ty thành viên có dữ liệu đầu vào tương đồng, sau khi chuẩn hóa danh mục tổ chức, cấu trúc file và quy tắc phân quyền.'
Add-Bullets @(
'Điều kiện dữ liệu: thống nhất tên cột, mã TVV, đơn vị, trạng thái và kỳ báo cáo.',
'Điều kiện nghiệp vụ: quy tắc thi đua/chính sách phải được đơn vị có thẩm quyền xác nhận trước khi cấu hình.',
'Điều kiện vận hành: phân công người chịu trách nhiệm dữ liệu, người duyệt quy tắc và đầu mối hỗ trợ người dùng.',
'Điều kiện an toàn: quản lý tài khoản theo nguyên tắc tối thiểu cần thiết, bảo vệ thông tin đăng nhập và sao lưu dữ liệu.',
'Điều kiện cải tiến: theo dõi analytics, lấy phản hồi định kỳ và kiểm thử lại khi nguồn dữ liệu hoặc chính sách thay đổi.'
)

Add-H 'VIII. RỦI RO VÀ BIỆN PHÁP KIỂM SOÁT'
Add-Table @('Rủi ro','Biện pháp kiểm soát') @(
 @('File đầu vào thay đổi cấu trúc hoặc sai định dạng','Kiểm tra header, kiểu dữ liệu, kỳ báo cáo; thông báo lỗi rõ ràng; duy trì mẫu file chuẩn.'),
 @('Quy tắc thi đua diễn giải chưa thống nhất','Có bước xem trước, xác nhận quy tắc và lưu lý do loại; đối chiếu mẫu trước khi công bố.'),
 @('Dữ liệu chưa cập nhật hoặc tải nhầm kỳ','Hiển thị thời điểm cập nhật, tháng dữ liệu và lịch sử người tải; cho phép quy trình kiểm tra sau tải.'),
 @('Truy cập vượt phạm vi','Xác thực, danh sách cấp quyền, vai trò và phạm vi nhóm; rà soát tài khoản định kỳ.'),
 @('Người dùng chưa hình thành thói quen','Hướng dẫn ngắn, truyền thông lợi ích, theo dõi nhóm chưa truy cập và hỗ trợ theo analytics.'),
 @('Phụ thuộc hạ tầng trực tuyến','Có phương án tải file/báo cáo dự phòng; theo dõi dịch vụ và sao lưu dữ liệu.')
) @(6.0,9.7)

Add-H 'IX. KẾ HOẠCH TRIỂN KHAI VÀ ĐÁNH GIÁ'
Add-Table @('Giai đoạn','Nội dung') @(
 @('1. Chuẩn hóa','Rà soát nguồn dữ liệu, danh mục, chính sách, vai trò và bộ chỉ số đánh giá.'),
 @('2. Thí điểm','Áp dụng cho một số nhóm; đối chiếu số liệu, ghi nhận lỗi và phản hồi người dùng.'),
 @('3. Hoàn thiện','Điều chỉnh giao diện, quy tắc, cảnh báo; hoàn thiện hướng dẫn và quy trình vận hành.'),
 @('4. Triển khai rộng','Cấp tài khoản, đào tạo ngắn, theo dõi mức độ truy cập và hỗ trợ theo nhóm.'),
 @('5. Đánh giá','Đo thời gian báo cáo, sai lệch, sử dụng, xử lý hồ sơ và mức hoàn thành kế hoạch theo kỳ.')
) @(4.0,11.7)

Add-H 'X. KẾT LUẬN VÀ KIẾN NGHỊ'
Add-P '“Bản đồ thu nhập” là giải pháp chuyển đổi số có tính ứng dụng trực tiếp trong quản trị kinh doanh bảo hiểm nhân thọ. Giá trị của chương trình nằm ở việc đưa dữ liệu đến gần người sử dụng, nối kết kết quả với mục tiêu và quyền lợi, đồng thời chuẩn hóa hoạt động theo dõi hợp đồng, xếp hạng, thi đua và quản trị. Sáng kiến góp phần tiết kiệm thời gian, nâng cao tính minh bạch, hỗ trợ ra quyết định và tạo động lực cho lực lượng TVV.'
Add-P 'Kiến nghị đơn vị tiếp tục hoàn thiện quy trình xác nhận dữ liệu và chính sách, tổ chức đo lường trước–sau bằng các chỉ số đã đề xuất, duy trì đào tạo người dùng và xem xét nhân rộng sau khi giai đoạn thí điểm chứng minh tính ổn định.'

Add-H 'PHỤ LỤC: THÔNG TIN KỸ THUẬT TÓM TẮT'
Add-Bullets @(
'Nền tảng: ứng dụng web Next.js/React, giao diện đáp ứng trên máy tính và thiết bị di động.',
'Trực quan hóa: biểu đồ và bảng chỉ tiêu; hỗ trợ tạo ảnh từ giao diện và xuất dữ liệu XLSX.',
'Dữ liệu: Supabase; nhập CSV/XLSX; có luồng tự động lấy BC02 theo lịch và tải thủ công dự phòng.',
'Nghiệp vụ: các mô-đun tính báo cáo, kế hoạch, thưởng TVV/trưởng nhóm, Sao Việt và engine chương trình thi đua.',
'Kiểm soát: xác thực người dùng/quản trị, phạm vi nhóm, lịch sử tải, nhật ký truy cập và analytics.',
'Bảo trì: các phép tính chính có kịch bản kiểm thử riêng; cấu trúc mô-đun cho phép cập nhật chính sách.'
)
Add-P 'Các nội dung cần đơn vị hoàn thiện trước khi nộp chính thức: tên tác giả, chức vụ, thời gian bắt đầu áp dụng, phạm vi thí điểm, số liệu định lượng trước–sau, xác nhận của đơn vị và tài liệu minh chứng kèm theo.'

# Headers, footers and styles
foreach($section in $doc.Sections){
  $header=$section.Headers.Item(1).Range; $header.Text='SÁNG KIẾN “BẢN ĐỒ THU NHẬP”'; $header.Font.Name='Times New Roman'; $header.Font.Size=9; $header.ParagraphFormat.Alignment=2
  $footer=$section.Footers.Item(1).Range; $footer.ParagraphFormat.Alignment=1
  $footer.Fields.Add($footer,-1,'PAGE') | Out-Null; $footer.Font.Name='Times New Roman'; $footer.Font.Size=10
}
$doc.Styles.Item('Heading 1').Font.Name='Times New Roman'; $doc.Styles.Item('Heading 1').Font.Size=15
$doc.SaveAs2($out,16)
$pages=$doc.ComputeStatistics(2)
$doc.Close(); $word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Output "CREATED=$out"
Write-Output "PAGES=$pages"
