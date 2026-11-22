import { preparedHeroAvatar } from "@/lib/hero-avatar-assets";

// Share processing across header/profile mounts and evict failures for retry.
const portraits = new Map<string, Promise<Blob>>();

async function validatePortrait(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    let clear = 0, visible = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 20) clear++;
      if (pixels[i] > 200) visible++;
    }
    if (clear < 40 || visible < 40) throw new Error("Portrait has no usable transparent foreground");
  } finally { bitmap.close(); }
}

async function readPortrait(url: string): Promise<Blob> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Portrait download failed");
  const blob = await response.blob();
  await validatePortrait(blob);
  return blob;
}

async function savePortrait(src: string, blob: Blob) {
  const form = new FormData();
  form.set("sourceUrl", src);
  form.set("avatar", blob, "avatar.png");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("/api/user/avatar-cutout", { method: "POST", body: form,
        signal: AbortSignal.timeout(15000) });
      // The server checks that this is still the signed-in user's source.
      if (response.ok || (response.status < 500 && response.status !== 429)) return;
    } catch { /* Retry transient storage/network failures once. */ }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function loadPortrait(src: string) {
  const prepared = preparedHeroAvatar(src);
  if (prepared) {
    try { return await readPortrait(prepared); }
    catch { /* A stale prepared asset must not block normal processing. */ }
  }
  const stored = await fetch("/api/user/avatar-cutout", {
    cache: "no-store", signal: AbortSignal.timeout(2000),
  }).then(async (response) => response.ok ? response.json() : null).catch(() => null);
  if (stored?.sourceUrl === src && stored.avatarUrl) {
    try { return await readPortrait(stored.avatarUrl); }
    catch { /* Regenerate missing, corrupt or opaque stored portraits. */ }
  }

  const { getAvatarCutout, getAvatarWhiteCutout } = await import("@/lib/avatar-cutout");
  let blob: Blob;
  try {
    blob = await getAvatarCutout(src);
    await validatePortrait(blob);
  } catch {
    blob = await getAvatarWhiteCutout(src);
    await validatePortrait(blob);
  }
  // A failed GET must not prevent saving. The server validates ownership/source.
  // Keep the local image regardless of storage availability or header unmounts.
  void savePortrait(src, blob);
  return blob;
}

export function loadHeroAvatar(src: string): Promise<Blob> {
  let task = portraits.get(src);
  if (!task) {
    task = loadPortrait(src).catch((error) => {
      portraits.delete(src);
      throw error;
    });
    portraits.set(src, task);
    if (portraits.size > 16) portraits.delete(portraits.keys().next().value!);
  }
  return task;
}
