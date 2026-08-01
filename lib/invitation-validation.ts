import { INVITATION_SALUTATIONS, InvitationSalutation } from "@/lib/invitation-types";

export function normalizeGuestName(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function isInvitationSalutation(value: string): value is InvitationSalutation {
  return INVITATION_SALUTATIONS.some((item) => item === value);
}

export function validateGuestName(value: string) {
  const normalized = normalizeGuestName(value);
  if (!normalized) return "Vui lòng nhập họ và tên khách mời.";
  if (normalized.length < 2) return "Họ và tên phải có ít nhất 2 ký tự.";
  if (normalized.length > 60) return "Họ và tên không được vượt quá 60 ký tự.";
  return "";
}

export function buildGuestDisplayName(salutation: InvitationSalutation | "", guestName: string) {
  const normalized = normalizeGuestName(guestName);
  return salutation && normalized ? `${salutation} ${normalized}` : "";
}

export function slugifyGuestName(value: string) {
  return normalizeGuestName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
