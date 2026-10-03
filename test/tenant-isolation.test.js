import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";

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

const request = async (path, { method = "GET", body, cookie } = {}) => {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: process.env.APP_ORIGIN,
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
    cookie ||
    null;
  return { response, payload, sessionCookie };
};

const createShop = async ({ shopName, name, email, password }) => {
  const sent = await request("/api/auth/send-otp", {
    method: "POST",
    body: { email, purpose: "shop-signup" },
  });
  assert.equal(sent.response.status, 200);
  assert.match(String(sent.payload.otp), /^\d{6}$/);

  const verified = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { email, otp: sent.payload.otp, purpose: "shop-signup" },
  });
  assert.equal(verified.response.status, 200);

  const signup = await request("/api/auth/signup", {
    method: "POST",
    body: {
      shopName,
      name,
      email,
      password,
      otp: sent.payload.otp,
    },
  });
  assert.equal(signup.response.status, 201);
  return signup;
};

test("shop signup isolates users, invitations, and all business collections", async () => {
  const ownerA = await createShop({
    shopName: "Northwind Textiles",
    name: "Northwind Owner",
    email: "northwind-owner@example.test",
    password: "northwind-owner-password-2026",
  });
  const ownerB = await createShop({
    shopName: "Southwind Garments",
    name: "Southwind Owner",
    email: "southwind-owner@example.test",
    password: "southwind-owner-password-2026",
  });
  assert.notEqual(ownerA.payload.user.shopId, ownerB.payload.user.shopId);

  for (const collection of ["inventory", "invoices", "quotations"]) {
    const payloadA = [{ id: `A-${collection}`, value: "Northwind" }];
    const payloadB = [{ id: `B-${collection}`, value: "Southwind" }];
    const writeA = await request(`/api/data/${collection}`, {
      method: "PUT",
      cookie: ownerA.sessionCookie,
      body: { value: payloadA },
    });
    const writeB = await request(`/api/data/${collection}`, {
      method: "PUT",
      cookie: ownerB.sessionCookie,
      body: { value: payloadB },
    });
    assert.equal(writeA.response.status, 200);
    assert.equal(writeB.response.status, 200);
    assert.deepEqual(
      (
        await request(`/api/data/${collection}`, {
          cookie: ownerA.sessionCookie,
        })
      ).payload.value,
      payloadA,
    );
    assert.deepEqual(
      (
        await request(`/api/data/${collection}`, {
          cookie: ownerB.sessionCookie,
        })
      ).payload.value,
      payloadB,
    );
  }

  const now = new Date().toISOString();
  const managerPassword = "northwind-manager-password-2026";
  database
    .prepare(
      `INSERT INTO users
       (id, shop_id, name, shop_name, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "northwind-manager",
      ownerA.payload.user.shopId,
      "Northwind Manager",
      "Northwind Textiles",
      "northwind-manager@example.test",
      "",
      await bcrypt.hash(managerPassword, 12),
      "Manager",
      "active",
      now,
      now,
      now,
    );
  const managerLogin = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: "northwind-manager@example.test",
      password: managerPassword,
    },
  });
  assert.equal(managerLogin.response.status, 200);

  const deniedManagerPromotion = await request("/api/team/invitations", {
    method: "POST",
    cookie: managerLogin.sessionCookie,
    body: { email: "promotion@example.test", role: "Admin" },
  });
  assert.equal(deniedManagerPromotion.response.status, 403);

  const invite = await request("/api/team/invitations", {
    method: "POST",
    cookie: managerLogin.sessionCookie,
    body: { email: "northwind-staff@example.test", role: "Staff" },
  });
  assert.equal(invite.response.status, 201);
  const token = new URL(invite.payload.inviteUrl).searchParams.get("invite");

  const invitationsA = await request("/api/team/invitations", {
    cookie: ownerA.sessionCookie,
  });
  const invitationsB = await request("/api/team/invitations", {
    cookie: ownerB.sessionCookie,
  });
  assert.equal(invitationsA.payload.invitations.length, 1);
  assert.equal(invitationsB.payload.invitations.length, 0);

  const invitedOtp = await request("/api/auth/send-otp", {
    method: "POST",
    body: { email: "northwind-staff@example.test", purpose: "invite" },
  });
  const accepted = await request("/api/invitations/accept", {
    method: "POST",
    body: {
      token,
      name: "Northwind Staff",
      password: "northwind-staff-password-2026",
      otp: invitedOtp.payload.otp,
    },
  });
  assert.equal(accepted.response.status, 201);
  assert.equal(accepted.payload.user.shopId, ownerA.payload.user.shopId);

  const usersA = await request("/api/team/users", {
    cookie: managerLogin.sessionCookie,
  });
  const usersB = await request("/api/team/users", {
    cookie: ownerB.sessionCookie,
  });
  assert.equal(usersA.payload.users.length, 3);
  assert.equal(usersB.payload.users.length, 1);

  const crossShopEdit = await request(
    `/api/team/users/${ownerA.payload.user.id}`,
    {
      method: "PATCH",
      cookie: ownerB.sessionCookie,
      body: { name: "Unauthorized edit" },
    },
  );
  assert.equal(crossShopEdit.response.status, 404);

  assert.equal(
    database
      .prepare("SELECT COUNT(*) AS count FROM collections WHERE shop_id = ?")
      .get(ownerA.payload.user.shopId).count,
    3,
  );
});

after(() => {
  server.close();
  database.close();
});
