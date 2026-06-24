import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_OPENAI_BASE_URL = "https://api.shopaikey.com/v1";
const DEFAULT_OPENAI_COMPETITION_MODEL = "gpt-5.5";

const RULE_SCHEMA_HINT = `{
  "program_name": "",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "issue_deadline": "YYYY-MM-DD",
  "target_types": ["TVV", "Nhóm", "ADS", "Hợp đồng"],
  "metric_type": "IP | AFYP | PĐT | Số HĐ | TVV hoạt động | Doanh thu nhóm",
  "min_policy_ip": 0,
  "min_policy_afyp": 0,
  "eligible_products": [],
  "excluded_statuses": ["YCBH hết hiệu lực", "Từ chối", "Trì hoãn", "Hết hiệu lực"],
  "included_statuses": [],
  "reward_rules": [{
    "id": "",
    "reward_name": "",
    "reward_type": "reward_per_contract | reward_by_policy_pdt_table | top_n_newly_seen_contracts | top_n_earliest_contracts | reward_per_active_advisor | reward_by_revenue_tier | reward_by_product | reward_by_policy_count | custom_ai_rule",
    "target_type": "TVV | Nhóm | ADS | Hợp đồng | Công ty",
    "reward_recipient_type": "Hợp đồng | TVV | Nhóm | ADS | Công ty",
    "result_tab": "HĐ đạt | TVV đạt | Nhóm đạt | ADS đạt",
    "condition_text": "",
    "threshold_value": 0,
    "threshold_operator": ">=",
    "calculation_logic": "",
    "thresholds": [],
    "reward_amount": 0,
    "reward_formula": "",
    "payout_scope": "per_contract | per_tvv | per_group | shared_group | custom",
    "payout_target": "contract | tvv | group",
    "split_method": "none | equal_per_active_tvv | equal_per_qualified_tvv | by_metric_ratio",
    "display_columns": ["reward_per_tvv", "group_reward_amount", "reward_note"],
    "note_template": "",
    "max_reward": null,
    "priority": 1
  }],
  "max_reward": null,
  "notes": "",
  "ai_summary": "",
  "confidence": 0,
  "needs_review": true,
  "extracted_text": ""
}

Nếu poster có bảng bậc "PĐT/HĐ từ" với hai cột thưởng SPC và HĐ còn lại, bắt buộc tạo DUY NHẤT một reward_rule có reward_type = "reward_by_policy_pdt_table", target_type = "Hợp đồng", spc_products = [mã SPC], và pdt_reward_tiers theo dạng [{"min_pdt":50000000,"spc_reward":"8%","other_reward":"6%"}]. min_pdt luôn là số tiền VND; mức thưởng cố định là số, còn tỷ lệ giữ chuỗi có dấu %.

Nếu poster có các cụm như "hợp đồng nộp phí sớm nhất", "hợp đồng nộp phí mới nhất", "hợp đồng đầu tiên", "top hợp đồng nộp phí", "hồ sơ nộp phí sớm nhất", "hợp đồng phát sinh mới" thì dùng reward_type "top_n_newly_seen_contracts". Đặt top_n theo poster, order_by "first_seen_at_asc" cho sớm nhất/đầu tiên và "first_seen_at_desc" cho mới nhất. Không dùng top_n_earliest_contracts nếu dữ liệu không có giờ thu phí.

Phân loại target_type bắt buộc theo từng reward_rule:
- Nếu condition_text có "Tổng doanh thu/nhóm", "Doanh thu nhóm", "Tổng IP nhóm", "Tổng AFYP nhóm", "theo nhóm", "mỗi nhóm" thì target_type = "Nhóm".
- Nếu condition_text có "hợp đồng", "HĐ", "nộp phí sớm nhất", "nộp phí mới nhất" thì target_type = "Hợp đồng".
- Nếu điều kiện theo TVV/tư vấn viên/cá nhân thì target_type = "TVV".
- target_type chỉ là đối tượng dùng để xét điều kiện, không phải lúc nào cũng là đối tượng nhận thưởng.
- Nếu poster/rule có KPI hoặc điều kiện liên quan đến Nhóm như "Tổng doanh thu/nhóm", "Doanh thu nhóm", "Tổng IP nhóm", "Tổng AFYP nhóm", "Chỉ tiêu nhóm", "KPI nhóm", "Nhóm đạt", "Theo nhóm", "Mỗi nhóm", "Nhóm có doanh thu", "Số HĐ/nhóm", "TVV hoạt động trong nhóm" thì bắt buộc đặt target_type = "Nhóm", reward_recipient_type = "Nhóm", result_tab = "Nhóm đạt".

Phân loại reward_recipient_type bắt buộc theo từng reward_rule:
- Nếu cụm thưởng có "/HĐ", "/hợp đồng", "mỗi HĐ", "mỗi hợp đồng" thì reward_recipient_type = "Hợp đồng".
- Nếu cụm thưởng có "/TVV hoạt động", "/TVV", "mỗi TVV", "tư vấn viên" thì reward_recipient_type = "TVV", trừ khi rule là KPI/điều kiện theo Nhóm thì vẫn đặt reward_recipient_type = "Nhóm" và tổng thưởng nhóm = số TVV hoạt động * mức thưởng.
- Nếu cụm thưởng có "/Nhóm", "thưởng nhóm", "mỗi nhóm" thì reward_recipient_type = "Nhóm".
- Nếu cụm thưởng có "/ADS" hoặc "thưởng ADS" thì reward_recipient_type = "ADS".
- Ví dụ "Tổng doanh thu/nhóm >= 100tr, thưởng 500.000đ/TVV hoạt động": target_type = "Nhóm", reward_recipient_type = "Nhóm", result_tab = "Nhóm đạt"; tổng thưởng nhóm = số TVV hoạt động * 500.000đ.
- Với rule KPI nhóm thưởng "xxxđ/TVV hoạt động", kết quả chính vẫn là Nhóm đạt: đặt result_tab = "Nhóm đạt" và không tạo danh sách TVV riêng trừ khi poster yêu cầu rõ danh sách TVV đạt thưởng riêng.
- Không trộn kết quả của các result_tab với nhau; tab kết quả phải theo result_tab/target_type nhóm trước, sau đó mới theo reward_recipient_type.`;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown analyze poster error.";
  }
}

function safeJsonParse(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || trimmed;
  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(source.slice(first, last + 1));
  return JSON.parse(source);
}

function normalizeRuleText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function inferRewardRecipientType(rule: any) {
  const explicit = String(rule?.reward_recipient_type || rule?.recipient_type || rule?.recipient || rule?.condition?.reward_recipient_type || rule?.condition?.recipient_type || rule?.condition?.recipient || "").trim();
  if (explicit) return explicit;
  const text = normalizeRuleText([
    rule?.reward_name,
    rule?.prize_name,
    rule?.condition_text,
    rule?.calculation_logic,
    rule?.reward_formula,
    rule?.reward_type,
    rule?.condition?.type,
    rule?.condition?.text,
    rule?.condition?.description
  ].join(" "));
  if (isGroupRuleText(text)) return "Nhóm";
  if (text.includes("/tvv") || text.includes("tvv hoat dong") || text.includes("moi tvv") || text.includes("tu van vien")) return "TVV";
  if (text.includes("/hd") || text.includes("/hop dong") || text.includes("moi hd") || text.includes("moi hop dong") || text.includes("pdt/hd")) return "Hợp đồng";
  if (text.includes("/nhom") || text.includes("thuong nhom") || text.includes("moi nhom")) return "Nhóm";
  if (text.includes("/ads") || text.includes("thuong ads")) return "ADS";
  if (text.includes("active_advisor")) return "TVV";
  if (text.includes("per_contract") || text.includes("per_policy") || text.includes("policy_pdt") || text.includes("top_n")) return "Hợp đồng";
  return rule?.target_type || "Hợp đồng";
}

function isGroupRuleText(text: string) {
  return [
    "tong doanh thu/nhom",
    "tong doanh thu nhom",
    "doanh thu nhom",
    "tong ip nhom",
    "tong afyp nhom",
    "chi tieu nhom",
    "kpi nhom",
    "nhom dat",
    "theo nhom",
    "moi nhom",
    "nhom co doanh thu",
    "so hd/nhom",
    "so hop dong/nhom",
    "tvv hoat dong trong nhom"
  ].some((phrase) => text.includes(phrase));
}

function normalizeRewardRecipientTypes(rule: any) {
  return {
    ...rule,
    reward_rules: Array.isArray(rule?.reward_rules)
      ? rule.reward_rules.map((item: any) => {
        const text = normalizeRuleText([
          item?.target_type,
          item?.result_tab,
          item?.condition_text,
          item?.calculation_logic,
          item?.reward_formula,
          item?.reward_name,
          item?.prize_name,
          item?.condition?.text,
          item?.condition?.description,
          item?.condition?.metric
        ].join(" "));
        const isGroup = isGroupRuleText(text);
        return {
          ...item,
          target_type: isGroup ? "Nhóm" : item.target_type,
          reward_recipient_type: isGroup ? "Nhóm" : inferRewardRecipientType(item),
          result_tab: isGroup ? "Nhóm đạt" : item.result_tab
        };
      })
      : []
  };
}

function getOpenAIConfig() {
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OPENAI_COMPETITION_MODEL || DEFAULT_OPENAI_COMPETITION_MODEL;
  const provider = baseUrl.includes("api.openai.com")
    ? "OpenAI chính thức"
    : baseUrl.includes("shopaikey.com")
      ? "ShopAIKey"
      : "OpenAI-compatible endpoint";

  return { baseUrl, model, provider };
}

async function analyzeWithOpenAI(competitionText: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình OpenAI API key.");
  const openAIConfig = getOpenAIConfig();

  console.info("[OpenAI] OPENAI_BASE_URL:", openAIConfig.baseUrl);
  console.info("[OpenAI] model:", openAIConfig.model);
  console.info("[OpenAI] Đang dùng:", openAIConfig.provider);

  const prompt = [
    "Bạn là chuyên gia chuyển thể lệ chương trình thi đua bảo hiểm từ câu văn thành rule có cấu trúc.",
    "Hãy đọc kỹ nội dung người dùng nhập, trích xuất đầy đủ điều kiện và tạo rule JSON hợp lệ.",
    "Không tự thêm điều kiện, mức thưởng hoặc thời gian không có trong nội dung.",
    "Chỉ trả về JSON, không thêm markdown.",
    "Nếu không chắc phần nào, đặt needs_review=true, confidence thấp và ghi warning trong notes.",
    "Đặt extracted_text bằng nguyên văn nội dung người dùng cung cấp.",
    "Schema bắt buộc:",
    RULE_SCHEMA_HINT,
    "NỘI DUNG CHƯƠNG TRÌNH DO NGƯỜI DÙNG NHẬP:",
    competitionText
  ].join("\n\n");

  const response = await fetch(`${openAIConfig.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAIConfig.model,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "AI không tạo được rule từ nội dung.");
  const text = payload.output_text || payload.output?.flatMap((item: any) => item.content ?? []).map((part: any) => part.text ?? "").join("\n") || "";
  if (!text.trim()) throw new Error("AI không trả về rule phân tích.");
  return safeJsonParse(text);
}

export async function POST(request: NextRequest) {
  let programId: string | null = null;
  try {
    const body = await request.json();
    const competitionText = String(body.competitionText || body.competition_text || "").trim();
    const existingProgramId = String(body.programId || body.program_id || "").trim();
    const createdBy = String(body.createdBy || "dashboard").trim();
    if (!competitionText) {
      return NextResponse.json({ error: "Chưa nhập nội dung chương trình thi đua." }, { status: 400 });
    }
    if (competitionText.length < 20) {
      return NextResponse.json({ error: "Nội dung chương trình quá ngắn để tạo rule." }, { status: 400 });
    }

    const aiRule = normalizeRewardRecipientTypes(await analyzeWithOpenAI(competitionText));
    aiRule.extracted_text = competitionText;
    const programName = String(aiRule.program_name || "Chương trình thi đua").trim();
    const supabase = getSupabaseAdmin();

    const programPayload = {
        program_name: programName,
        original_file_url: null,
        original_file_name: null,
        extracted_text: competitionText,
        ai_summary: aiRule.ai_summary || "",
        ai_rule: aiRule,
        status: "Chờ xác nhận",
        start_date: aiRule.start_date || null,
        end_date: aiRule.end_date || null,
        issue_deadline: aiRule.issue_deadline || null,
        target_types: aiRule.target_types || [],
        confidence: Number(aiRule.confidence ?? 0),
        needs_review: Boolean(aiRule.needs_review ?? true),
        created_by: createdBy || null,
        updated_at: new Date().toISOString()
      };
    const query = existingProgramId
      ? supabase.from("competition_programs").update(programPayload).eq("id", existingProgramId)
      : supabase.from("competition_programs").insert(programPayload);
    const { data: program, error } = await query
      .select("*")
      .single();
    if (error) throw new Error(errorMessage(error));
    programId = program.id;

    await supabase.from("competition_ai_logs").insert({
      program_id: program.id,
      prompt: competitionText,
      ai_response: aiRule,
      error: null
    });

    return NextResponse.json({ program, aiRule });
  } catch (error) {
    try {
      if (programId) {
        await getSupabaseAdmin().from("competition_ai_logs").insert({
          program_id: programId,
          prompt: "analyze-poster",
          error: errorMessage(error)
        });
      }
    } catch {
      // Logging failure should not hide the original error.
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
