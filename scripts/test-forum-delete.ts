import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { DELETE, PATCH } from "../app/api/forum/[id]/route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-delete.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
process.env.USER_SESSION_SECRET = "fixture-secret";
const id = "11111111-1111-4111-8111-111111111111";
let viewer = "MEMBER";
let found = true;
let deletes = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.host, "forum-delete.invalid");
  if (url.pathname.includes("forum-settings.json")) return Response.json({ banner: "/images/BG%20DD2.png", visible: true, adminOnly: false });
  if (url.pathname.endsWith("authorized_users")) return Response.json({ advisor_code: viewer });
  if (url.pathname.endsWith("forum_topics")) {
    assert.equal(url.searchParams.get("id"), `eq.${id}`);
    if (init?.method === "DELETE") {
      deletes++;
      assert.equal(url.searchParams.get("author_code"), viewer === "ADMIN" ? null : "eq.OWNER");
      return Response.json({ id });
    }
    return Response.json(found ? { id, author_code: "OWNER" } : null);
  }
  throw new Error(`Unexpected request ${url.pathname}`);
};
async function request(code: string, method = "DELETE", origin = "http://localhost") {
  viewer = code;
  const req = new NextRequest(`http://localhost/api/forum/${id}`, { method, headers: { origin, cookie: `${USER_COOKIE}=${createUserToken(code)}` } });
  return (method === "PATCH" ? PATCH : DELETE)(req, { params: { id } });
}
async function main() {
  assert.equal((await request("MEMBER")).status, 403);
  assert.equal(deletes, 0);
  assert.equal((await request("OWNER")).status, 200);
  assert.equal((await request("ADMIN")).status, 200);
  assert.equal((await request("ADMIN", "PATCH")).status, 403);
  assert.equal((await request("ADMIN", "DELETE", "https://evil.example")).status, 403);
  found = false;
  assert.equal((await request("ADMIN")).status, 404);
  assert.equal(deletes, 2);
  console.log("PASS: admin/owner deletion, member denial, owner-only editing, origin and missing-topic checks.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
