export type InvitationSettings = {
  title: string;
  visible: boolean;
  banner: string;
  image: string;
  text: { x: number; y: number; width: number; size: number; color: string; align: CanvasTextAlign };
};

export const defaultInvitationSettings: InvitationSettings = {
  title: "Hội nghị khách hàng đáo hạn 16/11/2026",
  visible: true,
  banner: "/invitations/Banner 1611.png",
  image: "/invitations/Thu moi 1611.jpg",
  text: { x: 74.78, y: 20.63, width: 39.94, size: 2.82, color: "#17448F", align: "center" }
};

export function validateInvitationSettings(value: unknown): value is InvitationSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as InvitationSettings;
  const imagePath = (s: unknown) => typeof s === "string" && (s.startsWith("/invitations/") || /^\/api\/archive\/file\?path=uploads%2Finvitations%2F[a-zA-Z0-9%._-]+$/.test(s));
  const between = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
  return typeof v.title === "string" && v.title.trim().length > 0 && v.title.length <= 160 && typeof v.visible === "boolean"
    && imagePath(v.banner) && imagePath(v.image) && Boolean(v.text)
    && between(v.text.x, 0, 100) && between(v.text.y, 0, 100) && between(v.text.width, 5, 100)
    && between(v.text.size, .5, 15) && /^#[a-fA-F0-9]{6}$/.test(v.text.color)
    && ["left", "center", "right"].includes(v.text.align);
}
