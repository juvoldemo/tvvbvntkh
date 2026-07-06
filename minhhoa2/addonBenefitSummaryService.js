(function () {
  const IMAGE_WIDTH = 1240;
  const IMAGE_HEIGHT = 1754;
  const FONT_FAMILY = '"Segoe UI", Tahoma, Arial, sans-serif';
  const COLORS = {
    blue: "#004487",
    lightBlue: "#eaf5ff",
    text: "#172033",
    muted: "#667085",
    line: "#d8e6f4",
    orange: "#e66a1f",
    red: "#c62828",
    page: "#f3f7fb"
  };

  const PLAN_INDEX = {
    "Bạc": 0,
    "Vàng": 1,
    "Bạch Kim": 2,
    "Kim Cương": 3,
    "Lục Bảo": 4
  };

  const R26_LIMITS = {
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

  function money(value) {
    return `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} đồng`;
  }

  function payout(value, suffix = "") {
    if (value === null || value === undefined) return "";
    return `${money(value)}${suffix}`;
  }

  function calc(value, label, suffix = "") {
    return `${label} = ${payout(value, suffix)}`;
  }

  function amountByRate(sumInsured, rate, max) {
    const amount = Math.round((Number(sumInsured) || 0) * rate);
    return max ? Math.min(amount, max) : amount;
  }

  function amountByMultiple(sumInsured, multiple, max) {
    const amount = Math.round((Number(sumInsured) || 0) * multiple);
    return max ? Math.min(amount, max) : amount;
  }

  function row(benefit, payoutText, note) {
    return { benefit, payoutText, note };
  }

  function parsePayoutText(value) {
    const textValue = String(value || "-");
    const parts = textValue.split("=");
    if (parts.length < 2) return { rate: "", amount: textValue.trim() || "-" };
    return {
      rate: parts[0].trim(),
      amount: parts.slice(1).join("=").trim()
    };
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function text(ctx, value, x, y, options = {}) {
    const weight = options.weight || 600;
    const size = options.size || 28;
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    ctx.fillStyle = options.color || COLORS.text;
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = "top";
    let output = String(value ?? "");
    if (options.maxWidth && ctx.measureText(output).width > options.maxWidth) {
      const ellipsis = "...";
      while (output.length > 1 && ctx.measureText(`${output}${ellipsis}`).width > options.maxWidth) {
        output = output.slice(0, -1);
      }
      output = `${output.trimEnd()}${ellipsis}`;
    }
    ctx.fillText(output, x, y);
  }

  function wrap(ctx, value, x, y, maxWidth, lineHeight, options = {}) {
    ctx.font = `${options.weight || 600} ${options.size || 28}px ${FONT_FAMILY}`;
    const words = String(value || "").split(/\s+/).filter(Boolean);
    let line = "";
    let currentY = y;
    const textX = options.align === "center"
      ? x + maxWidth / 2
      : options.align === "right"
        ? x + maxWidth
        : x;
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        text(ctx, line, textX, currentY, options);
        currentY += lineHeight;
        line = word;
      } else {
        line = next;
      }
    });
    if (line) {
      text(ctx, line, textX, currentY, options);
      currentY += lineHeight;
    }
    return currentY;
  }

  function normalizePlan(plan) {
    return PLAN_INDEX[plan] === undefined ? "Vàng" : plan;
  }

  function planValue(plan, key) {
    const index = PLAN_INDEX[normalizePlan(plan)];
    return R26_LIMITS[key]?.[index] ?? null;
  }

  function hasReferenceSection(referenceText, code) {
    return !referenceText || referenceText.includes(code);
  }

  function ageFactor(age) {
    if (age === null || age === undefined) return 1;
    if (age < 1) return 0.2;
    if (age < 2) return 0.4;
    if (age < 3) return 0.6;
    if (age < 4) return 0.8;
    return 1;
  }

  function buildR21Rows(stbh) {
    return [
      row("Ung thư giai đoạn đầu", calc(amountByRate(stbh, 0.25, 500000000), "25% STBH"), "Tối đa 500.000.000 đồng; trừ khoản nợ nếu có"),
      row("Ung thư giai đoạn cuối", calc(stbh, "100% STBH"), "Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có"),
      row("Đột quỵ", calc(stbh, "100% STBH"), "Trừ quyền lợi ung thư giai đoạn đầu đã chi trả nếu có"),
      row("Nhồi máu cơ tim", calc(stbh, "100% STBH"), "Tổng chi trả tối đa toàn bộ R21 là 100% STBH")
    ];
  }

  function buildR22Rows(stbh) {
    return [
      row("Mất hoàn toàn chức năng nhìn 01 mắt", calc(amountByRate(stbh, 0.55), "55% STBH"), "Theo bảng tỷ lệ thương tật; tối đa 100% STBH/năm"),
      row("Mất hoàn toàn chức năng nghe 02 tai", calc(amountByRate(stbh, 0.75), "75% STBH"), "Tai nạn phát sinh trong 180 ngày"),
      row("Tháo khớp vai", calc(amountByRate(stbh, 0.70), "70% STBH"), "Nếu nhiều thương tật, tổng chi trả tối đa 100% STBH"),
      row("Mất toàn bộ ngón tay cái", calc(amountByRate(stbh, 0.20), "20% STBH"), "SPBK chấm dứt khi tổng chi trả đạt 100% STBH")
    ];
  }

  function buildR22RowsFromReference(stbh, referenceMarkdown) {
    const source = String(referenceMarkdown || "");
    const section = source.match(/#\s*2\.[\s\S]*?(?=\n#\s*3\.)/)?.[0] || "";
    const rows = section.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|"))
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
      .filter((cells) => cells.length >= 3 && /^\d+(?:[,.]\d+)?%$/.test(cells[2]))
      .map((cells) => {
        const rateText = cells[2].replace(",", ".");
        const rate = Number(rateText.replace("%", "")) / 100;
        return row(`${cells[0]}: ${cells[1]}`, calc(amountByRate(stbh, rate), `${cells[2]} STBH`), "");
      });

    return rows.length ? rows : buildR22Rows(stbh);
  }

  function buildR23Rows(stbh, insuredAge) {
    const factor = ageFactor(insuredAge);
    const factorText = factor === 1 ? "" : ` x ${Math.round(factor * 100)}% theo tuổi`;
    return [
      row("Tử vong do tai nạn thông thường", calc(amountByRate(stbh, factor), `100% STBH${factorText}`), "Trừ khoản nợ nếu có"),
      row("Tử vong do tai nạn hàng không thương mại", calc(amountByRate(stbh, 2 * factor), `200% STBH${factorText}`), "Áp dụng khi là hành khách có vé trên chuyến bay được cấp phép"),
      row("Thương tật nghiêm trọng do tai nạn", calc(amountByRate(stbh, factor), `100% STBH${factorText}`), "Chỉ chi trả một thương tật nghiêm trọng thỏa điều kiện")
    ];
  }

  function buildR24Rows(addon, data) {
    const annualPremium = Number(data.annualBasicPremium) || 0;
    const term = Number(addon.term) || 0;
    return [
      row("Hỗ trợ đóng phí mỗi năm", payout(annualPremium, "/năm"), "Không bao gồm phí bảo hiểm đóng thêm"),
      row("Giá trị hỗ trợ dự kiến", payout(annualPremium * term), `Minh họa theo thời hạn hỗ trợ ${term || "-"} năm`)
    ];
  }

  function buildR25Rows(stbh) {
    return [
      row("BLNT giai đoạn đầu", calc(amountByRate(stbh, 0.25, 500000000), "25% STBH"), "Tối đa 500.000.000 đồng/bệnh; tối đa 2 bệnh thuộc 2 nhóm khác nhau"),
      row("BLNT giai đoạn cuối", calc(stbh, "100% STBH"), "Chỉ chi trả một lần; trừ quyền lợi đã chi trả nếu có"),
      row("BLNT theo giới tính giai đoạn cuối", calc(amountByRate(stbh, 1.25), "125% STBH"), "Nếu cùng lúc nhiều bệnh, chi trả bệnh có số tiền cao nhất"),
      row("Nằm viện đặc biệt sau BLNT giai đoạn đầu", calc(amountByRate(stbh, 0.10, 100000000), "10% STBH"), "Tối đa 100.000.000 đồng; chỉ chi trả một lần")
    ];
  }

  function buildR26Rows(addon, config) {
    const plan = normalizePlan(addon.r26Plan);
    const selected = addon.r26Benefits?.length
      ? addon.r26Benefits
      : (config.getR26AllowedBenefits ? config.getR26AllowedBenefits(plan) : ["inpatient"]);
    const selectedSet = new Set(selected);
    const rows = [
      row(`Nội trú hạng ${plan}`, payout(planValue(plan, "inpatientAnnual"), "/năm"), "Giới hạn tối đa/năm; chi phí thực tế sau đồng chi trả"),
      row("Nội trú có phẫu thuật", payout(planValue(plan, "inpatientSurgery"), "/đợt"), "Theo giới hạn từng đợt điều trị"),
      row("Nội trú không phẫu thuật", payout(planValue(plan, "inpatientNoSurgery"), "/đợt"), "Theo giới hạn từng đợt điều trị"),
      row("Phòng & giường", payout(planValue(plan, "room"), "/ngày"), "Tối đa 60 ngày/năm"),
      row("ICU", "Chi phí thực tế", "Tối đa 30 ngày/năm"),
      row("Phẫu thuật", "Chi phí thực tế", "Trong giới hạn nội trú của hạng chương trình")
    ];

    if (selectedSet.has("outpatient")) {
      rows.push(
        row("Ngoại trú tùy chọn", payout(planValue(plan, "outpatientAnnual"), "/năm"), "Đồng chi trả 20%"),
        row("Ngoại trú mỗi lần khám/điều trị", payout(planValue(plan, "outpatientVisit"), "/lần"), "Tối đa 10 lần/năm"),
        row("Vật lý trị liệu", payout(planValue(plan, "physiotherapy"), "/năm"), "Tối đa 1 đợt/năm")
      );
    }

    if (selectedSet.has("dental")) {
      rows.push(
        row("Nha khoa tùy chọn", payout(planValue(plan, "dentalAnnual"), "/năm"), "Đồng chi trả 20%"),
        row("Điều trị nha khoa", payout(planValue(plan, "dentalTreatment"), "/lần"), "Theo giới hạn từng lần điều trị"),
        row("Lấy cao răng", payout(planValue(plan, "dentalScaling"), "/lần"), "Tối đa 1 lần/năm")
      );
    }

    if (selectedSet.has("maternity")) {
      rows.push(
        row("Thai sản tùy chọn", payout(planValue(plan, "maternityAnnual"), "/năm"), "Thời gian chờ 270 ngày"),
        row("Sinh thường", payout(planValue(plan, "normalDelivery"), "/năm"), "Trong giới hạn thai sản"),
        row("Sinh mổ / biến chứng thai sản", payout(planValue(plan, "cSection"), "/năm"), "Trong giới hạn thai sản"),
        row("Phòng & giường thai sản", payout(planValue(plan, "maternityRoom"), "/ngày"), "Tối đa 30 ngày/năm")
      );
    }

    return rows;
  }

  function buildR27R28Rows(addon, data) {
    const annualPremium = Number(data.annualBasicPremium) || 0;
    const term = Number(addon.term) || 0;
    return [
      row("Hỗ trợ tài chính khi BLNT giai đoạn đầu", payout(annualPremium), "100% PBH năm; chỉ chi trả 1 lần"),
      row("Hỗ trợ tài chính khi BLNT giai đoạn cuối", payout(annualPremium), "100% PBH năm; trừ khoản nợ nếu có"),
      row("Hỗ trợ đóng phí dự kiến", payout(annualPremium * term), `Theo thời hạn hỗ trợ ${term || "-"} năm còn lại`)
    ];
  }

  function buildR29Rows(stbh) {
    return [
      row("Trợ cấp viện phí cơ bản", payout(stbh, "/ngày"), "Tối đa 50 ngày/năm; tối đa 3 lần nằm viện/năm"),
      row("ICU", payout(amountByMultiple(stbh, 2), "/ngày"), "Tối đa 30 ngày/năm; 300 ngày toàn thời hạn"),
      row("Phẫu thuật cơ bản", payout(amountByMultiple(stbh, 5), "/lần"), "Tối đa 2 lần/năm; 10 lần toàn thời hạn"),
      row("Phẫu thuật đặc biệt", payout(amountByMultiple(stbh, 10), "/lần"), "Mỗi ca chỉ chi trả một quyền lợi phẫu thuật"),
      row("Vận chuyển cấp cứu", payout(amountByMultiple(stbh, 2, 1000000), "/lần"), "2 x STBH, tối đa 1.000.000 đồng/lần; tối đa 2 lần/năm")
    ];
  }

  function buildRows(addon, data, config) {
    const stbh = Number(addon.sumInsured) || 0;
    if (!hasReferenceSection(config.referenceMarkdown, addon.code)) {
      return [row("Chưa đọc được phần quyền lợi tương ứng", "-", `Thiếu nội dung ${addon.code} trong SPBK_QUYEN_LOI_CHI_TIET_CODEX.md`)];
    }

    if (addon.code === "R21") return buildR21Rows(stbh);
    if (addon.code === "R22") return buildR22RowsFromReference(stbh, config.referenceMarkdown);
    if (addon.code === "R23") return buildR23Rows(stbh, data.insured?.age);
    if (addon.code === "R24") return buildR24Rows(addon, data);
    if (addon.code === "R25") return buildR25Rows(stbh);
    if (addon.code === "R26") return buildR26Rows(addon, config);
    if (addon.code === "R27" || addon.code === "R28") return buildR27R28Rows(addon, data);
    if (addon.code === "R29") return buildR29Rows(stbh);

    return [row("Quyền lợi bảo vệ", "-", "Chưa cấu hình bảng tóm tắt cho SPBK này")];
  }

  function buildAddonCards(data, config) {
    return (data.selectedAddons || []).map((addon) => {
      const headline = addon.code === "R26"
        ? `Hạng chương trình: ${addon.r26Plan || addon.displaySumInsured || "-"}`
        : ["R24", "R27", "R28"].includes(addon.code)
          ? `Hạn mức theo phí chính: ${money(data.annualBasicPremium)} / năm`
          : addon.code === "R29"
            ? `STBH: ${money(addon.sumInsured)} / ngày`
            : `STBH: ${money(addon.sumInsured)}`;
      return {
        code: addon.code,
        name: addon.name,
        headline,
        rows: buildRows(addon, data, config)
      };
    });
  }

  function estimateCardHeight(card, layout) {
    return layout.cardHeaderH + layout.tableHeaderH + card.rows.length * layout.rowH + layout.cardPadding * 2;
  }

  function drawHeader(ctx, data, pageNumber, pageCount) {
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(0, 0, IMAGE_WIDTH, 150);
    text(ctx, "TÓM TẮT QUYỀN LỢI SPBK", 54, 34, { size: 42, weight: 850, color: "#ffffff", maxWidth: 760 });
    text(ctx, `Trang ${pageNumber}/${pageCount}`, IMAGE_WIDTH - 54, 42, { size: 22, weight: 800, color: "#fff6e8", align: "right" });

    const insured = data.insured || {};
    text(ctx, insured.name || "Khách hàng", 54, 94, { size: 26, weight: 800, color: "#fff6e8", maxWidth: 520 });
    text(ctx, `${insured.gender || "-"}${insured.age === null || insured.age === undefined ? "" : `, ${insured.age} tuổi`}`, 54, 124, { size: 20, weight: 650, color: "#e8f4ff" });
  }

  function drawInfoStrip(ctx, data, y) {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, 42, y, 1156, 84, 16);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, "Sản phẩm chính", 72, y + 16, { size: 19, weight: 700, color: COLORS.muted });
    text(ctx, data.mainProduct || "An Tâm Hoạch Định", 72, y + 42, { size: 26, weight: 850, color: COLORS.blue, maxWidth: 470 });
    text(ctx, "STBH tử vong chính", 660, y + 16, { size: 19, weight: 700, color: COLORS.muted });
    text(ctx, money(data.mainDeathBenefit), 660, y + 42, { size: 28, weight: 850, color: COLORS.orange, maxWidth: 430 });
    return y + 108;
  }

  function drawCard(ctx, card, x, y, width, layout) {
    const height = estimateCardHeight(card, layout);
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, width, height, layout.radius);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = COLORS.lightBlue;
    drawRoundedRect(ctx, x + layout.cardPadding, y + layout.cardPadding, 68, layout.badgeH, 10);
    ctx.fill();
    text(ctx, card.code, x + layout.cardPadding + 34, y + layout.cardPadding + 10, { size: layout.codeSize, weight: 900, color: COLORS.blue, align: "center" });
    text(ctx, card.name, x + layout.cardPadding + 88, y + layout.cardPadding + 2, { size: layout.titleSize, weight: 850, color: COLORS.text, maxWidth: width - layout.cardPadding * 2 - 90 });
    text(ctx, card.headline, x + layout.cardPadding + 88, y + layout.cardPadding + layout.titleSize + 7, { size: layout.bodySize, weight: 750, color: COLORS.orange, maxWidth: width - layout.cardPadding * 2 - 90 });

    const tableX = x + layout.cardPadding;
    const tableY = y + layout.cardPadding + layout.cardHeaderH;
    const tableW = width - layout.cardPadding * 2;
    const benefitW = Math.round(tableW * 0.35);
    const payoutW = Math.round(tableW * 0.31);
    const noteW = tableW - benefitW - payoutW;
    ctx.fillStyle = "#f6f9fc";
    drawRoundedRect(ctx, tableX, tableY, tableW, layout.tableHeaderH, 8);
    ctx.fill();
    text(ctx, "Quyền lợi", tableX + 12, tableY + 8, { size: layout.smallSize, weight: 800, color: COLORS.muted });
    text(ctx, "Mức chi trả", tableX + benefitW + 12, tableY + 8, { size: layout.smallSize, weight: 800, color: COLORS.muted });
    text(ctx, "Ghi chú giới hạn", tableX + benefitW + payoutW + 12, tableY + 8, { size: layout.smallSize, weight: 800, color: COLORS.muted });

    card.rows.forEach((item, index) => {
      const rowY = tableY + layout.tableHeaderH + index * layout.rowH;
      ctx.strokeStyle = "#edf2f7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX, rowY);
      ctx.lineTo(tableX + tableW, rowY);
      ctx.stroke();
      wrap(ctx, item.benefit, tableX + 12, rowY + layout.rowTextTop, benefitW - 20, layout.lineHeight, { size: layout.bodySize, weight: 750, color: COLORS.text });
      wrap(ctx, item.payoutText, tableX + benefitW + 12, rowY + layout.rowTextTop, payoutW - 20, layout.lineHeight, { size: layout.bodySize, weight: 900, color: COLORS.red });
      wrap(ctx, item.note, tableX + benefitW + payoutW + 12, rowY + layout.rowTextTop, noteW - 20, layout.lineHeight, { size: layout.noteSize, weight: 650, color: COLORS.muted });
    });

    return y + height;
  }

  function isR21ExclusiveBenefit(item) {
    return /cuá»‘i|cuối|quá»µ|quỵ|mÃ¡u|máu/.test(item.benefit);
  }

  function estimateInfographicRowHeight(item) {
    const benefitLines = Math.max(1, Math.ceil(String(item.benefit || "").length / 58));
    const payoutParts = parsePayoutText(item.payoutText);
    const rateLines = Math.max(1, Math.ceil(String(payoutParts.rate || "").length / 34));
    const amountLines = Math.max(1, Math.ceil(String(payoutParts.amount || "").length / 40));
    return Math.max(92, 34 + benefitLines * 21 + Math.max(rateLines, amountLines) * 21);
  }

  function estimateInfographicCardHeight(card) {
    const visibleRows = card.code === "R21" && !card.continued
      ? card.rows.filter((item) => !isR21ExclusiveBenefit(item))
      : card.rows;
    const rowsHeight = visibleRows.reduce((sum, item, index) => sum + estimateInfographicRowHeight(item) + (index ? 10 : 0), 0);
    const exclusiveHeight = card.code === "R21" && !card.continued && card.rows.some(isR21ExclusiveBenefit) ? 186 : 0;
    return 28 + 92 + rowsHeight + exclusiveHeight + (exclusiveHeight && rowsHeight ? 12 : 0) + 22;
  }

  function drawInfographicBenefitRow(ctx, item, x, y, width) {
    const rowH = estimateInfographicRowHeight(item);
    const payoutParts = parsePayoutText(item.payoutText);
    ctx.strokeStyle = "#e5edf7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.fillStyle = "#eaf5ff";
    ctx.beginPath();
    ctx.arc(x + 18, y + 25, 13, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, "✓", x + 18, y + 14, { size: 19, weight: 900, color: COLORS.blue, align: "center" });
    wrap(ctx, item.benefit, x + 42, y + 11, width * 0.48, 20, { size: 17, weight: 800, color: COLORS.blue });
    text(ctx, payoutParts.rate || "-", x + width * 0.66, y + 13, { size: 17, weight: 900, color: COLORS.red, align: "center", maxWidth: width * 0.22 });
    wrap(ctx, payoutParts.amount || "-", x + width * 0.75, y + 11, width * 0.23, 20, { size: 17, weight: 850, color: COLORS.text });
    return rowH;
  }

  function drawR21ExclusiveGroup(ctx, rows, x, y, width) {
    const groupRows = rows.filter(isR21ExclusiveBenefit).slice(0, 3);
    if (!groupRows.length) return 0;
    const groupH = 178;
    ctx.fillStyle = "#fff7f7";
    drawRoundedRect(ctx, x, y, width, groupH, 14);
    ctx.fill();
    ctx.strokeStyle = "#ffd0d0";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const colW = width / 3;
    groupRows.forEach((item, index) => {
      const cx = x + colW * index + colW / 2;
      if (index) text(ctx, "hoặc", x + colW * index, y + 54, { size: 18, weight: 850, color: COLORS.text, align: "center" });
      ctx.fillStyle = "#ffe1e1";
      ctx.beginPath();
      ctx.arc(cx, y + 34, 27, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, index === 0 ? "!" : index === 1 ? "↯" : "♥", cx, y + 18, { size: 24, weight: 900, color: COLORS.red, align: "center" });
      wrap(ctx, item.benefit, cx - colW / 2 + 14, y + 68, colW - 28, 21, { size: 17, weight: 850, color: COLORS.blue, align: "center" });
      const payoutParts = parsePayoutText(item.payoutText);
      text(ctx, payoutParts.rate || "100% STBH", cx, y + 116, { size: 17, weight: 900, color: COLORS.red, align: "center" });
      text(ctx, payoutParts.amount || "", cx, y + 140, { size: 16, weight: 850, color: COLORS.red, align: "center", maxWidth: colW - 24 });
    });
    ctx.fillStyle = "#fff";
    drawRoundedRect(ctx, x + 20, y + groupH - 34, width - 40, 25, 8);
    ctx.fill();
    return groupH + 12;
  }

  function drawInfographicCard(ctx, card, x, y, width) {
    const height = estimateInfographicCardHeight(card);
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const pad = 20;
    ctx.fillStyle = COLORS.lightBlue;
    drawRoundedRect(ctx, x + pad, y + pad, 78, 44, 10);
    ctx.fill();
    text(ctx, card.code, x + pad + 39, y + pad + 9, { size: 24, weight: 900, color: COLORS.blue, align: "center" });
    wrap(ctx, `${card.name}${card.continued ? " (tiếp)" : ""}`, x + pad + 98, y + pad + 2, width - 360, 28, { size: 25, weight: 900, color: COLORS.blue });
    text(ctx, card.headline, x + width - pad, y + pad + 12, { size: 22, weight: 900, color: COLORS.orange, align: "right", maxWidth: 300 });

    const gridX = x + pad;
    const gridY = y + pad + 86;
    const gridW = width - pad * 2;
    const gap = 12;
    const benefitCols = 2;
    const benefitW = (gridW - gap) / benefitCols;
    const benefitH = 108;
    const visibleRows = card.code === "R21" && !card.continued ? card.rows.filter((item) => !isR21ExclusiveBenefit(item)) : card.rows;
    visibleRows.forEach((item, index) => {
      const col = index % benefitCols;
      const rowIndex = Math.floor(index / benefitCols);
      const bx = gridX + col * (benefitW + gap);
      const by = gridY + rowIndex * (benefitH + gap);
      const payoutParts = parsePayoutText(item.payoutText);
      ctx.fillStyle = "#f7fbff";
      drawRoundedRect(ctx, bx, by, benefitW, benefitH, 14);
      ctx.fill();
      ctx.strokeStyle = "#dbe9fb";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#eaf5ff";
      ctx.beginPath();
      ctx.arc(bx + 24, by + 28, 14, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, "✓", bx + 24, by + 17, { size: 19, weight: 900, color: COLORS.blue, align: "center" });
      wrap(ctx, item.benefit, bx + 48, by + 15, benefitW - 66, 21, { size: 18, weight: 850, color: COLORS.blue });
      text(ctx, payoutParts.rate || "-", bx + 18, by + 72, { size: 18, weight: 900, color: COLORS.red, maxWidth: benefitW * 0.42 });
      text(ctx, payoutParts.amount || "-", bx + benefitW - 18, by + 72, { size: 18, weight: 900, color: COLORS.text, align: "right", maxWidth: benefitW * 0.52 });
    });
    if (card.code === "R21" && !card.continued) {
      const benefitRows = Math.ceil(visibleRows.length / benefitCols);
      const groupY = gridY + benefitRows * (benefitH + gap) + 2;
      drawR21ExclusiveGroup(ctx, card.rows, gridX, groupY, gridW);
    }
    return y + height;
  }

  function drawInfographicBenefitRow(ctx, item, x, y, width) {
    const rowH = estimateInfographicRowHeight(item);
    const payoutParts = parsePayoutText(item.payoutText);
    ctx.fillStyle = "#f7fbff";
    drawRoundedRect(ctx, x, y, width, rowH, 14);
    ctx.fill();
    ctx.strokeStyle = "#dbe9fb";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#eaf5ff";
    ctx.beginPath();
    ctx.arc(x + 25, y + 31, 14, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, "✓", x + 25, y + 20, { size: 18, weight: 900, color: COLORS.blue, align: "center" });
    wrap(ctx, item.benefit, x + 52, y + 17, width - 450, 21, { size: 18, weight: 800, color: COLORS.blue });
    const infoY = y + Math.max(56, rowH - 34);
    text(ctx, payoutParts.rate || "-", x + 52, infoY, { size: 17, weight: 900, color: COLORS.red, maxWidth: width * 0.38 });
    wrap(ctx, payoutParts.amount || "-", x + width - 390, infoY - 1, 360, 21, { size: 18, weight: 900, color: COLORS.orange, align: "right" });
    return rowH;
  }

  function drawInfographicCard(ctx, card, x, y, width) {
    const height = estimateInfographicCardHeight(card);
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const pad = 20;
    ctx.fillStyle = COLORS.lightBlue;
    drawRoundedRect(ctx, x + pad, y + pad, 78, 44, 10);
    ctx.fill();
    text(ctx, card.code, x + pad + 39, y + pad + 9, { size: 24, weight: 900, color: COLORS.blue, align: "center" });
    wrap(ctx, `${card.name}${card.continued ? " (tiáº¿p)" : ""}`, x + pad + 98, y + pad + 2, width - 410, 28, { size: 25, weight: 900, color: COLORS.blue });
    text(ctx, card.headline, x + width - pad, y + pad + 12, { size: 22, weight: 900, color: COLORS.orange, align: "right", maxWidth: 350 });

    const gridX = x + pad;
    const gridY = y + pad + 86;
    const gridW = width - pad * 2;
    const gap = 10;
    const visibleRows = card.code === "R21" && !card.continued ? card.rows.filter((item) => !isR21ExclusiveBenefit(item)) : card.rows;
    let rowY = gridY;
    visibleRows.forEach((item, index) => {
      if (index) rowY += gap;
      rowY += drawInfographicBenefitRow(ctx, item, gridX, rowY, gridW);
    });
    if (card.code === "R21" && !card.continued) {
      const groupY = rowY + (visibleRows.length ? 12 : 0);
      drawR21ExclusiveGroup(ctx, card.rows, gridX, groupY, gridW);
    }
    return y + height;
  }

  function getCardAccent(code) {
    return {
      R21: "#e20f2f",
      R22: "#0050a4",
      R23: "#6d3fd1",
      R25: "#039855",
      R26: "#0077b6",
      R29: "#e66a1f"
    }[code] || COLORS.blue;
  }

  function getBenefitTitle(item) {
    const value = String(item?.benefit || "");
    return value.includes(":") ? value.split(":").slice(1).join(":").trim() : value;
  }

  function getBenefitGroup(item) {
    const value = String(item?.benefit || "");
    return value.includes(":") ? value.split(":")[0].trim() : "";
  }

  // Icon nodes copied from lucide-react package icons so the canvas export can use the same Lucide geometry.
  const LUCIDE_ICON_NODES = {
    HeartPulse: [["path", { d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" }], ["path", { d: "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" }]],
    Ribbon: [["path", { d: "M12 11.22C11 9.997 10 9 10 8a2 2 0 0 1 4 0c0 1-.998 2.002-2.01 3.22" }], ["path", { d: "m12 18 2.57-3.5" }], ["path", { d: "M6.243 9.016a7 7 0 0 1 11.507-.009" }], ["path", { d: "M9.35 14.53 12 11.22" }], ["path", { d: "M9.35 14.53C7.728 12.246 6 10.221 6 7a6 5 0 0 1 12 0c-.005 3.22-1.778 5.235-3.43 7.5l3.557 4.527a1 1 0 0 1-.203 1.43l-1.894 1.36a1 1 0 0 1-1.384-.215L12 18l-2.679 3.593a1 1 0 0 1-1.39.213l-1.865-1.353a1 1 0 0 1-.203-1.422z" }]],
    Brain: [["path", { d: "M12 18V5" }], ["path", { d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" }], ["path", { d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" }], ["path", { d: "M17.997 5.125a4 4 0 0 1 2.526 5.77" }], ["path", { d: "M18 18a4 4 0 0 0 2-7.464" }], ["path", { d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" }], ["path", { d: "M6 18a4 4 0 0 1-2-7.464" }], ["path", { d: "M6.003 5.125a4 4 0 0 0-2.526 5.77" }]],
    Heart: [["path", { d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" }]],
    Eye: [["path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }], ["circle", { cx: "12", cy: "12", r: "3" }]],
    Ear: [["path", { d: "M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" }], ["path", { d: "M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" }]],
    Accessibility: [["circle", { cx: "16", cy: "4", r: "1" }], ["path", { d: "m18 19 1-7-6 1" }], ["path", { d: "m5 8 3-3 5.5 3-2.36 3.5" }], ["path", { d: "M4.24 14.5a5 5 0 0 0 6.88 6" }], ["path", { d: "M13.76 17.5a5 5 0 0 0-6.88-6" }]],
    Hand: [["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }], ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }], ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }], ["path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" }]],
    Footprints: [["path", { d: "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" }], ["path", { d: "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" }], ["path", { d: "M16 17h4" }], ["path", { d: "M4 13h4" }]],
    Shield: [["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }]],
    Plane: [["path", { d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" }]],
    Hospital: [["path", { d: "M12 7v4" }], ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }], ["path", { d: "M14 9h-4" }], ["path", { d: "M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" }], ["path", { d: "M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16" }]],
    Bed: [["path", { d: "M2 4v16" }], ["path", { d: "M2 8h18a2 2 0 0 1 2 2v10" }], ["path", { d: "M2 17h20" }], ["path", { d: "M6 8v9" }]],
    Ambulance: [["path", { d: "M10 10H6" }], ["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }], ["path", { d: "M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14" }], ["path", { d: "M8 8v4" }], ["path", { d: "M9 18h6" }], ["circle", { cx: "17", cy: "18", r: "2" }], ["circle", { cx: "7", cy: "18", r: "2" }]],
    Activity: [["path", { d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" }]],
    Stethoscope: [["path", { d: "M11 2v2" }], ["path", { d: "M5 2v2" }], ["path", { d: "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" }], ["path", { d: "M8 15a6 6 0 0 0 12 0v-3" }], ["circle", { cx: "20", cy: "10", r: "2" }]]
  };

  function compactBenefitTitle(value) {
    return String(value || "")
      .replace(/Mất hoàn toàn và không thể phục hồi chức năng /gi, "Mất hoàn toàn ")
      .replace(/bao gồm mất hoàn toàn mắt hoặc mù hoàn toàn/gi, "nhìn 01 mắt")
      .replace(/của /gi, "")
      .trim();
  }

  function drawLucideIcon(ctx, x, y, accent, iconName) {
    const nodes = LUCIDE_ICON_NODES[iconName] || LUCIDE_ICON_NODES.Shield;
    ctx.save();
    ctx.fillStyle = `${accent}18`;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x - 12, y - 12);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    nodes.forEach(([tag, attrs]) => {
      if (tag === "path" && attrs.d && typeof Path2D !== "undefined") {
        ctx.stroke(new Path2D(attrs.d));
      } else if (tag === "circle") {
        ctx.beginPath();
        ctx.arc(Number(attrs.cx), Number(attrs.cy), Number(attrs.r), 0, Math.PI * 2);
        ctx.stroke();
      } else if (tag === "line") {
        ctx.beginPath();
        ctx.moveTo(Number(attrs.x1), Number(attrs.y1));
        ctx.lineTo(Number(attrs.x2), Number(attrs.y2));
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function iconTypeFor(card, item) {
    const benefit = String(item?.benefit || "").toLowerCase();
    if (card.code === "R21") return benefit.includes("tim") ? "heart" : "shield";
    if (card.code === "R22") return benefit.includes("mắt") || benefit.includes("máº¯t") ? "eye" : "shield";
    if (card.code === "R23") return benefit.includes("hàng không") || benefit.includes("hÃ ng khÃ´ng") ? "plane" : "shield";
    if (card.code === "R26" || card.code === "R29") return "hospital";
    return card.code === "R25" ? "hospital" : "shield";
  }

  function miniCardHeight(item, width, compact) {
    const title = compactBenefitTitle(getBenefitTitle(item));
    const charsPerLine = Math.max(16, Math.floor(width / (compact ? 9.2 : 10.2)));
    const lines = Math.max(1, Math.ceil(title.length / charsPerLine));
    return Math.max(compact ? 146 : 118, 78 + lines * 18);
  }

  function columnsForCard(card) {
    if (card.code === "R22") return 5;
    if (card.code === "R23") return 3;
    if (card.code === "R21") return 1;
    return Math.min(4, Math.max(1, card.rows.length));
  }

  function iconTypeFor(card, item) {
    const benefit = String(item?.benefit || "").toLowerCase();
    if (card.code === "R21") {
      if (benefit.includes("tim")) return "Heart";
      if (benefit.includes("quá»µ") || benefit.includes("quỵ")) return "Brain";
      if (benefit.includes("cuá»‘i") || benefit.includes("cuối")) return "Ribbon";
      return "HeartPulse";
    }
    if (card.code === "R22") {
      if (benefit.includes("máº¯t") || benefit.includes("mÃ¡ÂºÂ¯t")) return "Eye";
      if (benefit.includes("tai")) return "Ear";
      if (benefit.includes("chÃ¢n") || benefit.includes("chân")) return "Footprints";
      if (benefit.includes("ngÃ³n") || benefit.includes("ngón") || benefit.includes("tay")) return "Hand";
      if (benefit.includes("khá»›p") || benefit.includes("khớp") || benefit.includes("chi")) return "Accessibility";
      return "Shield";
    }
    if (card.code === "R23") return benefit.includes("hÃ ng khÃ´ng") || benefit.includes("hàng không") ? "Plane" : "Shield";
    if (card.code === "R26") {
      if (benefit.includes("phÃ²ng") || benefit.includes("giÆ°á»ng")) return "Bed";
      if (benefit.includes("khÃ¡m") || benefit.includes("váº­t") || benefit.includes("vật")) return "Stethoscope";
      return "Hospital";
    }
    if (card.code === "R29") {
      if (benefit.includes("váº­n chuyá»ƒn") || benefit.includes("cấp cứu")) return "Ambulance";
      if (benefit.includes("icu")) return "Activity";
      if (benefit.includes("viá»‡n") || benefit.includes("viện")) return "Bed";
      return "Hospital";
    }
    return card.code === "R25" ? "Hospital" : "Shield";
  }

  function miniCardHeight(item, width, compact) {
    const title = compactBenefitTitle(getBenefitTitle(item));
    const charsPerLine = Math.max(16, Math.floor(width / 8.8));
    const lines = Math.max(1, Math.ceil(title.length / charsPerLine));
    return Math.max(86, compact ? 150 + lines * 20 : 132 + lines * 20);
  }

  function columnsForCard(card) {
    if (card.code === "R22") return 4;
    if (card.code === "R23") return 3;
    if (card.code === "R21") return 1;
    return Math.min(4, Math.max(1, card.rows.length));
  }

  function gridHeight(card, rows, width) {
    const gap = 12;
    const cols = columnsForCard(card);
    const miniW = (width - gap * (cols - 1)) / cols;
    const rowHeights = [];
    rows.forEach((item, index) => {
      const rowIndex = Math.floor(index / cols);
      rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] || 0, miniCardHeight(item, miniW, card.code === "R22"));
    });
    return rowHeights.reduce((sum, h, index) => sum + h + (index ? gap : 0), 0);
  }

  function estimateInfographicCardHeight(card) {
    const innerW = 1156 - 44;
    if (card.code === "R21" && !card.continued) {
      return 92 + 240 + 34;
    }
    return 92 + gridHeight(card, card.rows, innerW) + 34;
  }

  function drawMiniCard(ctx, card, item, x, y, width, height) {
    const accent = getCardAccent(card.code);
    const payoutParts = parsePayoutText(item.payoutText);
    ctx.fillStyle = "#fbfdff";
    drawRoundedRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.strokeStyle = `${accent}33`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    drawLucideIcon(ctx, x + width / 2, y + 28, accent, iconTypeFor(card, item));
    const titleY = card.code === "R22" ? y + 75 : y + 61;
    if (card.code === "R22") {
      text(ctx, getBenefitGroup(item), x + width / 2, y + 54, {
        size: 13,
        weight: 900,
        color: accent,
        align: "center",
        maxWidth: width - 20
      });
    }
    const titleEnd = wrap(ctx, compactBenefitTitle(getBenefitTitle(item)), x + 12, titleY, width - 24, 20, {
      size: 15,
      weight: 850,
      color: COLORS.blue,
      align: "center"
    });
    const payoutY = Math.min(height - 58, Math.max(titleEnd - y + 10, height - 58));
    text(ctx, payoutParts.rate || "-", x + width / 2, y + payoutY, {
      size: 16,
      weight: 900,
      color: COLORS.red,
      align: "center",
      maxWidth: width - 20
    });
    text(ctx, payoutParts.amount || "-", x + width / 2, y + payoutY + 25, {
      size: 15,
      weight: 900,
      color: COLORS.text,
      align: "center",
      maxWidth: width - 20
    });
  }

  function drawGridCards(ctx, card, rows, x, y, width) {
    const gap = 12;
    const cols = columnsForCard(card);
    const miniW = (width - gap * (cols - 1)) / cols;
    const rowHeights = [];
    rows.forEach((item, index) => {
      const rowIndex = Math.floor(index / cols);
      rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] || 0, miniCardHeight(item, miniW, card.code === "R22"));
    });
    rows.forEach((item, index) => {
      const col = index % cols;
      const rowIndex = Math.floor(index / cols);
      const cardY = y + rowHeights.slice(0, rowIndex).reduce((sum, h) => sum + h + gap, 0);
      drawMiniCard(ctx, card, item, x + col * (miniW + gap), cardY, miniW, rowHeights[rowIndex]);
    });
    return y + rowHeights.reduce((sum, h, index) => sum + h + (index ? gap : 0), 0);
  }

  function drawR21ExclusiveGroup(ctx, card, x, y, width) {
    const rows = card.rows.filter(isR21ExclusiveBenefit).slice(0, 3);
    if (!rows.length) return;
    ctx.fillStyle = "#fff5f3";
    drawRoundedRect(ctx, x, y, width, 240, 14);
    ctx.fill();
    ctx.strokeStyle = "#ffc9c2";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const gap = 18;
    const miniW = (width - gap * 2) / 3;
    rows.forEach((item, index) => {
      if (index) text(ctx, "hoặc", x + index * (miniW + gap) - gap / 2, y + 86, { size: 17, weight: 800, color: COLORS.text, align: "center" });
      drawMiniCard(ctx, card, item, x + index * (miniW + gap), y + 48, miniW, 144);
    });
  }

  function drawInfographicCard(ctx, card, x, y, width) {
    const height = estimateInfographicCardHeight(card);
    const accent = getCardAccent(card.code);
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const pad = 22;
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, x + pad, y + 20, 74, 42, 8);
    ctx.fill();
    text(ctx, card.code, x + pad + 37, y + 29, { size: 22, weight: 900, color: "#fff", align: "center" });
    wrap(ctx, `${card.name}${card.continued ? " (tiếp)" : ""}`, x + pad + 96, y + 18, width - 450, 28, { size: 26, weight: 900, color: COLORS.blue });
    text(ctx, card.headline, x + width - pad, y + 27, { size: 20, weight: 900, color: COLORS.orange, align: "right", maxWidth: 360 });

    const contentX = x + pad;
    const contentY = y + 82;
    const contentW = width - pad * 2;
    if (card.code === "R21" && !card.continued) {
      const earlyRows = card.rows.filter((item) => !isR21ExclusiveBenefit(item));
      const leftW = 320;
      if (earlyRows.length) drawGridCards(ctx, card, earlyRows, contentX, contentY + 42, leftW);
      drawR21ExclusiveGroup(ctx, card, contentX + leftW + 18, contentY, contentW - leftW - 18);
    } else {
      drawGridCards(ctx, card, card.rows, contentX, contentY, contentW);
    }
    return y + height;
  }

  function estimateInfographicCardHeight(card) {
    const innerW = 1156 - 44;
    if (card.code === "R21" && !card.continued) {
      const earlyRows = card.rows.filter((item) => !isR21ExclusiveBenefit(item));
      const exclusiveRows = card.rows.filter(isR21ExclusiveBenefit).slice(0, 3);
      const topH = Math.max(132, earlyRows.length ? miniCardHeight(earlyRows[0], innerW, false) : 0);
      const groupMiniW = (innerW - 48 * 2 - 28 * 2) / 3;
      const groupMiniH = exclusiveRows.reduce((max, item) => Math.max(max, miniCardHeight(item, groupMiniW, false)), 132);
      return 92 + topH + 12 + groupMiniH + 44;
    }
    return 92 + gridHeight(card, card.rows, innerW) + 34;
  }

  function drawR21ExclusiveGroup(ctx, card, x, y, width) {
    const rows = card.rows.filter(isR21ExclusiveBenefit).slice(0, 3);
    if (!rows.length) return;
    const gap = 28;
    const orW = 48;
    const miniW = (width - orW * 2 - gap * 2) / 3;
    const miniH = rows.reduce((max, item) => Math.max(max, miniCardHeight(item, miniW, false)), 132);
    ctx.fillStyle = "#fff5f3";
    drawRoundedRect(ctx, x, y, width, miniH, 14);
    ctx.fill();
    ctx.strokeStyle = "#ffc9c2";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    rows.forEach((item, index) => {
      const itemX = x + index * (miniW + gap + orW);
      if (index) {
        text(ctx, "hoặc", itemX - orW / 2 - gap / 2, y + miniH / 2 - 10, { size: 17, weight: 800, color: COLORS.text, align: "center" });
      }
      drawMiniCard(ctx, card, item, itemX, y, miniW, miniH);
    });
  }

  function drawInfographicCard(ctx, card, x, y, width) {
    const height = estimateInfographicCardHeight(card);
    const accent = getCardAccent(card.code);
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const pad = 22;
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, x + pad, y + 20, 74, 42, 8);
    ctx.fill();
    text(ctx, card.code, x + pad + 37, y + 29, { size: 22, weight: 900, color: "#fff", align: "center" });
    wrap(ctx, `${card.name}${card.continued ? " (tiếp)" : ""}`, x + pad + 96, y + 18, width - 450, 28, { size: 26, weight: 900, color: COLORS.blue });
    text(ctx, card.headline, x + width - pad, y + 27, { size: 20, weight: 900, color: COLORS.orange, align: "right", maxWidth: 360 });

    const contentX = x + pad;
    const contentY = y + 82;
    const contentW = width - pad * 2;
    if (card.code === "R21" && !card.continued) {
      const earlyRows = card.rows.filter((item) => !isR21ExclusiveBenefit(item));
      const topH = Math.max(132, earlyRows.length ? miniCardHeight(earlyRows[0], contentW, false) : 0);
      if (earlyRows.length) drawMiniCard(ctx, card, earlyRows[0], contentX, contentY, contentW, topH);
      drawR21ExclusiveGroup(ctx, card, contentX, contentY + topH + 12, contentW);
    } else {
      drawGridCards(ctx, card, card.rows, contentX, contentY, contentW);
    }
    return y + height;
  }

  function chooseLayout(cards) {
    const rowCount = cards.reduce((sum, card) => sum + card.rows.length, 0);
    if (cards.length >= 5 || rowCount >= 22) {
      return { cardPadding: 16, cardHeaderH: 58, tableHeaderH: 34, rowH: 48, rowTextTop: 7, badgeH: 40, radius: 14, titleSize: 21, bodySize: 16, noteSize: 14, smallSize: 14, codeSize: 19, lineHeight: 18, gap: 12 };
    }
    if (cards.length >= 3 || rowCount >= 13) {
      return { cardPadding: 18, cardHeaderH: 64, tableHeaderH: 36, rowH: 56, rowTextTop: 9, badgeH: 44, radius: 16, titleSize: 23, bodySize: 18, noteSize: 15, smallSize: 15, codeSize: 21, lineHeight: 20, gap: 14 };
    }
    return { cardPadding: 22, cardHeaderH: 76, tableHeaderH: 40, rowH: 66, rowTextTop: 12, badgeH: 52, radius: 18, titleSize: 29, bodySize: 21, noteSize: 18, smallSize: 17, codeSize: 24, lineHeight: 23, gap: 18 };
  }

  function paginateCards(cards, layout) {
    const pages = [[]];
    const contentHeight = IMAGE_HEIGHT - 300;
    let used = 0;
    cards.forEach((card) => {
      const cardHeight = estimateCardHeight(card, layout);
      const nextHeight = used ? used + layout.gap + cardHeight : cardHeight;
      if (pages[pages.length - 1].length && nextHeight > contentHeight) {
        pages.push([card]);
        used = cardHeight;
      } else {
        pages[pages.length - 1].push(card);
        used = nextHeight;
      }
    });
    return pages;
  }

  function splitCardForInfographic(card, maxHeight) {
    if (estimateInfographicCardHeight(card) <= maxHeight || card.code === "R21") return [card];
    const chunks = [];
    let currentRows = [];
    card.rows.forEach((item) => {
      const candidate = { ...card, rows: [...currentRows, item], continued: chunks.length > 0 };
      if (currentRows.length && estimateInfographicCardHeight(candidate) > maxHeight) {
        chunks.push({ ...card, rows: currentRows, continued: chunks.length > 0 });
        currentRows = [item];
      } else {
        currentRows.push(item);
      }
    });
    if (currentRows.length) chunks.push({ ...card, rows: currentRows, continued: chunks.length > 0 });
    return chunks;
  }

  function paginateInfographicCards(cards) {
    const pages = [[]];
    const topY = 306;
    const footerTop = IMAGE_HEIGHT - 96;
    const maxPageContentHeight = footerTop - topY - 18;
    let used = 0;
    cards.flatMap((card) => splitCardForInfographic(card, maxPageContentHeight)).forEach((card) => {
      const cardHeight = estimateInfographicCardHeight(card);
      const nextHeight = used ? used + 16 + cardHeight : cardHeight;
      if (pages[pages.length - 1].length && nextHeight > maxPageContentHeight) {
        pages.push([card]);
        used = cardHeight;
      } else {
        pages[pages.length - 1].push(card);
        used = nextHeight;
      }
    });
    return pages;
  }

  function paginateBenefitCards(cards) {
    return paginateInfographicCards(cards);
  }

  function drawFooter(ctx) {
    ctx.fillStyle = "#fff8ed";
    drawRoundedRect(ctx, 42, IMAGE_HEIGHT - 96, 1156, 60, 12);
    ctx.fill();
    wrap(ctx, "Lưu ý: Quyền lợi và mức chi trả trên là tóm tắt minh họa; việc chi trả thực tế căn cứ Quy tắc, Điều khoản sản phẩm và hồ sơ yêu cầu giải quyết quyền lợi được Bảo Việt Nhân thọ chấp thuận.", 68, IMAGE_HEIGHT - 82, 1100, 20, {
      size: 16,
      weight: 700,
      color: "#7a4a00"
    });
  }

  function createPageCanvas(data, cards, layout, pageNumber, pageCount) {
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    drawHeader(ctx, data, pageNumber, pageCount);
    let y = drawInfoStrip(ctx, data, 178);
    cards.forEach((card, index) => {
      if (index) y += layout.gap;
      y = drawCard(ctx, card, 42, y, 1156, layout);
    });
    drawFooter(ctx);
    return canvas;
  }

  function createInfographicPageCanvas(data, cards, pageNumber, pageCount) {
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    drawHeader(ctx, data, pageNumber, pageCount);
    let y = drawInfoStrip(ctx, data, 178);
    cards.forEach((card, index) => {
      if (index) y += 16;
      y = drawInfographicCard(ctx, card, 42, y, 1156);
    });
    drawFooter(ctx);
    return canvas;
  }

  function createAddonBenefitSummaryPages(data, config = {}) {
    const cards = buildAddonCards(data, config);
    if (!cards.length) {
      const canvas = document.createElement("canvas");
      canvas.width = IMAGE_WIDTH;
      canvas.height = IMAGE_HEIGHT;
      const ctx = canvas.getContext("2d");
      drawHeader(ctx, data, 1, 1);
      const y = drawInfoStrip(ctx, data, 178);
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(ctx, 42, y, 1156, 190, 18);
      ctx.fill();
      wrap(ctx, "Chưa chọn sản phẩm bán kèm để tóm tắt quyền lợi bảo vệ.", 76, y + 54, 1080, 38, {
        size: 30,
        weight: 800,
        color: COLORS.muted
      });
      drawFooter(ctx);
      return [canvas];
    }

    const pages = paginateBenefitCards(cards);
    return pages.map((pageCards, index) => createInfographicPageCanvas(data, pageCards, index + 1, pages.length));
  }

  window.AddonBenefitSummaryService = {
    createAddonBenefitSummaryPages,
    buildAddonCards
  };
})();
