import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("upload_batches")
      .select("id, uploaded_at, uploaded_by, uploaded_by_name, data_month, file_name, row_count, status, error_message")
      .order("uploaded_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return NextResponse.json(
      { uploads: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload history error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
