"use client";
import { useState } from "react";
import InvitationSettingsPanel from "./InvitationSettingsPanel";
import BanDinhSettingsPanel from "./BanDinhSettingsPanel";
import ForumSettingsPanel from "./ForumSettingsPanel";
export default function CreationToolsPanel() {
  const [tab, setTab] = useState<"invitation" | "ban-dinh" | "forum">("invitation");
  const [forumOpened, setForumOpened] = useState(false);
  const [banDinhOpened, setBanDinhOpened] = useState(false);
  return <div className="creation-tools">
    <nav className="creation-tools-tabs" aria-label="Nội dung Tạo thư"><button type="button" aria-pressed={tab === "invitation"} onClick={() => setTab("invitation")}>Tạo thư</button><button type="button" aria-pressed={tab === "ban-dinh"} onClick={() => { setBanDinhOpened(true); setTab("ban-dinh"); }}>Bán đỉnh 3.0</button><button type="button" aria-pressed={tab === "forum"} onClick={() => { setForumOpened(true); setTab("forum"); }}>Diễn đàn</button></nav>
    <div hidden={tab !== "forum"}>{forumOpened && <ForumSettingsPanel />}</div>
    <div hidden={tab !== "invitation"}><InvitationSettingsPanel /></div>
    <div hidden={tab !== "ban-dinh"}>{banDinhOpened && <BanDinhSettingsPanel />}</div>
  </div>;
}
