import { InvitationSalutation } from "@/lib/invitation-types";
import { buildGuestDisplayName, slugifyGuestName } from "@/lib/invitation-validation";

export const INVITATION_IMAGE_PATH = "/invitations/thu-moi-30-nam-bao-viet.png";
export const HOMECOMING_INVITATION_IMAGE_PATH = "/invitations/thu-moi-hoi-ngo-thap-lua-dam-me.png";
export const AUGUST_20_INVITATION_IMAGE_PATH = "/invitations/Thu moi 20.08.png";
export const INVITATION_IMAGE_MISSING_MESSAGE = "Chưa tìm thấy ảnh mẫu thư mời tại /public/invitations/thu-moi-30-nam-bao-viet.png";
const BASE_SIZE = 834;
const NAME_AREA_WIDTH = 300;

export function loadInvitationImage(src = INVITATION_IMAGE_PATH) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(INVITATION_IMAGE_MISSING_MESSAGE));
    image.src = src;
  });
}

export function calculateFittedFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  scale = 1
) {
  const minimum = 18 * scale;
  let size = 31 * scale;
  while (size > minimum) {
    context.font = `italic 700 ${size}px "Dancing Script", "Times New Roman", Georgia, serif`;
    if (context.measureText(text).width <= NAME_AREA_WIDTH * scale) break;
    size -= scale;
  }
  return Math.max(minimum, size);
}

export async function drawInvitation(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  displayName: string,
  outputScale = 1,
  textColor = "#17448F"
) {
  if (document.fonts?.ready) await document.fonts.ready;
  canvas.width = BASE_SIZE * outputScale;
  canvas.height = BASE_SIZE * outputScale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không thể khởi tạo vùng vẽ thư mời.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (!displayName) return;

  const fontSize = calculateFittedFontSize(context, displayName, outputScale);
  context.font = `italic 700 ${fontSize}px "Dancing Script", "Times New Roman", Georgia, serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  const isBrightYellow = textColor.toUpperCase() === "#FFD400";
  context.strokeStyle = isBrightYellow ? "rgba(23,68,143,0.9)" : "rgba(255,255,255,0.96)";
  context.lineWidth = (isBrightYellow ? 3 : 7) * outputScale;
  context.strokeText(displayName, 635 * outputScale, 127 * outputScale, NAME_AREA_WIDTH * outputScale);
  context.fillStyle = textColor;
  context.fillText(displayName, 635 * outputScale, 127 * outputScale, NAME_AREA_WIDTH * outputScale);
}

export async function drawHomecomingInvitation(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  displayName: string,
  outputScale = 1,
  textColor = "#17448F"
) {
  if (document.fonts?.ready) await document.fonts.ready;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width * outputScale;
  canvas.height = height * outputScale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không thể khởi tạo vùng vẽ thư mời.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (!displayName) return;

  const ratio = width / 1296;
  const scale = ratio * outputScale;
  const areaWidth = 460 * scale;
  // Center the guest name against the whole white invitation panel, not the
  // dotted input line (which starts after the "Anh/Chị:" label).
  const centerX = 960 * scale;
  const centerY = 171 * scale;
  context.fillStyle = "#fff";
  context.fillRect(796 * scale, 158 * scale, 430 * scale, 43 * scale);
  let fontSize = 30 * scale;
  while (fontSize > 18 * scale) {
    context.font = `700 ${fontSize}px Arial, "Helvetica Neue", sans-serif`;
    if (context.measureText(displayName).width <= areaWidth) break;
    fontSize -= scale;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = textColor;
  context.fillText(displayName, centerX, centerY, areaWidth);
}

export async function drawAugust20Invitation(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  displayName: string,
  outputScale = 1,
  textColor = "#17448F"
) {
  if (document.fonts?.ready) await document.fonts.ready;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  // The source PNG is 5831 x 5866. Keeping the canvas below 3200 px avoids
  // mobile-browser canvas/memory failures while retaining a sharp 10 MP export.
  const renderScale = Math.min(outputScale, 3200 / Math.max(width, height));
  canvas.width = Math.round(width * renderScale);
  canvas.height = Math.round(height * renderScale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không thể khởi tạo vùng vẽ thư mời.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (!displayName) return;

  const scale = (width / 809) * renderScale;
  const areaWidth = 350 * scale;
  const centerX = 608 * scale;
  // The dotted name row is the geometric midpoint between the two sentences.
  const centerY = 116 * scale;
  let fontSize = 21 * scale;
  while (fontSize > 14 * scale) {
    context.font = `italic 700 ${fontSize}px "Times New Roman", Georgia, serif`;
    if (context.measureText(displayName).width <= areaWidth) break;
    fontSize -= scale;
  }
  context.textAlign = "center";
  // Center the visible glyph bounds, not the font's em box. This keeps italic
  // names visually balanced above and below the template's dotted row.
  const metrics = context.measureText(displayName);
  const textY = centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  context.textBaseline = "alphabetic";
  context.lineJoin = "round";
  const isBrightYellow = textColor.toUpperCase() === "#FFD400";
  context.strokeStyle = isBrightYellow ? "rgba(23,68,143,.88)" : "rgba(255,255,255,.98)";
  context.lineWidth = (isBrightYellow ? 2 : 4) * scale;
  context.strokeText(displayName, centerX, textY, areaWidth);
  context.fillStyle = textColor;
  context.fillText(displayName, centerX, textY, areaWidth);
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Không thể tạo ảnh PNG.")), "image/png");
      return;
    }
    try {
      const [header, data] = canvas.toDataURL("image/png").split(",");
      const mime = /data:(.*?);/.exec(header)?.[1] || "image/png";
      const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
      resolve(new Blob([bytes], { type: mime }));
    } catch {
      reject(new Error("Không thể tạo ảnh PNG."));
    }
  });
}

function fileTimestamp(date = new Date()) {
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}-${part(date.getHours())}${part(date.getMinutes())}`;
}

export function createInvitationFile(blob: Blob, displayName: string) {
  const filename = `thu-moi-${slugifyGuestName(displayName)}-${fileTimestamp()}.png`;
  return new File([blob], filename, { type: "image/png", lastModified: Date.now() });
}

export function downloadInvitationFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildInvitationMessage(salutation: InvitationSalutation, guestName: string) {
  const displayName = buildGuestDisplayName(salutation, guestName);
  return `TỔNG CÔNG TY BẢO VIỆT NHÂN THỌ KHÁNH HÒA trân trọng kính mời ${displayName} tham dự chương trình kỷ niệm 30 năm.\n\nThời gian: 09h00, Thứ Bảy, ngày 08/08/2026.\nĐịa điểm: Trung tâm Hội nghị Âu Lạc Thịnh, 99 Nguyễn Thị Minh Khai, Nha Trang, Khánh Hòa.`;
}
