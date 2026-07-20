import { NextResponse } from "next/server";
import { readArchiveContent } from "@/lib/archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [forms, guides, faq, about] = await Promise.all([
    readArchiveContent("forms"),
    readArchiveContent("guides"),
    readArchiveContent("faq"),
    readArchiveContent("about")
  ]);

  return NextResponse.json({
    forms,
    guides,
    faq,
    about
  }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" } });
}
