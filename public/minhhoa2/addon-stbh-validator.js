(function () {
  const RELATION = {
    MAIN_INSURED: "MAIN_INSURED",
    POLICY_HOLDER: "POLICY_HOLDER",
    SPOUSE: "SPOUSE",
    CHILD: "CHILD",
    OTHER: "OTHER"
  };

  const R26_PLANS = ["Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Lục Bảo"];

  function toNumber(value) {
    return Number(value) || 0;
  }

  function getRangeValidity(currentStbh, min, max) {
    const value = toNumber(currentStbh);
    const hasRange = Number.isFinite(min) && Number.isFinite(max);
    return hasRange && value >= min && value <= max;
  }

  function getRangeResult({
    addonCode,
    min = null,
    max = null,
    currentStbh = 0,
    readonlyValue = null,
    usesManualStbh = true,
    valid = null,
    reason = ""
  }) {
    const hasRange = min !== null && max !== null;
    const isValid = valid === null
      ? (!usesManualStbh || (hasRange && getRangeValidity(currentStbh, min, max)))
      : Boolean(valid);

    return {
      addonCode,
      min,
      max,
      currentStbh: toNumber(currentStbh),
      readonlyValue,
      usesManualStbh,
      valid: isValid,
      reason,
      error: !isValid
        ? reason || (hasRange ? `Số tiền bảo hiểm phải nằm trong khoảng ${formatAddonRuleMoney(min)} - ${formatAddonRuleMoney(max)}` : "")
        : ""
    };
  }

  function formatAddonRuleMoney(value) {
    const amount = Math.round(toNumber(value));
    if (amount >= 1000000000 && amount % 1000000000 === 0) return `${amount / 1000000000} tỷ`;
    if (amount >= 1000000 && amount % 1000000 === 0) return `${amount / 1000000} triệu`;
    return `${new Intl.NumberFormat("vi-VN").format(amount)} đồng`;
  }

  function getAddonStbhRange({
    addonCode,
    mainDeathBenefit,
    annualBasicPremium,
    insuredAge,
    relation = RELATION.MAIN_INSURED,
    currentStbh = 0,
    r26Plan = "Vàng",
    configuredR25MaxLimit = Infinity
  }) {
    const code = String(addonCode || "").toUpperCase();
    const mainBenefit = toNumber(mainDeathBenefit);
    const annualPremium = toNumber(annualBasicPremium);
    const age = insuredAge === null || insuredAge === undefined ? null : Number(insuredAge);

    switch (code) {
      case "R21": {
        const validAge = relation === RELATION.MAIN_INSURED
          ? age !== null && age >= 0 && age <= 65
          : age !== null && age >= 18 && age <= 65;
        const max = relation === RELATION.MAIN_INSURED
          ? Math.min(mainBenefit, 3000000000)
          : Math.min(mainBenefit, 1000000000);

        return getRangeResult({
          addonCode: code,
          min: 100000000,
          max,
          currentStbh,
          valid: validAge && getRangeValidity(currentStbh, 100000000, max),
          reason: validAge ? "" : "Tuổi tham gia không phù hợp với sản phẩm R21."
        });
      }

      case "R22":
        return getRangeResult({
          addonCode: code,
          min: 100000000,
          max: Math.min(500000000, mainBenefit),
          currentStbh
        });

      case "R23":
        return getRangeResult({
          addonCode: code,
          min: 100000000,
          max: mainBenefit,
          currentStbh
        });

      case "R24":
      case "R27":
      case "R28":
        return getRangeResult({
          addonCode: code,
          readonlyValue: annualPremium,
          usesManualStbh: false,
          valid: true
        });

      case "R25": {
        const max = Math.min(mainBenefit, configuredR25MaxLimit);
        return getRangeResult({
          addonCode: code,
          min: 100000000,
          max,
          currentStbh
        });
      }

      case "R26":
        return getRangeResult({
          addonCode: code,
          usesManualStbh: false,
          valid: R26_PLANS.includes(r26Plan),
          reason: R26_PLANS.includes(r26Plan) ? "" : "Chương trình bảo hiểm không hợp lệ."
        });

      case "R29": {
        const validAge = age !== null && age >= 0 && age <= 69;
        const maxByAge = age !== null && age < 18 ? 300000 : 1000000;
        const max = Math.min(maxByAge, mainBenefit * 0.002);
        return getRangeResult({
          addonCode: code,
          min: 100000,
          max,
          currentStbh,
          valid: validAge && getRangeValidity(currentStbh, 100000, max),
          reason: validAge ? "" : "Tuổi tham gia R29 phải từ 0 đến 69 tuổi."
        });
      }

      default:
        return getRangeResult({
          addonCode: code,
          usesManualStbh: false,
          valid: false,
          reason: "Unsupported addon code"
        });
    }
  }

  window.AddonStbhRules = {
    RELATION,
    getAddonStbhRange,
    formatAddonRuleMoney
  };
})();
