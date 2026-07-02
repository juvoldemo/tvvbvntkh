# TỔNG HỢP CÁCH TÍNH HIỆN TẠI

Tài liệu này được lập từ source code hiện tại của web tại `d:\Project\minhhoa2`. Mục tiêu là ghi lại logic tính toán đang chạy, không thay đổi hay refactor code.

Lưu ý kỹ thuật: nhiều chuỗi tiếng Việt trong source đang hiển thị dạng lỗi encoding/mojibake, ví dụ trong `script.js`, `addon-stbh-validator.js`, `addonBenefitSummaryService.js`, `occupation-data.js`, `addon-stbh-rules.md`. Tài liệu dưới đây diễn giải lại theo ý nghĩa nghiệp vụ suy ra từ tên biến, công thức và ngữ cảnh UI.

## 1. Tổng quan hệ thống

Web hiện tại là web tĩnh chạy bằng `index.html`, `styles.css`, `script.js` và một số file dữ liệu/dịch vụ JS. Không thấy framework build như React/Vue/Angular, không có `package.json`.

Các nhóm số liệu đang tính:

- Minh họa sản phẩm chính `An Tâm Hoạch Định`: phí đóng, phí phân bổ ban đầu, phí quản lý hợp đồng, phí rủi ro tử vong, phí rủi ro thương tật toàn bộ vĩnh viễn, giá trị tài khoản, giá trị hoàn lại, thưởng duy trì hợp đồng.
- So sánh giá trị hoàn lại theo hai lãi suất minh họa: `4.76%` và `4.25%`.
- Số tiền bảo hiểm tử vong hợp lệ theo phí năm, tuổi, giới tính.
- Số tiền bảo hiểm thương tật toàn bộ vĩnh viễn tự động theo phí năm và STBH tử vong.
- Phí và STBH hợp lệ cho sản phẩm bán kèm: `R21`, `R22`, `R23`, `R24`, `R25`, `R26`, `R29`.
- Tổng phí SPBK, tổng phí kế hoạch năm đầu, số tiền cần tiết kiệm mỗi ngày.
- Tóm tắt JPG phương án và JPG chi tiết quyền lợi SPBK.

Sản phẩm/chức năng chính:

- Tab `Minh họa SPC`: nhập thông tin khách hàng và sản phẩm chính, bấm `Tạo bảng minh họa`, xem bảng giá trị hoàn lại.
- Tab `Sản phẩm bán kèm`: chọn SPBK, nhập/chọn STBH hoặc gói quyền lợi, xem phí năm, tổng phí, quyền lợi chi tiết, PDF điều khoản.
- Chức năng lưu phương án SPBK vào `localStorage`.
- Chức năng xuất tóm tắt JPG và chia sẻ qua Web Share API nếu trình duyệt hỗ trợ.

Luồng nhập liệu chính:

Người dùng nhập `index.html` form `#illustrationForm` -> `script.js` bắt sự kiện input/submit -> validate HTML5 và validate custom STBH tử vong -> `readInput()` gom input -> `buildComparableIllustration()` gọi `generateIllustration()` hai lần với lãi suất `4.76%` và `4.25%` -> `renderResults()` hiển thị bảng.

File chính liên quan tính toán:

- `script.js`: toàn bộ logic tính sản phẩm chính, SPBK, render kết quả, export JPG.
- `addon-stbh-validator.js`: validate khoảng STBH SPBK theo sản phẩm chính, tuổi, quan hệ, phí chính.
- `addonBenefitSummaryService.js`: dựng bảng quyền lợi SPBK và render thành canvas/JPG cho trang tóm tắt phụ.
- `occupation-data.js`: danh mục nghề nghiệp và nhóm nghề lấy từ `icons/danhmucnghenghiep new.xlsx`.
- `index.html`: khai báo input, bảng kết quả, popup, preview export.
- `SPBK_QUYEN_LOI_CHI_TIET_CODEX.md`: nguồn tham chiếu quyền lợi SPBK khi xuất tóm tắt phụ.
- `SPBK_PDF/R21.pdf` đến `SPBK_PDF/R29.pdf`: file điều khoản mở/tải từ UI.

## 2. Danh sách input đầu vào

| Input | Biến/id trong code | Ý nghĩa nghiệp vụ | Kiểu dữ liệu | Mặc định | Điều kiện hợp lệ | File xử lý |
|---|---|---|---|---|---|---|
| Họ tên | `fullName` | Tên khách hàng/BMBH/NĐBH trong minh họa | string | `Nguyễn Hoàng Vũ` trong HTML | `required`; khi focus nếu còn giá trị mẫu thì xóa | `index.html`, `script.js/readInput`, `buildSummarySnapshot` |
| Ngày sinh | `dateOfBirth` | Căn cứ tính tuổi bảo hiểm | string `dd/mm/yyyy` | rỗng | `required`; `parseDateInput()` phải parse được ngày thật; input mask tối đa 8 chữ số | `script.js/parseDateInput`, `calculateAge`, `applyDateOfBirthMask` |
| Tuổi hiện tại | `currentAge` | Hiển thị tuổi tính từ ngày sinh | readonly string/number | `-` | Tự tính, không nhập tay | `script.js/updateAgePreview` |
| Giới tính | `gender` | Chọn bảng phí/rủi ro nam/nữ | string | `Nam` | `Nam` hoặc `Nữ` từ select/button | `script.js/getGenderKey`, `getRiskRates`, `calculateRiderPremium` |
| Nhóm nghề | `occupationGroup` | Nhóm rủi ro nghề nghiệp cho SPBK | number 1-6 | `1` | Tự set theo nghề; nếu không chọn nghề đúng thì về nhóm 1 và hiện cảnh báo | `occupation-data.js`, `script.js/handleOccupationInput` |
| Nghề nghiệp | `occupationJob` | Tìm nghề để xác định nhóm nghề | string | rỗng | Nên chọn đúng item từ `OCCUPATION_JOBS` | `script.js/filterJobs`, `findExactOccupationJob` |
| Định kỳ đóng phí | `paymentMode` | Quy đổi phí SPBK theo kỳ | string | `yearly` | `yearly`, `halfYearly`, `quarterly`, `monthly` | `script.js/PAYMENT_MODE_FACTOR` |
| Phí bảo hiểm cơ bản năm | `annualPremium` | Phí cơ bản sản phẩm chính | money number | `20,000,000` | `required`; dùng để tính STBH tử vong min/max, TTTBVV, tài khoản, R24 | `script.js/readInput`, `getDeathSumAssuredRange` |
| Phí đóng thêm | `additionalPremium` | Phí đóng thêm vào tài khoản bổ sung | money number | rỗng = 0 | Không thấy validate min/max riêng | `script.js/generateIllustration` |
| STBH tử vong | `deathSumAssured` | Quyền lợi tử vong sản phẩm chính | money number | `500,000,000` | Trong khoảng `max(50tr, 5 x annualPremium)` đến `min(25 tỷ, annualPremium x maxFactor)` | `script.js/getDeathSumAssuredRange`, `updateDeathSumAssuredRange` |
| STBH TTTBVV | `disabilitySumAssured` | Quyền lợi thương tật toàn bộ vĩnh viễn | readonly money number | tự tính | `min(deathBenefit, maxTTTBVV)` | `script.js/calculateDisabilitySumAssured` |
| Thời hạn đóng phí | `premiumPaymentYears` | Số năm dự kiến đóng phí | number | `10` | HTML `required`, pattern số, tối đa 2 chữ số; khi tính bị chặn bởi tuổi tối đa 68 | `script.js/getEffectivePremiumPaymentYears` |
| Thời hạn minh họa | `illustrationYears` | Số năm chạy bảng minh họa | number | `20` | HTML `required`, pattern số, tối đa 2 chữ số | `script.js/generateIllustration` |
| Lãi suất | `interestRate` | Lãi suất minh họa chính | readonly string/number | `4.76` | Trong code cố định `fixedIllustrationInterestRate / 100` | `script.js/readInput` |
| SPBK đang chọn | `riderState.activeCode` | Sản phẩm bán kèm đang xem/chỉnh | string | `R21` | Nằm trong `VISIBLE_SPBK_PRODUCT_CODES` và được phép theo nghề | `script.js/riderState` |
| Trạng thái SPBK | `riderState.selections[code].selected/enabled` | Đã chọn và có tính phí hay chưa | boolean | false | Không có lỗi phí/STBH; không bị nghề cấm | `script.js/renderRiderUI` |
| STBH SPBK | `selection.sumInsured`, `riderAmountInput`, `riderAmountRange` | STBH các SPBK nhập tay | number | min của sản phẩm | Theo `AddonStbhRules` và nghề nghiệp | `script.js/getRiderStbhRange`, `addon-stbh-validator.js` |
| Thời hạn R24 | `selection.term`, `riderTerm` | Thời hạn hỗ trợ đóng phí R24 | number | `10` | Chỉ chọn `10`, `15`, `20` | `script.js/renderR24Controls`, `calculateRiderPremium` |
| Gói R26 | `selection.r26Plan` | Chương trình chăm sóc sức khỏe | string | `Vàng` | Một trong 5 gói: Bạc, Vàng, Bạch Kim, Kim Cương, Lục Bảo | `script.js/R26_PLANS`, `addon-stbh-validator.js` |
| Quyền lợi R26 | `selection.r26Benefits` | Quyền lợi nội trú/ngoại trú/nha khoa/thai sản | array string | `["inpatient"]` | Phải nằm trong `R26_PLAN_BENEFITS[plan]`; thai sản chỉ áp dụng nữ 18-45 khi tính phí | `script.js/normalizeR26Selection`, `getR26Rate` |

## 3. Logic tính sản phẩm chính

Sản phẩm chính được hard-code tên trong export là `An Tâm Hoạch Định`. Logic chính nằm trong `script.js/generateIllustration(input)`.

### Điều kiện STBH tử vong

Hàm `getDeathSumAssuredMaxFactor(age, gender)` dùng bảng hệ số theo tuổi và giới tính. Hàm `getDeathSumAssuredRange(annualPremium, age, gender)` trả:

- STBH tối thiểu = `max(50,000,000; annualPremium x 5)`.
- STBH tối đa = `min(25,000,000,000; annualPremium x maxFactor)`.
- `maxFactor` theo tuổi/giới tính, ví dụ tuổi <= 4: nam 45, nữ 50; tuổi <= 30: nam 50, nữ 55; tuổi cao nhất dùng nam 10, nữ 15.

`updateDeathSumAssuredRange()` set `setCustomValidity()` nếu STBH tử vong ngoài khoảng.

### STBH thương tật toàn bộ vĩnh viễn

`calculateDisabilitySumAssured(annualBasicPremium, deathBenefit)`:

- Nếu phí năm < 30,000,000: trần TTTBVV = 300,000,000.
- Nếu phí năm >= 30,000,000: trần TTTBVV = `min(annualBasicPremium x 10, 2,000,000,000)`.
- STBH TTTBVV = `min(deathBenefit, trần TTTBVV)`.

### Phí phân bổ ban đầu

`getInitialFeeRate(policyYear)`:

- Năm 1: `50%`.
- Năm 2: `30%`.
- Năm 3-5: `20%`.
- Năm 6-10: `2%`.
- Từ năm 11: `0%`.

Trong `generateIllustration()`:

- `initialFee = annualBasePremium x initialFeeRate`.
- `investmentPremium = annualBasePremium - initialFee`.
- Phí đóng thêm có tỷ lệ phí phân bổ `additionalPremiumAllocationFeeRate = 0`, nên `additionalInvestmentPremium = additionalPremium`.
- Cả phí cơ bản đầu tư và phí đóng thêm đầu tư chỉ được nạp vào tháng 1 của mỗi năm hợp đồng.

### Phí quản lý hợp đồng

`getPolicyManagementFee(policyYear)`:

- Phí năm = `min(365,000 + (policyYear - 1) x 12,000; 840,000)`.
- Phí tháng = phí năm / 12.
- `deductFromAccounts()` trừ từ tài khoản cơ bản trước, thiếu thì trừ tài khoản đóng thêm.

### Phí rủi ro tử vong và TTTBVV

`riskRateTable` có tuổi 0-89, cột `maleDeath`, `femaleDeath`, `maleDisability`, `femaleDisability`. `getRiskRates(age, gender)` lấy tỷ lệ theo tuổi và giới tính; nếu không có tuổi thì trả 0.

Mỗi tháng:

- `narBase = max(basicAccountStartOfMonth, 0)`.
- `narDeath = max(deathSumAssured - narBase, 0)`.
- `narDisability = max(disabilitySumAssured - narBase, 0)`.
- `riskFeeDeath = narDeath x deathRate / 1000 / 12`.
- `riskFeeDisability = narDisability x disabilityRate / 1000 / 12`.
- `totalRiskFee = riskFeeDeath + riskFeeDisability`.
- Phí rủi ro cũng trừ từ tài khoản cơ bản trước, sau đó tài khoản đóng thêm.

### Lãi suất và giá trị tài khoản

`generateIllustration()` chuyển lãi suất năm thành lãi suất tháng:

`monthlyInterestRate = (1 + interestRate)^(1/12) - 1`.

Sau khi trừ phí quản lý và phí rủi ro:

- `basicInterest = basicAccountBeforeInterest x monthlyInterestRate`.
- `additionalInterest = additionalAccountBeforeInterest x monthlyInterestRate`.
- `basicAccountBeforeBonus = max(basicAccountBeforeInterest + basicInterest, 0)`.
- `additionalAccountBeforeBonus = max(additionalAccountBeforeInterest + additionalInterest, 0)`.

Tài khoản thưởng duy trì hợp đồng:

- `bonusAccountEndOfMonth = bonusAccountStartOfMonth x (1 + monthlyInterestRate) + loyaltyBonus`.
- `accountValueEndOfMonth = basicAccountBeforeBonus + additionalAccountBeforeBonus + bonusAccountEndOfMonth`.

### Thưởng duy trì hợp đồng

`loyaltyBonusPolicyYears = [5, 10, 15, 20]`.

`calculateLoyaltyBonus(policyYear, yearEndValuesBeforeBonus, effectivePremiumPaymentYears, loyaltyRate = 0.01)`:

- Chỉ xét năm 5, 10, 15, 20.
- Chỉ trả nếu `policyYear <= effectivePremiumPaymentYears`.
- Lấy trung bình 5 giá trị tài khoản cuối năm trước thưởng gần nhất, nhân `1%`.
- Nếu chưa đủ 5 năm giá trị thì thưởng = 0.

### Thời hạn đóng phí hiệu lực

`getEffectivePremiumPaymentYears(initialAge, premiumPaymentYears)`:

- `maxPaymentYearsByAge = 68 - initialAge`.
- `effectivePremiumPaymentYears = max(min(premiumPaymentYears, maxPaymentYearsByAge), 0)`.
- Sau thời hạn này, `annualBasePremium` và `additionalPremiumThisYear` bằng 0.

### Giá trị hoàn lại

`getSurrenderFeeRate(policyYear)`:

- Năm 1: `100%` phí năm.
- Năm 2: `100%` phí năm.
- Năm 3: `45%` phí năm.
- Năm 4: `40%` phí năm.
- Năm 5: `20%` phí năm.
- Từ năm 6: `0%`.

Trong kết quả năm:

`surrenderFee = annualPremium x getSurrenderFeeRate(policyYear)`.

`cashValue = max(basicAccountValue - surrenderFee, 0) + additionalAccountValue + bonusAccountValue`.

### Kết quả từng năm

`generateIllustration()` gom 12 tháng thành 1 dòng năm với các output:

- `policyYear`, `age`, `yearAge`.
- `cumulativePremium`: tổng phí cơ bản + phí đóng thêm đã nộp.
- `cumulativeInvestmentPremium`: tổng phí đã phân bổ vào tài khoản.
- `riskFee`, `riskFeeDeath`, `riskFeeDisability`.
- `accountValue`, `cashValue`.
- `basicAccountValue`, `additionalAccountValue`, `bonusAccountValue`.
- `policyManagementFee`, `investmentPremium`, `initialFee`, `additionalPremiumFee`, `additionalInvestmentPremium`, `loyaltyBonus`.

`buildComparableIllustration(input)` chạy `generateIllustration()` với `interestRate = 4.76%` và `4.25%`, rồi gắn `cashValue476` và `cashValue425` theo từng năm.

## 4. Logic tính sản phẩm bổ trợ

Danh sách hiển thị nằm ở `VISIBLE_SPBK_PRODUCT_CODES = ["R21", "R22", "R23", "R24", "R25", "R26", "R29"]`. `R27`, `R28` có logic validator/quyền lợi nhưng bị đánh dấu `isConfigured: false` và không nằm trong danh sách chọn.

### R21 - Bảo hiểm Bệnh nan y

- Mã UI: `R21`.
- Tên trong `SPBK_PRODUCTS`: Bảo hiểm Bệnh nan y.
- Điều kiện tuổi theo `addon-stbh-validator.js`: nếu người được bảo hiểm là NĐBH chính thì 0-65; nếu quan hệ khác thì 18-65.
- STBH min: `100,000,000`.
- STBH max validator: nếu NĐBH chính thì `min(STBH tử vong chính, 3,000,000,000)`, quan hệ khác `min(STBH tử vong chính, 1,000,000,000)`.
- UI product config lại đặt `maxSumInsured: 1,000,000,000`, nên thực tế slider/quick amount có thể bị giới hạn 1 tỷ dù validator cho NĐBH chính tới 3 tỷ. Cần xác minh thêm.
- Bảng phí: `R21_RATE_TABLE`, tuổi 0-74, cột `male/female`.
- Công thức phí: `rate x STBH / 1000 x PAYMENT_MODE_FACTOR[kỳ phí]`.
- Quyền lợi popup: ung thư giai đoạn đầu 25% STBH tối đa 500 triệu; ung thư giai đoạn cuối 100%; đột quỵ 100%; nhồi máu cơ tim 100%; tổng tối đa 100% STBH.
- Hàm xử lý: `calculateRiderPremium`, `buildR21BenefitRows`, `AddonStbhRules.getAddonStbhRange`.

### R22 - Thương tật bộ phận vĩnh viễn do tai nạn 2.0

- Mã UI: `R22`.
- STBH min: `100,000,000`.
- STBH max validator: `min(500,000,000, STBH tử vong chính)`.
- Product config đặt `maxSumInsured: 1,000,000,000`, nhưng `getRiderStbhRange()` dùng validator nên max thực tế theo validator.
- Phí: tỷ lệ chuẩn `0.51` trên 1,000 STBH, nhân hệ số nhóm nghề `OCCUPATION_FACTOR`.
- `OCCUPATION_FACTOR`: nhóm 1 = 1, nhóm 2 = 1.3, nhóm 3 = 1.9, nhóm 4 = 2.5, nhóm 5 = 3.5, nhóm 6 = 3.5.
- Nhóm nghề 5 không được tham gia R22; nhóm 6 không được tham gia R22.
- Quyền lợi popup dùng bảng tỷ lệ thương tật chi tiết trong `buildR22BenefitRows`, ví dụ mất 1 mắt 55%, mất nghe 2 tai 75%, tháo khớp vai 70%, nhiều dòng chi trên/chi dưới/ngón tay/ngón chân/khác; tổng chi trả tối đa 100% STBH/năm.
- Hàm xử lý: `calculateRiderPremium`, `applyOccupationGroupRules`, `buildR22BenefitRows`.

### R23 - Tử vong và thương tật nghiêm trọng do tai nạn

- Mã UI: `R23`.
- STBH min: `100,000,000`.
- STBH max: `STBH tử vong chính`, sau đó có thể bị giảm bởi nhóm nghề 5 còn tối đa 300 triệu.
- Nhóm nghề 6 không được tham gia R23.
- Tỷ lệ phí theo tuổi từ `getR23RateByAge(age)`: tuổi 0 = 0.108; 1 = 0.216; 2 = 0.324; 3 = 0.432; 4-17 = 0.54; 18-29 = 0.882; 30-39 = 0.687; 40-49 = 0.838; 50-59 = 1.124; 60-69 = 1.098; ngoài khoảng báo lỗi.
- Tỷ lệ phí điều chỉnh = tỷ lệ tuổi x hệ số nhóm nghề.
- Công thức phí: `adjustedRate x STBH / 1000 x factor kỳ phí`.
- Quyền lợi: tử vong tai nạn thường 100% STBH x hệ số tuổi; tử vong tai nạn hàng không thương mại 200% x hệ số tuổi; thương tật nghiêm trọng do tai nạn 100% x hệ số tuổi.
- Hệ số tuổi quyền lợi `getSpbkAgeFactor`: <1 tuổi 20%, <2 tuổi 40%, <3 tuổi 60%, <4 tuổi 80%, từ 4 tuổi 100%.
- Hàm xử lý: `getR23RateByAge`, `calculateRiderPremium`, `buildR23BenefitRows`.

### R24 - Hỗ trợ đóng phí bảo hiểm do tử vong

- Mã UI: `R24`.
- Không dùng STBH nhập tay; validator trả `readonlyValue = annualBasicPremium`.
- Người dùng chọn thời hạn `10`, `15`, `20` năm.
- Bảng phí hiện chỉ là `R24_SAMPLE_RATES`: nam/nữ, tuổi 30, kỳ hạn 10/15/20.
- Công thức phí năm: `rate x (mainAnnualPremium / 1,000,000)`.
- Phí theo kỳ: `annualPremium x PAYMENT_MODE_FACTOR[paymentMode]`.
- Nếu không có rate cho tuổi/thời hạn: báo lỗi `Chưa có biểu phí R24 cho tuổi/thời hạn này`.
- Quyền lợi: hỗ trợ đóng phí mỗi năm bằng phí bảo hiểm cơ bản năm của sản phẩm chính; giá trị hỗ trợ dự kiến = `mainAnnualPremium x term`; bắt đầu từ kỳ phí tiếp theo sau ngày tử vong.
- Hàm xử lý: `calculateRiderPremium`, `renderR24Controls`, `buildR24BenefitRows`.

### R25 - Bệnh lý nghiêm trọng toàn diện

- Mã UI: `R25`.
- STBH min: `100,000,000`.
- STBH max validator: `min(STBH tử vong chính, configuredR25MaxLimit)`, hiện product không set `configuredMaxLimit` nên là STBH chính.
- Product config đặt `maxSumInsured: 1,000,000,000`.
- Bảng phí: `R25_RATE_TABLE`, tuổi 0-74, cột `male/female`.
- Công thức phí: `rate x STBH / 1000 x factor kỳ phí`.
- Quyền lợi: BLNT giai đoạn đầu 25% STBH tối đa 500 triệu; BLNT giai đoạn cuối 100%; BLNT trẻ em giai đoạn cuối 100%; BLNT theo giới tính giai đoạn cuối 125%; nằm viện đặc biệt 10% STBH tối đa 100 triệu.
- Hàm xử lý: `calculateRiderPremium`, `buildR25BenefitRows`, `AddonStbhRules.getAddonStbhRange`.

### R26 - Chăm sóc Sức khỏe Toàn diện

- Mã UI: `R26`.
- Không dùng STBH nhập tay; chọn gói và quyền lợi.
- Gói: `Bạc`, `Vàng`, `Bạch Kim`, `Kim Cương`, `Lục Bảo`.
- Quyền lợi: `inpatient`, `outpatient`, `dental`, `maternity`.
- `R26_PLAN_BENEFITS`: gói Bạc chỉ có `inpatient`; các gói còn lại có đủ 4 quyền lợi.
- `R26_RATE_TABLE`: bảng phí đơn vị nghìn đồng theo loại quyền lợi, khoảng tuổi, 5 gói.
- Phí năm: tổng các rate được chọn x 1,000.
- Phí theo kỳ: `annualPremium x PAYMENT_MODE_FACTOR[paymentMode]`.
- Thai sản chỉ áp dụng nếu giới tính `Nữ` và tuổi 18-45; nếu không thì `getR26Rate()` trả null và sinh lỗi quyền lợi không áp dụng.
- Quyền lợi giới hạn nằm trong `R26_BENEFIT_LIMITS`: nội trú năm, nội trú có/không phẫu thuật, phòng giường, lọc thận, xe cấp cứu, điều trị trong ngày, ngoại trú, nha khoa, thai sản...
- Hàm xử lý: `getR26Rate`, `getR26AllowedBenefits`, `normalizeR26Selection`, `calculateR26Premium`, `buildR26BenefitRows`.

### R29 - Trợ cấp viện phí và phẫu thuật

- Mã UI: `R29`.
- STBH min: `100,000` mỗi ngày.
- Tuổi tham gia validator: 0-69.
- STBH max theo validator: nếu <18 tuổi `min(300,000, STBH tử vong chính x 0.002)`, nếu >=18 tuổi `min(1,000,000, STBH tử vong chính x 0.002)`.
- `R29_AGE_LIMITS`: 0-6 max mỗi hợp đồng 300k, max tích lũy 300k, max hospital 500k; 7-17 max 300k, max tích lũy 300k, max hospital 1 triệu; 18-69 max 1 triệu, max tích lũy 2 triệu, max hospital 2 triệu.
- `R29_MAIN_SUM_RATIO = 0.002`.
- Bảng phí: `R29_RATE_TABLE`, nhóm tuổi 0-4, 5-9, ..., 65-69, cột nam/nữ.
- Công thức phí: `rate x STBH / 1000 x factor kỳ phí`.
- Quyền lợi: viện phí cơ bản 1 x STBH/ngày; ICU 2 x STBH/ngày; phẫu thuật cơ bản 5 x STBH/lần; phẫu thuật đặc biệt 10 x STBH/lần; vận chuyển cấp cứu 2 x STBH/lần tối đa 1 triệu.
- Hàm xử lý: `getR29Rate`, `getR29AllowedMax`, `calculateRiderPremium`, `buildR29BenefitRows`.

### R27/R28 - Có logic nhưng chưa hiện sản phẩm

- `addon-stbh-validator.js` xử lý R27/R28 giống R24: không nhập STBH, `readonlyValue = annualBasicPremium`.
- `addonBenefitSummaryService.js` và `script.js/buildR27R28BenefitRows()` có quyền lợi hỗ trợ tài chính/đóng phí dựa trên phí năm và term.
- `SPBK_PRODUCTS` đánh dấu `isConfigured: false`; `VISIBLE_SPBK_PRODUCT_CODES` không chứa R27/R28.
- Cần xác minh thêm nếu muốn kích hoạt.

## 5. Quan hệ giữa sản phẩm chính và sản phẩm bổ trợ

- Phụ thuộc STBH tử vong chính: R21, R22, R23, R25, R29 đều dùng `mainDeathBenefit` trong `AddonStbhRules.getAddonStbhRange()`.
- Phụ thuộc phí cơ bản năm sản phẩm chính: R24 dùng `mainAnnualPremium` làm quyền lợi và công thức phí; R27/R28 cũng vậy nếu kích hoạt; R29 gián tiếp phụ thuộc STBH chính; R26 không phụ thuộc phí chính để tính phí.
- Phụ thuộc nhóm nghề: R22 và R23 dùng hệ số nghề trong phí và rule cấm/giảm STBH; tổng STBH nhóm nghề 5-6 bị giới hạn.
- Phụ thuộc tuổi/giới tính: R21/R25 dùng tuổi và giới tính theo bảng phí; R23 dùng tuổi; R26 dùng tuổi/giới tính, thai sản chỉ nữ 18-45; R29 dùng nhóm tuổi và giới tính; R24 dùng tuổi/giới tính/thời hạn.
- Tự động tính STBH/quyền lợi: R24, R27, R28 lấy theo phí chính; R26 dùng gói/quyền lợi thay vì STBH.
- Người dùng nhập trực tiếp STBH: R21, R22, R23, R25, R29.
- Điều kiện khiến SPBK không được chọn: product `isConfigured: false`; nhóm nghề cấm; STBH ngoài range; tuổi ngoài range; R26 plan không hợp lệ; thiếu biểu phí; form chính chưa hợp lệ; tổng STBH nhóm nghề 5-6 vượt 2 tỷ.

## 6. Bảng dữ liệu / hằng số / config

| Tên | File | Mục đích | Cột/cấu trúc | Hàm dùng |
|---|---|---|---|---|
| `riskRateTable` | `script.js` | Tỷ lệ rủi ro tử vong và TTTBVV SPC | `age`, `maleDeath`, `femaleDeath`, `maleDisability`, `femaleDisability` | `getRiskRates`, `generateIllustration` |
| `loyaltyBonusPolicyYears` | `script.js` | Năm xét thưởng duy trì | `[5,10,15,20]` | `calculateLoyaltyBonus` |
| `additionalPremiumAllocationFeeRate` | `script.js` | Tỷ lệ phí phân bổ phí đóng thêm | `0` | `generateIllustration` |
| `fixedIllustrationInterestRate` | `script.js` | Lãi suất chính | `4.76` | `readInput` |
| `alternateIllustrationInterestRate` | `script.js` | Lãi suất so sánh | `4.25` | `buildComparableIllustration` |
| Bảng hệ số STBH tử vong max | `script.js/getDeathSumAssuredMaxFactor` | Xác định STBH tử vong tối đa theo phí | `maxAge`, `male`, `female` | `getDeathSumAssuredRange` |
| Bảng phí ban đầu | `script.js/getInitialFeeRate` | Tỷ lệ phí phân bổ ban đầu theo năm | hard-code if | `generateIllustration` |
| Bảng phí quản lý | `script.js/getPolicyManagementFee` | Phí quản lý hợp đồng | công thức hard-code | `generateIllustration` |
| Bảng phí hoàn lại | `script.js/getSurrenderFeeRate` | Phí chấm dứt/hoàn lại | hard-code if | `generateIllustration` |
| `PAYMENT_MODE_FACTOR` | `script.js` | Quy đổi phí năm sang kỳ đóng | yearly 1, halfYearly 0.53, quarterly 0.28, monthly 0.1 | `calculateRatePremium`, `calculateR26Premium` |
| `PAYMENT_MODE_LABEL` | `script.js` | Nhãn kỳ phí | map string | UI/export |
| `OCCUPATION_FACTOR` | `script.js` | Hệ số nghề cho R22/R23 | nhóm 1-6 | `calculateRiderPremium` |
| `OCCUPATION_JOBS` | `occupation-data.js` | Danh mục nghề nghiệp | `group`, `groupLabel`, `job`, `searchText` | `filterJobs`, `findExactOccupationJob` |
| `R21_RATE_TABLE` | `script.js` | Biểu phí R21 | key tuổi, `male`, `female` | `calculateRiderPremium` |
| `R25_RATE_TABLE` | `script.js` | Biểu phí R25 | key tuổi, `male`, `female` | `calculateRiderPremium` |
| `R29_RATE_TABLE` | `script.js` | Biểu phí R29 | `min`, `max`, `male`, `female` | `getR29Rate` |
| `R29_AGE_LIMITS` | `script.js` | Giới hạn STBH R29 theo tuổi | `min`, `max`, `minAmount`, `maxPerPolicy`, `maxTotal`, `maxHospital` | `getR29AllowedMax` |
| `R29_MAIN_SUM_RATIO` | `script.js` | Tỷ lệ STBH chính cho R29 | `0.002` | `getR29AllowedMax`, validator |
| `R26_PLANS` | `script.js`, `addon-stbh-validator.js` | Danh sách gói R26 | array 5 gói | R26 UI/validator |
| `R26_PLAN_BENEFITS` | `script.js` | Quyền lợi hợp lệ theo gói | map plan -> benefit keys | `getR26AllowedBenefits` |
| `R26_RATE_TABLE` | `script.js` | Biểu phí R26 | benefit -> `[minAge,maxAge,[rates 5 gói]]` | `getR26Rate` |
| `R26_BENEFIT_LIMITS` | `script.js`, `addonBenefitSummaryService.js` | Hạn mức quyền lợi R26 | key -> array 5 gói | `getR26Limit`, `planValue` |
| `R24_SAMPLE_RATES` | `script.js` | Biểu phí mẫu R24 | gender -> age -> term -> rate | `calculateRiderPremium` |
| `SPBK_PRODUCTS` | `script.js` | Config UI SPBK | code, name, min/max, step, quickAmounts, isConfigured | Toàn bộ rider UI |
| `VISIBLE_SPBK_PRODUCT_CODES` | `script.js` | Danh sách SPBK hiển thị | array code | Rider UI, tổng phí, export |
| `RELATION` | `addon-stbh-validator.js` | Quan hệ NĐBH SPBK | MAIN_INSURED, POLICY_HOLDER, SPOUSE, CHILD, OTHER | `getAddonStbhRange` |
| `SPBK_QUYEN_LOI_CHI_TIET_CODEX.md` | markdown | Tham chiếu quyền lợi khi xuất tóm tắt SPBK | markdown text | `loadAddonBenefitReferenceMarkdown`, `hasReferenceSection` |
| `SPBK_PDF/*.pdf` | folder | Điều khoản sản phẩm | PDF theo code | `openRiderTerms` |

## 7. Danh sách hàm tính toán

Các hàm tính sản phẩm chính trong `script.js`:

- `parseDateInput(value)`: parse ngày từ chuỗi; output `Date|null`; dùng bởi `calculateAge`, validate ngày sinh.
- `calculateAge(dateOfBirth)`: tuổi hiện tại theo ngày hôm nay; output number; dùng cho SPC, SPBK, export.
- `getInitialFeeRate(policyYear)`: trả tỷ lệ phí ban đầu theo năm; ảnh hưởng tài khoản.
- `getPolicyManagementFee(policyYear)`: trả phí quản lý năm; ảnh hưởng tài khoản.
- `getRiskRates(age, gender)`: lấy rate tử vong/TTTBVV; ảnh hưởng phí rủi ro.
- `calculateDisabilitySumAssured(annualBasicPremium, deathBenefit)`: tính STBH TTTBVV tự động; hiển thị input readonly và export.
- `getDeathSumAssuredMaxFactor(age, gender)`: lấy hệ số max STBH tử vong.
- `getDeathSumAssuredRange(annualPremium, age, gender)`: tính min/max STBH tử vong hợp lệ.
- `calculateLoyaltyBonus(policyYear, yearEndValuesBeforeBonus, effectivePremiumPaymentYears, loyaltyRate)`: tính thưởng duy trì.
- `getSurrenderFeeRate(policyYear)`: tỷ lệ phí chấm dứt/hoàn lại.
- `getEffectivePremiumPaymentYears(initialAge, premiumPaymentYears)`: chặn thời hạn đóng phí theo tuổi 68.
- `generateIllustration(input)`: lõi tính minh họa tháng -> năm; output array dòng năm.
- `buildComparableIllustration(input)`: tính hai bảng 4.76% và 4.25%; output dòng năm có `cashValue425`, `cashValue476`.
- `sumBy(rows,key)`: cộng field.
- `deductFromAccounts(basicAccount, additionalAccount, amount)`: trừ phí từ tài khoản cơ bản rồi bổ sung.

Các hàm tiền/format/input:

- `formatVND`, `formatThousandVND`, `parseMoneyValue`, `formatCommaNumber`, `numberValue`, `moneyValue`, `formatCurrency`, `formatShortMoney`, `formatCompactCurrency`, `formatPercent`.
- Ảnh hưởng hiển thị bảng, popup, export, input tiền.

Các hàm nghề nghiệp:

- `normalizeText`, `filterJobs`, `getOccupationGroupNumber`, `applyOccupationGroupRules`, `setOccupationGroup`, `findExactOccupationJob`, `handleOccupationInput`.
- `applyOccupationGroupRules` là hàm nghiệp vụ quan trọng: nhóm <=4 cho phép; nhóm 5 cấm R22, giới hạn R23 max 300 triệu; nhóm 6 cấm R22/R23.

Các hàm SPBK:

- `createDefaultRiderSelection(code)`: default mỗi SPBK.
- `normalizeRiderAmount(product,value)`: làm tròn STBH theo step.
- `getRiderStbhRange(product, selection, context)`: gọi `AddonStbhRules.getAddonStbhRange()` rồi áp rule nghề.
- `applyOccupationRulesToRiderState(context)`: tự tắt SPBK bị nghề cấm, tự giảm STBH nếu vượt max nghề.
- `getR23RateByAge(age)`: rate R23.
- `calculateRatePremium(rate,sumInsured,paymentMode)`: công thức chung `rate x STBH/1000 x kỳ phí`.
- `getR26Rate(age,gender,plan,benefitType)`: lấy rate R26; kiểm tra thai sản.
- `getR26AllowedBenefits(plan)`, `normalizeR26Selection(selection)`, `calculateR26Premium(selection,context)`.
- `getR29Rate(age,gender)`, `getR29AllowedMax(context)`.
- `calculateRiderPremium(code, selection, context)`: lõi tính phí SPBK; output `{premium, annualPremium, error}`; ảnh hưởng detail, selected list, tổng phí, export.
- `getOccupationTotalStbhError(context)`: tổng STBH nhóm nghề 5-6 không quá 2 tỷ.
- `calculateBenefitRate`, `calculateBenefitMultiple`, `getSpbkAgeFactor`: tính mức chi trả quyền lợi.
- `buildR21BenefitRows`, `buildR22BenefitRows`, `buildR23BenefitRows`, `buildR24BenefitRows`, `buildR27R28BenefitRows`, `buildR25BenefitRows`, `buildR26BenefitRows`, `buildR29BenefitRows`: dựng quyền lợi popup.
- `calculateSpbkBenefits(code,currentValue)`: tổng hợp quyền lợi để popup hiển thị.

Các hàm validator riêng trong `addon-stbh-validator.js`:

- `toNumber(value)`: ép số.
- `getRangeValidity(currentStbh,min,max)`: kiểm tra STBH trong khoảng.
- `getRangeResult(...)`: chuẩn hóa output range, valid, error.
- `formatAddonRuleMoney(value)`: format tiền range.
- `getAddonStbhRange({...})`: lõi validate STBH cho R21/R22/R23/R24/R25/R26/R27/R28/R29; export qua `window.AddonStbhRules`.

Các hàm export/tóm tắt:

- `getSelectedValidRiders(context)`: lấy SPBK đã chọn và hợp lệ cho export.
- `buildSummarySnapshot()`: gom toàn bộ dữ liệu minh họa, SPBK, mốc tài khoản.
- `renderOfficialSummaryCanvas(snapshot)`: render JPG chính.
- `canvasToJpegBlob(canvas)`: canvas -> JPEG blob.
- `getSummaryFilename(date)`, `getAddonBenefitSummaryFilename(index)`: đặt tên file.
- `buildAddonBenefitSummaryInput(snapshot)`: chuyển snapshot sang input cho service SPBK.
- `createAddonBenefitSummaryImages(snapshot)`: tạo các JPG quyền lợi SPBK bằng `AddonBenefitSummaryService`.
- `downloadAllSummaryImages()`, `triggerImageDownload(image)`: tải ảnh về máy.
- `uploadSummaryJpg(blob,filename)`: upload nếu có `window.uploadIllustrationSummaryImage` hoặc `window.MINH_HOA_SUMMARY_UPLOAD_URL`.
- `openSummaryPreview()`, `shareSummaryViaZalo()`, `closeSummaryPreview()`.

Các hàm trong `addonBenefitSummaryService.js`:

- `amountByRate`, `amountByMultiple`, `ageFactor`: tính quyền lợi SPBK trong bản tóm tắt phụ.
- `buildR21Rows`, `buildR22Rows`, `buildR23Rows`, `buildR24Rows`, `buildR25Rows`, `buildR26Rows`, `buildR27R28Rows`, `buildR29Rows`: dựng bảng quyền lợi.
- `buildRows`, `buildAddonCards`, `chooseLayout`, `paginateCards`, `createAddonBenefitSummaryPages`: tạo canvas nhiều trang.

## 8. Logic hiển thị kết quả

Kết quả SPC trên web:

- Bảng `#resultsBody` trong `index.html`.
- Cột hiển thị: năm hợp đồng/tuổi, tổng phí đã đóng, giá trị hoàn lại theo lãi suất 4.25%, giá trị hoàn lại theo lãi suất 4.76%.
- Đơn vị tiêu đề là nghìn đồng; `formatThousandVND(value)` chia giá trị cho 1000 và format `vi-VN`.
- Dòng có `loyaltyBonus > 0` thêm class `milestone-row`.

Realtime hay bấm nút:

- Lần đầu người dùng bấm submit `Tạo bảng minh họa` thì `refreshIllustration()` tính và hiện kết quả.
- Sau khi bảng đã hiện, mọi input trong form sẽ tính lại realtime.
- Tuổi, range STBH tử vong, STBH TTTBVV cập nhật realtime kể cả trước khi bảng hiện.

Chế độ xem bảng:

- `resultViewMode = "milestone"` mặc định: chỉ năm 1, 5, 10, 15 và năm cuối.
- `"full"`: toàn bộ năm minh họa.
- Hàm `getDisplayResults(results)` xử lý lọc.

Kết quả SPBK:

- `renderRiderCustomerCard()` hiển thị khách hàng, tuổi, STBH chính, phí chính.
- `renderRiderProductButtons()` hiển thị nút sản phẩm, trạng thái sẵn sàng/cần kiểm tra.
- `renderRiderDetail()` hiển thị STBH/gói, phí năm, slider/stepper/quick amount hoặc controls R24/R26.
- `renderSelectedRiderList()` hiển thị danh sách đã chọn và lỗi nếu có.
- `updateRiderTotals()` hiển thị tổng phí SPBK, tổng phí kế hoạch, tiết kiệm/ngày = `ceil(totalPlanAnnualPremium / 365)`.
- Popup quyền lợi SPBK lấy dữ liệu từ `calculateSpbkBenefits()`.

Format:

- Tiền đồng: `Intl.NumberFormat("vi-VN") + " đồng"`.
- Tiền nghìn đồng: chia 1000.
- Tiền compact: đúng tỷ/triệu thì hiển thị `x tỷ đồng` hoặc `x triệu đồng`.
- Phần trăm: `formatPercent()` nhưng hiện không thấy dùng nhiều trong UI chính.

## 9. Luồng xuất tóm tắt nếu có

File xử lý export:

- `script.js`: snapshot, render canvas chính, tải/chia sẻ/upload.
- `addonBenefitSummaryService.js`: render canvas chi tiết quyền lợi SPBK.

Dữ liệu đầu vào:

- Form chính qua `readInput()`.
- Context SPBK qua `getCurrentInputContext()`.
- SPBK hợp lệ qua `getSelectedValidRiders()`.
- Bảng minh họa qua `buildComparableIllustration(input)`.

Dữ liệu đưa vào bản tóm tắt:

- Tên khách hàng, ngày sinh, tuổi, giới tính.
- Tên sản phẩm chính, STBH tử vong, STBH TTTBVV, phí chính, phí đóng thêm.
- Thời hạn đóng phí, thời hạn hợp đồng/minh họa, định kỳ phí.
- SPBK đã chọn, STBH/gói, phí năm.
- Tổng phí năm đầu, tổng STBH SPBK, tổng quyền lợi bảo vệ.
- Mốc tài khoản tại năm 5, 10, 15 và năm cuối nếu nằm trong thời hạn minh họa.

Cách render:

- `renderOfficialSummaryCanvas(snapshot)` tạo canvas `1240 x 1754`, vẽ bảng thông tin, quyền lợi rủi ro, quyền lợi đầu tư, bảng SPBK.
- `createAddonBenefitSummaryImages(snapshot)` fetch `SPBK_QUYEN_LOI_CHI_TIET_CODEX.md`, gọi `window.AddonBenefitSummaryService.createAddonBenefitSummaryPages(...)`, mỗi trang là canvas `1240 x 1754`.
- `canvasToJpegBlob()` xuất JPEG chất lượng `0.95`.
- Preview dùng `canvas.toDataURL("image/jpeg", 0.95)` gán vào `#summaryPreviewImage`.

Cách tải/chia sẻ:

- Tải: tạo thẻ `<a>`, set `href = objectUrl`, `download = filename`, rồi click.
- Tải nhiều ảnh: tải ảnh chính trước, ảnh phụ cách nhau 150ms.
- Chia sẻ: `navigator.canShare({ files })` và `navigator.share({ files })`; nếu không hỗ trợ thì báo tải JPG gửi qua Zalo.
- Upload tùy chọn: nếu có `window.uploadIllustrationSummaryImage` thì gọi; nếu có `window.MINH_HOA_SUMMARY_UPLOAD_URL` thì POST `FormData`.

Giới hạn hiện tại:

- Export chỉ bật khi form chính hợp lệ, SPBK không lỗi, tổng STBH nghề 5-6 không vượt 2 tỷ.
- Xuất JPG, không thấy xuất PDF thật.
- Chia sẻ phụ thuộc hỗ trợ trình duyệt.
- Upload phụ thuộc biến/hàm global bên ngoài, repo hiện không định nghĩa.

## 10. Các ràng buộc nghiệp vụ quan trọng

- STBH tử vong SPC: min `max(50tr, 5 x phí năm)`, max `min(25 tỷ, phí năm x hệ số tuổi/giới)`.
- STBH TTTBVV: nếu phí năm < 30tr thì trần 300tr; nếu >=30tr thì trần `min(10 x phí năm, 2 tỷ)`; kết quả không vượt STBH tử vong.
- Đóng phí SPC hiệu lực tối đa đến tuổi 68.
- Phí ban đầu SPC theo năm 1/2/3-5/6-10/từ 11: 50%/30%/20%/2%/0%.
- Phí quản lý SPC năm: `365k + 12k x (năm-1)`, trần 840k.
- Phí hoàn lại/khấu trừ năm 1-5: 100%, 100%, 45%, 40%, 20%, từ năm 6 là 0%.
- Thưởng duy trì chỉ năm 5/10/15/20, chỉ trong thời hạn đóng phí hiệu lực.
- R21 tuổi: NĐBH chính 0-65, quan hệ khác 18-65.
- R22 max `min(500tr, STBH chính)`, nhóm nghề 5/6 không được tham gia.
- R23 max STBH chính, nhóm nghề 5 max 300tr, nhóm nghề 6 không được tham gia.
- R24 chỉ có biểu phí mẫu tuổi 30, kỳ hạn 10/15/20.
- R25 tuổi có bảng phí 0-74.
- R26 thai sản chỉ nữ 18-45.
- R29 tuổi 0-69, max theo tuổi và `0.2%` STBH chính (`0.002`).
- Tổng STBH mọi SPBK đã chọn với nhóm nghề 5-6 tối đa 2 tỷ.

## 11. Sơ đồ luồng tính toán

Người dùng nhập dữ liệu
→ `parseDateInput`, `calculateAge`, format tiền, xác định nhóm nghề
→ validate form HTML5 và `updateDeathSumAssuredRange`
→ tính STBH TTTBVV bằng `calculateDisabilitySumAssured`
→ đọc input bằng `readInput`
→ xác định sản phẩm chính hard-code `An Tâm Hoạch Định`
→ chạy `buildComparableIllustration`
→ lấy bảng tỷ lệ rủi ro, phí ban đầu, phí quản lý, phí hoàn lại
→ tính theo từng tháng trong `generateIllustration`
→ gom theo từng năm, tính giá trị tài khoản/hoàn lại
→ hiển thị bảng bằng `renderResults`
→ người dùng chọn SPBK
→ `getRiderStbhRange` validate STBH theo sản phẩm chính và tuổi
→ `applyOccupationGroupRules` áp nhóm nghề
→ `calculateRiderPremium` lấy bảng phí SPBK và tính phí
→ `updateRiderTotals` tổng hợp phí
→ `calculateSpbkBenefits` hiển thị popup quyền lợi
→ nếu xuất tóm tắt, `buildSummarySnapshot`
→ render canvas JPG chính và canvas JPG quyền lợi SPBK
→ preview, tải hoặc chia sẻ.

## 12. Gợi ý tái sử dụng cho sản phẩm mới

Nên giữ nguyên:

- Các helper format tiền/ngày: `parseMoneyValue`, `formatVND`, `formatCurrency`, `calculateAge`.
- Cơ chế render bảng kết quả và export canvas nếu sản phẩm mới vẫn cần JPG.
- Cơ chế `riderState`, `calculateRiderPremium`, `AddonStbhRules` nếu vẫn là mô hình SPC + SPBK.

Nên tách riêng:

- Tách logic SPC khỏi `script.js` thành module riêng, ví dụ `products/an-tam-hoach-dinh/main-calculator.js`.
- Tách từng SPBK thành config + calculator riêng, thay vì gom `R21_RATE_TABLE`, `R25_RATE_TABLE`, `R26_RATE_TABLE`, `calculateRiderPremium` trong một file.
- Tách dữ liệu bảng phí sang JSON/CSV, ví dụ `data/riders/R21-rates.json`.
- Tách export thành `services/summary-export.js`.
- Tách nghề nghiệp thành `data/occupations.js/json`.

Hàm có thể dùng lại:

- `calculateRatePremium(rate,sumInsured,paymentMode)`.
- `deductFromAccounts`.
- `getEffectivePremiumPaymentYears` nếu sản phẩm mới có giới hạn tuổi đóng phí tương tự.
- Các hàm format tiền/ngày.
- `getAddonStbhRange` có thể mở rộng theo config.

Chỗ đang hard-code nên chuyển config:

- Tên sản phẩm chính trong `buildSummarySnapshot`.
- Lãi suất `4.76`, `4.25`.
- Bảng `riskRateTable`.
- Tỷ lệ phí ban đầu, phí quản lý, phí hoàn lại, thưởng duy trì.
- Hệ số STBH tử vong max.
- Toàn bộ `SPBK_PRODUCTS`, `VISIBLE_SPBK_PRODUCT_CODES`.
- Rule nghề nghiệp R22/R23 và tổng STBH 2 tỷ.
- `R24_SAMPLE_RATES` cần thay bằng biểu phí đầy đủ.
- Text quyền lợi trong các `buildRxxBenefitRows`.

Cách thêm sản phẩm mới ít ảnh hưởng code cũ:

1. Tạo config sản phẩm chính mới gồm input schema, bảng tỷ lệ, phí, hàm tính minh họa.
2. Tạo interface thống nhất: `calculateMainIllustration(input) -> yearlyRows`.
3. Tạo config SPBK dạng dữ liệu: min/max STBH, tuổi, quan hệ, bảng phí, quyền lợi.
4. Viết hàm tính riêng cho SPBK mới rồi đăng ký vào registry thay vì thêm nhiều `if (code === ...)`.
5. Giữ UI đọc từ registry để không phải sửa nhiều HTML/JS mỗi khi thêm sản phẩm.

Đề xuất cấu trúc thư mục:

```text
src/
  core/
    date.js
    money.js
    payment-mode.js
  products/
    an-tam-hoach-dinh/
      config.js
      calculator.js
      risk-rates.js
      surrender-fees.js
    san-pham-moi/
      config.js
      calculator.js
  riders/
    registry.js
    R21/
      config.js
      rates.js
      calculator.js
      benefits.js
    R22/
      config.js
      calculator.js
      benefits.js
  data/
    occupations.js
  services/
    summary-export.js
    addon-benefit-summary.js
```

## 13. Phụ lục kỹ thuật

Framework đang dùng:

- Web tĩnh HTML/CSS/vanilla JavaScript.
- Không thấy package manager/build tool trong repo.
- Deploy config có `vercel.json` chỉ set cache-control cho `/` và `/index.html`.

Thư viện/API:

- `Intl.NumberFormat("vi-VN")` để format số tiền/phần trăm.
- Canvas 2D API để render JPG.
- `Blob`, `URL.createObjectURL`, `File`, `navigator.share`, `navigator.canShare`.
- `localStorage` để lưu phương án SPBK.
- `fetch` để đọc markdown quyền lợi SPBK và upload ảnh nếu có endpoint.

Cách chạy dự án:

- Vì là web tĩnh, có thể mở `index.html` trực tiếp trong trình duyệt.
- Nếu muốn `fetch("SPBK_QUYEN_LOI_CHI_TIET_CODEX.md")` hoạt động ổn định, nên chạy qua static server tại thư mục dự án, ví dụ bằng một server local bất kỳ.

Cách test nhanh logic tính:

- Mở web, nhập ngày sinh hợp lệ, phí năm, STBH tử vong trong range, bấm `Tạo bảng minh họa`.
- Kiểm tra bảng hiển thị năm 1/5/10/15/năm cuối ở chế độ `Mốc nổi bật`, chuyển `Toàn bộ` để xem đủ năm.
- Chọn từng SPBK và thay đổi STBH/gói để xem phí năm và tổng phí.
- Thử nhóm nghề 5/6 để kiểm tra R22/R23 bị cấm hoặc giới hạn.
- Thử R24 với tuổi khác 30 để xác nhận lỗi chưa có biểu phí.
- Bấm xuất tóm tắt để kiểm tra JPG chính và JPG quyền lợi SPBK.

Các điểm cần cẩn thận khi sửa code:

- `script.js` hiện chứa cả business logic, UI rendering, state, export; sửa một hàm có thể ảnh hưởng nhiều luồng.
- `updateSummaryExportAvailability()` gọi `buildSummarySnapshot()`, mà snapshot lại chạy tính minh họa và validate SPBK; có thể tốn chi phí nếu gọi quá thường xuyên.
- `AddonStbhRules` là dependency global của `script.js`; thứ tự script trong `index.html` rất quan trọng.
- Một số rule bị lặp giữa `script.js`, `addon-stbh-validator.js`, `addonBenefitSummaryService.js`; khi sửa cần đồng bộ.
- Chuỗi tiếng Việt lỗi encoding làm khó tìm kiếm và đối chiếu nghiệp vụ.
- `R29` trong `addon-stbh-rules.md` có đoạn validate mẫu ghi `mainDeathBenefit * 0.2`, nhưng code đang chạy dùng `0.002`; cần lấy code đang chạy làm chuẩn và xác minh tài liệu nghiệp vụ.
- `getR29AllowedMax()` được định nghĩa nhưng chưa thấy dùng trực tiếp trong tính phí/validate chính, trong khi validator riêng cũng tính max R29.
- `ensureRiderTermsModal()` có tạo modal iframe nhưng `openRiderTerms(code)` hiện chuyển `window.location.href` thẳng sang PDF, không dùng modal.

## Cần xác minh thêm

- Encoding tiếng Việt của nhiều file nguồn và tài liệu markdown đang lỗi; cần xác minh nội dung gốc nếu dùng làm tài liệu pháp lý.
- `R21` validator cho NĐBH chính max 3 tỷ nhưng `SPBK_PRODUCTS.R21.maxSumInsured` là 1 tỷ; cần quyết định giới hạn UI đúng là bao nhiêu.
- `R24_SAMPLE_RATES` chỉ có tuổi 30, cần biểu phí đầy đủ nếu triển khai thật.
- `R27/R28` có code quyền lợi/validator nhưng chưa được cấu hình hiển thị; cần xác minh có nằm trong phạm vi sản phẩm hiện tại không.
- `R29_AGE_LIMITS.maxTotal` và `maxHospital` hiện chưa thấy kiểm tra tích lũy đa hợp đồng; chỉ kiểm tra max mỗi hợp đồng theo STBH chính.
- `occupation-data.js` được sinh từ Excel nhưng nội dung tiếng Việt lỗi encoding; cần xác minh file Excel gốc.
- `addon-stbh-rules.md` là tài liệu hướng dẫn nhưng bị lỗi encoding và có ít nhất một điểm không khớp code R29; không nên xem là nguồn chuẩn nếu chưa rà lại.
