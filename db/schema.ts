import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), name: text("name").notNull(), aliases: text("aliases").notNull().default("[]"),
  startYear: integer("start_year").notNull(), endYear: integer("end_year").notNull(),
  category: text("category").notNull(), sources: text("sources").notNull().default("[]"),
  status: text("status").notNull().default("draft"), editorId: text("editor_id").notNull(),
  reviewerId: text("reviewer_id"), reviewNotes: text("review_notes").notNull().default(""),
  version: integer("version").notNull().default(1), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("events_public_order").on(t.status, t.startYear, t.id)]);
export const eventVersions = sqliteTable("event_versions", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull(), version: integer("version").notNull(),
  snapshot: text("snapshot").notNull(), actorId: text("actor_id").notNull(), action: text("action").notNull(), createdAt: text("created_at").notNull(),
});
export const eventDrafts = sqliteTable("event_drafts", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull(), payload: text("payload").notNull(),
  baseVersion: integer("base_version").notNull().default(0), state: text("state").notNull().default("pending"),
  editorId: text("editor_id").notNull(), reviewerId: text("reviewer_id"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const visitors = sqliteTable("anonymous_visitors", { key: text("key").primaryKey(), createdAt: text("created_at").notNull() });
export const candleRequests = sqliteTable("candle_requests", {
  id: text("id").primaryKey(), visitorKey: text("visitor_key").notNull(), requestKey: text("request_key").notNull(),
  businessDay: text("business_day").notNull(), acceptedAt: text("accepted_at").notNull(),
}, t => [uniqueIndex("request_idempotency").on(t.visitorKey, t.requestKey), index("requests_recent").on(t.visitorKey, t.acceptedAt)]);
export const candles = sqliteTable("candles", {
  id: text("id").primaryKey(), visitorKey: text("visitor_key").notNull(), businessDay: text("business_day").notNull(),
  acceptedAt: text("accepted_at").notNull(), state: text("state").notNull().default("valid"),
}, t => [uniqueIndex("one_candle_per_browser_day").on(t.visitorKey, t.businessDay), index("candles_day_state").on(t.businessDay, t.state)]);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").notNull(), window: integer("window").notNull(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
}, t => [uniqueIndex("rate_window").on(t.key, t.window), index("rate_expiry").on(t.expiresAt)]);
export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull().default(""), message: text("message").notNull(),
  sourceUrl: text("source_url").notNull().default(""), status: text("status").notNull().default("open"), createdAt: text("created_at").notNull(),
});
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), actorId: text("actor_id").notNull(), action: text("action").notNull(),
  targetId: text("target_id").notNull(), detail: text("detail").notNull().default(""), createdAt: text("created_at").notNull(),
});
