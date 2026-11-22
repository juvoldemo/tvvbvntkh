"use client";
import { fetchOverviewSettings } from "@/lib/overview-assets";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BanDinhSettings, validBanDinhSettings } from "@/lib/ban-dinh";
export default function BanDinhHomeCard() {
  const [settings, setSettings] = useState<BanDinhSettings | null>(null);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const r = await fetchOverviewSettings("/api/ban-dinh-settings");
        const data: unknown = await r.json();
        if (active && r.ok && validBanDinhSettings(data)) setSettings(data);
      } catch { /* Retain the last successfully loaded banner. */ }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  if (!settings?.visible || !settings.banner) return null;
  return <Link href="/ban-dinh-3" className="tvv-card hnkh-home-card" style={{ aspectRatio: "auto" }} aria-label="Bán đỉnh 3.0"><img src={settings.banner} alt="Bán đỉnh 3.0" style={{ width: "100%", height: "auto", display: "block" }} /></Link>;
}
