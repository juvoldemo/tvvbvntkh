import assert from "node:assert/strict";
import { requestInvitationSettings } from "../lib/invitation-settings-request";

async function main() {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ ok: true });
    assert.deepEqual(await requestInvitationSettings(), { ok: true });
    globalThis.fetch = async () => Response.json({ error: "Hết phiên" }, { status: 401 });
    await assert.rejects(requestInvitationSettings(), /Hết phiên/);
    globalThis.fetch = async () => new Response("Gateway timeout", { status: 504 });
    await assert.rejects(requestInvitationSettings(), /Máy chủ chưa xử lý/);
    for (const headersReceived of [false, true]) {
      globalThis.fetch = async (_url, init) => {
        const pending = new Promise<never>((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        });
        if (!headersReceived) return pending;
        return { ok: true, json: () => pending } as unknown as Response;
      };
      await assert.rejects(requestInvitationSettings({}, 10), /Máy chủ phản hồi quá lâu/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log("Invitation request success, errors, and stalled headers/body passed.");
}
void main();
