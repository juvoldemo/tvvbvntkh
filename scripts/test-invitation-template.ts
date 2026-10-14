import assert from "node:assert/strict";
import { ADO_ACCOUNT_SEEDS, managedAdoScope } from "../lib/ado-scope";
import { invitationTemplateForGroup } from "../lib/invitation-template";

const scope = managedAdoScope("nguyenthanhnhan")!;
assert.equal(scope.groups.length, 6);
for (const group of scope.groups) {
  assert.equal(invitationTemplateForGroup(group), "cr16", group);
  const normalized = group.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  assert.equal(invitationTemplateForGroup(`  ${normalized}  `), "cr16", group);
}
for (const seed of ADO_ACCOUNT_SEEDS) {
  if (seed.advisor_code === scope.username) continue;
  for (const group of managedAdoScope(seed.advisor_code)!.groups) {
    assert.equal(invitationTemplateForGroup(group), "galina", group);
  }
}
for (const group of [undefined, null, "", "Nhóm khác", "Hoàng Phát"]) {
  assert.equal(invitationTemplateForGroup(group), "galina");
}
console.log("Invitation template routing passed for all ADO groups and missing groups.");
