import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "../lib/supabase";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { validBanDinhCounts, validBanDinhSettings } from "../lib/ban-dinh";
import { GET, PUT } from "../app/api/ban-dinh/route";
import { GET as adminReports } from "../app/api/admin/ban-dinh-reports/route";
import { ADMIN_COOKIE, adminSessionToken } from "../lib/admin-auth";
import { PUT as changeSession } from "../app/api/admin/ban-dinh-session/route";
import { POST as resetStatistics } from "../app/api/admin/ban-dinh-reset/route";

async function main() {
  assert.ok(validBanDinhCounts({ consultations: 0, contracts: 0 }));
  for (const value of [-1, .5, "2", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) assert.equal(validBanDinhCounts({ consultations: value, contracts: 0 }), false);
  assert.equal(validBanDinhSettings({ banner: "", visible: true }), false);
  assert.ok(validBanDinhSettings({ banner: "", visible: false }));
  const client = getSupabaseAdmin() as any;
  const originalFrom = client.from;
  const originalStorageFrom = client.storage.from;
  const originalCreate = client.storage.createBucket;
  const objects = new Map<string, string>();
  let visible = true;
  client.from = () => ({ select: () => ({ eq: (_: string, code: string) => ({ single: async () => ({ data: { advisor_code: code, is_active: true }, error: null }) }), in: async (_: string, codes: string[]) => ({ data: codes.map(code => ({ advisor_code: code, full_name: `Name ${code}` })), error: null }) }) });
  client.storage.createBucket = async (_name: string, options: any) => { assert.equal(options.public, false); return { error: null }; };
  client.storage.from = (bucket: string) => ({
    list: async (prefix: string, options: { offset: number; limit: number }) => ({ data: [...objects.keys()].filter(key => key.startsWith(`${bucket}/${prefix}/`)).sort().slice(options.offset, options.offset + options.limit).map(key => ({ name: key.split('/').at(-1) })), error: null }),
    download: async (path: string) => {
      if (path === "data/ban-dinh-settings.json") return { data: new Blob([JSON.stringify({ banner: "/api/archive/file?path=uploads%2Finvitations%2Ftest.png", visible })]), error: null };
      const text = objects.get(`${bucket}/${path}`);
      return text ? { data: new Blob([text]), error: null } : { data: null, error: { statusCode: "404", message: "Object not found" } };
    },
    upload: async (path: string, text: string | ArrayBuffer, options?: { upsert?: boolean }) => { if (options?.upsert === false && objects.has(`${bucket}/${path}`)) return { error: { statusCode: "409", message: "The resource already exists" } }; objects.set(`${bucket}/${path}`, typeof text === "string" ? text : new TextDecoder().decode(text)); return { error: null }; }
  });
  function request(method: string, code?: string, body?: unknown) {
    return new NextRequest("http://localhost:3000/api/ban-dinh", { method, headers: { ...(code ? { cookie: `${USER_COOKIE}=${createUserToken(code)}` } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  try {
    const sessionRequest = (action: string) => new NextRequest("http://localhost:3000/api/admin/ban-dinh-session", { method: "PUT", headers: { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    assert.equal((await GET(request("GET"))).status, 401);
    assert.equal((await PUT(request("PUT", undefined, {}))).status, 401);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 1, contracts: 1 }))).status, 409);
    assert.equal((await changeSession(request("PUT", "TEST_A", { action: "start" }))).status, 401);
    assert.equal((await changeSession(sessionRequest("start"))).status, 200);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: -1, contracts: 2 }))).status, 400);
    assert.equal((await GET(request("GET", "TEST_A"))).status, 200);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 12, contracts: 3, advisorCode: "TEST_B" }))).status, 200);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 15, contracts: 4 }))).status, 409);
    const saved = await (await GET(request("GET", "TEST_A"))).json();
    assert.equal(saved.entry.consultations, 12); assert.equal(saved.entry.contracts, 3); assert.equal(saved.entry.advisorCode, "TEST_A");
    assert.equal((await (await GET(request("GET", "TEST_B"))).json()).entry, null);
    assert.equal([...objects.keys()].filter(key => key.startsWith('ban-dinh-reports/')).length, 1);
    assert.equal((await adminReports(request("GET"))).status, 401);
    const adminRequest = () => new NextRequest("http://localhost:3000/api/admin/ban-dinh-reports", { headers: { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}` } });
    let summary = await (await adminReports(adminRequest())).json();
    assert.deepEqual(summary.totals, { users: 1, consultations: 12, contracts: 3 });
    assert.equal(summary.rows[0].advisorName, "Name TEST_A");
    await PUT(request("PUT", "TEST_B", { consultations: 5, contracts: 10 }));
    summary = await (await adminReports(adminRequest())).json();
    assert.deepEqual(summary.totals, { users: 2, consultations: 17, contracts: 13 });
    assert.equal(summary.session.running, true);
    assert.equal((await changeSession(sessionRequest("end"))).status, 200);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 99, contracts: 99 }))).status, 409);
    summary = await (await adminReports(adminRequest())).json();
    assert.equal(summary.session.running, false);
    assert.deepEqual(summary.totals, { users: 2, consultations: 17, contracts: 13 });
    assert.equal((await changeSession(sessionRequest("start"))).status, 200);
    assert.equal((await resetStatistics(request("POST", "TEST_A", { confirm: true }))).status, 401);
    const resetRequest = (confirm: boolean) => new NextRequest("http://localhost:3000/api/admin/ban-dinh-reset", { method: "POST", headers: { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
    assert.equal((await resetStatistics(resetRequest(false))).status, 400);
    const reset = await resetStatistics(resetRequest(true));
    assert.equal(reset.status, 200);
    const resetSummary = await (await adminReports(adminRequest())).json();
    assert.deepEqual(resetSummary.totals, { users: 0, consultations: 0, contracts: 0 });
    assert.equal(resetSummary.session.running, false);
    assert.ok(resetSummary.session.reportPrefix.startsWith("rounds/"));
    assert.ok(objects.has("ban-dinh-reports/latest/TEST_A.json"), "Historical data remains recoverable");
    assert.equal((await (await GET(request("GET", "TEST_A"))).json()).entry, null);
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 1, contracts: 1 }))).status, 409);
    await changeSession(sessionRequest("start"));
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 3, contracts: 2 }))).status, 200);
    assert.deepEqual((await (await adminReports(adminRequest())).json()).totals, { users: 1, consultations: 3, contracts: 2 });
    visible = false;
    assert.equal((await PUT(request("PUT", "TEST_A", { consultations: 1, contracts: 1 }))).status, 403);
    console.log("Bán đỉnh: validation, authentication, private storage, latest overwrite, per-user isolation and hidden-state checks passed (mock storage).");
  } finally {
    client.from = originalFrom; client.storage.from = originalStorageFrom; client.storage.createBucket = originalCreate;
  }
}
void main();
