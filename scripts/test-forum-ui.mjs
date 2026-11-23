import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.FORUM_TEST_URL || "http://localhost:3000";
const topicId = "11111111-1111-4111-8111-111111111111";
const author = { name: "Nguyễn Thị Minh Anh", group: "Nhóm Khánh Hòa", avatar: null, anonymous: false };
const anon = { name: "Ẩn danh 4157", group: "", avatar: null, anonymous: true };
const topic = { id: topicId, title: "Chia sẻ kinh nghiệm tư vấn khách hàng mới", content: "Mọi người thường bắt đầu cuộc trò chuyện với khách hàng như thế nào?\nMình muốn học thêm cách đặt câu hỏi và lắng nghe nhu cầu.", created_at: "2026-11-23T07:30:00Z", last_activity_at: "2026-11-23T13:35:00Z", comment_count: 2, author, attachments: [] };
const comments = [
  { id: "c1", topic_id: topicId, parent_id: null, content: "Mình thường bắt đầu bằng việc tìm hiểu mục tiêu và những điều khách hàng đang quan tâm.", sticker: null, created_at: "2026-11-23T12:00:00Z", author, attachments: [] },
  { id: "c2", topic_id: topicId, parent_id: "c1", content: "Cảm ơn bạn đã chia sẻ!", sticker: "🙏", created_at: "2026-11-23T13:35:00Z", author: anon, attachments: [] }
];
topic.can_manage = true;
topic.attachments = [{ id: "old-image", name: "anh-cu.png", mime: "image/png", size: 68, url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFckAAAAASUVORK5CYII=" }];
let mode = "data";
let lastPost = "";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route("**/api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/forum-settings") return route.fulfill({ json: { banner: "/images/BG%20DD2.png", visible: true, adminOnly: false } });
    if (url.pathname === `/api/forum/${topicId}/reactions`) {
      const body = request.postDataJSON();
      const comment = comments.find(item => item.id === body.commentId);
      Object.assign(comment, { likes: body.reaction === "like" ? 1 : 0, dislikes: body.reaction === "dislike" ? 1 : 0, my_reaction: body.reaction });
      return route.fulfill({ json: comment });
    }
    if (url.pathname === `/api/forum/${topicId}` && request.method() === "PATCH") {
      const body = request.postDataJSON();
      lastPost = JSON.stringify(body);
      topic.title = body.title; topic.content = body.content;
      topic.attachments = topic.attachments.filter(file => body.retainedIds.includes(file.id));
      if (body.uploads.length) topic.attachments.push({ id: "new-image", name: "anh-moi.png", mime: "image/png", size: 68, url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFckAAAAASUVORK5CYII=" });
      return route.fulfill({ json: { ok: true, title: topic.title, content: topic.content, attachments: topic.attachments } });
    }
    if (url.pathname === `/api/forum/${topicId}` && request.method() === "DELETE") return route.fulfill({ json: { ok: true } });
    if (url.pathname === "/api/forum/upload") return route.fulfill({ json: { uploadUrl: `${base}/forum-test-upload`, receipt: "test-signed-receipt" } });
    if (url.pathname === "/api/forum" && request.method() === "GET") {
      if (mode === "error") return route.fulfill({ status: 503, json: { error: "Không thể tải chủ đề. Vui lòng thử lại." } });
      if (mode === "loading") await new Promise(resolve => setTimeout(resolve, 1500));
      return route.fulfill({ json: { topics: mode === "empty" || (url.searchParams.get("q") && !topic.title.includes(url.searchParams.get("q"))) ? [] : [topic], hasMore: false } });
    }
    if (url.pathname.startsWith("/api/forum") && request.method() === "POST") {
      lastPost = request.postData() || "";
      if (url.pathname === "/api/forum") return route.fulfill({ status: 201, json: { id: topicId } });
      const comment = { ...comments[0], id: `c${comments.length + 1}`, content: "Bình luận thử nghiệm", parent_id: "c1", author: anon, sticker: "👍" };
      comments.push(comment);
      return route.fulfill({ status: 201, json: { id: comment.id, comment } });
    }
    if (url.pathname === `/api/forum/${topicId}`) return route.fulfill({ json: { topic, comments, hasMore: false } });
    if (url.pathname === "/api/user/auth") return route.fulfill({ json: { authenticated: true, advisorCode: "TEST", profile: { advisor_code: "TEST", full_name: author.name, dashboard_role: "advisor" } } });
    if (url.pathname === "/api/user/profile") return route.fulfill({ json: { profile: { advisor_code: "TEST", full_name: author.name, group_name: author.group, dashboard_role: "advisor" } } });
    if (url.pathname === "/api/dashboard") return route.fulfill({ status: 503, json: { error: "Test fixture" } });
    return route.fulfill({ json: { events: [], programs: [], sections: [], rows: [] } });
  });
  await context.route("**/forum-test-upload", route => route.fulfill({ json: { ok: true } }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await mkdir("outputs/forum", { recursive: true });
  await page.goto(base);
  await page.getByRole("button", { name: "Mở Diễn đàn" }).click({ timeout: 60000 });
  await page.getByRole("textbox", { name: "Tìm kiếm chủ đề thảo luận" }).waitFor();
  await page.getByRole("button", { name: /Chia sẻ kinh nghiệm/ }).waitFor();
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `List overflow at ${width}`);
    await page.screenshot({ path: `outputs/forum/list-${width}.png`, fullPage: true });
  }
  const search = page.getByRole("textbox", { name: "Tìm kiếm chủ đề thảo luận" });
  await search.fill("không có chủ đề");
  await page.getByRole("heading", { name: "Chưa tìm thấy chủ đề" }).waitFor();
  await page.getByRole("button", { name: "Xóa tìm kiếm" }).click();
  await page.getByRole("button", { name: /Chia sẻ kinh nghiệm/ }).click();
  await page.getByRole("heading", { name: topic.title }).waitFor();
  assert.ok(await page.getByText("20:35 23/11/2026", { exact: true }).count());
  assert.ok(await page.getByText("Ẩn danh 4157", { exact: true }).count());
  const thumbnail = page.getByRole("button", { name: "Xem ảnh anh-cu.png", exact: true });
  assert.ok(await thumbnail.evaluate(button => button.getBoundingClientRect().width <= 64));
  await thumbnail.click();
  await page.getByRole("dialog", { name: "Ảnh anh-cu.png", exact: true }).waitFor();
  await page.getByRole("button", { name: "Đóng ảnh" }).click();
  await thumbnail.click();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Ảnh anh-cu.png", exact: true }).waitFor({ state: "hidden" });
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Detail overflow at ${width}`);
    await page.screenshot({ path: `outputs/forum/detail-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Thích: 0", exact: true }).first().click();
  await page.getByRole("button", { name: "Thích: 1", exact: true }).waitFor();
  await page.getByRole("button", { name: "Không thích: 0", exact: true }).first().click();
  await page.getByRole("button", { name: "Không thích: 1", exact: true }).waitFor();
  await page.getByRole("button", { name: "Không thích: 1", exact: true }).click();
  await page.getByRole("button", { name: "Không thích: 1", exact: true }).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Trả lời", exact: true }).first().click();
  const form = page.locator("article").filter({ has: page.getByText(comments[0].content, { exact: true }) }).first().getByRole("form", { name: "Viết bình luận" });
  assert.equal(await form.getByText(/Tối đa 4 ảnh/).count(), 0);
  await form.getByRole("textbox", { name: "Bình luận", exact: true }).fill("Bình luận thử nghiệm");
  await form.getByRole("checkbox", { name: /Trả lời ẩn danh/ }).check();
  assert.equal(await form.getByRole("button", { name: "Sticker", exact: true }).count(), 0);
  assert.ok(await form.getByRole("button", { name: "Thêm ảnh", exact: true }).evaluate(button => button.getBoundingClientRect().height <= 30));
  assert.ok(await form.getByRole("button", { name: "Gửi trả lời" }).evaluate(button => button.getBoundingClientRect().height <= 30));
  await form.getByRole("button", { name: "Gửi trả lời" }).click();
  await page.getByText("Bình luận thử nghiệm", { exact: true }).waitFor();
  assert.match(lastPost, /name="parentId"\r\n\r\nc1/);
  assert.match(lastPost, /name="anonymous"\r\n\r\ntrue/);
  await page.getByRole("button", { name: "Danh sách chủ đề" }).click();
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await page.getByRole("heading", { name: "Tạo bài đăng" }).waitFor();
  await page.getByRole("textbox", { name: /Tiêu đề/ }).fill("Chủ đề mới");
  await page.getByRole("textbox", { name: /Nội dung/ }).fill("Nội dung cần thảo luận");
  await page.locator("input[type=file]").setInputFiles({ name: "qua-lon.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024) });
  await page.getByRole("alert").filter({ hasText: "nhỏ hơn 5 MB" }).waitFor();
  await page.locator("input[type=file]").setInputFiles({ name: "tai-lieu.txt", mimeType: "text/plain", buffer: Buffer.from("Tài liệu thảo luận") });
  await page.getByRole("checkbox", { name: /Đăng ẩn danh/ }).check();
  await page.screenshot({ path: "outputs/forum/create-375.png", fullPage: true });
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await page.getByRole("heading", { name: topic.title }).waitFor();
  assert.match(lastPost, /test-signed-receipt/);
  assert.match(lastPost, /name="anonymous"\r\n\r\ntrue/);
  await page.getByRole("button", { name: "Danh sách chủ đề" }).click();
  mode = "error";
  await search.fill("lỗi");
  await page.getByRole("alert").filter({ hasText: "Không thể tải chủ đề" }).waitFor();
  mode = "empty";
  await page.getByRole("button", { name: "Thử lại" }).click();
  await page.getByRole("heading", { name: "Chưa tìm thấy chủ đề" }).waitFor();
  mode = "data";
  await page.getByRole("button", { name: "Xóa tìm kiếm" }).click();
  await page.getByRole("button", { name: /Chia sẻ kinh nghiệm/ }).click();
  await page.getByRole("button", { name: "Tùy chọn bài đăng" }).click();
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByRole("textbox", { name: /Tiêu đề/ }).fill("Tiêu đề đã chỉnh sửa");
  await editDialog.getByRole("textbox", { name: /Nội dung/ }).fill("Nội dung đã chỉnh sửa");
  await editDialog.getByRole("img", { name: "anh-cu.png" }).waitFor();
  await editDialog.getByRole("button", { name: "Xóa anh-cu.png" }).click();
  await editDialog.locator("input[type=file]").setInputFiles({ name: "anh-moi.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFckAAAAASUVORK5CYII=", "base64") });
  await page.screenshot({ path: "outputs/forum/edit-375.png", fullPage: true });
  await editDialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.getByRole("heading", { name: "Tiêu đề đã chỉnh sửa" }).waitFor();
  assert.deepEqual(JSON.parse(lastPost).retainedIds, []);
  assert.deepEqual(JSON.parse(lastPost).uploads, ["test-signed-receipt"]);
  await page.getByRole("img", { name: "anh-moi.png", exact: true }).waitFor();
  await page.getByRole("button", { name: "Tùy chọn bài đăng" }).click();
  await page.getByRole("button", { name: "Xóa bài đăng", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click();
  await page.getByRole("heading", { name: "Tiêu đề đã chỉnh sửa" }).waitFor();
  await page.getByRole("button", { name: "Tùy chọn bài đăng" }).click();
  await page.getByRole("button", { name: "Xóa bài đăng", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa bài đăng", exact: true }).click();
  await search.waitFor();
  topic.can_manage = false;
  await page.getByRole("button", { name: /Tiêu đề đã chỉnh sửa/ }).click();
  await page.getByRole("heading", { name: "Tiêu đề đã chỉnh sửa" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Tùy chọn bài đăng" }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: forum UI, responsive 1280/768/375, search, thread replies, anonymity, sticker, upload limits, create, error recovery. APIs use fixtures.");
} finally { await browser.close(); }
