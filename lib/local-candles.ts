import { businessDayAt, nextDayResetAt } from "./rules.ts";

type BrowserStore = Pick<Storage, "getItem" | "setItem">;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function readDays(storage: BrowserStore, key: string): string[] {
  try {
    const saved = storage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (parsed.version !== 1 || !Array.isArray(parsed.days) || parsed.days.some((day: unknown) => typeof day !== "string" || !DAY_KEY.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)) throw new Error();
    return [...new Set<string>(parsed.days)].sort();
  } catch { throw new Error("本浏览器的纪念记录暂时无法读取，请检查浏览器存储设置。"); }
}

export function localCandleState(storage: BrowserStore, key: string, now = Date.now()) {
  const days = readDays(storage, key);
  const day = businessDayAt(now);
  const lit = days.includes(day);
  return { ready: true, browser_total_count: days.length, today_state: lit ? "lit" : "unlit", can_light: !lit, business_date: day, next_reset_at: nextDayResetAt(now) };
}

export function lightLocalCandle(storage: BrowserStore, key: string, now = Date.now()) {
  const days = readDays(storage, key);
  const day = businessDayAt(now);
  const existed = days.includes(day);
  if (!existed) {
    try { storage.setItem(key, JSON.stringify({ version: 1, days: [...days, day].sort() })); }
    catch { throw new Error("无法保存纪念记录，请允许本站使用浏览器存储后重试。"); }
  }
  return { result: existed ? "already_lit" : "created", state: "valid", business_date: day, record_id: "local-" + day };
}
