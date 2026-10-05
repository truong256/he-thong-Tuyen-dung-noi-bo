import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// npm install --prefix target/department-migration --no-save @electric-sql/pglite
// node scripts/verify-department-migrations.mjs target/department-migration
// Uses an isolated PostgreSQL WASM database, never a shared development database.
const require = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const migrations = new URL('../src/main/resources/db/migration/', import.meta.url);
const files = (await readdir(migrations)).filter(file => /^V\d+__.*\.sql$/.test(file))
  .sort((a, b) => Number(a.match(/^V(\d+)/)[1]) - Number(b.match(/^V(\d+)/)[1]));

for (const legacy of [false, true]) {
  const db = new PGlite();
  try {
    for (const file of files) {
      if (legacy && file.startsWith('V10__')) {
        await db.exec(`CREATE TABLE departments (
          id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, code VARCHAR(20),
          description VARCHAR(255), parent_department_id BIGINT, active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        ); INSERT INTO departments(name, code) VALUES ('Legacy', 'LEGACY');`);
      }
      await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    }
    if (legacy) {
      const row = (await db.query("SELECT * FROM departments WHERE code='LEGACY'")).rows[0];
      assert.equal(row.active, false);
      assert.equal(row.manager_user_id, null);
      await assert.rejects(db.exec("UPDATE departments SET active=TRUE WHERE code='LEGACY'"), error => error.code === '23514');
    }
    const manager = (await db.query("INSERT INTO users(email,password) VALUES('dept-owner@example.test','test-only') RETURNING id")).rows[0].id;
    const root = (await db.query("INSERT INTO departments(name,code,manager_user_id) VALUES('Engineering','ENG',$1) RETURNING id", [manager])).rows[0].id;
    const child = (await db.query("INSERT INTO departments(name,code,manager_user_id,parent_department_id) VALUES('Platform','PLATFORM',$1,$2) RETURNING id", [manager, root])).rows[0].id;
    await assert.rejects(db.query("DELETE FROM departments WHERE id=$1", [root]), error => ['23503', '23001'].includes(error.code) && error.constraint === 'fk_department_parent');
    await assert.rejects(db.query("DELETE FROM users WHERE id=$1", [manager]), error => ['23503', '23001'].includes(error.code) && error.constraint === 'fk_department_manager');
    await assert.rejects(db.exec("INSERT INTO departments(name,code,manager_user_id) VALUES('Other','eng',999999)"), error => ['23503', '23505'].includes(error.code));
    await assert.rejects(db.query("INSERT INTO departments(name,code,manager_user_id) VALUES('Other','eng',$1)", [manager]), error => error.code === '23505');
    await assert.rejects(db.query("INSERT INTO departments(name,code,manager_user_id) VALUES(' engineering ','OTHER',$1)", [manager]), error => error.code === '23505');
    await assert.rejects(db.query("UPDATE departments SET parent_department_id=id WHERE id=$1", [child]), error => error.code === '23514');
    await assert.rejects(db.query("UPDATE departments SET parent_department_id=999999 WHERE id=$1", [child]), error => error.code === '23503');
    await assert.rejects(db.exec("INSERT INTO departments(name,code) VALUES('No manager','NO_MANAGER')"), error => error.code === '23514');
    await db.query("INSERT INTO recruitment_requisitions(requisition_code,title,department_id,status) VALUES('REQ-1','Developer',$1,'CLOSED')", [child]);
    await assert.rejects(db.query("DELETE FROM departments WHERE id=$1", [child]), error => ['23503', '23001'].includes(error.code) && error.constraint === 'fk_requisition_department');
    await db.query("UPDATE departments SET active=FALSE WHERE id=$1", [child]);
    assert.equal((await db.query("SELECT department_id FROM recruitment_requisitions WHERE requisition_code='REQ-1'")).rows[0].department_id, child);
    assert.equal((await db.query('SELECT id FROM department_tree_lock')).rows[0].id, 1);
    console.log(`PASS: ${files.length} migrations; ${legacy ? 'legacy' : 'fresh'} schema; hierarchy/manager/requisition FKs, uniqueness, required manager and history preservation`);
  } finally { await db.close(); }
}
