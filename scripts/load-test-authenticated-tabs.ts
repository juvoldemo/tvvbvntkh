import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { hashPassword } from '../lib/user-auth';

config({ path: '.env.local', quiet: true });
const origin = process.env.LOAD_TEST_URL || 'https://www.bandothunhap.com';
const runId = `LTT${Date.now().toString(36).toUpperCase()}`;
const password = randomBytes(20).toString('base64url');
const codes = Array.from({ length: 100 }, (_, i) => `${runId}_${i}`);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const samples: any[] = [], browserErrors: string[] = [], browserTabs: any[] = [];
const paths = new Set<string>();
const calculations = new Map<string, any>();
calculations.set('synthetic-income-simulation', {
  month: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date()).replace(/^(\d{2})\/(\d{4})$/, '$2-$1'),
  advisor: { code: codes[0], name: `LOAD TEST ${runId}`, group: runId },
  draftContracts: [{ id: 'load-test-draft', productName: 'An Khang Nhu Y', premium: 20000000, expectedPaidDate: '2026-11-22', expectedIssueDate: '2026-11-22', status: 'Có hiệu lực' }]
});
let cleanupOk = false, runError = '', browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
async function request(stage: string, path: string, cookie = '', body?: any) {
  const start = performance.now(); let status = 0, ok = false, error = '';
  try {
    const response = await fetch(new URL(path, origin), { method: body ? 'POST' : 'GET', headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(45000), redirect: 'error' });
    status = response.status;
    const text = await response.text();
    if (!response.ok) {
      let detail = '';
      try { detail = String(JSON.parse(text).error || '').slice(0, 200); } catch {}
      throw new Error(`HTTP ${status}${detail ? ': ' + detail : ''}`);
    }
    const json = text.startsWith('{') ? JSON.parse(text) : null;
    if (json?.error) throw new Error(String(json.error).slice(0, 150));
    if (stage === 'login' && !json?.ok) throw new Error('Login not confirmed');
    if (stage === 'session' && !json?.authenticated) throw new Error('Session not authenticated');
    ok = true; return { response, json };
  } catch (e: any) { error = e.message; return null; }
  finally { samples.push({ stage, path, status, ok, ms: Math.round(performance.now() - start), error }); }
}
function stats(rows: any[]) {
  const times = rows.map(r => r.ms).sort((a,b) => a-b);
  const p = (n: number) => times[Math.max(0, Math.ceil(times.length*n)-1)] || 0;
  return { requests: rows.length, failed: rows.filter(r => !r.ok).length, p50ms: p(.5), p95ms: p(.95), maxMs: p(1) };
}
async function main() {
try {
  await mkdir('outputs/load-tests', { recursive: true });
  const inserted = await db.from('authorized_users').insert(codes.map(advisor_code => ({ advisor_code, full_name: `LOAD TEST ${runId}`, group_name: runId, password_hash: hashPassword(password), is_active: true })));
  if (inserted.error) throw new Error(`Provision failed: ${inserted.error.code}`);
  console.log('Created 100 isolated accounts. Browser pilot starting.');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => browserErrors.push(e.message));
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.origin === new URL(origin).origin && u.pathname.startsWith('/api/') && req.method() === 'GET') paths.add(u.pathname + u.search);
    if (u.origin === new URL(origin).origin && u.pathname === '/api/tvv-reward-estimate' && req.method() === 'POST') {
      const body = req.postDataJSON();
      calculations.set(JSON.stringify(body), body);
    }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[autocomplete="username"]').fill(codes[0]);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.tvv-login-submit').click();
  await page.locator('.tvv-bottom-nav').waitFor({ timeout: 60000 });
  const labels = await page.locator('.tvv-bottom-nav button').allTextContents();
  for (const label of labels) {
    const start = performance.now();
    await page.locator('.tvv-bottom-nav button').filter({ hasText: label }).click();
    await page.waitForTimeout(2500);
    const active = await page.locator('.tvv-bottom-nav button[aria-current="page"]').textContent();
    browserTabs.push({ label, active, ms: Math.round(performance.now()-start), bodyCharacters: (await page.locator('main').innerText()).length });
    console.log(`Browser tab: ${label}`);
  }
  await page.locator('.tvv-bottom-nav button').first().click();
  await page.waitForTimeout(1500);
  for (const selector of ['.tvv-leaderboard-preview', '.tvv-archive-preview', '.tvv-avatar-button']) {
    await page.locator('.tvv-bottom-nav button').first().click();
    await page.locator(selector).click();
    await page.waitForTimeout(3000);
    browserTabs.push({ label: selector, bodyCharacters: (await page.locator('main').innerText()).length });
  }
  await page.screenshot({ path: `outputs/load-tests/${runId}-pilot.png`, fullPage: true });
  await browser.close(); browser = undefined;
  console.log(`Pilot passed. Discovered ${paths.size} GET endpoints. Starting 100 simultaneous logins.`);
  const started = performance.now();
  const sessions = await Promise.all(codes.map(async code => {
    const login = await request('login', '/api/user/auth', '', { username: code, password });
    const cookie = login?.response.headers.get('set-cookie')?.match(/bvnt_user_session=[^;\s,]+/)?.[0];
    return cookie || null;
  }));
  console.log(`Logged in: ${sessions.filter(Boolean).length}/100`);
  const endpoints = [...paths].filter(p => p !== '/api/user/auth');
  for (let round = 1; round <= 2; round++) {
    await Promise.all(sessions.map(async (cookie, index) => {
      if (!cookie) return;
      await request('session', '/api/user/auth', cookie);
      for (const path of endpoints) await request(`round${round}:${new URL(path, origin).pathname}`, path.replaceAll(codes[0], codes[index]), cookie);
      for (const body of calculations.values()) {
        const payload = JSON.parse(JSON.stringify(body).replaceAll(codes[0], codes[index]));
        payload.advisor = { code: codes[index], name: `LOAD TEST ${runId}`, group: runId };
        await request(`round${round}:reward-estimate`, '/api/tvv-reward-estimate', cookie, payload);
      }
    }));
    console.log(`Completed endpoint round ${round}: ${samples.length} requests`);
  }
  console.log(`Load duration: ${Math.round((performance.now()-started)/1000)}s`);
} catch (e: any) { runError = e.message; console.log(`Run error: ${runError}`); }
finally {
  await browser?.close();
  const removed = await db.from('authorized_users').delete().in('advisor_code', codes).select('advisor_code');
  const remaining = await db.from('authorized_users').select('advisor_code').in('advisor_code', codes);
  cleanupOk = !removed.error && !remaining.error && remaining.data?.length === 0;
  const report = { runId, origin, users: 100, scope: '100 distinct real authenticated HTTP sessions; simultaneous login; two sequential-per-user rounds of browser-discovered GET endpoints and reward calculation POSTs, with per-user identity. One real browser pilots five advisor main navigation tabs, leaderboard, archive and profile. Not 100 concurrent rendering browsers; no business-data writes; synthetic accounts have no revenue records; excludes management-only tabs and unvisited secondary tools. Browser step durations include fixed observation waits and are not latency measurements.', browserTabs, browserErrors, calculationVariants: calculations.size, endpoints: [...paths], total: stats(samples), stages: Object.fromEntries([...new Set(samples.map(s => s.stage))].map(s => [s, stats(samples.filter(r => r.stage === s))])), failures: samples.filter(s => !s.ok), cleanupOk, runError };
  await writeFile(`outputs/load-tests/${runId}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (runError || !cleanupOk || report.total.failed) process.exitCode = 1;
}
}
void main().catch(e => { console.error(e.message); process.exitCode = 1; });
