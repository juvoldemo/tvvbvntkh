import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createUserToken, USER_COOKIE } from "../lib/user-auth";
import { GET } from "../app/api/forum/[id]/route";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forum-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
process.env.USER_SESSION_SECRET = "fixture-session-secret";
const id = "11111111-1111-4111-8111-111111111111";
const roots = Array.from({ length: 21 }, (_, index) => ({ id: `root-${index}`, parent_id: null, topic_id: id, author_code: "MEMBER", anonymous: true, attachments: [], content: `Root ${index}` }));
const nested = Array.from({ length: 12 }, (_, index) => ({ ...roots[0], id: `reply-${index}`, parent_id: index ? `reply-${index - 1}` : "root-0" }));
let data = [...roots, ...nested];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.host, "forum-test.invalid");
  if (url.pathname.endsWith("/archive/data/forum-settings.json")) return Response.json({ banner: "/images/BG%20DD2.png", visible: true, adminOnly: false });
  if (url.pathname.endsWith("authorized_users")) return Response.json({ advisor_code: "MEMBER" });
  if (url.pathname.endsWith("forum_topics")) return Response.json({ id, author_code: "MEMBER", anonymous: true, attachments: [] });
  if (url.pathname.endsWith("forum_reaction_counts")) return Response.json([]);
  if (url.pathname.endsWith("forum_popular_comments")) {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.target_topic, id);
    // Fixture ranking puts a popular root outside the oldest first page first.
    const ranked = [roots[20], ...roots.slice(0, 20)];
    return Response.json(ranked.slice(body.page_offset, body.page_offset + 10));
  }
  if (url.pathname.endsWith("forum_comments")) {
    let rows = url.searchParams.get("parent_id") === "is.null" ? data.filter(row => !row.parent_id) : data.filter(row => (url.searchParams.get("parent_id") || "").includes(`"${row.parent_id}"`) || (url.searchParams.get("parent_id") || "").slice(4, -1).split(",").includes(row.parent_id || ""));
    const count = rows.length;
    if (init?.method !== "HEAD" && url.searchParams.get("parent_id") === "is.null") {
      const order = url.searchParams.get("order");
      assert.ok(order === "created_at.asc,id.asc" || order === "created_at.desc,id.desc");
      if (order === "created_at.desc,id.desc") rows.reverse();
    }
    const start = Number(url.searchParams.get("offset") || 0);
    rows = rows.slice(start, start + Number(url.searchParams.get("limit") || 1000));
    return new Response(init?.method === "HEAD" ? null : JSON.stringify(rows), { headers: { "Content-Type": "application/json", "Content-Range": `0-${Math.max(0, count - 1)}/${count}` } });
  }
  throw new Error(`Unexpected fixture request ${url.pathname}`);
};
async function page(value: string, sort = "oldest") {
  const response = await GET(new NextRequest(`http://localhost/api/forum/${id}?page=${value}&sort=${sort}`, { headers: { cookie: `${USER_COOKIE}=${createUserToken("MEMBER")}` } }), { params: { id } });
  assert.equal(response.status, 200);
  return response.json();
}
async function main() {
  const first = await page("0");
  assert.equal(first.totalPages, 3);
  assert.equal(first.rootCount, 21);
  assert.equal(first.comments.filter((row: { parent_id: string | null }) => !row.parent_id).length, 10);
  assert.equal(first.comments.length, 22, "All twelve nested descendants stay with their root");
  const second = await page("1");
  assert.equal(second.comments.length, 10);
  assert.equal(second.comments[0].id, "root-10");
  const last = await page("last");
  assert.equal(last.page, 2); assert.equal(last.comments.length, 1);
  assert.equal((await page("999")).page, 2);
  const newest = await page("0", "newest");
  assert.equal(newest.comments[0].id, "root-20");
  assert.equal((await page("1", "newest")).comments[0].id, "root-10");
  const popular = await page("0", "popular");
  assert.equal(popular.comments[0].id, "root-20");
  assert.equal(popular.comments.length, 22, "Popular pagination retains nested replies");
  assert.equal((await page("1", "popular")).comments[0].id, "root-9");
  data = roots.slice(0, 10);
  assert.equal((await page("0")).totalPages, 1);
  data = [];
  assert.equal((await page("0")).totalPages, 1);
  console.log("PASS: oldest/newest/popular pagination, nested descendants, last page, clamping, ten roots, empty topic.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
