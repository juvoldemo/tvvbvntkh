import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Thiếu cấu hình Supabase trong .env.local.");

async function main() {
  const supabase = createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false }
  });
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const { error } = await supabase.from("authorized_users").upsert({
    advisor_code: "ADMINTN",
    full_name: "Quản trị tuyển dụng",
    start_date: date,
    advisor_status: "Đang hoạt động",
    advisor_position: "Quản trị tuyển dụng",
    password_hash: "plain:MDAwMA",
    password_plain: "0000",
    is_active: true,
    updated_at: now.toISOString()
  }, { onConflict: "advisor_code" });

  if (error) throw error;

  const { data, error: readError } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,is_active")
    .eq("advisor_code", "ADMINTN")
    .single();

  if (readError) throw readError;
  console.log(`Đã tạo tài khoản ${data.advisor_code} (${data.full_name}), hoạt động: ${data.is_active ? "có" : "không"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
