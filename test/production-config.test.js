import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("production startup refuses to run without SMTP settings", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./server/app.js')"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        SESSION_SECRET: randomBytes(48).toString("hex"),
        AUTH_DATABASE_PATH: ":memory:",
        SMTP_HOST: "",
        SMTP_USER: "",
        SMTP_PASS: "",
        SMTP_FROM: "",
      },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SMTP_HOST and SMTP_FROM/);
});
