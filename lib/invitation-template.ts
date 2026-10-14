import { managedAdoScope, normalizeAdoText } from "@/lib/ado-scope";

export function invitationTemplateForGroup(groupName: unknown): "cr16" | "galina" {
  const scope = managedAdoScope("nguyenthanhnhan");
  return scope?.groups.some((group) => normalizeAdoText(group) === normalizeAdoText(groupName))
    ? "cr16"
    : "galina";
}
