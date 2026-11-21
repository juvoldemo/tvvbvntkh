"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { preparedHeroAvatar } from "@/lib/hero-avatar-assets";

export default function HeroAvatar({ src }: { src?: string | null }) {
  const [cutout, setCutout] = useState<{ source: string; url: string } | null>(null);
  const prepared = preparedHeroAvatar(src);

  useEffect(() => {
    if (!src) return;
    let active = true;
    let objectUrl: string | undefined;
    const show = (blob: Blob) => {
      if (!active) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      setCutout({ source: src, url: objectUrl });
    };
    async function load() {
      const response = await fetch("/api/user/avatar-cutout", { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể kiểm tra ảnh đã lưu");
      const saved = await response.json();
      if (!active || saved.sourceUrl !== src) return;
      if (saved.avatarUrl) {
        setCutout({ source: src!, url: saved.avatarUrl });
        return;
      }
      let blob: Blob;
      if (prepared) {
        const response = await fetch(prepared);
        if (!response.ok) throw new Error("Không thể đọc ảnh đã tách nền");
        blob = await response.blob();
      } else {
        // Load the segmentation runtime only when storage has no saved result.
        const { getAvatarCutout, getAvatarWhiteCutout } = await import("@/lib/avatar-cutout");
        try { blob = await getAvatarCutout(src!); }
        catch { blob = await getAvatarWhiteCutout(src!); }
      }
      if (!active) return;
      show(blob);
      const form = new FormData();
      form.set("sourceUrl", src!);
      form.set("avatar", blob, "avatar.png");
      const result = await fetch("/api/user/avatar-cutout", { method: "POST", body: form });
      if (!result.ok) throw new Error("Không thể lưu ảnh đã tách nền");
      const payload = await result.json();
      if (active && payload.sourceUrl === src) setCutout({ source: src!, url: payload.avatarUrl });
    }
    load().catch((error) => console.error("Không thể tải avatar đã tách nền:", error));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, prepared]);

  // Preserve the user's photo if the browser cannot run image processing.
  return src
    ? <img src={cutout?.source === src ? cutout.url : prepared ?? src} alt="" />
    : <UserRound size={40} aria-hidden="true" />;
}
