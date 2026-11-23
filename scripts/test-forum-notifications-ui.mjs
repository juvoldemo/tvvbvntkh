import assert from "node:assert/strict";
import { chromium } from "playwright";
const topicId = "11111111-1111-4111-8111-111111111111";
const notificationId = `forum:${topicId}`;
const profile = { advisor_code: "TEST", full_name: "Test Member", dashboard_role: "advisor" };
const topic = { id: topicId, title: "Bài viết có bình luận mới", content: "Nội dung thử nghiệm", created_at: "2026-11-24T00:00:00Z", comment_count: 0, author: { name: "Test", group: "", anonymous: false }, attachments: [] };
let readAt = null;
let writes = 0;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  await context.route("**/api/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/user/auth") return route.fulfill({ json: { authenticated: true, advisorCode: "TEST", profile } });
    if (path === "/api/user/profile") return route.fulfill({ json: { profile } });
    if (path === "/api/forum-settings") return route.fulfill({ json: { banner: "/images/BG%20DD2.png", visible: true, adminOnly: false } });
    if (path === "/api/forum/notifications") {
      if (request.method() === "PATCH") {
        assert.deepEqual(request.postDataJSON().ids, [topicId]);
        writes++; readAt = new Date().toISOString();
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { events: [{ id: notificationId, topic_id: topicId, title: "Có bình luận mới trên diễn đàn", content: topic.title, created_at: topic.created_at, event_date: null, read_at: readAt }] } });
    }
    if (path === `/api/forum/${topicId}`) return route.fulfill({ json: { topic, comments: [], page: 0, totalPages: 1 } });
    if (path === "/api/dashboard") return route.fulfill({ status: 503, json: { error: "Test fixture" } });
    return route.fulfill({ json: { events: [], programs: [], sections: [], rows: [] } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(process.env.FORUM_TEST_URL || "http://localhost:3000");
  await page.getByRole("button", { name: "Thông báo (1)", exact: true }).click({ timeout: 60000 });
  const item = page.getByRole("button", { name: /Có bình luận mới trên diễn đàn/ });
  await item.waitFor();
  await page.getByRole("button", { name: "Thông báo (0)", exact: true }).waitFor();
  assert.equal(writes, 1);
  await page.getByRole("tab", { name: "Đã xem", exact: true }).click();
  await item.waitFor();
  await item.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: topic.title, exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Thông báo (0)", exact: true }).click({ timeout: 60000 });
  await page.getByRole("tab", { name: "Đã xem", exact: true }).click();
  await item.waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: mobile bell badge, persisted read state, read tab, keyboard navigation to correct forum topic and reload.");
} finally { await browser.close(); }
