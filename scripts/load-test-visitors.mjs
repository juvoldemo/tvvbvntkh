import { mkdir, writeFile } from 'node:fs/promises';

const origin = new URL(process.argv[2] || 'https://www.bandothunhap.com').origin;
const count = 100;
const samples = [];
async function get(path, stage, record = true) {
  const start = performance.now();
  let status = 0, ok = false, bytes = 0, error = '';
  try {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
    status = response.status;
    const body = await response.text();
    bytes = Buffer.byteLength(body);
    ok = response.ok;
    if (!ok) throw new Error(`HTTP ${status}`);
    if (stage === 'html' && !body.includes('<html')) throw new Error('Expected HTML');
    if (stage === 'session' && JSON.parse(body).authenticated !== false) throw new Error('Unexpected anonymous session');
    return body;
  } catch (e) { ok = false; error = e.message; return ''; }
  finally { if (record) samples.push({ stage, status, ok, bytes, ms: performance.now() - start, error }); }
}
function stats(rows) {
  const times = rows.map(r => r.ms).sort((a,b) => a-b);
  const p = n => Math.round(times[Math.max(0, Math.ceil(times.length*n)-1)] || 0);
  return { requests: rows.length, successful: rows.filter(r=>r.ok).length, failed: rows.filter(r=>!r.ok).length,
    p50ms: p(.5), p95ms: p(.95), maxMs: p(1), statuses: rows.reduce((a,r) => {a[r.status]=(a[r.status]||0)+1;return a;}, {}) };
}
const html = await get('/', 'html', false);
if (!html) throw new Error('Preflight failed');
const assets = [...new Set([...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g)].map(m=>m[1]))]
  .filter(path=>new URL(path,origin).origin === origin && path.includes('/_next/'));
if (!assets.length) throw new Error('No Next.js assets discovered');
console.log(`Testing ${count} simultaneous anonymous visitors, ${assets.length} JS/CSS assets per visitor.`);
const startedAt = new Date().toISOString();
const start = performance.now();
const visitors = await Promise.all(Array.from({length: count}, async (_, id) => {
  const begin = performance.now();
  const page = await get('/', 'html');
  if (page) {
    // Six asset workers approximate a browser connection budget per visitor.
    let next = 0;
    await Promise.all([get('/api/user/auth', 'session'), ...Array.from({length:6}, async()=> {
      while (next < assets.length) await get(assets[next++], 'asset');
    })]);
  }
  return { id: id+1, ms: performance.now()-begin, ok: Boolean(page) };
}));
const report = { origin, startedAt, users: count, elapsedSeconds: (performance.now()-start)/1000,
  scope: '100 simultaneous anonymous HTTP journeys: HTML, same-origin JS/CSS, anonymous session. No JS execution, rendering, login, dashboard data, images or sustained traffic. Assets fetched without a local browser cache. Timings include load-generator queuing.',
  assetsPerVisitor: assets.length, total: stats(samples),
  stages: Object.fromEntries(['html','asset','session'].map(s=>[s,stats(samples.filter(r=>r.stage===s))])),
  visitorJourney: Object.fromEntries(Object.entries(stats(visitors)).filter(([key])=>['p50ms','p95ms','maxMs'].includes(key))), failures: samples.filter(r=>!r.ok),
  decodedBytes: samples.reduce((sum,r)=>sum+r.bytes,0) };
await mkdir('outputs/load-tests',{recursive:true});
const path = `outputs/load-tests/visitors-${Date.now()}.json`;
await writeFile(path,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
console.log(`Report: ${path}`);
if (report.total.failed) process.exitCode=1;
