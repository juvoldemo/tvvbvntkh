"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

const SESSION_KEY = "dashboard-page-view-logged";

type LocationData = {
  ip: string;
  city: string;
  country: string;
};

function getDevice(userAgent: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    ? "Mobile"
    : "Desktop";
}

function getBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "unknown";
}

async function getLocation(): Promise<LocationData> {
  try {
    const response = await fetch("https://ipapi.co/json/");

    if (!response.ok) {
      throw new Error(`ipapi returned ${response.status}`);
    }

    const data = await response.json();

    return {
      ip: data.ip || "unknown",
      city: data.city || "unknown",
      country: data.country_name || data.country || "unknown"
    };
  } catch {
    return { ip: "unknown", city: "unknown", country: "unknown" };
  }
}

export default function AccessLogger() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "true");

    const logAccess = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error(
          "Supabase page view insert failed: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
        return;
      }

      const location = await getLocation();
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const userAgent = navigator.userAgent;
      const { error } = await supabase.from("page_views").insert({
        page: window.location.pathname,
        user_agent: userAgent,
        referrer: document.referrer,
        device: getDevice(userAgent),
        browser: getBrowser(userAgent),
        ...location
      });

      if (error) {
        console.error("Supabase page view insert failed:", error);
      }
    };

    void logAccess();
  }, []);

  return null;
}
