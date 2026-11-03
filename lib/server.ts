import "server-only";
import { env } from "cloudflare:workers";
import { businessDayAt, nextDayResetAt } from "./rules";
import { readCatalog } from "./catalog";
import { allowedPublicOrigin } from "./public-api";

export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export function d1(): D1Database { if (!env.DB) throw new AppError(503, "服务暂时不可用，请稍后重试。"); return env.DB; }
export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
export function routeError(error: unknown) {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  console.error("request_failed", error instanceof Error ? error.name : "unknown");
  return json({ error: "服务暂时不可用，请稍后重试。" }, 503);
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, env.SITE_ORIGIN].filter(Boolean));
  const publicClient = allowedPublicOrigin(request);
  if (!origin || (!allowed.has(origin) && !publicClient) || (request.headers.get("sec-fetch-site") === "cross-site" && !publicClient)) throw new AppError(403, "请从本站发起操作。");
}
export async function bodyJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError(415, "请使用正确的数据格式。");
  const text = await request.text();
  if (text.length > 25_000) throw new AppError(413, "提交内容过长。");
  try { return JSON.parse(text); } catch { throw new AppError(400, "提交内容格式不正确。"); }
}
export async function digest(text: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join(""); }
export const visitorCookieName = (request: Request) => new URL(request.url).protocol === "https:" ? "__Host-shanhe_visitor" : "shanhe_visitor_dev";
export async function visitor(request: Request) {
  const bearer = allowedPublicOrigin(request) ? request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] : null;
  const raw = bearer || request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(visitorCookieName(request) + "="))?.split("=")[1];
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const key = await digest(raw);
  return await d1().prepare("SELECT key FROM anonymous_visitors WHERE key = ?").bind(key).first<{ key: string }>();
}
export async function rateLimit(key: string, limit: number, seconds = 60) {
  const now = Date.now(); const window = Math.floor(now / (seconds * 1000));
  const row = await d1().prepare("INSERT INTO rate_limits(key, window, count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count").bind(key, window, Math.floor(now / 1000) + seconds * 2).first<{ count: number }>();
  if (!row || row.count > limit) throw new AppError(429, "操作较频繁，请稍后再试。");
  if (Math.random() < 0.02) await d1().prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(Math.floor(now / 1000)).run();
}
export async function issueVisitor(request: Request) {
  const known = await visitor(request); if (known) return json({ ready: true });
  const ip = request.headers.get("cf-connecting-ip") || "local";
  await rateLimit("visitor:" + await digest(businessDayAt() + ip), 150, 600);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  await d1().prepare("INSERT INTO anonymous_visitors(key, created_at) VALUES (?, ?)").bind(await digest(token), new Date().toISOString()).run();
  if (allowedPublicOrigin(request)) return json({ ready: true, visitor_token: token });
  return json({ ready: true }, 200, { "Set-Cookie": `${visitorCookieName(request)}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` });
}
export async function candleState(request: Request) {
  const day = businessDayAt(); const v = await visitor(request);
  if (!v) return { ready: false, today_state: "unlit", can_light: false, business_date: day, next_reset_at: nextDayResetAt() };
  const row = await d1().prepare("SELECT id, state FROM candles WHERE visitor_key = ? AND business_day = ?").bind(v.key, day).first<{ id: string; state: string }>();
  return { ready: true, today_state: row ? row.state === "valid" ? "lit" : "unavailable" : "unlit", can_light: !row, record_id: row?.id ?? null, business_date: day, next_reset_at: nextDayResetAt() };
}
export async function candleStats() {
  const day = businessDayAt();
  const row = await d1().prepare("SELECT COUNT(*) AS total_count, COALESCE(SUM(CASE WHEN business_day = ? THEN 1 ELSE 0 END), 0) AS today_count FROM candles WHERE state = 'valid'").bind(day).first<{ total_count: number; today_count: number }>();
  return { total_count: row?.total_count ?? 0, today_count: row?.today_count ?? 0, business_date: day, as_of: new Date().toISOString() };
}
export async function lightCandle(request: Request, requestKey: string) {
  if (!/^[a-f0-9-]{20,80}$/i.test(requestKey)) throw new AppError(400, "操作标识无效，请重新尝试。");
  const v = await visitor(request); if (!v) throw new AppError(401, "无法保存每日状态，请允许本站必要Cookie后重试。");
  const prior = await d1().prepare("SELECT c.id, c.business_day, c.state FROM candle_requests r JOIN candles c ON c.visitor_key = r.visitor_key AND c.business_day = r.business_day WHERE r.visitor_key = ? AND r.request_key = ?").bind(v.key, requestKey).first<{ id: string; business_day: string; state: string }>();
  if (prior) return { result: "already_lit", record_id: prior.id, business_date: prior.business_day, state: prior.state };
  await rateLimit("candle:" + v.key, 300);
  const now = new Date().toISOString(); const day = businessDayAt(Date.parse(now)); const id = crypto.randomUUID();
  const results = await d1().batch([
    d1().prepare("INSERT OR IGNORE INTO candle_requests(id, visitor_key, request_key, business_day, accepted_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), v.key, requestKey, day, now),
    d1().prepare("INSERT OR IGNORE INTO candles(id, visitor_key, business_day, accepted_at, state) SELECT ?, visitor_key, business_day, accepted_at, 'valid' FROM candle_requests WHERE visitor_key = ? AND request_key = ?").bind(id, v.key, requestKey),
  ]);
  const entry = await d1().prepare("SELECT c.id, c.business_day, c.state FROM candle_requests r JOIN candles c ON c.visitor_key = r.visitor_key AND c.business_day = r.business_day WHERE r.visitor_key = ? AND r.request_key = ?").bind(v.key, requestKey).first<{ id: string; business_day: string; state: string }>();
  if (!entry) throw new AppError(503, "暂时无法确认结果，请稍后重试。");
  return { result: results[1].meta.changes ? "created" : "already_lit", record_id: entry.id, business_date: entry.business_day, state: entry.state };
}


export async function publicCatalog(q = "", period = "all", cursor = "", limit = 24, category = "all", year = "all") {
  return readCatalog(q, period, cursor, limit, category, year);
}
