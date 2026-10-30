import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "../lib/supabase";
import { adminSessionToken, ADMIN_COOKIE } from "../lib/admin-auth";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { POST } from "../app/api/skills-survey/route";
import { DELETE, GET } from "../app/api/admin/skills-survey/route";
import { SKILLS_SURVEY_POINTS } from "../lib/skills-survey-scoring";

async function main() {
  // All storage/profile operations are mocked; this test never writes user data.
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://survey-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "survey-test-key";
  const client = getSupabaseAdmin();
  const objects = new Map<string, string>();
  let active = true;
  let uploadFails = false;
  let listCalls = 0;
  let removalCalls = 0;
  client.from = (() => ({ select: () => ({ eq: (_key: string, code: string) => ({ single: async () => ({ data: { advisor_code: code, full_name: "TVV kiểm thử", group_name: "Nhóm kiểm thử", is_active: active }, error: null }) }) }) })) as unknown as typeof client.from;
  client.storage.createBucket = (async (_name, options) => { assert.equal(options?.public, false); return { data: { name: "test" }, error: null }; }) as typeof client.storage.createBucket;
  client.storage.from = (() => ({
    upload: async (path: string, content: string) => {
      if (uploadFails) return { error: new Error("Storage unavailable") };
      objects.set(path, content); return { error: null };
    },
    list: async (_folder: string, options: { offset: number; limit: number }) => {
      listCalls++;
      return { data: [...objects.keys()].sort().slice(options.offset, options.offset + options.limit).map((name) => ({ name: name.replace("results/", "") })), error: null };
    },
    download: async (path: string) => ({ data: new Blob([objects.get(path)!]), error: null }),
    remove: async (paths: string[]) => {
      removalCalls++;
      assert(paths.every((path) => path.startsWith("results/") && path.endsWith(".json")));
      for (const path of paths) objects.delete(path);
      return { error: null };
    }
  })) as unknown as typeof client.storage.from;

  const token = createUserToken("ADMIN");
  const answers = Object.fromEntries(SKILLS_SURVEY_POINTS.map((row, index) => [index + 1, row.indexOf(4)]));
  const request = (body: unknown, cookie = `${USER_COOKIE}=${token}`) => new NextRequest("http://localhost/api/skills-survey", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
  assert.equal((await POST(request({ advisorCode: 'REGULAR', answers }, USER_COOKIE + '=' + createUserToken('REGULAR')))).status, 403);
  const payload = { advisorCode: "ADMIN", answers, total: 0, skillScores: [0, 0, 0, 0, 0, 0], advisorName: "Spoofed name" };
  assert.equal((await POST(request(payload, ""))).status, 401);
  assert.equal((await POST(request({ ...payload, advisorCode: "OTHER" }))).status, 409);
  assert.equal((await POST(request({ ...payload, answers: {} }))).status, 400);
  assert.equal((await POST(request({ ...payload, answers: { ...answers, 1: 5 } }))).status, 400);
  assert.equal((await POST(request(payload))).status, 200);
  const saved = JSON.parse(objects.get("results/ADMIN.json")!);
  assert.equal(saved.advisorName, "TVV kiểm thử");
  assert.equal(saved.total, 96); assert.equal(saved.average, 10);
  assert.deepEqual(saved.skillScores, [10, 10, 10, 10, 10, 10]);
  assert.equal((await POST(request({ ...payload, answers: { ...answers, 1: 0 } }))).status, 200);
  assert.equal(objects.size, 1);
  assert.equal(JSON.parse(objects.get("results/ADMIN.json")!).total, 93);
  active = false;
  assert.equal((await POST(request(payload))).status, 403);
  active = true; uploadFails = true;
  assert.equal((await POST(request(payload))).status, 503);
  uploadFails = false;
  assert.equal((await GET(new NextRequest("http://localhost/api/admin/skills-survey"))).status, 401);
  for (let index = 0; index < 100; index++) objects.set(`results/EXTRA_${index}.json`, JSON.stringify({ ...saved, advisorCode: `EXTRA_${index}` }));
  const result = await GET(new NextRequest("http://localhost/api/admin/skills-survey", { headers: { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}` } }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).reports.length, 101);
  assert.equal(listCalls, 2);
  const deletion = (body: unknown, authenticated = true) => new NextRequest("http://localhost/api/admin/skills-survey", { method: "DELETE", headers: { "Content-Type": "application/json", ...(authenticated ? { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}` } : {}) }, body: JSON.stringify(body) });
  assert.equal((await DELETE(deletion({ confirm: "delete-all-survey-results" }, false))).status, 401);
  assert.equal((await DELETE(deletion({}))).status, 400);
  assert.equal(removalCalls, 0);
  const deleted = await DELETE(deletion({ confirm: "delete-all-survey-results" }));
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).deleted, 101);
  assert.equal(objects.size, 0);
  assert.equal(removalCalls, 2);
  assert.equal((await DELETE(deletion({ confirm: "delete-all-survey-results" }))).status, 200);
  console.log("PASS: authenticated identity, active user, validation, server scoring, update without duplicates, storage failure, admin authorization and pagination");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
