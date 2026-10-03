import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { after, test } from "node:test";

process.env.SESSION_SECRET = randomBytes(48).toString("hex");
process.env.BOOTSTRAP_ADMIN_TOKEN = randomBytes(32).toString("hex");
process.env.AUTH_DATABASE_PATH = ":memory:";
process.env.APP_ORIGIN = "http://localhost:5000";
process.env.NODE_ENV = "test";
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
  delete process.env[key];
}

const { createApp } = await import("../server/app.js");
const { database } = await import("../server/database.js");
const now = new Date().toISOString();
database
  .prepare(
    "INSERT INTO shops (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
  )
  .run("recovery-shop", "Recovery Shop", now, now);
database
  .prepare(
    `INSERT INTO users
      (id, shop_id, name, shop_name, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  .run(
    "recovery-admin",
    "recovery-shop",
    "Recovery Admin",
    "Recovery Shop",
    "recovery@example.test",
    "",
    await bcrypt.hash("old-admin-password-2026", 12),
    "Admin",
    "active",
    now,
    now,
    now,
  );

const server = createApp().listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const request = async (path, body) => {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      Origin: process.env.APP_ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
};

test("password recovery protects account privacy and requires a valid OTP", async () => {
  const unknownEmail = await request("/api/auth/send-otp", {
    email: "unknown@example.test",
    purpose: "reset",
  });
  assert.equal(unknownEmail.response.status, 200);
  assert.equal(unknownEmail.payload.sent, true);
  assert.equal(unknownEmail.payload.otp, undefined);

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const unconfiguredProductionEmail = await request("/api/auth/send-otp", {
    email: "recovery@example.test",
    purpose: "reset",
  });
  process.env.NODE_ENV = previousNodeEnv;
  assert.equal(unconfiguredProductionEmail.response.status, 503);
  assert.equal(unconfiguredProductionEmail.payload.otp, undefined);

  const otpResult = await request("/api/auth/send-otp", {
    email: "recovery@example.test",
    purpose: "reset",
  });
  assert.equal(otpResult.response.status, 200);
  assert.match(String(otpResult.payload.otp), /^\d{6}$/);

  const invalidCode = await request("/api/password-resets/otp", {
    email: "recovery@example.test",
    otp: "000000",
    password: "new-admin-password-2026",
  });
  assert.equal(invalidCode.response.status, 400);

  const acceptedReset = await request("/api/password-resets/otp", {
    email: "recovery@example.test",
    otp: otpResult.payload.otp,
    password: "new-admin-password-2026",
  });
  assert.equal(acceptedReset.response.status, 204);

  const replayedCode = await request("/api/password-resets/otp", {
    email: "recovery@example.test",
    otp: otpResult.payload.otp,
    password: "another-admin-password-2026",
  });
  assert.equal(replayedCode.response.status, 400);

  const newPasswordLogin = await request("/api/auth/login", {
    email: "recovery@example.test",
    password: "new-admin-password-2026",
  });
  assert.equal(newPasswordLogin.response.status, 200);

  const oldPasswordLogin = await request("/api/auth/login", {
    email: "recovery@example.test",
    password: "old-admin-password-2026",
  });
  assert.equal(oldPasswordLogin.response.status, 401);
});

after(() => {
  server.close();
  database.close();
});
