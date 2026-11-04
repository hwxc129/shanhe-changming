import "server-only";
import { env } from "cloudflare:workers";
import { createCandleService, AppError } from "./candle-core";
export { json, routeError, AppError } from "./candle-core";
export function d1(): D1Database {
  if (!env.DB) throw new AppError(503, "服务暂时不可用，请稍后重试。");
  return env.DB;
}
export const { assertSameOrigin, bodyJson, issueVisitor, candleState, candleStats, lightCandle, publicCatalog } = createCandleService({
  database: d1,
  siteOrigin: () => env.SITE_ORIGIN,
});
