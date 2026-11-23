import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { GET, PATCH } from "../app/api/forum/notifications/route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-notifications.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
process.env.USER_SESSION_SECRET = "fixture-secret";
const id = "11111111-1111-4111-8111-111111111111";
let writes = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.host, "forum-notifications.invalid");
  if (url.pathname.includes("forum-settings.json")) return Response.json({ banner: "/images/BG%20DD2.png", visible: true, adminOnly: false });
  if (url.pathname.endsWith("authorized_users")) return Response.json({ advisor_code: "MEMBER" });
  assert.ok(url.pathname.endsWith("forum_notifications"));
  assert.equal(url.searchParams.get("recipient_code"), "eq.MEMBER");
  if (init?.method === "PATCH") {
    writes++;
    assert.equal(url.searchParams.get("read_at"), "is.null");
    assert.equal(url.searchParams.get("id"), `in.(${id})`);
    assert.ok(JSON.parse(String(init.body)).read_at);
    return new Response(null, { status: 204 });
  }
  return Response.json([{ id, topic_id: id, kind: "comment", created_at: "2026-11-24T00:00:00Z", read_at: null, forum_topics: { title: "Test topic" } }]);
};
function request(method = "GET", ids: unknown = [id], origin = "http://localhost", signedIn = true) {
  return new NextRequest("http://localhost/api/forum/notifications", {
    method, headers: { origin, ...(signedIn ? { cookie: `${USER_COOKIE}=${createUserToken("MEMBER")}` } : {}), "Content-Type": "application/json" },
    ...(method === "PATCH" ? { body: JSON.stringify({ ids }) } : {}),
  });
}
async function main() {
  assert.equal((await GET(request("GET", [], "http://localhost", false))).status, 401);
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const { events } = await response.json();
  assert.equal(events[0].id, `forum:${id}`);
  assert.equal(events[0].topic_id, id);
  assert.ok(events[0].content.includes("Test topic"));
  assert.equal(events[0].read_at, null);
  assert.equal((await PATCH(request("PATCH"))).status, 200);
  assert.equal((await PATCH(request("PATCH", ["bad"]))).status, 400);
  assert.equal((await PATCH(request("PATCH", []))).status, 400);
  assert.equal((await PATCH(request("PATCH", [id], "https://evil.example"))).status, 403);
  assert.equal(writes, 1);
  console.log("PASS: authenticated recipient isolation, private response, topic link, read-state validation and origin protection.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
