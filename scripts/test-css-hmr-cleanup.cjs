const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const transform = require("./css-hmr-cleanup-loader.cjs");
const source = fs.readFileSync(require.resolve("next/dist/compiled/mini-css-extract-plugin/hmr/hotModuleReplacement.js"), "utf8");
assert.equal(source.split("e.parentNode.removeChild(e)").length - 1, 2);
const patched = transform(source);
assert.ok(!patched.includes("e.parentNode.removeChild(e)"));
new vm.Script(patched);
for (const event of ["load", "error"]) {
  const listeners = {};
  let removed = 0;
  const clone = { addEventListener: (name, callback) => { listeners[name] = callback; } };
  const link = {
    href: "http://localhost:3000/test.css",
    cloneNode: () => clone,
    parentNode: { appendChild() {} },
    remove() { removed++; }
  };
  const sandbox = {
    module: { exports: {} }, __dirname,
    document: { currentScript: { src: "http://localhost:3000/test.js" }, querySelectorAll: () => [link] },
    console: { log() {} }, setTimeout: callback => { callback(); return 1; }, clearTimeout() {}
  };
  vm.runInNewContext(patched, sandbox);
  sandbox.module.exports("test", {})();
  link.parentNode = null;
  listeners[event]();
  listeners[event]();
  assert.equal(removed, 1, `${event}: cleanup is safe after detachment and runs once`);
}
console.log("CSS HMR cleanup: load/error after detachment passed");
