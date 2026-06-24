"use client";

import { useEffect } from "react";

const SESSION_KEY = "dashboard-page-view-logged";

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

export default function AccessLogger() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "true");

    const logAccess = async () => {
      const userAgent = navigator.userAgent;
      const response = await fetch("/api/access-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: window.location.pathname,
          device: getDevice(userAgent),
          browser: getBrowser(userAgent),
          user_agent: userAgent,
          referrer: document.referrer
        })
      });

      if (!response.ok) {
        console.error(
          "Supabase page view insert failed:",
          await response.text()
        );
      }
    };

    void logAccess().catch((error) => {
      console.error("Supabase page view insert failed:", error);
    });
  }, []);

  return null;
}
