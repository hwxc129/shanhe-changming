import { json, candleStats, routeError } from "../../../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET() { try { return json(await candleStats(), 200, { "Cache-Control": "public, max-age=5" }); } catch (e) { return routeError(e); } }
