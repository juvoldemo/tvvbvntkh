// Prepared transparent portraits, keyed by the original storage object.
// A new upload has a new object name and goes through normal image processing.
const preparedPortraits: Record<string, string> = {
  "/storage/v1/object/public/advisor-images/d248679542/c88833df-e2ed-4d06-9b1f-0d3719d871cf.png":
    "/images/avatar-cutouts/c88833df-e2ed-4d06-9b1f-0d3719d871cf.png",
  "/storage/v1/object/public/advisor-images/d102105315/a1ca6253-261c-40ec-8f9c-4c0938a339ab.png":
    "/images/avatar-cutouts/a1ca6253-261c-40ec-8f9c-4c0938a339ab.png",
};

export function preparedHeroAvatar(src?: string | null) {
  if (!src) return undefined;
  try {
    return preparedPortraits[new URL(src, "https://avatar.local").pathname];
  } catch {
    return undefined;
  }
}
