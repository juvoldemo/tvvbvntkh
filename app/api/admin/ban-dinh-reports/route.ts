import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { BanDinhReport, validBanDinhCounts } from "@/lib/ban-dinh";
import { readBanDinhSession } from "@/lib/ban-dinh-server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Chưa đăng nhập admin." }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const storage = supabase.storage.from("ban-dinh-reports");
    const session = await readBanDinhSession();
    const prefix = session.reportPrefix || "latest";
    const files: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } }, { cache: "no-store" });
      if (error) {
        if (["400", "404"].includes(String((error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(error.message)) break;
        throw error;
      }
      files.push(...(data || []).filter(file => file.name.endsWith(".json")).map(file => file.name));
      if (!data || data.length < 100) break;
    }
    const rows: BanDinhReport[] = [];
    for (let offset = 0; offset < files.length; offset += 10) {
      rows.push(...await Promise.all(files.slice(offset, offset + 10).map(async file => {
        const { data, error } = await storage.download(`${prefix}/${file}`, { cacheNonce: randomUUID() }, { cache: "no-store" });
        if (error || !data) throw error || new Error("Missing report");
        const entry = JSON.parse(await data.text());
        const advisorCode = entry?.advisorCode;
        const updatedAt = entry?.updatedAt;
        if (typeof entry?.advisorCode !== "string" || `${encodeURIComponent(entry.advisorCode)}.json` !== file || typeof entry.updatedAt !== "string" || !Number.isFinite(Date.parse(entry.updatedAt)) || !validBanDinhCounts(entry)) throw new Error("Invalid report");
        return { advisorCode, advisorName: advisorCode, groupName: "", consultations: entry.consultations, contracts: entry.contracts, updatedAt };
      })));
    }
    // Resolve names only for users with saved reports, in bounded batches.
    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      const { data, error } = await supabase.from("authorized_users").select("advisor_code,full_name,group_name").in("advisor_code", batch.map(row => row.advisorCode));
      if (error) throw error;
      const profiles = new Map((data || []).map(user => [user.advisor_code, user]));
      batch.forEach(row => { row.advisorName = profiles.get(row.advisorCode)?.full_name || row.advisorCode; row.groupName = profiles.get(row.advisorCode)?.group_name?.trim() || "Chưa có nhóm"; });
    }
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const totals = rows.reduce((total, row) => ({ users: total.users + 1, consultations: total.consultations + row.consultations, contracts: total.contracts + row.contracts }), { users: 0, consultations: 0, contracts: 0 });
    return NextResponse.json({ rows, totals, session }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không tải được số liệu Bán đỉnh 3.0. Vui lòng thử lại." }, { status: 503 }); }
}
