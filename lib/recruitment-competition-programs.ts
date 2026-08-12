import type { RewardProgramInput } from "@/lib/tvv-reward-estimator";

export const STARTUP_COMPANION_PROGRAM_ID = "dong-hanh-khoi-nghiep-2026-08";
export const EARLY_SUCCESS_PROGRAM_ID = "thanh-cong-som-phat-trien-ben-quy-3-2026";

export const startupCompanionRecruitmentProgram: RewardProgramInput = {
  id: STARTUP_COMPANION_PROGRAM_ID,
  programName: "Đồng hành khởi nghiệp",
  status: "Đang diễn ra",
  originalFileUrl: "/competitions/dong-hanh-khoi-nghiep-2026-08.jpg",
  originalFileName: "Đồng hành khởi nghiệp 08-2026.jpg",
  rule: {
    id: STARTUP_COMPANION_PROGRAM_ID,
    program_name: "Đồng hành khởi nghiệp",
    start_date: "2026-08-10",
    end_date: "2026-08-23",
    issue_deadline: "2026-08-31",
    target_type: ["agent"],
    metric_type: ["ip"],
    min_policy_ip: null,
    excluded_statuses: ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực", "Hoàn phí"],
    reward_rules: [{
      id: "startup-companion-revenue-tier",
      prize_name: "Thưởng Đồng hành khởi nghiệp",
      target_type: "TVV",
      metric_type: "ip",
      reward_type: "reward_by_revenue_tier",
      calculation_logic: "Tổng IP/PĐT của TVV trong thời gian chương trình",
      condition_text: "PĐT từ 15 triệu trong 10–23/08/2026, hợp đồng phát hành chậm nhất 31/08/2026",
      thresholds: [
        { min_ip: 15_000_000, reward_amount: 1_500_000, prize_name: "Mốc PĐT 15 triệu" },
        { min_ip: 25_000_000, reward_amount: 2_500_000, prize_name: "Mốc PĐT 25 triệu" },
        { min_ip: 50_000_000, reward_percent: "10%", prize_name: "Mốc PĐT 50 triệu" }
      ]
    }],
    max_reward: null,
    notes: [
      "Áp dụng cho TVV mới tháng 08/2026 và TVV mới tháng 06–07/2026 chưa hoạt động.",
      "Mô phỏng tuyển dụng là trường hợp TVV mới nên được xét chương trình này."
    ]
  }
};

export const earlySuccessRecruitmentProgram: RewardProgramInput = {
  id: EARLY_SUCCESS_PROGRAM_ID,
  programName: "Thành công sớm – Phát triển bền Quý 3",
  status: "Đang diễn ra",
  originalFileUrl: "/competitions/thanh-cong-som-phat-trien-ben-quy-3-2026.jpg",
  originalFileName: "Thành công sớm – Phát triển bền Quý 3.jpg",
  rule: {
    id: EARLY_SUCCESS_PROGRAM_ID,
    program_name: "Thành công sớm – Phát triển bền Quý 3",
    start_date: "2026-07-01",
    end_date: "2026-12-31",
    issue_deadline: "2027-01-06",
    target_type: ["agent"],
    metric_type: ["ip", "policy_count"],
    min_policy_ip: 7_000_000,
    min_policy_afyp: 15_000_000,
    excluded_statuses: ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực", "Hoàn phí"],
    reward_rules: [{
      id: "early-success-revenue-tier",
      prize_name: "Thưởng Thành công sớm – Phát triển bền",
      target_type: "TVV",
      reward_recipient_type: "tvv",
      metric_type: "ip",
      reward_type: "reward_by_revenue_tier",
      reward_value_type: "gift",
      calculation_logic: "Tổng IP/PĐT của TVV trong thời gian chương trình",
      condition_text: "Tối thiểu 6 HĐ; mỗi HĐ có AFYP từ 15 triệu và PĐT từ 7 triệu; phát hành đến 06/01/2027",
      condition: { min_contract_count: 6 },
      thresholds: [
        {
          min_ip: 120_000_000,
          gift_name: "01 vé khảo sát Thái Lan + 01 vali kéo + 01 bộ áo mũ đồng phục"
        },
        {
          min_ip: 200_000_000,
          gift_name: "Gói Thái Lan 2 người + 01 vali kéo + 02 bộ áo mũ đồng phục"
        }
      ]
    }],
    max_reward: null,
    notes: [
      "Dành cho TVV mới có ngày bắt đầu làm việc từ 01/07–30/09/2026.",
      "TVV hoạt động trong 90 ngày làm việc đầu tiên."
    ]
  }
};

export const recruitmentOnlyCompetitionPrograms = [
  startupCompanionRecruitmentProgram,
  earlySuccessRecruitmentProgram
];
