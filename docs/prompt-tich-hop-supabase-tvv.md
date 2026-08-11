# Prompt tích hợp dữ liệu TVV từ Supabase dùng chung

Tài liệu này dùng để giao cho AI/Codex triển khai ở **dự án thứ hai**. Nội dung bám theo schema và công thức đang có trong dự án `dashboard-tvv`.

## Prompt copy/paste

```text
Bạn là senior full-stack engineer. Hãy tích hợp dashboard TVV/Trưởng nhóm vào dự án hiện tại bằng cách đọc dữ liệu từ cùng Supabase với dự án dashboard-tvv.

MỤC TIÊU
1. Hiển thị mục tiêu TVV đăng ký theo tháng.
2. Hiển thị mục tiêu Trưởng nhóm đăng ký/giao cho từng TVV.
3. Tính tiến độ hiện tại của TVV và nhóm.
4. Mô phỏng thu nhập dự kiến.
5. Hiển thị kết quả các chương trình thi đua và chương trình thưởng theo chính sách cho TVV/Trưởng nhóm.

NGUYÊN TẮC BẮT BUỘC
- Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh.
- Tháng đầu vào có dạng YYYY-MM; khi query cột *_month phải đổi thành YYYY-MM-01.
- advisor_code là khóa nghiệp vụ chính của TVV. Chỉ fallback sang tên khi dữ liệu cũ không có mã.
- Không query service_role từ browser. SUPABASE_SERVICE_ROLE_KEY chỉ được dùng trong API/server/Edge Function và không bao giờ có tiền tố NEXT_PUBLIC_.
- Frontend chỉ gọi API backend hoặc dùng anon key với RLS đã giới hạn đúng người/đúng nhóm.
- Mọi truy vấn nhiều bản ghi phải phân trang vì Supabase/PostgREST thường giới hạn 1.000 dòng.
- Không cộng trùng hợp đồng: ưu tiên khóa contract_no; nếu thiếu dùng application_no. Chuẩn hóa khóa bằng trim + uppercase + bỏ khoảng trắng.
- Loại khỏi doanh thu các trạng thái sau khi bỏ dấu, lowercase và gộp khoảng trắng: "hết hiệu lực", "trì hoãn", "từ chối", "YCBH hết hiệu lực", "hoàn phí".
- Không tự suy đoán công thức thi đua. Luôn dùng confirmed_rule; chỉ fallback ai_rule khi confirmed_rule chưa có, và phải gắn cờ needs_review.

NGUỒN DỮ LIỆU
- authorized_users: hồ sơ TVV, nhóm, chức danh, ngày bắt đầu, ngày hiệu lực chức danh.
- tvv_target_registrations: mục tiêu cá nhân, unique(target_month, advisor_code).
- team_target_registrations: mục tiêu nhóm, unique(target_month, group_name); selected_advisors là JSON array gồm advisor_code, full_name, revenue_target.
- revenue_records: hợp đồng/doanh thu thực tế; dùng paid_date để xác định kỳ doanh thu, agent_code để xác định TVV, group_name cho nhóm, afyp/ip cho số tiền.
- tvv_reward_policy_records: KPI04/KPI05 gồm IP, FYP, FYC phục vụ thưởng chính sách.
- competition_programs: chương trình và confirmed_rule/ai_rule.
- competition_results: kết quả tổng mỗi lần tính.
- competition_reward_contracts, competition_reward_advisors, competition_reward_groups: chi tiết thưởng theo hợp đồng/TVV/nhóm.

CHUẨN DOANH THU VÀ TIẾN ĐỘ
- Dùng AFYP làm "doanh thu thực tế" để so với revenue_target.
- IP là KPI riêng, không trộn với AFYP trong cùng một tỷ lệ tiến độ.
- actual_tvv = SUM(revenue_records.afyp) của đúng agent_code, paid_date trong tháng, sau khi loại trạng thái không hợp lệ và loại trùng hợp đồng.
- progress_tvv_percent = CASE WHEN target > 0 THEN ROUND(actual_tvv / target * 100, 0) ELSE 0 END.
- progress_bar_percent = LEAST(100, GREATEST(0, progress_tvv_percent)); vẫn hiển thị progress_tvv_percent thật nếu vượt 100%.
- remaining_tvv = GREATEST(target - actual_tvv, 0).
- target_team = SUM(revenue_target trong selected_advisors); không tin số client gửi lên.
- actual_team = SUM(actual_tvv của các TVV có trong selected_advisors). Nếu dashboard muốn toàn nhóm thì cung cấp thêm actual_whole_team với group_name, đặt tên rõ ràng để không nhầm.
- progress_team_percent = target_team > 0 ? ROUND(actual_team / target_team * 100) : 0.
- active_advisor_actual = COUNT(DISTINCT agent_code) có AFYP > 0 trong kỳ.

ĐĂNG KÝ MỤC TIÊU
- TVV: revenue_target là số nguyên từ 15.000.000 đến 999.000.000, bước 1.000.000; upsert theo target_month,advisor_code.
- Trưởng nhóm: chuẩn hóa selected_advisors tại server; revenue_target = tổng mục tiêu từng TVV; active_advisor_target = số TVV được chọn; upsert theo target_month,group_name.
- reward_target nhóm = ROUND(revenue_target * 0,30 * rate).
- rate theo revenue_target và active_advisor_target:
  + >= 400 triệu: >=5 TVV 30%; 3-4 TVV 28%; 2 TVV 26%; 0-1 TVV 10%.
  + >= 200 triệu: >=5 TVV 26%; 3-4 TVV 22%; 2 TVV 20%; 0-1 TVV 10%.
  + >= 100 triệu: >=5 TVV 22%; 3-4 TVV 20%; 2 TVV 18%; 0-1 TVV 10%.
  + >= 50 triệu: >=5 TVV 20%; 3-4 TVV 18%; 2 TVV 14%; 0-1 TVV 10%.
  + < 50 triệu: >=5 TVV 0%; 3-4 TVV 16%; 2 TVV 14%; 0-1 TVV 10%.

MÔ PHỎNG THU NHẬP TVV
- Hoa hồng khai thác đang mô phỏng theo premium/IP dự kiến: năm 1 = 30%, năm 2 = 15%, năm 3 = 7,5%, năm 4 = 4%; tổng mô phỏng = premium * 56,5%. Phải ghi rõ đây là mô phỏng nhiều năm, không phải tiền nhận ngay trong tháng. Thu nhập năm đầu = premium * 30%.
- Khi chưa có KPI04/KPI05 cho hợp đồng đã thu trong BC02: estimated_fyc = IP * 30%; FYP tạm tính = AFYP nếu có, nếu không dùng IP.
- Khi KPI05 tồn tại cho cùng TVV/tháng thì dùng KPI05 và không cộng KPI04/BC02 cùng TVV/tháng. Nếu không có KPI05, loại BC02 trùng GYC với KPI04.
- Thưởng năng suất tháng TVV: điều kiện tháng trước có ít nhất một GYC IP >= 3 triệu; IP tháng đạt 12/24/50 triệu thì rate lần lượt 10%/15%/18%; reward = total_fyc * rate.
- Thưởng quý TVV theo FYP: 24/60/90/150/250/350/500 triệu tương ứng 8%/10%/13%/15%/18%/20%/25%; reward = total_fyc * rate. Nếu chưa có FYP chính thức, chỉ hiển thị tạm tính và dùng IP làm căn cứ bậc. TVV bắt đầu giữa quý được quy đổi qualification_fyp theo số ngày làm việc còn lại của quý.
- TVV mới trong 12 tháng đầu: IP tháng >= 12 triệu thưởng 1 triệu.
- Thưởng chặng TVV mới: mỗi chặng 3 tháng; IP chặng >= 50 triệu thưởng 3 triệu; riêng chặng 1 đạt 100 triệu cộng thêm 3 triệu. Chỉ ghi nhận phần thưởng khi vừa vượt mốc so với dữ liệu đến tháng trước.
- Tháng 13 TVV: đạt 1/2/3/4 quý thưởng 1/3/5/10 triệu; nếu chỉ đạt 1 quý thì FYP năm phải >= 50 triệu.
- Tổng thu nhập mô phỏng phải tách riêng: commission_year_1, commission_future_years, policy_reward, competition_reward, total_estimated. Không cộng quà hiện vật vào tiền nếu rule không có giá trị tiền.

CHÍNH SÁCH TRƯỞNG NHÓM
- Với chính sách Trưởng nhóm, HĐC = số TVV có tổng IP hợp lệ theo ngày thu trong kỳ > 12 triệu (điều kiện là >, không phải >=); không bắt buộc hợp đồng đã phát hành. Doanh thu tháng/quý/năm của Trưởng nhóm cũng gom theo ngày thu để đồng bộ với tổng quan nhóm.
- Thưởng phát triển tháng = total_fyc * rate; rate dùng đúng bảng mục tiêu nhóm ở trên theo IP tháng và HĐC.
- Thưởng tuyển luyện tháng không phụ thuộc thâm niên hay ngày hiệu lực chức vụ của Trưởng nhóm. Đếm TVV mới HĐC còn trong 12 tháng đầu, đang hoạt động và thuộc trực tiếp nhóm tại cuối tháng; không so sánh ngày TVV bắt đầu với ngày hiệu lực chức vụ của Trưởng nhóm. 1/2/từ 3 TVV mới HĐC tương ứng tỷ lệ 100%/125%/150%. Tổng thưởng TVV mới tại tháng xét = thưởng tháng TVV mới phát sinh riêng trong tháng xét + thưởng chặng vừa đạt trong tháng xét. Thưởng tháng không cộng các tháng trước; thưởng chặng dùng IP lũy kế trong chặng nhưng chỉ ghi nhận tại tháng TVV lần đầu chạm mốc. Thưởng tuyển luyện = tổng thưởng TVV mới tại tháng xét * tỷ lệ.
- Thưởng tuyển dụng quý: IP quý < 150 triệu hoặc không có TVV mới đủ điều kiện thì 0%; nếu không có TVV mới nhưng IP >=150 triệu thì 4%; nếu có TVV mới thì 150/270/450/600 triệu tương ứng 9%/14%/18%/22%. reward = FYC quý * rate.
- TVV mới đủ điều kiện tuyển dụng: trong năm đầu kể từ start_date, có hợp đồng hiệu lực phát hành từ start_date và IP > 12 triệu.
- Thưởng năm Trưởng nhóm: mỗi quý IP >= 150 triệu được tính đạt; đạt 1/2/3/4 quý thưởng 3/6/10/20 triệu; nếu chỉ đạt 1 quý thì FYP năm phải >= 300 triệu.
- Trưởng nhóm mới trong 12 tháng chức vụ đầu tiên: HĐC >=2 và FYP/AFYP nhóm tháng lấy trực tiếp từ BC02 >=45 triệu, không dùng KPI04/KPI05. Riêng khoản thưởng này, mỗi TVV có tổng IP theo ngày thu trong tháng >12 triệu được tính 1 lượt HĐC, không bắt buộc hợp đồng đã phát hành. HĐC=2 thưởng 3 triệu; HĐC=3 thưởng 3 triệu ở 45-<55 triệu, 5 triệu từ 55 triệu; HĐC>=4 thưởng 5 triệu ở 45-<85 triệu, 8 triệu từ 85 triệu. Tháng hiệu lực chức vụ được tính là tháng 1; tháng trùng tháng kỷ niệm 12 tháng không còn thuộc kỳ thưởng.

CHƯƠNG TRÌNH THI ĐUA
- Chỉ lấy chương trình không bị ẩn và có kỳ hiệu lực giao với tháng được chọn.
- Lấy lần competition_results mới nhất theo calculated_at cho mỗi program_id, rồi lấy các bảng chi tiết theo result_id đó.
- Với TVV, lọc competition_reward_advisors theo mã/tên đã chuẩn hóa và competition_reward_contracts theo tvv. Với Trưởng nhóm, lọc competition_reward_groups theo team/group_name và có thể kèm danh sách advisor trong nhóm.
- Nếu người dùng nhập hợp đồng dự kiến, chạy cùng rule engine với dữ liệu thật + draft; incremental_reward = max(projected_reward - current_reward, 0). Không ghi draft vào bảng dữ liệu thật.

PHÂN QUYỀN
- TVV chỉ đọc mục tiêu, hợp đồng, chính sách và thưởng của chính advisor_code.
- Trưởng nhóm chỉ đọc các TVV thuộc group_name mình quản lý.
- Admin mới được đọc toàn bộ hoặc xóa/sửa dữ liệu người khác.
- Không cho client tự truyền advisor_code/group_name rồi tin giá trị đó; backend phải suy ra scope từ phiên đăng nhập.

API CẦN TẠO
- GET /api/tvv/targets?month=YYYY-MM
- GET /api/tvv/progress?month=YYYY-MM
- POST /api/tvv/income-simulation
- GET /api/team/targets?month=YYYY-MM
- GET /api/team/progress?month=YYYY-MM
- GET /api/rewards/policy?month=YYYY-MM
- GET /api/rewards/competitions?month=YYYY-MM

Mỗi response phải có: period, identity/scope, target, actual_afyp, actual_ip, percent, remaining, updated_at, data_quality_warnings. Tiền là number theo VND; chỉ format vi-VN ở UI.

YÊU CẦU TRIỂN KHAI
1. Trước khi code, kiểm tra schema thực tế và báo cột/bảng thiếu.
2. Tạo lớp repository/server-only dùng Supabase; không gọi trực tiếp các bảng nhạy cảm từ component client.
3. Tách hàm chuẩn hóa trạng thái, dedupe hợp đồng và công thức thưởng thành pure functions có unit test.
4. Test tối thiểu các biên: target=0, vượt 100%, đúng/sát dưới từng mốc, trạng thái có dấu/không dấu, trùng contract_no, thiếu FYP, TVV mới giữa quý, chương trình chưa có confirmed_rule.
5. Nếu phát hiện công thức khác dữ liệu/rule đã xác nhận trong Supabase, không tự sửa số; trả warning và nêu rõ nguồn xung đột.
```

## Cách kết nối Supabase ở dự án thứ hai

Biến môi trường server:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
```

Client server-only cho Next.js:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
```

Ví dụ đọc mục tiêu và doanh thu TVV trong một tháng:

```ts
const month = "2026-07";
const monthStart = `${month}-01`;
const monthEnd = "2026-07-31"; // nên sinh bằng hàm monthBounds

const [{ data: target }, { data: rows }] = await Promise.all([
  supabaseAdmin
    .from("tvv_target_registrations")
    .select("target_month,advisor_code,advisor_name,revenue_target,updated_at")
    .eq("target_month", monthStart)
    .eq("advisor_code", advisorCode)
    .maybeSingle(),
  supabaseAdmin
    .from("revenue_records")
    .select("contract_no,application_no,agent_code,paid_date,policy_status,afyp,ip")
    .eq("agent_code", advisorCode)
    .gte("paid_date", monthStart)
    .lte("paid_date", monthEnd)
]);
```

Ví dụ đọc chương trình và kết quả mới nhất nên thực hiện ở backend: đọc `competition_programs`, lấy `competition_results` theo `program_id` và `calculated_at desc`, chọn một dòng mới nhất, sau đó query ba bảng chi tiết bằng `result_id`. Không cộng tất cả các lần chạy vì sẽ nhân đôi kết quả.

## Kiến trúc khuyến nghị

An toàn nhất là dự án nguồn cung cấp API/read-only RPC đã tính sẵn. Dự án thứ hai chỉ nhận DTO kết quả, nhờ đó hai nơi không lặp công thức và không cần chia sẻ `service_role` rộng rãi. Nếu cả hai dự án cùng đọc bảng trực tiếp, hãy bật RLS và viết policy theo danh tính Supabase Auth/JWT; hệ đăng nhập cookie tùy biến của dự án hiện tại không tự động trở thành danh tính để RLS nhận biết.

## Điểm cần chốt trước khi đưa vào production

Mã hiện tại có hai cách dùng chỉ số cho tiến độ: tiến độ tổng ưu tiên AFYP, trong khi một màn hình theo dõi từng TVV ưu tiên IP. Tài liệu này chuẩn hóa **AFYP = doanh thu**, **IP = KPI riêng**. Nếu nghiệp vụ thực tế muốn lấy IP làm doanh thu mục tiêu, hãy đổi đồng bộ cả API, UI và test; không dùng biểu thức `afyp ?? ip` vì giá trị AFYP bằng 0 khác với AFYP bị thiếu.

Ngoài ra, nếu repository hoặc lịch sử Git từng chứa khóa `service_role`, cần thu hồi/rotate khóa trong Supabase Dashboard và xóa khóa khỏi file mẫu/lịch sử phù hợp. Chỉ đổi nội dung file mà không rotate thì khóa cũ vẫn còn hiệu lực.
