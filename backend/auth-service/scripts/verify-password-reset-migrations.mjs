import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Install @electric-sql/pglite in a temporary directory, then pass that directory.
// PostgreSQL runs in WASM; this script never connects to a shared database.
const require = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const migrations = new URL('../src/main/resources/db/migration/', import.meta.url);
const db = new PGlite();
try {
  const files = (await readdir(migrations)).filter(file => file.endsWith('.sql')).sort();
  for (const file of files) await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  console.log('PASS: V1-V8 migrations execute on PostgreSQL (PGlite)');

  await db.exec(`
    INSERT INTO users (email, password) VALUES ('migration@example.test', 'test-only');
    ALTER TABLE refresh_tokens ADD CONSTRAINT legacy_hibernate_unique_user UNIQUE(user_id);
    ALTER TABLE refresh_tokens ADD CONSTRAINT preserve_composite UNIQUE(user_id, token);
    INSERT INTO refresh_tokens(token, user_id, expiry_date, revoked)
      VALUES ('old-session', 1, now() + interval '7 days', true);
  `);
  const migration = await readFile(new URL('V8__allow_multiple_refresh_sessions.sql', migrations), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(`INSERT INTO refresh_tokens(token, user_id, expiry_date) VALUES
    ('new-session-1', 1, now() + interval '7 days'), ('new-session-2', 1, now() + interval '7 days')`);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM refresh_tokens')).rows[0].count, 3);
  assert.equal((await db.query("SELECT revoked FROM refresh_tokens WHERE token='old-session'")).rows[0].revoked, true);
  assert.equal((await db.query(`SELECT count(*)::int AS count FROM pg_constraint
    WHERE conrelid='refresh_tokens'::regclass AND conname='preserve_composite'`)).rows[0].count, 1);
  await assert.rejects(db.exec(`INSERT INTO refresh_tokens(token, user_id, expiry_date)
    VALUES ('new-session-1', 1, now())`), error => error.code === '23505');
  await assert.rejects(db.exec(`INSERT INTO refresh_tokens(token, user_id, expiry_date)
    VALUES ('unknown-user', 99999, now())`), error => error.code === '23503');
  console.log('PASS: legacy UNIQUE(user_id) removed; data, revocation, token uniqueness, composite constraint and FK preserved; rerun is idempotent');
  console.log((await db.query('SELECT version()')).rows[0].version);
} finally {
  await db.close();
}
