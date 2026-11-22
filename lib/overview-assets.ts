const images = new Map<string, Promise<void>>();
const settings = new Map<string, { expires: number; response: Promise<Response> }>();

export function fetchOverviewSettings(url: string): Promise<Response> {
  let entry = settings.get(url);
  if (!entry || entry.expires < Date.now()) {
    entry = { expires: Date.now() + 5000, response: fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) }) };
    settings.set(url, entry);
    entry.response.catch(() => settings.delete(url));
  }
  return entry.response.then(response => response.clone());
}

export function prepareImage(src: string): Promise<void> {
  if (!images.has(src)) {
    const ready = new Promise<void>(resolve => {
      const image = new window.Image();
      const timer = window.setTimeout(() => { images.delete(src); resolve(); }, 8000);
      const finish = () => { window.clearTimeout(timer); resolve(); };
      image.onload = () => { void image.decode().catch(() => {}).then(finish); };
      image.onerror = () => { images.delete(src); finish(); };
      image.src = src;
    });
    images.set(src, ready);
  }
  return images.get(src)!;
}

export function prepareOverviewImages() {
  return Promise.all([
    "/images/BG%20SV4.webp", "/images/BG%20BXH.webp", "/images/BG%20KTL.webp",
    "/images/L%C3%A1%20c%E1%BB%9D.avif", "/images/ruy%20b%C4%83ng.png",
    "/Icon/recruitment-sign.png", "/Icon/Icon%20baoviet.png", "/Icon/target-goal-icon.png"
  ].map(prepareImage));
}

export async function prepareOverviewBanners() {
  await Promise.all(["/api/ban-dinh-settings", "/api/invitation-settings"].map(async url => {
    try {
      const response = await fetchOverviewSettings(url);
      if (!response.ok) return;
      const value = await response.json();
      if (value.visible && typeof value.banner === "string" && value.banner) await prepareImage(value.banner);
    } catch { /* A failed optional banner must not block sign-in. */ }
  }));
}
