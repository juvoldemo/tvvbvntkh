import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { GET } from "../app/api/forum/[id]/author/route";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-author.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
process.env.USER_SESSION_SECRET = "fixture-secret";
const id = "11111111-1111-4111-8111-111111111111";
let viewer = "MEMBER";
let anonymous = true;
let found = true;
let privateReads = 0;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.host, "forum-author.invalid");
  if (url.pathname.includes("forum-settings.json")) return Response.json({ banner: "/images/BG%20DD2.png", visible: true, adminOnly: false });
  if (url.pathname.endsWith("authorized_users")) {
    if (url.searchParams.get("select") === "advisor_code,full_name,group_name") { privateReads++; return Response.json({ full_name: "Test Author", group_name: "Test Group" }); }
    return Response.json({ advisor_code: viewer });
  }
  if (url.pathname.endsWith("forum_comments")) assert.equal(url.searchParams.get("topic_id"), `eq.${id}`);
  if (url.pathname.endsWith("forum_comments") || url.pathname.endsWith("forum_topics")) return Response.json(found ? { author_code: "SECRET_MEMBER", anonymous } : null);
  throw new Error(`Unexpected request ${url.pathname}`);
};
async function request(code: string, suffix = "") {
  viewer = code;
  return GET(new NextRequest(`http://localhost/api/forum/${id}/author${suffix}`, { headers: { cookie: `${USER_COOKIE}=${createUserToken(code)}` } }), { params: { id } });
}
async function main() {
  const denied = await request("MEMBER");
  assert.equal(denied.status, 403);
  assert.equal(privateReads, 0);
  assert.ok(!JSON.stringify(await denied.json()).includes("SECRET_MEMBER"));
  const admin = await request("ADMIN", `?comment=${id}`);
  assert.equal(admin.status, 200);
  assert.equal(admin.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await admin.json(), { code: "SECRET_MEMBER", name: "Test Author", group: "Test Group" });
  assert.equal((await request("ADMIN")).status, 200);
  assert.equal((await request("ADMIN", "?comment=bad")).status, 404);
  anonymous = false;
  assert.equal((await request("ADMIN")).status, 404);
  anonymous = true; found = false;
  assert.equal((await request("ADMIN")).status, 404);
  console.log("PASS: ADMIN-only author lookup, private response, topic scoping, invalid/missing/non-anonymous records.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
