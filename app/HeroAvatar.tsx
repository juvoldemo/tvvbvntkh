"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { loadHeroAvatar } from "@/lib/hero-avatar-loader";

export default function HeroAvatar({ src, className, alt = "" }: { src?: string | null; className?: string; alt?: string }) {
  const [cutout, setCutout] = useState<{ source: string; url: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let active = true;
    let objectUrl: string | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const load = async () => {
      try {
        const blob = await loadHeroAvatar(src);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setCutout({ source: src, url: objectUrl });
        setFailedSource(null);
      } catch {
        if (!active) return;
        if (++attempts < 3) retryTimer = setTimeout(load, attempts * 1500);
        else setFailedSource(src);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // Never flash the original background or another account's portrait.
  return src && cutout?.source === src
    ? <img className={className} src={cutout.url} alt={alt} />
    : <UserRound size={40} aria-hidden="true" aria-busy={Boolean(src && failedSource !== src)} />;
}
