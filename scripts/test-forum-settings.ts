import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminSessionToken } from "../lib/admin-auth";
import { USER_COOKIE, createUserToken } from "../lib/user-auth";
import { defaultForumSettings, validForumSettings } from "../lib/forum-settings";
import { GET, PUT } from "../app/api/admin/forum-settings/route";
import { GET as publicSettings } from "../app/api/forum-settings/route";
import { forumAccount } from "../lib/forum-server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-settings-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
let stored: unknown = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  assert.equal(url.host, "forum-settings-test.invalid");
  if (url.pathname.endsWith("/archive/data/forum-settings.json")) {
    if (init?.method === "POST") { stored = JSON.parse(String(init.body)); return Response.json({ Key: "saved" }); }
    return stored ? Response.json(stored) : Response.json({ statusCode: "404", message: "Object not found" }, { status: 404 });
  }
  if (url.pathname.endsWith("authorized_users")) return Response.json({ advisor_code: "ADMIN" });
  throw new Error(`Unexpected fixture request ${url.pathname}`);
};
function request(cookie = "", value?: unknown) {
  return new NextRequest("http://localhost/api/admin/forum-settings", { method: value === undefined ? "GET" : "PUT", headers: { cookie, "Content-Type": "application/json" }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
}
async function main() {
  const admin = `${ADMIN_COOKIE}=${adminSessionToken()}`;
  const user = `${USER_COOKIE}=${createUserToken("MEMBER")}`;
  const adminUser = `${USER_COOKIE}=${createUserToken("ADMIN")}`;
  assert.equal((await GET(request())).status, 401);
  assert.equal((await PUT(request(user, defaultForumSettings))).status, 401);
  assert.deepEqual(await (await GET(request(admin))).json(), defaultForumSettings);
  assert.equal(validForumSettings({ ...defaultForumSettings, banner: "javascript:alert(1)" }), false);
  assert.equal((await PUT(request(admin, { ...defaultForumSettings, adminOnly: "yes" }))).status, 400);
  const next = { ...defaultForumSettings, adminOnly: true };
  assert.equal((await PUT(request(admin, next))).status, 200);
  assert.deepEqual(await (await GET(request(admin))).json(), next);
  assert.equal((await (await publicSettings(request(user))).json()).visible, false);
  assert.equal((await (await publicSettings(request(adminUser))).json()).visible, true);
  assert.equal((await (await publicSettings(request(admin))).json()).visible, false);
  // Same browser: management cookie must not elevate a non-admin user.
  for (const code of ["MEMBER", "TEAM_LEADER"]) {
    const mixed = `${admin}; ${USER_COOKIE}=${createUserToken(code)}`;
    const visible = await (await publicSettings(request(mixed))).json();
    assert.equal(visible.visible, false);
    assert.equal(visible.banner, "");
    await assert.rejects(forumAccount(request(mixed)), (e: any) => e.status === 403);
  }
  assert.equal((await (await publicSettings(request(`${admin}; ${adminUser}`))).json()).visible, true);
  await assert.rejects(forumAccount(request(user)), (e: any) => e.status === 403);
  await PUT(request(admin, { ...next, visible: false }));
  assert.equal((await (await publicSettings(request(adminUser))).json()).visible, false);
  await assert.rejects(forumAccount(request(adminUser)), (e: any) => e.status === 403);
  await PUT(request(admin, defaultForumSettings));
  assert.equal((await (await publicSettings(request(user))).json()).visible, true);
  assert.equal((await (await publicSettings(request(`${admin}; ${user}`))).json()).visible, true);
  console.log("PASS: default, persistence, validation, admin authorization, all users, admin-only and hidden API access.");
}
main().finally(() => { globalThis.fetch = originalFetch; }).catch(e => { console.error(e); process.exitCode = 1; });
