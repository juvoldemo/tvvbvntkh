import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type AccessLogPayload = {
  page?: string;
  device?: string;
  browser?: string;
  user_agent?: string;
  referrer?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AccessLogPayload;
    const requestHeaders = headers();
    const ip =
      requestHeaders.get("x-forwarded-for") ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const rawCity = requestHeaders.get("x-vercel-ip-city") || "unknown";
    const city =
      rawCity === "unknown" ? "unknown" : decodeURIComponent(rawCity);
    const country = requestHeaders.get("x-vercel-ip-country") || "unknown";

    console.log({
      ip,
      city,
      country
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { error } = await supabase.from("page_views").insert({
      page: payload.page,
      ip,
      city,
      country,
      device: payload.device,
      browser: payload.browser,
      user_agent: payload.user_agent,
      referrer: payload.referrer
    });

    if (error) {
      console.error("Supabase page view insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Access log request failed:", error);
    return NextResponse.json(
      { error: "Unable to record page view." },
      { status: 500 }
    );
  }
}
