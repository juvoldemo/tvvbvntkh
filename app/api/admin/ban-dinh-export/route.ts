import { NextRequest, NextResponse } from "next/server";
import { GET as readReports } from "../ban-dinh-reports/route";
import { createBanDinhWorkbook } from "@/lib/ban-dinh-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const reports = await readReports(request);
  if (!reports.ok) return reports;
  try {
    const { rows } = await reports.json();
    const workbook = createBanDinhWorkbook(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return new NextResponse(new Uint8Array(buffer), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ban-dinh-3.0-${stamp}.xlsx"`,
      "Cache-Control": "no-store"
    } });
  } catch { return NextResponse.json({ error: "Không xuất được file thống kê. Vui lòng thử lại." }, { status: 503 }); }
}
