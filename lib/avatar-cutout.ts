import type { ImageSegmenter } from "@mediapipe/tasks-vision";

let segmenterPromise: Promise<ImageSegmenter> | undefined;
const pending = new Map<string, Promise<Blob>>();
const cacheName = "tvv-avatar-cutout-v1";

// A small, GPU-independent fallback for studio portraits with a white backdrop.
// Only white pixels connected to the image edges are removed, keeping enclosed
// white details (eyes, teeth and clothing) intact.
export async function getAvatarWhiteCutout(src: string): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const visited = new Uint8Array(canvas.width * canvas.height);
  const queue = new Int32Array(visited.length);
  let head = 0, tail = 0;
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const position = y * canvas.width + x;
    if (visited[position]) return;
    visited[position] = 1;
    const i = position * 4;
    const low = Math.min(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    const high = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    if (pixels.data[i + 3] === 0 || (low >= 210 && high - low <= 30)) {
      pixels.data[i + 3] = 0;
      queue[tail++] = position;
    }
  };
  for (let x = 0; x < canvas.width; x++) { visit(x, 0); visit(x, canvas.height - 1); }
  for (let y = 0; y < canvas.height; y++) { visit(0, y); visit(canvas.width - 1, y); }
  while (head < tail) {
    const position = queue[head++], x = position % canvas.width, y = Math.floor(position / canvas.width);
    visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
  }
  ctx.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"));
}

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, ImageSegmenter }) => {
      const files = await FilesetResolver.forVisionTasks("/mediapipe");
      return ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/models/selfie-segmenter.tflite", delegate: "CPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    }).catch((error) => {
      segmenterPromise = undefined;
      throw error;
    });
  }
  return segmenterPromise;
}

async function createCutout(src: string): Promise<Blob> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(cacheName);
    const saved = await cache.match(src);
    if (saved) return saved.blob();
  } catch { /* Private browsing can disable persistent caching. */ }

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const segmenter = await getSegmenter();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
  segmenter.segment(canvas, (result) => {
    // The binary selfie model returns a single foreground confidence mask.
    const mask = result.confidenceMasks?.[1] ?? result.confidenceMasks?.[0];
    if (!mask) throw new Error("Portrait mask unavailable");
    const confidence = mask.getAsFloat32Array();
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const score = confidence[Math.floor(y * mask.height / canvas.height) * mask.width + Math.floor(x * mask.width / canvas.width)];
        const alpha = Math.max(0, Math.min(1, (score - 0.3) / 0.5));
        pixels.data[index + 3] = Math.round(pixels.data[index + 3] * alpha);
        if (pixels.data[index + 3] > 20) {
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
    }
  });
  if (right < left) throw new Error("No portrait detected");
  ctx.putImageData(pixels, 0, 0);
  // Trim empty margins so the person fills the small avatar area.
  const cropped = document.createElement("canvas");
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  cropped.getContext("2d")!.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  const blob = await new Promise<Blob>((resolve, reject) => cropped.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export failed")), "image/png"));
  try { await cache?.put(src, new Response(blob)); } catch { /* The cutout still works when storage is full. */ }
  return blob;
}

export function getAvatarCutout(src: string) {
  let task = pending.get(src);
  if (!task) {
    task = createCutout(src).finally(() => pending.delete(src));
    pending.set(src, task);
  }
  return task;
}
