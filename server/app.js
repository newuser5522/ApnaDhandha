import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { database } from "./database.js";
import { SQLiteSessionStore } from "./SQLiteSessionStore.js";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set to at least 32 characters.");
}

const ROLES = new Set(["Admin", "Manager", "Accountant", "Staff"]);
const COLLECTIONS = new Set(["inventory", "invoices", "quotations"]);
const WRITE_PERMISSIONS = {
  Admin: new Set(COLLECTIONS),
  Manager: new Set(COLLECTIONS),
  Accountant: new Set(["invoices", "quotations"]),
  Staff: new Set(COLLECTIONS),
};
const SESSION_AGE = 8 * 60 * 60 * 1000;
const SAFE_USER_FIELDS = `id, name, shop_name, email, phone, role, status, email_verified_at, created_at, updated_at`;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

const isValidPassword = (password) =>
  typeof password === "string" &&
  password.length >= 12 &&
  password.length <= 128;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) => createHash("sha256").update(String(otp)).digest("hex");

const otpMatches = (providedOtp, expectedHash) => {
  if (typeof providedOtp !== "string" || !/^\d{6}$/.test(providedOtp)) {
    return false;
  }
  const providedBuffer = Buffer.from(hashOtp(providedOtp));
  const expectedBuffer = Buffer.from(expectedHash);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

const validateOtp = (email, purpose, otp) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !purpose || !/^\d{6}$/.test(String(otp || ""))) {
    return false;
  }

  const record = database
    .prepare(
      `SELECT id, otp_hash, expires_at FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(normalizedEmail, purpose);

  if (!record || record.expires_at <= Date.now()) {
    return false;
  }

  return otpMatches(String(otp), record.otp_hash);
};

const consumeOtp = (email, purpose, otp) => {
  const normalizedEmail = normalizeEmail(email);
  const record = database
    .prepare(
      `SELECT id, otp_hash, expires_at FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(normalizedEmail, purpose);

  if (!record || record.expires_at <= Date.now()) {
    return false;
  }

  if (!otpMatches(String(otp || ""), record.otp_hash)) {
    return false;
  }

  database
    .prepare("UPDATE email_otps SET verified_at = ? WHERE id = ?")
    .run(new Date().toISOString(), record.id);
  return true;
};

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  shopName: user.shop_name || user.shopName || "",
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerifiedAt: user.email_verified_at || user.emailVerifiedAt || null,
  createdAt: user.created_at || user.createdAt,
  updatedAt: user.updated_at || user.updatedAt,
});

const tokenMatches = (provided, expected) => {
  if (typeof provided !== "string" || typeof expected !== "string")
    return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const regenerateSession = (request) =>
  new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const saveSession = (request) =>
  new Promise((resolve, reject) => {
    request.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const destroySession = (request) =>
  new Promise((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const createAuthenticatedSession = async (request, user) => {
  await regenerateSession(request);
  request.session.userId = user.id;
  await saveSession(request);
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "128kb" }));
  app.use(
    session({
      name: "apna.sid",
      secret: SESSION_SECRET,
      store: new SQLiteSessionStore(),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_AGE,
        path: "/",
      },
    }),
  );

  app.use("/api", (request, response, next) => {
    const origin = request.get("origin");
    const expectedOrigin = process.env.APP_ORIGIN;
    if (
      origin &&
      expectedOrigin &&
      origin.replace(/\/$/, "") !== expectedOrigin.replace(/\/$/, "")
    ) {
      response.status(403).json({ error: "Cross-origin request rejected." });
      return;
    }
    next();
  });

  const requireAuth = (request, response, next) => {
    const userId = request.session.userId;
    if (!userId) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = database
      .prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`)
      .get(userId);
    if (!user || user.status !== "active") {
      request.session.destroy(() => {});
      response.clearCookie("apna.sid", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    request.user = user;
    next();
  };

  const requireAdmin = (request, response, next) => {
    if (request.user.role !== "Admin") {
      response.status(403).json({ error: "Administrator access required." });
      return;
    }
    next();
  };

  app.get("/api/auth/status", (request, response) => {
    const userCount = database
      .prepare("SELECT COUNT(*) AS count FROM users")
      .get().count;
    response.json({
      hasUsers: userCount > 0,
      bootstrapConfigured: Boolean(process.env.BOOTSTRAP_ADMIN_TOKEN),
    });
  });

  app.post("/api/auth/send-otp", loginLimiter, (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const explicitPurpose = request.body?.purpose;
    const purpose =
      explicitPurpose ||
      (database
        .prepare(
          "SELECT 1 FROM invitations WHERE email = ? AND expires_at > ? LIMIT 1",
        )
        .get(email, Date.now())
        ? "invite"
        : "bootstrap");
    if (
      !isValidEmail(email) ||
      !["bootstrap", "invite", "reset"].includes(purpose)
    ) {
      response.status(400).json({ error: "Enter a valid email address." });
      return;
    }

    const otp = generateOtp();
    const now = new Date().toISOString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const id = randomBytes(16).toString("hex");

    database
      .prepare("DELETE FROM email_otps WHERE email = ? AND purpose = ?")
      .run(email, purpose);
    database
      .prepare(
        `
          INSERT INTO email_otps (id, email, purpose, otp_hash, expires_at, created_at, verified_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL)
        `,
      )
      .run(id, email, purpose, hashOtp(otp), expiresAt, now);

    console.log(`[OTP] ${purpose} code for ${email}: ${otp}`);
    response.json({ sent: true, otp, message: "Verification code sent." });
  });

  app.post("/api/auth/verify-otp", loginLimiter, (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const otp = request.body?.otp;
    const explicitPurpose = request.body?.purpose;
    const purpose =
      explicitPurpose ||
      (database
        .prepare(
          "SELECT 1 FROM invitations WHERE email = ? AND expires_at > ? LIMIT 1",
        )
        .get(email, Date.now())
        ? "invite"
        : "bootstrap");

    if (
      !isValidEmail(email) ||
      !["bootstrap", "invite", "reset"].includes(purpose)
    ) {
      response
        .status(400)
        .json({ error: "Invalid email verification request." });
      return;
    }

    if (!validateOtp(email, purpose, otp)) {
      response
        .status(400)
        .json({ error: "The verification code is incorrect or expired." });
      return;
    }

    response.json({ verified: true, email });
  });

  app.post("/api/auth/bootstrap", loginLimiter, async (request, response) => {
    const hasUsers = database
      .prepare("SELECT EXISTS(SELECT 1 FROM users) AS found")
      .get().found;
    if (hasUsers) {
      response
        .status(409)
        .json({ error: "Initial setup is already complete." });
      return;
    }

    if (
      !tokenMatches(
        request.body?.bootstrapToken,
        process.env.BOOTSTRAP_ADMIN_TOKEN,
      )
    ) {
      response.status(403).json({ error: "Invalid bootstrap token." });
      return;
    }

    const shopName =
      typeof request.body?.shopName === "string"
        ? request.body.shopName.trim()
        : "";
    const name =
      typeof request.body?.name === "string" ? request.body.name.trim() : "";
    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;
    const otp = request.body?.otp;
    if (
      !shopName ||
      shopName.length > 120 ||
      !name ||
      name.length > 120 ||
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      !consumeOtp(email, "bootstrap", otp)
    ) {
      response.status(400).json({
        error:
          "Provide your shop name, owner name, valid email, 12+ character password, and the 6-digit OTP.",
      });
      return;
    }

    const user = {
      id: randomBytes(16).toString("hex"),
      name,
      shopName,
      email,
      phone: "",
      passwordHash: await bcrypt.hash(password, 12),
      role: "Admin",
      status: "active",
      emailVerifiedAt: new Date().toISOString(),
      now: new Date().toISOString(),
    };

    try {
      database
        .prepare(
          `
          INSERT INTO users (id, name, shop_name, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at)
          VALUES (@id, @name, @shopName, @email, @phone, @passwordHash, @role, @status, @emailVerifiedAt, @now, @now)
        `,
        )
        .run(user);
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        response
          .status(409)
          .json({ error: "An account with this email already exists." });
        return;
      }
      throw error;
    }

    await createAuthenticatedSession(request, { id: user.id });
    response.status(201).json({
      user: safeUser({ ...user, created_at: user.now, updated_at: user.now }),
    });
  });

  app.post("/api/auth/login", loginLimiter, async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;
    const user = database
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);
    const passwordMatches = await bcrypt.compare(
      typeof password === "string" ? password : "",
      user?.password_hash ||
        "$2a$12$C6UzMDM.H6dfI/f/IKcEe.3ZKYvB8mIlbdXq4d2b9w4/5pQ8Y4JgK",
    );

    if (
      !user ||
      user.status !== "active" ||
      !user.email_verified_at ||
      !passwordMatches
    ) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    await createAuthenticatedSession(request, user);
    response.json({ user: safeUser(user) });
  });

  app.get("/api/auth/session", (request, response) => {
    if (!request.session.userId) {
      response.json({ user: null });
      return;
    }

    const user = database
      .prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`)
      .get(request.session.userId);
    if (!user || user.status !== "active") {
      request.session.destroy(() => {});
      response.clearCookie("apna.sid", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      response.json({ user: null });
      return;
    }

    response.json({ user: safeUser(user) });
  });

  app.post("/api/auth/logout", requireAuth, async (request, response) => {
    await destroySession(request);
    response.clearCookie("apna.sid", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    response.status(204).end();
  });

  app.post(
    "/api/auth/change-password",
    requireAuth,
    async (request, response) => {
      const { currentPassword, newPassword } = request.body || {};
      const user = database
        .prepare("SELECT id, password_hash FROM users WHERE id = ?")
        .get(request.user.id);
      if (
        typeof currentPassword !== "string" ||
        !(await bcrypt.compare(currentPassword, user.password_hash))
      ) {
        response.status(400).json({ error: "Current password is incorrect." });
        return;
      }
      if (!isValidPassword(newPassword)) {
        response
          .status(400)
          .json({ error: "New passwords must be at least 12 characters." });
        return;
      }

      database
        .prepare(
          "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        )
        .run(
          await bcrypt.hash(newPassword, 12),
          new Date().toISOString(),
          user.id,
        );

      for (const row of database
        .prepare("SELECT sid, session_json FROM sessions")
        .all()) {
        if (row.sid === request.sessionID) continue;
        try {
          if (JSON.parse(row.session_json).userId === user.id) {
            database.prepare("DELETE FROM sessions WHERE sid = ?").run(row.sid);
          }
        } catch {
          database.prepare("DELETE FROM sessions WHERE sid = ?").run(row.sid);
        }
      }
      response.status(204).end();
    },
  );

  app.get("/api/invitations/:token", (request, response) => {
    const tokenHash = hashToken(request.params.token);
    const invitation = database
      .prepare(
        "SELECT email, role, expires_at FROM invitations WHERE token_hash = ?",
      )
      .get(tokenHash);
    if (!invitation || invitation.expires_at <= Date.now()) {
      response
        .status(404)
        .json({ error: "This invitation is invalid or expired." });
      return;
    }
    response.json({ email: invitation.email, role: invitation.role });
  });

  app.post(
    "/api/invitations/accept",
    loginLimiter,
    async (request, response) => {
      const token = request.body?.token;
      const name =
        typeof request.body?.name === "string" ? request.body.name.trim() : "";
      const phone =
        typeof request.body?.phone === "string"
          ? request.body.phone.trim()
          : "";
      const password = request.body?.password;
      const otp = request.body?.otp;
      const tokenHash = hashToken(token);
      const invitation = database
        .prepare("SELECT * FROM invitations WHERE token_hash = ?")
        .get(tokenHash);

      if (
        !token ||
        !name ||
        name.length > 120 ||
        !isValidPassword(password) ||
        !invitation ||
        !consumeOtp(invitation.email, "invite", otp)
      ) {
        response.status(400).json({
          error:
            "Enter your name, a strong password, and the 6-digit email verification code.",
        });
        return;
      }
      if (!invitation || invitation.expires_at <= Date.now()) {
        response
          .status(404)
          .json({ error: "This invitation is invalid or expired." });
        return;
      }
      if (
        database
          .prepare("SELECT 1 FROM users WHERE email = ?")
          .get(invitation.email)
      ) {
        database
          .prepare("DELETE FROM invitations WHERE id = ?")
          .run(invitation.id);
        response
          .status(409)
          .json({ error: "An account with this email already exists." });
        return;
      }

      const user = {
        id: randomBytes(16).toString("hex"),
        name,
        shopName:
          database
            .prepare("SELECT shop_name FROM users WHERE id = ?")
            .get(invitation.invited_by)?.shop_name || "",
        email: invitation.email,
        phone,
        passwordHash: await bcrypt.hash(password, 12),
        role: invitation.role,
        status: "active",
        emailVerifiedAt: new Date().toISOString(),
        now: new Date().toISOString(),
      };
      database.exec("BEGIN IMMEDIATE");
      try {
        database
          .prepare(
            `
          INSERT INTO users (id, name, shop_name, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at)
          VALUES (@id, @name, @shopName, @email, @phone, @passwordHash, @role, @status, @emailVerifiedAt, @now, @now)
        `,
          )
          .run(user);
        database
          .prepare("DELETE FROM invitations WHERE id = ?")
          .run(invitation.id);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      await createAuthenticatedSession(request, { id: user.id });
      response.status(201).json({
        user: safeUser({ ...user, created_at: user.now, updated_at: user.now }),
      });
    },
  );

  app.get("/api/team/users", requireAuth, requireAdmin, (request, response) => {
    const users = database
      .prepare(`SELECT ${SAFE_USER_FIELDS} FROM users ORDER BY created_at DESC`)
      .all();
    response.json({ users: users.map(safeUser) });
  });

  app.get(
    "/api/team/invitations",
    requireAuth,
    requireAdmin,
    (request, response) => {
      const invitations = database
        .prepare(
          `
        SELECT id, email, role, created_at, expires_at
        FROM invitations WHERE expires_at > ? ORDER BY created_at DESC
      `,
        )
        .all(Date.now());
      response.json({ invitations });
    },
  );

  app.post(
    "/api/team/invitations",
    requireAuth,
    requireAdmin,
    inviteLimiter,
    (request, response) => {
      const email = normalizeEmail(request.body?.email);
      const role = request.body?.role;
      if (!isValidEmail(email) || !ROLES.has(role)) {
        response.status(400).json({ error: "Enter a valid email and role." });
        return;
      }
      if (database.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
        response
          .status(409)
          .json({ error: "A team member with this email already exists." });
        return;
      }

      const token = randomBytes(32).toString("base64url");
      const id = randomBytes(16).toString("hex");
      const createdAt = new Date().toISOString();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      database.prepare("DELETE FROM invitations WHERE email = ?").run(email);
      database
        .prepare(
          `
          INSERT INTO invitations (id, email, role, token_hash, invited_by, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          id,
          email,
          role,
          hashToken(token),
          request.user.id,
          expiresAt,
          createdAt,
        );

      const origin =
        process.env.APP_ORIGIN ||
        request.get("origin") ||
        `${request.protocol}://${request.get("host")}`;
      const inviteUrl = new URL("/", origin);
      inviteUrl.searchParams.set("invite", token);
      response.status(201).json({
        invitation: {
          id,
          email,
          role,
          created_at: createdAt,
          expires_at: expiresAt,
        },
        inviteUrl: inviteUrl.toString(),
      });
    },
  );

  app.delete(
    "/api/team/invitations/:id",
    requireAuth,
    requireAdmin,
    (request, response) => {
      database
        .prepare("DELETE FROM invitations WHERE id = ?")
        .run(request.params.id);
      response.status(204).end();
    },
  );

  app.post(
    "/api/team/users/:id/password-reset",
    requireAuth,
    requireAdmin,
    inviteLimiter,
    (request, response) => {
      const user = database
        .prepare("SELECT id, email, status FROM users WHERE id = ?")
        .get(request.params.id);
      if (!user || user.status !== "active") {
        response.status(404).json({ error: "Active team member not found." });
        return;
      }

      const token = randomBytes(32).toString("base64url");
      const expiresAt = Date.now() + 60 * 60 * 1000;
      database
        .prepare("DELETE FROM password_resets WHERE user_id = ?")
        .run(user.id);
      database
        .prepare(
          "INSERT INTO password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        )
        .run(hashToken(token), user.id, expiresAt, new Date().toISOString());

      const origin =
        process.env.APP_ORIGIN ||
        request.get("origin") ||
        `${request.protocol}://${request.get("host")}`;
      const resetUrl = new URL("/", origin);
      resetUrl.searchParams.set("reset", token);
      response.status(201).json({ resetUrl: resetUrl.toString(), expiresAt });
    },
  );

  app.get("/api/password-resets/:token", (request, response) => {
    const reset = database
      .prepare(
        `
        SELECT password_resets.expires_at, users.email
        FROM password_resets
        JOIN users ON users.id = password_resets.user_id
        WHERE password_resets.token_hash = ? AND users.status = 'active'
      `,
      )
      .get(hashToken(request.params.token));
    if (!reset || reset.expires_at <= Date.now()) {
      response
        .status(404)
        .json({ error: "This password reset link is invalid or expired." });
      return;
    }
    response.json({ email: reset.email, expiresAt: reset.expires_at });
  });

  app.post(
    "/api/password-resets/accept",
    loginLimiter,
    async (request, response) => {
      const token = request.body?.token;
      const password = request.body?.password;
      if (typeof token !== "string" || !isValidPassword(password)) {
        response.status(400).json({
          error: "Choose a password of at least 12 characters.",
        });
        return;
      }

      const tokenHash = hashToken(token);
      const reset = database
        .prepare(
          `
          SELECT password_resets.user_id, password_resets.expires_at
          FROM password_resets
          JOIN users ON users.id = password_resets.user_id
          WHERE password_resets.token_hash = ? AND users.status = 'active'
        `,
        )
        .get(tokenHash);
      if (!reset || reset.expires_at <= Date.now()) {
        response
          .status(404)
          .json({ error: "This password reset link is invalid or expired." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      database.exec("BEGIN IMMEDIATE");
      try {
        database
          .prepare(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
          )
          .run(passwordHash, new Date().toISOString(), reset.user_id);
        database
          .prepare("DELETE FROM password_resets WHERE user_id = ?")
          .run(reset.user_id);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      for (const row of database
        .prepare("SELECT sid, session_json FROM sessions")
        .all()) {
        try {
          if (JSON.parse(row.session_json).userId === reset.user_id) {
            database.prepare("DELETE FROM sessions WHERE sid = ?").run(row.sid);
          }
        } catch {
          database.prepare("DELETE FROM sessions WHERE sid = ?").run(row.sid);
        }
      }
      response.status(204).end();
    },
  );

  app.patch(
    "/api/team/users/:id",
    requireAuth,
    requireAdmin,
    (request, response) => {
      const target = database
        .prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`)
        .get(request.params.id);
      if (!target) {
        response.status(404).json({ error: "Team member not found." });
        return;
      }

      const role = request.body?.role ?? target.role;
      const status = request.body?.status ?? target.status;
      const name =
        typeof request.body?.name === "string"
          ? request.body.name.trim()
          : target.name;
      const phone =
        typeof request.body?.phone === "string"
          ? request.body.phone.trim()
          : target.phone;
      if (
        !ROLES.has(role) ||
        !["active", "inactive"].includes(status) ||
        !name ||
        name.length > 120 ||
        phone.length > 40
      ) {
        response.status(400).json({ error: "Invalid role or account status." });
        return;
      }

      if (
        target.role === "Admin" &&
        target.status === "active" &&
        (role !== "Admin" || status !== "active")
      ) {
        const activeAdmins = database
          .prepare(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'Admin' AND status = 'active'",
          )
          .get().count;
        if (activeAdmins <= 1) {
          response.status(409).json({
            error:
              "The last active administrator cannot be deactivated or demoted.",
          });
          return;
        }
      }

      database
        .prepare(
          "UPDATE users SET name = ?, phone = ?, role = ?, status = ?, updated_at = ? WHERE id = ?",
        )
        .run(name, phone, role, status, new Date().toISOString(), target.id);

      if (status === "inactive") {
        for (const row of database
          .prepare("SELECT sid, session_json FROM sessions")
          .all()) {
          try {
            if (JSON.parse(row.session_json).userId === target.id) {
              database
                .prepare("DELETE FROM sessions WHERE sid = ?")
                .run(row.sid);
            }
          } catch {
            database.prepare("DELETE FROM sessions WHERE sid = ?").run(row.sid);
          }
        }
      }

      const updated = database
        .prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`)
        .get(target.id);
      response.json({ user: safeUser(updated) });
    },
  );

  app.get("/api/data/:collection", requireAuth, (request, response) => {
    if (!COLLECTIONS.has(request.params.collection)) {
      response.status(404).json({ error: "Collection not found." });
      return;
    }
    const row = database
      .prepare("SELECT value_json FROM collections WHERE collection_key = ?")
      .get(request.params.collection);
    response.json({ value: row ? JSON.parse(row.value_json) : null });
  });

  app.put("/api/data/:collection", requireAuth, (request, response) => {
    const collection = request.params.collection;
    if (!COLLECTIONS.has(collection)) {
      response.status(404).json({ error: "Collection not found." });
      return;
    }
    if (!WRITE_PERMISSIONS[request.user.role]?.has(collection)) {
      response.status(403).json({
        error: "Your role does not have permission to change this data.",
      });
      return;
    }
    if (!Array.isArray(request.body?.value)) {
      response
        .status(400)
        .json({ error: "Collection value must be an array." });
      return;
    }

    const now = new Date().toISOString();
    database
      .prepare(
        `
        INSERT INTO collections (collection_key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(collection_key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `,
      )
      .run(collection, JSON.stringify(request.body.value), now);
    response.json({ saved: true, updatedAt: now });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    console.error("API error:", error);
    response
      .status(500)
      .json({ error: "An unexpected server error occurred." });
  });

  return app;
}
