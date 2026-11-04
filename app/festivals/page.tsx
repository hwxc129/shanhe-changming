"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Brand, Footer } from "../memorial";
import { ChinaCalendarStrip, FestivalMark, festivalStyle } from "../china-calendar";
import { useChinaDay } from "../../hooks/use-china-day";
import { festivals } from "../../lib/festivals";
import { siteHref } from "../../lib/api-client";
import sourceData from "../../data/festival-sources.json";
import RocketTop from "../rocket-top";

const groups = [
  { title: "国庆与纪念日", items: ["national-day", "victory-day", "martyrs-day", "national-memorial"].flatMap(id => festivals.filter(item => item.id === id)) },
  { title: "传统节日与节气", items: festivals.filter(item => item.kind === "传统节日" || item.kind === "节气") },
  { title: "元旦与劳动节", items: festivals.filter(item => item.id === "new-year" || item.id === "labour") },
];
const sources: Record<string, { title: string; institution: string; url: string }[]> = sourceData;
const nationalDay = festivals.find(festival => festival.id === "national-day");

export default function FestivalsPage() {
  const day = useChinaDay();
  const [selection, setSelection] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSelection(new URLSearchParams(window.location.search).get("festival"));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const feature = festivals.find(festival => festival.id === selection) ?? day?.theme ?? nationalDay ?? festivals[0];
  const today = day?.festivals.some(festival => festival.id === feature.id);

  function select(id: string) {
    setSelection(id);
    const url = new URL(window.location.href);
    url.searchParams.set("festival", id);
    window.history.replaceState(window.history.state, "", url);
    document.getElementById("festival-feature")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return <div className="festival-page" style={festivalStyle(feature)}>
    <header className="site-header"><Brand /><a className="festival-back" href={siteHref("/")}><ArrowLeft size={15} aria-hidden="true" /> 返回纪念站</a></header>
    <ChinaCalendarStrip day={day} onFestivalPage />
    <main className="festival-shell">
      <section className="festival-feature" id="festival-feature" aria-labelledby="festival-title">
        <div className="festival-feature-copy">
          <span className="section-kicker">中国节日 · {today ? "今日主题" : "主题预览"}</span>
          <p className="festival-when">{feature.when} · {feature.kind}</p>
          <h1 id="festival-title" className={feature.name.length > 10 ? "festival-title-long" : undefined}>{feature.name}</h1>
          <p className="festival-note">{feature.note}</p>
          <details className="festival-sources"><summary>日期依据</summary><ul>{sources[feature.id]?.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.institution} · {source.title}</a></li>)}</ul></details>
          {feature.id === "national-day"
            ? <a href={siteHref("/#story-founding")}>阅读开国大典 <ArrowRight size={15} aria-hidden="true" /></a>
            : <a href="#festival-directory">浏览节日 <ArrowRight size={15} aria-hidden="true" /></a>}
        </div>
        <div className="festival-emblem"><FestivalMark motif={feature.motif} /></div>
      </section>
      <section className="festival-directory" id="festival-directory" aria-labelledby="festival-directory-title">
        <h2 id="festival-directory-title">中国节日与纪念日</h2>
        <p>按北京时间识别当日主题。选择任一节日即可预览。</p>
        {groups.map(group => <section className="festival-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="festival-grid">
            {group.items.map(festival =>
              <button type="button" key={festival.id} style={festivalStyle(festival)}
                onClick={() => select(festival.id)} aria-pressed={feature.id === festival.id}>
                <span className="festival-card-mark"><FestivalMark motif={festival.motif} /></span>
                <strong>{festival.name}</strong>
                <small>{festival.when}{day?.festivals.some(item => item.id === festival.id) ? " · 今日" : ""}</small>
              </button>,
            )}
          </div>
        </section>)}
        <p className="festival-calendar-note">清明、冬至采用香港天文台 2024—2040 年对照表。 <a href="https://www.hko.gov.hk/sc/gts/time/conversion1_text.htm" target="_blank" rel="noreferrer">查阅历法资料</a></p>
        <p className="festival-calendar-note">页面采用通行节日日期，部分地区的民俗日期和节期有所不同。七夕按传统乞巧节编排。</p>
      </section>
    </main>
    <Footer />
    <RocketTop />
  </div>;
}
