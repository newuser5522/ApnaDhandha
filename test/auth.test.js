import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

process.env.SESSION_SECRET = randomBytes(48).toString("hex");
process.env.BOOTSTRAP_ADMIN_TOKEN = randomBytes(32).toString("hex");
process.env.AUTH_DATABASE_PATH = ":memory:";
process.env.APP_ORIGIN = "http://localhost:5000";
process.env.NODE_ENV = "test";

const { createApp } = await import("../server/app.js");
const { database } = await import("../server/database.js");
const server = createApp().listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const appOrigin = process.env.APP_ORIGIN;

const request = async (path, { method = "GET", body, cookie } = {}) => {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: appOrigin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  const setCookie = response.headers.getSetCookie?.() || [];
  const sessionCookie =
    setCookie.find((value) => value.startsWith("apna.sid="))?.split(";")[0] ||
    null;
  return { response, payload, sessionCookie, setCookie };
};

test("invitation-only authentication protects team and shared business data", async () => {
  const status = await request("/api/auth/status");
  assert.equal(status.payload.hasUsers, false);
  assert.equal(status.payload.bootstrapConfigured, true);

  const otpRequest = await request("/api/auth/send-otp", {
    method: "POST",
    body: { email: "admin@example.test" },
  });
  assert.equal(otpRequest.response.status, 200);
  assert.match(String(otpRequest.payload.otp), /^\d{6}$/);

  const otpVerified = await request("/api/auth/verify-otp", {
    method: "POST",
    body: {
      email: "admin@example.test",
      otp: otpRequest.payload.otp,
    },
  });
  assert.equal(otpVerified.response.status, 200);
  assert.equal(otpVerified.payload.verified, true);

  const bootstrap = await request("/api/auth/bootstrap", {
    method: "POST",
    body: {
      bootstrapToken: process.env.BOOTSTRAP_ADMIN_TOKEN,
      shopName: "Acme Mart",
      name: "Workspace Admin",
      email: "admin@example.test",
      password: "test-admin-password-2026",
      otp: otpRequest.payload.otp,
    },
  });
  assert.equal(bootstrap.response.status, 201);
  assert.equal(bootstrap.payload.user.role, "Admin");
  assert.equal(bootstrap.payload.user.shopName, "Acme Mart");
  assert.equal(bootstrap.payload.user.password_hash, undefined);
  assert.ok(bootstrap.sessionCookie);
  assert.match(bootstrap.setCookie.join(";"), /HttpOnly/i);
  assert.match(bootstrap.setCookie.join(";"), /SameSite=Strict/i);

  const unauthenticatedData = await request("/api/data/invoices");
  assert.equal(unauthenticatedData.response.status, 401);

  const invite = await request("/api/team/invitations", {
    method: "POST",
    cookie: bootstrap.sessionCookie,
    body: { email: "staff@example.test", role: "Staff" },
  });
  assert.equal(invite.response.status, 201);
  const inviteToken = new URL(invite.payload.inviteUrl).searchParams.get(
    "invite",
  );
  assert.ok(inviteToken);

  const inviteDetails = await request(`/api/invitations/${inviteToken}`);
  assert.equal(inviteDetails.payload.email, "staff@example.test");
  assert.equal(inviteDetails.payload.role, "Staff");

  const staffOtpRequest = await request("/api/auth/send-otp", {
    method: "POST",
    body: { email: "staff@example.test" },
  });
  assert.equal(staffOtpRequest.response.status, 200);

  const accepted = await request("/api/invitations/accept", {
    method: "POST",
    body: {
      token: inviteToken,
      name: "Workspace Staff",
      phone: "555-0100",
      password: "test-staff-password-2026",
      otp: staffOtpRequest.payload.otp,
    },
  });
  assert.equal(accepted.response.status, 201);
  assert.equal(accepted.payload.user.role, "Staff");
  assert.equal(accepted.payload.user.shopName, "Acme Mart");
  assert.ok(accepted.sessionCookie);

  const deniedTeamAccess = await request("/api/team/users", {
    cookie: accepted.sessionCookie,
  });
  assert.equal(deniedTeamAccess.response.status, 403);

  const writeCollection = await request("/api/data/inventory", {
    method: "PUT",
    cookie: accepted.sessionCookie,
    body: { value: [{ sku: "TEST-1", productName: "Test" }] },
  });
  assert.equal(writeCollection.response.status, 200);
  const readCollection = await request("/api/data/inventory", {
    cookie: bootstrap.sessionCookie,
  });
  assert.equal(readCollection.payload.value[0].sku, "TEST-1");

  const adminUsers = await request("/api/team/users", {
    cookie: bootstrap.sessionCookie,
  });
  assert.equal(adminUsers.payload.users.length, 2);
  assert.equal(
    adminUsers.payload.users.some((user) => "password_hash" in user),
    false,
  );

  const lastAdminProtection = await request(
    `/api/team/users/${bootstrap.payload.user.id}`,
    {
      method: "PATCH",
      cookie: bootstrap.sessionCookie,
      body: { status: "inactive" },
    },
  );
  assert.equal(lastAdminProtection.response.status, 409);

  const resetLink = await request(
    `/api/team/users/${accepted.payload.user.id}/password-reset`,
    { method: "POST", cookie: bootstrap.sessionCookie },
  );
  assert.equal(resetLink.response.status, 201);
  const resetToken = new URL(resetLink.payload.resetUrl).searchParams.get(
    "reset",
  );
  const resetDetails = await request(`/api/password-resets/${resetToken}`);
  assert.equal(resetDetails.payload.email, "staff@example.test");

  const resetPassword = await request("/api/password-resets/accept", {
    method: "POST",
    body: { token: resetToken, password: "test-staff-password-reset-2026" },
  });
  assert.equal(resetPassword.response.status, 204);
  const consumedReset = await request(`/api/password-resets/${resetToken}`);
  assert.equal(consumedReset.response.status, 404);

  const oldSession = await request("/api/auth/session", {
    cookie: accepted.sessionCookie,
  });
  assert.equal(oldSession.response.status, 200);
  assert.equal(oldSession.payload.user, null);

  const staffLogin = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: "staff@example.test",
      password: "test-staff-password-reset-2026",
    },
  });
  assert.equal(staffLogin.response.status, 200);
  assert.ok(staffLogin.sessionCookie);

  const deactivate = await request(
    `/api/team/users/${accepted.payload.user.id}`,
    {
      method: "PATCH",
      cookie: bootstrap.sessionCookie,
      body: { status: "inactive" },
    },
  );
  assert.equal(deactivate.payload.user.status, "inactive");

  const revokedSession = await request("/api/auth/session", {
    cookie: staffLogin.sessionCookie,
  });
  assert.equal(revokedSession.response.status, 200);
  assert.equal(revokedSession.payload.user, null);

  const usedInvite = await request(`/api/invitations/${inviteToken}`);
  assert.equal(usedInvite.response.status, 404);
});

after(() => {
  server.close();
  database.close();
});
