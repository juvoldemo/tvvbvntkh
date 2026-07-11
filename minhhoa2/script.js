const loyaltyBonusPolicyYears = [5, 10, 15, 20];
const additionalPremiumAllocationFeeRate = 0;
const alternateIllustrationInterestRate = 4.25;
const fixedIllustrationInterestRate = 4.76;
const MAIN_PRODUCTS = {
  ATHD: "An TÃ¢m Hoáº¡ch Äá»‹nh",
  ATPN: "An Thá»‹nh PhÃºc NiÃªn",
  LIFE_CARE_20: "Life Care 2.0"
};
const MAIN_PRODUCT_TERMS_PDFS = {
  ATHD: "Antamhoachdinh_QTÄK.pdf",
  ATPN: "Anthinhphucnien_QTÄK.pdf",
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
  yearly: "NÄƒm",
  halfYearly: "Ná»­a nÄƒm",
  quarterly: "QuÃ½",
  monthly: "ThÃ¡ng"
};

const DEFAULT_JOB_GROUP = 1;
const JOBS = Array.isArray(window.OCCUPATION_JOBS) ? window.OCCUPATION_JOBS : [];

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä‘/g, "d")
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

const R26_PLANS = ["Báº¡c", "VÃ ng", "Báº¡ch Kim", "Kim CÆ°Æ¡ng", "Lá»¥c Báº£o"];
const R26_BENEFIT_LABELS = {
  inpatient: "Ná»™i trÃº",
  outpatient: "Ngoáº¡i trÃº",
  dental: "Nha khoa",
  maternity: "Thai sáº£n"
};

const R26_BENEFIT_DESCRIPTIONS = {
  inpatient: "Chi phÃ­ Ä‘iá»u trá»‹ ná»™i trÃº",
  outpatient: "KhÃ¡m vÃ  Ä‘iá»u trá»‹ ngoáº¡i trÃº",
  dental: "ChÄƒm sÃ³c rÄƒng miá»‡ng",
  maternity: "Quyá»n lá»£i thai sáº£n"
};

const R26_PLAN_BENEFITS = {
  "Báº¡c": ["inpatient"],
  "VÃ ng": ["inpatient", "outpatient", "dental", "maternity"],
  "Báº¡ch Kim": ["inpatient", "outpatient", "dental", "maternity"],
  "Kim CÆ°Æ¡ng": ["inpatient", "outpatient", "dental", "maternity"],
  "Lá»¥c Báº£o": ["inpatient", "outpatient", "dental", "maternity"]
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

const R24_RATE_TABLE = {
  male: {
    18: { 10: 16964, 15: 21039, 20: 26707 }, 19: { 10: 18138, 15: 22307, 20: 28186 },
    20: { 10: 19223, 15: 23437, 20: 29481 }, 21: { 10: 20035, 15: 24250, 20: 30490 },
    22: { 10: 20606, 15: 24809, 20: 31151 }, 23: { 10: 20728, 15: 24992, 20: 31433 },
    24: { 10: 20624, 15: 24915, 20: 31464 }, 25: { 10: 20348, 15: 24699, 20: 31386 },
    26: { 10: 20044, 15: 24509, 20: 31837 }, 27: { 10: 19855, 15: 24505, 20: 31650 },
    28: { 10: 19868, 15: 24781, 20: 32269 }, 29: { 10: 20118, 15: 25362, 20: 33356 },
    30: { 10: 20602, 15: 26231, 20: 34784 }, 31: { 10: 21253, 15: 27341, 20: 36527 },
    32: { 10: 22063, 15: 28675, 20: 38602 }, 33: { 10: 23128, 15: 30274, 20: 41022 },
    34: { 10: 24326, 15: 32136, 20: 43812 }, 35: { 10: 25866, 15: 34407, 20: 47014 },
    36: { 10: 27595, 15: 36926, 20: 50559 }, 37: { 10: 29518, 15: 39721, 20: 54492 },
    38: { 10: 31582, 15: 42769, 20: 58906 }, 39: { 10: 33964, 15: 46143, 20: 63603 },
    40: { 10: 36621, 15: 49863, 20: 69000 }, 41: { 10: 39633, 15: 54031, 20: 74805 },
    42: { 10: 43021, 15: 58818, 20: 81393 }, 43: { 10: 46725, 15: 63854, 20: 88180 },
    44: { 10: 50635, 15: 69408, 20: 95637 }, 45: { 10: 54816, 15: 75191, 20: 103666 },
    46: { 10: 59266, 15: 81386, 20: 112005 }, 47: { 10: 63801, 15: 87426, 20: 120785 },
    48: { 10: 68620, 15: 94384, 20: 130217 }, 49: { 10: 74044, 15: 101553, 20: 140023 },
    50: { 10: 79715, 15: 109246, 20: 150759 }, 51: { 10: 85873, 15: 117502 },
    52: { 10: 92492, 15: 126367 }, 53: { 10: 99488, 15: 135719 },
    54: { 10: 106760, 15: 145581 }, 55: { 10: 114089, 15: 155555 },
    56: { 10: 121263 }, 57: { 10: 128810 }, 58: { 10: 136614 }, 59: { 10: 144955 }, 60: { 10: 154654 }
  },
  female: {
    18: { 10: 10463, 15: 12086, 20: 14819 }, 19: { 10: 10898, 15: 12531, 20: 15323 },
    20: { 10: 11245, 15: 12879, 20: 15746 }, 21: { 10: 11408, 15: 13042, 20: 15984 },
    22: { 10: 11453, 15: 13095, 20: 16079 }, 23: { 10: 11340, 15: 13004, 20: 15993 },
    24: { 10: 11167, 15: 12869, 20: 15903 }, 25: { 10: 11030, 15: 12791, 20: 15872 },
    26: { 10: 10970, 15: 12807, 20: 15984 }, 27: { 10: 11077, 15: 13006, 20: 16325 },
    28: { 10: 11290, 15: 13321, 20: 16789 }, 29: { 10: 11588, 15: 13725, 20: 17370 },
    30: { 10: 11915, 15: 14204, 20: 18069 }, 31: { 10: 12276, 15: 14686, 20: 18780 },
    32: { 10: 12647, 15: 15168, 20: 19543 }, 33: { 10: 13036, 15: 15722, 20: 20318 },
    34: { 10: 13438, 15: 16289, 20: 21136 }, 35: { 10: 13877, 15: 16892, 20: 21972 },
    36: { 10: 14313, 15: 17555, 20: 22967 }, 37: { 10: 14753, 15: 18236, 20: 23947 },
    38: { 10: 15240, 15: 19049, 20: 25062 }, 39: { 10: 15871, 15: 19226, 20: 26374 },
    40: { 10: 16594, 15: 21001, 20: 27894 }, 41: { 10: 17517, 15: 22390, 20: 29689 },
    42: { 10: 18609, 15: 23801, 20: 31685 }, 43: { 10: 19886, 15: 25502, 20: 34008 },
    44: { 10: 21333, 15: 27437, 20: 36577 }, 45: { 10: 22935, 15: 29498, 20: 39359 },
    46: { 10: 24536, 15: 31594, 20: 42277 }, 47: { 10: 26187, 15: 33475, 20: 45257 },
    48: { 10: 27780, 15: 35870, 20: 48296 }, 49: { 10: 29429, 15: 38122, 20: 51471 },
    50: { 10: 31126, 15: 40547, 20: 55126 }, 51: { 10: 32954, 15: 42582 },
    52: { 10: 35107, 15: 46303 }, 53: { 10: 37436, 15: 49718 },
    54: { 10: 39961, 15: 53480 }, 55: { 10: 42720, 15: 57720 },
    56: { 10: 45744 }, 57: { 10: 49142 }, 58: { 10: 53108 }, 59: { 10: 57949 }, 60: { 10: 63241 }
  }
};

const SPBK_PRODUCTS = {
  R21: {
    code: "R21",
    name: "Báº£o hiá»ƒm Bá»‡nh nan y",
    shortDescription: "TÃ­nh phÃ­ theo tuá»•i, giá»›i tÃ­nh vÃ  STBH theo biá»ƒu phÃ­ 0-74.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true,
    notes: "R21 Ä‘ang dÃ¹ng biá»ƒu phÃ­ Ä‘áº§y Ä‘á»§ tá»« tuá»•i 0 Ä‘áº¿n 74 theo giá»›i tÃ­nh."
  },
  R22: {
    code: "R22",
    name: "ThÆ°Æ¡ng táº­t bá»™ pháº­n vÄ©nh viá»…n do tai náº¡n 2.0",
    shortDescription: "Tá»· lá»‡ chuáº©n 0,51/1.000 STBH, Ä‘iá»u chá»‰nh theo nhÃ³m nghá» nghiá»‡p.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R23: {
    code: "R23",
    name: "Tá»­ vong vÃ  ThÆ°Æ¡ng táº­t nghiÃªm trá»ng do tai náº¡n",
    shortDescription: "TÃ­nh theo nhÃ³m tuá»•i, nhÃ³m nghá» nghiá»‡p vÃ  STBH.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R24: {
    code: "R24",
    name: "Há»— trá»£ Ä‘Ã³ng phÃ­ báº£o hiá»ƒm do tá»­ vong",
    shortDescription: "TÃ­nh theo phÃ­ Ä‘á»‹nh ká»³ nÄƒm sáº£n pháº©m chÃ­nh, tuá»•i, giá»›i tÃ­nh vÃ  thá»i háº¡n.",
    minSumInsured: 0,
    maxSumInsured: 0,
    step: 0,
    quickAmounts: [],
    isConfigured: true,
    notes: "File R24 chá»‰ cÃ³ tá»· lá»‡ máº«u cho tuá»•i 30. Tuá»•i/thá»i háº¡n khÃ¡c sáº½ bÃ¡o chÆ°a cÃ³ biá»ƒu phÃ­."
  },
  R25: {
    code: "R25",
    name: "Bá»‡nh lÃ½ nghiÃªm trá»ng toÃ n diá»‡n",
    shortDescription: "TÃ­nh phÃ­ theo tuá»•i, giá»›i tÃ­nh, STBH vÃ  Ä‘á»‹nh ká»³ Ä‘Ã³ng phÃ­.",
    minSumInsured: 100000000,
    maxSumInsured: 1000000000,
    step: 50000000,
    quickAmounts: [100000000, 200000000, 300000000, 400000000, 500000000, 1000000000],
    isConfigured: true
  },
  R26: {
    code: "R26",
    name: "ChÄƒm sÃ³c Sá»©c khá»e ToÃ n diá»‡n",
    shortDescription: "Chá»n chÆ°Æ¡ng trÃ¬nh vÃ  quyá»n lá»£i sá»©c khá»e; biá»ƒu phÃ­ Ä‘Æ¡n vá»‹ nghÃ¬n Ä‘á»“ng.",
    minSumInsured: 0,
    maxSumInsured: 0,
    step: 0,
    quickAmounts: [],
    isConfigured: true
  },
  R27: { code: "R27", name: "R27", shortDescription: "ChÆ°a cáº¥u hÃ¬nh sáº£n pháº©m", isConfigured: false },
  R28: { code: "R28", name: "R28", shortDescription: "ChÆ°a cáº¥u hÃ¬nh sáº£n pháº©m", isConfigured: false },
  R29: {
    code: "R29",
    name: "Trá»£ cáº¥p viá»‡n phÃ­ vÃ  pháº«u thuáº­t",
    shortDescription: "Kiá»ƒm tra giá»›i háº¡n STBH theo tuá»•i vÃ  0,2% STBH chÃ­nh.",
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
const riderStatesByPerson = {
  insured: riderState,
  policyOwner: {
    activeCode: "R21",
    selections: {},
    hideStbhControls: false
  }
};

const RIDER_TERMS_PDF_DIR = "SPBK_PDF";
const SPBK_BENEFIT_POPUP_EMPTY_MESSAGE = "Vui lÃ²ng chá»n sá»‘ tiá»n báº£o hiá»ƒm Ä‘á»ƒ xem chi tiáº¿t quyá»n lá»£i.";

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
        message: "NhÃ³m nghá» hiá»‡n táº¡i khÃ´ng Ä‘Æ°á»£c tham gia R22."
      };
    }

    if (addonCode === "R23") {
      return {
        allowed: true,
        maxStbh: Math.min(currentMaxStbh ?? Infinity, 300000000),
        message: "NhÃ³m nghá» 5: STBH R23 tá»‘i Ä‘a 300.000.000 Ä‘á»“ng."
      };
    }
  }

  if (group === 6 && (addonCode === "R22" || addonCode === "R23")) {
    return {
      allowed: false,
      maxStbh: currentMaxStbh,
      message: `NhÃ³m nghá» 6 khÃ´ng Ä‘Æ°á»£c tham gia ${addonCode}.`
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

function getActiveRiderPersonKey() {
  return policyOwnerMode === "different" && activePersonFormTab === "policyOwner" ? "policyOwner" : "insured";
}

function getActiveRiderState() {
  return riderStatesByPerson[getActiveRiderPersonKey()] || riderStatesByPerson.insured;
}

function resetRiderStates() {
  Object.values(riderStatesByPerson).forEach((state) => {
    state.activeCode = "R21";
    state.selections = {};
    state.hideStbhControls = false;
    state.occupationNotice = "";
  });
}

function getCurrentInputContext(personKey = getActiveRiderPersonKey()) {
  const isPolicyOwner = policyOwnerMode === "different" && personKey === "policyOwner";
  const person = isPolicyOwner ? getPolicyOwnerInput() : getInsuredPersonInput();
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  return {
    age: person.age,
    gender: person.gender,
    occupationGroup: getOccupationGroupNumber(person.occupationGroup || "1"),
    paymentMode: document.getElementById("paymentMode")?.value || "yearly",
    mainSumAssured: moneyValue("deathSumAssured"),
    mainAnnualPremium: moneyValue("annualPremium"),
    premiumPaymentYears: numberValue("premiumPaymentYears"),
    illustrationYears: numberValue("illustrationYears"),
    relation: isPolicyOwner ? "POLICY_HOLDER" : "MAIN_INSURED",
    fullName: person.name || "",
    personKey,
    personLabel: isPolicyOwner ? "BMBH" : "N\u0110BH"
  };
}

function getR24AvailableTerms(context = getCurrentInputContext()) {
  if (context.age === null) return [];
  const rates = R24_RATE_TABLE[getGenderKey(context.gender)]?.[context.age] || {};
  const maxByAge = Math.max(0, 70 - context.age);
  const maxByMainPremiumTerm = Number(context.premiumPaymentYears) || 0;
  const maxTerm = Math.min(maxByAge, maxByMainPremiumTerm);
  return Object.keys(rates)
    .map(Number)
    .filter((term) => term >= 5 && term <= maxTerm)
    .sort((first, second) => first - second);
}

function getR24PremiumPaymentTerm(term) {
  const numericTerm = Number(term) || 0;
  if (!numericTerm) return 0;
  return Math.max(0, numericTerm - (numericTerm < 10 ? 1 : 3));
}

function normalizeR24Term(selection, context = getCurrentInputContext()) {
  if (!selection || selection.code !== "R24") return selection;
  const allowedTerms = getR24AvailableTerms(context);
  if (!allowedTerms.length) return selection;
  if (!allowedTerms.includes(Number(selection.term))) {
    selection.term = allowedTerms.includes(10) ? 10 : allowedTerms[allowedTerms.length - 1];
  }
  return selection;
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
    list.innerHTML = `<div class="occupation-empty">KhÃ´ng tÃ¬m tháº¥y nghá» phÃ¹ há»£p</div>`;
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

function setPolicyOwnerOccupationGroup(group) {
  const select = document.getElementById("policyOwnerOccupationGroup");
  if (!select) return;
  select.value = String(group || DEFAULT_JOB_GROUP);
}

function setPolicyOwnerOccupationNote(message = "", isError = false) {
  const note = document.getElementById("policyOwnerOccupationNote");
  if (!note) return;
  note.textContent = message;
  note.classList.toggle("is-error", Boolean(isError));
}

function updatePolicyOwnerOccupationSuggestionPosition() {
  const list = document.getElementById("policyOwnerOccupationSuggestions");
  const input = document.getElementById("policyOwnerOccupation");
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

function hidePolicyOwnerOccupationSuggestions() {
  const list = document.getElementById("policyOwnerOccupationSuggestions");
  const input = document.getElementById("policyOwnerOccupation");
  if (list) list.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
}

function selectPolicyOwnerOccupationJob(job) {
  const input = document.getElementById("policyOwnerOccupation");
  if (!job || !input) return;
  input.value = job.job;
  setPolicyOwnerOccupationGroup(job.group);
  setPolicyOwnerOccupationNote("");
  hidePolicyOwnerOccupationSuggestions();
  validatePolicyOwnerFields({ showMessage: true });
  updateSummaryExportAvailability();
}

function renderPolicyOwnerOccupationSuggestions(items) {
  const list = document.getElementById("policyOwnerOccupationSuggestions");
  const input = document.getElementById("policyOwnerOccupation");
  if (!list || !input) return;

  if (!items.length) {
    list.innerHTML = `<div class="occupation-empty">KhÃ´ng tÃ¬m tháº¥y nghá» phÃ¹ há»£p</div>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    updatePolicyOwnerOccupationSuggestionPosition();
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <button class="occupation-option" type="button" role="option" data-policy-owner-occupation-index="${index}">
      <span>${item.job}</span>
      <strong>${item.groupLabel}</strong>
    </button>
  `).join("");
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
  updatePolicyOwnerOccupationSuggestionPosition();

  list.querySelectorAll("[data-policy-owner-occupation-index]").forEach((button) => {
    button.addEventListener("click", () => {
      selectPolicyOwnerOccupationJob(items[Number(button.dataset.policyOwnerOccupationIndex)]);
    });
  });
}

function handlePolicyOwnerOccupationInput() {
  const input = document.getElementById("policyOwnerOccupation");
  if (!input) return;
  const text = input.value.trim();
  const exact = findExactOccupationJob(text);

  if (exact) {
    setPolicyOwnerOccupationGroup(exact.group);
    setPolicyOwnerOccupationNote("");
  } else {
    setPolicyOwnerOccupationGroup(DEFAULT_JOB_GROUP);
    setPolicyOwnerOccupationNote(
      text ? "Vui lÃ²ng chá»n nghá» trong danh sÃ¡ch gá»£i Ã½ Ä‘á»ƒ xÃ¡c Ä‘á»‹nh nhÃ³m nghá»." : "",
      Boolean(text)
    );
  }

  renderPolicyOwnerOccupationSuggestions(filterJobs(text));
  validatePolicyOwnerFields({ showMessage: true });
  renderRiderUI();
  updateSummaryExportAvailability();
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
      text ? "Vui lÃ²ng chá»n nghá» trong danh sÃ¡ch gá»£i Ã½ Ä‘á»ƒ xÃ¡c Ä‘á»‹nh nhÃ³m nghá»." : "",
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
    r26Plan: "VÃ ng",
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
  if (selection.code === "R24") {
    normalizeR24Term(selection);
  }
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
  const riderState = getActiveRiderState();
  if (!riderState.selections[code]) {
    riderState.selections[code] = createDefaultRiderSelection(code);
  }
  return normalizeRiderSelection(riderState.selections[code]);
}

function applyOccupationRulesToRiderState(context = getCurrentInputContext()) {
  const riderState = getActiveRiderState();
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
  if (benefitType === "maternity" && (gender !== "Ná»¯" || age < 18 || age > 45)) return null;
  const planIndex = R26_PLANS.indexOf(plan);
  const rows = R26_RATE_TABLE[benefitType] || [];
  const row = rows.find(([min, max]) => age >= min && age <= max);
  if (!row || planIndex < 0) return null;
  return row[2][planIndex] || null;
}

function getR26AllowedBenefits(plan) {
  return R26_PLAN_BENEFITS[plan] || R26_PLAN_BENEFITS["VÃ ng"];
}

function normalizeR26Selection(selection) {
  const allowedBenefits = getR26AllowedBenefits(selection.r26Plan);
  const selectedBenefits = (selection.r26Benefits || []).filter((benefit) => allowedBenefits.includes(benefit));
  selection.r26Benefits = selectedBenefits.length ? selectedBenefits : [allowedBenefits[0]];
}

function calculateR26Premium(selection, context) {
  if (context.age === null) return { premium: 0, annualPremium: 0, error: "ChÆ°a nháº­p ngÃ y sinh" };
  normalizeR26Selection(selection);
  const benefits = selection.r26Benefits || [];
  let annualPremium = 0;
  const errors = [];

  benefits.forEach((benefit) => {
    const rate = getR26Rate(context.age, context.gender, selection.r26Plan, benefit);
    if (!rate) {
      errors.push(`${R26_BENEFIT_LABELS[benefit]} khÃ´ng Ã¡p dá»¥ng`);
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
  if (!ageLimit) return { allowed: false, min: 100000, allowedMax: 0, reason: "Tuá»•i khÃ´ng náº±m trong Ä‘á»™ tuá»•i tham gia R29." };

  const allowedMax = Math.min(
    ageLimit.maxPerPolicy,
    context.mainSumAssured * R29_MAIN_SUM_RATIO
  );

  return {
    allowed: allowedMax >= ageLimit.minAmount,
    min: ageLimit.minAmount,
    allowedMax: Math.floor(allowedMax / 100000) * 100000,
    reason: allowedMax < ageLimit.minAmount ? "Má»©c tá»‘i Ä‘a tháº¥p hÆ¡n má»©c tá»‘i thiá»ƒu 100.000 Ä‘á»“ng." : ""
  };
}

function calculateRiderPremium(code, selection, context) {
  if (!selection.enabled) return { premium: 0, annualPremium: 0, error: "" };
  if (context.age === null) return { premium: 0, annualPremium: 0, error: "ChÆ°a nháº­p ngÃ y sinh" };
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
    if (!rate) return { premium: 0, annualPremium: 0, error: "R23 chá»‰ Ã¡p dá»¥ng tá»« 0 Ä‘áº¿n 69 tuá»•i." };
    const adjustedRate = rate * (OCCUPATION_FACTOR[context.occupationGroup] || 1);
    return { premium: calculateRatePremium(adjustedRate, selection.sumInsured, context.paymentMode), annualPremium: calculateRatePremium(adjustedRate, selection.sumInsured, "yearly"), error: "" };
  }

  if (code === "R24") {
    normalizeR24Term(selection, context);
    const allowedTerms = getR24AvailableTerms(context);
    if (!allowedTerms.length) {
      return { premium: 0, annualPremium: 0, error: "R24 chÃ†Â°a cÃƒÂ³ thÃ¡Â»Âi hÃ¡ÂºÂ¡n bÃ¡ÂºÂ£o hiÃ¡Â»Æ’m hÃ¡Â»Â£p lÃ¡Â»â€¡ theo tuÃ¡Â»â€¢i vÃƒÂ  thÃ¡Â»Âi hÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ³ng phÃƒÂ­ SPC." };
    }
    if (!allowedTerms.includes(Number(selection.term))) {
      return { premium: 0, annualPremium: 0, error: "ThÃ¡Â»Âi hÃ¡ÂºÂ¡n R24 khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡ theo tuÃ¡Â»â€¢i vÃƒÂ  thÃ¡Â»Âi hÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ³ng phÃƒÂ­ SPC." };
    }
    const rates = R24_RATE_TABLE[getGenderKey(context.gender)]?.[context.age];
    const rate = rates?.[selection.term];
    if (!rate) return { premium: 0, annualPremium: 0, error: "ChÆ°a cÃ³ biá»ƒu phÃ­ R24 cho tuá»•i/thá»i háº¡n nÃ y." };
    const annualPremium = Math.round(rate * (context.mainAnnualPremium / 1000000));
    return { premium: Math.round(annualPremium * PAYMENT_MODE_FACTOR[context.paymentMode]), annualPremium, error: "" };
  }

  if (code === "R21" || code === "R25") {
    const table = code === "R21" ? R21_RATE_TABLE[context.age] : R25_RATE_TABLE[context.age];
    if (!table) {
      const message = code === "R21"
        ? "ChÆ°a cÃ³ tá»· lá»‡ R21 cho tuá»•i nÃ y trong file cáº¥u hÃ¬nh."
        : "R25 chá»‰ há»— trá»£ Ä‘á»™ tuá»•i tá»« 0 Ä‘áº¿n 74.";
      return { premium: 0, annualPremium: 0, error: message };
    }
    const rate = table[getGenderKey(context.gender)];
    return { premium: calculateRatePremium(rate, selection.sumInsured, context.paymentMode), annualPremium: calculateRatePremium(rate, selection.sumInsured, "yearly"), error: "" };
  }

  if (code === "R26") return calculateR26Premium(selection, context);

  if (code === "R29") {
    const rate = getR29Rate(context.age, context.gender);
    if (!rate) return { premium: 0, annualPremium: 0, error: "R29 chá»‰ Ã¡p dá»¥ng tá»« 0 Ä‘áº¿n 69 tuá»•i." };
    const annualPremium = calculateRatePremium(rate, selection.sumInsured, "yearly");
    return { premium: calculateRatePremium(rate, selection.sumInsured, context.paymentMode), annualPremium, error: "" };
  }

  return { premium: 0, annualPremium: 0, error: "ChÆ°a cáº¥u hÃ¬nh sáº£n pháº©m" };
}

function getOccupationTotalStbhError(context) {
  if (getOccupationGroupNumber(context.occupationGroup) < 5) return "";
  const riderState = getActiveRiderState();

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
    ? "Tá»•ng STBH cá»§a má»—i NÄBH nhÃ³m nghá» 5-6 tá»‘i Ä‘a 2.000.000.000 Ä‘á»“ng."
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
  return value ? formatBenefitMoney(value, suffix) : "KhÃ´ng Ã¡p dá»¥ng";
}

function getMainAnnualPremiumBenefitText(context) {
  return context.mainAnnualPremium
    ? formatBenefitMoney(context.mainAnnualPremium, "/nÄƒm")
    : "Theo phÃ­ báº£o hiá»ƒm Ä‘á»‹nh ká»³ cá»§a sáº£n pháº©m chÃ­nh";
}

function buildR21BenefitRows(stbh) {
  return [
    spbkBenefitRow("Ung thÆ° giai Ä‘oáº¡n Ä‘áº§u", `25% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.25, 500000000))}`, "Tá»‘i Ä‘a 500.000.000 Ä‘á»“ng; trá»« khoáº£n ná»£ náº¿u cÃ³"),
    spbkBenefitRow("Ung thÆ° giai Ä‘oáº¡n cuá»‘i", `100% STBH = ${formatBenefitMoney(stbh)}`, "Trá»« quyá»n lá»£i ung thÆ° giai Ä‘oáº¡n Ä‘áº§u Ä‘Ã£ chi tráº£ náº¿u cÃ³"),
    spbkBenefitRow("Äá»™t quá»µ", `100% STBH = ${formatBenefitMoney(stbh)}`, "Trá»« quyá»n lá»£i ung thÆ° giai Ä‘oáº¡n Ä‘áº§u Ä‘Ã£ chi tráº£ náº¿u cÃ³"),
    spbkBenefitRow("Nhá»“i mÃ¡u cÆ¡ tim", `100% STBH = ${formatBenefitMoney(stbh)}`, "Tá»•ng chi tráº£ tá»‘i Ä‘a toÃ n bá»™ R21 lÃ  100% STBH")
  ];
}

function buildR22BenefitRows(stbh) {
  const rows = [
    ["Máº¯t", "Máº¥t hoÃ n toÃ n vÃ  khÃ´ng thá»ƒ phá»¥c há»“i chá»©c nÄƒng nhÃ¬n cá»§a 01 máº¯t, bao gá»“m máº¥t hoÃ n toÃ n máº¯t hoáº·c mÃ¹ hoÃ n toÃ n", 0.55],
    ["Tai", "Máº¥t hoÃ n toÃ n vÃ  khÃ´ng thá»ƒ phá»¥c há»“i chá»©c nÄƒng nghe cá»§a 02 tai", 0.75],
    ["Tai", "Máº¥t hoÃ n toÃ n vÃ  khÃ´ng thá»ƒ phá»¥c há»“i chá»©c nÄƒng nghe cá»§a 01 tai", 0.20],
    ["Tai", "Máº¥t toÃ n bá»™ 02 loa tai", 0.15],
    ["Tai", "Máº¥t toÃ n bá»™ 01 loa tai", 0.05],
    ["Chi trÃªn", "ThÃ¡o khá»›p cá»• tay", 0.50],
    ["Chi trÃªn", "Cáº¯t cá»¥t cáº³ng tay", 0.55],
    ["Chi trÃªn", "ThÃ¡o khá»›p khuá»·u tay", 0.60],
    ["Chi trÃªn", "Cáº¯t cá»¥t cÃ¡nh tay", 0.65],
    ["Chi trÃªn", "ThÃ¡o khá»›p vai", 0.70],
    ["NgÃ³n tay cÃ¡i", "Máº¥t 01 Ä‘á»‘t ngÃ³n tay cÃ¡i", 0.08],
    ["NgÃ³n tay cÃ¡i", "Máº¥t toÃ n bá»™ 02 Ä‘á»‘t ngÃ³n tay cÃ¡i", 0.20],
    ["NgÃ³n tay", "Máº¥t toÃ n bá»™ 03 Ä‘á»‘t ngÃ³n tay trá»", 0.09],
    ["NgÃ³n tay", "Máº¥t toÃ n bá»™ 03 Ä‘á»‘t ngÃ³n tay giá»¯a", 0.07],
    ["NgÃ³n tay", "Máº¥t toÃ n bá»™ 03 Ä‘á»‘t ngÃ³n tay Ã¡p Ãºt", 0.06],
    ["NgÃ³n tay", "Máº¥t toÃ n bá»™ 03 Ä‘á»‘t ngÃ³n tay Ãºt", 0.05],
    ["NgÃ³n tay", "Máº¥t 01 Ä‘á»‘t cá»§a má»—i ngÃ³n tay II, III, IV, V", 0.02],
    ["NgÃ³n tay", "Máº¥t 02 Ä‘á»‘t cá»§a má»—i ngÃ³n tay II, III, IV, V", 0.04],
    ["Chi dÆ°á»›i", "Máº¥t ná»­a bÃ n chÃ¢n", 0.35],
    ["Chi dÆ°á»›i", "ThÃ¡o khá»›p cá»• chÃ¢n", 0.45],
    ["Chi dÆ°á»›i", "Cáº¯t cá»¥t cáº³ng chÃ¢n", 0.55],
    ["Chi dÆ°á»›i", "ThÃ¡o khá»›p gá»‘i", 0.60],
    ["Chi dÆ°á»›i", "Cáº¯t cá»¥t Ä‘Ã¹i", 0.65],
    ["Chi dÆ°á»›i", "ThÃ¡o khá»›p hÃ¡ng", 0.70],
    ["NgÃ³n chÃ¢n", "Máº¥t toÃ n bá»™ ngÃ³n chÃ¢n cÃ¡i", 0.07],
    ["NgÃ³n chÃ¢n", "Máº¥t toÃ n bá»™ má»™t ngÃ³n chÃ¢n khÃ¡c, trá»« ngÃ³n chÃ¢n cÃ¡i", 0.03],
    ["KhÃ¡c", "Máº¥t hoÃ n toÃ n vÃ  vÄ©nh viá»…n tiáº¿ng nÃ³i", 0.50],
    ["KhÃ¡c", "Máº¥t hoÃ n toÃ n xÆ°Æ¡ng hÃ m dÆ°á»›i", 0.70],
    ["KhÃ¡c", "Máº¥t hoÃ n toÃ n xÆ°Æ¡ng hÃ m trÃªn", 0.80]
  ];

  return rows.map(([group, benefit, rate]) => {
    const percent = `${Math.round(rate * 100)}%`;
    return spbkBenefitRow(
      benefit,
      `${percent} STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, rate))}`,
      `${group}; tá»•ng chi tráº£ tá»‘i Ä‘a 100% STBH/nÄƒm`
    );
  });
}

function buildR23BenefitRows(stbh, context) {
  const factor = getSpbkAgeFactor(context.age);
  const ageText = factor === 1 ? "" : ` x ${Math.round(factor * 100)}% theo tuá»•i`;
  return [
    spbkBenefitRow("Tá»­ vong do tai náº¡n thÃ´ng thÆ°á»ng", `100% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, factor))}`, "Trá»« khoáº£n ná»£ náº¿u cÃ³"),
    spbkBenefitRow("Tá»­ vong do tai náº¡n hÃ ng khÃ´ng thÆ°Æ¡ng máº¡i", `200% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, 2 * factor))}`, "Ãp dá»¥ng khi lÃ  hÃ nh khÃ¡ch cÃ³ vÃ© trÃªn chuyáº¿n bay Ä‘Æ°á»£c cáº¥p phÃ©p"),
    spbkBenefitRow("ThÆ°Æ¡ng táº­t nghiÃªm trá»ng do tai náº¡n", `100% STBH${ageText} = ${formatBenefitMoney(calculateBenefitRate(stbh, factor))}`, "Chá»‰ chi tráº£ má»™t thÆ°Æ¡ng táº­t nghiÃªm trá»ng thá»a Ä‘iá»u kiá»‡n")
  ];
}

function buildR24BenefitRows(selection, context) {
  const annualPremiumText = getMainAnnualPremiumBenefitText(context);
  const term = Number(selection.term) || 0;
  const paymentTerm = getR24PremiumPaymentTerm(term);
  const projectedSupport = context.mainAnnualPremium && term ? formatBenefitMoney(context.mainAnnualPremium * term) : "Theo thá»i háº¡n há»— trá»£ Ä‘Ã£ chá»n";
  return [
    spbkBenefitRow("Há»— trá»£ Ä‘Ã³ng phÃ­ má»—i nÄƒm", annualPremiumText, "KhÃ´ng bao gá»“m phÃ­ báº£o hiá»ƒm Ä‘Ã³ng thÃªm"),
    spbkBenefitRow("GiÃ¡ trá»‹ há»— trá»£ dá»± kiáº¿n", projectedSupport, `Minh há»a theo thá»i háº¡n há»— trá»£ ${term || "-"} nÄƒm`),
    spbkBenefitRow("Thá»i Ä‘iá»ƒm báº¯t Ä‘áº§u há»— trá»£", "Tá»« ká»³ phÃ­ tiáº¿p theo sau ngÃ y tá»­ vong", "Duy trÃ¬ quyá»n lá»£i sáº£n pháº©m chÃ­nh trong thá»i gian há»— trá»£")
  ];
}

function buildR27R28BenefitRows(selection, context) {
  const annualPremiumText = getMainAnnualPremiumBenefitText(context);
  const term = Number(selection.term) || 0;
  const projectedSupport = context.mainAnnualPremium && term ? formatBenefitMoney(context.mainAnnualPremium * term) : "Theo thá»i háº¡n há»— trá»£ Ä‘Ã£ chá»n";
  return [
    spbkBenefitRow("Há»— trá»£ tÃ i chÃ­nh khi BLNT giai Ä‘oáº¡n Ä‘áº§u", annualPremiumText, "100% PBH nÄƒm; chá»‰ chi tráº£ 1 láº§n"),
    spbkBenefitRow("Há»— trá»£ tÃ i chÃ­nh khi BLNT giai Ä‘oáº¡n cuá»‘i", annualPremiumText, "100% PBH nÄƒm; trá»« khoáº£n ná»£ náº¿u cÃ³"),
    spbkBenefitRow("Há»— trá»£ Ä‘Ã³ng phÃ­ dá»± kiáº¿n", projectedSupport, `Theo thá»i háº¡n há»— trá»£ ${term || "-"} nÄƒm cÃ²n láº¡i`)
  ];
}

function buildR25BenefitRows(stbh) {
  return [
    spbkBenefitRow("BLNT giai Ä‘oáº¡n Ä‘áº§u", `25% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.25, 500000000))}`, "Tá»‘i Ä‘a 500.000.000 Ä‘á»“ng/bá»‡nh; tá»‘i Ä‘a 2 bá»‡nh thuá»™c 2 nhÃ³m khÃ¡c nhau"),
    spbkBenefitRow("BLNT giai Ä‘oáº¡n cuá»‘i", `100% STBH = ${formatBenefitMoney(stbh)}`, "Chá»‰ chi tráº£ má»™t láº§n; trá»« quyá»n lá»£i Ä‘Ã£ chi tráº£ náº¿u cÃ³"),
    spbkBenefitRow("BLNT tráº» em giai Ä‘oáº¡n cuá»‘i", `100% STBH = ${formatBenefitMoney(stbh)}`, "Ãp dá»¥ng cho NÄBH tá»« 0 Ä‘áº¿n 17 tuá»•i táº¡i thá»i Ä‘iá»ƒm cháº©n Ä‘oÃ¡n"),
    spbkBenefitRow("BLNT theo giá»›i tÃ­nh giai Ä‘oáº¡n cuá»‘i", `125% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 1.25))}`, "Náº¿u cÃ¹ng lÃºc nhiá»u bá»‡nh, chi tráº£ bá»‡nh cÃ³ sá»‘ tiá»n cao nháº¥t"),
    spbkBenefitRow("Náº±m viá»‡n Ä‘áº·c biá»‡t", `10% STBH = ${formatBenefitMoney(calculateBenefitRate(stbh, 0.10, 100000000))}`, "Tá»‘i Ä‘a 100.000.000 Ä‘á»“ng; chá»‰ chi tráº£ má»™t láº§n")
  ];
}

function buildR26BenefitRows(selection) {
  normalizeR26Selection(selection);
  const plan = R26_PLANS.includes(selection.r26Plan) ? selection.r26Plan : "VÃ ng";
  const selectedBenefits = new Set(selection.r26Benefits || []);
  const rows = [
    spbkBenefitRow("Ná»™i trÃº tá»‘i Ä‘a", formatR26Limit(plan, "inpatientAnnual", "/nÄƒm"), `Háº¡ng chÆ°Æ¡ng trÃ¬nh ${plan}`, "inpatient"),
    spbkBenefitRow("Ná»™i trÃº cÃ³ pháº«u thuáº­t", formatR26Limit(plan, "inpatientSurgery", "/Ä‘á»£t"), "Theo giá»›i háº¡n tá»«ng Ä‘á»£t Ä‘iá»u trá»‹", "inpatient"),
    spbkBenefitRow("Ná»™i trÃº khÃ´ng pháº«u thuáº­t", formatR26Limit(plan, "inpatientNoSurgery", "/Ä‘á»£t"), "Theo giá»›i háº¡n tá»«ng Ä‘á»£t Ä‘iá»u trá»‹", "inpatient"),
    spbkBenefitRow("PhÃ²ng & giÆ°á»ng", formatR26Limit(plan, "room", "/ngÃ y"), "Tá»‘i Ä‘a 60 ngÃ y/nÄƒm", "inpatient"),
    spbkBenefitRow("ICU", "Chi phÃ­ thá»±c táº¿", "Tá»‘i Ä‘a 30 ngÃ y/nÄƒm", "inpatient"),
    spbkBenefitRow("Pháº«u thuáº­t", "Chi phÃ­ thá»±c táº¿", "Trong giá»›i háº¡n ná»™i trÃº cá»§a háº¡ng chÆ°Æ¡ng trÃ¬nh", "inpatient"),
    spbkBenefitRow("Cháº¡y tháº­n Ä‘á»‹nh ká»³", formatR26Limit(plan, "dialysis", "/nÄƒm"), "Theo háº¡ng chÆ°Æ¡ng trÃ¬nh", "inpatient"),
    spbkBenefitRow("Váº­n chuyá»ƒn cáº¥p cá»©u", formatR26Limit(plan, "ambulance", "/nÄƒm"), "Theo háº¡ng chÆ°Æ¡ng trÃ¬nh", "inpatient"),
    spbkBenefitRow("Äiá»u trá»‹ trong ngÃ y Ä‘áº·c biá»‡t", formatR26Limit(plan, "specialDayTreatment", "/nÄƒm"), "Theo háº¡ng chÆ°Æ¡ng trÃ¬nh", "inpatient"),
    spbkBenefitRow("Pháº«u thuáº­t trong ngÃ y", formatR26Limit(plan, "daySurgery", "/ngÃ y"), "Theo háº¡ng chÆ°Æ¡ng trÃ¬nh", "inpatient")
  ];

  if (selectedBenefits.has("outpatient")) {
    rows.push(
      spbkBenefitRow("Ngoáº¡i trÃº", formatR26Limit(plan, "outpatientAnnual", "/nÄƒm"), "Hiá»ƒn thá»‹ vÃ¬ Ä‘Ã£ chá»n quyá»n lá»£i Ngoáº¡i trÃº", "outpatient"),
      spbkBenefitRow("Ngoáº¡i trÃº má»—i láº§n khÃ¡m/Ä‘iá»u trá»‹", formatR26Limit(plan, "outpatientVisit", "/láº§n"), "Tá»‘i Ä‘a 10 láº§n/nÄƒm", "outpatient"),
      spbkBenefitRow("Váº­t lÃ½ trá»‹ liá»‡u", formatR26Limit(plan, "physiotherapy", "/nÄƒm"), "Tá»‘i Ä‘a 1 Ä‘á»£t/nÄƒm", "outpatient")
    );
  }

  if (selectedBenefits.has("dental")) {
    rows.push(
      spbkBenefitRow("Nha khoa", formatR26Limit(plan, "dentalAnnual", "/nÄƒm"), "Hiá»ƒn thá»‹ vÃ¬ Ä‘Ã£ chá»n quyá»n lá»£i Nha khoa", "dental"),
      spbkBenefitRow("Äiá»u trá»‹ nha khoa", formatR26Limit(plan, "dentalTreatment", "/láº§n"), "Theo giá»›i háº¡n tá»«ng láº§n Ä‘iá»u trá»‹", "dental"),
      spbkBenefitRow("Láº¥y cao rÄƒng", formatR26Limit(plan, "dentalScaling", "/láº§n"), "Tá»‘i Ä‘a 1 láº§n/nÄƒm", "dental")
    );
  }

  if (selectedBenefits.has("maternity")) {
    rows.push(
      spbkBenefitRow("Thai sáº£n", formatR26Limit(plan, "maternityAnnual", "/nÄƒm"), "Hiá»ƒn thá»‹ vÃ¬ Ä‘Ã£ chá»n quyá»n lá»£i Thai sáº£n", "maternity"),
      spbkBenefitRow("Sinh thÆ°á»ng", formatR26Limit(plan, "normalDelivery", "/nÄƒm"), "Trong giá»›i háº¡n thai sáº£n", "maternity"),
      spbkBenefitRow("Sinh má»• / biáº¿n chá»©ng thai sáº£n", formatR26Limit(plan, "cSection", "/nÄƒm"), "Trong giá»›i háº¡n thai sáº£n", "maternity"),
      spbkBenefitRow("PhÃ²ng & giÆ°á»ng thai sáº£n", formatR26Limit(plan, "maternityRoom", "/ngÃ y"), "Tá»‘i Ä‘a 30 ngÃ y/nÄƒm", "maternity"),
      spbkBenefitRow("ICU thai sáº£n", "Chi phÃ­ thá»±c táº¿", "Tá»‘i Ä‘a 15 ngÃ y/nÄƒm", "maternity")
    );
  }

  return rows;
}

function buildR29BenefitRows(stbh) {
  const ambulance = calculateBenefitMultiple(stbh, 2, 1000000);
  return [
    spbkBenefitRow("Viá»‡n phÃ­ cÆ¡ báº£n", `1 x STBH = ${formatBenefitMoney(stbh, "/ngÃ y")}`, "Tá»‘i Ä‘a 50 ngÃ y/nÄƒm; tá»‘i Ä‘a 3 láº§n náº±m viá»‡n/nÄƒm"),
    spbkBenefitRow("ICU", `2 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 2), "/ngÃ y")}`, "Tá»‘i Ä‘a 30 ngÃ y/nÄƒm; 300 ngÃ y toÃ n thá»i háº¡n"),
    spbkBenefitRow("Pháº«u thuáº­t cÆ¡ báº£n", `5 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 5), "/láº§n")}`, "Tá»‘i Ä‘a 2 láº§n/nÄƒm; 10 láº§n toÃ n thá»i háº¡n"),
    spbkBenefitRow("Pháº«u thuáº­t Ä‘áº·c biá»‡t", `10 x STBH = ${formatBenefitMoney(calculateBenefitMultiple(stbh, 10), "/láº§n")}`, "Má»—i ca chá»‰ chi tráº£ má»™t quyá»n lá»£i pháº«u thuáº­t"),
    spbkBenefitRow("Váº­n chuyá»ƒn cáº¥p cá»©u", `2 x STBH = ${formatBenefitMoney(ambulance, "/láº§n")}`, "Tá»‘i Ä‘a 1.000.000 Ä‘á»“ng/láº§n; tá»‘i Ä‘a 2 láº§n/nÄƒm")
  ];
}

function calculateSpbkBenefits(code, currentValue) {
  const product = SPBK_PRODUCTS[code];
  if (!product) {
    return { code, title: "SPBK", subtitle: "", rows: [], message: "KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u sáº£n pháº©m bÃ¡n kÃ¨m." };
  }

  const context = getCurrentInputContext();
  const selection = getRiderSelection(code);
  const stbh = Number(currentValue?.sumInsured ?? currentValue ?? selection.sumInsured) || 0;
  const needsStbh = Boolean(product.maxSumInsured);
  const r26Plan = currentValue?.r26Plan || selection.r26Plan;
  const r26Benefits = currentValue?.r26Benefits || selection.r26Benefits;

  if (needsStbh && !stbh) {
    return { code, title: product.name, subtitle: `${product.name} - chÆ°a chá»n STBH`, rows: [], message: SPBK_BENEFIT_POPUP_EMPTY_MESSAGE };
  }

  if (code === "R26") {
    const r26Selection = { ...selection, r26Plan, r26Benefits: [...(r26Benefits || [])] };
    return {
      code,
      title: product.name,
      subtitle: `${product.name} - háº¡ng ${r26Selection.r26Plan}`,
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
      ? `${product.name} - STBH ${formatBenefitMoney(stbh, "/ngÃ y")}`
      : `${product.name} - STBH ${formatBenefitMoney(stbh)}`,
    rows: builders[code] ? builders[code]() : [],
    message: builders[code] ? "" : "ChÆ°a cÃ³ báº£ng quyá»n lá»£i chi tiáº¿t cho sáº£n pháº©m nÃ y."
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
    <div class="spbk-benefit-table" role="table" aria-label="Chi tiáº¿t quyá»n lá»£i ${detail.code}">
      <div class="spbk-benefit-row spbk-benefit-table-head" role="row">
        <div role="columnheader">Quyá»n lá»£i</div>
        <div role="columnheader">Má»©c chi tráº£</div>
        <div role="columnheader">Ghi chÃº</div>
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
  return `${formatVND(value || 0)} \u0111\u1ed3ng`;
}

let policyOwnerMode = "same";
let activePersonFormTab = "insured";

function getInsuredPersonInput() {
  const dateOfBirth = document.getElementById("dateOfBirth")?.value || "";
  const age = dateOfBirth && parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : null;
  return {
    name: document.getElementById("fullName")?.value.trim() || "",
    dateOfBirth,
    age,
    gender: document.getElementById("gender")?.value || "Nam",
    occupation: document.getElementById("occupationJob")?.value.trim() || "",
    occupationGroup: document.getElementById("occupationGroup")?.value || "1"
  };
}

function getPolicyOwnerInput() {
  const insured = getInsuredPersonInput();
  if (policyOwnerMode !== "different") {
    return {
      ...insured,
      phone: "",
      sameAsInsured: true
    };
  }

  const dateOfBirth = document.getElementById("policyOwnerDateOfBirth")?.value || "";
  const age = dateOfBirth && parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : null;
  return {
    name: document.getElementById("policyOwnerName")?.value.trim() || "",
    dateOfBirth,
    age,
    gender: document.getElementById("policyOwnerGender")?.value || "Nam",
    occupation: document.getElementById("policyOwnerOccupation")?.value.trim() || "",
    occupationGroup: document.getElementById("policyOwnerOccupationGroup")?.value || "1",
    sameAsInsured: false
  };
}

function validatePolicyOwnerFields({ showMessage = false } = {}) {
  const messages = document.querySelectorAll(".policy-owner-validation");
  const nameInput = document.getElementById("policyOwnerName");
  if (!nameInput) return true;

  nameInput.setCustomValidity("");
  if (policyOwnerMode !== "different") {
    messages.forEach((message) => {
      message.textContent = "";
    });
    normalizePolicyOwnerRelationText();
    return true;
  }

  const owner = getPolicyOwnerInput();
  const missing = [];
  if (!owner.name) missing.push("h\u1ecd t\u00ean");
  if (!owner.dateOfBirth || !parseDateInput(owner.dateOfBirth)) missing.push("ng\u00e0y sinh");
  if (!owner.gender) missing.push("gi\u1edbi t\u00ednh");

  if (!missing.length) {
    messages.forEach((message) => {
      message.textContent = "";
    });
    normalizePolicyOwnerRelationText();
    return true;
  }

  const validationMessage = `Vui l\u00f2ng nh\u1eadp ${missing.join(", ")} c\u1ee7a BMBH.`;
  nameInput.setCustomValidity(validationMessage);
  messages.forEach((message) => {
    message.textContent = showMessage ? validationMessage : "";
  });
  normalizePolicyOwnerRelationText();
  return false;
}

function updatePolicyOwnerAgePreview() {
  const input = document.getElementById("policyOwnerDateOfBirth");
  const output = document.getElementById("policyOwnerAge");
  if (!input || !output) return;
  output.value = input.value && parseDateInput(input.value) ? calculateAge(input.value) : "-";
}

function syncPolicyOwnerGenderButtons() {
  const genderValue = document.getElementById("policyOwnerGender")?.value || "Ná»¯";
  document.querySelectorAll("[data-policy-owner-gender-value]").forEach((button) => {
    const isActive = button.dataset.policyOwnerGenderValue === genderValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setDefaultPolicyOwnerGender() {
  const genderSelect = document.getElementById("policyOwnerGender");
  if (!genderSelect) return;
  genderSelect.value = "Ná»¯";
  document.querySelectorAll("[data-policy-owner-gender-value]").forEach((button) => {
    const isFemale = button.dataset.policyOwnerGenderValue === "Ná»¯";
    button.classList.toggle("active", isFemale);
    button.setAttribute("aria-pressed", String(isFemale));
  });
}

function getPolicyOwnerGenderButtons() {
  return Array.from(document.querySelectorAll("[data-policy-owner-gender-value]"));
}

function syncPolicyOwnerGenderButtons() {
  const genderSelect = document.getElementById("policyOwnerGender");
  const selectedIndex = genderSelect?.selectedIndex ?? 1;
  getPolicyOwnerGenderButtons().forEach((button, index) => {
    const isActive = index === selectedIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.style.background = isActive ? "#004b7a" : "#fff";
    button.style.borderColor = isActive ? "#004b7a" : "#b7cfff";
    button.style.color = isActive ? "#fff" : "#004b7a";
    button.style.boxShadow = isActive ? "0 3px 9px rgba(0, 75, 147, 0.22)" : "none";
    button.querySelectorAll("span").forEach((span) => {
      span.style.color = isActive ? "#fff" : "#004b7a";
    });
  });
}

function setDefaultPolicyOwnerGender() {
  const genderSelect = document.getElementById("policyOwnerGender");
  if (genderSelect) genderSelect.selectedIndex = 1;
  syncPolicyOwnerGenderButtons();
}

function setActivePersonFormTab(tab) {
  activePersonFormTab = tab === "policyOwner" ? "policyOwner" : "insured";
  document.querySelectorAll("[data-person-form-tab]").forEach((button) => {
    const isActive = button.dataset.personFormTab === activePersonFormTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  const insuredFields = document.getElementById("insuredPersonFields");
  const ownerFields = document.getElementById("policyOwnerFields");
  document.body.classList.toggle("policy-owner-form-active", activePersonFormTab === "policyOwner" && policyOwnerMode === "different");
  if (insuredFields) {
    insuredFields.hidden = activePersonFormTab !== "insured";
    insuredFields.classList.toggle("active", activePersonFormTab === "insured");
  }
  if (ownerFields) {
    ownerFields.hidden = activePersonFormTab !== "policyOwner";
    ownerFields.classList.toggle("active", activePersonFormTab === "policyOwner");
  }
  if (activePersonFormTab === "policyOwner") {
    setDefaultPolicyOwnerGender();
  }
  renderRiderUI();
  normalizePolicyOwnerRelationText();
}

function setPolicyOwnerMode(mode) {
  policyOwnerMode = mode === "different" ? "different" : "same";
  document.querySelectorAll("[data-policy-owner-mode]").forEach((button) => {
    const isActive = button.dataset.policyOwnerMode === policyOwnerMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll(".person-form-tabs").forEach((tabs) => {
    tabs.hidden = policyOwnerMode !== "different";
  });
  setActivePersonFormTab(policyOwnerMode === "different" ? activePersonFormTab : "insured");
  validatePolicyOwnerFields();
  updateSummaryExportAvailability();
  renderRiderUI();
  normalizePolicyOwnerRelationText();
}

function readInput() {
  selectedMainProduct = getSelectedMainProduct();
  updateDisabilitySumAssured();
  const insuredPerson = getInsuredPersonInput();
  const policyOwner = getPolicyOwnerInput();
  return {
    mainProduct: selectedMainProduct,
    fullName: insuredPerson.name,
    dateOfBirth: insuredPerson.dateOfBirth,
    gender: insuredPerson.gender,
    insuredPerson,
    policyOwner,
    isPolicyOwnerSameAsInsured: policyOwnerMode !== "different",
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
          <td><strong>NÄƒm ${row.policyYear}</strong><span>/ Tuá»•i ${row.age}</span></td>
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
  normalizeVisibleText(resultsSection);
}

function renderPendingResults(message = "Nháº­p ngÃ y sinh Ä‘á»ƒ xem giÃ¡ trá»‹ tÃ i khoáº£n hoÃ n láº¡i.") {
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
  normalizeVisibleText(resultsSection);
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
    button.style.setProperty("background", isActive ? "#004b7a" : "#fff", "important");
    button.style.setProperty("color", isActive ? "#fff" : "#004b7a", "important");
    button.style.setProperty("opacity", "1", "important");
  });
  document.getElementById("mainTab").classList.toggle("active", tabName === "main");
  document.getElementById("ridersTab").classList.toggle("active", tabName === "riders");
  if (tabName === "riders") renderRiderUI();
  if (tabName === "main") normalizeMainIllustrationText();
}

function formatShortMoney(value) {
  if (value >= 1000000000) return `${value / 1000000000} tá»·`;
  if (value >= 1000000) return `${value / 1000000} triá»‡u`;
  return formatVND(value);
}

function formatCompactCurrency(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000000000 && amount % 1000000000 === 0) return `${amount / 1000000000} tá»· Ä‘á»“ng`;
  if (amount >= 1000000 && amount % 1000000 === 0) return `${amount / 1000000} triá»‡u Ä‘á»“ng`;
  return formatCurrency(amount);
}

function renderRiderCustomerCard() {
  const context = getCurrentInputContext();
  document.getElementById("riderCustomerName").textContent = context.fullName || "-";
  document.getElementById("riderCustomerMeta").textContent =
    context.age === null ? `${context.gender}, - tuá»•i` : `${context.gender}, ${context.age} tuá»•i`;
  document.getElementById("riderMainSum").textContent = formatCompactCurrency(context.mainSumAssured);
  document.getElementById("riderMainPremium").textContent = formatCompactCurrency(context.mainAnnualPremium);
}

function isR24DisabledByPersonTab() {
  return !(policyOwnerMode === "different" && activePersonFormTab === "policyOwner");
}

function renderRiderProductButtons() {
  const context = getCurrentInputContext();
  const riderState = getActiveRiderState();
  const container = document.getElementById("riderProductButtons");
  container.innerHTML = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => {
      const product = SPBK_PRODUCTS[code];
      const selection = riderState.selections[code];
      const occupationRule = applyOccupationGroupRules(code, context.occupationGroup, product.maxSumInsured || null);
      const result = selection ? calculateRiderPremium(code, selection, context) : { error: "" };
      const disabledByPersonTab = code === "R24" && isR24DisabledByPersonTab();
      const statusText = !product.isConfigured
        ? "ChÆ°a cáº¥u hÃ¬nh"
        : !occupationRule.allowed
          ? ""
          : result.error
              ? "Cáº§n kiá»ƒm tra"
              : "Sáºµn sÃ ng";
      return `
        <button
          class="rider-pill ${riderState.activeCode === code ? "active" : ""} ${selection?.selected ? "selected" : ""} ${disabledByPersonTab ? "is-person-disabled" : ""}"
          type="button"
          data-rider-code="${code}"
          ${product.isConfigured && occupationRule.allowed && !disabledByPersonTab ? "" : "disabled"}
        >
          <span>${selection?.selected ? "âœ“ " : ""}${code}</span>
          <small>${statusText}</small>
        </button>
        ${code === "R24" ? `
        <button
          class="rider-pill spbk-stbh-toggle ${riderState.hideStbhControls ? "is-hidden" : ""}"
          type="button"
          data-toggle-spbk-stbh
          aria-pressed="${riderState.hideStbhControls}"
        >
          <span>${riderState.hideStbhControls ? "HIá»†N" : "áº¨N"}</span>
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
      if (code === "R24" && isR24DisabledByPersonTab()) return;
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
  const rangeText = range ? `STBH pháº£i náº±m trong khoáº£ng ${formatAddonRange(range)}` : "";
  const isInvalid = range && !range.valid;
  const quickAmounts = product.quickAmounts.filter((amount) => amount >= sliderMin && amount <= sliderMax);

  return `
    <div class="amount-controls">
      <div class="stepper">
        <button id="decreaseRiderAmount" type="button" aria-label="Giáº£m STBH SPBK">
          <img src="icons/minus.svg" alt="" aria-hidden="true" />
        </button>
        <input id="riderAmountInput" class="money-input" type="text" inputmode="numeric" value="${formatCommaNumber(selection.sumInsured)}" />
        <button id="increaseRiderAmount" type="button" aria-label="TÄƒng STBH SPBK">
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
        <button class="terms-close" type="button" data-close-terms aria-label="ÄÃ³ng Ä‘iá»u khoáº£n">Ã—</button>
      </header>
      <div class="terms-toolbar">
        <a id="termsOpenLink" class="terms-link" target="_blank" rel="noopener">Má»Ÿ PDF</a>
        <a id="termsDownloadLink" class="terms-link secondary" download>Táº£i PDF</a>
      </div>
      <div class="terms-reader">
        <iframe id="termsPdfFrame" title="Äiá»u khoáº£n sáº£n pháº©m"></iframe>
        <div class="terms-fallback">
          <strong>KhÃ´ng hiá»ƒn thá»‹ Ä‘Æ°á»£c PDF?</strong>
          <span>HÃ£y dÃ¹ng nÃºt Má»Ÿ PDF á»Ÿ trÃªn Ä‘á»ƒ xem báº±ng trÃ¬nh Ä‘á»c cá»§a trÃ¬nh duyá»‡t.</span>
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
  const product = SPBK_PRODUCTS[code];
  const pdfUrl = getRiderTermsPdfUrl(code);
  const modal = ensureRiderTermsModal();
  const frame = modal.querySelector("#termsPdfFrame");
  const codeLabel = modal.querySelector("#termsModalCode");
  const title = modal.querySelector("#termsModalTitle");
  const subtitle = modal.querySelector("#termsModalSubtitle");
  const openLink = modal.querySelector("#termsOpenLink");
  const downloadLink = modal.querySelector("#termsDownloadLink");

  if (codeLabel) codeLabel.textContent = code;
  if (title) title.textContent = product.name || "Äiá»u khoáº£n sáº£n pháº©m";
  if (subtitle) subtitle.textContent = "Quy táº¯c, Ä‘iá»u khoáº£n vÃ  tÃ³m táº¯t Ä‘iá»u khoáº£n";
  if (openLink) openLink.href = pdfUrl;
  if (downloadLink) {
    downloadLink.href = pdfUrl;
    downloadLink.setAttribute("download", `${code}.pdf`);
  }
  if (frame) frame.src = pdfUrl;

  modal.hidden = false;
  document.body.classList.add("terms-open");
  modal.querySelector(".terms-close")?.focus();
}

function openTermsModal({ code, title, subtitle, pdfUrl, downloadName }) {
  if (!pdfUrl) return;
  const modal = ensureRiderTermsModal();
  const frame = modal.querySelector("#termsPdfFrame");
  const codeLabel = modal.querySelector("#termsModalCode");
  const titleElement = modal.querySelector("#termsModalTitle");
  const subtitleElement = modal.querySelector("#termsModalSubtitle");
  const openLink = modal.querySelector("#termsOpenLink");
  const downloadLink = modal.querySelector("#termsDownloadLink");

  if (codeLabel) codeLabel.textContent = code || "";
  if (titleElement) titleElement.textContent = title || "Äiá»u khoáº£n sáº£n pháº©m";
  if (subtitleElement) subtitleElement.textContent = subtitle || "Quy táº¯c, Ä‘iá»u khoáº£n vÃ  tÃ³m táº¯t Ä‘iá»u khoáº£n";
  if (openLink) openLink.href = pdfUrl;
  if (downloadLink) {
    downloadLink.href = pdfUrl;
    downloadLink.setAttribute("download", downloadName || "dieu-khoan.pdf");
  }
  if (frame) frame.src = pdfUrl;

  modal.hidden = false;
  document.body.classList.add("terms-open");
  modal.querySelector(".terms-close")?.focus();
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
  const context = getCurrentInputContext();
  normalizeR24Term(selection, context);
  const allowedTerms = getR24AvailableTerms(context);
  const paymentTerm = getR24PremiumPaymentTerm(selection.term);
  const options = allowedTerms.map((term) => `
        <option value="${term}" ${selection.term === term ? "selected" : ""}>${term} nÄƒm</option>
      `).join("");

  return `
    <label class="compact-field">
      <span>Thá»i háº¡n báº£o hiá»ƒm R24</span>
      <select id="riderTerm">
        <option value="10" ${selection.term === 10 ? "selected" : ""}>10 nÄƒm</option>
        <option value="15" ${selection.term === 15 ? "selected" : ""}>15 nÄƒm</option>
        <option value="20" ${selection.term === 20 ? "selected" : ""}>20 nÄƒm</option>
      </select>
    </label>
  `;
}

function renderR24Controls(selection) {
  const context = getCurrentInputContext();
  normalizeR24Term(selection, context);
  const allowedTerms = getR24AvailableTerms(context);
  const paymentTerm = getR24PremiumPaymentTerm(selection.term);
  const options = allowedTerms.map((term) => `
        <option value="${term}" ${selection.term === term ? "selected" : ""}>${term} nÄƒm</option>
      `).join("");

  return `
    <label class="compact-field">
      <span>Thá»i háº¡n báº£o hiá»ƒm R24</span>
      <select id="riderTerm" ${allowedTerms.length ? "" : "disabled"}>
        ${options || `<option value="">KhÃ´ng cÃ³ thá»i háº¡n há»£p lá»‡</option>`}
      </select>
      <small class="field-note">${paymentTerm ? `Thá»i háº¡n Ä‘Ã³ng phÃ­ R24: ${paymentTerm} nÄƒm` : "Theo tuá»•i vÃ  thá»i háº¡n Ä‘Ã³ng phÃ­ SPC."}</small>
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
          <strong>ChÆ°Æ¡ng trÃ¬nh báº£o hiá»ƒm</strong>
          <span>${selection.r26Plan}</span>
        </div>
        <div class="r26-plan-options">${planControls}</div>
      </section>
      <section class="r26-benefit-panel">
        <div class="r26-control-title">
          <strong>Quyá»n lá»£i tham gia</strong>
          <span>${selection.r26Benefits.length}/${allowedBenefits.length}</span>
        </div>
        <div class="r26-benefit-grid">${benefitControls}</div>
      </section>
    </div>
  `;
}

function renderRiderDetail() {
  const context = getCurrentInputContext();
  const riderState = getActiveRiderState();
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
      ? `Quyá»n lá»£i tá»± Ä‘á»™ng: ${formatCurrency(stbhRange.readonlyValue)}`
      : "Sáº£n pháº©m nÃ y khÃ´ng dÃ¹ng STBH riÃªng.";

  detailCard.innerHTML = `
    <div class="rider-detail-head">
      <div>
        <p>${product.code}</p>
        <h3>${product.name}</h3>
      </div>
      <div class="rider-detail-actions">
        <button class="info-button benefit-button" type="button" data-open-spbk-benefits="${product.code}" title="Xem chi tiáº¿t quyá»n lá»£i báº£o vá»‡ ${product.code}" aria-label="Xem chi tiáº¿t quyá»n lá»£i báº£o vá»‡ ${product.code}">
          <span class="benefit-button-icon" aria-hidden="true"></span>
        </button>
        <button class="info-button terms-button" type="button" data-open-rider-terms="${product.code}" title="Xem Ä‘iá»u khoáº£n sáº£n pháº©m ${product.code}" aria-label="Xem Ä‘iá»u khoáº£n sáº£n pháº©m ${product.code}">
          <span class="terms-info-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="rider-value-grid">
      <div>
        <span>${product.code === "R24" || product.code === "R26" ? "CÆ¡ sá»Ÿ tÃ­nh phÃ­" : "Sá»‘ tiá»n báº£o hiá»ƒm"}</span>
        <strong id="riderDetailAmountValue">${product.maxSumInsured ? formatCurrency(selection.sumInsured) : product.code === "R24" ? formatCurrency(context.mainAnnualPremium) : selection.r26Plan}</strong>
      </div>
      <div>
        <span>PhÃ­ tÆ°Æ¡ng á»©ng nÄƒm</span>
        <strong id="riderDetailPremiumValue">${formatCurrency(result.annualPremium)}</strong>
      </div>
    </div>
    ${product.maxSumInsured ? renderRiderAmountControls(product, selection, stbhRange) : ""}
    ${product.code === "R24" ? renderR24Controls(selection) : ""}
    ${product.code === "R26" ? renderR26Controls(selection) : ""}
    ${rangeText ? `<p class="rider-range-note">${rangeText}</p>` : ""}
    ${riderState.occupationNotice ? `<p class="rider-warning">${riderState.occupationNotice}</p>` : ""}
    ${result.error ? `<p class="rider-warning">${result.error}</p>` : `<p class="rider-ok">PhÃ­ Ä‘Ã£ Ä‘Æ°á»£c tÃ­nh theo ${PAYMENT_MODE_LABEL[context.paymentMode]}.</p>`}
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
      rangeNote.textContent = `STBH pháº£i náº±m trong khoáº£ng ${formatAddonRange(stbhRange)}`;
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
  const riderState = getActiveRiderState();
  const selected = VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((item) => item?.selected);
  document.getElementById("riderSelectedCount").textContent = `ÄÃ£ chá»n ${selected.length}/${VISIBLE_SPBK_PRODUCT_CODES.length}`;
  document.getElementById("toggleAllRiders").checked = selected.length > 0 && selected.every((item) => item.enabled);

  if (!selected.length) {
    document.getElementById("selectedRiderList").innerHTML = `<div class="empty-state">ChÆ°a chá»n sáº£n pháº©m bÃ¡n kÃ¨m</div>`;
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
          <span>STBH: ${product.maxSumInsured ? formatCurrency(selection.sumInsured) : product.code === "R24" ? "Theo phÃ­ chÃ­nh" : selection.r26Plan}</span>
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

function getRiderAnnualPremiumTotalForPerson(personKey) {
  const context = getCurrentInputContext(personKey);
  const riderState = riderStatesByPerson[personKey] || riderStatesByPerson.insured;

  return VISIBLE_SPBK_PRODUCT_CODES
    .map((code) => riderState.selections[code])
    .filter((selection) => selection?.selected && selection.enabled)
    .reduce((sum, selection) => {
      const result = calculateRiderPremium(selection.code, selection, context);
      return sum + (result.error ? 0 : result.annualPremium);
    }, 0);
}

function getCombinedRiderAnnualPremiumTotal() {
  const personKeys = policyOwnerMode === "different" ? ["insured", "policyOwner"] : ["insured"];
  return personKeys.reduce((sum, personKey) => sum + getRiderAnnualPremiumTotalForPerson(personKey), 0);
}

function updateRiderTotals() {
  const context = getCurrentInputContext();
  const totalRiderAnnualPremium = getCombinedRiderAnnualPremiumTotal();
  const totalPlanAnnualPremium = context.mainAnnualPremium + totalRiderAnnualPremium;
  document.getElementById("totalRiderPremium").textContent = formatCurrency(totalRiderAnnualPremium);
  document.getElementById("totalPlanPremium").textContent = formatCurrency(totalPlanAnnualPremium);
  document.getElementById("dailySavingsAmount").innerHTML = `
    <span class="daily-saving-label">Cáº§n tiáº¿t kiá»‡m</span>
    <strong>${formatCurrency(Math.ceil(totalPlanAnnualPremium / 365))} / ngÃ y</strong>
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
  normalizeVisibleText(document.getElementById("ridersTab"));
}

function saveRiderPlan() {
  const context = getCurrentInputContext();
  const riderState = getActiveRiderState();
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
  document.getElementById("riderSaveMessage").textContent = "ÄÃ£ lÆ°u phÆ°Æ¡ng Ã¡n sáº£n pháº©m bÃ¡n kÃ¨m";
}

function loadRiderPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem("minhHoaRiderPlan") || "null");
    if (!saved?.riders) return;
    const riderState = getActiveRiderState();
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
  updatePolicyOwnerAgePreview();
}

function updateAthdTermAndAgeValidity(age = "-") {
  const dateOfBirthInput = document.getElementById("dateOfBirth");
  const premiumPaymentYearsInput = document.getElementById("premiumPaymentYears");
  const isAthd = selectedMainProduct === "ATHD";
  const isLifeCare = isLifeCare20();
  const hasValidAge = Number.isFinite(age);

  dateOfBirthInput.setCustomValidity(
    isLifeCare && hasValidAge && (age < 18 || age > 60)
      ? "Life Care 2.0 chá»‰ Ã¡p dá»¥ng cho tuá»•i báº£o hiá»ƒm tá»« 18 Ä‘áº¿n 60"
      : isAthd && hasValidAge && (age < 0 || age > 65)
        ? "NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm An TÃ¢m Hoáº¡ch Äá»‹nh pháº£i trong Ä‘á»™ tuá»•i tá»« 0 Ä‘áº¿n 65."
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
    if (label) label.textContent = "Chu toÃ n háº­u sá»±";
    const deathSumAssured = moneyValue("deathSumAssured");
    output.value = formatCommaNumber(Math.min(deathSumAssured * 0.1, 30000000));
    normalizeMainIllustrationText();
    return;
  }

  if (label) label.textContent = "STBH TTTBVV";
  const annualBasicPremium = moneyValue("annualPremium");
  const deathSumAssured = moneyValue("deathSumAssured");
  output.value = formatCommaNumber(
    calculateDisabilitySumAssured(annualBasicPremium, deathSumAssured)
  );
  normalizeMainIllustrationText();
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
  normalizeMainIllustrationText();
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
    renderPendingResults("Äang táº£i dá»¯ liá»‡u An Thá»‹nh PhÃºc NiÃªn...");
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
    openTermsModal({
      code: getSelectedMainProduct(),
      title: MAIN_PRODUCTS[getSelectedMainProduct()] || "Äiá»u khoáº£n sáº£n pháº©m chÃ­nh",
      subtitle: "Quy táº¯c, Ä‘iá»u khoáº£n sáº£n pháº©m chÃ­nh",
      pdfUrl,
      downloadName: pdfUrl.split("/").pop() || "dieu-khoan-san-pham-chinh.pdf"
    });
    return;
  }

  alert("ChÆ°a tÃ¬m tháº¥y file quy táº¯c Ä‘iá»u khoáº£n cho sáº£n pháº©m nÃ y.");
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
  normalizeMainIllustrationText();
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
  normalizeMainIllustrationText();
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
  document.getElementById("mainSumAssuredLabel").textContent = active ? "Sá»‘ tiá»n báº£o hiá»ƒm" : "STBH tá»­ vong";
  const annualPremium = document.getElementById("annualPremium");
  annualPremium.readOnly = active;
  annualPremium.required = !active;
  if (!active && annualPremium.value === "-") annualPremium.value = "20.000.000";
  document.getElementById("lifeCarePaymentTerm").textContent = `${lifeCareTerm} nÄƒm`;
  document.querySelectorAll("[data-life-care-term]").forEach((button) => {
    const selected = Number(button.dataset.lifeCareTerm) === lifeCareTerm;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("resultTitle").querySelector("span:nth-child(2)").textContent =
    active ? "3. Quyá»n lá»£i sáº£n pháº©m" : "3. GiÃ¡ trá»‹ hoÃ n láº¡i minh há»a";
  document.querySelector(".result-unit").hidden = active;
  document.querySelector(".result-toggle").hidden = active;
  document.querySelector(".table-wrap").hidden = active;
  document.querySelector(".disclaimer").hidden = active;
  document.getElementById("lifeCareBenefits").hidden = !active;
  document.querySelector(".actions").hidden = active;
  updateLifeCarePremium();
  if (active) renderLifeCareBenefits();
  normalizeMainIllustrationText();
}

function renderLifeCareBenefits() {
  if (!isLifeCare20()) return;
  const container = document.getElementById("lifeCareBenefits");
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const age = parseDateInput(dateOfBirth) ? calculateAge(dateOfBirth) : null;
  const sumAssured = moneyValue("deathSumAssured");
  let warning = "";
  if (age !== null && (age < 18 || age > 60)) {
    warning = "Life Care 2.0 chá»‰ Ã¡p dá»¥ng cho tuá»•i báº£o hiá»ƒm tá»« 18 Ä‘áº¿n 60";
  }
  const money = (value) => sumAssured ? formatVND(value) : "-";
  const basic = sumAssured;
  const advanced = Math.round(sumAssured * 1.3);
  const monthly = Math.round(sumAssured * .05);
  container.innerHTML = `
    ${warning ? `<p class="life-care-warning">${warning}</p>` : ""}
    <article class="life-care-card benefit-basic">
      <h3>Bá»‡nh lÃ½ nghiÃªm trá»ng cÆ¡ báº£n</h3>
      <strong>100% STBH = ${money(basic)}</strong>
      <p>Chi tráº£ khi NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm máº¯c má»™t trong cÃ¡c bá»‡nh lÃ½ nghiÃªm trá»ng cÆ¡ báº£n thuá»™c pháº¡m vi báº£o hiá»ƒm.</p>
      <ul><li>Ung thÆ° giai Ä‘oáº¡n Ä‘áº§u sau thá»i gian chá»</li><li>Äá»™t quá»µ thá»a Ä‘iá»u kiá»‡n tá»•n thÆ°Æ¡ng kÃ©o dÃ i hoáº·c pháº«u thuáº­t thÃ´ng thÆ°á»ng</li><li>Nhá»“i mÃ¡u cÆ¡ tim</li></ul>
      <small>Há»£p Ä‘á»“ng cháº¥m dá»©t hiá»‡u lá»±c sau khi phÃ¡t sinh trÃ¡ch nhiá»‡m chi tráº£ quyá»n lá»£i nÃ y.</small>
    </article>
    <article class="life-care-card benefit-advanced">
      <h3>Bá»‡nh lÃ½ nghiÃªm trá»ng nÃ¢ng cao</h3>
      <strong>130% STBH = ${money(advanced)}</strong>
      <p>Chi tráº£ khi NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm máº¯c bá»‡nh lÃ½ nghiÃªm trá»ng nÃ¢ng cao thuá»™c pháº¡m vi báº£o hiá»ƒm.</p>
      <div class="life-care-payment-grid"><span>Tráº£ ngay<b>100% STBH = ${money(basic)}</b></span><span>Tráº£ thÃªm má»—i thÃ¡ng<b>5% STBH = ${money(monthly)}/thÃ¡ng</b></span><span>Thá»i gian tráº£ thÃªm<b>06 thÃ¡ng liÃªn tiáº¿p</b></span><span>Tá»•ng tá»‘i Ä‘a<b>130% STBH = ${money(advanced)}</b></span></div>
      <ul><li>Ung thÆ° giai Ä‘oáº¡n cuá»‘i sau thá»i gian chá»</li><li>Äá»™t quá»µ cÃ³ pháº«u thuáº­t má»Ÿ sá»</li><li>Äá»™t quá»µ cÃ³ pháº«u thuáº­t thÃ´ng thÆ°á»ng vÃ  pháº«u thuáº­t má»Ÿ sá» theo Ä‘iá»u kiá»‡n</li><li>Nhá»“i mÃ¡u cÆ¡ tim cÃ³ pháº«u thuáº­t tim há»Ÿ</li><li>CÆ¡n Ä‘au tháº¯t ngá»±c khÃ´ng á»•n Ä‘á»‹nh cÃ³ pháº«u thuáº­t tim há»Ÿ</li></ul>
    </article>
    `;
  document.getElementById("resultsSection").hidden = false;
  normalizeMainIllustrationText();
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
    normalizeMainIllustrationText();
    return;
  }

  const range = age === null ? null : getDeathSumAssuredRange(annualPremium, age, gender);

  if (!range) {
    deathSumAssuredInput.setCustomValidity("");
    rangeNote.textContent = "Nháº­p ngÃ y sinh vÃ  phÃ­ nÄƒm Ä‘á»ƒ xem khoáº£ng STBH há»£p lá»‡.";
    rangeNote.classList.remove("is-error");
    normalizeMainIllustrationText();
    return;
  }

  const deathSumAssured = moneyValue("deathSumAssured");
  const rangeText = `${formatVND(range.min)} - ${formatVND(range.max)}`;
  rangeNote.textContent = `Há»£p lá»‡: ${rangeText}`;

  if (deathSumAssured && (deathSumAssured < range.min || deathSumAssured > range.max)) {
    deathSumAssuredInput.setCustomValidity(`STBH tá»­ vong pháº£i trong khoáº£ng ${rangeText} Ä‘á»“ng.`);
    rangeNote.textContent = `NgoÃ i khoáº£ng: ${rangeText}`;
    rangeNote.classList.add("is-error");
  } else {
    deathSumAssuredInput.setCustomValidity("");
    rangeNote.classList.remove("is-error");
  }
  normalizeMainIllustrationText();
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
  validatePolicyOwnerFields({ showMessage: true });

  if (isLifeCare20()) {
    updateLifeCarePremium();
    renderLifeCareBenefits();
    updateSummaryExportAvailability();
    return;
  }

  if (!form.checkValidity()) {
    const invalidField = form.querySelector(":invalid");
    renderPendingResults(invalidField?.validationMessage || "Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin minh há»a.");
    updateSummaryExportAvailability();
    return;
  }

  if (selectedMainProduct === "ATPN" && !getAtpnTables().loaded) {
    const message = getAtpnTables().error
      ? "KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u An Thá»‹nh PhÃºc NiÃªn."
      : "Äang táº£i dá»¯ liá»‡u An Thá»‹nh PhÃºc NiÃªn...";
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
    normalizeMainIllustrationText();
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
  normalizeMainIllustrationText();
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
  normalizeMainIllustrationText();
});

document.getElementById("policyOwnerDateOfBirth")?.addEventListener("input", (event) => {
  applyDateOfBirthMask(event);
  updatePolicyOwnerAgePreview();
  validatePolicyOwnerFields({ showMessage: true });
  renderRiderUI();
  updateSummaryExportAvailability();
});
document.getElementById("policyOwnerDateOfBirth")?.addEventListener("change", () => {
  updatePolicyOwnerAgePreview();
  validatePolicyOwnerFields({ showMessage: true });
  renderRiderUI();
  updateSummaryExportAvailability();
});

document.querySelectorAll(".money-input").forEach((input) => {
  input.value = formatCommaNumber(input.value);

  input.addEventListener("input", () => {
    input.value = formatCommaNumber(input.value);
  });
});

function applyEmbeddedAnnualPremium() {
  const premium = new URLSearchParams(window.location.search).get("annualPremium");
  const numericPremium = Number(String(premium || "").replace(/\D/g, ""));
  if (!numericPremium) return;
  const input = document.getElementById("annualPremium");
  if (!input) return;
  input.value = formatCommaNumber(numericPremium);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

applyEmbeddedAnnualPremium();

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
  if (input.value.trim() !== "Nguyá»…n HoÃ ng VÅ©") return;
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
  if (button.dataset.policyOwnerGenderValue) return;
  button.addEventListener("click", () => {
    const genderSelect = document.getElementById("gender");
    genderSelect.value = button.dataset.genderValue;
    genderSelect.dispatchEvent(new Event("change", { bubbles: true }));
    genderSelect.dispatchEvent(new Event("input", { bubbles: true }));
  });
});
document.querySelectorAll("[data-policy-owner-mode]").forEach((button) => {
  button.addEventListener("click", () => setPolicyOwnerMode(button.dataset.policyOwnerMode));
});
document.querySelectorAll("[data-person-form-tab]").forEach((button) => {
  button.addEventListener("click", () => setActivePersonFormTab(button.dataset.personFormTab));
});
document.querySelectorAll("[data-policy-owner-gender-value]").forEach((button) => {
  button.addEventListener("click", () => {
    const genderSelect = document.getElementById("policyOwnerGender");
    if (!genderSelect) return;
    const genderButtons = getPolicyOwnerGenderButtons();
    const buttonIndex = genderButtons.indexOf(button);
    genderSelect.selectedIndex = buttonIndex >= 0 ? buttonIndex : 1;
    syncPolicyOwnerGenderButtons();
    validatePolicyOwnerFields({ showMessage: true });
    renderRiderUI();
    updateSummaryExportAvailability();
  });
});
["policyOwnerName"].forEach((inputId) => {
  document.getElementById(inputId)?.addEventListener("input", () => {
    validatePolicyOwnerFields({ showMessage: true });
    renderRiderUI();
    updateSummaryExportAvailability();
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
document.getElementById("policyOwnerOccupation")?.addEventListener("focus", (event) => {
  if (event.currentTarget.value.trim()) {
    event.currentTarget.value = "";
    setPolicyOwnerOccupationGroup(DEFAULT_JOB_GROUP);
    setPolicyOwnerOccupationNote("");
    renderRiderUI();
  }
  renderPolicyOwnerOccupationSuggestions(filterJobs(event.currentTarget.value));
});
document.getElementById("policyOwnerOccupation")?.addEventListener("input", handlePolicyOwnerOccupationInput);
document.getElementById("policyOwnerOccupation")?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePolicyOwnerOccupationSuggestions();
});
document.getElementById("policyOwnerOccupation")?.addEventListener("blur", () => {
  window.setTimeout(hidePolicyOwnerOccupationSuggestions, 150);
});
window.addEventListener("resize", updateOccupationSuggestionPosition);
window.addEventListener("scroll", updateOccupationSuggestionPosition, true);
window.addEventListener("resize", updatePolicyOwnerOccupationSuggestionPosition);
window.addEventListener("scroll", updatePolicyOwnerOccupationSuggestionPosition, true);
document.getElementById("occupationGroup").addEventListener("change", renderRiderUI);
document.getElementById("paymentMode").addEventListener("change", renderRiderUI);
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});
document.getElementById("toggleAllRiders").addEventListener("change", (event) => {
  const context = getCurrentInputContext();
  const riderState = getActiveRiderState();
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
  resetRiderStates();
  setPolicyOwnerMode("same");
  setActivePersonFormTab("insured");
  setDefaultPolicyOwnerGender();
  setOccupationGroup(DEFAULT_JOB_GROUP);
  setPolicyOwnerOccupationGroup(DEFAULT_JOB_GROUP);
  setOccupationNote("");
  setPolicyOwnerOccupationNote("");
  hideOccupationSuggestions();
  hidePolicyOwnerOccupationSuggestions();
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
const SUMMARY_FONT_FAMILY = 'Inter, "SF Pro Display", "Segoe UI", sans-serif';
let latestSummaryImage = null;
let latestAddonBenefitImages = [];
let addonBenefitReferenceMarkdown = null;

function getSelectedValidRidersForPerson(personKey) {
  const context = getCurrentInputContext(personKey);
  const riderState = riderStatesByPerson[personKey] || riderStatesByPerson.insured;

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
            ? `${selection.r26Plan} (${(selection.r26Benefits || []).length} quyá»n lá»£i)`
            : "-";

      return {
        code: selection.code,
        name: product.name,
        personKey,
        personLabel: context.personLabel,
        personName: context.fullName,
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

function getSelectedValidRiders(context) {
  const activePersonKey = context?.personKey || getActiveRiderPersonKey();
  return getSelectedValidRidersForPerson(activePersonKey);
}

function getCombinedSelectedValidRiders() {
  const personKeys = policyOwnerMode === "different" ? ["insured", "policyOwner"] : ["insured"];
  return personKeys.flatMap((personKey) => getSelectedValidRidersForPerson(personKey));
}

function buildSummarySnapshot() {
  const form = document.getElementById("illustrationForm");
  updateAgePreview();
  updateDeathSumAssuredRange();
  updateDisabilitySumAssured();
  validatePolicyOwnerFields({ showMessage: true });

  if (!form.checkValidity()) {
    const invalidField = form.querySelector(":invalid");
    return {
      valid: false,
      message: invalidField?.validationMessage || "PhÆ°Æ¡ng Ã¡n minh há»a chÆ°a há»£p lá»‡."
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
          ? "Nháº­p ngÃ y sinh Ä‘á»ƒ xuáº¥t tÃ³m táº¯t Life Care 2.0."
          : age < 18 || age > 60
            ? "Life Care 2.0 chá»‰ Ã¡p dá»¥ng cho tuá»•i báº£o hiá»ƒm tá»« 18 Ä‘áº¿n 60."
            : "Nháº­p Sá»‘ tiá»n báº£o hiá»ƒm Ä‘á»ƒ xuáº¥t tÃ³m táº¯t Life Care 2.0."
      };
    }

    const riders = getCombinedSelectedValidRiders();
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
      customerName: input.fullName || "KhÃ¡ch hÃ ng",
      dateOfBirth: input.dateOfBirth,
      age,
      gender: input.gender,
      insuredPerson: input.insuredPerson,
      policyOwner: input.policyOwner,
      isPolicyOwnerSameAsInsured: input.isPolicyOwnerSameAsInsured,
      mainProduct: input.mainProduct,
      productName: MAIN_PRODUCTS.LIFE_CARE_20,
      mainSumInsured: input.deathSumAssured,
      mainPremium,
      additionalPremium: 0,
      premiumPaymentYears: lifeCareTerm,
      policyTermYears: lifeCareTerm,
      paymentMode: "NÄƒm",
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
        ? "KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u An Thá»‹nh PhÃºc NiÃªn."
        : "Äang táº£i dá»¯ liá»‡u An Thá»‹nh PhÃºc NiÃªn..."
    };
  }

  const riders = getCombinedSelectedValidRiders();
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
    customerName: input.fullName || "KhÃ¡ch hÃ ng",
    dateOfBirth: input.dateOfBirth,
    age: context.age,
    gender: input.gender,
    insuredPerson: input.insuredPerson,
    policyOwner: input.policyOwner,
    isPolicyOwnerSameAsInsured: input.isPolicyOwnerSameAsInsured,
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
    paymentMode: PAYMENT_MODE_LABEL[context.paymentMode] || "NÄƒm",
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
      source: "main",
      bar: document.getElementById("summaryExportBar"),
      button: document.getElementById("exportSummaryButton"),
      status: document.getElementById("summaryExportStatus")
    },
    {
      source: "riders",
      bar: document.getElementById("riderSummaryExportBar"),
      button: document.getElementById("riderExportSummaryButton"),
      status: document.getElementById("riderSummaryExportStatus")
    }
  ].filter((target) => target.bar && target.button && target.status);
  if (!exportTargets.length) return;

  const snapshot = buildSummarySnapshot();
  exportTargets.forEach(({ source, bar, button, status }) => {
    bar.hidden = source === "main" ? !snapshot.valid : false;
    button.disabled = !snapshot.valid;
    status.textContent = snapshot.valid ? "" : snapshot.message || "PhÆ°Æ¡ng Ã¡n minh há»a chÆ°a há»£p lá»‡.";
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
  let output = normalizeCanvasText(text);

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
  const words = normalizeCanvasText(text).split(/\s+/);
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

function normalizeCanvasText(text) {
  const value = String(text ?? "");
  if (!hasMojibakeText(value)) return value;
  return decodeMojibakeText(value);
}

function decodeMojibakeText(value) {
  const text = String(value ?? "");
  if (!hasMojibakeText(text)) return text;

  const cp1252 = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
    "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
    "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f
  };
  const toByte = (char) => cp1252[char] ?? (char.charCodeAt(0) & 0xff);
  const decodeSegment = (segment) => {
    const bytes = Uint8Array.from(segment, toByte);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/\uFFFD/g, "");
  };

  try {
    return decodeSegment(text);
  } catch (error) {
    // Fall through and recover any fully mojibake chunks inside mixed strings.
  }

  const decodedWords = text.split(/([ \t\r\n]+)/).map((token) => {
    if (!hasMojibakeText(token)) return token;
    try {
      return decodeSegment(token);
    } catch (error) {
      return token;
    }
  }).join("");
  if (decodedWords !== text) return decodedWords;

  const suspicious = /[A-Za-zÀ-ỹ0-9%.,:/()\-+\s\u0080-\u017f\u2010-\u2122]+/g;

  return text.replace(suspicious, (segment) => {
    if (!hasMojibakeText(segment)) return segment;
    try {
      return decodeSegment(segment);
    } catch (error) {
      return segment;
    }
  });
}

function hasMojibakeText(value) {
  return /[ÃÄÂÁáºá»ÁºÁ»»ðŸâœâ‰\u0080-\u009f]/.test(String(value ?? ""));
}

function normalizeVisibleText(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return hasMojibakeText(node.nodeValue || "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const normalized = decodeMojibakeText(node.nodeValue);
    if (normalized !== node.nodeValue) node.nodeValue = normalized;
  });

  root.querySelectorAll?.("[title], [aria-label], [placeholder], [alt]").forEach((element) => {
    ["title", "aria-label", "placeholder", "alt"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const normalized = decodeMojibakeText(value);
      if (normalized !== value) element.setAttribute(attribute, normalized);
    });
  });
}

function normalizeMainIllustrationText() {
  normalizeVisibleText(document.getElementById("mainTab"));
  normalizeVisibleText(document.getElementById("illustrationForm"));
  normalizeVisibleText(document.getElementById("resultsSection"));
}

function normalizePolicyOwnerRelationText() {
  document.querySelectorAll(".policy-owner-relation-card").forEach((card) => normalizeVisibleText(card));
  document.querySelectorAll(".policy-owner-validation").forEach((message) => {
    const normalized = decodeMojibakeText(message.textContent);
    if (normalized !== message.textContent) message.textContent = normalized;
  });
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

  drawText(ctx, title, x + 32, y + 28, { size: options.titleSize || 33, weight: 750, color: "#004b7a" });
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
  const insured = snapshot.insuredPerson || {
    name: snapshot.customerName,
    age: snapshot.age,
    gender: snapshot.gender
  };
  const owner = snapshot.policyOwner || insured;

  drawOfficialCell(ctx, "", x, y, 110, rowH, { fill: blueFill });
  drawOfficialCell(ctx, "Há» tÃªn", x + 110, y, 230, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, "Tuá»•i", x + 340, y, 94, rowH, { fill: blueFill, size: 20, align: "center" });
  drawOfficialCell(ctx, "Giá»›i tÃ­nh", x + 434, y, leftWidth - 434, rowH, { fill: blueFill, size: 20, align: "center" });

  drawOfficialCell(ctx, "BMBH", x, y + rowH, 110, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, owner.name || "-", x + 110, y + rowH, 230, rowH, { fill: paleFill, size: 20, weight: 750 });
  drawOfficialCell(ctx, owner.age === null || owner.age === undefined ? "-" : String(owner.age), x + 340, y + rowH, 94, rowH, { fill: paleFill, size: 20, align: "center" });
  drawOfficialCell(ctx, owner.gender || "-", x + 434, y + rowH, leftWidth - 434, rowH, { fill: paleFill, size: 20, align: "center" });

  drawOfficialCell(ctx, "NÄBH", x, y + rowH * 2, 110, rowH, { fill: blueFill, size: 20 });
  drawOfficialCell(ctx, insured.name || snapshot.customerName || "-", x + 110, y + rowH * 2, 230, rowH, { fill: paleFill, size: 20, weight: 750 });
  drawOfficialCell(ctx, insured.age === null || insured.age === undefined ? "-" : String(insured.age), x + 340, y + rowH * 2, 94, rowH, { fill: paleFill, size: 20, align: "center" });
  drawOfficialCell(ctx, insured.gender || "-", x + 434, y + rowH * 2, leftWidth - 434, rowH, { fill: paleFill, size: 20, align: "center" });

  const contractRows = [
    ["Thá»i háº¡n Há»£p Ä‘á»“ng:", `${snapshot.policyTermYears} nÄƒm`],
    ["Thá»i háº¡n Ä‘Ã³ng phÃ­ dá»± kiáº¿n:", `${snapshot.premiumPaymentYears} nÄƒm`],
    ["Äá»‹nh ká»³ Ä‘Ã³ng phÃ­:", snapshot.paymentMode],
    ["Tá»•ng PhÃ­ báº£o hiá»ƒm dá»± kiáº¿n Ä‘Ã³ng:", formatCurrency(snapshot.totals.firstYearPremium)]
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
    drawOfficialCell(ctx, "Sá» TIá»€N Báº¢O HIá»‚M Tá»¬ VONG", x, y, width * 0.48, rowH, { fill: "#f8fbff", size: 19 });
    drawOfficialCell(ctx, formatCurrency(snapshot.mainSumInsured), x + width * 0.48, y, width * 0.17, rowH, { fill: "#fffdf4", size: 19, color: "#805900", weight: 800, align: "right" });
    drawOfficialCell(ctx, "CHU TOÃ€N Háº¬U Sá»°", x + width * 0.68, y, width * 0.22, rowH, { fill: "#f8fbff", size: 18 });
    drawOfficialCell(ctx, formatCurrency(snapshot.funeralBenefit), x + width * 0.9, y, width * 0.1, rowH, { fill: "#fffdf4", size: 18, color: "#805900", weight: 800, align: "right" });
    return y + rowH + 26;
  }
  drawOfficialCell(ctx, "Sá» TIá»€N Báº¢O HIá»‚M Tá»¬ VONG", x, y, width * 0.48, rowH, { fill: "#f8fbff", size: 19 });
  drawOfficialCell(ctx, formatCurrency(snapshot.mainSumInsured), x + width * 0.48, y, width * 0.17, rowH, { fill: "#fffdf4", size: 19, color: "#805900", weight: 800, align: "right" });
  drawOfficialCell(ctx, "STBH THÆ¯Æ NG Táº¬T TOÃ€N Bá»˜ VÄ¨NH VIá»„N", x + width * 0.68, y, width * 0.22, rowH, { fill: "#f8fbff", size: 18 });
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

  drawText(ctx, "Tuá»•i NÄBH:", x, y, { size: 19, weight: 600, color: "#0b448f" });
  rows.forEach((row, index) => drawText(ctx, row.age, centers[index], y, { size: 20, weight: 750, color: "#0b448f", align: "center" }));

  const lineY = y + 58;
  drawText(ctx, "NÄƒm há»£p Ä‘á»“ng:", x, lineY - 10, { size: 19, weight: 600, color: "#0b448f" });
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
    ["Tá»•ng phÃ­ báº£o hiá»ƒm lÅ©y káº¿", "cumulativePremium"],
    ["GiÃ¡ trá»‹ hoÃ n láº¡i (lÃ£i suáº¥t minh há»a 4,76%/nÄƒm)", "cashValue476"],
    ["GiÃ¡ trá»‹ hoÃ n láº¡i (lÃ£i suáº¥t minh há»a 4,25%/nÄƒm)", "cashValue425"]
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
    : [["ChÆ°a chá»n sáº£n pháº©m bá»• trá»£", "-"]];
  const rowH = 46;
  const nameWidth = width * 0.72;

  drawOfficialCell(ctx, "Sáº¢N PHáº¨M", x, y, nameWidth, rowH, { fill: "#f8fbff", size: 19, weight: 800, align: "center" });
  drawOfficialCell(ctx, "STBH / Quyá»n lá»£i", x + nameWidth, y, width - nameWidth, rowH, { fill: "#f8fbff", size: 19, weight: 800, align: "center" });
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
  const blue = "#004b7a";
  const gold = "#f4c542";

  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerGradient = ctx.createLinearGradient(0, 0, 1080, 400);
  headerGradient.addColorStop(0, "#004b7a");
  headerGradient.addColorStop(1, "#0067b1");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, 1080, 400);

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(105, 95, 46, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, "BV", 76, 72, { size: 37, weight: 800, color: blue });
  drawText(ctx, "Báº£o Viá»‡t NhÃ¢n thá» KhÃ¡nh HÃ²a", 170, 54, { size: 35, weight: 750, color: "#ffffff" });
  drawText(ctx, `NgÃ y xuáº¥t: ${snapshot.exportedAtText}`, 170, 104, { size: 23, weight: 600, color: "#d9ecff" });

  wrapText(ctx, "TÃ³m táº¯t phÆ°Æ¡ng Ã¡n minh há»a", 70, 172, 660, 54, { size: 50, weight: 800, color: "#ffffff" });
  drawText(ctx, snapshot.customerName, 70, 295, { size: 31, weight: 750, color: "#ffffff" });
  drawText(ctx, `${snapshot.gender}${snapshot.age === null ? "" : `, ${snapshot.age} tuá»•i`}`, 70, 336, { size: 26, weight: 600, color: "#d9ecff" });

  ctx.fillStyle = "rgba(244, 197, 66, 0.18)";
  drawRoundedRect(ctx, 750, 180, 270, 142, 30);
  ctx.fill();
  drawText(ctx, "Tá»•ng báº£o vá»‡", 780, 208, { size: 25, weight: 700, color: "#ffffff" });
  drawText(ctx, formatCompactCurrency(snapshot.totals.protectionBenefit), 780, 254, { size: 38, weight: 800, color: gold, fitWidth: 210, minSize: 30 });

  let y = 430;
  y = drawSummaryCard(ctx, "Sáº£n pháº©m chÃ­nh", [
    { label: "TÃªn sáº£n pháº©m", value: snapshot.productName },
    { label: "Sá»‘ tiá»n báº£o hiá»ƒm", value: formatCurrency(snapshot.mainSumInsured) },
    { label: "PhÃ­ Ä‘á»‹nh ká»³", value: `${formatCurrency(snapshot.mainPremium)} / ${snapshot.paymentMode.toLowerCase()}` },
    { label: "Thá»i háº¡n Ä‘Ã³ng phÃ­", value: `${snapshot.premiumPaymentYears} nÄƒm` },
    { label: "Thá»i háº¡n há»£p Ä‘á»“ng", value: `${snapshot.policyTermYears} nÄƒm` }
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
    : [{ label: "Sáº£n pháº©m bá»• trá»£", value: "ChÆ°a chá»n" }];
  y = drawSummaryCard(ctx, "Sáº£n pháº©m bá»• trá»£", riderRows.slice(0, 7), 58, y, 964, { rowHeight: 50, labelSize: 22, valueSize: 24, labelMaxWidth: 590, valueMaxWidth: 300 }) + 22;

  const overviewRows = [
    { label: "Tá»•ng phÃ­ nÄƒm Ä‘áº§u", value: formatCurrency(snapshot.totals.firstYearPremium) },
    { label: "Tá»•ng STBH chÃ­nh", value: formatCurrency(snapshot.totals.mainSumInsured) },
    { label: "Tá»•ng STBH bá»• trá»£", value: formatCurrency(snapshot.totals.riderSumInsured) },
    { label: "Tá»•ng quyá»n lá»£i báº£o vá»‡", value: formatCurrency(snapshot.totals.protectionBenefit) },
    ...snapshot.totals.accountMilestones.map((item) => ({
      label: `GiÃ¡ trá»‹ hoÃ n láº¡i nÄƒm ${item.year}`,
      value: formatCurrency(item.cashValue476)
    }))
  ];
  y = drawSummaryCard(ctx, "Tá»•ng quan phÆ°Æ¡ng Ã¡n", overviewRows, 58, y, 964, { rowHeight: 47, labelSize: 22, valueSize: 24, labelMaxWidth: 520, valueMaxWidth: 360 }) + 22;

  ctx.fillStyle = "#fff8dc";
  drawRoundedRect(ctx, 58, y, 964, 142, 28);
  ctx.fill();
  ctx.strokeStyle = "#f2d56c";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, "LÆ°u Ã½", 90, y + 22, { size: 30, weight: 800, color: "#7a5600" });
  wrapText(ctx, "ÄÃ¢y chá»‰ lÃ  minh há»a. Quyá»n lá»£i thá»±c táº¿ cÄƒn cá»© theo quy táº¯c Ä‘iá»u khoáº£n sáº£n pháº©m.", 90, y + 68, 900, 32, { size: 25, weight: 600, color: "#5b4a16" });

  drawText(ctx, "Dá»¯ liá»‡u Ä‘Æ°á»£c láº¥y trá»±c tiáº¿p tá»« phÆ°Æ¡ng Ã¡n minh há»a hiá»‡n táº¡i.", 540, 1848, { size: 23, weight: 600, color: "#64748b", align: "center" });
  return canvas;
}

function renderOfficialSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  canvas.height = SUMMARY_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const blue = "#004487";
  const deepBlue = "#004b7a";
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
  drawText(ctx, `MINH Há»ŒA ${snapshot.productName || MAIN_PRODUCTS.ATHD}`.toUpperCase(), SUMMARY_IMAGE_WIDTH / 2, 32, {
    size: 40,
    weight: 850,
    color: "#ffffff",
    align: "center",
    maxWidth: pageW
  });
  drawText(ctx, `Chá»‰ cáº§n tiáº¿t kiá»‡m ${formatCurrency(Math.ceil(snapshot.totals.firstYearPremium / 365))} / ngÃ y`, SUMMARY_IMAGE_WIDTH / 2, 88, {
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
  const insured = snapshot.insuredPerson || { name: snapshot.customerName, dateOfBirth: snapshot.dateOfBirth, age: snapshot.age, gender: snapshot.gender };
  const owner = snapshot.policyOwner || insured;
  const infoRows = snapshot.isPolicyOwnerSameAsInsured
    ? [
        ["BMBH/NÄBH", insured.name || snapshot.customerName || "-"],
        ["NgÃ y thÃ¡ng nÄƒm sinh", insured.dateOfBirth || snapshot.dateOfBirth || "-"],
        ["Tuá»•i báº£o hiá»ƒm", insured.age === null || insured.age === undefined ? "-" : String(insured.age)],
        ["Giá»›i tÃ­nh", insured.gender || "-"]
      ]
    : [
        ["NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm", insured.name || snapshot.customerName || "-"],
        ["BÃªn mua báº£o hiá»ƒm", owner.name || "-"],
        ["Tuá»•i NÄBH", insured.age === null || insured.age === undefined ? "-" : String(insured.age)],
        ["Giá»›i tÃ­nh NÄBH", insured.gender || "-"]
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
    ["Thá»i háº¡n Há»£p Ä‘á»“ng:", `${snapshot.policyTermYears} nÄƒm`],
    ["Thá»i háº¡n Ä‘Ã³ng phÃ­ dá»± kiáº¿n", `${snapshot.premiumPaymentYears} nÄƒm`],
    ["Äá»‹nh ká»³ Ä‘Ã³ng phÃ­:", snapshot.paymentMode],
    ["Tá»•ng PhÃ­ báº£o hiá»ƒm dá»± kiáº¿n Ä‘Ã³ng:", formatVND(snapshot.totals.firstYearPremium)]
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
  drawText(ctx, "ÄÆ¡n vá»‹: Ä‘á»“ng", pageX + pageW - 24, y, { size: contentFontSize, weight: 750, color: orange, align: "right" });
  y += 40;

  const officialProductTitle = snapshot.mainProduct === "ATPN"
    ? "A. Sáº¢N PHáº¨M Báº¢O HIá»‚M LIÃŠN Káº¾T CHUNG AN THá»ŠNH PHÃšC NIÃŠN"
    : "A. Sáº¢N PHáº¨M Báº¢O HIá»‚M LIÃŠN Káº¾T CHUNG AN TÃ‚M HOáº CH Äá»ŠNH";
  const officialRiskItems = snapshot.mainProduct === "ATPN"
    ? [["Sá» TIá»€N Báº¢O HIá»‚M Tá»¬ VONG", snapshot.mainSumInsured], ["CHU TOÃ€N Háº¬U Sá»°", snapshot.funeralBenefit]]
    : [["Sá» TIá»€N Báº¢O HIá»‚M Tá»¬ VONG", snapshot.mainSumInsured], ["Sá» TIá»€N Báº¢O HIá»‚M THÆ¯Æ NG Táº¬T TOÃ€N Bá»˜ VÄ¨NH VIá»„N", snapshot.disabilitySumInsured]];

  sectionTitle(officialProductTitle, pageX + 14, y);
  y += 48;
  const riskH = 138;
  const riskGap = 14;
  const riskW = (pageW - riskGap) / 2;
  drawText(ctx, "1. QUYá»€N Lá»¢I Rá»¦I RO", pageX + 18, y + 24, { size: 24, weight: 850, color: "#0029b8" });
  officialRiskItems.forEach((item, index) => {
    const x = pageX + index * (riskW + riskGap);
    const nameW = riskW * 0.68;
    fillCell(x, y, nameW, riskH);
    fillCell(x + nameW, y, riskW - nameW, riskH);
    if (index === 0) {
      drawText(ctx, "1. QUYá»€N Lá»¢I Rá»¦I RO", x + 18, y + 24, { size: 24, weight: 850, color: "#0029b8" });
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
  drawText(ctx, "2. QUYá»€N Lá»¢I Äáº¦U TÆ¯", pageX + 18, y, { size: 24, weight: 850, color: "#0029b8" });
  y += 36;
  const investmentRows = [
    ["NÄƒm há»£p Ä‘á»“ng", "year"],
    ["Tuá»•i NÄBH:", "age"],
    ["Tá»•ng phÃ­ báº£o hiá»ƒm lÅ©y káº¿", "cumulativePremium", "blue"],
    ["GiÃ¡ trá»‹ hoÃ n láº¡i\n(LÃ£i suáº¥t minh há»a: 4,76%/nÄƒm)", "cashValue476"],
    ["GiÃ¡ trá»‹ hoÃ n láº¡i\n(LÃ£i suáº¥t minh há»a: 4,25%/nÄƒm)", "cashValue425"]
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
  sectionTitle("B. CÃC Sáº¢N PHáº¨M KHÃC TRONG Há»¢P Äá»’NG Báº¢O HIá»‚M", pageX + 14, y);
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
  cellText("Sáº¢N PHáº¨M", pageX, y, riderNameW, riderHeaderH, { align: "center", weight: 850, color: "#0029b8" });
  cellText("Sá» TIá»€N Báº¢O HIá»‚M", pageX + riderNameW, y, pageW - riderNameW, riderHeaderH, { align: "center", weight: 850, color: "#0029b8" });
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
  drawText(ctx, "âœ“", pageX + 46, noteY + 28, { size: contentFontSize, weight: 850, color: orange, align: "center" });
  wrapText(
    ctx,
    "TÃ i liá»‡u mang tÃ­nh cháº¥t tham kháº£o nhanh",
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
  const blue = "#004b7a";
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
  drawText(ctx, "TÃ“M Táº®T MINH Há»ŒA", canvas.width / 2, 36, {
    size: 28, weight: 800, color: "#d8ebff", align: "center"
  });
  drawText(ctx, "LIFE CARE 2.0", canvas.width / 2, 78, {
    size: 48, weight: 900, color: "#ffffff", align: "center"
  });
  drawText(ctx, `NgÃ y xuáº¥t: ${snapshot.exportedAtText}`, canvas.width / 2, 137, {
    size: 19, weight: 650, color: "#d8ebff", align: "center"
  });

  let y = 198;
  const summaryColumnGap = 18;
  const summaryColumnWidth = (contentW - summaryColumnGap) / 2;
  const customerCardX = margin;
  const contractCardX = margin + summaryColumnWidth + summaryColumnGap;
  const summaryInfoHeight = 236;

  card(customerCardX, y, summaryColumnWidth, summaryInfoHeight);
  drawText(ctx, "THÃ”NG TIN KHÃCH HÃ€NG", customerCardX + 24, y + 22, {
    size: 21, weight: 900, color: blue
  });
  const insuredInfo = snapshot.insuredPerson || { name: snapshot.customerName, dateOfBirth: snapshot.dateOfBirth, age: snapshot.age, gender: snapshot.gender };
  const ownerInfo = snapshot.policyOwner || insuredInfo;
  const customerRows = [
    [snapshot.isPolicyOwnerSameAsInsured ? "BMBH/NÄBH" : "NÄBH", insuredInfo.name || snapshot.customerName],
    [snapshot.isPolicyOwnerSameAsInsured ? "NgÃ y sinh" : "BMBH", snapshot.isPolicyOwnerSameAsInsured ? (insuredInfo.dateOfBirth || "-") : (ownerInfo.name || "-")],
    ["Tuá»•i NÄBH", insuredInfo.age === null || insuredInfo.age === undefined ? "-" : `${insuredInfo.age} tuá»•i`],
    ["Giá»›i tÃ­nh NÄBH", insuredInfo.gender || "-"]
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
  drawText(ctx, "THÃ”NG TIN Há»¢P Äá»’NG", contractCardX + 24, y + 22, {
    size: 21, weight: 900, color: blue
  });
  const contractRows = [
    ["Sáº£n pháº©m", "Life Care 2.0"],
    ["Sá»‘ tiá»n báº£o hiá»ƒm", formatCurrency(snapshot.mainSumInsured)],
    ["PhÃ­ báº£o hiá»ƒm Ä‘á»‹nh ká»³ nÄƒm", formatCurrency(snapshot.mainPremium)],
    ["Thá»i háº¡n há»£p Ä‘á»“ng", `${snapshot.policyTermYears} nÄƒm`],
    ["Thá»i háº¡n Ä‘Ã³ng phÃ­", `${snapshot.premiumPaymentYears} nÄƒm`]
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
  drawText(ctx, "QUYá»€N Lá»¢I Sáº¢N PHáº¨M", canvas.width / 2, y, {
    size: 29, weight: 900, color: blue, align: "center"
  });
  y += 48;

  card(margin, y, contentW, 310, "#ffffff", "#b9d8ef");
  drawText(ctx, "Bá»†NH LÃ NGHIÃŠM TRá»ŒNG CÆ  Báº¢N", margin + 28, y + 24, { size: 19, weight: 900, color: ink });
  drawText(ctx, `100% STBH = ${formatCurrency(snapshot.basicBenefit)}`, margin + 28, y + 64, {
    size: 19, weight: 900, color: blue, fitWidth: contentW - 56, minSize: 19
  });
  let textY = wrapText(
    ctx,
    "Chi tráº£ khi NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm máº¯c má»™t trong cÃ¡c bá»‡nh lÃ½ nghiÃªm trá»ng cÆ¡ báº£n thuá»™c pháº¡m vi báº£o hiá»ƒm.",
    margin + 28, y + 114, contentW - 56, 28,
    { size: 19, weight: 600, color: muted }
  ) + 8;
  textY = bullet("Ung thÆ° giai Ä‘oáº¡n Ä‘áº§u sau thá»i gian chá»", margin + 34, textY, contentW - 68);
  textY = bullet("Äá»™t quá»µ thá»a Ä‘iá»u kiá»‡n tá»•n thÆ°Æ¡ng kÃ©o dÃ i hoáº·c pháº«u thuáº­t thÃ´ng thÆ°á»ng", margin + 34, textY, contentW - 68);
  bullet("Nhá»“i mÃ¡u cÆ¡ tim", margin + 34, textY, contentW - 68);

  y += 336;
  card(margin, y, contentW, 480, "#ffffff", "#8fc5eb");
  drawText(ctx, "Bá»†NH LÃ NGHIÃŠM TRá»ŒNG NÃ‚NG CAO", margin + 28, y + 24, { size: 19, weight: 900, color: ink });
  drawText(ctx, `130% STBH = ${formatCurrency(snapshot.advancedBenefit)}`, margin + 28, y + 64, {
    size: 19, weight: 900, color: "#0071bc", fitWidth: contentW - 56, minSize: 19
  });
  wrapText(
    ctx,
    "Chi tráº£ khi NgÆ°á»i Ä‘Æ°á»£c báº£o hiá»ƒm máº¯c bá»‡nh lÃ½ nghiÃªm trá»ng nÃ¢ng cao thuá»™c pháº¡m vi báº£o hiá»ƒm.",
    margin + 28, y + 114, contentW - 56, 28,
    { size: 19, weight: 600, color: muted }
  );

  const benefitItems = [
    ["TRáº¢ NGAY", `100% STBH = ${formatCurrency(snapshot.advancedImmediate)}`],
    ["TRáº¢ THÃŠM Má»–I THÃNG", `5% STBH = ${formatCurrency(snapshot.advancedMonthly)}/thÃ¡ng`],
    ["THá»œI GIAN TRáº¢ THÃŠM", `${String(snapshot.advancedMonths).padStart(2, "0")} thÃ¡ng liÃªn tiáº¿p`],
    ["Tá»”NG Tá»I ÄA", `130% STBH = ${formatCurrency(snapshot.advancedBenefit)}`]
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
  advancedY = bullet("Ung thÆ° giai Ä‘oáº¡n cuá»‘i sau thá»i gian chá»", margin + 34, advancedY, contentW - 68);
  advancedY = bullet("Äá»™t quá»µ cÃ³ pháº«u thuáº­t má»Ÿ sá» hoáº·c pháº«u thuáº­t theo Ä‘iá»u kiá»‡n", margin + 34, advancedY, contentW - 68);
  bullet("Nhá»“i mÃ¡u cÆ¡ tim hoáº·c cÆ¡n Ä‘au tháº¯t ngá»±c cÃ³ pháº«u thuáº­t tim há»Ÿ", margin + 34, advancedY, contentW - 68);

  y += 506;
  if (snapshot.riders.length) {
    card(margin, y, contentW, 92 + snapshot.riders.length * 40);
    drawText(ctx, "Sáº¢N PHáº¨M BÃN KÃˆM", margin + 28, y + 22, { size: 22, weight: 900, color: blue });
    snapshot.riders.forEach((rider, index) => {
      labelValue(rider.name, formatCurrency(rider.annualPremium), margin + 28, y + 62 + index * 38, contentW - 56);
    });
    y += 116 + snapshot.riders.length * 40;
  }

  card(margin, y, contentW, 88, "#fffaf0", "#edd29b");
  wrapText(
    ctx,
    "TÃ i liá»‡u mang tÃ­nh cháº¥t tÃ³m táº¯t minh há»a. Quyá»n lá»£i thá»±c táº¿ cÄƒn cá»© Quy táº¯c, Äiá»u khoáº£n Life Care 2.0 vÃ  há»“ sÆ¡ Ä‘Æ°á»£c cháº¥p thuáº­n.",
    margin + 28, y + 20, contentW - 56, 26,
    { size: 18, weight: 650, color: "#73551d", align: "center" }
  );
  return canvas;
}

function renderDashboardSummaryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SUMMARY_IMAGE_WIDTH;
  const riderRowsForHeight = snapshot.riders.length ? Math.ceil(Math.min(snapshot.riders.length, 12) / 2) : 0;
  canvas.height = SUMMARY_IMAGE_HEIGHT + 220 + (riderRowsForHeight ? 130 + riderRowsForHeight * 190 : 0);
  const ctx = canvas.getContext("2d");
  const colors = {
    navy: "#004b7a",
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
    ctx.font = `900 27px "Segoe UI Symbol", "Segoe UI Emoji", ${SUMMARY_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(normalizeCanvasText(glyph), cx, cy + 1);
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
      unit: isBillion ? "T\u1ef6 \u0110\u1ed2NG" : "TRI\u1ec6U \u0110\u1ed2NG"
    };
  }

  function shortMoney(value, digits = 0) {
    const amount = Math.max(0, Number(value) || 0);
    if (amount > 0 && amount < 1000000) return formatCurrency(amount);
    const money = compactMoney(value, digits);
    const unit = money.unit.includes("T\u1ef6") ? "t\u1ef7" : "tri\u1ec7u";
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

  function heading(title, y, glyph = "âœ“") {
    ctx.strokeStyle = "#a9c4ed";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 230, y + 24);
    ctx.lineTo(margin + 322, y + 24);
    ctx.moveTo(canvas.width - margin - 322, y + 24);
    ctx.lineTo(canvas.width - margin - 230, y + 24);
    ctx.stroke();
    icon(canvas.width / 2 - 176, y + 24, colors.blue, glyph);
    drawText(ctx, normalizeCanvasText(title).toUpperCase(), canvas.width / 2 - 132, y + 4, {
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
  drawText(ctx, normalizeCanvasText(`MINH Há»ŒA ${snapshot.productName || MAIN_PRODUCTS.ATHD}`).toUpperCase(), canvas.width / 2, 54, {
    size: 42,
    weight: 900,
    color: "#fff",
    align: "center",
    fitWidth: contentW - 80,
    minSize: 28
  });

  let y = 126;
  const headerCardH = snapshot.isPolicyOwnerSameAsInsured ? 112 : 148;
  card(margin, y, contentW, headerCardH, 16);
  icon(margin + 54, y + headerCardH / 2, colors.blue, "●", true);
  const headerInsured = snapshot.insuredPerson || { name: snapshot.customerName };
  const headerOwner = snapshot.policyOwner || headerInsured;
  const personX = margin + 106;
  const personW = 330;
  if (snapshot.isPolicyOwnerSameAsInsured) {
    drawText(ctx, "BMBH/N\u0110BH", personX, y + 30, { size: 19, weight: 900, color: colors.blue });
    drawText(ctx, headerInsured.name || snapshot.customerName, personX, y + 60, { size: 30, weight: 900, color: colors.ink, fitWidth: personW, minSize: 23 });
  } else {
    drawText(ctx, "N\u0110BH", personX, y + 22, { size: 18, weight: 900, color: colors.blue });
    drawText(ctx, headerInsured.name || snapshot.customerName, personX + 76, y + 18, { size: 26, weight: 900, color: colors.ink, fitWidth: personW - 76, minSize: 20 });
    ctx.fillStyle = "#fff4d8";
    drawRoundedRect(ctx, personX - 4, y + 76, personW + 8, 48, 14);
    ctx.fill();
    drawText(ctx, "BMBH", personX + 10, y + 88, { size: 18, weight: 900, color: colors.gold });
    drawText(ctx, headerOwner.name || "-", personX + 86, y + 84, { size: 25, weight: 900, color: colors.ink, fitWidth: personW - 96, minSize: 19 });
  }
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 470, y + 26);
  ctx.lineTo(margin + 470, y + headerCardH - 26);
  ctx.moveTo(margin + 770, y + 26);
  ctx.lineTo(margin + 770, y + headerCardH - 26);
  ctx.stroke();
  icon(margin + 522, y + headerCardH / 2, colors.blue, "✓");
  drawText(ctx, "PH\u00cd B\u1ea2O HI\u1ec2M", margin + 574, y + headerCardH / 2 - 28, { size: 18, weight: 800, color: colors.blue });
  drawText(ctx, `${formatVND(totalAnnualPremium)} \u0111/n\u0103m`, margin + 574, y + headerCardH / 2, { size: 25, weight: 900, color: colors.blue, fitWidth: 180, minSize: 19 });
  icon(margin + 820, y + headerCardH / 2, colors.gold, "≈");
  drawText(ctx, `${formatVND(Math.ceil(totalAnnualPremium / 365))} \u0111/ng\u00e0y`, margin + 870, y + headerCardH / 2 - 10, {
    size: 25,
    weight: 900,
    color: colors.gold,
    fitWidth: 140,
    minSize: 18
  });

  y += headerCardH + 12;
  card(margin, y, contentW, 160, 16);
  const contractItems = [
    ["NGÃ€Y SINH", snapshot.dateOfBirth || "-", "â–£"],
    ["TUá»”I Báº¢O HIá»‚M", snapshot.age === null || snapshot.age === undefined ? "-" : `${snapshot.age} tuá»•i`, "ðŸ‘¤"],
    ["GIá»šI TÃNH", snapshot.gender || "-", "âš¥"],
    ["THá»œI Háº N Há»¢P Äá»’NG", `${snapshot.policyTermYears} nÄƒm`, "â–¦"],
    ["THá»œI Háº N ÄÃ“NG PHÃ", `${snapshot.premiumPaymentYears} nÄƒm`, "âœ“"],
    ["Äá»ŠNH Ká»² ÄÃ“NG PHÃ", snapshot.paymentMode, "â†»"]
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
  heading("Quyá»n lá»£i báº£o vá»‡", y, "âœ“");
  y += 48;
  const protectionCards = [
    ["QUYá»€N Lá»¢I Tá»¬ VONG", snapshot.mainSumInsured, colors.blue, "#0046a5", "â™š"],
    [snapshot.mainProduct === "ATPN" ? "CHU TOÃ€N Háº¬U Sá»°" : "QUYá»€N Lá»¢I THÆ¯Æ NG Táº¬T\nTOÃ€N Bá»˜ VÄ¨NH VIá»„N", snapshot.disabilitySumInsured, colors.cyan, "#0ba89f", "+"]
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
  heading("GiÃ¡ trá»‹ hoÃ n láº¡i minh há»a", y, "â–¥");
  drawText(ctx, "So sÃ¡nh 2 ká»‹ch báº£n lÃ£i suáº¥t: 4,76% vÃ  4,25%/nÄƒm", canvas.width / 2, y + 42, {
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
    drawText(ctx, `NÄ‚M ${String(year).padStart(2, "0")}`, x + milestoneW / 2, cardY - 8, { size: 18, weight: 900, color: "#fff", align: "center" });
    drawText(ctx, "ÄÃƒ ÄÃ“NG", x + milestoneW / 2, cardY + 34, {
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
    heading("S\u1ea3n ph\u1ea9m b\u1ed5 tr\u1ee3", y, "\u2713");
    y += 50;
    const riderCols = 2;
    const riderGap = 18;
    const riderCardW = (contentW - riderGap * (riderCols - 1)) / riderCols;
    const riderCardH = 176;
    const ridersByPerson = snapshot.riders.reduce((groups, rider) => {
      const key = rider.personKey || "insured";
      if (!groups[key]) groups[key] = [];
      groups[key].push(rider);
      return groups;
    }, {});
    const riderGroups = [
      { key: "insured", label: "N\u0110BH", name: snapshot.insuredPerson?.name || snapshot.customerName || "-", riders: ridersByPerson.insured || [] },
      { key: "policyOwner", label: "BMBH", name: snapshot.policyOwner?.name || "-", riders: ridersByPerson.policyOwner || [] }
    ].filter((group) => group.riders.length);
    const displayRiders = riderGroups.flatMap((group) => group.riders.map((rider) => ({
      ...rider,
      personLabel: rider.personLabel || group.label,
      personName: rider.personName || group.name
    })));

    displayRiders.slice(0, 12).forEach((rider, index) => {
      const col = index % riderCols;
      const row = Math.floor(index / riderCols);
      const rx = margin + col * (riderCardW + riderGap);
      const ry = y + row * (riderCardH + 16);
      card(rx, ry, riderCardW, riderCardH, 14);
      ctx.fillStyle = colors.blue;
      drawRoundedRect(ctx, rx + 16, ry + 14, 62, 36, 10);
      ctx.fill();
      drawText(ctx, rider.code, rx + 47, ry + 20, { size: 20, weight: 900, color: "#fff", align: "center" });
      const chipW = rider.personLabel === "BMBH" ? 80 : 76;
      ctx.fillStyle = rider.personLabel === "BMBH" ? "#fff4d8" : "#eaf5ff";
      drawRoundedRect(ctx, rx + riderCardW - chipW - 16, ry + 14, chipW, 36, 18);
      ctx.fill();
      drawText(ctx, rider.personLabel || "N\u0110BH", rx + riderCardW - chipW / 2 - 16, ry + 21, {
        size: 18,
        weight: 900,
        color: rider.personLabel === "BMBH" ? colors.gold : colors.blue,
        align: "center"
      });
      drawText(ctx, rider.personName || "-", rx + 90, ry + 20, {
        size: 17,
        weight: 850,
        color: colors.muted,
        fitWidth: riderCardW - chipW - 126,
        minSize: 14
      });
      const nameBottom = wrapText(ctx, rider.name, rx + 16, ry + 60, riderCardW - 32, 25, {
        size: 20,
        weight: 900,
        color: colors.ink,
        maxWidth: riderCardW - 32,
        minSize: 16
      });
      const riderAmountText = rider.sumInsured ? shortMoney(rider.sumInsured, 0) : rider.displaySumInsured || "-";
      const riderMeta = rider.code === "R26" ? `H\u1ea1ng: ${rider.r26Plan || "-"}` : `STBH: ${riderAmountText}`;
      const metaY = Math.max(nameBottom + 8, ry + 112);
      drawText(ctx, riderMeta, rx + 16, metaY, { size: 19, weight: 900, color: colors.blue, fitWidth: riderCardW - 32, minSize: 15 });
      const feeText = rider.code === "R26"
        ? `${(rider.r26Benefits || []).length} quy\u1ec1n l\u1ee3i - Ph\u00ed: ${formatCurrency(rider.annualPremium)} /n\u0103m`
        : `Ph\u00ed: ${formatCurrency(rider.annualPremium)} /n\u0103m`;
      drawText(ctx, feeText, rx + 16, metaY + 32, { size: 17, weight: 800, color: colors.muted, fitWidth: riderCardW - 32, minSize: 14 });
    });
    y += Math.ceil(Math.min(displayRiders.length, 12) / riderCols) * (riderCardH + 16) + 8;
  }

  card(margin, y, contentW, 58, 14);
  icon(margin + 42, y + 29, colors.blue, "i");
  drawText(ctx, "TÃ i liá»‡u tham kháº£o nhanh", margin + 82, y + 18, { size: 21, weight: 900, color: colors.blue });

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
  const totalPremium = sanitizeFilenamePart(`${formatVND(snapshot.totals.firstYearPremium)}Ä‘`);
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
  const insured = snapshot.insuredPerson || {
    name: snapshot.customerName,
    age: snapshot.age,
    gender: snapshot.gender
  };
  return {
    mainProduct: snapshot.productName,
    mainDeathBenefit: snapshot.mainSumInsured,
    annualBasicPremium: snapshot.mainPremium,
    insured,
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
  if (!response.ok) throw new Error("KhÃ´ng upload Ä‘Æ°á»£c áº£nh tÃ³m táº¯t.");
  const data = await response.json();
  return data.url || data.publicUrl || data.imageUrl || null;
}

function trackSummaryExportClick(snapshot, sourceId) {
  const source = sourceId === "riderExportSummaryButton" ? "riders" : "main";
  const valid = Boolean(snapshot?.valid);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "bvnt-analytics", eventName: "summary_export", source, valid }, window.location.origin);
  }

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
      shareStatus.textContent = "PDF Ä‘Ã£ sáºµn sÃ ng Ä‘á»ƒ chia sáº» qua Zalo.";
    }
  } catch (error) {
    shareStatus.textContent = "ÄÃ£ táº¡o PDF. ChÆ°a upload Ä‘Æ°á»£c file public, váº«n cÃ³ thá»ƒ táº£i PDF vá» mÃ¡y.";
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
    document.getElementById("summaryShareStatus").textContent = "KhÃ´ng má»Ÿ Ä‘Æ°á»£c chia sáº» Zalo. HÃ£y táº£i PDF rá»“i gá»­i qua Zalo.";
  });
});
document.getElementById("editSummaryPlan")?.addEventListener("click", closeSummaryPreview);

updateAgePreview();
syncMainProductSelector();
updateDeathSumAssuredRange();
updateDisabilitySumAssured();
setOccupationGroup(DEFAULT_JOB_GROUP);
setPolicyOwnerMode("same");
setActivePersonFormTab("insured");
setDefaultPolicyOwnerGender();
hideOccupationSuggestions();
refreshIllustration();
loadRiderPlan();
renderRiderUI();
syncGenderButtons();
setActiveTab("main");
setDefaultPolicyOwnerGender();
updateSummaryExportAvailability();
normalizeVisibleText(document.body);
window.ATPN_DATA_READY?.then(() => {
  validateAtpnSampleIllustration();
  if (selectedMainProduct === "ATPN") {
    updateDeathSumAssuredRange();
    updateSummaryExportAvailability();
  }
});
