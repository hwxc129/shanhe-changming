import { fetchJson } from "./http-client";
import { lightLocalCandle, localCandleState } from "./local-candles";
const apiOrigin = import.meta.env.VITE_CANDLE_API_ORIGIN || "";
const base = import.meta.env.BASE_URL || "/";
const tokenKey = "shanhe-visitor-v1:" + apiOrigin;
export const isLocalOnly = import.meta.env.VITE_CANDLE_MODE === "local";
const localRecordKey = "shanhe-local-checkins-v1:" + base;

export const siteHref = (path: string) => base + path.replace(/^\/+/, "");
export const backupSite = "https://shanhe-remembrance-20261103.vkvbb39.chatgpt.site/";

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  if (isLocalOnly) {
    let storage: Storage;
    try { storage = window.localStorage; } catch { throw new Error("无法保存本浏览器纪念记录，请检查浏览器存储设置。"); }
    if (url === "/api/v1/candles/me") return localCandleState(storage, localRecordKey) as T;
    if (url === "/api/v1/visitors") return { ready: true } as T;
    if (url === "/api/v1/candles" && options?.method === "POST") {
      const light = () => lightLocalCandle(storage, localRecordKey);
      return (navigator.locks ? await navigator.locks.request("shanhe-local-candle", light) : light()) as T;
    }
    throw new Error("纯静态版不提供全站统计服务。");
  }
  const headers = new Headers(options?.headers);
  if (apiOrigin) {
    try {
      const token = localStorage.getItem(tokenKey);
      if (token && /^[a-f0-9]{64}$/.test(token)) headers.set("Authorization", "Bearer " + token);
    } catch { /* The server can still return public totals without browser storage. */ }
  }
  const data = await fetchJson<T & { visitor_token?: string }>(apiOrigin ? new URL(url, apiOrigin) : url, {
    cache: "no-store", ...options, credentials: apiOrigin ? "omit" : "same-origin", headers,
  });
  if (apiOrigin && data.visitor_token) {
    try { localStorage.setItem(tokenKey, data.visitor_token); }
    catch { throw new Error("无法保存每日状态，请允许本站必要的浏览器存储后重试。"); }
  }
  return data;
}

export const post = (url: string, body: unknown = {}) => request<any>(url, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export function operationKey() {
  if (!globalThis.crypto?.getRandomValues) throw new Error("当前浏览器不支持安全操作，请换用现代浏览器或HTTPS地址。");
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}
