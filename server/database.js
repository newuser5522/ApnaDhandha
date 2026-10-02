import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath =
  process.env.AUTH_DATABASE_PATH || "./data/apna-dhandha.sqlite";
if (databasePath !== ":memory:") {
  mkdirSync(dirname(resolve(databasePath)), { recursive: true });
}

export const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    shop_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Accountant', 'Staff')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    email_verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Accountant', 'Staff')),
    token_hash TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);
  CREATE INDEX IF NOT EXISTS invitations_expiry_idx ON invitations(expires_at);

  CREATE TABLE IF NOT EXISTS email_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    purpose TEXT NOT NULL CHECK (purpose IN ('bootstrap', 'invite', 'reset')),
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    verified_at TEXT
  );

  CREATE INDEX IF NOT EXISTS email_otps_lookup_idx ON email_otps(email, purpose, expires_at);

  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS password_resets_expiry_idx ON password_resets(expires_at);

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    session_json TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS collections (
    collection_key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const userColumns = new Set(
  database
    .prepare("PRAGMA table_info(users)")
    .all()
    .map(({ name }) => name),
);
if (!userColumns.has("shop_name")) {
  database.exec(
    "ALTER TABLE users ADD COLUMN shop_name TEXT NOT NULL DEFAULT ''",
  );
}
if (!userColumns.has("email_verified_at")) {
  database.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
}
