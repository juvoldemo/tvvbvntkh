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
    "reward_type": "reward_per_contract | top_n_newly_seen_contracts | top_n_earliest_contracts | reward_per_active_advisor | reward_by_revenue_tier | reward_by_product | reward_by_policy_count | custom_ai_rule",
    "target_type": "TVV | Nhóm | ADS | Hợp đồng | Công ty",
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

Nếu poster có các cụm như "hợp đồng nộp phí sớm nhất", "hợp đồng nộp phí mới nhất", "hợp đồng đầu tiên", "top hợp đồng nộp phí", "hồ sơ nộp phí sớm nhất", "hợp đồng phát sinh mới" thì dùng reward_type "top_n_newly_seen_contracts". Đặt top_n theo poster, order_by "first_seen_at_asc" cho sớm nhất/đầu tiên và "first_seen_at_desc" cho mới nhất. Không dùng top_n_earliest_contracts nếu dữ liệu không có giờ thu phí.

Phân loại target_type bắt buộc theo từng reward_rule:
- Nếu condition_text có "Tổng doanh thu/nhóm", "Doanh thu nhóm", "Tổng IP nhóm", "Tổng AFYP nhóm", "theo nhóm", "mỗi nhóm" thì target_type = "Nhóm".
- Nếu condition_text có "hợp đồng", "HĐ", "nộp phí sớm nhất", "nộp phí mới nhất" thì target_type = "Hợp đồng".
- Nếu điều kiện theo TVV/tư vấn viên/cá nhân thì target_type = "TVV".
- Không trộn kết quả của các target_type với nhau; giải Hợp đồng không được sinh kết quả Nhóm.`;

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

    const aiRule = await analyzeWithOpenAI(file);
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
