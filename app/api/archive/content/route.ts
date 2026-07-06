import { NextResponse } from "next/server";
import { readArchiveContent } from "@/lib/archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [forms, guides, faq] = await Promise.all([
    readArchiveContent("forms"),
    readArchiveContent("guides"),
    readArchiveContent("faq")
  ]);

  return NextResponse.json({
    forms,
    guides,
    faq
  });
}
