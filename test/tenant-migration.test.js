import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const directory = mkdtempSync(join(tmpdir(), "apna-tenant-migration-"));
const legacyDatabasePath = join(directory, "legacy.sqlite");
const legacyDatabase = new DatabaseSync(legacyDatabasePath);
legacyDatabase.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    shop_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    role TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE email_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    purpose TEXT NOT NULL CHECK (purpose IN ('bootstrap', 'invite', 'reset')),
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    verified_at TEXT
  );
  CREATE TABLE collections (
    collection_key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT INTO users (id, name, shop_name, email, phone, password_hash, role, status, created_at, updated_at)
    VALUES ('legacy-admin', 'Legacy Owner', 'Legacy Textiles', 'legacy@example.test', '', 'hash', 'Admin', 'active', '2026-01-01', '2026-01-01');
  INSERT INTO invitations (id, email, role, token_hash, invited_by, expires_at, created_at)
    VALUES ('legacy-invite', 'team@example.test', 'Staff', 'token-hash', 'legacy-admin', 9999999999999, '2026-01-01');
  INSERT INTO collections (collection_key, value_json, updated_at)
    VALUES ('inventory', '[{"sku":"OLD-1"}]', '2026-01-01');
`);
legacyDatabase.close();

const childScript = `
  import { database } from './server/database.js';
  const user = database.prepare('SELECT shop_id FROM users WHERE id = ?').get('legacy-admin');
  const invitation = database.prepare('SELECT shop_id FROM invitations WHERE id = ?').get('legacy-invite');
  const collection = database.prepare('SELECT shop_id, value_json FROM collections WHERE collection_key = ?').get('inventory');
  const shop = database.prepare('SELECT name, is_legacy FROM shops WHERE id = ?').get(user.shop_id);
  console.log(JSON.stringify({ user, invitation, collection, shop }));
  database.close();
`;

const migrationResult = spawnSync(
  process.execPath,
  ["--input-type=module", "-e", childScript],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, AUTH_DATABASE_PATH: legacyDatabasePath },
  },
);

test("legacy users, invitations, and collections migrate into one isolated shop", () => {
  assert.equal(migrationResult.status, 0, migrationResult.stderr);
  const migrated = JSON.parse(migrationResult.stdout.trim());
  assert.ok(migrated.user.shop_id);
  assert.equal(migrated.invitation.shop_id, migrated.user.shop_id);
  assert.equal(migrated.collection.shop_id, migrated.user.shop_id);
  assert.deepEqual(JSON.parse(migrated.collection.value_json), [
    { sku: "OLD-1" },
  ]);
  assert.equal(migrated.shop.name, "Legacy Textiles");
  assert.equal(migrated.shop.is_legacy, 1);
});

after(() => {
  rmSync(directory, { recursive: true, force: true });
});
