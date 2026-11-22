import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright";

// Runs against the local app; all account/storage APIs are isolated fixtures.
// Uses the real bundled segmentation model, without modifying account data.
const origin = process.env.AVATAR_TEST_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  await mkdir("outputs/avatar-fix", { recursive: true });
  try {
    const fixturePage = await browser.newPage();
    await fixturePage.goto(origin);
    const original = Buffer.from(await fixturePage.evaluate(async () => {
      const image = new Image();
      image.src = "/images/avatar-cutouts/c88833df-e2ed-4d06-9b1f-0d3719d871cf.png";
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    }), "base64");
    await fixturePage.close();

    async function check(name: string, saved: Buffer | null, storageFails = false, blockModel = false) {
      const context: BrowserContext = await browser.newContext({ viewport: { width: 475, height: 850 } });
      const source = `${origin}/__avatar-test/${name}.png`;
      let saves = 0;
      const errors: string[] = [];
      await context.addInitScript(() => {
        (window as any).rawAvatarShown = false;
        new MutationObserver(() => {
          if (document.querySelector('.tvv-avatar img[src*="/__avatar-test/"]')) {
            (window as any).rawAvatarShown = true;
          }
        }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
      });
      await context.route("**/__avatar-test/**", (route) => route.fulfill({ contentType: "image/png", body: original }));
      await context.route("**/__saved-test.png", (route) => route.fulfill({ contentType: "image/png", body: saved! }));
      if (blockModel) await context.route("**/models/**", (route) => route.abort());
      await context.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/user/auth") return route.fulfill({ json: {
          authenticated: true, advisorCode: name.toUpperCase(),
          profile: { advisor_code: name.toUpperCase(), full_name: name, avatar_url: source, dashboard_role: "advisor" },
        } });
        if (path === "/api/user/avatar-cutout") {
          if (route.request().method() === "POST") {
            saves++;
            return route.fulfill({ status: 503, json: {} });
          }
          return route.fulfill({ status: storageFails ? 503 : 200,
            json: { sourceUrl: source, avatarUrl: saved ? `${origin}/__saved-test.png` : null } });
        }
        return route.fulfill({ json: {} });
      });
      try {
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin);
        await page.waitForFunction(() => document.querySelector<HTMLImageElement>('.tvv-avatar img[src^="blob:"]')?.complete, null, { timeout: 45000 });
        const result = await page.evaluate(async () => {
          const img = document.querySelector<HTMLImageElement>('.tvv-avatar img[src^="blob:"]')!;
          const blob = await fetch(img.src).then((response) => response.blob());
          const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let transparent = 0, visible = 0;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 20) transparent++;
            if (pixels[i] > 200) visible++;
          }
          return { bytes, transparent, visible, raw: (window as any).rawAvatarShown };
        });
        assert(result.transparent > 40 && result.visible > 40, `${name}: usable transparency`);
        assert.equal(result.raw, false, `${name}: original background never displayed`);
        assert.deepEqual(errors, [], `${name}: no browser errors`);
        if (!saved) assert(saves > 0, "new portrait submitted to storage even after a failed lookup");
        await page.screenshot({ path: `outputs/avatar-fix/${name}.png` });
        console.log(`PASS ${name}`);
        return Buffer.from(result.bytes);
      } finally { await context.close(); }
    }

    const cutout = await check("new-user-storage-write-fails", null);
    await check("another-new-user-storage-read-fails", null, true);
    await check("opaque-saved-avatar-regenerated", original);
    await check("saved-avatar-new-device-no-model", cutout, false, true);
    await check("model-unavailable-white-background-fallback", null, false, true);
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
