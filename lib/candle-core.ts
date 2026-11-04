import { businessDayAt, nextDayResetAt } from "./rules.ts";
import { readCatalog } from "./catalog.ts";
import { allowedPublicOrigin } from "./public-api.ts";
import { BodyError, readBoundedJson } from "./request-body.ts";

export type SqlResult = { meta: { changes?: number } };
export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<SqlResult>;
}
export interface CandleDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}
export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
export function routeError(error: unknown) {
  if (error instanceof AppError || error instanceof BodyError) return json({ error: error.message }, error.status);
  console.error("request_failed", error instanceof Error ? error.name : "unknown");
  return json({ error: "服务暂时不可用，请稍后重试。" }, 503);
}
export function createCandleService(options: {
  database: () => CandleDatabase;
  siteOrigin?: () => string | undefined;
  publicOrigin?: (request: Request) => string | null;
  now?: () => number;
}) {
  const d1 = options.database;
  const clock = options.now ?? Date.now;
  const publicOrigin = options.publicOrigin ?? allowedPublicOrigin;
function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, options.siteOrigin?.()].filter(Boolean));
  const publicClient = publicOrigin(request);
  if (!origin || (!allowed.has(origin) && !publicClient) || (request.headers.get("sec-fetch-site") === "cross-site" && !publicClient)) throw new AppError(403, "请从本站发起操作。");
}
async function bodyJson(request: Request) {
  const body = await readBoundedJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError(400, "请提交正确的操作信息。");
  return body;
}
async function digest(text: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join(""); }
const visitorCookieName = (request: Request) => new URL(request.url).protocol === "https:" ? "__Host-shanhe_visitor" : "shanhe_visitor_dev";
async function visitor(request: Request) {
  const bearer = publicOrigin(request) ? request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] : null;
  const raw = bearer || request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(visitorCookieName(request) + "="))?.split("=")[1];
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const key = await digest(raw);
  return await d1().prepare("SELECT key FROM anonymous_visitors WHERE key = ?").bind(key).first<{ key: string }>();
}
async function rateLimit(key: string, limit: number, seconds = 60) {
  const now = clock(); const window = Math.floor(now / (seconds * 1000));
  const row = await d1().prepare("INSERT INTO rate_limits(key, window, count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count").bind(key, window, Math.floor(now / 1000) + seconds * 2).first<{ count: number }>();
  if (!row || row.count > limit) throw new AppError(429, "操作较频繁，请稍后再试。");
  if (Math.random() < 0.02) await d1().prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(Math.floor(now / 1000)).run();
}
async function issueVisitor(request: Request) {
  const known = await visitor(request); if (known) return json({ ready: true });
  const ip = request.headers.get("cf-connecting-ip") || "local";
  await rateLimit("visitor:" + await digest(businessDayAt(clock()) + ip), 150, 600);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  await d1().prepare("INSERT INTO anonymous_visitors(key, created_at) VALUES (?, ?)").bind(await digest(token), new Date(clock()).toISOString()).run();
  if (publicOrigin(request)) return json({ ready: true, visitor_token: token });
  return json({ ready: true }, 200, { "Set-Cookie": `${visitorCookieName(request)}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` });
}
async function candleState(request: Request) {
  const day = businessDayAt(clock()); const v = await visitor(request);
  if (!v) return { ready: false, browser_total_count: 0, today_state: "unlit", can_light: false, business_date: day, next_reset_at: nextDayResetAt(clock()) };
  const [row, personal] = await Promise.all([
    d1().prepare("SELECT id, state FROM candles WHERE visitor_key = ? AND business_day = ?").bind(v.key, day).first<{ id: string; state: string }>(),
    d1().prepare("SELECT COUNT(*) AS count FROM candles WHERE visitor_key = ? AND state = 'valid'").bind(v.key).first<{ count: number }>(),
  ]);
  return { ready: true, browser_total_count: personal?.count ?? 0, today_state: row ? row.state === "valid" ? "lit" : "unavailable" : "unlit", can_light: !row, record_id: row?.id ?? null, business_date: day, next_reset_at: nextDayResetAt(clock()) };
}
async function candleStats() {
  const day = businessDayAt(clock());
  const row = await d1().prepare("SELECT COUNT(*) AS total_count, COALESCE(SUM(CASE WHEN business_day = ? THEN 1 ELSE 0 END), 0) AS today_count FROM candles WHERE state = 'valid'").bind(day).first<{ total_count: number; today_count: number }>();
  return { total_count: row?.total_count ?? 0, today_count: row?.today_count ?? 0, business_date: day, as_of: new Date(clock()).toISOString() };
}
async function lightCandle(request: Request, requestKey: string) {
  if (!/^[a-f0-9-]{20,80}$/i.test(requestKey)) throw new AppError(400, "操作标识无效，请重新尝试。");
  const v = await visitor(request); if (!v) throw new AppError(401, "无法保存每日状态，请允许本站必要Cookie后重试。");
  const prior = await d1().prepare("SELECT c.id, c.business_day, c.state FROM candle_requests r JOIN candles c ON c.visitor_key = r.visitor_key AND c.business_day = r.business_day WHERE r.visitor_key = ? AND r.request_key = ?").bind(v.key, requestKey).first<{ id: string; business_day: string; state: string }>();
  if (prior) return { result: "already_lit", record_id: prior.id, business_date: prior.business_day, state: prior.state };
  await rateLimit("candle:" + v.key, 300);
  const now = new Date(clock()).toISOString(); const day = businessDayAt(Date.parse(now)); const id = crypto.randomUUID();
  const results = await d1().batch([
    d1().prepare("INSERT OR IGNORE INTO candle_requests(id, visitor_key, request_key, business_day, accepted_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), v.key, requestKey, day, now),
    d1().prepare("INSERT OR IGNORE INTO candles(id, visitor_key, business_day, accepted_at, state) SELECT ?, visitor_key, business_day, accepted_at, 'valid' FROM candle_requests WHERE visitor_key = ? AND request_key = ?").bind(id, v.key, requestKey),
  ]);
  const entry = await d1().prepare("SELECT c.id, c.business_day, c.state FROM candle_requests r JOIN candles c ON c.visitor_key = r.visitor_key AND c.business_day = r.business_day WHERE r.visitor_key = ? AND r.request_key = ?").bind(v.key, requestKey).first<{ id: string; business_day: string; state: string }>();
  if (!entry) throw new AppError(503, "暂时无法确认结果，请稍后重试。");
  return { result: results[1].meta.changes ? "created" : "already_lit", record_id: entry.id, business_date: entry.business_day, state: entry.state };
}


async function publicCatalog(q = "", period = "all", cursor = "", limit = 24, category = "all", year = "all", area = "all") {
  return readCatalog(q, period, cursor, limit, category, year, area);
}

return { assertSameOrigin, bodyJson, issueVisitor, candleState, candleStats, lightCandle, publicCatalog };
}
