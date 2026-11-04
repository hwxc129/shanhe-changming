import { DatabaseSync } from "node:sqlite";

const schema = `
CREATE TABLE IF NOT EXISTS anonymous_visitors(key TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candles(id TEXT PRIMARY KEY, visitor_key TEXT NOT NULL, business_day TEXT NOT NULL, accepted_at TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'valid');
CREATE UNIQUE INDEX IF NOT EXISTS one_candle_per_browser_day ON candles(visitor_key,business_day);
CREATE INDEX IF NOT EXISTS candles_day_state ON candles(business_day,state);
CREATE TABLE IF NOT EXISTS candle_requests(id TEXT PRIMARY KEY, visitor_key TEXT NOT NULL, request_key TEXT NOT NULL, business_day TEXT NOT NULL, accepted_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS request_idempotency ON candle_requests(visitor_key,request_key);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS rate_window ON rate_limits(key,window);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);
`;

export function openCandleDatabase(file) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;" + schema);
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    /** @template T @returns {Promise<T | null>} */
    async first() { return /** @type {T | null} */ (db.prepare(this.sql).get(...this.values) ?? null); }
    execute() { const result = db.prepare(this.sql).run(...this.values); return { meta: { changes: Number(result.changes) } }; }
    async run() { return this.execute(); }
  }
  return {
    prepare(sql) { return new Statement(sql); },
    async batch(statements) {
      db.exec("BEGIN IMMEDIATE");
      try { const results = statements.map(statement => statement.execute()); db.exec("COMMIT"); return results; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    close() { db.close(); },
  };
}
