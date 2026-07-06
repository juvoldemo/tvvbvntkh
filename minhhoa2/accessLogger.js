(function () {
  "use strict";

  const SESSION_KEY = "page_view_logged";

  function detectBrowser(userAgent) {
    if (/Edg\//i.test(userAgent)) return "Edge";
    if (/OPR\/|Opera/i.test(userAgent)) return "Opera";
    if (/Firefox\/|FxiOS\//i.test(userAgent)) return "Firefox";
    if (/CriOS\//i.test(userAgent)) return "Chrome";
    if (/Chrome\//i.test(userAgent)) return "Chrome";
    if (/Safari\//i.test(userAgent) && !/Chrome\/|Chromium\/|CriOS\//i.test(userAgent)) return "Safari";
    return "Other";
  }

  function detectDevice(userAgent) {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent)
      ? "Mobile"
      : "Desktop";
  }

  async function getLocation() {
    try {
      const response = await fetch("https://ipapi.co/json/", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Location API failed");
      const data = await response.json();
      return {
        ip: data.ip || "unknown",
        city: data.city || "unknown",
        country: data.country_name || data.country || "unknown"
      };
    } catch (error) {
      return { ip: "unknown", city: "unknown", country: "unknown" };
    }
  }

  async function initAccessLogger() {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    const config = window.SUPABASE_ACCESS_LOGGER_CONFIG || {};
    if (!config.url || !config.anonKey) {
      console.warn("Access logger: chưa cấu hình Supabase URL và anon key.");
      return;
    }

    const userAgent = navigator.userAgent || "";
    const locationData = await getLocation();
    const record = {
      page: window.location.pathname,
      ip: locationData.ip,
      city: locationData.city,
      country: locationData.country,
      device: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      user_agent: userAgent,
      referrer: document.referrer || ""
    };

    try {
      const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/page_views`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(record),
        keepalive: true
      });
      if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (error) {
      console.warn("Access logger: không thể ghi lượt truy cập.", error);
    }
  }

  async function logAppEvent(eventName, eventData = {}) {
    const config = window.SUPABASE_ACCESS_LOGGER_CONFIG || {};
    if (!config.url || !config.anonKey || !eventName) return;

    const userAgent = navigator.userAgent || "";
    const record = {
      event_name: eventName,
      event_data: eventData,
      page: window.location.pathname,
      device: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      user_agent: userAgent,
      referrer: document.referrer || ""
    };

    try {
      await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/app_events`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(record),
        keepalive: true
      });
    } catch (error) {
      console.warn("Access logger: khong the ghi su kien ung dung.", error);
    }
  }

  window.initAccessLogger = initAccessLogger;
  window.logAppEvent = logAppEvent;
})();
