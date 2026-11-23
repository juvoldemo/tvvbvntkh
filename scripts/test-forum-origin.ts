import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { checkForumOrigin, ForumError } from "../lib/forum-server";

function check(url: string, headers: Record<string, string>, allowed: boolean) {
  const request = new NextRequest(url, { method: "POST", headers });
  if (allowed) assert.doesNotThrow(() => checkForumOrigin(request));
  else assert.throws(() => checkForumOrigin(request), error => error instanceof ForumError && error.status === 403);
}

check("http://localhost:3000/api/forum/topic", { origin: "http://localhost:3000" }, true);
check("http://localhost:3000/api/forum/topic", {}, true);
const proxy = { host: "internal:3000", "x-forwarded-host": "forum.example.com", "x-forwarded-proto": "https" };
check("http://internal:3000/api/forum/topic", { ...proxy, origin: "https://forum.example.com" }, true);
check("http://internal:3000/api/forum/topic", { host: "forum.example.com", "x-forwarded-proto": "https", origin: "https://forum.example.com" }, true);
check("http://internal:3000/api/forum/topic", { ...proxy, "x-forwarded-host": "forum.example.com, internal:3000", "x-forwarded-proto": "https, http", origin: "https://forum.example.com" }, true);
for (const origin of ["https://evil.example", "https://forum.example.com.evil.example", "http://forum.example.com", "https://forum.example.com:444", "null", "invalid"]) {
  check("http://internal:3000/api/forum/topic", { ...proxy, origin }, false);
}
check("http://internal:3000/api/forum/topic", { ...proxy, origin: "http://internal:3000" }, false);
check("http://internal:3000/api/forum/topic", { ...proxy, "x-forwarded-host": "bad/host", origin: "https://bad" }, false);
console.log("Forum origin checks passed (13 cases).");
