import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { PUT } from "../app/api/forum/[id]/reactions/route";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
process.env.USER_SESSION_SECRET = "fixture-session-secret";
const id = "11111111-1111-4111-8111-111111111111";
const commentId = "22222222-2222-4222-8222-222222222222";
let reaction: string | null = null;
let found = true;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.host, "forum-test.invalid");
  if (url.pathname.endsWith("/archive/data/forum-settings.json")) return Response.json({ banner: "/images/BG%20DD2.png", visible: true, adminOnly: false });
  if (url.pathname.endsWith("authorized_users")) return Response.json({ advisor_code: "MEMBER" });
  if (url.pathname.endsWith("forum_comments")) return Response.json(found ? { id: commentId } : null);
  if (url.pathname.endsWith("forum_comment_reactions")) {
    if (init?.method === "DELETE") { assert.match(url.search, /MEMBER/); reaction = null; }
    else { const body = JSON.parse(String(init?.body)); assert.equal(body.author_code, "MEMBER"); reaction = body.reaction; }
    return new Response(null, { status: 204 });
  }
  if (url.pathname.endsWith("forum_reaction_counts")) return Response.json([{ comment_id: commentId, likes: reaction === "like" ? 1 : 0, dislikes: reaction === "dislike" ? 1 : 0, my_reaction: reaction }]);
  throw new Error(`Unexpected fixture request: ${url.pathname}`);
};
function request(value: unknown, authenticated = true) {
  return new NextRequest(`http://localhost/api/forum/${id}/reactions`, { method: "PUT", headers: { origin: "http://localhost", "Content-Type": "application/json", ...(authenticated ? { cookie: `${USER_COOKIE}=${createUserToken("MEMBER")}` } : {}) }, body: JSON.stringify({ commentId, reaction: value }) });
}
async function main() {
  assert.equal((await PUT(request("like", false), { params: { id } })).status, 401);
  assert.equal((await PUT(request("invalid"), { params: { id } })).status, 400);
  for (const value of ["like", "dislike", null]) {
    const result = await PUT(request(value), { params: { id } });
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.equal(data.my_reaction, value);
    assert.equal(data.likes, value === "like" ? 1 : 0);
    assert.equal(data.dislikes, value === "dislike" ? 1 : 0);
  }
  found = false;
  assert.equal((await PUT(request("like"), { params: { id } })).status, 404);
  console.log("Forum reaction tests passed: auth, validation, like, switch, remove, missing comment.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
