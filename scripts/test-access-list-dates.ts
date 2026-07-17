import assert from "node:assert/strict";
import { parseAccessListDate } from "../lib/access-list-dates";

assert.equal(parseAccessListDate("11/06/2026"), "2026-06-11");
assert.equal(parseAccessListDate("01/07/2026"), "2026-07-01");
assert.equal(parseAccessListDate("11-06-2026"), "2026-06-11");
assert.equal(parseAccessListDate("31/12/2026"), "2026-12-31");
assert.equal(parseAccessListDate("2026-06-11"), "2026-06-11");
assert.equal(parseAccessListDate(""), null);
assert.equal(parseAccessListDate("31/02/2026"), null);

console.log("access-list date parsing ok");
