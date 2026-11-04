"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { catalogOverview, filterCatalog } from "../lib/catalog";
import { PERIODS } from "../lib/rules";
import TimelinePlayer from "./timeline-player";

const overview = catalogOverview();
const allEntries = filterCatalog();
export default function HistoryTimeline() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("all");
  const [area, setArea] = useState("all");
  const [visible, setVisible] = useState(24);
  const moreButton = useRef<HTMLButtonElement>(null);
  const entries = useMemo(() => filterCatalog({ query, period, category, year, area }), [query, period, category, year, area]);
  const shown = entries.slice(0, visible);
  const years = [...new Set(shown.map(e => e.start_date.slice(0, 4)))];
  useEffect(() => {
    const target = moreButton.current;
    if (!target || typeof IntersectionObserver !== "function") return;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!active || !entry?.isIntersecting) return;
      observer.disconnect();
      setVisible(current => current === visible ? Math.min(current + 24, entries.length) : current);
    }, { rootMargin: "0px 0px 320px" });
    observer.observe(target);
    return () => { active = false; observer.disconnect(); };
  }, [entries, visible]);
  const changePeriod = (id: string, scroll = false) => {
    setPeriod(id); setYear("all"); setVisible(24);
    if (scroll) { setQuery(""); setCategory("all"); setArea("all"); }
    if (scroll) document.getElementById("events")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const clear = () => { setQuery(""); setPeriod("all"); setCategory("all"); setYear("all"); setArea("all"); setVisible(24); };
  const filtered = query || period !== "all" || category !== "all" || year !== "all" || area !== "all";
  return <>
    <section className="journey-section" id="journey" aria-labelledby="journey-title">
      <div className="journey-intro"><div><span className="section-kicker">一段历史，六程回望</span><h2 id="journey-title">循时而行，铭记来路</h2></div><p>从战争的开端，到一次次抵抗。<br/>沿着时间，记住这些名字。</p></div>
      <div className="journey-grid">{overview.chapters.map((chapter, index) => <button key={chapter.id} className={`journey-card ${period === chapter.id ? "is-selected" : ""}`} onClick={() => changePeriod(chapter.id, true)}>
        <div className="journey-card-top"><span className="chapter-index">0{index + 1}</span><span>{chapter.label}</span><ArrowRight size={17}/></div>
        <h3>{chapter.title}</h3><p>{chapter.description}</p><span className="chapter-count">{chapter.count ? `${chapter.count} 个收录条目` : "本期条目待补充"}</span>
      </button>)}</div>
    </section>
    <section className="history-section" id="events" aria-labelledby="catalog-title">
      <div className="history-heading"><div><span className="section-kicker">1840 — 1949 · 历史时间线</span><h2 id="catalog-title">让每个名字，<br className="mobile-only"/>都有时间的坐标。</h2></div><div className="history-total"><strong>{overview.total}</strong><span>个收录条目<small>名称与时间，多来源核对</small></span></div></div>
      <div className="history-layout">
        <aside className="history-aside" aria-label="年代导航"><span className="rail-caption">沿年代浏览</span>{PERIODS.map(p => <button key={p.id} onClick={() => changePeriod(p.id)} className={period === p.id ? "is-active" : ""} aria-pressed={period === p.id}><span>{p.label}</span>{p.id !== "all" && <small>{p.title}</small>}<ArrowRight size={13}/></button>)}<div className="rail-footnote"><span>铭记，始于准确。</span><p>时间精确到史料支持的年份、月份或日期。目录持续核对，当前收录不代表全部事件。</p></div></aside>
        <div className="history-main">
          <div className="history-tools"><label className="timeline-search"><Search size={17}/><input aria-label="搜索事件名称或时间" placeholder="搜索名称、地区或年份" value={query} onChange={e => { setQuery(e.target.value); setVisible(24); }} maxLength={100}/>{query && <button aria-label="清空搜索" onClick={() => { setQuery(""); setVisible(24); }}><X size={15}/></button>}</label><div className="timeline-selects"><select aria-label="按地区筛选" value={area} onChange={e => { setArea(e.target.value); setVisible(24); }}><option value="all">全部地区</option>{overview.areas.map(a => <option value={a} key={a}>{a}</option>)}</select><select aria-label="按事件类型筛选" value={category} onChange={e => { setCategory(e.target.value); setVisible(24); }}><option value="all">全部类型</option>{overview.categories.map(c => <option value={c} key={c}>{c}</option>)}</select><select aria-label="按起始年份筛选" value={year} onChange={e => { setYear(e.target.value); setVisible(24); }}><option value="all">起始年份</option>{overview.years.map(y => <option value={y} key={y}>{y}年</option>)}</select></div></div>
          <div className="timeline-result"><span role="status">{filtered ? `找到 ${entries.length} 个条目` : "循时间排列，从近代开端读起"}</span>{filtered && <button onClick={clear}><X size={12}/>重置筛选</button>}<span className="chronology-order">由早至晚 <ArrowDown size={12}/></span></div>
          <TimelinePlayer key={JSON.stringify([query, period, category, year, area])} entries={entries} allEntries={allEntries} />
          <div className="timeline-years">{years.map(y => <div className="timeline-year" key={y} id={`year-${y}`}><div className="timeline-year-label"><span>{y}</span><small>年</small></div><ol>{shown.filter(e => e.start_date.startsWith(y)).map(e => <li className="timeline-event" id={`event-${e.id}`} key={e.id}><span className="timeline-dot"/><div className="event-dateline"><time dateTime={e.start_date}>{e.date_label}</time>{e.date_precision === "year" ? <span>{/[春夏秋冬]/.test(e.date_label) ? "按季节记载" : "按年记载"}</span> : e.date_precision === "month" ? <span>按月记载</span> : null}</div><h3>{e.display_name}</h3><div className="event-context"><span>{e.category}</span><i/>{e.region}{e.parent_name && <span className="event-parent"><i/>{e.parent_name}</span>}</div></li>)}</ol></div>)}</div>
          {!entries.length && <div className="timeline-empty"><Search size={28}/><h3>当前筛选下暂无条目</h3><p>可以换一个名称、年份或年代再看看。</p><button className="text-button" onClick={clear}>查看当前全部收录 <ArrowRight size={14}/></button></div>}
          {visible < entries.length && <button ref={moreButton} className="timeline-more" onClick={() => setVisible(n => Math.min(n + 24, entries.length))}>继续阅读 <span>还有 {entries.length - visible} 个条目</span><ChevronDown size={16}/></button>}
          {!!entries.length && visible >= entries.length && <p className="timeline-end"><span/>已读至当前范围末尾<span/></p>}
          <p className="timeline-scope">战争、战役、具体战斗与相关事件分项收录；条目数量不等于战争次数。前台仅展示编目字段，核对资料另行保存。</p>
        </div>
      </div>
    </section>
  </>;
}
