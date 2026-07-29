const SIM_MONTHS = 18;
const DEFAULT_FYP = 15;
const CONTRACT_FYP = 12;
const MONTH_TARGETS = [
  { fyp: 25, size: 2, active: 1, reward: 8 },
  { fyp: 35, size: 3, active: 2, reward: 8 },
  { fyp: 45, size: 4, active: 2, reward: 8 },
  { fyp: 45, size: 5, active: 2, reward: 5 },
  { fyp: 50, size: 6, active: 3, reward: 5 },
  { fyp: 50, size: 6, active: 3, reward: 5 }
];

const blankMonth = () => ({ fyp: 0, trained: true, cancelled: false });
const savedAdvisors = localStorage.getItem('ttn-advisors');
let advisors = JSON.parse(savedAdvisors || '[]');
let editingAdvisor = null;
let visibleMonths = 6;

if (!savedAdvisors) {
  advisors = Array.from({ length: 6 }, (_, advisorIndex) => ({
    id: crypto.randomUUID(),
    name: `TVV ${advisorIndex + 1}`,
    months: Array.from({ length: SIM_MONTHS }, blankMonth)
  }));
}
advisors = advisors.map((advisor, advisorIndex) => ({
  ...advisor,
  id: advisor.id || crypto.randomUUID(),
  name: advisor.name || `TVV ${advisorIndex + 1}`,
  months: Array.from({ length: SIM_MONTHS }, (_, monthIndex) => ({
    ...blankMonth(),
    ...(advisor.months?.[monthIndex] || {})
  }))
}));
if (!savedAdvisors) advisors[0].months[0].fyp = DEFAULT_FYP;
save();

const money = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} triệu`;
const number = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
const esc = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const effectiveFyp = (advisor, monthIndex) => {
  const month = advisor.months[monthIndex];
  return month && !month.cancelled ? (+month.fyp || 0) : 0;
};
const isContract = (advisor, monthIndex) => effectiveFyp(advisor, monthIndex) > CONTRACT_FYP;

function save() {
  localStorage.setItem('ttn-advisors', JSON.stringify(advisors));
}

function tvvMonthReward(advisor, monthIndex) {
  const month = advisor.months[monthIndex];
  const fyp = effectiveFyp(advisor, monthIndex);
  if (!fyp) return 0;
  const base = monthIndex < 3 ? (fyp >= 12 ? 1 : 0) : (fyp >= 12 ? (month.trained ? 1 : 0.5) : 0);
  let challenge = 0;
  if (monthIndex === 0 && fyp >= 50) challenge = 3;
  else if (monthIndex >= 1 && monthIndex <= 3 && fyp >= 50) challenge = month.trained ? 3 : 1.5;
  return base + challenge;
}

function tvvProductivityReward(advisor, monthIndex) {
  if (monthIndex === 0 || effectiveFyp(advisor, monthIndex - 1) <= 0) return 0;
  const fyp = effectiveFyp(advisor, monthIndex);
  const rate = fyp >= 50 ? 0.18 : fyp >= 24 ? 0.15 : fyp >= 12 ? 0.10 : 0;
  return fyp * 0.3 * rate;
}

function tvvQuarterReward(advisor, quarterEndMonth) {
  if ((quarterEndMonth + 1) % 3 !== 0 || quarterEndMonth < 2) return 0;
  let fyp = 0;
  for (let monthIndex = quarterEndMonth - 2; monthIndex <= quarterEndMonth; monthIndex += 1) {
    fyp += effectiveFyp(advisor, monthIndex);
  }
  const rate = fyp >= 500 ? 0.25
    : fyp >= 350 ? 0.20
      : fyp >= 250 ? 0.18
        : fyp >= 150 ? 0.15
          : fyp >= 90 ? 0.13
            : fyp >= 60 ? 0.10
              : fyp >= 24 ? 0.08 : 0;
  return fyp * 0.3 * rate;
}

function tvvAnnualReward(advisor) {
  const activeQuarterFour = [9, 10, 11].some(monthIndex => effectiveFyp(advisor, monthIndex) > 0);
  if (!activeQuarterFour) return 0;
  const achievedQuarters = [2, 5, 8, 11].filter(monthIndex => tvvQuarterReward(advisor, monthIndex) > 0).length;
  const annualFyp = advisor.months.slice(0, 12).reduce((sum, _, monthIndex) => sum + effectiveFyp(advisor, monthIndex), 0);
  if (achievedQuarters === 4) return 10;
  if (achievedQuarters === 3) return 5;
  if (achievedQuarters === 2) return 3;
  if (achievedQuarters === 1 && annualFyp >= 50) return 1;
  return 0;
}

function uniqueContracts(startMonth, endMonth) {
  return advisors.filter(advisor => {
    for (let monthIndex = startMonth; monthIndex <= endMonth; monthIndex += 1) {
      if (isContract(advisor, monthIndex)) return true;
    }
    return false;
  }).length;
}

function recruitedThrough(endMonth) {
  return advisors.filter(advisor => {
    for (let monthIndex = 0; monthIndex <= endMonth; monthIndex += 1) {
      if (effectiveFyp(advisor, monthIndex) > 0) return true;
    }
    return false;
  }).length;
}

function findPromotion() {
  for (let completedMonth = 2; completedMonth < SIM_MONTHS; completedMonth += 1) {
    const startMonth = completedMonth - 2;
    const rollingFyp = advisors.reduce((total, advisor) => {
      for (let monthIndex = startMonth; monthIndex <= completedMonth; monthIndex += 1) {
        total += effectiveFyp(advisor, monthIndex);
      }
      return total;
    }, 0);
    const rollingContracts = uniqueContracts(startMonth, completedMonth);
    const recruited = recruitedThrough(completedMonth);
    if (recruited >= 5 && rollingFyp >= 120 && rollingContracts >= 3) {
      const promotionMonth = completedMonth + 1;
      // Vinh danh chốt đến hết tháng liền trước tháng thăng tiến.
      const cumulativeContracts = uniqueContracts(0, completedMonth);
      const recognition = cumulativeContracts >= 6 ? 8 : cumulativeContracts === 5 ? 5 : cumulativeContracts === 4 ? 3 : 0;
      return {
        month: promotionMonth,
        recruited,
        rollingFyp,
        rollingContracts,
        cumulativeContracts,
        recognition,
        laptop: promotionMonth < 6
      };
    }
  }
  return null;
}

function newManagerReward(fyp, contracts) {
  if (contracts >= 4) return fyp >= 85 ? 8 : fyp >= 45 ? 5 : 0;
  if (contracts === 3) return fyp >= 85 ? 5 : fyp >= 55 ? 5 : fyp >= 45 ? 3 : 0;
  if (contracts === 2) return fyp >= 45 ? 3 : 0;
  return 0;
}

function recruitingReward(advisorRewards, contracts) {
  const rate = contracts >= 3 ? 1.5 : contracts === 2 ? 1.25 : contracts === 1 ? 1 : 0;
  return { rate, reward: advisorRewards * rate };
}

function developmentRate(fyp, contracts) {
  const column = contracts >= 5 ? 0 : contracts >= 3 ? 1 : contracts === 2 ? 2 : 3;
  if (fyp >= 400) return [0.30, 0.28, 0.26, 0.10][column];
  if (fyp >= 200) return [0.26, 0.22, 0.20, 0.10][column];
  if (fyp >= 100) return [0.22, 0.20, 0.18, 0.10][column];
  if (fyp >= 50) return [0.20, 0.18, 0.14, 0.10][column];
  return [0, 0.16, 0.14, 0.10][column];
}

function quarterlyReward(monthly, startMonth, endMonth) {
  const fyp = monthly.slice(startMonth, endMonth + 1).reduce((sum, month) => sum + month.fyp, 0);
  const hasNewContract = monthly.slice(startMonth, endMonth + 1).some(month => month.contracts > 0);
  let standardRate = 0;
  if (hasNewContract) {
    if (fyp >= 600) standardRate = 0.22;
    else if (fyp >= 450) standardRate = 0.18;
    else if (fyp >= 270) standardRate = 0.14;
    else if (fyp >= 150) standardRate = 0.09;
  } else if (fyp >= 150) standardRate = 0.04;
  return { fyp, rate: standardRate, reward: fyp * 0.3 * standardRate };
}

function calculate() {
  const promotion = findPromotion();
  const monthly = [];
  let ttnTotal = 0;
  let tnTotal = 0;
  let tvvTotal = 0;
  let totalFyp = 0;
  let managementAccumulated = 0;

  for (let monthIndex = 0; monthIndex < SIM_MONTHS; monthIndex += 1) {
    const fyp = advisors.reduce((sum, advisor) => sum + effectiveFyp(advisor, monthIndex), 0);
    const active = advisors.filter(advisor => effectiveFyp(advisor, monthIndex) > 0).length;
    const contracts = advisors.filter(advisor => isContract(advisor, monthIndex)).length;
    const advisorRewards = advisors.reduce((sum, advisor) => sum + tvvMonthReward(advisor, monthIndex), 0);
    const advisorProductivity = advisors.reduce((sum, advisor) => sum + tvvProductivityReward(advisor, monthIndex), 0);
    const advisorQuarter = advisors.reduce((sum, advisor) => sum + tvvQuarterReward(advisor, monthIndex), 0);
    const advisorAnnual = monthIndex === 12 ? advisors.reduce((sum, advisor) => sum + tvvAnnualReward(advisor), 0) : 0;
    const recruited = recruitedThrough(monthIndex);
    const isLeader = Boolean(promotion && monthIndex >= promotion.month && monthIndex < promotion.month + 12);
    const isTtn = !promotion || monthIndex < promotion.month;
    const month = {
      monthIndex, fyp, active, contracts, recruited, advisorRewards, advisorProductivity, advisorQuarter, advisorAnnual, isLeader, isTtn,
      title: isLeader ? 'Trưởng nhóm' : (promotion && monthIndex >= promotion.month + 12 ? 'Sau ưu đãi TN mới' : 'Tiền trưởng nhóm'),
      mgmt: 0, companion: 0, outstanding: 0,
      newManager: 0, recruiting: 0, recruitingRate: 0, development: 0, developmentRate: 0,
      quarter: 0, quarterFyp: 0, quarterRate: 0, recognition: 0, laptop: false, total: 0
    };

    // Quản lý khởi nghiệp được bảo lưu đến hết tháng làm việc thứ 6,
    // kể cả khi TTN đã thăng tiến thành TN trong khoảng thời gian này.
    if (monthIndex < MONTH_TARGETS.length) {
      const target = MONTH_TARGETS[monthIndex];
      month.target = target;
      month.hit = fyp >= target.fyp && recruited >= target.size && active >= target.active;
      month.mgmt = month.hit ? target.reward : 0;
      const cumulativeFyp = monthly.reduce((sum, item) => sum + item.fyp, 0) + fyp;
      if (monthIndex === 2 && cumulativeFyp >= 100 && recruited >= 4 && active >= 2) {
        month.mgmt = Math.max(month.mgmt, 24 - managementAccumulated);
      }
      if (monthIndex === 5 && cumulativeFyp >= 250 && recruited >= 6 && active >= 3) {
        month.mgmt = Math.max(month.mgmt, 39 - managementAccumulated);
      }
      managementAccumulated += month.mgmt;
    }

    if (isTtn && monthIndex < MONTH_TARGETS.length) {
      month.companion = active === 1 ? advisorRewards : active >= 2 ? advisorRewards * 2 : 0;
      month.outstanding = active >= 2 ? advisors.reduce((sum, advisor) => {
        const advisorFyp = effectiveFyp(advisor, monthIndex);
        return sum + (advisorFyp >= 45 ? 5 : advisorFyp >= 35 ? 3 : 0);
      }, 0) : 0;
      month.total = month.mgmt + month.companion + month.outstanding;
      ttnTotal += month.total;
    }

    if (isLeader) {
      month.newManager = newManagerReward(fyp, contracts);
      const recruiting = recruitingReward(advisorRewards, contracts);
      month.recruiting = recruiting.reward;
      month.recruitingRate = recruiting.rate;
      month.developmentRate = developmentRate(fyp, contracts);
      month.development = fyp * 0.3 * month.developmentRate;
      if (monthIndex === promotion.month) {
        month.recognition = promotion.recognition;
        month.laptop = promotion.laptop;
      }
      month.total = month.mgmt + month.newManager + month.recruiting + month.development + month.recognition;
      tnTotal += month.total;
    }

    monthly.push(month);
    tvvTotal += advisorRewards;
    totalFyp += fyp;
  }

  if (promotion) {
    for (let tenureEnd = 2; tenureEnd < 12; tenureEnd += 3) {
      const endMonth = promotion.month + tenureEnd;
      if (endMonth >= monthly.length) break;
      const startMonth = endMonth - 2;
      const quarter = quarterlyReward(monthly, startMonth, endMonth);
      monthly[endMonth].quarter = quarter.reward;
      monthly[endMonth].quarterFyp = quarter.fyp;
      monthly[endMonth].quarterRate = quarter.rate;
      monthly[endMonth].total += quarter.reward;
      tnTotal += quarter.reward;
    }
  }

  return { monthly, promotion, ttnTotal, tnTotal, tvvTotal, totalFyp, totalReward: ttnTotal + tnTotal };
}

function promotionProgress(monthIndex) {
  if (monthIndex < 2) return null;
  const startMonth = monthIndex - 2;
  let fyp = 0;
  for (const advisor of advisors) {
    for (let index = startMonth; index <= monthIndex; index += 1) fyp += effectiveFyp(advisor, index);
  }
  return { fyp, contracts: uniqueContracts(startMonth, monthIndex), recruited: recruitedThrough(monthIndex) };
}

function renderPromotion(calculateResult, monthsToShow) {
  const panel = document.querySelector('#promotionStatus');
  const { promotion } = calculateResult;
  const goalCards = progress => `<div class="promotion-goals">
    <article class="goal-card recruited-goal ${progress.recruited >= 5 ? 'met' : ''}"><small>CHỈ TIÊU 01</small><strong>${progress.recruited}<em>/5</em></strong><b>TVV đã tuyển</b><span>${progress.recruited >= 5 ? '✓ Đã đạt yêu cầu' : `Cần thêm ${5 - progress.recruited} TVV có doanh thu`}</span></article>
    <article class="goal-card fyp-goal ${progress.fyp >= 120 ? 'met' : ''}"><small>CHỈ TIÊU 02</small><strong>${number(progress.fyp)}<em>/120 triệu</em></strong><b>FYP trong 3 tháng</b><span>${progress.fyp >= 120 ? '✓ Đã đạt yêu cầu' : `Cần thêm ${number(120 - progress.fyp)} triệu FYP`}</span></article>
    <article class="goal-card contract-goal ${progress.contracts >= 3 ? 'met' : ''}"><small>CHỈ TIÊU 03</small><strong>${progress.contracts}<em>/3</em></strong><b>TVV mới HĐC</b><span>${progress.contracts >= 3 ? '✓ Đã đạt yêu cầu' : `Cần thêm ${3 - progress.contracts} TVV HĐC`}</span></article>
  </div>`;
  if (promotion && promotion.month <= monthsToShow) {
    panel.className = 'promotion-status promoted';
    const recognitionText = promotion.recognition > 0 ? `Vinh danh ${money(promotion.recognition)}` : 'Chưa đủ mốc Vinh danh TN mới';
    const progress = { recruited: promotion.recruited, fyp: promotion.rollingFyp, contracts: promotion.rollingContracts };
    panel.innerHTML = `<div class="promotion-heading"><div class="promotion-icon">★</div><small>ĐÃ THĂNG TIẾN</small><h3>Trưởng nhóm từ tháng ${promotion.month + 1}</h3><p>Chốt kết quả hoạt động tháng ${promotion.month - 2}–${promotion.month}</p></div>${goalCards(progress)}<div class="promotion-perks"><span>🏆 ${recognitionText}</span><span>💻 ${promotion.laptop ? 'Được trang bị 01 laptop' : 'Không thuộc 6 tháng nhận laptop'}</span></div>`;
    return;
  }
  const progress = promotionProgress(Math.max(2, monthsToShow - 1));
  panel.className = 'promotion-status';
  panel.innerHTML = `<div class="promotion-heading"><div class="promotion-icon">↗</div><small>TIẾN ĐỘ THĂNG TIẾN</small><h3>Chưa đạt chức danh Trưởng nhóm</h3><p>Kết quả 3 tháng gần nhất — hoàn thành đồng thời cả 3 chỉ tiêu</p></div>${goalCards(progress)}`;
}

function rewardLine(label, value, note = '', poster = '', reference = false) {
  const content = `<span>${label}${note ? `<small>${note}</small>` : ''}</span><b>${money(value)}</b>`;
  if (poster) {
    return `<button type="button" class="reward-line reward-poster ${reference ? 'reference-reward' : ''}" onclick="openPoster('${poster}','${label}')">${content}<i>›</i></button>`;
  }
  return `<div class="reward-line">${content}</div>`;
}

function advisorBenefitLine(label, value, note = '') {
  return `<div class="reward-line advisor-benefit"><span>${label}${note ? `<small>${note}</small>` : ''}</span><b>${money(value)}</b></div>`;
}

function renderMonth(month) {
  const statusClass = month.isLeader ? 'leader' : month.hit ? 'hit' : '';
  let detail = rewardLine('Thưởng TVV mới', month.advisorRewards, 'Khoản của TVV, không cộng vào thưởng quản lý', 'poster-tvv-moi.png', true);
  if (month.advisorAnnual > 0) detail += advisorBenefitLine('Thưởng Tháng 13 TVV', month.advisorAnnual, 'Tính theo số quý đạt thưởng trong năm đầu');
  if (month.isLeader) {
    if (month.monthIndex < MONTH_TARGETS.length) detail += rewardLine('Quản lý khởi nghiệp', month.mgmt, 'Bảo lưu đến hết tháng làm việc thứ 6', 'poster-quan-ly-khoi-nghiep.png');
    detail += rewardLine('Quản lý mới – TN', month.newManager, '', 'Thưởng quản lý mới.png');
    detail += rewardLine('Tuyển luyện', month.recruiting, `${number(month.recruitingRate * 100)}% thưởng TVV mới`, 'Thưởng tuyển luyện.png');
    detail += rewardLine('Phát triển kinh doanh – TN', month.development, `${number(month.developmentRate * 100)}% × FYC ${money(month.fyp * 0.3)}`, 'Thưởng phát triển kinh doanh.png');
    if (month.quarter > 0) detail += rewardLine('Thưởng Quý – TN', month.quarter, `FYP quý ${money(month.quarterFyp)} × FYC 30% × ${number(month.quarterRate * 100)}%`, 'Thưởng quý.png');
    if (month.recognition > 0) detail += rewardLine('Vinh danh TN mới', month.recognition, 'Thưởng một lần khi thăng tiến', 'Vinh danh TN mới.png');
    if (month.laptop) detail += `<div class="reward-line promotion-gift"><span>Quà mừng thăng tiến<small>Áp dụng khi thăng tiến trong 6 tháng đầu</small></span><b>01 laptop</b><i aria-hidden="true"></i></div>`;
  } else if (month.isTtn && month.target) {
    detail += rewardLine('Quản lý khởi nghiệp', month.mgmt, '', 'poster-quan-ly-khoi-nghiep.png');
    detail += rewardLine('Đồng hành', month.companion, '', 'poster-dong-hanh-vuot-troi.png');
    detail += rewardLine('Vượt trội', month.outstanding, '', 'poster-dong-hanh-vuot-troi.png');
    const progress = promotionProgress(month.monthIndex);
    if (progress) detail += `<div class="progress-alert"><span>Xét thăng tiến sau tháng này</span><b>${number(progress.fyp)}/120 triệu · ${progress.contracts}/3 HĐC</b></div>`;
  } else {
    detail += rewardLine('Ưu đãi TN mới', 0, 'Ngoài 12 tháng chức vụ đầu tiên');
  }
  return `<details class="month-row ${statusClass}"><summary><span><small>THÁNG</small><b>${month.monthIndex + 1}</b></span><span class="month-contract"><small>${month.title.toUpperCase()}</small><b>${month.contracts} HĐC · ${number(month.fyp)} triệu</b></span><span class="month-total"><small>THƯỞNG QUẢN LÝ</small><b>${money(month.total)}</b></span><i>⌄</i></summary><div class="month-detail">${detail}</div></details>`;
}

function render() {
  const matrix = document.querySelector('#advisorList');
  const monthsToShow = Math.min(visibleMonths, SIM_MONTHS);
  const matrixHtml = `<div class="advisor-matrix" style="--advisor-count:${advisors.length}"><div class="matrix-corner">THÁNG</div>${advisors.map((advisor, advisorIndex) => `<button class="tvv-column-head" onclick="openAdvisorDialog(${advisorIndex})"><span>${advisorIndex + 1}</span><b>${esc(advisor.name)}</b><small>Sửa</small></button>`).join('')}${Array.from({ length: monthsToShow }, (_, monthIndex) => `<div class="month-name"><small>THÁNG</small><b>${monthIndex + 1}</b></div>${advisors.map((advisor, advisorIndex) => {
    const fyp = effectiveFyp(advisor, monthIndex);
    const off = fyp <= 0;
    return `<button class="matrix-month ${off ? 'inactive' : ''}" onclick="toggleMatrixCell(${advisorIndex},${monthIndex})" aria-label="${off ? 'Bật' : 'Tắt'} hợp đồng ${esc(advisor.name)} tháng ${monthIndex + 1}"><b>${off ? '＋' : number(fyp)}</b></button>`;
  }).join('')}`).join('')}</div>`;
  const expandButton = monthsToShow < SIM_MONTHS
    ? `<button type="button" class="month-expander" onclick="showNextMonths()"><span>＋</span> Hiện thêm tháng ${monthsToShow + 1}</button>`
    : '';
  matrix.innerHTML = matrixHtml + expandButton;

  const result = calculate();
  renderPromotion(result, monthsToShow);
  document.querySelector('#monthCards').innerHTML = result.monthly.slice(0, monthsToShow).map(renderMonth).join('');
  document.querySelector('#totalFyp').textContent = number(result.totalFyp);
  document.querySelector('#advisorCount').textContent = number(recruitedThrough(monthsToShow - 1));
  document.querySelector('#ttnTotal').textContent = money(result.totalReward);
  document.querySelector('#tvvTotal').textContent = money(result.tvvTotal);
  document.querySelector('#resultsTitle').textContent = `Kết quả ${monthsToShow} tháng`;
}

window.showNextMonths = () => {
  visibleMonths = Math.min(visibleMonths + 1, SIM_MONTHS);
  render();
};

window.toggleMatrixCell = (advisorIndex, monthIndex) => {
  const month = advisors[advisorIndex].months[monthIndex];
  if (month.fyp > 0 && !month.cancelled) month.cancelled = true;
  else {
    month.fyp = month.fyp > 0 ? month.fyp : DEFAULT_FYP;
    month.trained = true;
    month.cancelled = false;
  }
  save();
  render();
};

function positionAdvisorDialog() {
  const dialog = document.querySelector('#advisorDialog');
  if (!dialog.open) return;
  const hostWindow = window.parent !== window ? window.parent : window;
  const frameRect = window.frameElement?.getBoundingClientRect();
  const viewportHeight = hostWindow.innerHeight;
  const visibleTop = frameRect ? Math.max(12, -frameRect.top + 12) : 12;
  const visibleBottom = frameRect
    ? Math.min(frameRect.height - 12, -frameRect.top + viewportHeight - 12)
    : viewportHeight - 12;
  const availableHeight = Math.max(320, visibleBottom - visibleTop);
  const dialogHeight = Math.min(dialog.scrollHeight, availableHeight);

  dialog.style.position = 'fixed';
  dialog.style.inset = 'auto';
  dialog.style.left = '50%';
  dialog.style.top = `${visibleTop + Math.max(0, (availableHeight - dialogHeight) / 2)}px`;
  dialog.style.margin = '0';
  dialog.style.transform = 'translateX(-50%)';
  dialog.style.maxHeight = `${availableHeight}px`;
  dialog.querySelector('form').style.maxHeight = `${availableHeight}px`;
}

window.openAdvisorDialog = (index = null) => {
  editingAdvisor = index;
  const advisor = index === null ? {
    name: `TVV ${advisors.length + 1}`,
    months: Array.from({ length: SIM_MONTHS }, blankMonth)
  } : advisors[index];
  document.querySelector('#dialogTitle').textContent = index === null ? 'Thêm TVV' : 'Cập nhật TVV';
  document.querySelector('#deleteAdvisor').hidden = index === null;
  document.querySelector('#dialogName').value = advisor.name;
  document.querySelector('#dialogMonths').innerHTML = advisor.months.map((month, monthIndex) => {
    const active = month.fyp > 0 && !month.cancelled;
    const reward = active ? tvvMonthReward(advisor, monthIndex) : 0;
    const commission = active ? month.fyp * 0.3 : 0;
    const productivity = tvvProductivityReward(advisor, monthIndex);
    const quarter = tvvQuarterReward(advisor, monthIndex);
    const annual = monthIndex === 12 ? tvvAnnualReward(advisor) : 0;
    const totalIncome = commission + reward + productivity + quarter + annual;
    const quarterRow = (monthIndex + 1) % 3 === 0 ? `<div class="dialog-quarter"><span>Thưởng Quý TVV</span><b>${number(quarter)}</b></div>` : '';
    const annualRow = monthIndex === 12 ? `<div class="dialog-annual"><span>Thưởng Tháng 13</span><b>${number(annual)}</b></div>` : '';
    return `<div class="contract-toggle"><label><input class="dialog-contract" type="checkbox" ${active ? 'checked' : ''} onchange="toggleContractFyp(this);updateSelectAllButton()"><span><small>THÁNG ${monthIndex + 1}</small></span></label><div class="contract-fyp"><input type="text" inputmode="decimal" value="${month.fyp > 0 ? month.fyp : DEFAULT_FYP}" ${active ? '' : 'disabled'} oninput="updateDialogMonthReward(this)"></div><div class="dialog-reward"><span>Thưởng TVV mới</span><b>${number(reward)}</b></div><div class="dialog-productivity"><span>Năng suất tháng</span><b>${number(productivity)}</b></div><div class="dialog-commission"><span>Hoa hồng FYC 30% FYP</span><b>${number(commission)}</b></div>${quarterRow}${annualRow}<div class="dialog-total"><span>Tổng thu nhập TVV</span><b>${number(totalIncome)}</b></div></div>`;
  }).join('');
  updateSelectAllButton();
  document.querySelector('#advisorDialog').showModal();
  requestAnimationFrame(positionAdvisorDialog);
};

window.addAdvisor = () => openAdvisorDialog(null);

window.openPoster = (file, title) => {
  document.querySelector('#posterTitle').textContent = title;
  document.querySelector('#posterImage').src = file;
  document.querySelector('#posterDialog').showModal();
};

window.updateDialogMonthReward = () => {
  const cells = [...document.querySelectorAll('.contract-toggle')];
  const temp = {
    months: cells.map(cell => {
      const checked = cell.querySelector('.dialog-contract').checked;
      const fyp = parseFloat(cell.querySelector('.contract-fyp input').value.replace(',', '.')) || 0;
      return { fyp: checked ? fyp : 0, trained: true, cancelled: false };
    })
  };
  cells.forEach((cell, monthIndex) => {
    cell.querySelector('.dialog-reward b').textContent = number(tvvMonthReward(temp, monthIndex));
    cell.querySelector('.dialog-productivity b').textContent = number(tvvProductivityReward(temp, monthIndex));
    cell.querySelector('.dialog-commission b').textContent = number(effectiveFyp(temp, monthIndex) * 0.3);
    const quarter = cell.querySelector('.dialog-quarter b');
    if (quarter) quarter.textContent = number(tvvQuarterReward(temp, monthIndex));
    const annual = cell.querySelector('.dialog-annual b');
    if (annual) annual.textContent = number(tvvAnnualReward(temp));
    const total = effectiveFyp(temp, monthIndex) * 0.3
      + tvvMonthReward(temp, monthIndex)
      + tvvProductivityReward(temp, monthIndex)
      + tvvQuarterReward(temp, monthIndex)
      + (monthIndex === 12 ? tvvAnnualReward(temp) : 0);
    cell.querySelector('.dialog-total b').textContent = number(total);
  });
};

window.toggleContractFyp = checkbox => {
  const cell = checkbox.closest('.contract-toggle');
  const input = cell.querySelector('.contract-fyp input');
  input.disabled = !checkbox.checked;
  if (checkbox.checked) {
    if (!parseFloat(input.value)) input.value = DEFAULT_FYP;
    input.focus();
    input.select();
  }
  updateDialogMonthReward(input);
};

window.updateSelectAllButton = () => {
  const boxes = [...document.querySelectorAll('.dialog-contract')];
  const selected = boxes.filter(box => box.checked).length;
  document.querySelector('.month-toolbar span').textContent = window.innerWidth > 800
    ? `Đã chọn ${selected}/${boxes.length} tháng có hợp đồng`
    : 'Chọn tháng có hợp đồng';
  document.querySelector('#selectAllMonths').textContent = boxes.length && boxes.every(box => box.checked) ? 'Bỏ tất cả' : 'Tất cả';
};

document.querySelector('#selectAllMonths').onclick = () => {
  const boxes = [...document.querySelectorAll('.dialog-contract')];
  const select = !boxes.every(box => box.checked);
  boxes.forEach(box => {
    box.checked = select;
    const input = box.closest('.contract-toggle').querySelector('.contract-fyp input');
    input.disabled = !select;
    if (select && !parseFloat(input.value)) input.value = DEFAULT_FYP;
  });
  updateDialogMonthReward();
  updateSelectAllButton();
};

const closeAdvisorDialog = () => document.querySelector('#advisorDialog').close();
document.querySelector('#closeDialog').onclick = closeAdvisorDialog;
document.querySelector('#cancelDialog').onclick = closeAdvisorDialog;
const dialogHostWindow = window.parent !== window ? window.parent : window;
dialogHostWindow.addEventListener('scroll', positionAdvisorDialog, { passive: true });
dialogHostWindow.addEventListener('resize', positionAdvisorDialog);
document.querySelector('#closePoster').onclick = () => document.querySelector('#posterDialog').close();
document.querySelector('#posterDialog').onclick = event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
};
document.querySelector('#deleteAdvisor').onclick = () => {
  if (editingAdvisor === null || !confirm(`Xóa ${advisors[editingAdvisor].name} khỏi lộ trình?`)) return;
  advisors.splice(editingAdvisor, 1);
  save();
  closeAdvisorDialog();
  render();
};
document.querySelector('#advisorForm').onsubmit = event => {
  event.preventDefault();
  const months = [...document.querySelectorAll('.contract-toggle')].map(cell => {
    const checked = cell.querySelector('.dialog-contract').checked;
    const value = cell.querySelector('.contract-fyp input').value.replace(',', '.');
    return { fyp: checked ? Math.max(0, parseFloat(value) || DEFAULT_FYP) : 0, trained: true, cancelled: false };
  });
  const data = {
    id: editingAdvisor === null ? crypto.randomUUID() : advisors[editingAdvisor].id,
    name: document.querySelector('#dialogName').value.trim() || `TVV ${advisors.length + 1}`,
    months
  };
  if (editingAdvisor === null) advisors.push(data);
  else advisors[editingAdvisor] = data;
  save();
  closeAdvisorDialog();
  render();
};

document.querySelector('#resetBtn').onclick = () => {
  if (!confirm('Đưa bảng về trạng thái mặc định?')) return;
  advisors.forEach((advisor, advisorIndex) => advisor.months.forEach((month, monthIndex) => {
    month.fyp = advisorIndex === 0 && monthIndex === 0 ? DEFAULT_FYP : 0;
    month.trained = true;
    month.cancelled = false;
  }));
  visibleMonths = 6;
  save();
  render();
};

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.data?.type !== 'reset-lateral-recruitment') return;
  document.querySelector('#resetBtn').click();
});

render();
