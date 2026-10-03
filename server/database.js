import { randomUUID } from "node:crypto";
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

  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_legacy INTEGER NOT NULL DEFAULT 0 CHECK (is_legacy IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES shops(id),
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
    shop_id TEXT NOT NULL REFERENCES shops(id),
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
    purpose TEXT NOT NULL CHECK (purpose IN ('bootstrap', 'invite', 'reset', 'shop-signup')),
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
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    collection_key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (shop_id, collection_key)
  );
`);

const columnsFor = (table) =>
  new Set(
    database
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map(({ name }) => name),
  );

const addColumnIfMissing = (table, column, declaration) => {
  if (!columnsFor(table).has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
  }
};

addColumnIfMissing("users", "shop_name", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("users", "email_verified_at", "TEXT");
addColumnIfMissing("users", "shop_id", "TEXT REFERENCES shops(id)");
addColumnIfMissing("invitations", "shop_id", "TEXT REFERENCES shops(id)");
addColumnIfMissing(
  "shops",
  "is_legacy",
  "INTEGER NOT NULL DEFAULT 0 CHECK (is_legacy IN (0, 1))",
);

const createShop = (name) => {
  const now = new Date().toISOString();
  const existingShop = database
    .prepare("SELECT id FROM shops WHERE name = ? ORDER BY created_at LIMIT 1")
    .get(name);
  if (existingShop) return existingShop.id;
  const id = randomUUID();
  database
    .prepare(
      "INSERT INTO shops (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(id, name, now, now);
  return id;
};

database.exec("BEGIN IMMEDIATE");
try {
  for (const { legacyShopName } of database
    .prepare(
      "SELECT DISTINCT COALESCE(NULLIF(TRIM(shop_name), ''), 'Legacy Shop') AS legacyShopName FROM users WHERE shop_id IS NULL",
    )
    .all()) {
    const shopId = createShop(legacyShopName);
    database.prepare("UPDATE shops SET is_legacy = 1 WHERE id = ?").run(shopId);
    database
      .prepare(
        "UPDATE users SET shop_id = ? WHERE shop_id IS NULL AND COALESCE(NULLIF(TRIM(shop_name), ''), 'Legacy Shop') = ?",
      )
      .run(shopId, legacyShopName);
  }

  if (columnsFor("collections").has("shop_id") === false) {
    const fallbackShopId =
      database
        .prepare("SELECT id FROM shops ORDER BY created_at, id LIMIT 1")
        .get()?.id || createShop("Legacy Shop");
    database
      .prepare("UPDATE shops SET is_legacy = 1 WHERE id = ?")
      .run(fallbackShopId);
    database.exec("ALTER TABLE collections RENAME TO collections_legacy");
    database.exec(`
    CREATE TABLE collections (
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      collection_key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (shop_id, collection_key)
    )
  `);
    database
      .prepare(
        `INSERT INTO collections (shop_id, collection_key, value_json, updated_at)
       SELECT ?, collection_key, value_json, updated_at FROM collections_legacy`,
      )
      .run(fallbackShopId);
    database.exec("DROP TABLE collections_legacy");
  }

  database
    .prepare(
      `UPDATE invitations
     SET shop_id = (SELECT users.shop_id FROM users WHERE users.id = invitations.invited_by)
     WHERE shop_id IS NULL`,
    )
    .run();

  const otpTableSql =
    database
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'email_otps'",
      )
      .get()?.sql || "";
  if (!otpTableSql.includes("shop-signup")) {
    database.exec(`
    CREATE TABLE email_otps_new (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE,
      purpose TEXT NOT NULL CHECK (purpose IN ('bootstrap', 'invite', 'reset', 'shop-signup')),
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      verified_at TEXT
    );
    INSERT INTO email_otps_new SELECT id, email, purpose, otp_hash, expires_at, created_at, verified_at FROM email_otps;
    DROP TABLE email_otps;
    ALTER TABLE email_otps_new RENAME TO email_otps;
  `);
    database.exec(
      "CREATE INDEX IF NOT EXISTS email_otps_lookup_idx ON email_otps(email, purpose, expires_at)",
    );
  }

  database.exec(`
  CREATE INDEX IF NOT EXISTS users_shop_created_idx ON users(shop_id, created_at);
  CREATE INDEX IF NOT EXISTS invitations_shop_expiry_idx ON invitations(shop_id, expires_at);
    CREATE TRIGGER IF NOT EXISTS users_shop_id_required_insert
    BEFORE INSERT ON users WHEN NEW.shop_id IS NULL
    BEGIN SELECT RAISE(ABORT, 'user shop_id is required'); END;
    CREATE TRIGGER IF NOT EXISTS users_shop_id_required_update
    BEFORE UPDATE OF shop_id ON users WHEN NEW.shop_id IS NULL
    BEGIN SELECT RAISE(ABORT, 'user shop_id is required'); END;
    CREATE TRIGGER IF NOT EXISTS invitations_shop_id_required_insert
    BEFORE INSERT ON invitations WHEN NEW.shop_id IS NULL
    BEGIN SELECT RAISE(ABORT, 'invitation shop_id is required'); END;
    CREATE TRIGGER IF NOT EXISTS invitations_shop_id_required_update
    BEFORE UPDATE OF shop_id ON invitations WHEN NEW.shop_id IS NULL
    BEGIN SELECT RAISE(ABORT, 'invitation shop_id is required'); END;
`);
  database.exec("COMMIT");
} catch (error) {
  if (database.isTransaction) database.exec("ROLLBACK");
  throw error;
}
