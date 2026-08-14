import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể cập nhật ảnh CTTĐ.";
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const programId = String(formData.get("program_id") ?? "").trim();
    const file = formData.get("file");
    if (!programId) return NextResponse.json({ error: "Thiếu mã CTTĐ." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Chưa chọn ảnh mới." }, { status: 400 });
    if (!IMAGE_TYPES[file.type]) return NextResponse.json({ error: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Ảnh phải có dung lượng không quá 10 MB." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: program, error: programError } = await supabase
      .from("competition_programs").select("id").eq("id", programId).maybeSingle();
    if (programError) throw programError;
    if (!program) return NextResponse.json({ error: "Không tìm thấy CTTĐ." }, { status: 404 });

    const objectPath = `${new Date().getUTCFullYear()}/${programId}-${Date.now()}.${IMAGE_TYPES[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("competition-images")
      .upload(objectPath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("competition-images").getPublicUrl(objectPath);
    const imageUrl = publicUrlData.publicUrl;
    const { data: updatedProgram, error: updateError } = await supabase
      .from("competition_programs")
      .update({ original_file_url: imageUrl, original_file_name: file.name, updated_at: new Date().toISOString() })
      .eq("id", programId).select("*").single();
    if (updateError) throw updateError;

    return NextResponse.json({ imageUrl, program: updatedProgram });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
