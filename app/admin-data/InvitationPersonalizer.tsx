"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Download, Image as ImageIcon, LoaderCircle, RotateCcw, Share2 } from "lucide-react";
import {
  buildInvitationMessage,
  canvasToBlob,
  createInvitationFile,
  downloadInvitationFile,
  drawInvitation,
  INVITATION_IMAGE_MISSING_MESSAGE,
  loadInvitationImage
} from "@/lib/invitation-canvas";
import { InvitationHistoryAction, InvitationHistoryItem, INVITATION_SALUTATIONS, InvitationSalutation } from "@/lib/invitation-types";
import { buildGuestDisplayName, normalizeGuestName, validateGuestName } from "@/lib/invitation-validation";

type Notice = { tone: "success" | "error" | "info"; text: string } | null;

export default function InvitationPersonalizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [salutation, setSalutation] = useState<InvitationSalutation | "">("");
  const [guestName, setGuestName] = useState("");
  const [imageState, setImageState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [history, setHistory] = useState<InvitationHistoryItem[]>([]);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const displayName = useMemo(() => buildGuestDisplayName(salutation, guestName), [guestName, salutation]);
  const nameError = guestName ? validateGuestName(guestName) : "";
  const valid = Boolean(salutation && !validateGuestName(guestName) && imageState === "ready");

  const loadHistory = useCallback(async () => {
    const response = await fetch("/api/admin/invitations", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setHistory(payload.history ?? []);
    else if (response.status === 503) setHistoryAvailable(false);
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    let active = true;
    setImageState("loading");
    loadInvitationImage()
      .then((image) => {
        if (!active) return;
        imageRef.current = image;
        setImageState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Không thể tải ảnh mẫu thư mời.";
        setImageState(message === INVITATION_IMAGE_MISSING_MESSAGE ? "missing" : "error");
        setNotice({ tone: "error", text: message });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (imageState !== "ready" || !canvasRef.current || !imageRef.current) return;
    let active = true;
    setRendering(true);
    drawInvitation(canvasRef.current, imageRef.current, displayName)
      .catch(() => active && setNotice({ tone: "error", text: "Không thể hiển thị bản xem trước. Vui lòng thử lại." }))
      .finally(() => active && setRendering(false));
    return () => { active = false; };
  }, [displayName, imageState]);

  function updateGuestName(event: ChangeEvent<HTMLInputElement>) {
    setGuestName(event.target.value.replace(/[\r\n]/g, " ").slice(0, 60));
    setNotice(null);
  }

  async function createHighResolutionFile() {
    if (!valid || !imageRef.current) throw new Error("Vui lòng nhập đầy đủ thông tin khách mời hợp lệ.");
    const exportCanvas = document.createElement("canvas");
    await drawInvitation(exportCanvas, imageRef.current, displayName, 2);
    return createInvitationFile(await canvasToBlob(exportCanvas), displayName);
  }

  async function saveHistory(action: InvitationHistoryAction) {
    const response = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salutation, guestName: normalizeGuestName(guestName), action })
    });
    if (response.ok) await loadHistory();
  }

  async function downloadImage() {
    if (!valid || rendering) return;
    setRendering(true);
    setNotice(null);
    try {
      const file = await createHighResolutionFile();
      downloadInvitationFile(file);
      void saveHistory("download");
      setNotice({ tone: "success", text: "Đã tải thư mời" });
    } catch {
      setNotice({ tone: "error", text: "Không thể tạo hoặc tải ảnh PNG. Vui lòng thử lại." });
    } finally {
      setRendering(false);
    }
  }

  async function copyMessage(showSuccess = true) {
    if (!salutation || validateGuestName(guestName)) return false;
    try {
      await navigator.clipboard.writeText(buildInvitationMessage(salutation, guestName));
      if (showSuccess) setNotice({ tone: "success", text: "Đã sao chép lời nhắn" });
      return true;
    } catch {
      setNotice({ tone: "error", text: "Trình duyệt chưa cấp quyền sao chép. Vui lòng sao chép lời nhắn thủ công." });
      return false;
    }
  }

  async function shareInvitation() {
    if (!valid || sharing) return;
    setSharing(true);
    setNotice(null);
    try {
      const file = await createHighResolutionFile();
      const message = buildInvitationMessage(salutation as InvitationSalutation, guestName);
      const shareData: ShareData = {
        files: [file],
        title: "Thư mời chương trình 30 năm Bảo Việt Nhân thọ",
        text: `Trân trọng kính mời ${displayName} tham dự chương trình.`
      };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        void saveHistory("share");
        setNotice({ tone: "success", text: "Cửa sổ chia sẻ đã được mở." });
      } else {
        downloadInvitationFile(file);
        let copied = false;
        try { await navigator.clipboard.writeText(message); copied = true; } catch { copied = false; }
        window.open("https://chat.zalo.me/", "_blank", "noopener,noreferrer");
        void saveHistory("share");
        setNotice(copied
          ? { tone: "info", text: "Ảnh đã được tải xuống và lời nhắn đã được sao chép. Hãy chọn người nhận trên Zalo và gửi ảnh vừa tải." }
          : { tone: "info", text: "Ảnh đã được tải xuống và Zalo Web đã mở. Trình duyệt chưa cấp quyền sao chép lời nhắn." });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice({ tone: "info", text: "Bạn đã hủy chia sẻ." });
      } else {
        setNotice({ tone: "error", text: "Không thể chia sẻ thư mời. Vui lòng thử lại." });
      }
    } finally {
      setSharing(false);
    }
  }

  function resetForm() {
    setSalutation("");
    setGuestName("");
    setNotice(null);
  }

  return <article className="admin-card invitation-personalizer">
    <div className="admin-card-title"><ImageIcon /><div><h2>Cá nhân hóa thư mời</h2><p>Tạo ảnh thư mời riêng cho từng khách và chia sẻ nhanh qua Zalo.</p></div></div>
    <div className="invitation-layout">
      <section className="invitation-form" aria-labelledby="invitation-form-title">
        <div><span className="invitation-kicker">THÔNG TIN KHÁCH MỜI</span><h3 id="invitation-form-title">Tạo thư mời cá nhân</h3></div>
        <label htmlFor="invitation-salutation">Cách xưng hô
          <select id="invitation-salutation" value={salutation} onChange={(event) => setSalutation(event.target.value as InvitationSalutation | "")}>
            <option value="">Chọn cách xưng hô</option>
            {INVITATION_SALUTATIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label htmlFor="invitation-name">Họ và tên khách mời
          <input id="invitation-name" value={guestName} onChange={updateGuestName} onBlur={() => setGuestName(normalizeGuestName(guestName))} placeholder="Ví dụ: Nguyễn Văn An" maxLength={60} aria-describedby="invitation-name-help invitation-name-error" aria-invalid={Boolean(nameError)} />
          <span id="invitation-name-help" className="invitation-counter">{guestName.length}/60 ký tự</span>
          {nameError && <span id="invitation-name-error" className="invitation-field-error">{nameError}</span>}
        </label>
        <div className="invitation-samples" aria-label="Tên mẫu">
          {["Nguyễn Văn An", "Trần Thị Minh", "Nguyễn Hoàng Minh Quân"].map((name) => <button key={name} type="button" onClick={() => setGuestName(name)}>{name}</button>)}
        </div>
        <button type="button" className="admin-secondary invitation-reset" onClick={resetForm}><RotateCcw size={16} />Xóa nội dung</button>
        <div className="invitation-message-preview"><b>Lời nhắn đi kèm</b><p>{salutation && !validateGuestName(guestName) ? buildInvitationMessage(salutation, guestName) : "Nhập thông tin hợp lệ để xem lời nhắn."}</p></div>
      </section>

      <section className="invitation-preview" aria-labelledby="invitation-preview-title">
        <div className="invitation-preview-heading"><div><span className="invitation-kicker">BẢN XEM TRƯỚC</span><h3 id="invitation-preview-title">Thư mời 30 năm</h3></div><span className="invitation-size">834 × 834 px</span></div>
        <div className={`invitation-canvas-shell ${imageState === "loading" ? "loading" : ""}`}>
          {imageState === "loading" && <div className="invitation-skeleton" aria-label="Đang tải ảnh mẫu"><LoaderCircle className="invitation-spin" /><span>Đang tải ảnh mẫu…</span></div>}
          {(imageState === "missing" || imageState === "error") && <div className="invitation-image-error" role="alert"><ImageIcon /><b>{imageState === "missing" ? INVITATION_IMAGE_MISSING_MESSAGE : "Không thể tải ảnh mẫu thư mời."}</b></div>}
          <canvas ref={canvasRef} aria-label={`Bản xem trước thư mời${displayName ? ` dành cho ${displayName}` : " chưa có tên khách mời"}`} />
          {rendering && imageState === "ready" && <span className="invitation-rendering"><LoaderCircle className="invitation-spin" />Đang tạo ảnh…</span>}
        </div>
        <div className="invitation-actions">
          <button type="button" disabled={!valid || rendering || sharing} onClick={downloadImage}><Download size={18} />Tải ảnh PNG</button>
          <button type="button" disabled={!valid || rendering || sharing} onClick={shareInvitation}><Share2 size={18} />{sharing ? "Đang chia sẻ…" : "Chia sẻ qua Zalo"}</button>
          <button type="button" className="admin-secondary" disabled={!salutation || Boolean(validateGuestName(guestName))} onClick={() => void copyMessage()}><Clipboard size={18} />Sao chép lời nhắn</button>
        </div>
        {notice && <div className={`invitation-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</div>}
      </section>
    </div>

    <section className="invitation-history" aria-labelledby="invitation-history-title">
      <div><h3 id="invitation-history-title">10 thư mời gần nhất</h3><p>Lịch sử chỉ được ghi sau khi tải ảnh hoặc bắt đầu chia sẻ.</p></div>
      {!historyAvailable ? <p className="invitation-history-note">Chưa bật lưu lịch sử. Hãy áp dụng migration Supabase đi kèm để sử dụng phần này.</p> :
        <div className="admin-table-wrap"><table><thead><tr><th>Cách xưng hô</th><th>Tên khách</th><th>Người tạo</th><th>Thời gian tạo</th><th>Thao tác</th></tr></thead><tbody>
          {history.map((item) => <tr key={item.id}><td>{item.salutation}</td><td>{item.guest_name}</td><td>Quản trị viên</td><td>{new Date(item.created_at).toLocaleString("vi-VN")}</td><td><button type="button" className="admin-secondary invitation-reuse" onClick={() => { setSalutation(item.salutation); setGuestName(item.guest_name); }}>Dùng lại</button></td></tr>)}
          {!history.length && <tr><td colSpan={5}>Chưa có lịch sử tạo thư mời.</td></tr>}
        </tbody></table></div>}
    </section>
  </article>;
}
