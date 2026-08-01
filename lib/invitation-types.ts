export const INVITATION_SALUTATIONS = ["Ông", "Bà", "Anh", "Chị", "Em", "Quý khách"] as const;

export type InvitationSalutation = (typeof INVITATION_SALUTATIONS)[number];

export type InvitationHistoryItem = {
  id: string;
  salutation: InvitationSalutation;
  guest_name: string;
  display_name: string;
  created_at: string;
  downloaded_at: string | null;
  shared_at: string | null;
  created_by: string | null;
};

export type InvitationHistoryAction = "download" | "share";
