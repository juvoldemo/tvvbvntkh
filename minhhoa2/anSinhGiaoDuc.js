/* An Sinh Giáo Dục (AUVL09). Sources: supplied terms, Articles 1–5,
 * Appendix 1 §§1.21, 1.29, 1.34; insurance-factor approval 27/08/2026.
 * Monthly reference illustration; see AN_SINH_GIAO_DUC.md for assumptions.
 */
(function (root) {
  "use strict";
  const milestones = { 18: [6, 11, 15], 22: [6, 11, 15, 18], 25: [11, 15, 18, 22] };
  // Transcribed from the supplied Tỷ lệ phí rủi ro.PNG, ages 0–25.
  // Annual rate per 1,000 VND at risk. ASGD matures by age 25.
  const riskRates = Object.freeze({
    male: Object.freeze([1.84,.72,.69,.68,.65,.61,.58,.54,.52,.52,.52,.57,.65,.75,.87,1,1.15,1.24,1.30,1.32,1.35,1.33,1.31,1.29,1.26,1.22]),
    female: Object.freeze([1.31,.59,.56,.54,.54,.53,.52,.52,.51,.50,.49,.51,.53,.57,.60,.65,.69,.72,.75,.76,.79,.79,.81,.82,.85,.87])
  });
  function minimumRate(year) { return year === 1 ? .025 : year === 2 ? .02 : year === 3 ? .015 : year <= 10 ? .01 : .005; }
  function upliftRate(year) { return year === 1 ? .02 : year <= 3 ? .015 : year <= 10 ? .0125 : year <= 15 ? .01 : .0025; }
  function riskRate(age, gender) {
    const rate = riskRates[gender]?.[age];
    if (!Number.isInteger(age) || rate === undefined) throw new RangeError("Không có tỷ lệ phí rủi ro cho tuổi/giới tính này.");
    return rate;
  }
  function childFactor(age) { return age < 4 ? (age + 1) * .2 : 1; }
  function project(input) {
    const setup = plan(input);
    if (!setup.valid) throw new RangeError(setup.errors.join(" "));
    const gender = input.gender;
    riskRate(setup.age, gender);
    const issueDate = input.issueDate || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new RangeError("Ngày lập kế hoạch không hợp lệ.");
    const start = new Date(`${issueDate}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10) !== issueDate || start.getUTCFullYear() < 2026) throw new RangeError("Ngày lập kế hoạch phải hợp lệ và từ năm 2026.");
    const surrenderRates = [1,.8,.45,.4,.2];
    function simulate(rate) {
      let basic = 0, topup = 0, debt = 0, paid = 0, educationPaid = 0;
      let averageTopupSum = 0, guaranteeExtraBasic = 0, guaranteeExtraTopup = 0;
      let depletedAt = null;
      const rows = [];
      for (let year = 1; year <= setup.term; year++) {
        const age = setup.age + year - 1;
        const premium = year <= setup.paymentYears ? setup.premium : 0;
        const initialFee = premium * initialFeeRate(setup.term, year);
        paid += premium;
        basic += premium - initialFee;
        const education = setup.education.find(m => m.anniversary === year - 1 && m.eligible)?.amount || 0;
        topup += education;
        educationPaid += education;
        let annualRisk = 0, annualManagement = 0;
        const annualRate = rate === null ? minimumRate(year) : Math.max(rate, minimumRate(year));
        const monthlyInterest = Math.pow(1 + annualRate, 1 / 12) - 1;
        const increased = increasedSum(setup.sumAssured, year);
        for (let month = 0; month < 12; month++) {
          const calendarYear = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + (year-1)*12 + month) / 12);
          const management = Math.min(30000 + (calendarYear - 2026)*1000, 70000);
          const deduct = amount => {
            const fromBasic = Math.min(basic, amount);
            basic -= fromBasic;
            const fromTopup = Math.min(topup, amount - fromBasic);
            topup -= fromTopup;
            debt += amount - fromBasic - fromTopup;
          };
          if (debt > 0) { const owed = debt; debt = 0; deduct(owed); }
          deduct(management);
          const atRisk = Math.max(increased * childFactor(age), paid * 2, basic) - basic;
          const risk = Math.max(atRisk, 0) * riskRate(age, gender) / 12000;
          deduct(risk);
          annualRisk += risk;
          annualManagement += management;
          if (year > 4 && basic + topup <= debt) {
            depletedAt = { year, month: month + 1 };
            break;
          }
          basic *= 1 + monthlyInterest;
          topup *= 1 + monthlyInterest;
          // Article 26: separate notional gains, never added to the live accounts.
          guaranteeExtraBasic *= 1 + monthlyInterest;
          guaranteeExtraTopup *= 1 + monthlyInterest;
          averageTopupSum += topup;
        }
        if (depletedAt) {
          rows.push({ year, age, premium, cumulativePremium: paid, depleted: true, basic: 0, topup: 0, accountValue: 0, cashValue: 0, deathBenefit: 0, annualRisk, annualManagement, initialFee, education, debt });
          break;
        }
        // The guarantee is evaluated at each end-of-year termination scenario.
        if (rate === null) {
          guaranteeExtraBasic += Math.max(basic, 0) * upliftRate(year);
          guaranteeExtraTopup += Math.max(topup, 0) * upliftRate(year);
        }
        rows.push({ year, age, premium, cumulativePremium: paid, basic, topup, debt, initialFee,
          annualRisk, annualManagement, education, educationPaid,
          accountValue: basic + topup,
          cashValue: Math.max(basic - setup.premium*(surrenderRates[year-1] || 0), 0) + topup - debt,
          deathBenefit: Math.max(increased * childFactor(age), paid*2, basic) + topup - debt,
          guaranteedBasic: basic + guaranteeExtraBasic,
          guaranteedTopup: topup + guaranteeExtraTopup
        });
      }
      const last = rows.at(-1);
      const basicBonus = !depletedAt && setup.fullPayment ? basic * setup.maturityBonusRate : 0;
      const topupBonus = !depletedAt && setup.fullPayment ? averageTopupSum / (setup.term*12) * setup.topupBonusRate : 0;
      return { rate, rows, depletedAt, basicBonus, topupBonus, educationPaid, rawMaturityBasic: basic + basicBonus, rawMaturityTopup: topup + topupBonus, debt: last.debt };
    }
    const minimum = simulate(null);
    const scenarios = [simulate(.0425), simulate(.0476)];
    function settle(scenario) {
      scenario.rows = scenario.rows.map((row, i) => {
        const floor = minimum.rows[i];
        if (row.depleted || !floor || floor.depleted) return row;
        const base = row.basic + row.topup >= floor.guaranteedBasic + floor.guaranteedTopup ? row.basic : floor.guaranteedBasic;
        const extra = row.basic + row.topup >= floor.guaranteedBasic + floor.guaranteedTopup ? row.topup : floor.guaranteedTopup;
        return { ...row, accountValue: base + extra,
          cashValue: Math.max(0, Math.max(base - setup.premium*(surrenderRates[row.year-1] || 0), 0) + extra - row.debt),
          deathBenefit: Math.max(increasedSum(setup.sumAssured, row.year)*childFactor(row.age), row.cumulativePremium*2, base) + extra - row.debt
        };
      });
      if (scenario.depletedAt) { scenario.maturityBenefit = null; return scenario; }
      const guaranteed = minimum.rows.at(-1);
      let basic = scenario.rawMaturityBasic, topup = scenario.rawMaturityTopup;
      if (!minimum.depletedAt && basic + topup < guaranteed.guaranteedBasic + guaranteed.guaranteedTopup + minimum.basicBonus + minimum.topupBonus) {
        basic = guaranteed.guaranteedBasic + minimum.basicBonus;
        topup = guaranteed.guaranteedTopup + minimum.topupBonus;
      }
      scenario.maturityBenefit = Math.max(0, (setup.fullPayment ? Math.max(basic, setup.totalPremium - scenario.educationPaid) : basic) + topup - scenario.debt);
      return scenario;
    }
    scenarios.forEach(settle);
    settle(minimum);
    return { ...setup, issueDate, gender, scenarios, minimum };
  }
  function allowedMaturities(age) {
    return Number.isInteger(age) && age >= 0 && age <= 15
      ? [18, 22, 25].filter(end => end - age >= 10 && end - age <= 20) : [];
  }
  function baseBonusRate(term) {
    if (!Number.isInteger(term) || term < 10 || term > 20) return null;
    return term === 10 ? .075 : term <= 14 ? .07 : term <= 18 ? .08 : term === 19 ? .11 : .12;
  }
  function extraBonusRate(premium) {
    return premium < 20000000 ? 0 : premium < 30000000 ? .01 : premium < 50000000 ? .015
      : premium < 70000000 ? .02 : premium < 100000000 ? .025 : .03;
  }
  function initialFeeRate(term, year) {
    if (baseBonusRate(term) === null || !Number.isInteger(year) || year < 1 || year > term) return null;
    if (year === 1) return .5;
    if (year === 2) return .3;
    if (year <= 5) return .2;
    return year <= (term >= 14 ? 10 : term - 5) ? .02 : 0;
  }
  function increasedSum(sum, year) { return Math.round(sum * (1 + .05 * (year - 1))); }
  function plan({ age, maturityAge, premium, sumAssured, paymentYears, buyerAge = null }) {
    const errors = [];
    if (!allowedMaturities(age).includes(maturityAge)) errors.push("Con cần từ 0–15 tuổi, với thời hạn hợp đồng từ 10–20 năm.");
    const term = maturityAge - age;
    if (!Number.isFinite(premium) || premium <= 0) errors.push("Nhập phí bảo hiểm cơ bản quy năm lớn hơn 0.");
    if (!Number.isFinite(sumAssured) || sumAssured < premium * 10 || sumAssured > premium * 20 || sumAssured <= 0) errors.push("STBH gốc phải bằng 10–20 lần phí bảo hiểm cơ bản quy năm.");
    if (!Number.isInteger(paymentYears) || paymentYears < 4 || paymentYears > term) errors.push("Số năm đóng phí dự kiến phải từ 4 năm đến hết thời hạn hợp đồng.");
    if (buyerAge !== null && (!Number.isInteger(buyerAge) || buyerAge < 18)) errors.push("Bên mua bảo hiểm phải từ đủ 18 tuổi.");
    if (errors.length) return { valid: false, errors };
    const education = milestones[maturityAge].filter(a => a - age >= 4).map(a => ({
      age: a, anniversary: a - age, amount: Math.round(premium * .1), eligible: paymentYears >= a - age
    }));
    return {
      valid: true, age, maturityAge, term, premium, sumAssured, paymentYears, buyerAge,
      totalPremium: premium * paymentYears,
      education,
      educationTotal: education.filter(m => m.eligible).reduce((n, m) => n + m.amount, 0),
      maturityBonusRate: baseBonusRate(term) + extraBonusRate(premium),
      topupBonusRate: baseBonusRate(term),
      fullPayment: paymentYears === term,
      years: Array.from({ length: term }, (_, i) => ({
        year: i + 1, age: age + i, sum: increasedSum(sumAssured, i + 1),
        buyerBenefit: buyerAge === null ? null : buyerAge + i >= 70 ? 0 : Math.min(increasedSum(sumAssured, i + 1) * .5, 200000000),
        premium: i < paymentYears ? premium : 0,
        initialFee: i < paymentYears ? Math.round(premium * initialFeeRate(term, i + 1)) : 0
      }))
    };
  }
  // Supplied illustration, pp.18–19; unit: VND 1,000. Fixed example only.
  const sample = {
    age: 12, gender: "Nữ", premium: 59500000, sumAssured: 600000000, term: 13,
    cash425: [0,26754,99638,156875,225327,307355,386608,462986,543797,628018,721923,813600,909126],
    cash476: [0,27276,100804,158983,228697,312395,393782,472774,556721,644645,742886,839561,940795],
    maturity425: 989988000, maturity476: 1024478000
  };
  root.ASGD = Object.freeze({ allowedMaturities, baseBonusRate, extraBonusRate, initialFeeRate, increasedSum, plan, sample, riskRates, riskRate, childFactor, minimumRate, upliftRate, project });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.ASGD;
