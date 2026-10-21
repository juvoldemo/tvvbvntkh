"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, Share2, X } from "lucide-react";
import { OCTOBER_23_INVITATION_IMAGE_PATH, drawOctober23Invitation, canvasToBlob, downloadInvitationFile } from "@/lib/invitation-canvas";
import { normalizeGuestName, slugifyGuestName, validateGuestName } from "@/lib/invitation-validation";

const OCTOBER_23_TEMPLATE = {
  banner: "/invitations/Banner 2310.png",
  image: OCTOBER_23_INVITATION_IMAGE_PATH,
  draw: drawOctober23Invitation,
  title: "Trao Yêu Thương - Trọn An Tâm",
  color: "#C52222" as const,
  width: 2167,
  height: 582
};
const TEMPLATES = {
  october23: OCTOBER_23_TEMPLATE,
  cr16: OCTOBER_23_TEMPLATE,
  galina: OCTOBER_23_TEMPLATE,
  cr: OCTOBER_23_TEMPLATE,
  september19: OCTOBER_23_TEMPLATE
};
const SALUTATIONS = ["Anh", "Chị", "Em", "Cô", "Chú", "Không"] as const;
const TEXT_COLORS = [
  { label: "Trắng", value: "#FFFFFF" },
  { label: "Đỏ", value: "#C52222" },
  { label: "Vàng", value: "#FFD400" }
] as const;

function outputName(displayName: string) {
  const now = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}-${part(now.getHours())}${part(now.getMinutes())}`;
  return `thu-moi-${slugifyGuestName(displayName)}-${stamp}.png`;
}

export default function GuestInvitationHomeCard({ template = "october23" }: { template?: keyof typeof TEMPLATES }) {
  const config = TEMPLATES[template];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [open, setOpen] = useState(false);
  const [salutation, setSalutation] = useState<(typeof SALUTATIONS)[number]>("Không");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [textColor, setTextColor] = useState<(typeof TEXT_COLORS)[number]["value"]>(config.color);
  const [nameSize, setNameSize] = useState(100);
  const [imageReady, setImageReady] = useState(false);
  const [message, setMessage] = useState("");
  const selectedTitle = salutation === "Không" ? "" : salutation;
  const displayName = useMemo(() => {
    const normalizedName = normalizeGuestName(guestName);
    return normalizedName ? [selectedTitle, normalizedName].filter(Boolean).join(" ") : "";
  }, [guestName, selectedTitle]);
  const error = guestName ? validateGuestName(guestName) : "";
  const valid = Boolean(!validateGuestName(guestName) && imageReady);

  useEffect(() => {
    if (!open) return;
    setImageReady(false);
    imageRef.current = null;
    const image = new window.Image();
    image.onload = () => { imageRef.current = image; setImageReady(true); };
    image.onerror = () => setMessage("Không thể tải ảnh mẫu thư mời.");
    image.src = config.image;
    return () => { image.onload = null; image.onerror = null; };
  }, [open, config]);

  useEffect(() => {
    if (!open || !imageReady || !canvasRef.current || !imageRef.current) return;
    void config.draw(canvasRef.current, imageRef.current, displayName, 1, textColor, nameSize / 100).catch(() => setMessage("Không thể tạo bản xem trước."));
  }, [displayName, imageReady, open, textColor, nameSize, config]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function createFile() {
    if (!valid || !canvasRef.current || !imageRef.current) throw new Error("Thông tin chưa hợp lệ.");
    await config.draw(canvasRef.current, imageRef.current, displayName, 1, textColor, nameSize / 100);
    const blob = await canvasToBlob(canvasRef.current);
    return new File([blob], outputName(displayName), { type: "image/png" });
  }

  function trackCreated() {
    window.postMessage({ type: "bvnt-analytics", eventName: "invitation_created", content: config.title }, window.location.origin);
  }

  async function download() {
    if (!valid || busy) return;
    setBusy(true); setMessage("");
    try {
      downloadInvitationFile(await createFile());
      trackCreated();
      setMessage("Đã xuất thư mời thành công.");
    } catch { setMessage("Không thể xuất thư mời. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  async function shareZalo() {
    if (!valid || sharing) return;
    setSharing(true); setMessage("");
    try {
      const file = await createFile();
      const shareData: ShareData = { files: [file] };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        trackCreated();
        setMessage("Đã mở danh sách ứng dụng chia sẻ. Hãy chọn Zalo.");
      } else {
        downloadInvitationFile(file);
        trackCreated();
        window.open("https://chat.zalo.me/", "_blank", "noopener,noreferrer");
        setMessage("Ảnh đã được tải xuống và Zalo Web đã mở. Hãy chọn người nhận và gửi ảnh vừa tải.");
      }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "Bạn đã hủy chia sẻ." : "Không thể chia sẻ ảnh. Vui lòng thử lại.");
    } finally { setSharing(false); }
  }

  return <>
    <button className="tvv-card hnkh-home-card" style={{ aspectRatio: `${config.width} / ${config.height}` }} type="button" onClick={() => setOpen(true)} aria-label={`Mở công cụ tạo thư mời ${config.title}`}>
      <Image src={config.banner} alt={`Thư mời ${config.title}`} width={config.width} height={config.height} />
    </button>
    {open && <div className="hnkh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="hnkh-modal" role="dialog" aria-modal="true" aria-label="Tạo thư mời có tên khách hàng">
        <header><button type="button" onClick={() => setOpen(false)} aria-label="Đóng"><X size={22} /></button></header>
        <div className="hnkh-modal-grid">
          <form onSubmit={(event) => { event.preventDefault(); void download(); }}>
            <div className="hnkh-salutations" role="group" aria-label="Chọn cách xưng hô">{SALUTATIONS.map((item) => <button type="button" key={item} className={salutation === item ? "active" : ""} aria-pressed={salutation === item} onClick={() => setSalutation(item)}>{item}</button>)}</div>
            <label htmlFor="hnkh-name">Họ và tên khách hàng<input id="hnkh-name" value={guestName} onChange={(event) => setGuestName(event.target.value.replace(/[\r\n]/g, " ").slice(0, 60))} onBlur={() => setGuestName(normalizeGuestName(guestName))} placeholder="Ví dụ: Nguyễn Văn An" maxLength={60} aria-invalid={Boolean(error)} required />{error && <span className="hnkh-field-error">{error}</span>}</label>
            <div className="hnkh-colors" role="group" aria-label="Chọn màu chữ">{TEXT_COLORS.map((color) => <button type="button" key={color.value} className={textColor === color.value ? "active" : ""} aria-pressed={textColor === color.value} onClick={() => setTextColor(color.value)}><i style={{ background: color.value }} />{color.label}</button>)}</div>
            <label className="hnkh-name-size" htmlFor="hnkh-name-size">
              <span>Kích thước tên khách hàng: <output htmlFor="hnkh-name-size">{nameSize}%</output></span>
              <input id="hnkh-name-size" type="range" min={50} max={200} step={5} value={nameSize} onChange={(event) => setNameSize(Number(event.target.value))} />
            </label>
            <div className="hnkh-actions"><button data-analytics-success-only="true" className="hnkh-download" type="submit" aria-label={`Xuất thư mời ${config.title}`} disabled={!valid || busy || sharing}>{busy ? <LoaderCircle className="hnkh-spin" /> : <Download size={18} />}{busy ? "Đang xuất ảnh…" : "Xuất thư mời PNG"}</button><button data-analytics-success-only="true" className="hnkh-share" type="button" aria-label={`Chia sẻ thư mời ${config.title}`} disabled={!valid || busy || sharing} onClick={() => void shareZalo()}>{sharing ? <LoaderCircle className="hnkh-spin" /> : <Share2 size={18} />}{sharing ? "Đang chia sẻ…" : "Chia sẻ qua Zalo"}</button></div>
            {message && <p className="hnkh-message" aria-live="polite">{message}</p>}
          </form>
          <div className="hnkh-canvas-wrap">{!imageReady && <span><LoaderCircle className="hnkh-spin" />Đang tải ảnh…</span>}<canvas ref={canvasRef} aria-label={`Bản xem trước thư mời${displayName ? ` dành cho ${displayName}` : ""}`} /></div>
        </div>
      </section>
    </div>}
  </>;
}
