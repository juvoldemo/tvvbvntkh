/** Read both successful exports and the action labels recorded by older versions. */
export function invitationContentFromAction(value: unknown): string | null {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  const successful = /^invitation_created:\s*(.+)$/i.exec(raw);
  if (successful) return successful[1];
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase();
  if (normalized === "xuat thu moi hnkh vip png" || normalized === "chia se thu moi hnkh vip qua zalo") return "Hội nghị khách hàng VIP";
  if (normalized === "xuat thu moi ra mat an sinh giao duc" || normalized === "chia se thu moi ra mat an sinh giao duc") return "Ra mắt An Sinh Giáo Dục";
  if (normalized === "xuat thu moi dau an vinh quang" || normalized === "chia se thu moi dau an vinh quang") return "Dấu ấn vinh quang";
  const legacy = /^(?:Xuất thư mời|Chia sẻ thư mời)\s+(.+)$/iu.exec(raw);
  return legacy ? legacy[1].replace(/\s+(?:PNG|qua Zalo)$/iu, "").trim() || null : null;
}
