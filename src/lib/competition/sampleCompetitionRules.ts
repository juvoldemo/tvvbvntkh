export type CompetitionRule = {
  id: string;
  program_name: string;
  start_date: string;
  end_date: string;
  issue_deadline: string;
  target_type: Array<"policy" | "agent" | "group" | "ads" | "company">;
  metric_type: Array<"ip" | "afyp" | "policy_count" | "paid_time" | "active_agent_count">;
  min_policy_ip: number | null;
  min_policy_afyp: number | null;
  excluded_statuses: string[];
  included_statuses: string[];
  reward_rules: Array<
    | {
        id: string;
        prize_name: string;
        target_type: "policy";
        metric_type: "paid_time";
        condition: {
          type: "top_n_newly_seen_contracts";
          order_by?: "first_seen_at_asc" | "first_seen_at_desc";
          limit: number;
          policy_filters: {
            min_policy_ip: number;
            issue_deadline: string;
          };
        };
        reward: {
          type: "fixed_amount_per_policy";
          amount: number;
          currency: "VND";
        };
      }
    | {
        id: string;
        prize_name: string;
        target_type: "group";
        metric_type: "ip";
        condition: {
          type: "reward_per_active_advisor_by_group_revenue_tier";
          revenue_metric: "ip";
          active_agent_definition: {
            min_valid_policy_count: number;
          };
          tiers: Array<{
            min_group_revenue: number;
            reward_per_active_agent: number;
          }>;
        };
        reward: {
          type: "tiered_amount_per_active_agent";
          currency: "VND";
        };
      }
  >;
  max_reward: number | null;
  notes: string[];
  created_at: string;
  updated_at: string;
};

export const nguocSongVuonLenRule: CompetitionRule = {
  id: "nguoc-song-vuon-len-2026-06",
  program_name: "Thi đua NGƯỢC SÓNG VƯƠN LÊN",
  start_date: "2026-06-18",
  end_date: "2026-06-23",
  issue_deadline: "2026-07-07",
  target_type: ["policy", "group", "agent"],
  metric_type: ["ip", "policy_count", "paid_time", "active_agent_count"],
  min_policy_ip: 15_000_000,
  min_policy_afyp: null,
  excluded_statuses: [
    "YCBH hết hiệu lực",
    "Từ chối",
    "Trì hoãn",
    "Hết hiệu lực"
  ],
  included_statuses: [],
  reward_rules: [
    {
      id: "chien-binh-toc-do",
      prize_name: "Chiến binh tốc độ",
      target_type: "policy",
      metric_type: "paid_time",
      condition: {
        type: "top_n_newly_seen_contracts",
        order_by: "first_seen_at_asc",
        limit: 10,
        policy_filters: {
          min_policy_ip: 15_000_000,
          issue_deadline: "2026-07-07"
        }
      },
      reward: {
        type: "fixed_amount_per_policy",
        amount: 500_000,
        currency: "VND"
      }
    },
    {
      id: "biet-doi-toan-dien",
      prize_name: "Biệt đội toàn diện",
      target_type: "group",
      metric_type: "ip",
      condition: {
        type: "reward_per_active_advisor_by_group_revenue_tier",
        revenue_metric: "ip",
        active_agent_definition: {
          min_valid_policy_count: 1
        },
        tiers: [
          {
            min_group_revenue: 100_000_000,
            reward_per_active_agent: 500_000
          },
          {
            min_group_revenue: 150_000_000,
            reward_per_active_agent: 800_000
          },
          {
            min_group_revenue: 200_000_000,
            reward_per_active_agent: 1_000_000
          }
        ]
      },
      reward: {
        type: "tiered_amount_per_active_agent",
        currency: "VND"
      }
    }
  ],
  max_reward: null,
  notes: [
    "Điều kiện chung áp dụng cho hợp đồng hợp lệ: IP/HĐ >= 15 triệu.",
    "Giải Chiến binh tốc độ xét 10 hợp đồng nộp phí sớm nhất trong thời gian thi đua.",
    "Giải Biệt đội toàn diện xét tổng doanh thu nhóm và số TVV hoạt động.",
    "File này chỉ mô tả rule mẫu, chưa thực hiện tính thưởng thật."
  ],
  created_at: "2026-06-18T00:00:00+07:00",
  updated_at: "2026-06-18T00:00:00+07:00"
};

export const sampleCompetitionRules = [nguocSongVuonLenRule];
