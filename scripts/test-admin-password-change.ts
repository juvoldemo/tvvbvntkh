import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PATCH } from "../app/api/admin/access-list/route";
import { ADMIN_COOKIE, adminSessionToken } from "../lib/admin-auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { verifyPassword } from "../lib/user-auth";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
const id = "f0000000-0000-4000-8000-000000000001";
let saved: Record<string, unknown> | null = null;
let target: unknown;
let found = true;
let fallback = false;
const db = getSupabaseAdmin();
// In-memory database substitute: never change a real account's credentials.
db.from = (() => ({ update(fields: Record<string, unknown>) {
  saved = fields;
  return { eq(column: string, value: unknown) { assert.equal(column, "id"); target = value; return this; }, select() { return this; }, async maybeSingle() {
    if (fallback && "password_plain" in fields) return { data: null, error: { message: "column password_plain does not exist" } };
    return { data: found ? { id } : null, error: null };
  } };
} })) as unknown as typeof db.from;
function request(body: unknown, authenticated = true, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/admin/access-list", { method: "PATCH", headers: { "Content-Type": "application/json", origin, ...(authenticated ? { cookie: `${ADMIN_COOKIE}=${adminSessionToken()}` } : {}) }, body: JSON.stringify(body) });
}
async function main() {
  assert.equal((await PATCH(request({ id, password: "new-password" }, false))).status, 401);
  assert.equal(saved, null);
  assert.equal((await PATCH(request({ id, password: "new-password" }, true, "https://other.invalid"))).status, 403);
  assert.equal((await PATCH(request({ id, password: "123" }))).status, 400);
  assert.equal((await PATCH(request({ id: "bad", password: "new-password" }))).status, 400);
  assert.equal(saved, null);
  assert.equal((await PATCH(request({ id, password: "new-password" }))).status, 200);
  assert.equal(target, id);
  assert.ok(verifyPassword("new-password", String(saved!.password_hash)));
  assert.equal(saved!.password_plain, "new-password");
  assert.equal((await PATCH(request({ id, password: "1234" }))).status, 200);
  assert.ok(verifyPassword("1234", String(saved!.password_hash)));
  assert.equal(saved!.password_plain, "1234");
  fallback = true;
  assert.equal((await PATCH(request({ id, password: "another-password" }))).status, 200);
  assert.ok(verifyPassword("another-password", String(saved!.password_hash)));
  assert.ok(!("password_plain" in saved!));
  found = false;
  assert.equal((await PATCH(request({ id, password: "new-password" }))).status, 404);
  console.log("Admin password change: authorization, origin, validation, targeted update, login compatibility, schema fallback and missing account passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
