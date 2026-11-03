import records from "../data/catalog.json" with { type: "json" };
import release from "../data/catalog.lock.json" with { type: "json" };
import { normalSearch, PERIODS } from "./rules.ts";
import { areasFor, AREA_ORDER } from "./areas.ts";

type RecordData = {
  id: string; name: string; aliases: string[]; startYear: number; endYear: number;
  startDate?: string; endDate?: string | null; dateLabel?: string; datePrecision?: string;
  category?: string; level?: string; region?: string; parentName?: string | null;
};
function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year + "年" + (month ? Number(month) + "月" : "") + (day ? Number(day) + "日" : "");
}
const fixed = Object.freeze((records as RecordData[]).map(record => {
  const start = record.startDate || String(record.startYear);
  const end = record.endDate === null ? null : record.endDate || String(record.endYear);
  return Object.freeze({ ...record, aliases: Object.freeze([...record.aliases]),
    startDate: start, endDate: end, areas: Object.freeze(areasFor(record.id, record.region || "中国")),
    dateLabel: record.dateLabel || (end === start ? formatDate(start) : end ? formatDate(start) + "—" + formatDate(end) : formatDate(start) + "起"),
    datePrecision: record.datePrecision || "year", category: record.category || "相关事件",
    level: record.level || "incident", region: record.region || "中国", parentName: record.parentName || null,
  });
}).sort((a, b) => a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export const CATALOG_RELEASE = release.release_id;
export type PublicEvent = {
  id: string; display_name: string; start_date: string; end_date: string | null;
  date_label: string; date_precision: string; category: string; level: string; region: string; parent_name: string | null;
};
export type PublicCatalog = { data: PublicEvent[]; total: number; next_cursor: string | null; release_id: string };
export type CatalogFilter = { query?: string; period?: string; category?: string; year?: string; area?: string };

export function filterCatalog({ query = "", period = "all", category = "all", year = "all", area = "all" }: CatalogFilter = {}): PublicEvent[] {
  const range = PERIODS.find(p => p.id === period) ?? PERIODS[0];
  const search = normalSearch(query.slice(0, 100));
  return fixed.filter(e => e.endYear >= range.start && e.startYear <= range.end &&
    (category === "all" || e.category === category) && (year === "all" || e.startYear === Number(year)) &&
    (area === "all" || e.areas.includes(area)) &&
    (!search || normalSearch([e.name, ...e.aliases, e.region, e.startDate, e.dateLabel].join(" ")).includes(search))
  ).map(e => ({
    id: e.id, display_name: e.name, start_date: e.startDate, end_date: e.endDate,
    date_label: e.dateLabel, date_precision: e.datePrecision, category: e.category,
    level: e.level, region: e.region, parent_name: e.parentName,
  }));
}

export function catalogOverview() {
  return {
    total: fixed.length,
    years: [...new Set(fixed.map(e => e.startYear))].sort((a, b) => a - b),
    categories: [...new Set(fixed.map(e => e.category))],
    areas: AREA_ORDER.filter(area => fixed.some(e => e.areas.includes(area))),
    chapters: PERIODS.slice(1).map(period => ({ ...period, count: filterCatalog({ period: period.id }).length })),
    dayPrecision: fixed.filter(e => e.datePrecision === "day").length,
  };
}

// Read-only release data. Database content cannot alter the historical catalog.
export function readCatalog(q = "", period = "all", cursor = "", limit = 24, category = "all", year = "all", area = "all"): PublicCatalog {
  const filtered = filterCatalog({ query: q, period, category, year, area });
  const start = cursor ? filtered.findIndex(e => e.id === cursor) + 1 : 0;
  if (cursor && start === 0) throw new RangeError("目录游标无效，请重新载入。");
  const size = Math.max(1, Math.min(60, Math.floor(limit) || 24));
  const page = filtered.slice(start, start + size);
  return { data: page, total: filtered.length, next_cursor: start + size < filtered.length ? page.at(-1)?.id ?? null : null, release_id: CATALOG_RELEASE };
}
