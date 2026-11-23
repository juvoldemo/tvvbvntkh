export type ForumSettings = { banner: string; visible: boolean; adminOnly: boolean };
export const defaultForumSettings: ForumSettings = { banner: "/images/BG%20DD2.png", visible: true, adminOnly: false };
export function validForumSettings(value: unknown): value is ForumSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as ForumSettings;
  return typeof v.visible === "boolean" && typeof v.adminOnly === "boolean" && typeof v.banner === "string"
    && (v.banner === defaultForumSettings.banner || /^\/api\/archive\/file\?path=uploads%2Finvitations%2F[a-zA-Z0-9%._-]+$/.test(v.banner));
}
