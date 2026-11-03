export const PERIODS = [
  { id: "all", label: "全部年代", start: 1840, end: 1945 },
  { id: "1840-1860", label: "1840—1860", start: 1840, end: 1860 },
  { id: "1861-1895", label: "1861—1895", start: 1861, end: 1895 },
  { id: "1896-1911", label: "1896—1911", start: 1896, end: 1911 },
  { id: "1912-1930", label: "1912—1930", start: 1912, end: 1930 },
  { id: "1931-1945", label: "1931—1945", start: 1931, end: 1945 },
];
export function businessDayAt(time: Date | number = Date.now()) {
  return new Date(+time + 8 * 3600_000).toISOString().slice(0, 10);
}
export function nextDayResetAt(time: Date | number = Date.now()) {
  const day = businessDayAt(time);
  return new Date(Date.parse(`${day}T00:00:00+08:00`) + 86_400_000).toISOString();
}
export function normalSearch(s: string) {
  const pairs = "戰战爭争華华國国軍军盧卢溝沟橋桥變变滬沪會会圍围臺台兒儿莊庄慘惨殺杀團团義义運运動动灣湾門门東东遼辽濟济慶庆漢汉廣广條条約约聯联島岛鴉鸦圓圆園园鎮镇關关黃黄順顺衛卫鬥斗倉仓庫库";
  const mapping: Record<string, string> = {};
  for (let i = 0; i < pairs.length; i += 2) mapping[pairs[i]] = pairs[i + 1];
  return s.toLowerCase().normalize("NFKC").replace(/\s+/g, "").replace(/./g, c => mapping[c] || c);
}
