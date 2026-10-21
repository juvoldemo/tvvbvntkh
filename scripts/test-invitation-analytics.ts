import assert from "node:assert/strict";
import { invitationContentFromAction } from "../lib/invitation-analytics";

assert.equal(invitationContentFromAction("invitation_created: Trao Yêu Thương - Trọn An Tâm"), "Trao Yêu Thương - Trọn An Tâm");
assert.equal(invitationContentFromAction("Xuất thư mời CR 16 · Nét duyên tỏa sáng - Rạng rỡ xinh tươi"), "CR 16 · Nét duyên tỏa sáng - Rạng rỡ xinh tươi");
assert.equal(invitationContentFromAction("Chia sẻ thư mời Nét duyên tỏa sáng - Rạng rỡ xinh tươi"), "Nét duyên tỏa sáng - Rạng rỡ xinh tươi");
assert.equal(invitationContentFromAction("Xuất thư mời HNKH VIP PNG"), "Hội nghị khách hàng VIP");
assert.equal(invitationContentFromAction("Chia sẻ thư mời HNKH VIP qua Zalo"), "Hội nghị khách hàng VIP");
assert.equal(invitationContentFromAction("Xuất thư mời Sự kiện mới PNG"), "Sự kiện mới");
for (const value of [undefined, "", "Mở công cụ tạo thư mời", "Đang xuất ảnh…", "invitation_created:", "Xuất tóm tắt"]) {
  assert.equal(invitationContentFromAction(value), null);
}
console.log("Invitation analytics: successful exports, legacy events and unrelated actions passed.");
