const apiOrigin = import.meta.env.VITE_CANDLE_API_ORIGIN || "";
const base = import.meta.env.BASE_URL || "/";
const tokenKey = "shanhe-visitor-v1:" + apiOrigin;

export const siteHref = (path: string) => base + path.replace(/^\/+/, "");

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (apiOrigin) {
    try {
      const token = localStorage.getItem(tokenKey);
      if (token && /^[a-f0-9]{64}$/.test(token)) headers.set("Authorization", "Bearer " + token);
    } catch { /* The server can still return public totals without browser storage. */ }
  }
  const res = await fetch(apiOrigin ? new URL(url, apiOrigin) : url, {
    cache: "no-store", ...options, credentials: apiOrigin ? "omit" : "same-origin", headers,
  });
  const data = await res.json() as T & { error?: string; visitor_token?: string };
  if (!res.ok) throw new Error(data.error || "暂时无法连接，请稍后重试。");
  if (apiOrigin && data.visitor_token) {
    try { localStorage.setItem(tokenKey, data.visitor_token); }
    catch { throw new Error("无法保存每日状态，请允许本站必要的浏览器存储后重试。"); }
  }
  return data;
}

export const post = (url: string, body: unknown = {}) => request<any>(url, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
