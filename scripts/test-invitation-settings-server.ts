import assert from "node:assert/strict";
import { defaultInvitationSettings } from "../lib/invitation-settings";
import { readInvitationSettings, saveInvitationSettings } from "../lib/invitation-settings-server";

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json(init?.method === "POST" ? { Key: "archive/data/invitation-settings.json" } : defaultInvitationSettings);
  };
  try {
    assert.deepEqual(await readInvitationSettings(), defaultInvitationSettings);
    const read = requests[0];
    assert.ok(new URL(read.url).searchParams.get("cacheNonce"));
    assert.equal(read.init?.cache, "no-store");
    assert.ok(read.init?.signal);
    await saveInvitationSettings(defaultInvitationSettings);
    assert.equal(requests.length, 2, "Saving must not create or update the bucket");
    assert.ok(requests[1].url.endsWith("/object/archive/data/invitation-settings.json"));
    assert.equal(new Headers(requests[1].init?.headers).get("cache-control"), "max-age=0");
    assert.equal(new Headers(requests[1].init?.headers).get("x-upsert"), "true");
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log("Invitation settings bypass caches and save without bucket mutations.");
}
void main();
