import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { hashPassword } from "../lib/user-auth";
import { evaluateSkillsSurvey } from "../lib/skills-survey-scoring";

config({ path: ".env.local", quiet: true });
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => args[args.indexOf(name) + 1] && args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const origin = new URL(option("--url", "http://localhost:3000")).origin;
const users = Number(option("--users", "100"));
const execute = args.includes("--execute");
const runId = `LT${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
type Sample = { stage: string; ms: number; status: number; ok: boolean };
const samples: Sample[] = [];
const failures: Array<{ user: number; stage: string }> = [];
const created: string[] = [];
const verified = new Set<string>();
const bucket = "skills-survey-reports";
const password = randomBytes(20).toString("base64url");
const code = (index: number) => `${runId}_${String(index).padStart(3, "0")}`;
const answersFor = (index: number) => Object.fromEntries(Array.from({ length: 24 }, (_, q) => [q + 1, (index + q) % 4]));
let client: SupabaseClient<any>;

async function request(stage: string, path: string, init: RequestInit = {}) {
  const start = performance.now();
  let status = 0;
  let ok = false;
  try {
    const response = await fetch(`${origin}${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(30000) });
    status = response.status;
    const body = await response.text();
    ok = response.ok;
    if (!ok) throw new Error(`${stage}: HTTP ${status}`);
    return { response, body };
  } finally { samples.push({ stage, ms: Math.round(performance.now() - start), status, ok }); }
}

async function login(index: number) {
  const { response, body } = await request("login", "/api/user/auth", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: code(index), password })
  });
  assert.equal(JSON.parse(body).advisorCode, code(index));
  const cookie = response.headers.get("set-cookie")?.match(/bvnt_user_session=[^;\s,]+/)?.[0];
  assert.ok(cookie, "Login must return a session cookie");
  const profile = await request("session", "/api/user/auth", { headers: { cookie } });
  assert.equal(JSON.parse(profile.body).advisorCode, code(index));
  await request("page", "/", { headers: { cookie } });
  return cookie;
}

async function submit(index: number, cookie: string) {
  const result = await request("submit", "/api/skills-survey", {
    method: "POST", headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ advisorCode: code(index), answers: answersFor(index) })
  });
  assert.equal(JSON.parse(result.body).ok, true);
}

async function verify(index: number) {
  const { data, error } = await client.storage.from(bucket).download(`results/${code(index)}.json`);
  if (error || !data) throw new Error("Stored result not found in configured Supabase");
  const report = JSON.parse(await data.text());
  const expected = evaluateSkillsSurvey(answersFor(index))!;
  assert.equal(report.advisorCode, code(index));
  assert.deepEqual(report.answers, answersFor(index));
  assert.equal(report.total, expected.total);
  assert.deepEqual(report.skillScores, expected.skills.map(skill => skill.score));
  verified.add(code(index));
}

async function provision(indices: number[]) {
  const hash = hashPassword(password);
  const { error } = await client.from("authorized_users").insert(indices.map(index => ({
    advisor_code: code(index), full_name: `KIỂM THỬ TẢI ${runId} ${index}`,
    group_name: `LOAD TEST ${runId}`, password_hash: hash, is_active: true
  })));
  if (error) throw new Error(`Could not create isolated test accounts (${error.code})`);
  created.push(...indices.map(code));
}

function summary() {
  const stages = Object.fromEntries([...new Set(samples.map(s => s.stage))].map(stage => {
    const rows = samples.filter(s => s.stage === stage);
    const times = rows.map(s => s.ms).sort((a, b) => a - b);
    const percentile = (p: number) => times[Math.max(0, Math.ceil(times.length * p) - 1)];
    return [stage, { requests: rows.length, successful: rows.filter(s => s.ok).length,
      p50ms: percentile(.5), p95ms: percentile(.95), maxMs: times.at(-1),
      statuses: rows.reduce((out, row) => { out[row.status] = (out[row.status] || 0) + 1; return out; }, {} as Record<number, number>) }];
  }));
  return { runId, origin, users, verified: verified.size, stages, failures };
}

async function main() {
  assert.ok(Number.isInteger(users) && users >= 1 && users <= 100, "Use 1–100 users");
  if (!execute) { console.log(JSON.stringify({ dryRun: true, origin, users, actions: "Create isolated accounts; pilot login/submit/verify; 100 concurrent sessions; burst submit; verify; delete only this run's accounts/results." }, null, 2)); return; }
  assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY, "Missing local Supabase configuration");
  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await mkdir("outputs/load-tests", { recursive: true });
  let cleanupOk = false;
  let runError = "";
  try {
    console.log(`Pilot: ${origin}, run ${runId}`);
    await provision([0]);
    const pilotCookie = await login(0);
    await submit(0, pilotCookie);
    await verify(0);
    console.log("Pilot passed: real login, submission and stored scoring verified.");
    const indices = Array.from({ length: users }, (_, i) => i + 1);
    await provision(indices);
    console.log(`Starting ${users} sessions over 10 seconds.`);
    const sessions = await Promise.all(indices.map(async (index, i) => {
      await new Promise(resolve => setTimeout(resolve, i * 10000 / users));
      try { return { index, cookie: await login(index) }; }
      catch { failures.push({ user: index, stage: "login/session/page" }); return null; }
    }));
    console.log(`Burst submitting ${sessions.filter(Boolean).length} completed sessions.`);
    await Promise.all(sessions.map(async session => {
      if (!session) return;
      try { await submit(session.index, session.cookie); }
      catch { failures.push({ user: session.index, stage: "submit" }); }
    }));
    // Verify storage in batches so checking results does not become another load test.
    for (let offset = 0; offset < indices.length; offset += 10) {
      await Promise.all(indices.slice(offset, offset + 10).map(async index => {
        try { await verify(index); } catch { failures.push({ user: index, stage: "stored-result" }); }
      }));
    }
  } catch (error) {
    runError = error instanceof Error ? error.message : "Load test failed";
    process.exitCode = 1;
  } finally {
    if (created.length) {
      // Quiesce test accounts before removing their results. Never enumerate or delete real accounts.
      const disabled = await client.from("authorized_users").update({ is_active: false }).in("advisor_code", created);
      // Allow any requests that timed out at the client to finish before deleting objects.
      await new Promise(resolve => setTimeout(resolve, 5000));
      const removed = await client.storage.from(bucket).remove(created.map(c => `results/${c}.json`));
      const deleted = await client.from("authorized_users").delete().in("advisor_code", created).select("advisor_code");
      cleanupOk = !disabled.error && !removed.error && !deleted.error && deleted.data?.length === created.length;
    } else cleanupOk = true;
    const report = { ...summary(), verifiedLoadUsers: [...verified].filter(c => c !== code(0)).length, pilotVerified: verified.has(code(0)), cleanupOk, runError,
      cleanupCodes: cleanupOk ? [] : created, scope: "HTTP login/session/page + 24-answer API submit; not browser rendering or timed survey interaction" };
    const path = `outputs/load-tests/${runId}.json`;
    await writeFile(path, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`Report: ${path}`);
    if (!cleanupOk || failures.length) process.exitCode = 1;
  }
}

void main().catch(error => { console.error(error instanceof Error ? error.message : "Load test failed"); process.exitCode = 1; });
