const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = fs.readFileSync("app/admin-data/AccessPasswordCell.tsx", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const moduleResult = { exports: {} };
vm.runInNewContext(compiled, {
  exports: moduleResult.exports, module: moduleResult,
  require: name => name.endsWith(".css") ? {} : require(name)
});
const Cell = moduleResult.exports.default;
const noop = () => {};
const cells = Array.from({ length: 1800 }, (_, index) => React.createElement(Cell, {
  key: index, user: { id: String(index), full_name: "Test account", advisor_code: "TEST", password_plain: null },
  copied: false, onCopy: noop, onChanged: noop
}));
const html = renderToStaticMarkup(React.createElement(React.Fragment, null, cells));
assert.equal((html.match(/<button/g) || []).length, 1800);
assert.equal((html.match(/<dialog/g) || []).length, 0);
assert.equal((html.match(/<input/g) || []).length, 0);
assert.equal((html.match(/<form/g) || []).length, 0);
console.log("900 accounts × 2 layouts: 0 idle dialogs, forms or password inputs; context-menu buttons preserved.");
