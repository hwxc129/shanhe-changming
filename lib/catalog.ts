import records from "../data/catalog.json" with { type: "json" };
import release from "../data/catalog.lock.json" with { type: "json" };
import { normalSearch, PERIODS } from "./rules.ts";

// The published catalog is read from the release, never from editable database rows.
const fixed = Object.freeze(records.map(record => Object.freeze({
  ...record, aliases: Object.freeze([...record.aliases]),
})).sort((a, b) => a.startYear - b.startYear || a.id.localeCompare(b.id, "en")));

export const CATALOG_RELEASE = release.release_id;
export type PublicCatalog = {
  data: { id: string; display_name: string }[];
  total: number;
  next_cursor: string | null;
  release_id: string;
};

export function readCatalog(q = "", period = "all", cursor = "", limit = 12): PublicCatalog {
  const range = PERIODS.find(p => p.id === period) ?? PERIODS[0];
  const search = normalSearch(q.slice(0, 100));
  const filtered = fixed.filter(e => e.endYear >= range.start && e.startYear <= range.end &&
    (!search || normalSearch(e.name + e.aliases.join(" ")).includes(search)));
  const start = cursor ? filtered.findIndex(e => e.id === cursor) + 1 : 0;
  if (cursor && start === 0) throw new RangeError("目录游标无效，请重新载入。");
  const size = Math.max(1, Math.min(60, Math.floor(limit) || 12));
  const page = filtered.slice(start, start + size);
  return {
    data: page.map(e => ({ id: e.id, display_name: e.name })),
    total: filtered.length,
    next_cursor: start + size < filtered.length ? page.at(-1)?.id ?? null : null,
    release_id: CATALOG_RELEASE,
  };
}
