import { json, candleState, routeError } from "../../../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { return json(await candleState(request), 200, { "Cache-Control": "private, no-store", Vary: "Cookie" }); } catch (e) { return routeError(e); } }
