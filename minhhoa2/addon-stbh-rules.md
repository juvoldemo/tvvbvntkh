# Quy tắc STBH sản phẩm bán kèm An Tâm Hoạch Định

> File này dùng để hướng dẫn Codex triển khai logic kiểm tra Số tiền bảo hiểm (STBH) cho các sản phẩm bán kèm của sản phẩm chính **An Tâm Hoạch Định (BV-NCUVL06/2024)**.

---

## Biến đầu vào nên có trong hệ thống

```ts
mainDeathBenefit: number        // STBH tử vong của sản phẩm chính
annualBasicPremium: number      // Phí bảo hiểm cơ bản quy năm của sản phẩm chính
insuredAge: number              // Tuổi NĐBH của sản phẩm bán kèm
mainInsuredAge: number          // Tuổi NĐBH sản phẩm chính
addonInsuredRelation: string    // MAIN_INSURED | POLICY_HOLDER | SPOUSE | CHILD | OTHER
addonCode: string               // R21 | R22 | R23 | R24 | R25 | R26 | R27 | R28 | R29
addonSumAssured: number         // STBH sản phẩm bán kèm nếu có nhập tay
```

---

# 1. R21 - Bảo hiểm Bệnh nan y

Mã sản phẩm: `BV-NR21/2025`

## Tuổi tham gia

```ts
if (addonInsuredRelation === "MAIN_INSURED") {
  allowedAge = insuredAge >= 0 && insuredAge <= 65;
} else {
  allowedAge = insuredAge >= 18 && insuredAge <= 65;
}
```

## STBH tối thiểu

```ts
minR21 = 100_000_000;
```

## STBH tối đa

### Nếu NĐBH R21 là NĐBH sản phẩm chính

```ts
maxR21 = Math.min(mainDeathBenefit, 3_000_000_000);
```

### Nếu NĐBH R21 là BMBH, vợ/chồng, con hoặc người khác

```ts
maxR21 = Math.min(mainDeathBenefit, 1_000_000_000);
```

## Validate

```ts
function validateR21(stbh, mainDeathBenefit, insuredAge, relation) {
  const min = 100_000_000;

  const validAge =
    relation === "MAIN_INSURED"
      ? insuredAge >= 0 && insuredAge <= 65
      : insuredAge >= 18 && insuredAge <= 65;

  const max =
    relation === "MAIN_INSURED"
      ? Math.min(mainDeathBenefit, 3_000_000_000)
      : Math.min(mainDeathBenefit, 1_000_000_000);

  return validAge && stbh >= min && stbh <= max;
}
```

---

# 2. R22 - Bảo hiểm thương tật bộ phận vĩnh viễn do tai nạn 2.0

Mã sản phẩm: `BV-NR22/2025`

## STBH tối thiểu

Theo công văn điều chỉnh ngày 05/08/2025:

```ts
minR22 = 100_000_000;
```

## STBH tối đa trên mỗi hợp đồng

Đối với sản phẩm chính An Tâm Hoạch Định:

```ts
maxR22 = Math.min(500_000_000, mainDeathBenefit);
```

## Giới hạn tích lũy trên một NĐBH

```ts
totalR22AcrossPoliciesByInsured <= 1_000_000_000;
```

Nếu hệ thống hiện chưa quản lý tích lũy đa hợp đồng, trước mắt chỉ validate theo hợp đồng hiện tại.

## Validate

```ts
function validateR22(stbh, mainDeathBenefit) {
  const min = 100_000_000;
  const max = Math.min(500_000_000, mainDeathBenefit);

  return stbh >= min && stbh <= max;
}
```

---

# 3. R23 - Bảo hiểm tử vong và thương tật nghiêm trọng do tai nạn

Mã sản phẩm: `BV-NR23/2025`

## STBH tối thiểu

```ts
minR23 = 100_000_000;
```

## STBH tối đa

```ts
maxR23 = mainDeathBenefit;
```

## Validate

```ts
function validateR23(stbh, mainDeathBenefit) {
  const min = 100_000_000;
  const max = mainDeathBenefit;

  return stbh >= min && stbh <= max;
}
```

---

# 4. R24 - Hỗ trợ đóng phí bảo hiểm do tử vong

Mã sản phẩm: `BV-NR24/2025`

## Nguyên tắc STBH

Sản phẩm này không nên cho người dùng nhập STBH thủ công.

Hệ thống tự xác định quyền lợi theo phí bảo hiểm cơ bản của sản phẩm chính.

```ts
stbhR24 = annualBasicPremium;
```

## UI đề xuất

```ts
hideInput("addonSumAssured");
displayReadonlyValue(annualBasicPremium);
```

## Validate

```ts
function getR24Benefit(annualBasicPremium) {
  return annualBasicPremium;
}
```

---

# 5. R25 - Bảo hiểm Bệnh lý nghiêm trọng toàn diện

Mã sản phẩm: `BV-NR25/2025`

## STBH tối thiểu

```ts
minR25 = 100_000_000;
```

## STBH tối đa đề xuất

```ts
maxR25 = mainDeathBenefit;
```

Nếu hệ thống cần thêm trần nghiệp vụ nội bộ, có thể cấu hình:

```ts
maxR25 = Math.min(mainDeathBenefit, configuredR25MaxLimit);
```

## Validate

```ts
function validateR25(stbh, mainDeathBenefit, configuredR25MaxLimit = Infinity) {
  const min = 100_000_000;
  const max = Math.min(mainDeathBenefit, configuredR25MaxLimit);

  return stbh >= min && stbh <= max;
}
```

---

# 6. R26 - Bảo hiểm Chăm sóc sức khỏe toàn diện

Mã sản phẩm: `BV-NR26/2025`

## Nguyên tắc

R26 không dùng STBH dạng số tiền người dùng nhập trực tiếp.

Người dùng chọn chương trình bảo hiểm:

```ts
type R26Plan = "BAC" | "VANG" | "BACH_KIM" | "KIM_CUONG" | "LUC_BAO";
```

## Hạn mức nội trú theo gói

```ts
const R26_INPATIENT_LIMIT = {
  BAC: 150_000_000,
  VANG: 250_000_000,
  BACH_KIM: 500_000_000,
  KIM_CUONG: 1_000_000_000,
  LUC_BAO: 2_000_000_000,
};
```

## UI đề xuất

```ts
hideInput("addonSumAssured");
showSelect("r26Plan");
```

## Validate

```ts
function validateR26(plan) {
  return ["BAC", "VANG", "BACH_KIM", "KIM_CUONG", "LUC_BAO"].includes(plan);
}
```

---

# 7. R27 - Hỗ trợ đóng phí bảo hiểm do Bệnh lý nghiêm trọng cho NĐBH

Mã sản phẩm: `BV-NR27/2025`

## Nguyên tắc STBH

Sản phẩm này không nên cho nhập STBH thủ công.

Quyền lợi hỗ trợ đóng phí căn cứ theo phí bảo hiểm của sản phẩm chính.

```ts
stbhR27 = annualBasicPremium;
```

## UI đề xuất

```ts
hideInput("addonSumAssured");
displayReadonlyValue(annualBasicPremium);
```

## Validate

```ts
function getR27Benefit(annualBasicPremium) {
  return annualBasicPremium;
}
```

---

# 8. R28 - Hỗ trợ đóng phí bảo hiểm do Bệnh lý nghiêm trọng cho BMBH và Người hôn phối

Mã sản phẩm: `BV-NR28/2025`

## Nguyên tắc STBH

Sản phẩm này không nên cho nhập STBH thủ công.

Quyền lợi hỗ trợ đóng phí căn cứ theo phí bảo hiểm của sản phẩm chính.

```ts
stbhR28 = annualBasicPremium;
```

## UI đề xuất

```ts
hideInput("addonSumAssured");
displayReadonlyValue(annualBasicPremium);
```

## Validate

```ts
function getR28Benefit(annualBasicPremium) {
  return annualBasicPremium;
}
```

---

# 9. R29 - Bảo hiểm Trợ cấp viện phí và phẫu thuật

Mã sản phẩm: `BV-NR29/2025`

## STBH tối thiểu

```ts
minR29 = 100_000;
```

## STBH tối đa theo tuổi

### Từ 0 đến 17 tuổi

```ts
maxR29 = Math.min(
  300_000,
  mainDeathBenefit * 0.002
);
```

Giới hạn tích lũy trên cùng NĐBH:

```ts
totalR29AcrossPoliciesByInsured <= 300_000;
```

### Từ 18 tuổi trở lên

```ts
maxR29 = Math.min(
  1_000_000,
  mainDeathBenefit * 0.002
);
```

Giới hạn tích lũy trên cùng NĐBH:

```ts
totalR29AcrossPoliciesByInsured <= 2_000_000;
```

## Quyền lợi trợ cấp viện phí và phẫu thuật đặc biệt

Giới hạn tăng thêm cho tất cả sản phẩm có quyền lợi trợ cấp viện phí và phẫu thuật trên cùng NĐBH:

```ts
if (insuredAge >= 0 && insuredAge <= 6) {
  specialSurgeryTotalLimit = 500_000;
}

if (insuredAge >= 7 && insuredAge <= 17) {
  specialSurgeryTotalLimit = 1_000_000;
}

if (insuredAge >= 18) {
  specialSurgeryTotalLimit = 2_000_000;
}
```

## Validate

```ts
function validateR29(stbh, mainDeathBenefit, insuredAge) {
  const min = 100_000;

  const max =
    insuredAge < 18
      ? Math.min(300_000, mainDeathBenefit * 0.2)
      : Math.min(1_000_000, mainDeathBenefit * 0.2);

  return stbh >= min && stbh <= max;
}
```

---

# 10. Hàm validate tổng hợp

```ts
function validateAddonSumAssured({
  addonCode,
  addonSumAssured,
  mainDeathBenefit,
  annualBasicPremium,
  insuredAge,
  relation,
  r26Plan,
  configuredR25MaxLimit = Infinity,
}) {
  switch (addonCode) {
    case "R21": {
      const validAge =
        relation === "MAIN_INSURED"
          ? insuredAge >= 0 && insuredAge <= 65
          : insuredAge >= 18 && insuredAge <= 65;

      const max =
        relation === "MAIN_INSURED"
          ? Math.min(mainDeathBenefit, 3_000_000_000)
          : Math.min(mainDeathBenefit, 1_000_000_000);

      return {
        valid: validAge && addonSumAssured >= 100_000_000 && addonSumAssured <= max,
        min: 100_000_000,
        max,
        readonlyValue: null,
      };
    }

    case "R22": {
      const max = Math.min(500_000_000, mainDeathBenefit);

      return {
        valid: addonSumAssured >= 100_000_000 && addonSumAssured <= max,
        min: 100_000_000,
        max,
        readonlyValue: null,
      };
    }

    case "R23": {
      const max = mainDeathBenefit;

      return {
        valid: addonSumAssured >= 100_000_000 && addonSumAssured <= max,
        min: 100_000_000,
        max,
        readonlyValue: null,
      };
    }

    case "R24": {
      return {
        valid: true,
        min: null,
        max: null,
        readonlyValue: annualBasicPremium,
      };
    }

    case "R25": {
      const max = Math.min(mainDeathBenefit, configuredR25MaxLimit);

      return {
        valid: addonSumAssured >= 100_000_000 && addonSumAssured <= max,
        min: 100_000_000,
        max,
        readonlyValue: null,
      };
    }

    case "R26": {
      const validPlans = ["BAC", "VANG", "BACH_KIM", "KIM_CUONG", "LUC_BAO"];

      return {
        valid: validPlans.includes(r26Plan),
        min: null,
        max: null,
        readonlyValue: null,
      };
    }

    case "R27": {
      return {
        valid: true,
        min: null,
        max: null,
        readonlyValue: annualBasicPremium,
      };
    }

    case "R28": {
      return {
        valid: true,
        min: null,
        max: null,
        readonlyValue: annualBasicPremium,
      };
    }

    case "R29": {
      const max =
        insuredAge < 18
          ? Math.min(300_000, mainDeathBenefit * 0.2)
          : Math.min(1_000_000, mainDeathBenefit * 0.2);

      return {
        valid: addonSumAssured >= 100_000 && addonSumAssured <= max,
        min: 100_000,
        max,
        readonlyValue: null,
      };
    }

    default:
      return {
        valid: false,
        error: "Unsupported addon code",
      };
  }
}
```

---

# 11. Gợi ý hiển thị lỗi

```ts
const ERROR_MESSAGES = {
  BELOW_MIN: "Số tiền bảo hiểm thấp hơn mức tối thiểu cho phép.",
  ABOVE_MAX: "Số tiền bảo hiểm vượt quá mức tối đa cho phép theo sản phẩm chính.",
  INVALID_AGE: "Tuổi tham gia không phù hợp với sản phẩm bán kèm.",
  READONLY_STBH: "Sản phẩm này không cho nhập STBH thủ công.",
  INVALID_PLAN: "Chương trình bảo hiểm không hợp lệ.",
};
```

---

# 12. Lưu ý triển khai

- R24, R27, R28: không nhập STBH thủ công, nên dùng giá trị tính tự động từ phí cơ bản năm.
- R26: không dùng STBH, chỉ chọn gói quyền lợi.
- R21, R22, R23, R25, R29: có nhập STBH và cần validate min/max.
- R22 và R29 có giới hạn tích lũy theo NĐBH. Nếu hệ thống chưa có dữ liệu đa hợp đồng, có thể để TODO.
- Các hạn mức nên đưa vào file config thay vì hard-code trực tiếp trong component UI.
