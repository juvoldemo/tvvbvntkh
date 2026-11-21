import { InvitationSettings } from "./invitation-settings";

export async function drawConfiguredInvitation(canvas: HTMLCanvasElement, image: HTMLImageElement, name: string, settings: InvitationSettings, color = settings.text.color, sizeScale = 1) {
  await document.fonts?.ready;
  const scale = Math.min(1, 3200 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được ảnh thư mời.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (!name) return;
  const t = settings.text;
  const x = canvas.width * t.x / 100;
  const edgeWidth = t.align === "center" ? 2 * Math.min(x, canvas.width - x) : t.align === "left" ? canvas.width - x : x;
  const maxWidth = Math.max(1, Math.min(canvas.width * t.width / 100, edgeWidth));
  let size = canvas.width * t.size / 100 * sizeScale;
  const font = () => { ctx.font = `italic 700 ${size}px "Times New Roman", Georgia, serif`; };
  font();
  while (size > 5 && ctx.measureText(name).width > maxWidth) { size -= .5; font(); }
  ctx.textAlign = t.align;
  ctx.textBaseline = "alphabetic";
  const metrics = ctx.measureText(name);
  const y = Math.max(metrics.actualBoundingBoxAscent, Math.min(canvas.height - metrics.actualBoundingBoxDescent,
    canvas.height * t.y / 100 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2));
  ctx.fillStyle = color;
  ctx.fillText(name, x, y, maxWidth);
}
