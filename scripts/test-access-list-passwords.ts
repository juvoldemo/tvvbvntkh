import assert from "node:assert/strict";
import { fillMissingPasswords } from "../lib/access-list-passwords";
import { visiblePasswordRecord, verifyPassword } from "../lib/user-auth";

async function main() {
  const records = Array.from({ length: 20 }, (_, id) => ({ id: String(id), password_hash: null, password_plain: null })) as Record<string, any>[];
  records.push({ id: "existing", password_hash: visiblePasswordRecord("KeepMe!"), password_plain: "KeepMe!" });
  const input = records.map(row => ({ ...row }));
  // Simulate a password changed after the list was read.
  records[0].password_hash = visiblePasswordRecord("Concurrent!");
  records[0].password_plain = "Concurrent!";
  let active = 0, peak = 0;
  const db = { from() {
    let fields: Record<string, unknown> | undefined;
    const filters: Array<[string, unknown]> = [];
    const query = {
      update(value: Record<string, unknown>) { fields = value; return query; },
      eq(key: string, value: unknown) { filters.push([key, value]); return query; },
      is(key: string, value: unknown) { filters.push([key, value]); return query; },
      select() { return fields ? execute() : query; },
      async single() { return { data: records.find(row => filters.every(([key,value]) => row[key] === value)), error: null }; }
    };
    async function execute() {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      const row = records.find(row => filters.every(([key,value]) => row[key] === value));
      if (row) Object.assign(row, fields);
      active--;
      return { data: row ? [{ id: row.id }] : [], error: null };
    }
    return query;
  }};
  const count = await fillMissingPasswords(db as any, input, true);
  assert.equal(count, 19);
  assert.equal(records[0].password_plain, "Concurrent!");
  assert.equal(input[0].password_plain, "Concurrent!");
  assert.equal(records.at(-1)?.password_plain, "KeepMe!");
  assert.ok(peak > 1 && peak <= 8);
  for (const row of records) assert.ok(verifyPassword(row.password_plain, row.password_hash));
  assert.equal(await fillMissingPasswords(db as any, input, true), 0);
  console.log("Password batches: existing credentials preserved, concurrent changes protected, concurrency bounded, repeated runs unchanged.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
