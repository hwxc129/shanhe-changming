import solarTerms from "../data/solar-terms.json" with { type: "json" };
import { businessDayAt } from "./rules.ts";

const ZONE = "Asia/Shanghai";
const DAY = 86_400_000;
const gregorian = new Intl.DateTimeFormat("zh-CN", { timeZone: ZONE, dateStyle: "full" });
const lunar = new Intl.DateTimeFormat("en-u-ca-chinese", { timeZone: ZONE, month: "numeric", day: "numeric" });
const months = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const numerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

type FestivalRule =
  | { calendar: "solar"; date: string }
  | { calendar: "lunar"; month: number; day: number }
  | { calendar: "term"; term: "qingming" | "solstice" }
  | { calendar: "eve" };

type Motif = "lantern" | "moon" | "boat" | "sprout" | "flower" | "sun" | "grain" | "snow" | "flag" | "flame" | "monument" | "stars";

export type Festival = {
  id: string;
  name: string;
  when: string;
  note: string;
  motif: Motif;
  accent: string;
  surface: string;
  kind: "传统节日" | "公历节日" | "节气" | "纪念日";
  rule: FestivalRule;
};

export const festivals: readonly Festival[] = [
  { id: "new-year", name: "元旦", when: "公历一月初一", note: "新岁伊始，愿日常平安，来年有盼。", motif: "sun", accent: "#e5bf8e", surface: "#38251b", kind: "公历节日", rule: { calendar: "solar", date: "01-01" } },
  { id: "laba", name: "腊八节", when: "农历腊月初八", note: "一碗热粥，暖过岁末。", motif: "grain", accent: "#e0bb9c", surface: "#392b25", kind: "传统节日", rule: { calendar: "lunar", month: 12, day: 8 } },
  { id: "eve", name: "除夕", when: "农历岁末最后一天", note: "灯火围坐，辞旧迎新。", motif: "lantern", accent: "#f1bd8c", surface: "#491f21", kind: "传统节日", rule: { calendar: "eve" } },
  { id: "spring", name: "春节", when: "农历正月初一", note: "迎春纳福，祝家人平安相聚。", motif: "lantern", accent: "#ffd19a", surface: "#542320", kind: "传统节日", rule: { calendar: "lunar", month: 1, day: 1 } },
  { id: "lantern", name: "元宵节", when: "农历正月十五", note: "灯明月圆，同赏一夜光华。", motif: "lantern", accent: "#ffd8a6", surface: "#452d42", kind: "传统节日", rule: { calendar: "lunar", month: 1, day: 15 } },
  { id: "longtaitou", name: "龙抬头", when: "农历二月初二", note: "春气渐暖，万物舒展。", motif: "sprout", accent: "#b9d9a0", surface: "#283e29", kind: "传统节日", rule: { calendar: "lunar", month: 2, day: 2 } },
  { id: "qingming", name: "清明节", when: "清明节气当天", note: "慎终追远，寄一份思念给故人。", motif: "sprout", accent: "#c0d2bc", surface: "#263530", kind: "传统节日", rule: { calendar: "term", term: "qingming" } },
  { id: "labour", name: "劳动节", when: "公历五月初一", note: "向每一双辛勤工作的手致意。", motif: "grain", accent: "#e5bf80", surface: "#3b3020", kind: "公历节日", rule: { calendar: "solar", date: "05-01" } },
  { id: "dragon-boat", name: "端午节", when: "农历五月初五", note: "粽叶有香，舟过碧水。愿端午安康。", motif: "boat", accent: "#a7ddd0", surface: "#164039", kind: "传统节日", rule: { calendar: "lunar", month: 5, day: 5 } },
  { id: "qixi", name: "七夕", when: "农历七月初七", note: "仰望星河，惦念远方的人。", motif: "stars", accent: "#d8bfff", surface: "#302446", kind: "传统节日", rule: { calendar: "lunar", month: 7, day: 7 } },
  { id: "zhongyuan", name: "中元节", when: "农历七月十五", note: "一盏灯，寄托对先人的思念。", motif: "flame", accent: "#e1c6a8", surface: "#363033", kind: "传统节日", rule: { calendar: "lunar", month: 7, day: 15 } },
  { id: "mid-autumn", name: "中秋节", when: "农历八月十五", note: "天涯同此月，愿相聚的人珍重此刻。", motif: "moon", accent: "#f0d099", surface: "#1c2e47", kind: "传统节日", rule: { calendar: "lunar", month: 8, day: 15 } },
  { id: "double-nine", name: "重阳节", when: "农历九月初九", note: "秋日登高，问候家中长辈。", motif: "flower", accent: "#e1bb78", surface: "#423322", kind: "传统节日", rule: { calendar: "lunar", month: 9, day: 9 } },
  { id: "victory-day", name: "中国人民抗日战争胜利纪念日", when: "公历九月三日", note: "铭记抗战岁月，缅怀为胜利付出牺牲的人们。", motif: "monument", accent: "#e4c796", surface: "#352e24", kind: "纪念日", rule: { calendar: "solar", date: "09-03" } },
  { id: "martyrs-day", name: "烈士纪念日", when: "公历九月三十日", note: "向为国家和人民献出生命的英烈致敬。", motif: "flower", accent: "#d9c8b6", surface: "#34292b", kind: "纪念日", rule: { calendar: "solar", date: "09-30" } },
  { id: "national-day", name: "国庆节", when: "公历十月一日", note: "回望开国大典，记住新中国成立的那一天。", motif: "flag", accent: "#ffd18a", surface: "#562421", kind: "公历节日", rule: { calendar: "solar", date: "10-01" } },
  { id: "national-memorial", name: "南京大屠杀死难者国家公祭日", when: "公历十二月十三日", note: "悼念遇难同胞，铭记历史，珍爱和平。", motif: "monument", accent: "#ddd9d1", surface: "#292b2d", kind: "纪念日", rule: { calendar: "solar", date: "12-13" } },
  { id: "solstice", name: "冬至", when: "冬至节气当天", note: "冬深岁近，愿有灯火可亲。", motif: "snow", accent: "#bfdaea", surface: "#233541", kind: "节气", rule: { calendar: "term", term: "solstice" } },
];

function lunarParts(time: number) {
  if (lunar.resolvedOptions().calendar !== "chinese") return { month: 0, day: 0, leap: false };
  const parts = lunar.formatToParts(time);
  const month = parts.find(part => part.type === "month")?.value ?? "";
  const day = Number(parts.find(part => part.type === "day")?.value);
  return { month: Number.parseInt(month, 10), day, leap: month.endsWith("bis") };
}

function lunarDayLabel(day: number) {
  if (day <= 10) return "初" + numerals[day - 1];
  if (day < 20) return "十" + numerals[day - 11];
  if (day === 20) return "二十";
  if (day < 30) return "廿" + numerals[day - 21];
  return "三十";
}

const terms: Record<string, readonly string[]> = solarTerms;

export function chinaDay(time = Date.now()) {
  const key = businessDayAt(time);
  const monthDay = key.slice(5);
  const { month, day, leap } = lunarParts(time);
  const lunarLabel = months[month - 1] && day >= 1 && day <= 30
    ? `农历${leap ? "闰" : ""}${months[month - 1]}月${lunarDayLabel(day)}`
    : "";
  const todaysFestivals = festivals.filter(({ rule }) => {
    switch (rule.calendar) {
      case "solar": return monthDay === rule.date;
      case "lunar": return !leap && month === rule.month && day === rule.day;
      case "term": return monthDay === terms[key.slice(0, 4)]?.[rule.term === "qingming" ? 0 : 1];
      case "eve": {
        if (leap || month !== 12) return false;
        const tomorrow = lunarParts(time + DAY);
        return !tomorrow.leap && tomorrow.month === 1 && tomorrow.day === 1;
      }
    }
  });
  // Give commemorative occasions priority if a lunar festival shares the date.
  const theme = todaysFestivals.find(festival => festival.kind === "纪念日") ?? todaysFestivals[0];
  return { key, label: gregorian.format(time), lunarLabel, festivals: todaysFestivals, theme };
}
