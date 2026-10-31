const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Tests use mocked answer storage; no participant submissions are changed.
(async () => {
  const origin = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    const records = new Map();
    let failSave = false;
    await page.route('**/api/hoidap**', async route => {
      const req = route.request();
      if (new URL(req.url()).pathname === '/api/hoidap/state') return route.fulfill({ json: { program: 1 } });
      if (req.method() === 'POST') {
        if (failSave) return route.fulfill({ status: 503, json: { error: 'Không kết nối được máy chủ. Vui lòng thử gửi lại.' } });
        const payload = req.postDataJSON();
        records.set(payload.group, payload.answers);
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { answers: records.get(new URL(req.url()).searchParams.get('group')) || null } });
    });
    await page.goto(`${origin}/hoidap`);
    assert.equal(await page.locator('article').count(), 6);
    const links = await page.locator('article h3').evaluateAll(nodes => nodes.map(node => node.parentElement.getAttribute('href')));
    assert.equal(new Set(links).size, 6);
    for (const link of links) {
      await page.goto(`${origin}${link}`);
      await page.locator('textarea').first().waitFor();
      await page.waitForFunction(() => !document.querySelector('textarea').disabled);
      assert.equal(await page.locator('textarea').count(), 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.goto(`${origin}${links[0]}`);
    await page.waitForFunction(() => !document.querySelector('textarea').disabled);
    await page.locator('textarea').nth(0).fill('Bỏ sót nhu cầu khách hàng.');
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('textarea').disabled);
    assert.equal(await page.locator('textarea').nth(0).inputValue(), 'Bỏ sót nhu cầu khách hàng.');
    await page.getByRole('button', { name: 'Gửi bài trả lời', exact: true }).click();
    assert.equal(records.size, 0, 'Incomplete submissions must not save');
    await page.locator('textarea').nth(1).fill('Chưa đủ thông tin để tư vấn phù hợp.');
    await page.locator('textarea').nth(2).fill('Đặt câu hỏi và xác nhận lại nhu cầu.');
    failSave = true;
    await page.getByRole('button', { name: 'Gửi bài trả lời', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.ok(await page.evaluate(() => localStorage.getItem('hoidap-draft:khach-hang-tiem-nang')));
    failSave = false;
    await page.getByRole('button', { name: 'Gửi bài trả lời', exact: true }).click();
    await page.getByText('Đã gửi bài trả lời của nhóm thành công.').waitFor();
    assert.equal(records.size, 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('hoidap-draft:khach-hang-tiem-nang')), null);
    await page.reload();
    await page.getByText('Đã tải bài trả lời của nhóm.', { exact: false }).waitFor();
    assert.equal(await page.locator('textarea').nth(2).inputValue(), 'Đặt câu hỏi và xác nhận lại nhu cầu.');
    await page.goto(`${origin}${links[1]}`);
    await page.waitForFunction(() => !document.querySelector('textarea').disabled);
    assert.equal(await page.locator('textarea').nth(0).inputValue(), '', 'Answers must stay isolated by group');
    const api = context.request;
    for (const data of [null, {}, { group: 'invalid', answers: ['a', 'b', 'c'] }, { group: 'khach-hang-tiem-nang', answers: [' ', 'b', 'c'] }, { group: 'khach-hang-tiem-nang', answers: ['x'.repeat(10001), 'b', 'c'] }]) {
      const response = await api.post(`${origin}/api/hoidap`, { data });
      assert.equal(response.status(), 400);
    }
    assert.equal((await api.get(`${origin}/api/hoidap?group=invalid`)).status(), 400);
    assert.equal((await api.post(`${origin}/api/hoidap`, { data: 'x'.repeat(150001) })).status(), 413);
    assert.equal((await api.get(`${origin}/hoidap/invalid`)).status(), 404);
    console.log('PASS: six group links, mobile layout, draft recovery, required answers, failed-save recovery, mocked submit/reload, group isolation, real API validation, invalid route.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
