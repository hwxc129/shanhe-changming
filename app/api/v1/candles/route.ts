import { json, assertSameOrigin, bodyJson, lightCandle, routeError } from "../../../../lib/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { assertSameOrigin(request); const body = await bodyJson(request); return json(await lightCandle(request, String(body.idempotency_key || ""))); } catch (e) { return routeError(e); }
}
