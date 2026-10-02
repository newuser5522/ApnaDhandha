import session from "express-session";
import { database } from "./database.js";

const DEFAULT_SESSION_AGE = 8 * 60 * 60 * 1000;

const expiryFor = (sessionData) => {
  const cookieExpiry = sessionData.cookie?.expires
    ? new Date(sessionData.cookie.expires).getTime()
    : NaN;
  return Number.isFinite(cookieExpiry)
    ? cookieExpiry
    : Date.now() + (sessionData.cookie?.maxAge || DEFAULT_SESSION_AGE);
};

export class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    database
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .run(Date.now());
    this.getStatement = database.prepare(
      "SELECT session_json, expires_at FROM sessions WHERE sid = ?",
    );
    this.setStatement = database.prepare(`
      INSERT INTO sessions (sid, session_json, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET
        session_json = excluded.session_json,
        expires_at = excluded.expires_at
    `);
    this.touchStatement = database.prepare(
      "UPDATE sessions SET expires_at = ? WHERE sid = ?",
    );
    this.destroyStatement = database.prepare(
      "DELETE FROM sessions WHERE sid = ?",
    );
  }

  get(sessionId, callback) {
    try {
      const row = this.getStatement.get(sessionId);
      if (!row || row.expires_at <= Date.now()) {
        if (row) this.destroyStatement.run(sessionId);
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.session_json));
    } catch (error) {
      callback(error);
    }
  }

  set(sessionId, sessionData, callback = () => {}) {
    try {
      this.setStatement.run(
        sessionId,
        JSON.stringify(sessionData),
        expiryFor(sessionData),
      );
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sessionId, sessionData, callback = () => {}) {
    try {
      this.touchStatement.run(expiryFor(sessionData), sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sessionId, callback = () => {}) {
    try {
      this.destroyStatement.run(sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}
