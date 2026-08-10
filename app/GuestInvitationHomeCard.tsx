"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, Share2, X } from "lucide-react";
import { canvasToBlob, downloadInvitationFile, drawHomecomingInvitation, HOMECOMING_INVITATION_IMAGE_PATH } from "@/lib/invitation-canvas";
import { normalizeGuestName, slugifyGuestName, validateGuestName } from "@/lib/invitation-validation";

const IMAGE_PATH = "/invitations/banner-hoi-ngo-thap-lua-dam-me.png";
const SALUTATIONS = ["Anh", "Chị", "Em", "Cô", "Chú", "Không"] as const;
const TEXT_COLORS = [
  { label: "Xanh", value: "#17448F" },
  { label: "Đỏ", value: "#C52222" },
  { label: "Vàng", value: "#FFD400" }
] as const;

function outputName(displayName: string) {
  const now = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}-${part(now.getHours())}${part(now.getMinutes())}`;
  return `thu-moi-${slugifyGuestName(displayName)}-${stamp}.png`;
}

export default function GuestInvitationHomeCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [open, setOpen] = useState(false);
  const [salutation, setSalutation] = useState<(typeof SALUTATIONS)[number]>("Không");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [textColor, setTextColor] = useState<(typeof TEXT_COLORS)[number]["value"]>("#17448F");
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
    const image = new window.Image();
    image.onload = () => { imageRef.current = image; setImageReady(true); };
    image.onerror = () => setMessage("Không thể tải ảnh thư mời Hội ngộ thắp lửa đam mê.");
    image.src = HOMECOMING_INVITATION_IMAGE_PATH;
  }, [open]);

  useEffect(() => {
    if (!open || !imageReady || !canvasRef.current || !imageRef.current) return;
    void drawHomecomingInvitation(canvasRef.current, imageRef.current, displayName, 1, textColor).catch(() => setMessage("Không thể tạo bản xem trước."));
  }, [displayName, imageReady, open, textColor]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function createFile() {
    if (!valid || !canvasRef.current) throw new Error("Thông tin chưa hợp lệ.");
    const blob = await canvasToBlob(canvasRef.current);
    return new File([blob], outputName(displayName), { type: "image/png" });
  }

  async function download() {
    if (!valid || busy) return;
    setBusy(true); setMessage("");
    try {
      downloadInvitationFile(await createFile());
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
        setMessage("Đã mở danh sách ứng dụng chia sẻ. Hãy chọn Zalo.");
      } else {
        downloadInvitationFile(file);
        window.open("https://chat.zalo.me/", "_blank", "noopener,noreferrer");
        setMessage("Ảnh đã được tải xuống và Zalo Web đã mở. Hãy chọn người nhận và gửi ảnh vừa tải.");
      }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "Bạn đã hủy chia sẻ." : "Không thể chia sẻ ảnh. Vui lòng thử lại.");
    } finally { setSharing(false); }
  }

  return <>
    <button className="tvv-card hnkh-home-card" type="button" onClick={() => setOpen(true)} aria-label="Mở công cụ tạo thư mời Hội nghị khách hàng">
      <Image src={IMAGE_PATH} alt="Hội ngộ thắp lửa đam mê" width={2048} height={704} />
    </button>
    {open && <div className="hnkh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="hnkh-modal" role="dialog" aria-modal="true" aria-label="Tạo thư mời có tên khách hàng">
        <header><button type="button" onClick={() => setOpen(false)} aria-label="Đóng"><X size={22} /></button></header>
        <div className="hnkh-modal-grid">
          <form onSubmit={(event) => { event.preventDefault(); void download(); }}>
            <div className="hnkh-salutations" role="group" aria-label="Chọn cách xưng hô">{SALUTATIONS.map((item) => <button type="button" key={item} className={salutation === item ? "active" : ""} aria-pressed={salutation === item} onClick={() => setSalutation(item)}>{item}</button>)}</div>
            <label htmlFor="hnkh-name">Họ và tên khách hàng<input id="hnkh-name" value={guestName} onChange={(event) => setGuestName(event.target.value.replace(/[\r\n]/g, " ").slice(0, 60))} onBlur={() => setGuestName(normalizeGuestName(guestName))} placeholder="Ví dụ: Nguyễn Văn An" maxLength={60} aria-invalid={Boolean(error)} required />{error && <span className="hnkh-field-error">{error}</span>}</label>
            <div className="hnkh-colors" role="group" aria-label="Chọn màu chữ">{TEXT_COLORS.map((color) => <button type="button" key={color.value} className={textColor === color.value ? "active" : ""} aria-pressed={textColor === color.value} onClick={() => setTextColor(color.value)}><i style={{ background: color.value }} />{color.label}</button>)}</div>
            <div className="hnkh-actions"><button className="hnkh-download" type="submit" disabled={!valid || busy || sharing}>{busy ? <LoaderCircle className="hnkh-spin" /> : <Download size={18} />}{busy ? "Đang xuất ảnh…" : "Xuất thư mời PNG"}</button><button className="hnkh-share" type="button" disabled={!valid || busy || sharing} onClick={() => void shareZalo()}>{sharing ? <LoaderCircle className="hnkh-spin" /> : <Share2 size={18} />}{sharing ? "Đang chia sẻ…" : "Chia sẻ qua Zalo"}</button></div>
            {message && <p className="hnkh-message" aria-live="polite">{message}</p>}
          </form>
          <div className="hnkh-canvas-wrap">{!imageReady && <span><LoaderCircle className="hnkh-spin" />Đang tải ảnh…</span>}<canvas ref={canvasRef} aria-label={`Bản xem trước thư mời${displayName ? ` dành cho ${displayName}` : ""}`} /></div>
        </div>
      </section>
    </div>}
  </>;
}
