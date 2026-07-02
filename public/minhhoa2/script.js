const loyaltyBonusPolicyYears = [5, 10, 15, 20];
const additionalPremiumAllocationFeeRate = 0;
const alternateIllustrationInterestRate = 4.25;
const fixedIllustrationInterestRate = 4.76;
const MAIN_PRODUCTS = {
  ATHD: "An Tâm Hoạch Định",
  ATPN: "An Thịnh Phúc Niên",
  LIFE_CARE_20: "Life Care 2.0"
};
const MAIN_PRODUCT_TERMS_PDFS = {
  ATHD: "Antamhoachdinh_QTĐK.pdf",
  ATPN: "Anthinhphucnien_QTĐK.pdf",
  LIFE_CARE_20: "Life-Care-2.0_NH02_QTDK.pdf"
};
let selectedMainProduct = "ATPN";
let isMainProductDropdownOpen = false;
let lifeCareTerm = 10;

function isLifeCare20() {
  return selectedMainProduct === "LIFE_CARE_20";
}

function calculateLifeCarePremium({ gender, age, term, sumAssured }) {
  if (!Number.isFinite(age) || age < 18 || age > 60 || !sumAssured) return null;
  const sexKey = gender === "Nam" ? "male" : "female";
  const rate = window.LIFE_CARE_20_RATES?.[sexKey]?.[age]?.[term];
  return rate ? Math.round(rate * sumAssured / 1000) : null;
}

window.calculateLifeCarePremium = calculateLifeCarePremium;

const riskRateTable = [
  { age: 0, maleDeath: 1.84, femaleDeath: 1.31, maleDisability: 0.26, femaleDisability: 0.19 },
  { age: 1, maleDeath: 0.72, femaleDeath: 0.59, maleDisability: 0.1, femaleDisability: 0.08 },
  { age: 2, maleDeath: 0.69, femaleDeath: 0.56, maleDisability: 0.1, femaleDisability: 0.08 },
  { age: 3, maleDeath: 0.68, femaleDeath: 0.54, maleDisability: 0.1, femaleDisability: 0.08 },
  { age: 4, maleDeath: 0.65, femaleDeath: 0.54, maleDisability: 0.09, femaleDisability: 0.08 },
  { age: 5, maleDeath: 0.61, femaleDeath: 0.53, maleDisability: 0.09, femaleDisability: 0.07 },
  { age: 6, maleDeath: 0.58, femaleDeath: 0.52, maleDisability: 0.08, femaleDisability: 0.06 },
  { age: 7, maleDeath: 0.54, femaleDeath: 0.52, maleDisability: 0.08, femaleDisability: 0.05 },
  { age: 8, maleDeath: 0.52, femaleDeath: 0.51, maleDisability: 0.08, femaleDisability: 0.05 },
  { age: 9, maleDeath: 0.52, femaleDeath: 0.5, maleDisability: 0.07, femaleDisability: 0.05 },
  { age: 10, maleDeath: 0.52, femaleDeath: 0.49, maleDisability: 0.08, femaleDisability: 0.05 },
  { age: 11, maleDeath: 0.57, femaleDeath: 0.51, maleDisability: 0.08, femaleDisability: 0.05 },
  { age: 12, maleDeath: 0.65, femaleDeath: 0.53, maleDisability: 0.09, femaleDisability: 0.05 },
  { age: 13, maleDeath: 0.75, femaleDeath: 0.57, maleDisability: 0.11, femaleDisability: 0.05 },
  { age: 14, maleDeath: 0.87, femaleDeath: 0.6, maleDisability: 0.12, femaleDisability: 0.06 },
  { age: 15, maleDeath: 1, femaleDeath: 0.65, maleDisability: 0.14, femaleDisability: 0.05 },
  { age: 16, maleDeath: 1.15, femaleDeath: 0.69, maleDisability: 0.12, femaleDisability: 0.05 },
  { age: 17, maleDeath: 1.24, femaleDeath: 0.72, maleDisability: 0.14, femaleDisability: 0.05 },
  { age: 18, maleDeath: 1.3, femaleDeath: 0.75, maleDisability: 0.16, femaleDisability: 0.05 },
  { age: 19, maleDeath: 1.32, femaleDeath: 0.76, maleDisability: 0.18, femaleDisability: 0.06 },
  { age: 20, maleDeath: 1.35, femaleDeath: 0.79, maleDisability: 0.17, femaleDisability: 0.06 },
  { age: 21, maleDeath: 1.33, femaleDeath: 0.79, maleDisability: 0.19, femaleDisability: 0.07 },
  { age: 22, maleDeath: 1.31, femaleDeath: 0.81, maleDisability: 0.19, femaleDisability: 0.07 },
  { age: 23, maleDeath: 1.29, femaleDeath: 0.82, maleDisability: 0.18, femaleDisability: 0.08 },
  { age: 24, maleDeath: 1.26, femaleDeath: 0.85, maleDisability: 0.18, femaleDisability: 0.07 },
  { age: 25, maleDeath: 1.22, femaleDeath: 0.87, maleDisability: 0.18, femaleDisability: 0.07 },
  { age: 26, maleDeath: 1.21, femaleDeath: 0.9, maleDisability: 0.17, femaleDisability: 0.06 },
  { age: 27, maleDeath: 1.21, femaleDeath: 0.93, maleDisability: 0.16, femaleDisability: 0.06 },
  { age: 28, maleDeath: 1.2, femaleDeath: 0.96, maleDisability: 0.16, femaleDisability: 0.06 },
  { age: 29, maleDeath: 1.23, femaleDeath: 1, maleDisability: 0.15, femaleDisability: 0.06 },
  { age: 30, maleDeath: 1.25, femaleDeath: 1.03, maleDisability: 0.15, femaleDisability: 0.07 },
  { age: 31, maleDeath: 1.28, femaleDeath: 1.07, maleDisability: 0.16, femaleDisability: 0.07 },
  { age: 32, maleDeath: 1.34, femaleDeath: 1.11, maleDisability: 0.16, femaleDisability: 0.07 },
  { age: 33, maleDeath: 1.39, femaleDeath: 1.15, maleDisability: 0.17, femaleDisability: 0.08 },
  { age: 34, maleDeath: 1.46, femaleDeath: 1.21, maleDisability: 0.18, femaleDisability: 0.08 },
  { age: 35, maleDeath: 1.55, femaleDeath: 1.27, maleDisability: 0.19, femaleDisability: 0.09 },
  { age: 36, maleDeath: 1.66, femaleDeath: 1.37, maleDisability: 0.2, femaleDisability: 0.09 },
  { age: 37, maleDeath: 1.77, femaleDeath: 1.47, maleDisability: 0.22, femaleDisability: 0.1 },
  { age: 38, maleDeath: 1.9, femaleDeath: 1.6, maleDisability: 0.24, femaleDisability: 0.1 },
  { age: 39, maleDeath: 2.06, femaleDeath: 1.76, maleDisability: 0.26, femaleDisability: 0.1 },
  { age: 40, maleDeath: 2.24, femaleDeath: 1.94, maleDisability: 0.28, femaleDisability: 0.08 },
  { age: 41, maleDeath: 2.44, femaleDeath: 2.11, maleDisability: 0.3, femaleDisability: 0.09 },
  { age: 42, maleDeath: 2.64, femaleDeath: 2.29, maleDisability: 0.33, femaleDisability: 0.09 },
  { age: 43, maleDeath: 2.85, femaleDeath: 2.46, maleDisability: 0.37, femaleDisability: 0.1 },
  { age: 44, maleDeath: 3.09, femaleDeath: 2.64, maleDisability: 0.41, femaleDisability: 0.11 },
  { age: 45, maleDeath: 3.33, femaleDeath: 2.82, maleDisability: 0.45, femaleDisability: 0.12 },
  { age: 46, maleDeath: 3.6, femaleDeath: 3, maleDisability: 0.5, femaleDisability: 0.14 },
  { age: 47, maleDeath: 3.88, femaleDeath: 3.19, maleDisability: 0.54, femaleDisability: 0.16 },
  { age: 48, maleDeath: 4.19, femaleDeath: 3.41, maleDisability: 0.59, femaleDisability: 0.17 },
  { age: 49, maleDeath: 4.53, femaleDeath: 3.65, maleDisability: 0.64, femaleDisability: 0.18 },
  { age: 50, maleDeath: 4.91, femaleDeath: 3.87, maleDisability: 0.69, femaleDisability: 0.23 },
  { age: 51, maleDeath: 5.36, femaleDeath: 4.15, maleDisability: 0.74, femaleDisability: 0.25 },
  { age: 52, maleDeath: 5.85, femaleDeath: 4.47, maleDisability: 0.81, femaleDisability: 0.27 },
  { age: 53, maleDeath: 6.42, femaleDeath: 4.81, maleDisability: 0.88, femaleDisability: 0.29 },
  { age: 54, maleDeath: 7.05, femaleDeath: 5.16, maleDisability: 0.96, femaleDisability: 0.32 },
  { age: 55, maleDeath: 7.73, femaleDeath: 5.52, maleDisability: 1.04, femaleDisability: 0.34 },
  { age: 56, maleDeath: 8.45, femaleDeath: 5.87, maleDisability: 1.13, femaleDisability: 0.37 },
  { age: 57, maleDeath: 9.23, femaleDeath: 6.21, maleDisability: 1.2, femaleDisability: 0.39 },
  { age: 58, maleDeath: 10.08, femaleDeath: 6.54, maleDisability: 1.26, femaleDisability: 0.42 },
  { age: 59, maleDeath: 11, femaleDeath: 6.91, maleDisability: 1.34, femaleDisability: 0.45 },
  { age: 60, maleDeath: 11.76, femaleDeath: 7.15, maleDisability: 1.68, femaleDisability: 0.69 },
  { age: 61, maleDeath: 12.88, femaleDeath: 7.67, maleDisability: 1.81, femaleDisability: 0.76 },
  { age: 62, maleDeath: 14.17, femaleDeath: 8.34, maleDisability: 1.93, femaleDisability: 0.85 },
  { age: 63, maleDeath: 15.62, femaleDeath: 9.16, maleDisability: 2.05, femaleDisability: 0.94 },
  { age: 64, maleDeath: 17.23, femaleDeath: 10.11, maleDisability: 2.19, femaleDisability: 1.03 },
  { age: 65, maleDeath: 18.95, femaleDeath: 11.09, maleDisability: 2.35, femaleDisability: 1.14 },
  { age: 66, maleDeath: 20.77, femaleDeath: 12.11, maleDisability: 2.53, femaleDisability: 1.26 },
  { age: 67, maleDeath: 22.71, femaleDeath: 13.09, maleDisability: 2.72, femaleDisability: 1.41 },
  { age: 68, maleDeath: 24.78, femaleDeath: 14.1, maleDisability: 2.94, femaleDisability: 1.57 },
  { age: 69, maleDeath: 27.08, femaleDeath: 15.23, maleDisability: 3.17, femaleDisability: 1.75 },
  { age: 70, maleDeath: 33.1, femaleDeath: 18.53, maleDisability: 0, femaleDisability: 0 },
  { age: 71, maleDeath: 36.34, femaleDeath: 20.42, maleDisability: 0, femaleDisability: 0 },
  { age: 72, maleDeath: 40.06, femaleDeath: 22.78, maleDisability: 0, femaleDisability: 0 },
  { age: 73, maleDeath: 44.27, femaleDeath: 25.59, maleDisability: 0, femaleDisability: 0 },
  { age: 74, maleDeath: 48.88, femaleDeath: 28.84, maleDisability: 0, femaleDisability: 0 },
  { age: 75, maleDeath: 53.8, femaleDeath: 32.45, maleDisability: 0, femaleDisability: 0 },
  { age: 76, maleDeath: 58.96, femaleDeath: 36.36, maleDisability: 0, femaleDisability: 0 },
  { age: 77, maleDeath: 64.3, femaleDeath: 40.54, maleDisability: 0, femaleDisability: 0 },
  { age: 78, maleDeath: 69.86, femaleDeath: 45.06, maleDisability: 0, femaleDisability: 0 },
  { age: 79, maleDeath: 75.81, femaleDeath: 50.06, maleDisability: 0, femaleDisability: 0 },
  { age: 80, maleDeath: 82.35, femaleDeath: 55.74, maleDisability: 0, femaleDisability: 0 },
  { age: 81, maleDeath: 89.67, femaleDeath: 62.26, maleDisability: 0, femaleDisability: 0 },
  { age: 82, maleDeath: 97.93, femaleDeath: 69.8, maleDisability: 0, femaleDisability: 0 },
  { age: 83, maleDeath: 107.07, femaleDeath: 78.32, maleDisability: 0, femaleDisability: 0 },
  { age: 84, maleDeath: 116.9, femaleDeath: 87.7, maleDisability: 0, femaleDisability: 0 },
  { age: 85, maleDeath: 127.18, femaleDeath: 97.83, maleDisability: 0, femaleDisability: 0 },
  { age: 86, maleDeath: 137.77, femaleDeath: 108.66, maleDisability: 0, femaleDisability: 0 },
  { age: 87, maleDeath: 148.58, femaleDeath: 120.14, maleDisability: 0, femaleDisability: 0 },
  { age: 88, maleDeath: 159.62, femaleDeath: 132.3, maleDisability: 0, femaleDisability: 0 },
  { age: 89, maleDeath: 170.95, femaleDeath: 145.23, maleDisability: 0, femaleDisability: 0 }
];

function parseDateInput(value) {
  if (!value) return null;

  const text = String(value).trim();
  const parts = text.match(/\d+/g);

  if (parts && parts.length === 3) {
    const isYearFirst = parts[0].length === 4;
    const year = Number(isYearFirst ? parts[0] : parts[2]);
    const month = Number(parts[1]);
    const day = Number(isYearFirst ? parts[2] : parts[0]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOfBirthInput(value, previousValue = "", inputType = "") {
  const rawValue = String(value || "");
  let digits = rawValue.replace(/\D/g, "").slice(0, 8);

  if (
    inputType === "deleteContentBackward" &&
    previousValue.endsWith("/") &&
    `${rawValue}/` === previousValue
  ) {
    digits = digits.slice(0, -1);
  }

  if (digits.length <= 1) return digits;
  if (digits.length <= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function moveCaretAfterDigit(input, digitCount) {
  let nextPosition = input.value.length;
  let seenDigits = 0;

  if (digitCount <= 0) {
    input.setSelectionRange(0, 0);
    return;
  }

  for (let index = 0; index < input.value.length; index += 1) {
    if (/\d/.test(input.value[index])) {
      seenDigits += 1;
    }

    if (seenDigits >= digitCount) {
      nextPosition = index + 1;
      break;
    }
  }

  if (input.value[nextPosition] === "/") {
    nextPosition += 1;
  }

  input.setSelectionRange(nextPosition, nextPosition);
}

function applyDateOfBirthMask(event) {
  const input = event.target;
  const selectionStart = input.selectionStart || 0;
  const digitCountBeforeCaret = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
  const previousValue = input.dataset.previousValue || "";
  const formattedValue = formatDateOfBirthInput(input.value, previousValue, event.inputType);

  input.value = formattedValue;
  input.dataset.previousValue = formattedValue;
  moveCaretAfterDigit(input, digitCountBeforeCaret);
}

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = parseDateInput(dateOfBirth);

  if (!birthDate) return 0;

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return Math.max(age, 0);
}

function getInitialFeeRate(policyYear) {
  if (policyYear === 1) return 0.5;
  if (policyYear === 2) return 0.3;
  if (policyYear >= 3 && policyYear <= 5) return 0.2;
  if (policyYear >= 6 && policyYear <= 10) return 0.02;
  return 0;
}

function getPolicyManagementFee(policyYear) {
  return Math.min(365000 + (policyYear - 1) * 12000, 840000);
}

function getRiskRates(age, gender) {
  const row = riskRateTable.find((item) => item.age === age);

  if (!row) {
    return { deathRate: 0, disabilityRate: 0 };
  }

  if (gender === "Nam") {
    return { deathRate: row.maleDeath, disabilityRate: row.maleDisability };
  }

  return { deathRate: row.femaleDeath, disabilityRate: row.femaleDisability };
}

function calculateDisabilitySumAssured(annualBasicPremium, deathBenefit) {
  const maxTTTBVV = annualBasicPremium < 30000000
    ? 300000000
    : Math.min(annualBasicPremium * 10, 2000000000);

  return Math.min(deathBenefit, maxTTTBVV);
}

function getDeathSumAssuredMaxFactor(age, gender) {
  const maxFactorRows = [
    { maxAge: 4, male: 45, female: 50 },
    { maxAge: 17, male: 45, female: 55 },
    { maxAge: 30, male: 50, female: 55 },
    { maxAge: 35, male: 45, female: 55 },
    { maxAge: 36, male: 40, female: 50 },
    { maxAge: 38, male: 35, female: 45 },
    { maxAge: 40, male: 30, female: 40 },
    { maxAge: 41, male: 30, female: 35 },
    { maxAge: 44, male: 25, female: 35 },
    { maxAge: 45, male: 25, female: 30 },
    { maxAge: 49, male: 20, female: 30 },
    { maxAge: 51, male: 20, female: 25 },
    { maxAge: 57, male: 15, female: 20 },
    { maxAge: Infinity, male: 10, female: 15 }
  ];
  const row = maxFactorRows.find((item) => age <= item.maxAge);

  if (!row) return null;
  return gender === "Nam" ? row.male : row.female;
}

function getDeathSumAssuredRange(annualPremium, age, gender) {
  if (selectedMainProduct === "ATPN") {
    return getAtpnDeathSumAssuredRange(annualPremium, age, gender);
  }

  const maxFactor = getDeathSumAssuredMaxFactor(age, gender);

  if (!annualPremium || !maxFactor) return null;

  return {
    min: Math.max(50000000, annualPremium * 5),
    max: Math.min(25000000000, annualPremium * maxFactor),
    maxFactor
  };
}

function calculateLoyaltyBonus(
  policyYear,
  yearEndValuesBeforeBonus,
  effectivePremiumPaymentYears,
  loyaltyRate = 0.01
) {
  if (!loyaltyBonusPolicyYears.includes(policyYear)) return 0;
  if (policyYear > effectivePremiumPaymentYears) return 0;

  const lastFiveYears = yearEndValuesBeforeBonus.slice(-5);
  if (lastFiveYears.length < 5) return 0;

  const average = lastFiveYears.reduce((sum, value) => sum + value, 0) / lastFiveYears.length;
  return average * loyaltyRate;
}

function getSurrenderFeeRate(policyYear) {
  if (policyYear === 1) return 1;
  if (policyYear === 2) return 1;
  if (policyYear === 3) return 0.45;
  if (policyYear === 4) return 0.4;
  if (policyYear === 5) return 0.2;
  return 0;
}

function getEffectivePremiumPaymentYears(initialAge, premiumPaymentYears) {
  return Math.max(premiumPaymentYears, 0);
}

function generateAthdIllustration(input) {
  const {
    dateOfBirth,
    gender,
    deathSumAssured,
    disabilitySumAssured,
    annualPremium,
    additionalPremium = 0,
    premiumPaymentYears,
    illustrationYears,
    interestRate
  } = input;

  const initialAge = calculateAge(dateOfBirth);
  const effectivePremiumPaymentYears = getEffectivePremiumPaymentYears(
    initialAge,
    premiumPaymentYears
  );
  const monthlyInterestRate = Math.pow(1 + interestRate, 1 / 12) - 1;
  const monthlyRows = [];
  const yearEndValuesBeforeBonus = [];
  let basicAccountEndOfMonth = 0;
  let additionalAccountEndOfMonth = 0;
  let bonusAccountEndOfMonth = 0;

  for (let monthNumber = 1; monthNumber <= illustrationYears * 12; monthNumber += 1) {
    const policyYear = Math.floor((monthNumber - 1) / 12) + 1;
    const monthInYear = ((monthNumber - 1) % 12) + 1;
    const age = initialAge + policyYear - 1;
    const annualBasePremium = policyYear <= effectivePremiumPaymentYears ? annualPremium : 0;
    const additionalPremiumThisYear =
      policyYear <= effectivePremiumPaymentYears ? additionalPremium : 0;
    const initialFeeRate = getInitialFeeRate(policyYear);
    const initialFee = annualBasePremium * initialFeeRate;
    const investmentPremium = annualBasePremium - initialFee;
    const additionalPremiumFee = additionalPremiumThisYear * additionalPremiumAllocationFeeRate;
    const additionalInvestmentPremium = additionalPremiumThisYear - additionalPremiumFee;
    const investmentPremiumThisMonth = monthInYear === 1 ? investmentPremium : 0;
    const additionalInvestmentThisMonth = monthInYear === 1 ? additionalInvestmentPremium : 0;
    let basicAccountStartOfMonth = basicAccountEndOfMonth + investmentPremiumThisMonth;
    let additionalAccountStartOfMonth = additionalAccountEndOfMonth + additionalInvestmentThisMonth;
    const policyManagementFeeMonth = getPolicyManagementFee(policyYear) / 12;

    const policyManagementDeduction = deductFromAccounts(
      basicAccountStartOfMonth,
      additionalAccountStartOfMonth,
      policyManagementFeeMonth
    );
    basicAccountStartOfMonth = policyManagementDeduction.basicAccount;
    additionalAccountStartOfMonth = policyManagementDeduction.additionalAccount;

    const narBase = Math.max(basicAccountStartOfMonth, 0);
    const narDeath = Math.max(deathSumAssured - narBase, 0);
    const narDisability = Math.max(disabilitySumAssured - narBase, 0);
    const { deathRate, disabilityRate } = getRiskRates(age, gender);
    const riskFeeDeath = (narDeath * deathRate) / 1000 / 12;
    const riskFeeDisability = (narDisability * disabilityRate) / 1000 / 12;
    const totalRiskFee = riskFeeDeath + riskFeeDisability;

    const riskFeeDeduction = deductFromAccounts(
      basicAccountStartOfMonth,
      additionalAccountStartOfMonth,
      totalRiskFee
    );
    const basicAccountBeforeInterest = riskFeeDeduction.basicAccount;
    const additionalAccountBeforeInterest = riskFeeDeduction.additionalAccount;
    const basicInterest = basicAccountBeforeInterest * monthlyInterestRate;
    const additionalInterest = additionalAccountBeforeInterest * monthlyInterestRate;
    const basicAccountBeforeBonus = Math.max(basicAccountBeforeInterest + basicInterest, 0);
    const additionalAccountBeforeBonus = Math.max(
      additionalAccountBeforeInterest + additionalInterest,
      0
    );
    const accountValueBeforeBonus = basicAccountBeforeBonus + additionalAccountBeforeBonus;

    let loyaltyBonus = 0;
    if (monthInYear === 12) {
      const valuesForBonus = [...yearEndValuesBeforeBonus, accountValueBeforeBonus];
      loyaltyBonus = calculateLoyaltyBonus(
        policyYear,
        valuesForBonus,
        effectivePremiumPaymentYears
      );
      yearEndValuesBeforeBonus.push(accountValueBeforeBonus);
    }

    const bonusAccountStartOfMonth = monthNumber === 1 ? 0 : bonusAccountEndOfMonth;
    bonusAccountEndOfMonth = bonusAccountStartOfMonth * (1 + monthlyInterestRate) + loyaltyBonus;
    const accountValueEndOfMonth =
      basicAccountBeforeBonus + additionalAccountBeforeBonus + bonusAccountEndOfMonth;

    monthlyRows.push({
      policyYear,
      monthInYear,
      age,
      annualBasePremium,
      additionalPremium: additionalPremiumThisYear,
      additionalPremiumFee,
      additionalInvestmentPremium,
      initialFee,
      investmentPremium,
      policyManagementFee: policyManagementFeeMonth,
      riskFeeDeath,
      riskFeeDisability,
      riskFee: totalRiskFee,
      loyaltyBonus,
      basicAccountValue: basicAccountBeforeBonus,
      additionalAccountValue: additionalAccountBeforeBonus,
      bonusAccountValue: bonusAccountEndOfMonth,
      accountValueBeforeBonus,
      accountValue: accountValueEndOfMonth
    });

    basicAccountEndOfMonth = basicAccountBeforeBonus;
    additionalAccountEndOfMonth = additionalAccountBeforeBonus;
  }

  const results = [];
  let cumulativePremium = 0;
  let cumulativeInvestmentPremium = 0;

  for (let policyYear = 1; policyYear <= illustrationYears; policyYear += 1) {
    const months = monthlyRows.filter((row) => row.policyYear === policyYear);
    const lastMonth = months[months.length - 1];
    const annualBasePremium = months[0]?.annualBasePremium || 0;
    const additionalPremiumThisYear = months[0]?.additionalPremium || 0;
    const initialFee = months[0]?.initialFee || 0;
    const investmentPremium = months[0]?.investmentPremium || 0;
    const additionalPremiumFee = months[0]?.additionalPremiumFee || 0;
    const additionalInvestmentPremium = months[0]?.additionalInvestmentPremium || 0;
    cumulativePremium += annualBasePremium + additionalPremiumThisYear;
    cumulativeInvestmentPremium += investmentPremium + additionalInvestmentPremium;

    const policyManagementFee = sumBy(months, "policyManagementFee");
    const riskFeeDeath = sumBy(months, "riskFeeDeath");
    const riskFeeDisability = sumBy(months, "riskFeeDisability");
    const totalRiskFee = sumBy(months, "riskFee");
    const loyaltyBonus = sumBy(months, "loyaltyBonus");
    const accountValue = lastMonth?.accountValue || 0;
    const basicAccountValue = lastMonth?.basicAccountValue || 0;
    const additionalAccountValue = lastMonth?.additionalAccountValue || 0;
    const bonusAccountValue = lastMonth?.bonusAccountValue || 0;
    const surrenderFee = annualPremium * getSurrenderFeeRate(policyYear);
    const cashValue =
      Math.max(basicAccountValue - surrenderFee, 0) + additionalAccountValue + bonusAccountValue;

    results.push({
      policyYear,
      age: initialAge + policyYear - 1,
      yearAge: `${policyYear}/${initialAge + policyYear - 1}`,
      cumulativePremium: Math.round(cumulativePremium),
      cumulativeInvestmentPremium: Math.round(cumulativeInvestmentPremium),
      riskFee: Math.round(totalRiskFee),
      accountValue: Math.round(accountValue),
      cashValue: Math.round(cashValue),
      basicAccountValue: Math.round(basicAccountValue),
      additionalAccountValue: Math.round(additionalAccountValue),
      bonusAccountValue: Math.round(bonusAccountValue),
      riskFeeDeath: Math.round(riskFeeDeath),
      riskFeeDisability: Math.round(riskFeeDisability),
      policyManagementFee: Math.round(policyManagementFee),
      investmentPremium: Math.round(investmentPremium),
      initialFee: Math.round(initialFee),
      additionalPremiumFee: Math.round(additionalPremiumFee),
      additionalInvestmentPremium: Math.round(additionalInvestmentPremium),
      loyaltyBonus: Math.round(loyaltyBonus)
    });
  }

  return results;
}

// ===============================
// ATPN PRODUCT ENGINE
// ===============================
function getAtpnGenderKey(gender) {
  return gender === "Nam" ? "male" : "female";
}

function getAtpnTables() {
  return window.ATPN_TABLES || {};
}

function getAtpnMaxInsuranceFactor(age, gender) {
  const rows = getAtpnTables().factor?.maxFactors || [];
  const row = rows.find((item) => Number(item.age) === Number(age));
  return row ? Number(row[getAtpnGenderKey(gender)]) || null : null;
}

function getAtpnDeathSumAssuredRange(annualPremium, age, gender) {
  const maxFactor = getAtpnMaxInsuranceFactor(age, gender);
  if (!annualPremium || !maxFactor) return null;

  return {
    min: annualPremium * 5,
    max: annualPremium * maxFactor,
    maxFactor
  };
}

function getAtpnInitialFeeRate(policyYear, premiumType = "basic") {
  if (premiumType === "topup") {
    return policyYear <= 10 ? 0.015 : 0;
  }

  if (policyYear === 1) return 0.5;
  if (policyYear === 2) return 0.3;
  if (policyYear >= 3 && policyYear <= 5) return 0.2;
  if (policyYear >= 6 && policyYear <= 10) return 0.02;
  return 0;
}

function getAtpnPolicyManagementFee(calendarYear) {
  const policyYear = Math.max(calendarYear - 2026 + 1, 1);
  return getPolicyManagementFee(policyYear) / 12;
}

function getAtpnRiskRate(age, gender) {
  const rows = getAtpnTables().risk?.rates || [];
  const row = rows.find((item) => Number(item.age) === Number(age));
  return row ? Number(row[getAtpnGenderKey(gender)]) || 0 : 0;
}

function getAtpnRiskChargeAge(initialAge, monthNumber) {
  return Math.max(initialAge - 1 + Math.floor((monthNumber - 1 + 4) / 12), 0);
}

function getAtpnRiskFee({ deathSumAssured, policyAccountValue, age, gender }) {
  const riskRate = getAtpnRiskRate(age, gender);
  const riskSumAssured = Math.max(deathSumAssured - policyAccountValue, 0);
  const annualRiskFee = (riskSumAssured * riskRate) / 1000;
  return {
    riskRate,
    riskSumAssured,
    annualRiskFee,
    monthlyRiskFee: annualRiskFee / 12
  };
}

function getAtpnSurrenderChargeRate(policyYear) {
  if (policyYear === 1) return 1;
  if (policyYear === 2) return 0.8;
  if (policyYear === 3) return 0.45;
  if (policyYear === 4) return 0.4;
  if (policyYear === 5) return 0.2;
  return 0;
}

function getAtpnLoyaltyBonusRate(policyYear) {
  if (policyYear === 5) return 0.02;
  if (policyYear === 10) return 0.04;
  if (policyYear === 15) return 0.06;
  if (policyYear >= 20 && policyYear % 5 === 0) return 0.08;
  return 0;
}

function calculateAtpnLoyaltyBonus(policyYear, basicAccountYearEndValues, effectivePremiumPaymentYears) {
  if (policyYear > effectivePremiumPaymentYears) return 0;
  const rate = getAtpnLoyaltyBonusRate(policyYear);
  if (!rate) return 0;
  const previousFiveYears = basicAccountYearEndValues.slice(-5);
  if (previousFiveYears.length < 5) return 0;
  const average = previousFiveYears.reduce((sum, value) => sum + value, 0) / previousFiveYears.length;
  return average * rate;
}

function calculateAtpnRiskRefundBonus(policyYear, riskFeeYearTotals, effectivePremiumPaymentYears) {
  if (policyYear !== 5 && policyYear !== 10) return 0;
  if (policyYear > effectivePremiumPaymentYears) return 0;
  const previousFiveYears = riskFeeYearTotals.slice(-5);
  if (previousFiveYears.length < 5) return 0;
  const refundRate = policyYear === 5 ? 0.5 : 1;
  return previousFiveYears.reduce((sum, value) => sum + value, 0) * refundRate;
}

function generateAtpnIllustration(input) {
  const {
    dateOfBirth,
    gender,
    deathSumAssured,
    annualPremium,
    additionalPremium = 0,
    premiumPaymentYears,
    illustrationYears,
    interestRate
  } = input;

  if (!getAtpnTables().loaded) return [];

  const initialAge = calculateAge(dateOfBirth);
  const effectivePremiumPaymentYears = getEffectivePremiumPaymentYears(initialAge, premiumPaymentYears);
  const monthlyInterestRate = Math.pow(1 + interestRate, 1 / 12) - 1;
  const monthlyRows = [];
  const basicAccountYearEndValues = [];
  const riskFeeYearTotals = [];
  let basicAccountEndOfMonth = 0;
  let topupAccountEndOfMonth = 0;

  for (let monthNumber = 1; monthNumber <= illustrationYears * 12; monthNumber += 1) {
    const policyYear = Math.floor((monthNumber - 1) / 12) + 1;
    const monthInYear = ((monthNumber - 1) % 12) + 1;
    const age = initialAge + policyYear - 1;
    const calendarYear = 2026 + policyYear - 1;
    const annualBasePremium = policyYear <= effectivePremiumPaymentYears ? annualPremium : 0;
    const additionalPremiumThisYear = policyYear <= effectivePremiumPaymentYears ? additionalPremium : 0;
    const basicInitialFee = annualBasePremium * getAtpnInitialFeeRate(policyYear, "basic");
    const topupInitialFee = 0;
    const investmentPremium = annualBasePremium - basicInitialFee;
    const topupInvestmentPremium = additionalPremiumThisYear - topupInitialFee;
    const investmentPremiumThisMonth = monthInYear === 1 ? investmentPremium : 0;
    const topupInvestmentThisMonth = monthInYear === 1 ? topupInvestmentPremium : 0;
    let basicAccountStartOfMonth = basicAccountEndOfMonth + investmentPremiumThisMonth;
    let topupAccountStartOfMonth = topupAccountEndOfMonth + topupInvestmentThisMonth;

    const policyManagementFee = getAtpnPolicyManagementFee(calendarYear);
    const policyManagementDeduction = deductFromAccounts(
      basicAccountStartOfMonth,
      topupAccountStartOfMonth,
      policyManagementFee
    );
    basicAccountStartOfMonth = policyManagementDeduction.basicAccount;
    topupAccountStartOfMonth = policyManagementDeduction.additionalAccount;

    const riskFeeData = getAtpnRiskFee({
      deathSumAssured,
      policyAccountValue: basicAccountStartOfMonth,
      age: getAtpnRiskChargeAge(initialAge, monthNumber),
      gender
    });
    const riskFeeDeduction = deductFromAccounts(
      basicAccountStartOfMonth,
      topupAccountStartOfMonth,
      riskFeeData.monthlyRiskFee
    );
    const basicAccountBeforeInterest = riskFeeDeduction.basicAccount;
    const topupAccountBeforeInterest = riskFeeDeduction.additionalAccount;
    const basicAccountBeforeBonus = Math.max(
      basicAccountBeforeInterest * (1 + monthlyInterestRate),
      0
    );
    let topupAccountBeforeBonus = Math.max(
      topupAccountBeforeInterest * (1 + monthlyInterestRate),
      0
    );

    let loyaltyBonus = 0;
    let riskRefundBonus = 0;
    if (monthInYear === 12) {
      const currentRiskFeeYearTotal = sumBy(
        monthlyRows.filter((row) => row.policyYear === policyYear),
        "riskFee"
      ) + riskFeeData.monthlyRiskFee;
      const valuesForLoyaltyBonus = [...basicAccountYearEndValues, basicAccountBeforeBonus];
      const riskFeesForRefundBonus = [...riskFeeYearTotals, currentRiskFeeYearTotal];
      loyaltyBonus = calculateAtpnLoyaltyBonus(
        policyYear,
        valuesForLoyaltyBonus,
        effectivePremiumPaymentYears
      );
      riskRefundBonus = calculateAtpnRiskRefundBonus(
        policyYear,
        riskFeesForRefundBonus,
        effectivePremiumPaymentYears
      );
      topupAccountBeforeBonus += loyaltyBonus + riskRefundBonus;
      basicAccountYearEndValues.push(basicAccountBeforeBonus);
      riskFeeYearTotals.push(currentRiskFeeYearTotal);
    }

    const surrenderCharge = annualPremium * getAtpnSurrenderChargeRate(policyYear);
    const cashValue =
      Math.max(basicAccountBeforeBonus - surrenderCharge, 0) + topupAccountBeforeBonus;
    const policyAccountValue = basicAccountBeforeBonus + topupAccountBeforeBonus;
    const deathBenefit = Math.max(deathSumAssured, basicAccountBeforeBonus) + topupAccountBeforeBonus;
    const funeralBenefit = Math.min(deathSumAssured * 0.1, 30000000);

    monthlyRows.push({
      policyYear,
      monthInYear,
      age,
      annualBasePremium,
      additionalPremium: additionalPremiumThisYear,
      initialFee: basicInitialFee,
      additionalPremiumFee: topupInitialFee,
      investmentPremium,
      additionalInvestmentPremium: topupInvestmentPremium,
      policyManagementFee,
      riskFeeDeath: riskFeeData.monthlyRiskFee,
      riskFeeDisability: 0,
      riskFee: riskFeeData.monthlyRiskFee,
      loyaltyBonus,
      riskRefundBonus,
      basicAccountValue: basicAccountBeforeBonus,
      additionalAccountValue: topupAccountBeforeBonus,
      bonusAccountValue: 0,
      accountValue: policyAccountValue,
      cashValue,
      deathBenefit,
      funeralBenefit,
      maturityBenefit: policyAccountValue
    });

    basicAccountEndOfMonth = basicAccountBeforeBonus;
    topupAccountEndOfMonth = topupAccountBeforeBonus;

  }

  const results = [];
  let cumulativePremium = 0;
  let cumulativeInvestmentPremium = 0;

  for (let policyYear = 1; policyYear <= illustrationYears; policyYear += 1) {
    const months = monthlyRows.filter((row) => row.policyYear === policyYear);
    const lastMonth = months[months.length - 1];
    const annualBasePremium = months[0]?.annualBasePremium || 0;
    const additionalPremiumThisYear = months[0]?.additionalPremium || 0;
    const investmentPremium = months[0]?.investmentPremium || 0;
    const additionalInvestmentPremium = months[0]?.additionalInvestmentPremium || 0;
    cumulativePremium += annualBasePremium + additionalPremiumThisYear;
    cumulativeInvestmentPremium += investmentPremium + additionalInvestmentPremium;

    results.push({
      policyYear,
      age: initialAge + policyYear - 1,
      yearAge: `${policyYear}/${initialAge + policyYear - 1}`,
      cumulativePremium: Math.round(cumulativePremium),
      cumulativeInvestmentPremium: Math.round(cumulativeInvestmentPremium),
      riskFee: Math.round(sumBy(months, "riskFee")),
      accountValue: Math.round(lastMonth?.accountValue || 0),
      cashValue: Math.round(lastMonth?.cashValue || 0),
      basicAccountValue: Math.round(lastMonth?.basicAccountValue || 0),
      additionalAccountValue: Math.round(lastMonth?.additionalAccountValue || 0),
      bonusAccountValue: 0,
      riskFeeDeath: Math.round(sumBy(months, "riskFeeDeath")),
      riskFeeDisability: 0,
      policyManagementFee: Math.round(sumBy(months, "policyManagementFee")),
      investmentPremium: Math.round(investmentPremium),
      initialFee: Math.round(months[0]?.initialFee || 0),
      additionalPremiumFee: Math.round(months[0]?.additionalPremiumFee || 0),
      additionalInvestmentPremium: Math.round(additionalInvestmentPremium),
      loyaltyBonus: Math.round(sumBy(months, "loyaltyBonus")),
      riskRefundBonus: Math.round(sumBy(months, "riskRefundBonus")),
      deathBenefit: Math.round(lastMonth?.deathBenefit || 0),
      funeralBenefit: Math.round(lastMonth?.funeralBenefit || 0),
      maturityBenefit: Math.round(lastMonth?.maturityBenefit || 0)
    });
  }

  return results;
}

function generateIllustration(input) {
  if (input.mainProduct === "ATPN") {
    console.debug("MAIN_PRODUCT_ENGINE", "ATPN");
    return generateAtpnIllustration(input);
  }

  console.debug("MAIN_PRODUCT_ENGINE", "ATHD");
  return generateAthdIllustration(input);
}

function validateAtpnSampleIllustration() {
  if (!getAtpnTables().loaded) return null;

  const sampleInput = {
    mainProduct: "ATPN",
    dateOfBirth: "01/01/2000",
    gender: "Nam",
    deathSumAssured: 500000000,
    disabilitySumAssured: 0,
    annualPremium: 20000000,
    additionalPremium: 0,
    premiumPaymentYears: 10,
    illustrationYears: 64,
    interestRate: fixedIllustrationInterestRate / 100
  };
  const rows476 = generateAtpnIllustration(sampleInput);
  const rows425 = generateAtpnIllustration({
    ...sampleInput,
    interestRate: alternateIllustrationInterestRate / 100
  });
  const expected = {
    1: { account476: 9497000, cash476: 0, account425: 9469000, cash425: 0 },
    5: { account476: 79086000, cash476: 75086000, account425: 77997000, cash425: 73997000 },
    10: { account476: 215788000, cash476: 215788000, account425: 210303000, cash425: 210303000 },
    20: { account476: 329603000, cash476: 329603000, account425: 304879000, cash425: 304879000 }
  };

  const report = Object.entries(expected).map(([yearText, target]) => {
    const year = Number(yearText);
    const row476 = rows476.find((row) => row.policyYear === year) || {};
    const row425 = rows425.find((row) => row.policyYear === year) || {};
    const metrics = {
      account476: row476.accountValue || 0,
      cash476: row476.cashValue || 0,
      account425: row425.accountValue || 0,
      cash425: row425.cashValue || 0
    };
    const errors = Object.fromEntries(
      Object.entries(metrics).map(([key, actual]) => {
        const expectedValue = target[key] || 0;
        const denominator = expectedValue || 1;
        return [key, Math.abs(actual - expectedValue) / denominator];
      })
    );

    return {
      year,
      ...metrics,
      maxError: Math.max(...Object.values(errors)),
      within2Percent: Math.max(...Object.values(errors)) <= 0.02,
      errors
    };
  });

  console.info("ATPN_VALIDATION_REPORT", report);
  return report;
}

function buildComparableIllustration(input) {
  const primaryResults = generateIllustration(input);
  const alternateResults = generateIllustration({
    ...input,
    interestRate: alternateIllustrationInterestRate / 100
  });
  const alternateCashValueByYear = new Map(
    alternateResults.map((row) => [row.policyYear, row.cashValue])
  );

  return primaryResults.map((row) => ({
    ...row,
    cashValue425: alternateCashValueByYear.get(row.policyYear) || 0,
    cashValue476: row.cashValue
  }));
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

function deductFromAccounts(basicAccount, additionalAccount, amount) {
  const basicDeduction = Math.min(Math.max(basicAccount, 0), amount);
  const remainingAmount = amount - basicDeduction;
  const additionalDeduction = Math.min(Math.max(additionalAccount, 0), remainingAmount);

  return {
    basicAccount: Math.max(basicAccount - basicDeduction, 0),
    additionalAccount: Math.max(additionalAccount - additionalDeduction, 0),
    unpaidAmount: Math.max(remainingAmount - additionalDeduction, 0)
  };
}

function formatVND(value) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

function formatThousandVND(value) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value / 1000));
}

function parseMoneyValue(value) {
  return Number(String(value).replace(/[^\d]/g, "")) || 0;
}

function formatCommaNumber(value) {
  const numericValue = parseMoneyValue(value);
  return numericValue ? new Intl.NumberFormat("vi-VN").format(numericValue) : "";
}

function numberValue(id) {
  return Number(document.getElementById(id).value) || 0;
}

function moneyValue(id) {
  return parseMoneyValue(document.getElementById(id).value);
}

const PAYMENT_MODE_FACTOR = {
  yearly: 1,
  halfYearly: 0.53,
  quarterly: 0.28,
  monthly: 0.1
};

const PAYMENT_MODE_LABEL = {
  yearly: "Năm",
  halfYearly: "Nửa năm",
  quarterly: "Quý",
  monthly: "Tháng"
};

const DEFAULT_JOB_GROUP = 1;
const JOBS = Array.isArray(window.OCCUPATION_JOBS) ? window.OCCUPATION_JOBS : [];

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

function filterJobs(keyword) {
  const query = normalizeText(keyword);
  if (!query) return JOBS;

  const words = query.split(" ").filter(Boolean);
  return JOBS
    .filter((item) => words.every((word) => item.searchText.includes(word)));
}

const OCCUPATION_FACTOR = {
  1: 1,
  2: 1.3,
  3: 1.9,
  4: 2.5,
  5: 3.5,
  6: 3.5
};

const R21_RATE_TABLE = {
  0: { male: 0.53, female: 0.532 },
  1: { male: 0.48, female: 0.48 },
  2: { male: 0.432, female: 0.432 },
  3: { male: 0.39, female: 0.387 },
  4: { male: 0.355, female: 0.347 },
  5: { male: 0.32, female: 0.317 },
  6: { male: 0.297, female: 0.285 },
  7: { male: 0.282, female: 0.277 },
  8: { male: 0.285, female: 0.28 },
  9: { male: 0.29, female: 0.285 },
  10: { male: 0.292, female: 0.287 },
  11: { male: 0.302, female: 0.292 },
  12: { male: 0.322, female: 0.302 },
  13: { male: 0.36, female: 0.31 },
  14: { male: 0.377, female: 0.322 },
  15: { male: 0.4, female: 0.337 },
  16: { male: 0.445, female: 0.357 },
  17: { male: 0.482, female: 0.382 },
  18: { male: 0.512, female: 0.417 },
  19: { male: 0.542, female: 0.465 },
  20: { male: 0.57, female: 0.522 },
  21: { male: 0.602, female: 0.585 },
  22: { male: 0.652, female: 0.605 },
  23: { male: 0.725, female: 0.665 },
  24: { male: 0.8, female: 0.735 },
  25: { male: 0.89, female: 0.81 },
  26: { male: 0.985, female: 0.895 },
  27: { male: 1.085, female: 0.992 },
  28: { male: 1.192, female: 1.115 },
  29: { male: 1.302, female: 1.25 },
  30: { male: 1.427, female: 1.407 },
  31: { male: 1.562, female: 1.585 },
  32: { male: 1.745, female: 1.762 },
  33: { male: 1.992, female: 1.937 },
  34: { male: 2.272, female: 2.125 },
  35: { male: 2.587, female: 2.337 },
  36: { male: 2.909, female: 2.567 },
  37: { male: 3.083, female: 2.85 },
  38: { male: 3.216, female: 3.161 },
  39: { male: 3.687, female: 3.47 },
  40: { male: 4.222, female: 3.907 },
  41: { male: 4.77, female: 4.367 },
  42: { male: 5.293, female: 4.743 },
  43: { male: 5.876, female: 5.105 },
  44: { male: 6.545, female: 5.49 },
  45: { male: 7.315, female: 5.893 },
  46: { male: 8.18, female: 6.306 },
  47: { male: 9.128, female: 6.731 },
  48: { male: 10.107, female: 7.171 },
  49: { male: 11.043, female: 7.633 },
  50: { male: 11.903, female: 8.104 },
  51: { male: 13.106, female: 8.57 },
  52: { male: 14.099, female: 9.017 },
  53: { male: 14.817, female: 9.442 },
  54: { male: 15.596, female: 9.922 },
  55: { male: 16.417, female: 10.403 },
  56: { male: 17.257, female: 10.87 },
  57: { male: 18.488, female: 11.335 },
  58: { male: 20.201, female: 11.747 },
  59: { male: 22.113, female: 12.329 },
  60: { male: 24.216, female: 12.868 },
  61: { male: 26.487, female: 13.387 },
  62: { male: 28.623, female: 13.898 },
  63: { male: 30.5, female: 14.412 },
  64: { male: 32.426, female: 14.948 },
  65: { male: 34.426, female: 15.456 },
  66: { male: 36.477, female: 15.844 },
  67: { male: 39.087, female: 16.242 },
  68: { male: 42.032, female: 16.65 },
  69: { male: 44.519, female: 17.068 },
  70: { male: 48.433, female: 18.488 },
  71: { male: 52.956, female: 20.39 },
  72: { male: 56.663, female: 22.57 },
  73: { male: 60.629, female: 24.15 },
  74: { male: 64.873, female: 25.84 }
};

const R25_RATE_TABLE = {
  0: { male: 2.291, female: 1.557 }, 1: { male: 1.811, female: 1.32 },
  2: { male: 1.599, female: 1.171 }, 3: { male: 1.478, female: 1.152 },
  4: { male: 1.475, female: 1.038 }, 5: { male: 1.369, female: 0.838 },
  6: { male: 1.209, female: 0.727 }, 7: { male: 1.133, female: 0.673 },
  8: { male: 1.144, female: 0.664 }, 9: { male: 1.154, female: 0.677 },
  10: { male: 1.194, female: 0.718 }, 11: { male: 1.294, female: 0.756 },
  12: { male: 1.294, female: 0.759 }, 13: { male: 1.334, female: 0.781 },
  14: { male: 1.442, female: 0.834 }, 15: { male: 1.501, female: 0.866 },
  16: { male: 1.575, female: 0.899 }, 17: { male: 1.637, female: 0.933 },
  18: { male: 1.19, female: 0.765 }, 19: { male: 1.195, female: 0.792 },
  20: { male: 1.227, female: 0.837 }, 21: { male: 1.262, female: 0.89 },
  22: { male: 1.312, female: 0.952 }, 23: { male: 1.331, female: 1.027 },
  24: { male: 1.356, female: 1.115 }, 25: { male: 1.439, female: 1.212 },
  26: { male: 1.532, female: 1.314 }, 27: { male: 1.6, female: 1.435 },
  28: { male: 1.609, female: 1.467 }, 29: { male: 1.689, female: 1.63 },
  30: { male: 1.701, female: 1.823 }, 31: { male: 1.816, female: 2.016 },
  32: { male: 1.988, female: 2.219 }, 33: { male: 2.215, female: 2.427 },
  34: { male: 2.468, female: 2.664 }, 35: { male: 2.75, female: 2.795 },
  36: { male: 3.056, female: 3.056 }, 37: { male: 3.236, female: 3.367 },
  38: { male: 3.513, female: 3.739 }, 39: { male: 3.962, female: 4.028 },
  40: { male: 4.478, female: 4.266 }, 41: { male: 5.054, female: 4.743 },
  42: { male: 5.638, female: 5.202 }, 43: { male: 6.213, female: 5.627 },
  44: { male: 6.848, female: 6.119 }, 45: { male: 7.551, female: 6.658 },
  46: { male: 8.327, female: 6.795 }, 47: { male: 9.283, female: 7.286 },
  48: { male: 10.47, female: 7.742 }, 49: { male: 11.434, female: 8.296 },
  50: { male: 12.712, female: 8.747 }, 51: { male: 13.905, female: 9.353 },
  52: { male: 14.891, female: 9.92 }, 53: { male: 15.612, female: 10.424 },
  54: { male: 16.407, female: 11.035 }, 55: { male: 17.265, female: 11.695 },
  56: { male: 18.141, female: 12.305 }, 57: { male: 19.43, female: 12.891 },
  58: { male: 21.211, female: 13.458 }, 59: { male: 23.193, female: 14.176 },
  60: { male: 26.231, female: 14.959 }, 61: { male: 28.666, female: 17.281 },
  62: { male: 31.01, female: 18.072 }, 63: { male: 33.137, female: 18.851 },
  64: { male: 35.353, female: 19.849 }, 65: { male: 43.217, female: 21.246 },
  66: { male: 46.625, female: 26.374 }, 67: { male: 50.376, female: 27.691 },
  68: { male: 54.897, female: 29.19 }, 69: { male: 59.741, female: 31.153 },
  70: { male: 65.373, female: 34.33 }, 71: { male: 71.91, female: 38.675 },
  72: { male: 79.378, female: 43.628 }, 73: { male: 87.761, female: 49.282 },
  74: { male: 96.76, female: 56.073 }
};

const R29_RATE_TABLE = [
  { min: 0, max: 4, male: 3703, female: 3254 },
  { min: 5, max: 9, male: 2057, female: 1835 },
  { min: 10, max: 14, male: 1433, female: 1215 },
  { min: 15, max: 19, male: 1300, female: 1149 },
  { min: 20, max: 24, male: 1218, female: 1256 },
  { min: 25, max: 29, male: 1437, female: 1474 },
  { min: 30, max: 34, male: 1621, female: 1723 },
  { min: 35, max: 39, male: 1772, female: 1853 },
  { min: 40, max: 44, male: 1953, female: 2158 },
  { min: 45, max: 49, male: 2482, female: 2961 },
  { min: 50, max: 54, male: 3175, female: 3650 },
  { min: 55, max: 59, male: 4302, female: 4446 },
  { min: 60, max: 64, male: 5392, female: 5392 },
  { min: 65, max: 69, male: 7935, female: 7169 }
];

const R29_AGE_LIMITS = [
  { min: 0, max: 6, minAmount: 100000, maxPerPolicy: 300000, maxTotal: 300000, maxHospital: 500000 },
  { min: 7, max: 17, minAmount: 100000, maxPerPolicy: 300000, maxTotal: 300000, maxHospital: 1000000 },
  { min: 18, max: 69, minAmount: 100000, maxPerPolicy: 1000000, maxTotal: 2000000, maxHospital: 2000000 }
];
const R29_MAIN_SUM_RATIO = 0.002;

const R26_PLANS = ["Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Lục Bảo"];
const R26_BENEFIT_LABELS = {
  inpatient: "Nội trú",
  outpatient: "Ngoại trú",
  dental: "Nha khoa",
  maternity: "Thai sản"
};

const R26_BENEFIT_DESCRIPTIONS = {
  inpatient: "Chi phí điều trị nội trú",
  outpatient: "Khám và điều trị ngoại trú",
  dental: "Chăm sóc răng miệng",
  maternity: "Quyền lợi thai sản"
};

const R26_PLAN_BENEFITS = {
  "Bạc": ["inpatient"],
  "Vàng": ["inpatient", "outpatient", "dental", "maternity"],
  "Bạch Kim": ["inpatient", "outpatient", "dental", "maternity"],
  "Kim Cương": ["inpatient", "outpatient", "dental", "maternity"],
  "Lục Bảo": ["inpatient", "outpatient", "dental", "maternity"]
};

const R26_RATE_TABLE = {
  inpatient: [
    [0, 0, [4808, 12591, 20546, 24282, 39439]], [1, 2, [3345, 8444, 14208, 17243, 28065]],
    [3, 3, [3717, 9382, 15786, 19159, 31183]], [4, 4, [3717, 10555, 17760, 21554, 35081]],
    [5, 5, [1352, 3278, 5354, 7837, 12756]], [6, 6, [1521, 3278, 5354, 6966, 11339]],
    [7, 8, [1521, 3278, 5354, 6269, 10205]], [9, 9, [1352, 2950, 4818, 6269, 10205]],
    [10, 12, [1095, 2283, 3703, 5031, 8182]], [13, 14, [985, 2283, 3703, 5031, 8182]],
    [15, 15, [1323, 2565, 4364, 6112, 9946]], [16, 19, [1191, 2565, 4364, 6112, 9946]],
    [20, 24, [1483, 2635, 5253, 7596, 12357]], [25, 29, [1628, 2660, 5689, 8325, 13538]],
    [30, 34, [1683, 3053, 5873, 8578, 13947]], [35, 39, [1764, 3198, 6143, 8968, 14576]],
    [40, 44, [1816, 3477, 6400, 9208, 14960]], [45, 49, [2106, 4457, 7610, 10680, 17355]],
    [50, 54, [2420, 5364, 8845, 12258, 19916]], [55, 59, [2718, 6298, 10048, 13738, 22318]],
    [60, 64, [3626, 8401, 13418, 18374, 29853]], [65, 70, [3853, 8928, 14281, 19584, 31830]]
  ],
  outpatient: [
    [0, 0, [null, 3300, 6186, 13402, 28846]], [1, 3, [null, 1422, 2666, 5776, 12432]],
    [4, 4, [null, 1778, 3333, 7220, 15540]], [5, 6, [null, 488, 912, 2200, 5325]],
    [7, 8, [null, 488, 912, 2200, 4260]], [9, 9, [null, 610, 912, 1980, 4260]],
    [10, 14, [null, 262, 492, 1064, 2290]], [15, 19, [null, 422, 792, 1714, 3690]],
    [20, 24, [null, 770, 1446, 3132, 6740]], [25, 29, [null, 1176, 2202, 4774, 10272]],
    [30, 34, [null, 1198, 2244, 4862, 10468]], [35, 44, [null, 990, 1856, 4022, 8652]],
    [45, 49, [null, 1002, 1880, 4074, 8764]], [50, 54, [null, 1130, 2116, 4588, 9874]],
    [55, 59, [null, 1242, 2330, 5046, 10860]], [60, 64, [null, 1366, 2562, 5550, 11946]],
    [65, 70, [null, 1340, 2510, 5442, 11710]]
  ],
  dental: [[0, 70, [null, 796, 1044, 1262, 1826]]],
  maternity: [[18, 45, [null, 7229, 13494, 20706, 30963]]]
};

const R24_SAMPLE_RATES = {
  male: { 30: { 10: 20602, 15: 26231, 20: 34784 } },
  female: { 30: { 10: 11915, 15: 14204, 20: 18069 } }
};

const SPBK_PRODUCTS = {
  R21: {
    code: "R21",
    name: "Bảo hiểm Bệnh nan y",
    shortDescription: "Tính phí theo tuổi, giới tính và STBH theo biểu phí 0-74.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true,
    notes: "R21 đang dùng biểu phí đầy đủ từ tuổi 0 đến 74 theo giới tính."
  },
  R22: {
    code: "R22",
    name: "Thương tật bộ phận vĩnh viễn do tai nạn 2.0",
    shortDescription: "Tỷ lệ chuẩn 0,51/1.000 STBH, điều chỉnh theo nhóm nghề nghiệp.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R23: {
    code: "R23",
    name: "Tử vong và Thương tật nghiêm trọng do tai nạn",
    shortDescription: "Tính theo nhóm tuổi, nhóm nghề nghiệp và STBH.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R24: {
    code: "R24",
    name: "Hỗ trợ đóng phí bảo hiểm do tử vong",
    shortDescription: "Tính theo phí định kỳ năm sản phẩm chính, tuổi, giới tính và thời hạn.",
    minSumInsured: 0,
    maxSumInsured: 0,
    step: 0,
    quickAmounts: [],
    isConfigured: true,
    notes: "File R24 chỉ có tỷ lệ mẫu cho tuổi 30. Tuổi/thời hạn khác sẽ báo chưa có biểu phí."
  },
  R25: {
    code: "R25",
    name: "Bệnh lý nghiêm trọng toàn diện",
    shortDescription: "Tính phí theo tuổi, giới tính, STBH và định kỳ đóng phí.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R26: {
    code: "R26",
    name: "Chăm sóc Sức khỏe Toàn diện",
    shortDescription: "Chọn chương trình và quyền lợi sức khỏe; biểu phí đơn vị nghìn đồng.",
    minSumInsured: 0,
    maxSumInsured: 0,
    step: 0,
    quickAmounts: [],
    isConfigured: true
  },
  R27: { code: "R27", name: "R27", shortDescription: "Chưa cấu hình sản phẩm", isConfigured: false },
  R28: { code: "R28", name: "R28", shortDescription: "Chưa cấu hình sản phẩm", isConfigured: false },
  R29: {
    code: "R29",
    name: "Trợ cấp viện phí và phẫu thuật",
    shortDescription: "Kiểm tra giới hạn STBH theo tuổi và 0,2% STBH chính.",
    minSumInsured: 100000,
    maxSumInsured: 1000000,
    step: 100000,
    quickAmounts: [100000, 300000, 500000, 1000000],
    isConfigured: true
  }
};

const VISIBLE_SPBK_PRODUCT_CODES = ["R21", "R22", "R23", "R24", "R25", "R26", "R29"];

const riderState = {
  activeCode: "R21",
  selections: {},
  hideStbhControls: false
};

const RIDER_TERMS_PDF_DIR = "SPBK_PDF";
const SPBK_BENEFIT_POPUP_EMPTY_MESSAGE = "Vui lòng chọn số tiền bảo hiểm để xem chi tiết quyền lợi.";

function getOccupationGroupNumber(occupationGroup) {
  return Number(occupationGroup) || 1;
}

function applyOccupationGroupRules(addonCode, occupationGroup, currentMaxStbh) {
  const group = getOccupationGroupNumber(occupationGroup);

  if (group <= 4) {
    return { allowed: true, maxStbh: currentMaxStbh, message: "" };
  }

  if (group === 5) {
    if (addonCode === "R22") {
      return {
        allowed: false,
        maxStbh: currentMaxStbh,
        message: "Nhóm nghề hiện tại không được tham gia R22."
      };
    }

    if (addonCode === "R23") {
      return {
        allowed: true,
        maxStbh: Math.min(currentMaxStbh ?? Infinity, 300000000),
        message: "Nhóm nghề 5: STBH R23 tối đa 300.000.000 đồng."
      };
    }
  }

  if (group === 6 && (addonCode === "R22" || addonCode === "R23")) {
    return {
      allowed: false,
      maxStbh: currentMaxStbh,
      message: `Nhóm nghề 6 không được tham gia ${addonCode}.`
    };
  }

  return { allowed: true, maxStbh: currentMaxStbh, message: "" };
}

const R26_BENEFIT_LIMITS = {
  inpatientAnnual: [150000000, 250000000, 500000000, 1000000000, 2000000000],
  inpatientSurgery: [60000000, 120000000, 250000000, 400000000, 800000000],
  inpatientNoSurgery: [30000000, 60000000, 125000000, 200000000, 400000000],
  room: [750000, 1250000, 2500000, 5000000, 10000000],
  caregiverBed: [300000, 500000, 700000, 1000000, 2000000],
  accidentalDental: [1500000, 2000000, 4000000, 6000000, 8000000],
  dialysis: [3000000, 7000000, 12000000, 15000000, 30000000],
  ambulance: [1500000, 2000000, 4000000, 6000000, 8000000],
  specialDayTreatment: [4000000, 6000000, 12000000, 20000000, 30000000],
  daySurgery: [15000000, 30000000, 60000000, 100000000, 200000000],
  outpatientAnnual: [null, 10000000, 20000000, 40000000, 80000000],
  outpatientVisit: [null, 1000000, 2000000, 4000000, 8000000],
  physiotherapy: [null, 1000000, 2000000, 4000000, 8000000],
  dentalAnnual: [null, 3000000, 5000000, 10000000, 20000000],
  dentalTreatment: [null, 1000000, 2000000, 3000000, 6000000],
  dentalScaling: [null, 500000, 700000, 1000000, 2000000],
  maternityAnnual: [null, 15000000, 30000000, 50000000, 100000000],
  normalDelivery: [null, 10000000, 20000000, 30000000, 60000000],
  cSection: [null, 15000000, 30000000, 50000000, 100000000],
  maternityRoom: [null, 1250000, 2500000, 5000000, 10000000]
};

let activeSpbkBenefitCode = null;

function getGenderKey(gender) {
  return gender === "Nam" ? "male" : "female";
}

function getCurrentInputContext() {
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const birthDate = parseDateInput(dateOfBirth);
  return {
    age: birthDate ? calculateAge(dateOfBirth) : null,
    gender: document.getElementById("gender").value,
    occupationGroup: getOccupationGroupNumber(document.getElementById("occupationGroup")?.value || "1"),
    paymentMode: document.getElementById("paymentMode")?.value || "yearly",
    mainSumAssured: moneyValue("deathSumAssured"),
    mainAnnualPremium: moneyValue("annualPremium"),
    relation: "MAIN_INSURED",
    fullName: document.getElementById("fullName").value.trim()
  };
}

function setOccupationGroup(group) {
  const select = document.getElementById("occupationGroup");
  if (!select) return;
  select.value = String(group || DEFAULT_JOB_GROUP);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setOccupationNote(message = "", isError = false) {
  const note = document.getElementById("occupationJobNote");
  if (!note) return;
  note.textContent = message;
  note.classList.toggle("is-error", Boolean(isError));
}

function findExactOccupationJob(text) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;
  return JOBS.find((item) => normalizeText(item.job) === normalizedText) || null;
}

function renderOccupationSuggestions(items) {
  const list = document.getElementById("occupationSuggestions");
  const input = document.getElementById("occupationJob");
  if (!list || !input) return;

  if (!items.length) {
    list.innerHTML = `<div class="occupation-empty">Không tìm thấy nghề phù hợp</div>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    updateOccupationSuggestionPosition();
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <button class="occupation-option" type="button" role="option" data-occupation-index="${index}">
      <span>${item.job}</span>
      <strong>${item.groupLabel}</strong>
    </button>
  `).join("");
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
  updateOccupationSuggestionPosition();

  list.querySelectorAll("[data-occupation-index]").forEach((button) => {
    button.addEventListener("click", () => {
      selectOccupationJob(items[Number(button.dataset.occupationIndex)]);
    });
  });
}

function updateOccupationSuggestionPosition() {
  const list = document.getElementById("occupationSuggestions");
  const input = document.getElementById("occupationJob");
  if (!list || !input || list.hidden) return;

  if (window.matchMedia("(max-width: 640px)").matches) {
    list.style.left = "";
    list.style.top = "";
    list.style.width = "";
    return;
  }

  const inputBox = (input.closest(".occupation-search-box") || input).getBoundingClientRect();
  const margin = 12;
  const desiredWidth = Math.min(720, window.innerWidth - margin * 2);
  const left = Math.min(Math.max(inputBox.left, margin), window.innerWidth - desiredWidth - margin);

  list.style.left = `${left}px`;
  list.style.top = `${inputBox.bottom + 6}px`;
  list.style.width = `${desiredWidth}px`;
}

function hideOccupationSuggestions() {
  const list = document.getElementById("occupationSuggestions");
  const input = document.getElementById("occupationJob");
  if (list) list.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
}

function selectOccupationJob(job) {
  const input = document.getElementById("occupationJob");
  if (!job || !input) return;
  input.value = job.job;
  setOccupationGroup(job.group);
  setOccupationNote("");
  hideOccupationSuggestions();
  renderRiderUI();
}

function handleOccupationInput() {
  const input = document.getElementById("occupationJob");
  if (!input) return;
  const text = input.value.trim();
  const exact = findExactOccupationJob(text);

  if (exact) {
    setOccupationGroup(exact.group);
    setOccupationNote("");
  } else {
    setOccupationGroup(DEFAULT_JOB_GROUP);
    setOccupationNote(
      text ? "Vui lòng chọn nghề trong danh sách gợi ý để xác định nhóm nghề." : "",
      Boolean(text)
    );
  }

  renderOccupationSuggestions(filterJobs(text));
  renderRiderUI();
}

function createDefaultRiderSelection(code) {
  const product = SPBK_PRODUCTS[code];
  return {
    code,
    selected: false,
    enabled: false,
    sumInsured: product.minSumInsured || 0,
    term: 10,
    r26Plan: "Vàng",
    r26Benefits: ["inpatient"]
  };
}

function getRiderAmountStep(product) {
  return product.step || 1;
}

function normalizeRiderAmount(product, value) {
  const min = product.minSumInsured || 0;
  if (!product.maxSumInsured) return 0;

  const step = getRiderAmountStep(product);
  const numericValue = Number(value) || min;
  return min + Math.round((numericValue - min) / step) * step;
}

function normalizeRiderSelection(selection) {
  const product = SPBK_PRODUCTS[selection.code];
  if (!product) return selection;
  if (product.maxSumInsured) {
    selection.sumInsured = normalizeRiderAmount(product, selection.sumInsured);
  }
  return selection;
}

function getRiderStbhRange(product, selection, context = getCurrentInputContext()) {
  const baseRange = window.AddonStbhRules.getAddonStbhRange({
    addonCode: product.code,
    mainDeathBenefit: context.mainSumAssured,
    annualBasicPremium: context.mainAnnualPremium,
    insuredAge: context.age,
    relation: context.relation || "MAIN_INSURED",
    currentStbh: selection?.sumInsured || 0,
    r26Plan: selection?.r26Plan,
    configuredR25MaxLimit: product.configuredMaxLimit || Infinity
  });
  const occupationRule = applyOccupationGroupRules(product.code, context.occupationGroup, baseRange?.max);

  if (!occupationRule.allowed) {
    return {
      ...baseRange,
      allowed: false,
      valid: false,
      error: occupationRule.message,
      occupationMessage: occupationRule.message
    };
  }

  if (Number.isFinite(occupationRule.maxStbh) && occupationRule.maxStbh !== baseRange?.max && baseRange?.max !== null) {
    const max = occupationRule.maxStbh;
    const valid = !baseRange.usesManualStbh || (
      baseRange.valid &&
      (selection?.sumInsured || 0) >= baseRange.min &&
      (selection?.sumInsured || 0) <= max
    );

    return {
      ...baseRange,
      max,
      valid,
      error: valid ? baseRange.error : occupationRule.message,
      occupationMessage: occupationRule.message
    };
  }

  return {
    ...baseRange,
    allowed: true,
    occupationMessage: occupationRule.message
  };
}

function formatAddonRange(range) {
  if (range.min === null || range.max === null) return "";
  const formatRangeAmount = window.AddonStbhRules?.formatAddonRuleMoney || formatShortMoney;
  return `${formatRangeAmount(range.min)} - ${formatRangeAmount(range.max)}`;
}

function getRiderSelection(code) {
  if (!riderState.selections[code]) {
    riderState.selections[code] = createDefaultRiderSelection(code);
  }
  return normalizeRiderSelection(riderState.selections[code]);
}

function applyOccupationRulesToRiderState(context = getCurrentInputContext()) {
  let notice = "";

  VISIBLE_SPBK_PRODUCT_CODES.forEach((code) => {
    const product = SPBK_PRODUCTS[code];
    const selection = riderState.selections[code];
    if (!product || !selection) return;

    const range = getRiderStbhRange(product, selection, context);
    if (range.allowed === false) {
      if (selection.selected || selection.enabled) notice = range.occupationMessage || range.error || notice;
      selection.selected = false;
      selection.enabled = false;
      return;
    }

    if (range.usesManualStbh && Number.isFinite(range.max) && selection.sumInsured > range.max) {
      selection.sumInsured = normalizeRiderAmount(product, range.max);
      notice = range.occupationMessage || notice;
    }
  });

  const activeProduct = SPBK_PRODUCTS[riderState.activeCode];
  const activeRule = activeProduct
    ? applyOccupationGroupRules(riderState.activeCode, context.occupationGroup, activeProduct.maxSumInsured || null)
    : { allowed: true };

  if (!activeRule.allowed) {
    const nextActiveCode = VISIBLE_SPBK_PRODUCT_CODES.find((code) => (
      SPBK_PRODUCTS[code]?.isConfigured &&
      applyOccupationGroupRules(code, context.occupationGroup, SPBK_PRODUCTS[code].maxSumInsured || null).allowed
    ));
    if (nextActiveCode) riderState.activeCode = nextActiveCode;
  }

  riderState.occupationNotice = notice;
}

function getR23RateByAge(age) {
  if (age === 0) return 0.108;
  if (age === 1) return 0.216;
  if (age === 2) return 0.324;
  if (age === 3) return 0.432;
  if (age >= 4 && age <= 17) return 0.54;
  if (age >= 18 && age <= 29) return 0.882;
  if (age >= 30 && age <= 39) return 0.687;
  if (age >= 40 && age <= 49) return 0.838;
  if (age >= 50 && age <= 59) return 1.124;
  if (age >= 60 && age <= 69) return 1.098;
  return null;
}

function calculateRatePremium(rate, sumInsured, paymentMode) {
  if (!rate || !sumInsured) return 0;
  return Math.round(rate * (sumInsured / 1000) * PAYMENT_MODE_FACTOR[paymentMode]);
}

function getR26Rate(age, gender, plan, benefitType) {
  if (benefitType === "maternity" && (gender !== "Nữ" || age < 18 || age > 45)) return null;
  const planIndex = R26_PLANS.indexOf(plan);
  const rows = R26_RATE_TABLE[benefitType] || [];
  const row = rows.find(([min, max]) => age >= min && age <= max);
  if (!row || planIndex < 0) return null;
  return row[2][planIndex] || null;
}

function getR26AllowedBenefits(plan) {
  return R26_PLAN_BENEFITS[plan] || R26_PLAN_BENEFITS["Vàng"];
}

function normalizeR26Selection(selection) {
  const allowedBenefits = getR26AllowedBenefits(selection.r26Plan);
  const selectedBenefits = (selection.r26Benefits || []).filter((benefit) => allowedBenefits.includes(benefit));
  selection.r26Benefits = selectedBenefits.length ? selectedBenefits : [allowedBenefits[0]];
}

function calculateR26Premium(selection, context) {
  if (context.age === null) return { premium: 0, annualPremium: 0, error: "Chưa nhập ngày sinh" };
  normalizeR26Selection(selection);
  const benefits = selection.r26Benefits || [];
  let annualPremium = 0;
  const errors = [];

  benefits.forEach((benefit) => {
    const rate = getR26Rate(context.age, context.gender, selection.r26Plan, benefit);
    if (!rate) {
      errors.push(`${R26_BENEFIT_LABELS[benefit]} không áp dụng`);
      return;
    }
    annualPremium += rate * 1000;
  });

  const premium = Math.round(annualPremium * PAYMENT_MODE_FACTOR[context.paymentMode]);
  return { premium, annualPremium, error: errors.join(". ") };
}

function getR29Rate(age, gender) {
  const row = R29_RATE_TABLE.find((item) => age >= item.min && age <= item.max);
  return row ? row[getGenderKey(gender)] : null;
}

function getR29AllowedMax(context) {
  const ageLimit = R29_AGE_LIMITS.find((item) => context.age >= item.min && context.age <= item.max);
  if (!ageLimit) return { allowed: false, min: 100000, allowedMax: 0, reason: "Tuổi không nằm trong độ tuổi tham gia R29." };

  const allowedMax = Math.min(
    ageLimit.maxPerPolicy,
    context.mainSumAssured * R29_MAIN_SUM_RATIO
  );

  return {
    allowed: allowedMax >= ageLimit.minAmount,
    min: ageLimit.minAmount,
    allowedMax: Math.floor(allowedMax / 100000) * 100000,
    reason: allowedMax < ageLimit.minAmount ? "Mức tối đa thấp hơn mức tối thiểu 100.000 đồng." : ""
  };
}

function calculateRiderPremium(code, selection, context) {
  if (!selection.enabled) return { premium: 0, annualPremium: 0, error: "" };
  if (context.age === null) return { premium: 0, annualPremium: 0, error: "Chưa nhập ngày sinh" };
  const product = SPBK_PRODUCTS[code];
  const stbhRange = product ? getRiderStbhRange(product, selection, context) : null;
  const occupationRule = applyOccupationGroupRules(code, context.occupationGroup, stbhRange?.max);

  if (!occupationRule.allowed) {
    return { premium: 0, annualPremium: 0, error: occupationRule.message };
  }

  if (stbhRange && stbhRange.usesManualStbh && !stbhRange.valid) {
    return { premium: 0, annualPremium: 0, error: stbhRange.error };
  }

  if (code === "R22") {
    const rate = 0.51 * (OCCUPATION_FACTOR[context.occupationGroup] || 1);
    return { premium: calculateRatePremium(rate, selection.sumInsured, context.paymentMode), annualPremium: calculateRatePremium(rate, selection.sumInsured, "yearly"), error: "" };
  }

  if (code === "R23") {
    const rate = getR23RateByAge(context.age);
    if (!rate) return { premium: 0, annualPremium: 0, error: "R23 chỉ áp dụng từ 0 đến 69 tuổi." };
    const adjustedRate = rate * (OCCUPATION_FACTOR[context.occupationGroup] || 1);
    return { premium: calculateRatePremium(adjustedRate, selection.sumInsured, context.paymentMode), annualPremium: calculateRatePremium(adjustedRate, selection.sumInsured, "yearly"), error: "" };
  }

  if (code === "R24") {
    const rates = R24_SAMPLE_RATES[getGenderKey(context.gender)]?.[context.age];
    const rate = rates?.[selection.term];
    if (!rate) return { premium: 0, annualPremium: 0, error: "Chưa có biểu phí R24 cho tuổi/thời hạn này." };
    const annualPremium = Math.round(rate * (context.mainAnnualPremium / 1000000));
    return { premium: Math.round(annualPremium * PAYMENT_MODE_FACTOR[context.paymentMode]), annualPremium, error: "" };
  }

  if (code === "R21" || code === "R25") {
    const table = code === "R21" ? R21_RATE_TABLE[context.age] : R25_RATE_TABLE[context.age];
    if (!table) {
      const message = code === "R21"
        ? "Chưa có tỷ lệ R21 cho tuổi này trong file cấu hình."
        : "R25 chỉ hỗ trợ độ tuổi từ 0 đến 74.";
      return { premium: 0, annualPremium: 0, error: message };
    }
    const rate = table[getGenderKey(context.gender)];
    return { premium: calculateRatePremium(rate, selection.sumInsured, context.paymentMode), annualPremium: calculateRatePremium(rate, selection.sumInsured, "yearly"), error: "" };
  }

  if (code === "R26") return calculateR26Premium(selection, context);

  if (code === "R29") {
    const rate = getR29Rate(context.age, context.gender);
    if (!rate) return { premium: 0, annualPremium: 0, error: "R29 chỉ áp dụng từ 0 đến 69 tuổi." };
    const annualPremium = calculateRatePremium(rate, selection.sumInsured, "yearly");
    return { premium: calculateRatePremium(rate, selection.sumInsured, context.paymentMode), annualPremium, error: "" };
  }

  return { premium: 0, annualPremium: 0, error: "Chưa cấu hình sản phẩm" };
}

function getOccupationTotalStbhError(context) {
  if (getOccupationGroupNumber(context.occupationGroup) < 5) return "";

  const totalStbh = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected && selection.enabled)
    .reduce((sum, selection) => {
      const product = SPBK_PRODUCTS[selection.code];
      const range = product ? getRiderStbhRange(product, selection, context) : null;
      const stbh = product?.maxSumInsured ? selection.sumInsured : range?.readonlyValue || 0;
      return sum + stbh;
    }, 0);

  return totalStbh > 2000000000
    ? "Tổng STBH của mỗi NĐBH nhóm nghề 5-6 tối đa 2.000.000.000 đồng."
    : "";
}

function formatBenefitMoney(value, suffix = "") {
  return `${formatCurrency(value)}${suffix}`;
}

function spbkBenefitRow(benefit, payout, note = "", group = "") {
  return { benefit, payout, note, group };
}

function calculateBenefitRate(sumInsured, rate, max = null) {
  const amount = Math.round((Number(sumInsured) || 0) * rate);
  return max ? Math.min(amount, max) : amount;
}

function calculateBenefitMultiple(sumInsured, multiple, max = null) {
  const amount = Math.round((Number(sumInsured) || 0) * multiple);
  return max ? Math.min(amount, max) : amount;
}

function getSpbkAgeFactor(age) {
  if (age === null || age === undefined) return 1;
  if (age < 1) return 0.2;
  if (age < 2) return 0.4;
  if (age < 3) return 0.6;
  if (age < 4) return 0.8;
  return 1;
}

function getR26Limit(plan, key) {
  const planIndex = R26_PLANS.indexOf(plan);
  if (planIndex < 0) return null;
  return R26_BENEFIT_LIMITS[key]?.[planIndex] ?? null;
}

function formatR26Limit(plan, key, suffix = "") {
  const value = getR26Limit(plan, key);
  return value ? formatBenefitMoney(value, suffix) : "Không áp dụng";
}

function getMainAnnualPremiumBenefitText(context) {
  return context.mainAnnualPremium
    ? formatBenefitMoney(context.mainAnnualPremium, "/năm")
    : "Theo phí bảo hiểm định kỳ của sản phẩm chính";
}

function buildR21BenefitRows(stbh) {
  return [
    spbkBenefitRow("Ung thư giai đoạn đầu", `25% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.25, 500000000))}`, "Tối đa 500.000.000 đồng; trừ khoản nợ nếu có"),
    spbkBenefitRow("Ung thư giai đoạn cuối", `100% STBH = ${formatBenefitMoney(stbh)}`, "Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có"),
    spbkBenefitRow("Đột quỵ", `100% STBH = ${formatBenefitMoney(stbh)}`, "Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có"),
    spbkBenefitRow("Nhồi máu cơ tim", `100% STBH = ${formatBenefitMoney(stbh)}`, "Tổng chi trả tối đa toàn bộ R21 là 100% STBH")
  ];
}

function buildR22BenefitRows(stbh) {
  const rows = [
    ["Mắt", "Mất hoàn toàn và không thể phục hồi chức năng nhìn của 01 mắt, bao gồm mất hoàn toàn mắt hoặc mù hoàn toàn", 0.55],
    ["Tai", "Mất hoàn toàn và không thể phục hồi chức năng nghe của 02 tai", 0.75],
    ["Tai", "Mất hoàn toàn và không thể phục hồi chức năng nghe của 01 tai", 0.20],
    ["Tai", "Mất toàn bộ 02 loa tai", 0.15],
    ["Tai", "Mất toàn bộ 01 loa tai", 0.05],
    ["Chi trên", "Tháo khớp cổ tay", 0.50],
    ["Chi trên", "Cắt cụt cẳng tay", 0.55],
    ["Chi trên", "Tháo khớp khuỷu tay", 0.60],
    ["Chi trên", "Cắt cụt cánh tay", 0.65],
    ["Chi trên", "Tháo khớp vai", 0.70],
    ["Ngón tay cái", "Mất 01 đốt ngón tay cái", 0.08],
    ["Ngón tay cái", "Mất toàn bộ 02 đốt ngón tay cái", 0.20],
    ["Ngón tay", "Mất toàn bộ 03 đốt ngón tay trỏ", 0.09],
    ["Ngón tay", "Mất toàn bộ 03 đốt ngón tay giữa", 0.07],
    ["Ngón tay", "Mất toàn bộ 03 đốt ngón tay áp út", 0.06],
    ["Ngón tay", "Mất toàn bộ 03 đốt ngón tay út", 0.05],
    ["Ngón tay", "Mất 01 đốt của mỗi ngón tay II, III, IV, V", 0.02],
    ["Ngón tay", "Mất 02 đốt của mỗi ngón tay II, III, IV, V", 0.04],
    ["Chi dưới", "Mất nửa bàn chân", 0.35],
    ["Chi dưới", "Tháo khớp cổ chân", 0.45],
    ["Chi dưới", "Cắt cụt cẳng chân", 0.55],
    ["Chi dưới", "Tháo khớp gối", 0.60],
    ["Chi dưới", "Cắt cụt đùi", 0.65],
    ["Chi dưới", "Tháo khớp háng", 0.70],
    ["Ngón chân", "Mất toàn bộ ngón chân cái", 0.07],
    ["Ngón chân", "Mất toàn bộ một ngón chân khác, trừ ngón chân cái", 0.03],
    ["Khác", "Mất hoàn toàn và vĩnh viễn tiếng nói", 0.50],
    ["Khác", "Mất hoàn toàn xương hàm dưới", 0.70],
    ["Khác", "Mất hoàn toàn xương hàm trên", 0.80]
  ];

  return rows.map(([group, benefit, rate]) => {
    const percent = `${Math.round(rate * 100)}%`;
    return spbkBenefitRow(
      benefit,
      `${percent} STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, rate))}`,
      `${group}; tổng chi trả tối đa 100% STBH/năm`
    );
  });
}

function buildR23BenefitRows(stbh, context) {
  const factor = getSpbkAgeFactor(context.age);
  const ageText = factor === 1 ? "" : ` x ${Math.round(factor * 100)}% theo tuổi`;
  return [
    spbkBenefitRow("Tử vong do tai nạn thông thường", `100% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, factor))}`, "Trừ khoản nợ nếu có"),
    spbkBenefitRow("Tử vong do tai nạn hàng không thương mại", `200% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, 2 * factor))}`, "Áp dụng khi là hành khách có vé trên chuyến bay được cấp phép"),
    spbkBenefitRow("Thương tật nghiêm trọng do tai nạn", `100% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, factor))}`, "Chỉ chi trả một thương tật nghiêm trọng thỏa điều kiện")
  ];
}

function buildR24BenefitRows(selection, context) {
  const annualPremiumText = getMainAnnualPremiumBenefitText(context);
  const term = Number(selection.term) || 0;
  const projectedSupport = context.mainAnnualPremium && term ? formatBenefitMoney(context.mainAnnualPremium * term) : "Theo thời hạn hỗ trợ đã chọn";
  return [
    spbkBenefitRow("Hỗ trợ đóng phí mỗi năm", annualPremiumText, "Không bao gồm phí bảo hiểm đóng thêm"),
    spbkBenefitRow("Giá trị hỗ trợ dự kiến", projectedSupport, `Minh họa theo thời hạn hỗ trợ ${term || "-"} năm`),
    spbkBenefitRow("Thời điểm bắt đầu hỗ trợ", "Từ kỳ phí tiếp theo sau ngày tử vong", "Duy trì quyền lợi sản phẩm chính trong thời gian hỗ trợ")
  ];
}

function buildR27R28BenefitRows(selection, context) {
  const annualPremiumText = getMainAnnualPremiumBenefitText(context);
  const term = Number(selection.term) || 0;
  const projectedSupport = context.mainAnnualPremium && term ? formatBenefitMoney(context.mainAnnualPremium * term) : "Theo thời hạn hỗ trợ đã chọn";
  return [
    spbkBenefitRow("Hỗ trợ tài chính khi BLNT giai đoạn đầu", annualPremiumText, "100% PBH năm; chỉ chi trả 1 lần"),
    spbkBenefitRow("Hỗ trợ tài chính khi BLNT giai đoạn cuối", annualPremiumText, "100% PBH năm; trừ khoản nợ nếu có"),
    spbkBenefitRow("Hỗ trợ đóng phí dự kiến", projectedSupport, `Theo thời hạn hỗ trợ ${term || "-"} năm còn lại`)
  ];
}

function buildR25BenefitRows(stbh) {
  return [
    spbkBenefitRow("BLNT giai đoạn đầu", `25% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.25, 500000000))}`, "Tối đa 500.000.000 đồng/bệnh; tối đa 2 bệnh thuộc 2 nhóm khác nhau"),
    spbkBenefitRow("BLNT giai đoạn cuối", `100% STBH = ${formatBenefitMoney(stbh)}`, "Chỉ chi trả một lần; trừ quyền lợi đã chi trả nếu có"),
    spbkBenefitRow("BLNT trẻ em giai đoạn cuối", `100% STBH = ${formatBenefitMoney(stbh)}`, "Áp dụng cho NĐBH từ 0 đến 17 tuổi tại thời điểm chẩn đoán"),
    spbkBenefitRow("BLNT theo giới tính giai đoạn cuối", `125% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 1.25))}`, "Nếu cùng lúc nhiều bệnh, chi trả bệnh có số tiền cao nhất"),
    spbkBenefitRow("Nằm viện đặc biệt", `10% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.10, 100000000))}`, "Tối đa 100.000.000 đồng; chỉ chi trả một lần")
  ];
}

function buildR26BenefitRows(selection) {
  normalizeR26Selection(selection);
  const plan = R26_PLANS.includes(selection.r26Plan) ? selection.r26Plan : "Vàng";
  const selectedBenefits = new Set(selection.r26Benefits || []);
  const rows = [
    spbkBenefitRow("Nội trú tối đa", formatR26Limit(plan, "inpatientAnnual", "/năm"), `Hạng chương trình ${plan}`, "inpatient"),
    spbkBenefitRow("Nội trú có phẫu thuật", formatR26Limit(plan, "inpatientSurgery", "/đợt"), "Theo giới hạn từng đợt điều trị", "inpatient"),
    spbkBenefitRow("Nội trú không phẫu thuật", formatR26Limit(plan, "inpatientNoSurgery", "/đợt"), "Theo giới hạn từng đợt điều trị", "inpatient"),
    spbkBenefitRow("Phòng & giường", formatR26Limit(plan, "room", "/ngày"), "Tối đa 60 ngày/năm", "inpatient"),
    spbkBenefitRow("ICU", "Chi phí thực tế", "Tối đa 30 ngày/năm", "inpatient"),
    spbkBenefitRow("Phẫu thuật", "Chi phí thực tế", "Trong giới hạn nội trú của hạng chương trình", "inpatient"),
    spbkBenefitRow("Chạy thận định kỳ", formatR26Limit(plan, "dialysis", "/năm"), "Theo hạng chương trình", "inpatient"),
    spbkBenefitRow("Vận chuyển cấp cứu", formatR26Limit(plan, "ambulance", "/năm"), "Theo hạng chương trình", "inpatient"),
    spbkBenefitRow("Điều trị trong ngày đặc biệt", formatR26Limit(plan, "specialDayTreatment", "/năm"), "Theo hạng chương trình", "inpatient"),
    spbkBenefitRow("Phẫu thuật trong ngày", formatR26Limit(plan, "daySurgery", "/ngày"), "Theo hạng chương trình", "inpatient")
  ];

  if (selectedBenefits.has("outpatient")) {
    rows.push(
      spbkBenefitRow("Ngoại trú", formatR26Limit(plan, "outpatientAnnual", "/năm"), "Hiển thị vì đã chọn quyền lợi Ngoại trú", "outpatient"),
      spbkBenefitRow("Ngoại trú mỗi lần khám/điều trị", formatR26Limit(plan, "outpatientVisit", "/lần"), "Tối đa 10 lần/năm", "outpatient"),
      spbkBenefitRow("Vật lý trị liệu", formatR26Limit(plan, "physiotherapy", "/năm"), "Tối đa 1 đợt/năm", "outpatient")
    );
  }

  if (selectedBenefits.has("dental")) {
    rows.push(
      spbkBenefitRow("Nha khoa", formatR26Limit(plan, "dentalAnnual", "/năm"), "Hiển thị vì đã chọn quyền lợi Nha khoa", "dental"),
      spbkBenefitRow("Điều trị nha khoa", formatR26Limit(plan, "dentalTreatment", "/lần"), "Theo giới hạn từng lần điều trị", "dental"),
      spbkBenefitRow("Lấy cao răng", formatR26Limit(plan, "dentalScaling", "/lần"), "Tối đa 1 lần/năm", "dental")
    );
  }

  if (selectedBenefits.has("maternity")) {
    rows.push(
      spbkBenefitRow("Thai sản", formatR26Limit(plan, "maternityAnnual", "/năm"), "Hiển thị vì đã chọn quyền lợi Thai sản", "maternity"),
      spbkBenefitRow("Sinh thường", formatR26Limit(plan, "normalDelivery", "/năm"), "Trong giới hạn thai sản", "maternity"),
      spbkBenefitRow("Sinh mổ / biến chứng thai sản", formatR26Limit(plan, "cSection", "/năm"), "Trong giới hạn thai sản", "maternity"),
      spbkBenefitRow("Phòng & giường thai sản", formatR26Limit(plan, "maternityRoom", "/ngày"), "Tối đa 30 ngày/năm", "maternity"),
      spbkBenefitRow("ICU thai sản", "Chi phí thực tế", "Tối đa 15 ngày/năm", "maternity")
    );
  }

  return rows;
}

function buildR29BenefitRows(stbh) {
  const ambulance = calculateBenefitMultiple(stbh, 2, 1000000);
  return [
    spbkBenefitRow("Viện phí cơ bản", `1 x STBH = ${formatBenefitMoney(stbh, "/ngày")}`, "Tối đa 50 ngày/năm; tối đa 3 lần nằm viện/năm"),
    spbkBenefitRow("ICU", `2 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 2), "/ngày")}`, "Tối đa 30 ngày/năm; 300 ngày toàn thời hạn"),
    spbkBenefitRow("Phẫu thuật cơ bản", `5 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 5), "/lần")}`, "Tối đa 2 lần/năm; 10 lần toàn thời hạn"),
    spbkBenefitRow("Phẫu thuật đặc biệt", `10 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 10), "/lần")}`, "Mỗi ca chỉ chi trả một quyền lợi phẫu thuật"),
    spbkBenefitRow("Vận chuyển cấp cứu", `2 x STBH = ${formatBenefitMoney(ambulance, "/lần")}`, "Tối đa 1.000.000 đồng/lần; tối đa 2 lần/năm")
  ];
}

function calculateSpbkBenefits(code, currentValue) {
  const product = SPBK_PRODUCTS[code];
  if (!product) {
    return { code, title: "SPBK", subtitle: "", rows: [], message: "Không tìm thấy dữ liệu sản phẩm bán kèm." };
  }

  const context = getCurrentInputContext();
  const selection = getRiderSelection(code);
  const stbh = Number(currentValue?.sumInsured ?? currentValue ?? selection.sumInsured) || 0;
  const needsStbh = Boolean(product.maxSumInsured);
  const r26Plan = currentValue?.r26Plan || selection.r26Plan;
  const r26Benefits = currentValue?.r26Benefits || selection.r26Benefits;

  if (needsStbh && !stbh) {
    return { code, title: product.name, subtitle: `${product.name} - chưa chọn STBH`, rows: [], message: SPBK_BENEFIT_POPUP_EMPTY_MESSAGE };
  }

  if (code === "R26") {
    const r26Selection = { ...selection, r26Plan, r26Benefits: [...(r26Benefits || [])] };
    return {
      code,
      title: product.name,
      subtitle: `${product.name} - hạng ${r26Selection.r26Plan}`,
      rows: buildR26BenefitRows(r26Selection),
      message: ""
    };
  }

  if (code === "R24") {
    return {
      code,
      title: product.name,
      subtitle: `${product.name} - ${getMainAnnualPremiumBenefitText(context)}`,
      rows: buildR24BenefitRows(selection, context),
      message: ""
    };
  }

  if (code === "R27" || code === "R28") {
    return {
      code,
      title: product.name,
      subtitle: `${product.name} - ${getMainAnnualPremiumBenefitText(context)}`,
      rows: buildR27R28BenefitRows(selection, context),
      message: ""
    };
  }

  const builders = {
    R21: () => buildR21BenefitRows(stbh),
    R22: () => buildR22BenefitRows(stbh),
    R23: () => buildR23BenefitRows(stbh, context),
    R25: () => buildR25BenefitRows(stbh),
    R29: () => buildR29BenefitRows(stbh)
  };

  return {
    code,
    title: product.name,
    subtitle: code === "R29"
      ? `${product.name} - STBH ${formatBenefitMoney(stbh, "/ngày")}`
      : `${product.name} - STBH ${formatBenefitMoney(stbh)}`,
    rows: builders[code] ? builders[code]() : [],
    message: builders[code] ? "" : "Chưa có bảng quyền lợi chi tiết cho sản phẩm này."
  };
}

function renderSpbkBenefitPopupContent(code) {
  const popup = document.getElementById("spbkBenefitPopup");
  if (!popup || popup.hidden) return;

  const detail = calculateSpbkBenefits(code);
  document.getElementById("spbkBenefitPopupSubtitle").textContent = detail.subtitle;
  const body = document.getElementById("spbkBenefitPopupBody");

  if (detail.message) {
    body.innerHTML = `<div class="spbk-benefit-empty">${detail.message}</div>`;
    return;
  }

  body.innerHTML = `
    <div class="spbk-benefit-table" role="table" aria-label="Chi tiết quyền lợi ${detail.code}">
      <div class="spbk-benefit-row spbk-benefit-table-head" role="row">
        <div role="columnheader">Quyền lợi</div>
        <div role="columnheader">Mức chi trả</div>
        <div role="columnheader">Ghi chú</div>
      </div>
      ${detail.rows.map((row) => `
        <div class="spbk-benefit-row ${row.group ? `spbk-benefit-group-${row.group}` : ""}" role="row">
          <div role="cell">${row.benefit}</div>
          <div role="cell">${row.payout}</div>
          <div role="cell">${row.note || "-"}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function openSpbkBenefitPopup(code) {
  if (!SPBK_PRODUCTS[code]) return;
  activeSpbkBenefitCode = code;
  const popup = document.getElementById("spbkBenefitPopup");
  if (!popup) return;
  popup.hidden = false;
  document.body.classList.add("spbk-benefit-open");
  renderSpbkBenefitPopupContent(code);
  document.getElementById("spbkBenefitPopupClose")?.focus();
}

function closeSpbkBenefitPopup() {
  const popup = document.getElementById("spbkBenefitPopup");
  if (!popup) return;
  popup.hidden = true;
  activeSpbkBenefitCode = null;
  document.body.classList.remove("spbk-benefit-open");
}

function refreshSpbkBenefitPopup() {
  if (!activeSpbkBenefitCode) return;
  renderSpbkBenefitPopupContent(activeSpbkBenefitCode);
}

window.openSpbkBenefitPopup = openSpbkBenefitPopup;
window.closeSpbkBenefitPopup = closeSpbkBenefitPopup;
window.calculateSpbkBenefits = calculateSpbkBenefits;

function formatCurrency(value) {
  return `${formatVND(value || 0)} đồng`;
}

function readInput() {
  selectedMainProduct = getSelectedMainProduct();
  updateDisabilitySumAssured();
  return {
    mainProduct: selectedMainProduct,
    fullName: document.getElementById("fullName").value.trim(),
    dateOfBirth: document.getElementById("dateOfBirth").value,
    gender: document.getElementById("gender").value,
    deathSumAssured: moneyValue("deathSumAssured"),
    disabilitySumAssured: moneyValue("disabilitySumAssured"),
    annualPremium: moneyValue("annualPremium"),
    additionalPremium: moneyValue("additionalPremium"),
    premiumPaymentYears: numberValue("premiumPaymentYears"),
    illustrationYears: numberValue("illustrationYears"),
    interestRate: fixedIllustrationInterestRate / 100
  };
}

let resultViewMode = "milestone";
let latestResults = [];
let latestInput = null;

function getDisplayResults(results) {
  if (resultViewMode === "full") return results;
  const finalYear = results[results.length - 1]?.policyYear;
  const milestoneYears = new Set([1, 5, 10, 15, finalYear].filter(Boolean));
  return results.filter((row) => milestoneYears.has(row.policyYear));
}

function renderResults(results, input) {
  const resultsSection = document.getElementById("resultsSection");
  const resultsBody = document.getElementById("resultsBody");
  const resultMeta = document.getElementById("resultMeta");
  const displayResults = getDisplayResults(results);

  latestResults = results;
  latestInput = input;

  resultsBody.innerHTML = displayResults
    .map(
      (row) => `
        <tr class="${row.loyaltyBonus > 0 ? "milestone-row" : ""}">
          <td><strong>Năm ${row.policyYear}</strong><span>/ Tuổi ${row.age}</span></td>
          <td>${formatThousandVND(row.cumulativePremium)}</td>
          <td class="cash-value">${formatThousandVND(row.cashValue425)}</td>
          <td class="cash-value">${formatThousandVND(row.cashValue476)}</td>
        </tr>
      `
    )
    .join("");

  document.getElementById("milestoneView")?.classList.toggle("active", resultViewMode === "milestone");
  document.getElementById("fullView")?.classList.toggle("active", resultViewMode === "full");
  resultMeta.textContent = "";
  resultsSection.hidden = false;
}

function renderPendingResults(message = "Nhập ngày sinh để xem giá trị tài khoản hoàn lại.") {
  const resultsSection = document.getElementById("resultsSection");
  const resultsBody = document.getElementById("resultsBody");
  const resultMeta = document.getElementById("resultMeta");

  latestResults = [];
  latestInput = null;

  resultsBody.innerHTML = `
    <tr class="empty-result-row">
      <td colspan="4">${message}</td>
    </tr>
  `;
  document.getElementById("milestoneView")?.classList.toggle("active", resultViewMode === "milestone");
  document.getElementById("fullView")?.classList.toggle("active", resultViewMode === "full");
  resultMeta.textContent = "";
  resultsSection.hidden = false;
}

function formatPercent(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function setActiveTab(tabName) {
  document.body.classList.toggle("main-mode", tabName === "main");
  document.body.classList.toggle("riders-mode", tabName === "riders");
  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.style.setProperty("background", isActive ? "#0b56d8" : "#fff", "important");
    button.style.setProperty("color", isActive ? "#fff" : "#073ea8", "important");
    button.style.setProperty("opacity", "1", "important");
  });
  document.getElementById("mainTab").classList.toggle("active", tabName === "main");
  document.getElementById("ridersTab").classList.toggle("active", tabName === "riders");
  if (tabName === "riders") renderRiderUI();
}

function formatShortMoney(value) {
  if (value >= 1000000000) return `${value / 1000000000} tỷ`;
  if (value >= 1000000) return `${value / 1000000} triệu`;
  return formatVND(value);
}

function formatCompactCurrency(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000000000 && amount % 1000000000 === 0) return `${amount / 1000000000} tỷ đồng`;
  if (amount >= 1000000 && amount % 1000000 === 0) return `${amount / 1000000} triệu đồng`;
  return formatCurrency(amount);
}

function renderRiderCustomerCard() {
  const context = getCurrentInputContext();
  document.getElementById("riderCustomerName").textContent = context.fullName || "-";
  document.getElementById("riderCustomerMeta").textContent =
    context.age === null ? `${context.gender}, - tuổi` : `${context.gender}, ${context.age} tuổi`;
  document.getElementById("riderMainSum").textContent = formatCompactCurrency(context.mainSumAssured);
  document.getElementById("riderMainPremium").textContent = formatCompactCurrency(context.mainAnnualPremium);
}

function renderRiderProductButtons() {
  const context = getCurrentInputContext();
  const container = document.getElementById("riderProductButtons");
  container.innerHTML = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => {
      const product = SPBK_PRODUCTS[code];
      const selection = riderState.selections[code];
      const occupationRule = applyOccupationGroupRules(code, context.occupationGroup, product.maxSumInsured || null);
      const result = selection ? calculateRiderPremium(code, selection, context) : { error: "" };
      const statusText = !product.isConfigured
        ? "Chưa cấu hình"
        : !occupationRule.allowed
          ? ""
          : result.error
              ? "Cần kiểm tra"
              : "Sẵn sàng";
      return `
        <button
          class="rider-pill ${riderState.activeCode === code ? "active" : ""} ${selection?.selected ? "selected" : ""}"
          type="button"
          data-rider-code="${code}"
          ${product.isConfigured && occupationRule.allowed ? "" : "disabled"}
        >
          <span>${selection?.selected ? "✓ " : ""}${code}</span>
          <small>${statusText}</small>
        </button>
        ${code === "R24" ? `
        <button
          class="rider-pill spbk-stbh-toggle ${riderState.hideStbhControls ? "is-hidden" : ""}"
          type="button"
          data-toggle-spbk-stbh
          aria-pressed="${riderState.hideStbhControls}"
        >
          <span>${riderState.hideStbhControls ? "HIỆN" : "ẨN"}</span>
          <small>STBH</small>
        </button>
        ` : ""}
      `;
    })
    .join("");

  document.querySelectorAll("[data-rider-code]").forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.dataset.riderCode;
      if (!SPBK_PRODUCTS[code].isConfigured) return;
      const rule = applyOccupationGroupRules(code, getCurrentInputContext().occupationGroup, SPBK_PRODUCTS[code].maxSumInsured || null);
      if (!rule.allowed) return;
      const selection = getRiderSelection(code);
      selection.selected = riderState.activeCode === code ? !selection.selected : true;
      selection.enabled = selection.selected;
      riderState.activeCode = code;
      renderRiderUI();
    });
  });

  document.querySelector("[data-toggle-spbk-stbh]")?.addEventListener("click", () => {
    riderState.hideStbhControls = !riderState.hideStbhControls;
    renderRiderUI();
  });
}

function renderRiderAmountControls(product, selection, range) {
  const rangeStep = getRiderAmountStep(product);
  const sliderMin = range?.min ?? product.minSumInsured;
  const sliderMax = range?.max ?? product.maxSumInsured;
  const rangeText = range ? `STBH phải nằm trong khoảng ${formatAddonRange(range)}` : "";
  const isInvalid = range && !range.valid;
  const quickAmounts = product.quickAmounts.filter((amount) => amount >= sliderMin && amount <= sliderMax);

  return `
    <div class="amount-controls">
      <div class="stepper">
        <button id="decreaseRiderAmount" type="button" aria-label="Giảm STBH SPBK">
          <img src="icons/minus.svg" alt="" aria-hidden="true" />
        </button>
        <input id="riderAmountInput" class="money-input" type="text" inputmode="numeric" value="${formatCommaNumber(selection.sumInsured)}" />
        <button id="increaseRiderAmount" type="button" aria-label="Tăng STBH SPBK">
          <img src="icons/plus.svg" alt="" aria-hidden="true" />
        </button>
      </div>
      <p class="rider-range-note ${isInvalid ? "is-error" : ""}">${rangeText}</p>
      <input id="riderAmountRange" type="range" min="${sliderMin}" max="${sliderMax}" step="${rangeStep}" value="${selection.sumInsured}" />
      <div class="quick-amounts">
        ${quickAmounts.map((amount) => `<button class="quick-amount ${selection.sumInsured === amount ? "active" : ""}" type="button" data-amount="${amount}">${formatShortMoney(amount)}</button>`).join("")}
      </div>
    </div>
  `;
}

function getRiderTermsPdfUrl(code) {
  return `${RIDER_TERMS_PDF_DIR}/${code}.pdf`;
}

function ensureRiderTermsModal() {
  let modal = document.getElementById("riderTermsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "riderTermsModal";
  modal.className = "terms-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "termsModalTitle");
  modal.innerHTML = `
    <div class="terms-backdrop" data-close-terms></div>
    <section class="terms-dialog">
      <header class="terms-header">
        <div>
          <span id="termsModalCode" class="terms-code"></span>
          <h2 id="termsModalTitle"></h2>
          <p id="termsModalSubtitle"></p>
        </div>
        <button class="terms-close" type="button" data-close-terms aria-label="Đóng điều khoản">×</button>
      </header>
      <div class="terms-toolbar">
        <a id="termsOpenLink" class="terms-link" target="_blank" rel="noopener">Mở PDF</a>
        <a id="termsDownloadLink" class="terms-link secondary" download>Tải PDF</a>
      </div>
      <div class="terms-reader">
        <iframe id="termsPdfFrame" title="Điều khoản sản phẩm"></iframe>
        <div class="terms-fallback">
          <strong>Không hiển thị được PDF?</strong>
          <span>Hãy dùng nút Mở PDF ở trên để xem bằng trình đọc của trình duyệt.</span>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll("[data-close-terms]").forEach((element) => {
    element.addEventListener("click", closeRiderTerms);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeRiderTerms();
  });

  return modal;
}

function openRiderTerms(code) {
  if (!SPBK_PRODUCTS[code]) return;
  window.location.href = getRiderTermsPdfUrl(code);
}

function closeRiderTerms() {
  const modal = document.getElementById("riderTermsModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("terms-open");
  const frame = modal.querySelector("#termsPdfFrame");
  if (frame) frame.src = "about:blank";
}

function renderR24Controls(selection) {
  return `
    <label class="compact-field">
      <span>Thời hạn bảo hiểm R24</span>
      <select id="riderTerm">
        <option value="10" ${selection.term === 10 ? "selected" : ""}>10 năm</option>
        <option value="15" ${selection.term === 15 ? "selected" : ""}>15 năm</option>
        <option value="20" ${selection.term === 20 ? "selected" : ""}>20 năm</option>
      </select>
    </label>
  `;
}

function renderR26Controls(selection) {
  normalizeR26Selection(selection);
  const allowedBenefits = getR26AllowedBenefits(selection.r26Plan);
  const planControls = R26_PLANS.map((plan) => `
      <button
        class="r26-plan-button ${selection.r26Plan === plan ? "active" : ""}"
        type="button"
        data-r26-plan="${plan}"
        aria-pressed="${selection.r26Plan === plan}"
      >
        ${plan}
      </button>
    `)
    .join("");

  const benefitControls = Object.entries(R26_BENEFIT_LABELS)
    .map(([key, label]) => {
      const isActive = selection.r26Benefits.includes(key);
      const isDisabled = !allowedBenefits.includes(key);
      return `
      <button
        class="r26-benefit-card ${isActive ? "active" : ""}"
        type="button"
        data-r26-benefit="${key}"
        aria-pressed="${isActive}"
        aria-disabled="${isDisabled}"
        ${isDisabled ? "disabled" : ""}
      >
        <span class="r26-benefit-check" aria-hidden="true"></span>
        <span>
          <strong>${label}</strong>
          <small>${R26_BENEFIT_DESCRIPTIONS[key]}</small>
        </span>
      </button>
    `;
    })
    .join("");

  return `
    <div class="r26-config">
      <section class="r26-plan-panel">
        <div class="r26-control-title">
          <strong>Chương trình bảo hiểm</strong>
          <span>${selection.r26Plan}</span>
        </div>
        <div class="r26-plan-options">${planControls}</div>
      </section>
      <section class="r26-benefit-panel">
        <div class="r26-control-title">
          <strong>Quyền lợi tham gia</strong>
          <span>${selection.r26Benefits.length}/${allowedBenefits.length}</span>
        </div>
        <div class="r26-benefit-grid">${benefitControls}</div>
      </section>
    </div>
  `;
}

function renderRiderDetail() {
  const context = getCurrentInputContext();
  const product = SPBK_PRODUCTS[riderState.activeCode];
  const selection = getRiderSelection(product.code);
  const detailCard = document.getElementById("riderDetailCard");

  if (riderState.hideStbhControls) {
    detailCard.classList.add("spbk-detail-hidden");
    detailCard.innerHTML = "";
    return;
  }

  detailCard.classList.remove("spbk-detail-hidden");
  const result = calculateRiderPremium(product.code, selection, context);
  const stbhRange = getRiderStbhRange(product, selection, context);
  const rangeText = stbhRange.usesManualStbh
    ? ""
    : stbhRange.readonlyValue !== null
      ? `Quyền lợi tự động: ${formatCurrency(stbhRange.readonlyValue)}`
      : "Sản phẩm này không dùng STBH riêng.";

  detailCard.innerHTML = `
    <div class="rider-detail-head">
      <div>
        <p>${product.code}</p>
        <h3>${product.name}</h3>
      </div>
      <div class="rider-detail-actions">
        <button class="info-button benefit-button" type="button" data-open-spbk-benefits="${product.code}" title="Xem chi tiết quyền lợi bảo vệ ${product.code}" aria-label="Xem chi tiết quyền lợi bảo vệ ${product.code}">
          <span class="benefit-button-icon" aria-hidden="true"></span>
        </button>
        <button class="info-button terms-button" type="button" data-open-rider-terms="${product.code}" title="Xem điều khoản sản phẩm ${product.code}" aria-label="Xem điều khoản sản phẩm ${product.code}">
          <span class="terms-info-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="rider-value-grid">
      <div>
        <span>${product.code === "R24" || product.code === "R26" ? "Cơ sở tính phí" : "Số tiền bảo hiểm"}</span>
        <strong id="riderDetailAmountValue">${product.maxSumInsured ? formatCurrency(selection.sumInsured) : product.code === "R24" ? formatCurrency(context.mainAnnualPremium) : selection.r26Plan}</strong>
      </div>
      <div>
        <span>Phí tương ứng năm</span>
        <strong id="riderDetailPremiumValue">${formatCurrency(result.annualPremium)}</strong>
      </div>
    </div>
    ${product.maxSumInsured ? renderRiderAmountControls(product, selection, stbhRange) : ""}
    ${product.code === "R24" ? renderR24Controls(selection) : ""}
    ${product.code === "R26" ? renderR26Controls(selection) : ""}
    ${rangeText ? `<p class="rider-range-note">${rangeText}</p>` : ""}
    ${riderState.occupationNotice ? `<p class="rider-warning">${riderState.occupationNotice}</p>` : ""}
    ${result.error ? `<p class="rider-warning">${result.error}</p>` : `<p class="rider-ok">Phí đã được tính theo ${PAYMENT_MODE_LABEL[context.paymentMode]}.</p>`}
  `;

  bindRiderDetailEvents(product, selection);
}

function bindRiderDetailEvents(product, selection) {
  const markSelectionFromAmountControl = () => {
    if (selection.selected && selection.enabled) return false;
    selection.selected = true;
    selection.enabled = true;
    return true;
  };

  const refreshRiderSelectionSummary = () => {
    renderRiderProductButtons();
    renderSelectedRiderList();
    updateRiderTotals();
    updateSummaryExportAvailability();
  };

  const updateAmountPreview = () => {
    const context = getCurrentInputContext();
    const result = calculateRiderPremium(product.code, selection, context);
    const amountValue = document.getElementById("riderDetailAmountValue");
    const premiumValue = document.getElementById("riderDetailPremiumValue");
    const input = document.getElementById("riderAmountInput");
    const range = document.getElementById("riderAmountRange");
    const stbhRange = getRiderStbhRange(product, selection, context);
    const rangeNote = document.querySelector(".amount-controls .rider-range-note");

    if (amountValue) amountValue.textContent = formatCurrency(selection.sumInsured);
    if (premiumValue) premiumValue.textContent = formatCurrency(result.annualPremium);
    if (input) input.value = formatCommaNumber(selection.sumInsured);
    if (range && Number(range.value) !== selection.sumInsured) range.value = selection.sumInsured;
    if (rangeNote) {
      rangeNote.textContent = `STBH phải nằm trong khoảng ${formatAddonRange(stbhRange)}`;
      rangeNote.classList.toggle("is-error", !stbhRange.valid);
    }

    document.querySelectorAll(".quick-amount").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.amount) === selection.sumInsured);
    });
    refreshSpbkBenefitPopup();
  };

  const setAmount = (value, shouldRender = false) => {
    selection.sumInsured = normalizeRiderAmount(product, value);
    const becameSelected = markSelectionFromAmountControl();
    updateAmountPreview();
    if (becameSelected && !shouldRender) refreshRiderSelectionSummary();
    if (shouldRender) renderRiderUI();
  };

  document.getElementById("riderAmountInput")?.addEventListener("input", (event) => setAmount(parseMoneyValue(event.target.value)));
  document.getElementById("riderAmountInput")?.addEventListener("change", () => renderRiderUI());
  document.getElementById("riderAmountRange")?.addEventListener("input", (event) => setAmount(event.target.value));
  document.getElementById("riderAmountRange")?.addEventListener("change", () => renderRiderUI());
  document.getElementById("decreaseRiderAmount")?.addEventListener("click", () => setAmount(selection.sumInsured - product.step, true));
  document.getElementById("increaseRiderAmount")?.addEventListener("click", () => setAmount(selection.sumInsured + product.step, true));
  document.querySelectorAll(".quick-amount").forEach((button) => {
    button.addEventListener("click", () => setAmount(button.dataset.amount, true));
  });
  document.getElementById("riderTerm")?.addEventListener("change", (event) => {
    selection.term = Number(event.target.value);
    renderRiderUI();
  });
  document.querySelector("[data-open-rider-terms]")?.addEventListener("click", (event) => {
    openRiderTerms(event.currentTarget.dataset.openRiderTerms);
  });
  document.querySelector("[data-open-spbk-benefits]")?.addEventListener("click", (event) => {
    openSpbkBenefitPopup(event.currentTarget.dataset.openSpbkBenefits);
  });
  document.querySelectorAll("[data-r26-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      selection.r26Plan = button.dataset.r26Plan;
      normalizeR26Selection(selection);
      renderRiderUI();
    });
  });
  document.querySelectorAll("[data-r26-benefit]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const benefit = button.dataset.r26Benefit;
      if (!getR26AllowedBenefits(selection.r26Plan).includes(benefit)) return;
      const benefits = new Set(selection.r26Benefits || []);

      if (benefits.has(benefit)) {
        benefits.delete(benefit);
      } else {
        benefits.add(benefit);
      }

      selection.r26Benefits = Array.from(benefits);
      renderRiderUI();
    });
  });
}

function renderSelectedRiderList() {
  const context = getCurrentInputContext();
  const selected = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((item) => item?.selected);
  document.getElementById("riderSelectedCount").textContent = `Đã chọn ${selected.length}/${VISIBLE_SPBK_PRODUCT_CODES.length}`;
  document.getElementById("toggleAllRiders").checked = selected.length > 0 && selected.every((item) => item.enabled);

  if (!selected.length) {
    document.getElementById("selectedRiderList").innerHTML = `<div class="empty-state">Chưa chọn sản phẩm bán kèm</div>`;
    return;
  }

  document.getElementById("selectedRiderList").innerHTML = selected.map((selection) => {
    const product = SPBK_PRODUCTS[selection.code];
    const result = calculateRiderPremium(selection.code, selection, context);
    return `
      <article class="selected-rider" data-premium="${formatCurrency(result.annualPremium)}">
        <div class="rider-icon small">${selection.code}</div>
        <div>
          <strong>${product.name}</strong>
          <span>STBH: ${product.maxSumInsured ? formatCurrency(selection.sumInsured) : product.code === "R24" ? "Theo phí chính" : selection.r26Plan}</span>
          ${result.error ? `<em>${result.error}</em>` : ""}
        </div>
        <label class="toggle">
          <input type="checkbox" data-toggle-rider="${selection.code}" ${selection.enabled ? "checked" : ""} />
          <span></span>
        </label>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-toggle-rider]").forEach((input) => {
    input.addEventListener("change", () => {
      const context = getCurrentInputContext();
      const code = input.dataset.toggleRider;
      const rule = applyOccupationGroupRules(code, context.occupationGroup, SPBK_PRODUCTS[code]?.maxSumInsured || null);
      getRiderSelection(code).enabled = input.checked && rule.allowed;
      renderRiderUI();
    });
  });
}

function updateRiderTotals() {
  const context = getCurrentInputContext();
  const totalRiderAnnualPremium = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected && selection.enabled)
    .reduce((sum, selection) => {
      const result = calculateRiderPremium(selection.code, selection, context);
      return sum + (result.error ? 0 : result.annualPremium);
    }, 0);

  const totalPlanAnnualPremium = context.mainAnnualPremium + totalRiderAnnualPremium;
  document.getElementById("totalRiderPremium").textContent = formatCurrency(totalRiderAnnualPremium);
  document.getElementById("totalPlanPremium").textContent = formatCurrency(totalPlanAnnualPremium);
  document.getElementById("dailySavingsAmount").innerHTML = `
    <span class="daily-saving-label">Cần tiết kiệm</span>
    <strong>${formatCurrency(Math.ceil(totalPlanAnnualPremium / 365))} / ngày</strong>
  `;
}

function renderRiderUI() {
  if (!document.getElementById("ridersTab")) return;
  applyOccupationRulesToRiderState();
  renderRiderCustomerCard();
  renderRiderProductButtons();
  renderRiderDetail();
  renderSelectedRiderList();
  updateRiderTotals();
  updateSummaryExportAvailability();
  refreshSpbkBenefitPopup();
}

function saveRiderPlan() {
  const context = getCurrentInputContext();
  const selected = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected);
  const invalidSelection = selected.find((selection) => {
    if (!selection.enabled) return false;
    return Boolean(calculateRiderPremium(selection.code, selection, context).error);
  });

  if (invalidSelection) {
    const result = calculateRiderPremium(invalidSelection.code, invalidSelection, context);
    document.getElementById("riderSaveMessage").textContent = `${invalidSelection.code}: ${result.error}`;
    return;
  }

  const occupationTotalError = getOccupationTotalStbhError(context);
  if (occupationTotalError) {
    document.getElementById("riderSaveMessage").textContent = occupationTotalError;
    return;
  }

  const totalRiderAnnualPremium = selected
    .filter((selection) => selection.enabled)
    .reduce((sum, selection) => sum + calculateRiderPremium(selection.code, selection, context).annualPremium, 0);

  localStorage.setItem("minhHoaRiderPlan", JSON.stringify({
    savedAt: new Date().toISOString(),
    customer: context,
    mainIllustration: readInput(),
    riders: selected,
    totalRiderAnnualPremium,
    totalPlanAnnualPremium: context.mainAnnualPremium + totalRiderAnnualPremium
  }));
  document.getElementById("riderSaveMessage").textContent = "Đã lưu phương án sản phẩm bán kèm";
}

function loadRiderPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem("minhHoaRiderPlan") || "null");
    if (!saved?.riders) return;
    saved.riders.forEach((selection) => {
      if (SPBK_PRODUCTS[selection.code]) {
        riderState.selections[selection.code] = {
          ...createDefaultRiderSelection(selection.code),
          ...selection
        };
      }
    });
    const firstSelected = saved.riders.find((selection) => SPBK_PRODUCTS[selection.code]);
    if (firstSelected) riderState.activeCode = firstSelected.code;
  } catch (error) {
    localStorage.removeItem("minhHoaRiderPlan");
  }
}

function updateAgePreview() {
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const age = dateOfBirth && parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : "-";
  document.getElementById("currentAge").value = age;
  updateAthdTermAndAgeValidity(age);
}

function updateAthdTermAndAgeValidity(age = "-") {
  const dateOfBirthInput = document.getElementById("dateOfBirth");
  const premiumPaymentYearsInput = document.getElementById("premiumPaymentYears");
  const isAthd = selectedMainProduct === "ATHD";
  const isLifeCare = isLifeCare20();
  const hasValidAge = Number.isFinite(age);

  dateOfBirthInput.setCustomValidity(
    isLifeCare && hasValidAge && (age < 18 || age > 60)
      ? "Life Care 2.0 chỉ áp dụng cho tuổi bảo hiểm từ 18 đến 60"
      : isAthd && hasValidAge && (age < 0 || age > 65)
        ? "Người được bảo hiểm An Tâm Hoạch Định phải trong độ tuổi từ 0 đến 65."
        : ""
  );

  premiumPaymentYearsInput.readOnly = false;
  premiumPaymentYearsInput.placeholder = "";
  premiumPaymentYearsInput.title = "";
}

function updateDisabilitySumAssured() {
  const label = document.getElementById("secondaryBenefitLabel");
  const output = document.getElementById("disabilitySumAssured");

  if (isLifeCare20()) return;

  if (selectedMainProduct === "ATPN") {
    if (label) label.textContent = "Chu toàn hậu sự";
    const deathSumAssured = moneyValue("deathSumAssured");
    output.value = formatCommaNumber(Math.min(deathSumAssured * 0.1, 30000000));
    return;
  }

  if (label) label.textContent = "STBH TTTBVV";
  const annualBasicPremium = moneyValue("annualPremium");
  const deathSumAssured = moneyValue("deathSumAssured");
  output.value = formatCommaNumber(
    calculateDisabilitySumAssured(annualBasicPremium, deathSumAssured)
  );
}

function syncMainProductSelector() {
  const selector = document.getElementById("mainProduct");
  if (selector && selector.value !== selectedMainProduct) {
    selector.value = selectedMainProduct;
  }
  syncMainProductDropdown();
}

function getSelectedMainProduct() {
  const selectorValue = document.getElementById("mainProduct")?.value;
  return MAIN_PRODUCTS[selectorValue] ? selectorValue : selectedMainProduct;
}

function getMainProductTermsPdf(productCode = selectedMainProduct) {
  return MAIN_PRODUCT_TERMS_PDFS[productCode] || "";
}

function syncMainProductDropdown() {
  const dropdown = document.getElementById("mainProductDropdown");
  const button = document.getElementById("mainProductDropdownButton");
  const list = document.getElementById("mainProductDropdownList");
  const text = document.getElementById("mainProductDropdownText");

  if (dropdown) dropdown.dataset.open = String(isMainProductDropdownOpen);
  if (button) button.setAttribute("aria-expanded", String(isMainProductDropdownOpen));
  if (list) list.hidden = !isMainProductDropdownOpen;
  if (text) text.textContent = MAIN_PRODUCTS[selectedMainProduct] || MAIN_PRODUCTS.ATHD;

  document.querySelectorAll(".main-product-option").forEach((option) => {
    const isSelected = option.dataset.productValue === selectedMainProduct;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function setMainProductDropdownOpen(isOpen) {
  isMainProductDropdownOpen = Boolean(isOpen);
  syncMainProductDropdown();
}

function closeMainProductDropdown() {
  setMainProductDropdownOpen(false);
}

function handleMainProductChange(value) {
  updateMainProductState(value);
  closeMainProductDropdown();

  if (selectedMainProduct === "ATPN" && !getAtpnTables().loaded && window.ATPN_DATA_READY) {
    renderPendingResults("Đang tải dữ liệu An Thịnh Phúc Niên...");
    window.ATPN_DATA_READY.then(() => {
      updateDeathSumAssuredRange();
      updateDisabilitySumAssured();
      if (!document.getElementById("resultsSection").hidden) refreshIllustration();
      updateSummaryExportAvailability();
    });
  }
}

async function mainProductTermsPdfExists(pdfUrl) {
  if (!pdfUrl) return false;
  try {
    const response = await fetch(pdfUrl, { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch (error) {
    return true;
  }
}

async function openMainProductTerms() {
  const pdfUrl = getMainProductTermsPdf();

  if (await mainProductTermsPdfExists(pdfUrl)) {
    window.open(pdfUrl, "_blank");
    return;
  }

  alert("Chưa tìm thấy file quy tắc điều khoản cho sản phẩm này.");
}

function updateMainProductState(value) {
  selectedMainProduct = MAIN_PRODUCTS[value] ? value : "ATHD";
  syncMainProductSelector();
  updateLifeCareUI();
  updateAgePreview();
  updateDeathSumAssuredRange();
  updateDisabilitySumAssured();

  if (!document.getElementById("resultsSection").hidden) {
    refreshIllustration();
  } else {
    updateSummaryExportAvailability();
  }

  renderRiderUI();
}

function updateLifeCarePremium() {
  if (!isLifeCare20()) return;
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const age = parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : null;
  const premium = calculateLifeCarePremium({
    gender: document.getElementById("gender").value,
    age,
    term: lifeCareTerm,
    sumAssured: moneyValue("deathSumAssured")
  });
  document.getElementById("annualPremium").value = premium ? formatCommaNumber(premium) : "-";
}

function updateLifeCareUI() {
  const active = isLifeCare20();
  document.body.classList.toggle("life-care-mode", active);
  document.querySelectorAll(".legacy-illustration-field").forEach((field) => {
    field.hidden = active;
  });
  document.querySelectorAll(".life-care-only").forEach((field) => {
    field.hidden = !active;
  });
  document.getElementById("mainSumAssuredLabel").textContent = active ? "Số tiền bảo hiểm" : "STBH tử vong";
  const annualPremium = document.getElementById("annualPremium");
  annualPremium.readOnly = active;
  annualPremium.required = !active;
  if (!active && annualPremium.value === "-") annualPremium.value = "20.000.000";
  document.getElementById("lifeCarePaymentTerm").textContent = `${lifeCareTerm} năm`;
  document.querySelectorAll("[data-life-care-term]").forEach((button) => {
    const selected = Number(button.dataset.lifeCareTerm) === lifeCareTerm;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("resultTitle").querySelector("span:nth-child(2)").textContent =
    active ? "3. Quyền lợi sản phẩm" : "3. Giá trị hoàn lại minh họa";
  document.querySelector(".result-unit").hidden = active;
  document.querySelector(".result-toggle").hidden = active;
  document.querySelector(".table-wrap").hidden = active;
  document.querySelector(".disclaimer").hidden = active;
  document.getElementById("lifeCareBenefits").hidden = !active;
  document.querySelector(".actions").hidden = active;
  updateLifeCarePremium();
  if (active) renderLifeCareBenefits();
}

function renderLifeCareBenefits() {
  if (!isLifeCare20()) return;
  const container = document.getElementById("lifeCareBenefits");
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const age = parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : null;
  const sumAssured = moneyValue("deathSumAssured");
  let warning = "";
  if (age !== null && (age < 18 || age > 60)) {
    warning = "Life Care 2.0 chỉ áp dụng cho tuổi bảo hiểm từ 18 đến 60";
  }
  const money = (value) => sumAssured ? formatVND(value) : "-";
  const basic = sumAssured;
  const advanced = Math.round(sumAssured * 1.3);
  const monthly = Math.round(sumAssured * .05);
  container.innerHTML = `
    ${warning ? `<p class="life-care-warning">${warning}</p>` : ""}
    <article class="life-care-card benefit-basic">
      <h3>Bệnh lý nghiêm trọng cơ bản</h3>
      <strong>100% STBH = ${money(basic)}</strong>
      <p>Chi trả khi Người được bảo hiểm mắc một trong các bệnh lý nghiêm trọng cơ bản thuộc phạm vi bảo hiểm.</p>
      <ul><li>Ung thư giai đoạn đầu sau thời gian chờ</li><li>Đột quỵ thỏa điều kiện tổn thương kéo dài hoặc phẫu thuật thông thường</li><li>Nhồi máu cơ tim</li></ul>
      <small>Hợp đồng chấm dứt hiệu lực sau khi phát sinh trách nhiệm chi trả quyền lợi này.</small>
    </article>
    <article class="life-care-card benefit-advanced">
      <h3>Bệnh lý nghiêm trọng nâng cao</h3>
      <strong>130% STBH = ${money(advanced)}</strong>
      <p>Chi trả khi Người được bảo hiểm mắc bệnh lý nghiêm trọng nâng cao thuộc phạm vi bảo hiểm.</p>
      <div class="life-care-payment-grid"><span>Trả ngay<b>100% STBH = ${money(basic)}</b></span><span>Trả thêm mỗi tháng<b>5% STBH = ${money(monthly)}/tháng</b></span><span>Thời gian trả thêm<b>06 tháng liên tiếp</b></span><span>Tổng tối đa<b>130% STBH = ${money(advanced)}</b></span></div>
      <ul><li>Ung thư giai đoạn cuối sau thời gian chờ</li><li>Đột quỵ có phẫu thuật mở sọ</li><li>Đột quỵ có phẫu thuật thông thường và phẫu thuật mở sọ theo điều kiện</li><li>Nhồi máu cơ tim có phẫu thuật tim hở</li><li>Cơn đau thắt ngực không ổn định có phẫu thuật tim hở</li></ul>
    </article>
    `;
  document.getElementById("resultsSection").hidden = false;
}

function updateDeathSumAssuredRange() {
  const annualPremium = moneyValue("annualPremium");
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const birthDate = parseDateInput(dateOfBirth);
  const age = birthDate ? calculateAge(dateOfBirth) : null;
  const gender = document.getElementById("gender").value;
  const deathSumAssuredInput = document.getElementById("deathSumAssured");
  const rangeNote = document.getElementById("deathSumAssuredRange");

  if (isLifeCare20()) {
    deathSumAssuredInput.setCustomValidity("");
    rangeNote.textContent = "";
    rangeNote.classList.remove("is-error");
    return;
  }

  const range = age === null ? null : getDeathSumAssuredRange(annualPremium, age, gender);

  if (!range) {
    deathSumAssuredInput.setCustomValidity("");
    rangeNote.textContent = "Nhập ngày sinh và phí năm để xem khoảng STBH hợp lệ.";
    rangeNote.classList.remove("is-error");
    return;
  }

  const deathSumAssured = moneyValue("deathSumAssured");
  const rangeText = `${formatVND(range.min)} - ${formatVND(range.max)}`;
  rangeNote.textContent = `Hợp lệ: ${rangeText}`;

  if (deathSumAssured && (deathSumAssured < range.min || deathSumAssured > range.max)) {
    deathSumAssuredInput.setCustomValidity(`STBH tử vong phải trong khoảng ${rangeText} đồng.`);
    rangeNote.textContent = `Ngoài khoảng: ${rangeText}`;
    rangeNote.classList.add("is-error");
  } else {
    deathSumAssuredInput.setCustomValidity("");
    rangeNote.classList.remove("is-error");
  }
}

function syncGenderButtons() {
  const genderValue = document.getElementById("gender").value;
  document.querySelectorAll(".gender-button").forEach((button) => {
    const isActive = button.dataset.genderValue === genderValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function refreshIllustration() {
  const form = document.getElementById("illustrationForm");
  updateAgePreview();
  updateDeathSumAssuredRange();
  updateDisabilitySumAssured();

  if (isLifeCare20()) {
    updateLifeCarePremium();
    renderLifeCareBenefits();
    updateSummaryExportAvailability();
    return;
  }

  if (!form.checkValidity()) {
    const invalidField = form.querySelector(":invalid");
    renderPendingResults(invalidField?.validationMessage || "Vui lòng kiểm tra lại thông tin minh họa.");
    updateSummaryExportAvailability();
    return;
  }

  if (selectedMainProduct === "ATPN" && !getAtpnTables().loaded) {
    const message = getAtpnTables().error
      ? "Không tải được dữ liệu An Thịnh Phúc Niên."
      : "Đang tải dữ liệu An Thịnh Phúc Niên...";
    renderPendingResults(message);
    updateSummaryExportAvailability();
    return;
  }

  const input = readInput();
  const results = buildComparableIllustration(input);
  renderResults(results, input);
  updateSummaryExportAvailability();
}

document.getElementById("illustrationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  refreshIllustration();
});

document.getElementById("illustrationForm").addEventListener("input", () => {
  if (isLifeCare20()) {
    updateAgePreview();
    updateLifeCarePremium();
    renderLifeCareBenefits();
    renderRiderUI();
    return;
  }
  if (!document.getElementById("resultsSection").hidden) {
    refreshIllustration();
  } else {
    updateAgePreview();
    updateDeathSumAssuredRange();
    updateDisabilitySumAssured();
  }
  renderRiderUI();
});

document.getElementById("dateOfBirth").addEventListener("input", applyDateOfBirthMask);
document.getElementById("dateOfBirth").addEventListener("focus", (event) => {
  const input = event.currentTarget;
  if (!input.value) return;
  input.value = "";
  input.dataset.previousValue = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
document.getElementById("dateOfBirth").addEventListener("change", () => {
  updateAgePreview();
  updateDeathSumAssuredRange();
  renderRiderUI();
});

document.querySelectorAll(".money-input").forEach((input) => {
  input.value = formatCommaNumber(input.value);

  input.addEventListener("input", () => {
    input.value = formatCommaNumber(input.value);
  });
});

["annualPremium", "deathSumAssured"].forEach((inputId) => {
  const input = document.getElementById(inputId);
  input.addEventListener("focus", () => {
    if (inputId === "annualPremium" && isLifeCare20()) return;
    if (!input.value) return;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

document.getElementById("fullName")?.addEventListener("focus", (event) => {
  const input = event.currentTarget;
  if (input.value.trim() !== "Nguyễn Hoàng Vũ") return;
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

["premiumPaymentYears", "illustrationYears"].forEach((inputId) => {
  const input = document.getElementById(inputId);
  input.addEventListener("focus", () => {
    if (["10", "15"].includes(input.value.trim())) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    input.select();
  });
  input.addEventListener("mouseup", (event) => event.preventDefault());
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
  });
});

document.getElementById("deathSumAssured").addEventListener("input", updateDisabilitySumAssured);
document.getElementById("deathSumAssured").addEventListener("change", updateDisabilitySumAssured);
document.getElementById("annualPremium").addEventListener("input", updateDisabilitySumAssured);
document.getElementById("annualPremium").addEventListener("change", updateDisabilitySumAssured);
document.getElementById("annualPremium").addEventListener("input", updateDeathSumAssuredRange);
document.getElementById("annualPremium").addEventListener("change", updateDeathSumAssuredRange);
document.getElementById("deathSumAssured").addEventListener("input", updateDeathSumAssuredRange);
document.getElementById("deathSumAssured").addEventListener("change", updateDeathSumAssuredRange);
document.getElementById("gender").addEventListener("change", () => {
  syncGenderButtons();
  updateDeathSumAssuredRange();
  renderRiderUI();
  updateLifeCarePremium();
  renderLifeCareBenefits();
});
document.getElementById("mainProduct")?.addEventListener("change", (event) => {
  handleMainProductChange(event.target.value);
});
document.getElementById("mainProductDropdownButton")?.addEventListener("click", () => {
  setMainProductDropdownOpen(!isMainProductDropdownOpen);
});
document.querySelectorAll(".main-product-option").forEach((option) => {
  option.addEventListener("click", () => {
    handleMainProductChange(option.dataset.productValue);
  });
});
document.getElementById("mainProductInfoButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeMainProductDropdown();
  openMainProductTerms();
});
document.addEventListener("click", (event) => {
  const dropdown = document.getElementById("mainProductDropdown");

  if (isMainProductDropdownOpen && dropdown && !dropdown.contains(event.target)) {
    closeMainProductDropdown();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (isMainProductDropdownOpen) closeMainProductDropdown();
});
document.querySelectorAll(".gender-button").forEach((button) => {
  button.addEventListener("click", () => {
    const genderSelect = document.getElementById("gender");
    genderSelect.value = button.dataset.genderValue;
    genderSelect.dispatchEvent(new Event("change", { bubbles: true }));
    genderSelect.dispatchEvent(new Event("input", { bubbles: true }));
  });
});
document.querySelectorAll("[data-life-care-term]").forEach((button) => {
  button.addEventListener("click", () => {
    lifeCareTerm = Number(button.dataset.lifeCareTerm) === 5 ? 5 : 10;
    updateLifeCareUI();
  });
});
document.getElementById("occupationJob")?.addEventListener("focus", (event) => {
  if (event.currentTarget.value.trim()) {
    event.currentTarget.value = "";
    setOccupationGroup(DEFAULT_JOB_GROUP);
    setOccupationNote("");
    renderRiderUI();
  }
  renderOccupationSuggestions(filterJobs(event.currentTarget.value));
});
document.getElementById("occupationJob")?.addEventListener("input", handleOccupationInput);
document.getElementById("occupationJob")?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideOccupationSuggestions();
});
document.getElementById("occupationJob")?.addEventListener("blur", () => {
  window.setTimeout(hideOccupationSuggestions, 150);
});
window.addEventListener("resize", updateOccupationSuggestionPosition);
window.addEventListener("scroll", updateOccupationSuggestionPosition, true);
document.getElementById("occupationGroup").addEventListener("change", renderRiderUI);
document.getElementById("paymentMode").addEventListener("change", renderRiderUI);
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});
document.getElementById("toggleAllRiders").addEventListener("change", (event) => {
  const context = getCurrentInputContext();
  VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected)
    .forEach((selection) => {
      const rule = applyOccupationGroupRules(selection.code, context.occupationGroup, SPBK_PRODUCTS[selection.code]?.maxSumInsured || null);
      selection.enabled = event.target.checked && rule.allowed;
    });
  renderRiderUI();
});
document.getElementById("viewMainIllustration")?.addEventListener("click", () => {
  setActiveTab("main");
  if (!document.getElementById("resultsSection").hidden) refreshIllustration();
});
document.getElementById("openRidersButton")?.addEventListener("click", () => setActiveTab("riders"));
document.getElementById("riderBackButton")?.addEventListener("click", () => setActiveTab("main"));
document.getElementById("saveRiderPlan")?.addEventListener("click", saveRiderPlan);
document.getElementById("resetButton")?.addEventListener("click", () => {
  const form = document.getElementById("illustrationForm");
  form.reset();
  setOccupationGroup(DEFAULT_JOB_GROUP);
  setOccupationNote("");
  hideOccupationSuggestions();
  updateAgePreview();
  updateDeathSumAssuredRange();
  updateDisabilitySumAssured();
  renderPendingResults();
  renderRiderUI();
});
document.getElementById("createIllustration")?.addEventListener("click", () => {
  const form = document.getElementById("illustrationForm");
  form.requestSubmit?.() || form.dispatchEvent(new Event('submit', { cancelable: true }));
});
document.getElementById("milestoneView")?.addEventListener("click", () => {
  resultViewMode = "milestone";
  if (latestResults.length && latestInput) renderResults(latestResults, latestInput);
});
document.getElementById("fullView")?.addEventListener("click", () => {
  resultViewMode = "full";
  if (latestResults.length && latestInput) renderResults(latestResults, latestInput);
});
document.getElementById("spbkBenefitPopupClose")?.addEventListener("click", closeSpbkBenefitPopup);
document.querySelector("[data-close-spbk-benefit]")?.addEventListener("click", closeSpbkBenefitPopup);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeSpbkBenefitCode) closeSpbkBenefitPopup();
});

const SUMMARY_IMAGE_WIDTH = 1080;
const SUMMARY_IMAGE_HEIGHT = 1620;
const SUMMARY_FONT_FAMILY = '"Segoe UI", Tahoma, Arial, sans-serif';
let latestSummaryImage = null;
let latestAddonBenefitImages = [];
let addonBenefitReferenceMarkdown = null;

function getSelectedValidRiders(context) {
  applyOccupationRulesToRiderState(context);

  return VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected && selection.enabled)
    .map((selection) => {
      const product = SPBK_PRODUCTS[selection.code];
      const stbhRange = getRiderStbhRange(product, selection, context);
      const result = calculateRiderPremium(selection.code, selection, context);
      const numericSumInsured = product.maxSumInsured
        ? selection.sumInsured
        : stbhRange?.readonlyValue || 0;
      const displaySumInsured = product.maxSumInsured
        ? formatCurrency(selection.sumInsured)
        : selection.code === "R24"
          ? formatCurrency(context.mainAnnualPremium)
          : selection.code === "R26"
            ? `${selection.r26Plan} (${(selection.r26Benefits || []).length} quyền lợi)`
            : "-";

      return {
        code: selection.code,
        name: product.name,
        sumInsured: numericSumInsured,
        displaySumInsured,
        r26Plan: selection.r26Plan,
        r26Benefits: [...(selection.r26Benefits || [])],
        term: selection.term,
        annualPremium: result.annualPremium,
        error: result.error
      };
    });
}

function buildSummarySnapshot() {
  const form = document.getElementById("illustrationForm");
  updateAgePreview();
  updateDeathSumAssuredRange();
  updateDisabilitySumAssured();

  if (!form.checkValidity()) {
    const invalidField = form.querySelector(":invalid");
    return {
      valid: false,
      message: invalidField?.validationMessage || "Phương án minh họa chưa hợp lệ."
    };
  }

  const input = readInput();
  const context = getCurrentInputContext();

  if (input.mainProduct === "LIFE_CARE_20") {
    const age = context.age;
    const mainPremium = calculateLifeCarePremium({
      gender: input.gender,
      age,
      term: lifeCareTerm,
      sumAssured: input.deathSumAssured
    });

    if (age === null || age < 18 || age > 60 || !input.deathSumAssured || !mainPremium) {
      return {
        valid: false,
        message: age === null
          ? "Nhập ngày sinh để xuất tóm tắt Life Care 2.0."
          : age < 18 || age > 60
            ? "Life Care 2.0 chỉ áp dụng cho tuổi bảo hiểm từ 18 đến 60."
            : "Nhập Số tiền bảo hiểm để xuất tóm tắt Life Care 2.0."
      };
    }

    const riders = getSelectedValidRiders(context);
    const invalidRider = riders.find((rider) => rider.error);
    if (invalidRider) {
      return { valid: false, message: `${invalidRider.code}: ${invalidRider.error}` };
    }

    const totalRiderAnnualPremium = riders.reduce((sum, rider) => sum + rider.annualPremium, 0);
    const totalRiderSumInsured = riders.reduce((sum, rider) => sum + rider.sumInsured, 0);
    const issueDate = new Date();

    return {
      valid: true,
      isLifeCare20: true,
      customerName: input.fullName || "Khách hàng",
      dateOfBirth: input.dateOfBirth,
      age,
      gender: input.gender,
      mainProduct: input.mainProduct,
      productName: MAIN_PRODUCTS.LIFE_CARE_20,
      mainSumInsured: input.deathSumAssured,
      mainPremium,
      additionalPremium: 0,
      premiumPaymentYears: lifeCareTerm,
      policyTermYears: lifeCareTerm,
      paymentMode: "Năm",
      basicBenefit: input.deathSumAssured,
      advancedBenefit: Math.round(input.deathSumAssured * 1.3),
      advancedImmediate: input.deathSumAssured,
      advancedMonthly: Math.round(input.deathSumAssured * 0.05),
      advancedMonths: 6,
      riders,
      totals: {
        firstYearPremium: mainPremium + totalRiderAnnualPremium,
        mainSumInsured: input.deathSumAssured,
        riderSumInsured: totalRiderSumInsured,
        protectionBenefit: Math.round(input.deathSumAssured * 1.3) + totalRiderSumInsured,
        accountMilestones: []
      },
      exportedAt: issueDate,
      exportedAtText: issueDate.toLocaleDateString("vi-VN")
    };
  }

  if (input.mainProduct === "ATPN" && !getAtpnTables().loaded) {
    return {
      valid: false,
      message: getAtpnTables().error
        ? "Không tải được dữ liệu An Thịnh Phúc Niên."
        : "Đang tải dữ liệu An Thịnh Phúc Niên..."
    };
  }

  const riders = getSelectedValidRiders(context);
  const invalidRider = riders.find((rider) => rider.error);

  if (invalidRider) {
    return {
      valid: false,
      message: `${invalidRider.code}: ${invalidRider.error}`
    };
  }

  const occupationTotalError = getOccupationTotalStbhError(context);
  if (occupationTotalError) {
    return {
      valid: false,
      message: occupationTotalError
    };
  }

  const totalRiderAnnualPremium = riders.reduce((sum, rider) => sum + rider.annualPremium, 0);
  const totalRiderSumInsured = riders.reduce((sum, rider) => sum + rider.sumInsured, 0);
  const totalFirstYearPremium = input.annualPremium + input.additionalPremium + totalRiderAnnualPremium;
  const illustrationRows = buildComparableIllustration(input);
  const finalIllustrationRow = illustrationRows[illustrationRows.length - 1] || {};
  const timelineYears = Array.from(new Set([5, 10, 15, input.illustrationYears]))
    .filter((year) => year > 0 && year <= input.illustrationYears)
    .sort((first, second) => first - second);
  const accountMilestones = timelineYears
    .map((year) => illustrationRows.find((row) => row.policyYear === year))
    .filter(Boolean)
    .map((row) => ({
      year: row.policyYear,
      age: row.age,
      cumulativePremium: row.cumulativePremium,
      accountValue: row.accountValue,
      cashValue425: row.cashValue425,
      cashValue476: row.cashValue476
    }));
  const issueDate = new Date();

  return {
    valid: true,
    customerName: input.fullName || "Khách hàng",
    dateOfBirth: input.dateOfBirth,
    age: context.age,
    gender: input.gender,
    mainProduct: input.mainProduct,
    productName: MAIN_PRODUCTS[input.mainProduct] || MAIN_PRODUCTS.ATHD,
    mainSumInsured: input.deathSumAssured,
    disabilitySumInsured: input.disabilitySumAssured,
    deathBenefit: finalIllustrationRow.deathBenefit || input.deathSumAssured,
    funeralBenefit: finalIllustrationRow.funeralBenefit || Math.min(input.deathSumAssured * 0.1, 30000000),
    maturityBenefit: finalIllustrationRow.maturityBenefit || finalIllustrationRow.accountValue || 0,
    mainPremium: input.annualPremium,
    additionalPremium: input.additionalPremium,
    premiumPaymentYears: input.premiumPaymentYears,
    policyTermYears: input.illustrationYears,
    paymentMode: PAYMENT_MODE_LABEL[context.paymentMode] || "Năm",
    riders,
    totals: {
      firstYearPremium: totalFirstYearPremium,
      mainSumInsured: input.deathSumAssured,
      riderSumInsured: totalRiderSumInsured,
      protectionBenefit: input.deathSumAssured + totalRiderSumInsured,
      accountMilestones
    },
    exportedAt: issueDate,
    exportedAtText: issueDate.toLocaleDateString("vi-VN")
  };
}

function updateSummaryExportAvailability() {
  const exportTargets = [
    {
      bar: document.getElementById("summaryExportBar"),
      button: document.getElementById("exportSummaryButton"),
      status: document.getElementById("summaryExportStatus")
    },
    {
      bar: document.getElementById("riderSummaryExportBar"),
      button: document.getElementById("riderExportSummaryButton"),
      status: document.getElementById("riderSummaryExportStatus")
    }
  ].filter((target) => target.bar && target.button && target.status);
  if (!exportTargets.length) return;

  const snapshot = buildSummarySnapshot();
  exportTargets.forEach(({ bar, button, status }) => {
    bar.hidden = !snapshot.valid;
    button.disabled = !snapshot.valid;
    status.textContent = "";
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, options = {}) {
  ctx.fillStyle = options.color || "#172033";
  const weight = options.weight || 600;
  let size = options.size || 36;
  const family = options.family || SUMMARY_FONT_FAMILY;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = "top";
  let output = String(text);

  if (options.fitWidth) {
    const minSize = options.minSize || Math.max(18, size - 8);
    while (ctx.measureText(output).width > options.fitWidth && size > minSize) {
      size -= 1;
      ctx.font = `${weight} ${size}px ${family}`;
    }
  }

  if (options.maxWidth && ctx.measureText(output).width > options.maxWidth) {
    const ellipsis = "...";
    while (output.length > 1 && ctx.measureText(`${output}${ellipsis}`).width > options.maxWidth) {
      output = output.slice(0, -1);
    }
    output = `${output.trimEnd()}${ellipsis}`;
  }

  ctx.fillText(output, x, y);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  ctx.font = `${options.weight || 600} ${options.size || 36}px ${options.family || SUMMARY_FONT_FAMILY}`;
  const words = String(text || "").split(/\s+/);
  let line = "";
  let currentY = y;
  const textX = options.align === "center"
    ? x + maxWidth / 2
    : options.align === "right"
      ? x + maxWidth
      : x;
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      drawText(ctx, line, textX, currentY, options);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) drawText(ctx, line, textX, currentY, options);
  return currentY + lineHeight;
}

function drawSummaryCard(ctx, title, rows, x, y, width, options = {}) {
  const rowHeight = options.rowHeight || 64;
  const height = 86 + rows.length * rowHeight + 18;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, x, y, width, height, 28);
  ctx.fill();
  ctx.strokeStyle = "#d8e6f4";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, title, x + 32, y + 28, { size: options.titleSize || 33, weight: 750, color: "#003b7a" });
  rows.forEach((row, index) => {
    const rowY = y + 86 + index * rowHeight;
    ctx.fillStyle = index % 2 === 0 ? "#f6f9fc" : "#ffffff";
    drawRoundedRect(ctx, x + 18, rowY, width - 36, rowHeight - 10, 16);
    ctx.fill();
    drawText(ctx, row.label, x + 42, rowY + 14, {
      size: row.labelSize || options.labelSize || 25,
      weight: 650,
      color: "#5d6b82",
      maxWidth: row.labelMaxWidth || options.labelMaxWidth || 530
    });
    drawText(ctx, row.value, x + width - 42, rowY + 12, {
      size: row.valueSize || options.valueSize || 27,
      weight: 750,
      color: "#172033",
      align: "right",
      maxWidth: row.valueMaxWidth || options.valueMaxWidth || 340
    });
  });
  return y + height;
}

function drawOfficialCell(ctx, text, x, y, width, height, options = {}) {
  ctx.fillStyle = options.fill || "#ffffff";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = options.stroke || "#1f2937";
  ctx.lineWidth = options.lineWidth || 1.5;
  ctx.strokeRect(x, y, width, height);
  drawText(ctx, text, x + (options.align === "right" ? width - 10 : 10), y + (height - (options.size || 22)) / 2 - 1, {
    size: options.size || 22,
    weight: options.weight || 600,
    color: options.color || "#0b448f",
    align: options.align || "left",
    maxWidth: width - 20
  });
}

function drawOfficialSectionTitle(ctx, text, x, y) {
  drawText(ctx, text.toUpperCase(), x, y, { size: 24, weight: 800, color: "#0b448f", maxWidth: 980 });
}

function drawOfficialInfoTable(ctx, snapshot, x, y, width) {
  const leftWidth = Math.round(width * 0.58);
  const rightX = x + leftWidth + 18;
  const rightWidth = width - leftWidth - 18;
  const rowH = 54;
  const blueFill = "#b7e2f5";
  const paleFill = "#f8fbff";

  drawOfficialCell(ctx, "", x, y, 110, rowH, { fill: blueFill });
  drawOfficialCell(ctx, "Họ tên", x + 110, y, 230, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, "Tuổi", x + 340, y, 94, rowH, { fill: blueFill, size: 20, align: "center" });
  drawOfficialCell(ctx, "Giới tính", x + 434, y, leftWidth - 434, rowH, { fill: blueFill, size: 20, align: "center" });

  drawOfficialCell(ctx, "BMBH", x, y + rowH, 110, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, snapshot.customerName, x + 110, y + rowH, 230, rowH, { fill: paleFill, size: 20, weight: 750 });
  drawOfficialCell(ctx, snapshot.age === null ? "-" : String(snapshot.age), x + 340, y + rowH, 94, rowH, { fill: paleFill, size: 20, align: "center" });
  drawOfficialCell(ctx, snapshot.gender, x + 434, y + rowH, leftWidth - 434, rowH, { fill: paleFill, size: 20, align: "center" });

  drawOfficialCell(ctx, "NĐBH", x, y + rowH * 2, 110, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, snapshot.customerName, x + 110, y + rowH * 2, 230, rowH, { fill: paleFill, size: 20, weight: 750 });
  drawOfficialCell(ctx, snapshot.age === null ? "-" : String(snapshot.age), x + 340, y + rowH * 2, 94, rowH, { fill: paleFill, size: 20, align: "center" });
  drawOfficialCell(ctx, snapshot.gender, x + 434, y + rowH * 2, leftWidth - 434, rowH, { fill: paleFill, size: 20, align: "center" });

  const contractRows = [
    ["Thời hạn Hợp đồng:", `${snapshot.policyTermYears} năm`],
    ["Thời hạn đóng phí dự kiến:", `${snapshot.premiumPaymentYears} năm`],
    ["Định kỳ đóng phí:", snapshot.paymentMode],
    ["Tổng Phí bảo hiểm dự kiến đóng:", formatCurrency(snapshot.totals.firstYearPremium)]
  ];
  contractRows.forEach((row, index) => {
    const rowY = y + index * rowH;
    drawOfficialCell(ctx, row[0], rightX, rowY, rightWidth * 0.62, rowH, { fill: "#eef6ff", size: 19, color: "#0b448f" });
    drawOfficialCell(ctx, row[1], rightX + rightWidth * 0.62, rowY, rightWidth * 0.38, rowH, { fill: "#fffdf4", size: 19, color: "#805900", weight: 800, align: "right" });
  });

  return y + rowH * 4 + 28;
}

function drawOfficialRiskTable(ctx, snapshot, x, y, width) {
  const rowH = 42;
  if (snapshot.mainProduct === "ATPN") {
    drawOfficialCell(ctx, "SỐ TIỀN BẢO HIỂM TỬ VONG", x, y, width * 0.48, rowH, { fill: "#f8fbff", size: 19 });
    drawOfficialCell(ctx, formatCurrency(snapshot.mainSumInsured), x + width * 0.48, y, width * 0.17, rowH, { fill: "#fffdf4", size: 19, color: "#805900", weight: 800, align: "right" });
    drawOfficialCell(ctx, "CHU TOÀN HẬU SỰ", x + width * 0.68, y, width * 0.22, rowH, { fill: "#f8fbff", size: 18 });
    drawOfficialCell(ctx, formatCurrency(snapshot.funeralBenefit), x + width * 0.9, y, width * 0.1, rowH, { fill: "#fffdf4", size: 18, color: "#805900", weight: 800, align: "right" });
    return y + rowH + 26;
  }
  drawOfficialCell(ctx, "SỐ TIỀN BẢO HIỂM TỬ VONG", x, y, width * 0.48, rowH, { fill: "#f8fbff", size: 19 });
  drawOfficialCell(ctx, formatCurrency(snapshot.mainSumInsured), x + width * 0.48, y, width * 0.17, rowH, { fill: "#fffdf4", size: 19, color: "#805900", weight: 800, align: "right" });
  drawOfficialCell(ctx, "STBH THƯƠNG TẬT TOÀN BỘ VĨNH VIỄN", x + width * 0.68, y, width * 0.22, rowH, { fill: "#f8fbff", size: 18 });
  drawOfficialCell(ctx, formatCurrency(snapshot.disabilitySumInsured), x + width * 0.9, y, width * 0.1, rowH, { fill: "#fffdf4", size: 18, color: "#805900", weight: 800, align: "right" });
  return y + rowH + 26;
}

function drawOfficialTimeline(ctx, snapshot, x, y, width) {
  const rows = snapshot.totals.accountMilestones;
  if (!rows.length) return y;
  const labelWidth = 270;
  const colGap = 22;
  const colWidth = (width - labelWidth - colGap * (rows.length - 1)) / rows.length;
  const centers = rows.map((_, index) => x + labelWidth + index * (colWidth + colGap) + colWidth / 2);

  drawText(ctx, "Tuổi NĐBH:", x, y, { size: 19, weight: 600, color: "#0b448f" });
  rows.forEach((row, index) => drawText(ctx, row.age, centers[index], y, { size: 20, weight: 750, color: "#0b448f", align: "center" }));

  const lineY = y + 58;
  drawText(ctx, "Năm hợp đồng:", x, lineY - 10, { size: 19, weight: 600, color: "#0b448f" });
  ctx.strokeStyle = "#3d86d1";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(centers[0], lineY + 10);
  ctx.lineTo(centers[centers.length - 1], lineY + 10);
  ctx.stroke();
  rows.forEach((row, index) => {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, centers[index] - 45, lineY - 15, 90, 50, 25);
    ctx.fill();
    ctx.strokeStyle = "#c99a00";
    ctx.lineWidth = 5;
    ctx.stroke();
    drawText(ctx, row.year, centers[index], lineY - 1, { size: 21, weight: 850, color: "#172033", align: "center" });
  });

  const metricRows = [
    ["Tổng phí bảo hiểm lũy kế", "cumulativePremium"],
    ["Giá trị hoàn lại (lãi suất minh họa 4,76%/năm)", "cashValue476"],
    ["Giá trị hoàn lại (lãi suất minh họa 4,25%/năm)", "cashValue425"]
  ];

  metricRows.forEach((metric, metricIndex) => {
    const rowY = y + 108 + metricIndex * 58;
    drawText(ctx, metric[0], x, rowY + 10, { size: 18, weight: 600, color: "#0b448f", maxWidth: labelWidth - 12 });
    rows.forEach((row, index) => {
      ctx.fillStyle = metricIndex === 0 ? "#b7e2f5" : "#fffdf4";
      drawRoundedRect(ctx, x + labelWidth + index * (colWidth + colGap), rowY, colWidth, 40, 8);
      ctx.fill();
      ctx.strokeStyle = metricIndex === 0 ? "#0076c9" : "#c99a00";
      ctx.lineWidth = 2;
      ctx.stroke();
      drawText(ctx, formatVND(row[metric[1]]), x + labelWidth + index * (colWidth + colGap) + colWidth - 10, rowY + 9, {
        size: 18,
        weight: 800,
        color: "#805900",
        align: "right",
        maxWidth: colWidth - 20
      });
    });
  });

  return y + 292;
}

function drawOfficialRiderTable(ctx, snapshot, x, y, width) {
  const tableRows = snapshot.riders.length
    ? snapshot.riders.map((rider) => [rider.name, rider.displaySumInsured])
    : [["Chưa chọn sản phẩm bổ trợ", "-"]];
  const rowH = 46;
  const nameWidth = width * 0.72;

  drawOfficialCell(ctx, "SẢN PHẨM", x, y, nameWidth, rowH, { fill: "#f8fbff", size: 19, weight: 800, align: "center" });
  drawOfficialCell(ctx, "STBH / Quyền lợi", x + nameWidth, y, width - nameWidth, rowH, { fill: "#f8fbff", size: 19, weight: 800, align: "center" });
  tableRows.slice(0, 8).forEach((row, index) => {
    const rowY = y + rowH * (index + 1);
    drawOfficialCell(ctx, row[0], x, rowY, nameWidth, rowH, { fill: "#ffffff", size: 18, color: "#0b448f", weight: 600 });
    drawOfficialCell(ctx, row[1], x + nameWidth, rowY, width - nameWidth, rowH, { fill: "#fffdf4", size: 18, color: "#805900", weight: 800, align: "right" });
  });

  return y + rowH * (Math.min(tableRows.length, 8) + 1) + 28;
}

function renderSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  canvas.height = SUMMARY_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const blue = "#003b7a";
  const gold = "#f4c542";

  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerGradient = ctx.createLinearGradient(0, 0, 1080, 400);
  headerGradient.addColorStop(0, "#003b7a");
  headerGradient.addColorStop(1, "#0067b1");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, 1080, 400);

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(105, 95, 46, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, "BV", 76, 72, { size: 37, weight: 800, color: blue });
  drawText(ctx, "Bảo Việt Nhân thọ Khánh Hòa", 170, 54, { size: 35, weight: 750, color: "#ffffff" });
  drawText(ctx, `Ngày xuất: ${snapshot.exportedAtText}`, 170, 104, { size: 23, weight: 600, color: "#d9ecff" });

  wrapText(ctx, "Tóm tắt phương án minh họa", 70, 172, 660, 54, { size: 50, weight: 800, color: "#ffffff" });
  drawText(ctx, snapshot.customerName, 70, 295, { size: 31, weight: 750, color: "#ffffff" });
  drawText(ctx, `${snapshot.gender}${snapshot.age === null ? "" : `, ${snapshot.age} tuổi`}`, 70, 336, { size: 26, weight: 600, color: "#d9ecff" });

  ctx.fillStyle = "rgba(244, 197, 66, 0.18)";
  drawRoundedRect(ctx, 750, 180, 270, 142, 30);
  ctx.fill();
  drawText(ctx, "Tổng bảo vệ", 780, 208, { size: 25, weight: 700, color: "#ffffff" });
  drawText(ctx, formatCompactCurrency(snapshot.totals.protectionBenefit), 780, 254, { size: 38, weight: 800, color: gold, fitWidth: 210, minSize: 30 });

  let y = 430;
  y = drawSummaryCard(ctx, "Sản phẩm chính", [
    { label: "Tên sản phẩm", value: snapshot.productName },
    { label: "Số tiền bảo hiểm", value: formatCurrency(snapshot.mainSumInsured) },
    { label: "Phí định kỳ", value: `${formatCurrency(snapshot.mainPremium)} / ${snapshot.paymentMode.toLowerCase()}` },
    { label: "Thời hạn đóng phí", value: `${snapshot.premiumPaymentYears} năm` },
    { label: "Thời hạn hợp đồng", value: `${snapshot.policyTermYears} năm` }
  ], 58, y, 964, { rowHeight: 54, labelSize: 23, valueSize: 25, labelMaxWidth: 470, valueMaxWidth: 390 }) + 22;

  const riderRows = snapshot.riders.length
    ? snapshot.riders.map((rider) => ({
      label: rider.name,
      value: rider.displaySumInsured,
      labelSize: 22,
      valueSize: 24,
      labelMaxWidth: 590,
      valueMaxWidth: 300
    }))
    : [{ label: "Sản phẩm bổ trợ", value: "Chưa chọn" }];
  y = drawSummaryCard(ctx, "Sản phẩm bổ trợ", riderRows.slice(0, 7), 58, y, 964, { rowHeight: 50, labelSize: 22, valueSize: 24, labelMaxWidth: 590, valueMaxWidth: 300 }) + 22;

  const overviewRows = [
    { label: "Tổng phí năm đầu", value: formatCurrency(snapshot.totals.firstYearPremium) },
    { label: "Tổng STBH chính", value: formatCurrency(snapshot.totals.mainSumInsured) },
    { label: "Tổng STBH bổ trợ", value: formatCurrency(snapshot.totals.riderSumInsured) },
    { label: "Tổng quyền lợi bảo vệ", value: formatCurrency(snapshot.totals.protectionBenefit) },
    ...snapshot.totals.accountMilestones.map((item) => ({
      label: `Giá trị hoàn lại năm ${item.year}`,
      value: formatCurrency(item.cashValue476)
    }))
  ];
  y = drawSummaryCard(ctx, "Tổng quan phương án", overviewRows, 58, y, 964, { rowHeight: 47, labelSize: 22, valueSize: 24, labelMaxWidth: 520, valueMaxWidth: 360 }) + 22;

  ctx.fillStyle = "#fff8dc";
  drawRoundedRect(ctx, 58, y, 964, 142, 28);
  ctx.fill();
  ctx.strokeStyle = "#f2d56c";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, "Lưu ý", 90, y + 22, { size: 30, weight: 800, color: "#7a5600" });
  wrapText(ctx, "Đây chỉ là minh họa. Quyền lợi thực tế căn cứ theo quy tắc điều khoản sản phẩm.", 90, y + 68, 900, 32, { size: 25, weight: 600, color: "#5b4a16" });

  drawText(ctx, "Dữ liệu được lấy trực tiếp từ phương án minh họa hiện tại.", 540, 1848, { size: 23, weight: 600, color: "#64748b", align: "center" });
  return canvas;
}

function renderOfficialSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  canvas.height = SUMMARY_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const blue = "#004487";
  const deepBlue = "#003b7a";
  const brightBlue = "#0059b8";
  const orange = "#d85b00";
  const gold = "#f4b321";
  const lightBlue = "#eef7ff";
  const line = "#9aa7b4";
  const pageX = 26;
  const pageW = SUMMARY_IMAGE_WIDTH - pageX * 2;
  const contentFontSize = 20;
  const contentLineHeight = 24;

  function strokeRect(x, y, width, height, stroke = line) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, width, height);
  }

  function fillCell(x, y, width, height, options = {}) {
    ctx.fillStyle = options.fill || "#ffffff";
    ctx.fillRect(x, y, width, height);
    strokeRect(x, y, width, height, options.stroke || line);
  }

  function cellText(value, x, y, width, height, options = {}) {
    const size = options.size || contentFontSize;
    const textY = y + (height - size) / 2 - 2;
    const textX = options.align === "right"
      ? x + width - 16
      : options.align === "center"
        ? x + width / 2
        : x + 16;
    drawText(ctx, value, textX, textY, {
      size,
      weight: options.weight || 650,
      color: options.color || brightBlue,
      align: options.align || "left",
      maxWidth: width - 28
    });
  }

  function moneyBox(value, x, y, width, height, tone = "orange") {
    ctx.fillStyle = tone === "blue" ? "#eef7ff" : "#fffaf2";
    drawRoundedRect(ctx, x, y, width, height, 5);
    ctx.fill();
    ctx.strokeStyle = tone === "blue" ? "#8fb7e8" : "#f2bd81";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawText(ctx, value, x + width / 2, y + (height - contentFontSize) / 2 - 1, {
      size: contentFontSize,
      weight: 850,
      color: orange,
      align: "center",
      maxWidth: width - 18
    });
  }

  function sectionTitle(value, x, y) {
    drawText(ctx, value.toUpperCase(), x, y, {
      size: 25,
      weight: 850,
      color: "#0029b8",
      maxWidth: pageW
    });
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerH = 150;
  const headerGradient = ctx.createLinearGradient(0, 0, SUMMARY_IMAGE_WIDTH, 0);
  headerGradient.addColorStop(0, deepBlue);
  headerGradient.addColorStop(0.55, blue);
  headerGradient.addColorStop(1, "#00326c");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, SUMMARY_IMAGE_WIDTH, headerH);
  drawText(ctx, `MINH HỌA ${snapshot.productName || MAIN_PRODUCTS.ATHD}`.toUpperCase(), SUMMARY_IMAGE_WIDTH / 2, 32, {
    size: 40,
    weight: 850,
    color: "#ffffff",
    align: "center",
    maxWidth: pageW
  });
  drawText(ctx, `Chỉ cần tiết kiệm ${formatCurrency(Math.ceil(snapshot.totals.firstYearPremium / 365))} / ngày`, SUMMARY_IMAGE_WIDTH / 2, 88, {
    size: Math.round(contentFontSize * 1.3),
    weight: 800,
    color: gold,
    align: "center",
    maxWidth: pageW
  });

  let y = 190;
  const infoH = 340;
  const leftW = 685;
  const rightX = pageX + leftW + 28;
  const rightW = pageW - leftW - 28;
  const labelW = 255;
  const rowH = infoH / 4;
  const infoRows = [
    ["Tên khách hàng", snapshot.customerName],
    ["Ngày tháng năm sinh", snapshot.dateOfBirth || "-"],
    ["Tuổi bảo hiểm", snapshot.age === null || snapshot.age === undefined ? "-" : String(snapshot.age)],
    ["Giới tính", snapshot.gender || "-"]
  ];
  infoRows.forEach((row, index) => {
    const rowY = y + index * rowH;
    fillCell(pageX, rowY, labelW, rowH);
    fillCell(pageX + labelW, rowY, leftW - labelW, rowH);
    cellText(row[0], pageX, rowY, labelW, rowH, { weight: 750 });
    cellText(row[1], pageX + labelW, rowY, leftW - labelW, rowH, {
      weight: 800,
      color: "#111827",
      align: "center"
    });
  });

  const contractRows = [
    ["Thời hạn Hợp đồng:", `${snapshot.policyTermYears} năm`],
    ["Thời hạn đóng phí dự kiến", `${snapshot.premiumPaymentYears} năm`],
    ["Định kỳ đóng phí:", snapshot.paymentMode],
    ["Tổng Phí bảo hiểm dự kiến đóng:", formatVND(snapshot.totals.firstYearPremium)]
  ];
  const contractLabelW = rightW * 0.62;
  contractRows.forEach((row, index) => {
    const rowY = y + index * rowH;
    fillCell(rightX, rowY, contractLabelW, rowH);
    fillCell(rightX + contractLabelW, rowY, rightW - contractLabelW, rowH);
    wrapText(ctx, row[0], rightX + 16, rowY + 18, contractLabelW - 30, contentLineHeight, {
      size: contentFontSize,
      weight: 750,
      color: brightBlue
    });
    drawText(ctx, row[1], rightX + rightW - 22, rowY + (rowH - contentFontSize) / 2 - 2, {
      size: contentFontSize,
      weight: 900,
      color: orange,
      align: "right",
      maxWidth: rightW - contractLabelW - 30
    });
  });

  y += infoH + 24;
  drawText(ctx, "Đơn vị: đồng", pageX + pageW - 24, y, { size: contentFontSize, weight: 750, color: orange, align: "right" });
  y += 40;

  const officialProductTitle = snapshot.mainProduct === "ATPN"
    ? "A. SẢN PHẨM BẢO HIỂM LIÊN KẾT CHUNG AN THỊNH PHÚC NIÊN"
    : "A. SẢN PHẨM BẢO HIỂM LIÊN KẾT CHUNG AN TÂM HOẠCH ĐỊNH";
  const officialRiskItems = snapshot.mainProduct === "ATPN"
    ? [["SỐ TIỀN BẢO HIỂM TỬ VONG", snapshot.mainSumInsured], ["CHU TOÀN HẬU SỰ", snapshot.funeralBenefit]]
    : [["SỐ TIỀN BẢO HIỂM TỬ VONG", snapshot.mainSumInsured], ["SỐ TIỀN BẢO HIỂM THƯƠNG TẬT TOÀN BỘ VĨNH VIỄN", snapshot.disabilitySumInsured]];

  sectionTitle(officialProductTitle, pageX + 14, y);
  y += 48;
  const riskH = 138;
  const riskGap = 14;
  const riskW = (pageW - riskGap) / 2;
  drawText(ctx, "1. QUYỀN LỢI RỦI RO", pageX + 18, y + 24, { size: 24, weight: 850, color: "#0029b8" });
  officialRiskItems.forEach((item, index) => {
    const x = pageX + index * (riskW + riskGap);
    const nameW = riskW * 0.68;
    fillCell(x, y, nameW, riskH);
    fillCell(x + nameW, y, riskW - nameW, riskH);
    if (index === 0) {
      drawText(ctx, "1. QUYỀN LỢI RỦI RO", x + 18, y + 24, { size: 24, weight: 850, color: "#0029b8" });
      drawText(ctx, item[0], x + 18, y + 80, { size: contentFontSize, weight: 750, color: brightBlue, maxWidth: nameW - 32 });
    } else {
      wrapText(ctx, item[0], x + 18, y + 62, nameW - 32, contentLineHeight, { size: contentFontSize, weight: 750, color: brightBlue });
    }
    drawText(ctx, formatVND(item[1]), x + riskW - 24, y + 58, {
      size: contentFontSize,
      weight: 900,
      color: orange,
      align: "right",
      maxWidth: riskW - nameW - 38
    });
  });

  y += riskH + 34;
  drawText(ctx, "2. QUYỀN LỢI ĐẦU TƯ", pageX + 18, y, { size: 24, weight: 850, color: "#0029b8" });
  y += 36;
  const investmentRows = [
    ["Năm hợp đồng", "year"],
    ["Tuổi NĐBH:", "age"],
    ["Tổng phí bảo hiểm lũy kế", "cumulativePremium", "blue"],
    ["Giá trị hoàn lại\n(Lãi suất minh họa: 4,76%/năm)", "cashValue476"],
    ["Giá trị hoàn lại\n(Lãi suất minh họa: 4,25%/năm)", "cashValue425"]
  ];
  const years = [5, 10, 15, 20];
  const milestoneByYear = new Map(snapshot.totals.accountMilestones.map((item) => [item.year, item]));
  const tableX = pageX;
  const labelColW = 305;
  const yearColW = (pageW - labelColW) / years.length;
  const investRowH = 66;
  investmentRows.forEach((row, rowIndex) => {
    const rowY = y + rowIndex * investRowH;
    fillCell(tableX, rowY, labelColW, investRowH);
    wrapText(ctx, row[0], tableX + 14, rowY + (rowIndex < 3 ? 22 : 14), labelColW - 28, contentLineHeight, {
      size: contentFontSize,
      weight: 750,
      color: brightBlue
    });
    years.forEach((year, index) => {
      const x = tableX + labelColW + index * yearColW;
      const item = milestoneByYear.get(year);
      fillCell(x, rowY, yearColW, investRowH);
      if (rowIndex === 0) {
        drawText(ctx, String(year).padStart(2, "0"), x + yearColW / 2, rowY + 20, { size: contentFontSize, weight: 900, color: "#0029b8", align: "center" });
      } else if (rowIndex === 1) {
        drawText(ctx, item ? item.age : "-", x + yearColW / 2, rowY + 20, { size: contentFontSize, weight: 900, color: "#0029b8", align: "center" });
      } else {
        const value = item ? formatVND(item[row[1]]) : "-";
        moneyBox(value, x + 16, rowY + 14, yearColW - 32, 38, row[2]);
      }
    });
  });

  y += investmentRows.length * investRowH + 38;
  sectionTitle("B. CÁC SẢN PHẨM KHÁC TRONG HỢP ĐỒNG BẢO HIỂM", pageX + 14, y);
  y += 42;
  const noteY = 1572;
  const riderHeaderH = 42;
  const riderNameW = pageW * 0.54;
  const riderRows = snapshot.riders;
  const riderRowH = riderRows.length
    ? Math.min(42, Math.floor((noteY - 20 - y - riderHeaderH) / riderRows.length))
    : 42;
  fillCell(pageX, y, riderNameW, riderHeaderH);
  fillCell(pageX + riderNameW, y, pageW - riderNameW, riderHeaderH);
  cellText("SẢN PHẨM", pageX, y, riderNameW, riderHeaderH, { align: "center", weight: 850, color: "#0029b8" });
  cellText("SỐ TIỀN BẢO HIỂM", pageX + riderNameW, y, pageW - riderNameW, riderHeaderH, { align: "center", weight: 850, color: "#0029b8" });
  y += riderHeaderH;
  riderRows.forEach((rider) => {
    fillCell(pageX, y, riderNameW, riderRowH);
    fillCell(pageX + riderNameW, y, pageW - riderNameW, riderRowH);
    cellText(rider.name, pageX, y, riderNameW, riderRowH, { weight: 700, color: brightBlue });
    cellText(rider.displaySumInsured || "-", pageX + riderNameW, y, pageW - riderNameW, riderRowH, { align: "center", weight: 900, color: orange });
    y += riderRowH;
  });

  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, pageX, noteY, pageW, 82, 7);
  ctx.fill();
  ctx.strokeStyle = "#d9ebff";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = blue;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pageX + 46, noteY + 41, 19, 0, Math.PI * 2);
  ctx.stroke();
  drawText(ctx, "✓", pageX + 46, noteY + 28, { size: contentFontSize, weight: 850, color: orange, align: "center" });
  wrapText(
    ctx,
    "Tài liệu mang tính chất tham khảo nhanh",
    pageX + 88,
    noteY + 29,
    pageW - 118,
    contentLineHeight,
    { size: contentFontSize, weight: 600, color: "#0029b8" }
  );
  return canvas;
}

function renderLifeCareSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  canvas.height = 1780 + (snapshot.riders.length ? 120 + snapshot.riders.length * 40 : 0);
  const ctx = canvas.getContext("2d");
  const margin = 38;
  const contentW = canvas.width - margin * 2;
  const blue = "#0b56d8";
  const deepBlue = "#002f6c";
  const ink = "#12395d";
  const muted = "#526b82";
  const paleBlue = "#eef7ff";
  const line = "#cfe1f2";

  function card(x, y, width, height, fill = "#ffffff", stroke = line) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 59, 122, 0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = fill;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.stroke();
  }

  function labelValue(label, value, x, y, width) {
    drawText(ctx, label, x, y, { size: 19, weight: 750, color: muted, maxWidth: width * 0.55 });
    drawText(ctx, value, x + width, y, { size: 21, weight: 850, color: ink, align: "right", maxWidth: width * 0.43 });
  }

  function bullet(text, x, y, width) {
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.arc(x + 6, y + 12, 4, 0, Math.PI * 2);
    ctx.fill();
    return wrapText(ctx, text, x + 24, y, width - 24, 27, { size: 19, weight: 600, color: muted });
  }

  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 170);
  headerGradient.addColorStop(0, deepBlue);
  headerGradient.addColorStop(0.58, blue);
  headerGradient.addColorStop(1, "#00336f");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, canvas.width, 170);
  drawText(ctx, "TÓM TẮT MINH HỌA", canvas.width / 2, 36, {
    size: 28, weight: 800, color: "#d8ebff", align: "center"
  });
  drawText(ctx, "LIFE CARE 2.0", canvas.width / 2, 78, {
    size: 48, weight: 900, color: "#ffffff", align: "center"
  });
  drawText(ctx, `Ngày xuất: ${snapshot.exportedAtText}`, canvas.width / 2, 137, {
    size: 19, weight: 650, color: "#d8ebff", align: "center"
  });

  let y = 198;
  const summaryColumnGap = 18;
  const summaryColumnWidth = (contentW - summaryColumnGap) / 2;
  const customerCardX = margin;
  const contractCardX = margin + summaryColumnWidth + summaryColumnGap;
  const summaryInfoHeight = 236;

  card(customerCardX, y, summaryColumnWidth, summaryInfoHeight);
  drawText(ctx, "THÔNG TIN KHÁCH HÀNG", customerCardX + 24, y + 22, {
    size: 21, weight: 900, color: blue
  });
  const customerRows = [
    ["Họ và tên", snapshot.customerName],
    ["Ngày sinh", snapshot.dateOfBirth || "-"],
    ["Tuổi bảo hiểm", `${snapshot.age} tuổi`],
    ["Giới tính", snapshot.gender]
  ];
  customerRows.forEach((row, index) => {
    labelValue(
      row[0],
      row[1],
      customerCardX + 24,
      y + 64 + index * 37,
      summaryColumnWidth - 48
    );
  });

  card(contractCardX, y, summaryColumnWidth, summaryInfoHeight);
  drawText(ctx, "THÔNG TIN HỢP ĐỒNG", contractCardX + 24, y + 22, {
    size: 21, weight: 900, color: blue
  });
  const contractRows = [
    ["Sản phẩm", "Life Care 2.0"],
    ["Số tiền bảo hiểm", formatCurrency(snapshot.mainSumInsured)],
    ["Phí bảo hiểm định kỳ năm", formatCurrency(snapshot.mainPremium)],
    ["Thời hạn hợp đồng", `${snapshot.policyTermYears} năm`],
    ["Thời hạn đóng phí", `${snapshot.premiumPaymentYears} năm`]
  ];
  contractRows.forEach((row, index) => {
    labelValue(
      row[0],
      row[1],
      contractCardX + 24,
      y + 64 + index * 31,
      summaryColumnWidth - 48
    );
  });

  y += summaryInfoHeight + 28;
  drawText(ctx, "QUYỀN LỢI SẢN PHẨM", canvas.width / 2, y, {
    size: 29, weight: 900, color: blue, align: "center"
  });
  y += 48;

  card(margin, y, contentW, 310, "#ffffff", "#b9d8ef");
  drawText(ctx, "BỆNH LÝ NGHIÊM TRỌNG CƠ BẢN", margin + 28, y + 24, { size: 19, weight: 900, color: ink });
  drawText(ctx, `100% STBH = ${formatCurrency(snapshot.basicBenefit)}`, margin + 28, y + 64, {
    size: 19, weight: 900, color: blue, fitWidth: contentW - 56, minSize: 19
  });
  let textY = wrapText(
    ctx,
    "Chi trả khi Người được bảo hiểm mắc một trong các bệnh lý nghiêm trọng cơ bản thuộc phạm vi bảo hiểm.",
    margin + 28, y + 114, contentW - 56, 28,
    { size: 19, weight: 600, color: muted }
  ) + 8;
  textY = bullet("Ung thư giai đoạn đầu sau thời gian chờ", margin + 34, textY, contentW - 68);
  textY = bullet("Đột quỵ thỏa điều kiện tổn thương kéo dài hoặc phẫu thuật thông thường", margin + 34, textY, contentW - 68);
  bullet("Nhồi máu cơ tim", margin + 34, textY, contentW - 68);

  y += 336;
  card(margin, y, contentW, 480, "#ffffff", "#8fc5eb");
  drawText(ctx, "BỆNH LÝ NGHIÊM TRỌNG NÂNG CAO", margin + 28, y + 24, { size: 19, weight: 900, color: ink });
  drawText(ctx, `130% STBH = ${formatCurrency(snapshot.advancedBenefit)}`, margin + 28, y + 64, {
    size: 19, weight: 900, color: "#0071bc", fitWidth: contentW - 56, minSize: 19
  });
  wrapText(
    ctx,
    "Chi trả khi Người được bảo hiểm mắc bệnh lý nghiêm trọng nâng cao thuộc phạm vi bảo hiểm.",
    margin + 28, y + 114, contentW - 56, 28,
    { size: 19, weight: 600, color: muted }
  );

  const benefitItems = [
    ["TRẢ NGAY", `100% STBH = ${formatCurrency(snapshot.advancedImmediate)}`],
    ["TRẢ THÊM MỖI THÁNG", `5% STBH = ${formatCurrency(snapshot.advancedMonthly)}/tháng`],
    ["THỜI GIAN TRẢ THÊM", `${String(snapshot.advancedMonths).padStart(2, "0")} tháng liên tiếp`],
    ["TỔNG TỐI ĐA", `130% STBH = ${formatCurrency(snapshot.advancedBenefit)}`]
  ];
  const boxGap = 14;
  const boxW = (contentW - 56 - boxGap) / 2;
  benefitItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 28 + col * (boxW + boxGap);
    const boxY = y + 172 + row * 92;
    ctx.fillStyle = paleBlue;
    drawRoundedRect(ctx, x, boxY, boxW, 78, 12);
    ctx.fill();
    drawText(ctx, item[0], x + 14, boxY + 12, { size: 19, weight: 800, color: muted, maxWidth: boxW - 28 });
    drawText(ctx, item[1], x + 14, boxY + 42, { size: 19, weight: 900, color: blue, fitWidth: boxW - 28, minSize: 16 });
  });
  let advancedY = y + 366;
  advancedY = bullet("Ung thư giai đoạn cuối sau thời gian chờ", margin + 34, advancedY, contentW - 68);
  advancedY = bullet("Đột quỵ có phẫu thuật mở sọ hoặc phẫu thuật theo điều kiện", margin + 34, advancedY, contentW - 68);
  bullet("Nhồi máu cơ tim hoặc cơn đau thắt ngực có phẫu thuật tim hở", margin + 34, advancedY, contentW - 68);

  y += 506;
  if (snapshot.riders.length) {
    card(margin, y, contentW, 92 + snapshot.riders.length * 40);
    drawText(ctx, "SẢN PHẨM BÁN KÈM", margin + 28, y + 22, { size: 22, weight: 900, color: blue });
    snapshot.riders.forEach((rider, index) => {
      labelValue(rider.name, formatCurrency(rider.annualPremium), margin + 28, y + 62 + index * 38, contentW - 56);
    });
    y += 116 + snapshot.riders.length * 40;
  }

  card(margin, y, contentW, 88, "#fffaf0", "#edd29b");
  wrapText(
    ctx,
    "Tài liệu mang tính chất tóm tắt minh họa. Quyền lợi thực tế căn cứ Quy tắc, Điều khoản Life Care 2.0 và hồ sơ được chấp thuận.",
    margin + 28, y + 20, contentW - 56, 26,
    { size: 18, weight: 650, color: "#73551d", align: "center" }
  );
  return canvas;
}

function renderDashboardSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  canvas.height = SUMMARY_IMAGE_HEIGHT + 220 + (snapshot.riders.length ? 190 : 0);
  const ctx = canvas.getContext("2d");
  const colors = {
    navy: "#003b7a",
    deep: "#06245f",
    blue: "#075db8",
    cyan: "#18bdb4",
    gold: "#d99500",
    ink: "#08245c",
    muted: "#5d6b82",
    line: "#d7e4f5",
    bg: "#f3f8ff"
  };
  const margin = 34;
  const contentW = canvas.width - margin * 2;
  const totalAnnualPremium = snapshot.totals.firstYearPremium;

  function card(x, y, w, h, r = 18, fill = "#fff", stroke = colors.line) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 59, 122, 0.16)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = fill;
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  function icon(cx, cy, color, glyph, inverse = false) {
    ctx.fillStyle = inverse ? "rgba(255,255,255,0.24)" : "#eef5ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = inverse ? "#fff" : color;
    ctx.font = `900 27px ${SUMMARY_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, cx, cy + 1);
  }

  function compactMoney(value, digits = 0) {
    const amount = Math.max(0, Number(value) || 0);
    const isBillion = amount >= 1000000000;
    const divisor = isBillion ? 1000000000 : 1000000;
    return {
      value: (amount / divisor).toLocaleString("vi-VN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }),
      unit: isBillion ? "TỶ ĐỒNG" : "TRIỆU ĐỒNG"
    };
  }

  function shortMoney(value, digits = 0) {
    const amount = Math.max(0, Number(value) || 0);
    if (amount > 0 && amount < 1000000) return formatCurrency(amount);
    const money = compactMoney(value, digits);
    const unit = money.unit.includes("TỶ") ? "tỷ" : "triệu";
    return `${money.value} ${unit}`;
  }

  function moneyStack(value, x, y, opts = {}) {
    const money = compactMoney(value, opts.digits || 0);
    drawText(ctx, money.value, x, y, {
      size: opts.size || 58,
      weight: 900,
      color: opts.color || "#fff",
      align: opts.align || "center",
      fitWidth: opts.fitWidth,
      minSize: opts.minSize || 32
    });
    drawText(ctx, money.unit, x, y + (opts.unitOffset || 68), {
      size: opts.unitSize || 25,
      weight: 900,
      color: opts.color || "#fff",
      align: opts.align || "center",
      fitWidth: opts.fitWidth,
      minSize: 16
    });
  }

  function heading(title, y, glyph = "✓") {
    ctx.strokeStyle = "#a9c4ed";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 230, y + 24);
    ctx.lineTo(margin + 322, y + 24);
    ctx.moveTo(canvas.width - margin - 322, y + 24);
    ctx.lineTo(canvas.width - margin - 230, y + 24);
    ctx.stroke();
    icon(canvas.width / 2 - 176, y + 24, colors.blue, glyph);
    drawText(ctx, title.toUpperCase(), canvas.width / 2 - 132, y + 4, {
      size: 28,
      weight: 900,
      color: colors.blue,
      fitWidth: 560,
      minSize: 22
    });
  }

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerH = 150;
  const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, headerH);
  headerGradient.addColorStop(0, "#002f7f");
  headerGradient.addColorStop(0.58, "#004da3");
  headerGradient.addColorStop(1, "#00235f");
  ctx.fillStyle = headerGradient;
  drawRoundedRect(ctx, 0, 0, canvas.width, headerH + 18, 18);
  ctx.fill();
  drawText(ctx, `MINH HỌA ${snapshot.productName || MAIN_PRODUCTS.ATHD}`.toUpperCase(), canvas.width / 2, 54, {
    size: 42,
    weight: 900,
    color: "#fff",
    align: "center",
    fitWidth: contentW - 80,
    minSize: 28
  });

  let y = 126;
  card(margin, y, contentW, 104, 16);
  icon(margin + 68, y + 59, colors.blue, "👤", true);
  drawText(ctx, "KHÁCH HÀNG", margin + 122, y + 31, { size: 18, weight: 800, color: colors.blue });
  drawText(ctx, snapshot.customerName, margin + 122, y + 60, { size: 27, weight: 900, color: colors.ink, fitWidth: 260, minSize: 22 });
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 390, y + 30);
  ctx.lineTo(margin + 390, y + 88);
  ctx.moveTo(margin + 730, y + 30);
  ctx.lineTo(margin + 730, y + 88);
  ctx.stroke();
  icon(margin + 450, y + 59, colors.blue, "✓");
  drawText(ctx, "PHÍ BẢO HIỂM", margin + 504, y + 31, { size: 18, weight: 800, color: colors.blue });
  drawText(ctx, `${formatVND(totalAnnualPremium)} đ/năm`, margin + 504, y + 60, { size: 26, weight: 900, color: colors.blue, fitWidth: 220, minSize: 20 });
  icon(margin + 780, y + 59, colors.gold, "≋");
  drawText(ctx, `${formatVND(Math.ceil(totalAnnualPremium / 365))} đ/ngày`, margin + 838, y + 50, {
    size: 27,
    weight: 900,
    color: colors.gold,
    fitWidth: 170,
    minSize: 20
  });

  y += 116;
  card(margin, y, contentW, 160, 16);
  const contractItems = [
    ["NGÀY SINH", snapshot.dateOfBirth || "-", "▣"],
    ["TUỔI BẢO HIỂM", snapshot.age === null || snapshot.age === undefined ? "-" : `${snapshot.age} tuổi`, "👤"],
    ["GIỚI TÍNH", snapshot.gender || "-", "⚥"],
    ["THỜI HẠN HỢP ĐỒNG", `${snapshot.policyTermYears} năm`, "▦"],
    ["THỜI HẠN ĐÓNG PHÍ", `${snapshot.premiumPaymentYears} năm`, "✓"],
    ["ĐỊNH KỲ ĐÓNG PHÍ", snapshot.paymentMode, "↻"]
  ];
  const itemW = contentW / 3;
  contractItems.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * itemW;
    const iy = y + row * 80;
    if (col > 0) {
      ctx.strokeStyle = "#e1ebf8";
      ctx.beginPath();
      ctx.moveTo(x, iy + 16);
      ctx.lineTo(x, iy + 64);
      ctx.stroke();
    }
    if (row > 0) {
      ctx.strokeStyle = "#e1ebf8";
      ctx.beginPath();
      ctx.moveTo(margin + 28, iy);
      ctx.lineTo(margin + contentW - 28, iy);
      ctx.stroke();
    }
    icon(x + 56, iy + 40, colors.blue, item[2]);
    drawText(ctx, item[0], x + 102, iy + 18, { size: 18, weight: 850, color: colors.blue, fitWidth: itemW - 118, minSize: 16 });
    drawText(ctx, item[1], x + 102, iy + 45, { size: 23, weight: 900, color: colors.ink, fitWidth: itemW - 118, minSize: 18 });
  });

  y += 188;
  heading("Quyền lợi bảo vệ", y, "✓");
  y += 48;
  const protectionCards = [
    ["QUYỀN LỢI TỬ VONG", snapshot.mainSumInsured, colors.blue, "#0046a5", "♚"],
    [snapshot.mainProduct === "ATPN" ? "CHU TOÀN HẬU SỰ" : "QUYỀN LỢI THƯƠNG TẬT\nTOÀN BỘ VĨNH VIỄN", snapshot.disabilitySumInsured, colors.cyan, "#0ba89f", "+"]
  ];
  const cardGap = 20;
  const protectW = (contentW - cardGap) / 2;
  const protectH = 178;
  protectionCards.forEach((item, index) => {
    const x = margin + index * (protectW + cardGap);
    const grad = ctx.createLinearGradient(x, y, x + protectW, y + protectH);
    grad.addColorStop(0, item[2]);
    grad.addColorStop(1, item[3]);
    card(x, y, protectW, protectH, 16, grad, "rgba(255,255,255,0.2)");
    icon(x + 70, y + 52, item[2], item[4], true);
    wrapText(ctx, item[0], x + 116, y + 34, protectW - 146, 22, { size: 20, weight: 900, color: "#fff" });
    moneyStack(item[1], x + protectW / 2, y + 98, { size: 50, unitSize: 21, unitOffset: 54, fitWidth: protectW - 46 });
  });

  y += protectH + 42;
  heading("Giá trị hoàn lại minh họa", y, "▥");
  drawText(ctx, "So sánh 2 kịch bản lãi suất: 4,76% và 4,25%/năm", canvas.width / 2, y + 42, {
    size: 18,
    weight: 700,
    color: colors.ink,
    align: "center",
    fitWidth: contentW - 80,
    minSize: 16
  });
  y += 84;
  const years = [5, 10, 15, 20];
  const milestoneByYear = new Map(snapshot.totals.accountMilestones.map((item) => [item.year, item]));
  const milestoneGap = 18;
  const milestoneCols = 4;
  const milestoneW = (contentW - milestoneGap * 3) / milestoneCols;
  const milestoneH = 230;
  years.forEach((year, index) => {
    const item = milestoneByYear.get(year);
    const x = margin + index * (milestoneW + milestoneGap);
    const cardY = y + 16;
    card(x, cardY, milestoneW, milestoneH, 14);
    ctx.fillStyle = colors.blue;
    drawRoundedRect(ctx, x + 48, cardY - 15, milestoneW - 96, 34, 8);
    ctx.fill();
    drawText(ctx, `NĂM ${String(year).padStart(2, "0")}`, x + milestoneW / 2, cardY - 8, { size: 18, weight: 900, color: "#fff", align: "center" });
    drawText(ctx, "ĐÃ ĐÓNG", x + milestoneW / 2, cardY + 34, {
      size: 14,
      weight: 900,
      color: colors.blue,
      align: "center"
    });
    drawText(ctx, shortMoney(item?.cumulativePremium || 0, 0), x + milestoneW / 2, cardY + 58, {
      size: 27,
      weight: 900,
      color: colors.blue,
      align: "center",
      fitWidth: milestoneW - 34,
      minSize: 21
    });

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 22, cardY + 104);
    ctx.lineTo(x + milestoneW - 22, cardY + 104);
    ctx.moveTo(x + milestoneW / 2, cardY + 120);
    ctx.lineTo(x + milestoneW / 2, cardY + 198);
    ctx.stroke();

    [
      ["4,76%", item?.cashValue476 || 0],
      ["4,25%", item?.cashValue425 || 0]
    ].forEach((rate, rateIndex) => {
      const cx = x + (rateIndex === 0 ? milestoneW * 0.25 : milestoneW * 0.75);
      const rateColor = rateIndex === 0 ? colors.gold : colors.blue;
      drawText(ctx, rate[0], cx, cardY + 122, {
        size: 18,
        weight: 900,
        color: rateColor,
        align: "center"
      });
      const money = compactMoney(rate[1], 2);
      drawText(ctx, money.value, cx, cardY + 150, {
        size: 25,
        weight: 900,
        color: rateColor,
        align: "center",
        fitWidth: milestoneW / 2 - 26,
        minSize: 18
      });
      drawText(ctx, money.unit.toLowerCase(), cx, cardY + 181, {
        size: 12,
        weight: 800,
        color: rateColor,
        align: "center",
        fitWidth: milestoneW / 2 - 26,
        minSize: 11
      });
    });
  });

  y += 16 + milestoneH + 54;
  if (snapshot.riders.length) {
    heading("Sản phẩm bổ trợ", y, "✓");
    y += 50;
    const riderCols = 3;
    const riderGap = 14;
    const riderCardW = (contentW - riderGap * (riderCols - 1)) / riderCols;
    const riderCardH = 206;
    snapshot.riders.slice(0, 6).forEach((rider, index) => {
      const col = index % riderCols;
      const row = Math.floor(index / riderCols);
      const rx = margin + col * (riderCardW + riderGap);
      const ry = y + row * (riderCardH + 16);
      card(rx, ry, riderCardW, riderCardH, 14);
      ctx.fillStyle = colors.blue;
      drawRoundedRect(ctx, rx + 16, ry + 14, 64, 38, 10);
      ctx.fill();
      drawText(ctx, rider.code, rx + 48, ry + 20, {
        size: 22,
        weight: 900,
        color: "#fff",
        align: "center"
      });
      const nameBottom = wrapText(ctx, rider.name, rx + 16, ry + 64, riderCardW - 32, 27, {
        size: 22,
        weight: 900,
        color: colors.ink,
        maxWidth: riderCardW - 32,
        minSize: 18
      });
      const riderAmountText = rider.sumInsured ? shortMoney(rider.sumInsured, 0) : rider.displaySumInsured || "-";
      const riderMeta = rider.code === "R26"
        ? `Hạng: ${rider.r26Plan || "-"}`
        : `STBH: ${riderAmountText}`;
      const metaY = Math.max(nameBottom + 10, ry + 128);
      drawText(ctx, riderMeta, rx + 16, metaY, {
        size: 21,
        weight: 900,
        color: colors.blue,
        fitWidth: riderCardW - 32,
        minSize: 17
      });
      const feeText = rider.code === "R26"
        ? `${(rider.r26Benefits || []).length} quyền lợi`
        : `Phí: ${formatCurrency(rider.annualPremium)} /năm`;
      drawText(ctx, feeText, rx + 16, metaY + 32, {
        size: 19,
        weight: 800,
        color: colors.muted,
        fitWidth: riderCardW - 32,
        minSize: 16
      });
    });
    y += Math.ceil(Math.min(snapshot.riders.length, 6) / riderCols) * (riderCardH + 16) + 8;
  }

  card(margin, y, contentW, 58, 14);
  icon(margin + 42, y + 29, colors.blue, "i");
  drawText(ctx, "Tài liệu tham khảo nhanh", margin + 82, y + 18, { size: 21, weight: 900, color: colors.blue });

  const finalHeight = Math.min(canvas.height, Math.max(y + 82, 1120));
  if (finalHeight !== canvas.height) {
    const cropped = document.createElement("canvas");
    cropped.width = canvas.width;
    cropped.height = finalHeight;
    cropped.getContext("2d").drawImage(canvas, 0, 0);
    return cropped;
  }
  return canvas;
}

function canvasToJpegBlob(canvas, quality = 0.98) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "") || "Khach hang";
}

function getSummaryPdfFilename(snapshot) {
  const customerName = sanitizeFilenamePart(snapshot.customerName || "Khach hang");
  const totalPremium = sanitizeFilenamePart(`${formatVND(snapshot.totals.firstYearPremium)}đ`);
  return `${customerName} - ${totalPremium}.pdf`;
}

function getAddonBenefitSummaryFilename(index = 0) {
  return index
    ? `tom-tat-quyen-loi-san-pham-ban-kem-${index + 1}.jpg`
    : "tom-tat-quyen-loi-san-pham-ban-kem.jpg";
}

function escapePdfString(value) {
  return String(value).replace(/[\\()]/g, "\\$&");
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

async function canvasToPdfBlob(canvases, filename) {
  const pages = (Array.isArray(canvases) ? canvases : [canvases]).filter(Boolean);
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 18;
  const pageData = await Promise.all(pages.map(async (canvas, index) => {
    const jpegBlob = await canvasToJpegBlob(canvas, 0.98);
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
    const imageWidth = canvas.width * scale;
    const imageHeight = canvas.height * scale;
    const imageX = (pageWidth - imageWidth) / 2;
    const imageY = (pageHeight - imageHeight) / 2;
    const drawCommand = `q ${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm /Im${index + 1} Do Q`;
    return { canvas, jpegBytes, drawCommand, imageName: `Im${index + 1}` };
  }));
  const kids = pageData.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  const objects = [
    { body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { body: `<< /Type /Pages /Kids [${kids}] /Count ${pageData.length} >>` }
  ];

  pageData.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 3;
    const imageObjectNumber = pageObjectNumber + 1;
    const contentObjectNumber = pageObjectNumber + 2;
    objects.push(
      { body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /${page.imageName} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>` },
      {
        body: `<< /Type /XObject /Subtype /Image /Width ${page.canvas.width} /Height ${page.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\nstream\n`,
        streamBytes: page.jpegBytes,
        closeStream: true
      },
      { body: `<< /Length ${page.drawCommand.length} >>\nstream\n${page.drawCommand}\nendstream` }
    );
  });
  const parts = [encoder.encode("%PDF-1.4\n")];
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(encoder.encode(`${index + 1} 0 obj\n`));
    parts.push(encoder.encode(object.body));
    if (object.streamBytes) {
      parts.push(object.streamBytes);
      if (object.closeStream) parts.push(encoder.encode("\nendstream"));
    }
    parts.push(encoder.encode("\nendobj\n"));
  });
  const xrefOffset = parts.reduce((sum, part) => sum + part.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdfString(filename)}) >> >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(xref));
  return new Blob([concatUint8Arrays(parts)], { type: "application/pdf" });
}

function revokeAddonBenefitImages() {
  latestAddonBenefitImages.forEach((image) => {
    if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
  });
  latestAddonBenefitImages = [];
}

function renderAddonBenefitPreviewImages(images) {
  const container = document.getElementById("addonBenefitPreviewPages");
  if (!container) return;
  container.innerHTML = "";
  if (!images.length) {
    container.hidden = true;
    return;
  }

  images.forEach((image, index) => {
    const page = document.createElement("div");
    page.className = "addon-benefit-preview-page";
    const previewImage = document.createElement("img");
    previewImage.src = image.objectUrl;
    previewImage.alt = `Anh tom tat quyen loi SPBK ${index + 1}`;
    page.appendChild(previewImage);
    container.appendChild(page);
  });
  container.hidden = false;
}

function buildAddonBenefitSummaryInput(snapshot) {
  return {
    mainProduct: snapshot.productName,
    mainDeathBenefit: snapshot.mainSumInsured,
    annualBasicPremium: snapshot.mainPremium,
    insured: {
      name: snapshot.customerName,
      age: snapshot.age,
      gender: snapshot.gender
    },
    selectedAddons: snapshot.riders
  };
}

function triggerFileDownload(file) {
  if (!file?.objectUrl || !file.filename) return;
  const link = document.createElement("a");
  link.href = file.objectUrl;
  link.download = file.filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadSummaryPdf() {
  triggerFileDownload(latestSummaryImage);
}

async function loadAddonBenefitReferenceMarkdown() {
  if (addonBenefitReferenceMarkdown !== null) return addonBenefitReferenceMarkdown;
  const response = await fetch("SPBK_QUYEN_LOI_CHI_TIET_CODEX.md", { cache: "no-store" });
  if (!response.ok) throw new Error("Khong doc duoc file SPBK_QUYEN_LOI_CHI_TIET_CODEX.md");
  addonBenefitReferenceMarkdown = await response.text();
  return addonBenefitReferenceMarkdown;
}

async function createAddonBenefitSummaryImages(snapshot) {
  revokeAddonBenefitImages();
  const links = document.getElementById("addonBenefitDownloadLinks");
  if (!links) return [];
  links.hidden = true;
  links.innerHTML = "";

  if (!snapshot.riders.length || !window.AddonBenefitSummaryService) return [];
  const referenceMarkdown = await loadAddonBenefitReferenceMarkdown();

  const canvases = window.AddonBenefitSummaryService.createAddonBenefitSummaryPages(
    buildAddonBenefitSummaryInput(snapshot),
    {
      referenceMarkdown,
      r26BenefitLabels: R26_BENEFIT_LABELS,
      getR26AllowedBenefits
    }
  );

  latestAddonBenefitImages = await Promise.all(canvases.map(async (canvas, index) => {
    const blob = await canvasToJpegBlob(canvas);
    const objectUrl = URL.createObjectURL(blob);
    const filename = getAddonBenefitSummaryFilename(index);
    return { blob, objectUrl, filename, canvas };
  }));

  return latestAddonBenefitImages;
}

async function uploadSummaryPdf(blob, filename) {
  if (typeof window.uploadIllustrationSummaryImage === "function") {
    return window.uploadIllustrationSummaryImage(blob, filename);
  }

  if (!window.MINH_HOA_SUMMARY_UPLOAD_URL) return null;

  const formData = new FormData();
  formData.append("file", blob, filename);
  const response = await fetch(window.MINH_HOA_SUMMARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });
  if (!response.ok) throw new Error("Không upload được ảnh tóm tắt.");
  const data = await response.json();
  return data.url || data.publicUrl || data.imageUrl || null;
}

function trackSummaryExportClick(snapshot, sourceId) {
  const source = sourceId === "riderExportSummaryButton" ? "riders" : "main";
  const valid = Boolean(snapshot?.valid);

  if (typeof window.va === "function") {
    window.va("event", {
      name: "Export Summary Click",
      data: {
        source,
        valid
      }
    });
  }

  if (typeof window.logAppEvent === "function") {
    window.logAppEvent("summary_export_click", {
      source,
      valid,
      product: snapshot?.productCode || "",
      has_riders: Boolean(snapshot?.riders?.length)
    });
  }
}

async function openSummaryPreview(event) {
  const snapshot = buildSummarySnapshot();
  trackSummaryExportClick(snapshot, event?.currentTarget?.id);
  const status = document.getElementById("summaryExportStatus");
  if (!snapshot.valid) {
    if (status) status.textContent = snapshot.message;
    updateSummaryExportAvailability();
    return;
  }

  const screen = document.getElementById("summaryPreviewScreen");
  const image = document.getElementById("summaryPreviewImage");
  const loading = document.getElementById("summaryPreviewLoading");
  const download = document.getElementById("downloadSummaryJpg");
  const addonLinks = document.getElementById("addonBenefitDownloadLinks");
  const share = document.getElementById("shareSummaryZalo");
  const shareStatus = document.getElementById("summaryShareStatus");
  screen.hidden = false;
  document.body.classList.add("summary-preview-open");
  loading.hidden = false;
  image.removeAttribute("src");
  if (addonLinks) {
    addonLinks.hidden = true;
    addonLinks.innerHTML = "";
  }
  renderAddonBenefitPreviewImages([]);
  download.disabled = true;
  share.disabled = true;
  shareStatus.textContent = "";

  const canvas = snapshot.isLifeCare20
    ? renderLifeCareSummaryCanvas(snapshot)
    : renderDashboardSummaryCanvas(snapshot);
  const filename = getSummaryPdfFilename(snapshot);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

  if (latestSummaryImage?.objectUrl) URL.revokeObjectURL(latestSummaryImage.objectUrl);
  latestSummaryImage = null;
  image.src = dataUrl;
  let addonBenefitImages = [];
  try {
    addonBenefitImages = await createAddonBenefitSummaryImages(snapshot);
  } catch (error) {
    loading.hidden = true;
    shareStatus.textContent = "Khong doc duoc file SPBK_QUYEN_LOI_CHI_TIET_CODEX.md nen chua the xuat tom tat quyen loi SPBK.";
    return;
  }
  renderAddonBenefitPreviewImages(addonBenefitImages);
  const pdfCanvases = [canvas, ...addonBenefitImages.map((page) => page.canvas).filter(Boolean)];
  const blob = await canvasToPdfBlob(pdfCanvases, filename);
  const objectUrl = URL.createObjectURL(blob);
  latestSummaryImage = { blob, filename, objectUrl, dataUrl, publicUrl: null };
  loading.hidden = true;
  download.disabled = false;
  share.disabled = false;

  try {
    latestSummaryImage.publicUrl = await uploadSummaryPdf(blob, filename);
    if (latestSummaryImage.publicUrl) {
      shareStatus.textContent = "PDF đã sẵn sàng để chia sẻ qua Zalo.";
    }
  } catch (error) {
    shareStatus.textContent = "Đã tạo PDF. Chưa upload được file public, vẫn có thể tải PDF về máy.";
  }
}

async function shareSummaryViaZalo() {
  if (!latestSummaryImage) return;
  const shareStatus = document.getElementById("summaryShareStatus");
  const file = new File([latestSummaryImage.blob], latestSummaryImage.filename, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file] });
    return;
  }

  downloadSummaryPdf();
  shareStatus.textContent = "Trinh duyet nay chua ho tro chia se PDF truc tiep. PDF da duoc tai xuong.";
}

function closeSummaryPreview() {
  document.getElementById("summaryPreviewScreen").hidden = true;
  document.body.classList.remove("summary-preview-open");
}

document.getElementById("exportSummaryButton")?.addEventListener("click", openSummaryPreview);
document.getElementById("riderExportSummaryButton")?.addEventListener("click", openSummaryPreview);
document.getElementById("downloadSummaryJpg")?.addEventListener("click", downloadSummaryPdf);
document.getElementById("shareSummaryZalo")?.addEventListener("click", () => {
  shareSummaryViaZalo().catch((error) => {
    if (error?.name === "AbortError") return;
    document.getElementById("summaryShareStatus").textContent = "Không mở được chia sẻ Zalo. Hãy tải PDF rồi gửi qua Zalo.";
  });
});
document.getElementById("editSummaryPlan")?.addEventListener("click", closeSummaryPreview);

updateAgePreview();
syncMainProductSelector();
updateDeathSumAssuredRange();
updateDisabilitySumAssured();
setOccupationGroup(DEFAULT_JOB_GROUP);
hideOccupationSuggestions();
refreshIllustration();
loadRiderPlan();
renderRiderUI();
syncGenderButtons();
setActiveTab("main");
updateSummaryExportAvailability();
window.ATPN_DATA_READY?.then(() => {
  validateAtpnSampleIllustration();
  if (selectedMainProduct === "ATPN") {
    updateDeathSumAssuredRange();
    updateSummaryExportAvailability();
  }
});
