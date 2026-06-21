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
    "calculation_logic": "",
    "thresholds": [],
    "reward_amount": 0,
    "reward_formula": "",
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

async function uploadPosterToStorage(file: File, programName: string) {
  const supabase = getSupabaseAdmin();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${Date.now()}-${programName.slice(0, 48).replace(/[^\w\-]+/g, "_") || "poster"}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("competition-posters")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
  if (error) return { url: "", path, error: errorMessage(error) };
  const { data } = supabase.storage.from("competition-posters").getPublicUrl(path);
  return { url: data.publicUrl || "", path, error: "" };
}

async function analyzeWithOpenAI(file: File) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình OpenAI API key.");
  const openAIConfig = getOpenAIConfig();

  console.info("[OpenAI] OPENAI_BASE_URL:", openAIConfig.baseUrl);
  console.info("[OpenAI] model:", openAIConfig.model);
  console.info("[OpenAI] Đang dùng:", openAIConfig.provider);

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
  const prompt = [
    "Bạn là chuyên gia đọc poster chương trình thi đua bảo hiểm.",
    "Hãy OCR toàn bộ poster, trích xuất điều kiện và tạo rule JSON hợp lệ.",
    "Chỉ trả về JSON, không thêm markdown.",
    "Nếu không chắc phần nào, đặt needs_review=true, confidence thấp và ghi warning trong notes.",
    "Schema bắt buộc:",
    RULE_SCHEMA_HINT
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
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl, detail: "high" }
          ]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "AI không đọc được ảnh poster.");
  const text = payload.output_text || payload.output?.flatMap((item: any) => item.content ?? []).map((part: any) => part.text ?? "").join("\n") || "";
  if (!text.trim()) throw new Error("AI không trả về nội dung phân tích poster.");
  return safeJsonParse(text);
}

export async function POST(request: NextRequest) {
  let programId: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const createdBy = String(formData.get("createdBy") || "dashboard").trim();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn ảnh poster JPG/PNG." }, { status: 400 });
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type || "")) {
      return NextResponse.json({ error: "Poster phải là ảnh JPG, PNG hoặc WEBP." }, { status: 400 });
    }

    const aiRule = normalizeRewardRecipientTypes(await analyzeWithOpenAI(file));
    const programName = String(aiRule.program_name || "Chương trình thi đua").trim();
    const upload = await uploadPosterToStorage(file, programName);
    const supabase = getSupabaseAdmin();

    const { data: program, error } = await supabase
      .from("competition_programs")
      .insert({
        program_name: programName,
        original_file_url: upload.url || null,
        original_file_name: file.name,
        extracted_text: aiRule.extracted_text || aiRule.extractedText || "",
        ai_summary: aiRule.ai_summary || "",
        ai_rule: aiRule,
        status: "Chờ xác nhận",
        start_date: aiRule.start_date || null,
        end_date: aiRule.end_date || null,
        issue_deadline: aiRule.issue_deadline || null,
        target_types: aiRule.target_types || [],
        confidence: Number(aiRule.confidence ?? 0),
        needs_review: Boolean(aiRule.needs_review ?? true),
        created_by: createdBy || null
      })
      .select("*")
      .single();
    if (error) throw new Error(errorMessage(error));
    programId = program.id;

    await supabase.from("competition_ai_logs").insert({
      program_id: program.id,
      prompt: "analyze-poster",
      ai_response: aiRule,
      error: upload.error || null
    });

    return NextResponse.json({ program, aiRule, storageWarning: upload.error || null });
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
