import { publicCatalog, json, routeError, AppError } from "../../../../lib/server";
import { CATALOG_RELEASE } from "../../../../lib/catalog";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const release = q.get("release");
    if (release) {
      if (release !== CATALOG_RELEASE) throw new AppError(409, "目录版本不匹配，请重新载入。");
    }
    const limit = Math.max(1, Math.min(60, Number(q.get("limit")) || 12));
    return json(await publicCatalog(q.get("q") || "", q.get("period") || "all", q.get("cursor") || "", limit));
  } catch (e) { return routeError(e instanceof RangeError ? new AppError(409, e.message) : e); }
}
