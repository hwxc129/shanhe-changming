export const PUBLIC_CLIENT_ORIGINS = Object.freeze(["https://hwxc129.github.io"]);
const API_PATHS = new Set([
  "/api/v1/visitors", "/api/v1/candles", "/api/v1/candles/me",
  "/api/v1/candles/stats", "/api/v1/events",
]);

export function allowedPublicOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin && PUBLIC_CLIENT_ORIGINS.includes(origin) ? origin : null;
}

export function apiPreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS" || !API_PATHS.has(new URL(request.url).pathname)) return null;
  const origin = allowedPublicOrigin(request);
  if (!origin || !["GET", "HEAD", "POST"].includes(request.headers.get("access-control-request-method") || "")) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  } });
}

export function withPublicCors(request: Request, response: Response): Response {
  const origin = allowedPublicOrigin(request);
  if (!origin || !API_PATHS.has(new URL(request.url).pathname)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
