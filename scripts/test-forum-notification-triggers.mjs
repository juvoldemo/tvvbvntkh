// Pass the installed @electric-sql/pglite module path as the first argument.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table forum_topics(id uuid primary key default gen_random_uuid(), author_code text, title text);
    create table forum_comments(id uuid primary key default gen_random_uuid(), topic_id uuid references forum_topics(id) on delete cascade, author_code text);
    create table forum_comment_reactions(comment_id uuid references forum_comments(id) on delete cascade, author_code text, reaction text, primary key(comment_id, author_code));
  `);
  const sql = await readFile(new URL("../supabase/forum-notifications.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.exec(sql); // Migration must also be rerunnable.
  const topic = (await db.query("insert into forum_topics(author_code,title) values ('OWNER','Topic') returning id")).rows[0].id;
  async function comment(author) {
    return (await db.query("insert into forum_comments(topic_id,author_code) values ($1,$2) returning id", [topic, author])).rows[0].id;
  }
  async function recipients() {
    return (await db.query("select recipient_code,kind from forum_notifications order by recipient_code")).rows;
  }
  async function clear() { await db.exec("delete from forum_notifications"); }
  await comment("OWNER");
  assert.deepEqual(await recipients(), []);
  await comment("A");
  assert.deepEqual(await recipients(), [{ recipient_code: "OWNER", kind: "comment" }]);
  await clear();
  const target = await comment("B");
  assert.deepEqual(await recipients(), [{ recipient_code: "A", kind: "comment" }, { recipient_code: "OWNER", kind: "comment" }]);
  await clear();
  await comment("A");
  assert.deepEqual(await recipients(), [{ recipient_code: "B", kind: "comment" }, { recipient_code: "OWNER", kind: "comment" }]);
  await clear();
  await db.query("insert into forum_comment_reactions values ($1,'B','like')", [target]);
  assert.deepEqual(await recipients(), [{ recipient_code: "A", kind: "like" }, { recipient_code: "OWNER", kind: "like" }]);
  await clear();
  await db.query("update forum_comment_reactions set reaction='like' where comment_id=$1", [target]);
  assert.deepEqual(await recipients(), []);
  await db.query("update forum_comment_reactions set reaction='dislike' where comment_id=$1", [target]);
  assert.deepEqual(await recipients(), [{ recipient_code: "A", kind: "dislike" }, { recipient_code: "OWNER", kind: "dislike" }]);
  await clear();
  await db.query("delete from forum_comment_reactions where comment_id=$1", [target]);
  assert.deepEqual(await recipients(), []);
  await comment("B");
  await db.query("delete from forum_topics where id=$1", [topic]);
  assert.deepEqual(await recipients(), []);
  console.log("PASS: SQL migration rerun, owner and participant notifications, no self/duplicate recipients, reaction changes, no removal alerts, cascade cleanup.");
} finally { await db.close(); }
