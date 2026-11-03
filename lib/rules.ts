export const PERIODS = [
  { id: "all", label: "全部年代", start: 1840, end: 1949, title: "百年铭记", description: "从近代开端，循时回望" },
  { id: "1840-1860", label: "1840—1860", start: 1840, end: 1860, title: "烽火初起", description: "鸦片战争与沿海抵抗" },
  { id: "1861-1900", label: "1861—1900", start: 1861, end: 1900, title: "海疆危局", description: "边疆、海防与列强入侵" },
  { id: "1901-1930", label: "1901—1930", start: 1901, end: 1930, title: "危局救亡", description: "殖民冲突与反侵略运动" },
  { id: "1931-1936", label: "1931—1936", start: 1931, end: 1936, title: "山河告急", description: "局部抗战与民族救亡" },
  { id: "1937-1945", label: "1937—1945", start: 1937, end: 1945, title: "共同抗战", description: "正面战场与敌后抵抗" },
  { id: "1946-1949", label: "1946—1949", start: 1946, end: 1949, title: "战后余波", description: "外来干涉与相关抵抗" },
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
