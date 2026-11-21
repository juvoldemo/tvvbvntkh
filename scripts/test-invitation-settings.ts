import assert from "node:assert/strict";
import { defaultInvitationSettings, validateInvitationSettings } from "../lib/invitation-settings";

assert.ok(validateInvitationSettings(defaultInvitationSettings));
assert.ok(validateInvitationSettings({ ...defaultInvitationSettings, visible: false }));
assert.ok(validateInvitationSettings({ ...defaultInvitationSettings, image: "/api/archive/file?path=uploads%2Finvitations%2Ftest.png" }));
for (const change of [{ visible: "false" }, { image: "https://example.com/image.png" }, { title: "" },
  { text: { ...defaultInvitationSettings.text, x: -1 } }, { text: { ...defaultInvitationSettings.text, size: NaN } },
  { text: { ...defaultInvitationSettings.text, align: "invalid" } }]) {
  assert.equal(validateInvitationSettings({ ...defaultInvitationSettings, ...change }), false);
}
console.log("Invitation configuration validation passed.");
