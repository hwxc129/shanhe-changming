import { assertSameOrigin, issueVisitor, routeError } from "../../../../lib/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { try { assertSameOrigin(request); return await issueVisitor(request); } catch (e) { return routeError(e); } }
