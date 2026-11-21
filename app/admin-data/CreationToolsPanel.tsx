"use client";
import { useState } from "react";
import InvitationSettingsPanel from "./InvitationSettingsPanel";
import BanDinhSettingsPanel from "./BanDinhSettingsPanel";
export default function CreationToolsPanel() {
  const [tab, setTab] = useState<"invitation" | "ban-dinh">("invitation");
  const [banDinhOpened, setBanDinhOpened] = useState(false);
  return <div className="creation-tools">
    <nav className="creation-tools-tabs" aria-label="Nội dung Tạo thư"><button type="button" aria-pressed={tab === "invitation"} onClick={() => setTab("invitation")}>Tạo thư</button><button type="button" aria-pressed={tab === "ban-dinh"} onClick={() => { setBanDinhOpened(true); setTab("ban-dinh"); }}>Bán đỉnh 3.0</button></nav>
    <div hidden={tab !== "invitation"}><InvitationSettingsPanel /></div>
    <div hidden={tab !== "ban-dinh"}>{banDinhOpened && <BanDinhSettingsPanel />}</div>
  </div>;
}
