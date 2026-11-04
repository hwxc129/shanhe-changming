"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, Check, Flame, Play } from "lucide-react";
import HistoryTimeline from "./history-timeline";
import StoryJourney from "./story-journey";
import { ChinaCalendarStrip, FestivalMark, festivalStyle } from "./china-calendar";
import { useChinaDay } from "../hooks/use-china-day";
import { request, post, siteHref, backupSite, operationKey } from "../lib/api-client";
import { SITE_AUTHOR } from "../lib/site-meta";
import RocketTop from "./rocket-top";
import { isLocalOnly } from "../lib/api-client";

type Stats = { today_count: number; total_count: number; business_date: string; as_of: string };
type Me = { browser_total_count: number; ready: boolean; today_state: string; can_light: boolean; business_date: string; next_reset_at: string };
export function Brand() { return <a className="brand" href={siteHref("/")} aria-label="山河长明 首页"><span className="brand-mark"><img src={siteHref("/art/candle-mark.svg")} width="18" height="26" alt="" /></span><span>山河长明<span className="brand-caption">铭记历史 · 致敬英雄</span></span></a>; }
export function Footer() {
  return <footer className="site-footer">
    <Brand />
    <div className="footer-credit"><span>作者：{SITE_AUTHOR}</span><p>以微光寄思念，以铭记守和平。</p></div>
    <nav aria-label="页尾导航"><a href={siteHref("/festivals/")}>中国节日</a><a href={siteHref("/share/")}>分享与部署</a><a href={siteHref("/feedback/")}>意见反馈</a><a href={siteHref("/about/")}>收录与核对</a><a href={siteHref("/privacy/")}>隐私说明</a></nav>
  </footer>;
}
function Candle({ lit }: { lit: boolean }) { return <div className={`candle-scene ${lit ? "is-lit" : ""}`} aria-hidden="true"><div className="memorial-orbit orbit-one"/><div className="memorial-orbit orbit-two"/><div className="scene-mist"/><div className="candle-glow"/><div className="candle-flame"><div className="flame-core"/></div><div className="candle-sparks"><i/><i/><i/></div><div className="candle-wick"/><div className="candle-body"><div className="candle-top"/><i className="wax-drip drip-one"/><i className="wax-drip drip-two"/><span className="candle-engraving">长<br/>明</span></div><div className="candle-holder"/><div className="candle-ground"/><span className="scene-side-note">山河铭记 · 薪火长存</span></div>; }

export default function Memorial({ initialStats }: { initialStats: Stats | null }) {
  const day = useChinaDay();
  const festival = day?.theme;
  useEffect(() => {
    const hash = window.location.hash;
    if (!/^#[a-z][a-z0-9-]*$/.test(hash)) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" });
  }, []);
  const [stats, setStats] = useState(initialStats); const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const preparing = useRef(false);
  const refreshStats = useCallback(async () => { if (isLocalOnly) return; try { setStats(await request<Stats>("/api/v1/candles/stats")); } catch { /* Preserve the last confirmed snapshot. */ } }, []);
  const refreshMe = useCallback(async () => { const state = await request<Me>("/api/v1/candles/me"); setMe(state); return state; }, []);
  const prepare = useCallback(async () => {
    if (preparing.current) return;
    preparing.current = true;
    async function initialize() {
      let state = await request<Me>("/api/v1/candles/me");
      if (!state.ready) { await post("/api/v1/visitors"); state = await request<Me>("/api/v1/candles/me"); }
      if (!state.ready) throw new Error("无法保存每日状态，请允许本站必要的浏览器存储后重试。"); setMe(state);
    }
    try { if (navigator.locks) await navigator.locks.request("shanhe-visitor", initialize); else await initialize(); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { preparing.current = false; }
  }, []);
  useEffect(() => { void prepare(); void refreshStats(); }, [prepare, refreshStats]);
  useEffect(() => {
    const onFocus = () => { if (!document.hidden) { if (!me?.ready) void prepare(); else void refreshMe().catch(() => {}); void refreshStats(); } };
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("shanhe-candle") : null;
    if (channel) channel.onmessage = onFocus;
    const timer = setInterval(onFocus, 30_000); window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus);
    const onOnline = () => { void prepare(); void refreshStats(); };
    window.addEventListener("online", onOnline);
    return () => { clearInterval(timer); channel?.close(); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("online", onOnline); };
  }, [refreshMe, refreshStats, prepare, me?.ready]);
  useEffect(() => { if (!me?.next_reset_at) return; const delay = Math.max(100, Date.parse(me.next_reset_at) - Date.now() + 500); const timer = setTimeout(() => { setNotice(""); pending.current = null; void refreshMe().catch(() => {}); void refreshStats(); }, delay); return () => clearTimeout(timer); }, [me?.next_reset_at, refreshMe, refreshStats]);
  const light = async () => {
    if (busy) return; if (!me?.ready) { await prepare(); return; } if (!me.can_light) return;
    setBusy(true); setError("");
    try {
      pending.current ??= operationKey();
      const result = await post("/api/v1/candles", { idempotency_key: pending.current });
      const confirmed = await refreshMe();
      if (result.state !== "valid") throw new Error("今日暂无法参与，请稍后再来。");
      setNotice(confirmed.today_state === "lit" ? "一烛微光，寄予敬意。感谢你的铭记。" : "已确认上次点烛记录，今天仍可再次参与。");
      pending.current = null; await refreshStats();
      if (typeof BroadcastChannel === "function") { const c = new BroadcastChannel("shanhe-candle"); c.postMessage("lit"); c.close(); }
    } catch (e) {
      try { const confirmed = await refreshMe(); if (confirmed.today_state === "lit") { pending.current = null; setNotice("今日已点亮，敬意已被记录。"); await refreshStats(); } else setError((e as Error).message); }
      catch { setError("暂时无法确认结果，请稍后重试；同一次操作不会重复计数。"); }
    } finally { setBusy(false); }
  };
  const isLit = me?.today_state === "lit";
  const buttonLabel = busy ? "正在点亮" : isLit ? "今日已点亮" : me?.today_state === "unavailable" ? "今日暂无法参与" : "点亮一支蜡烛";
  return <div className={festival ? "memorial-page festival-active" : "memorial-page"} style={festivalStyle(festival)}>
    <a className="skip-link" href="#events">跳到事件目录</a>
    <header className="site-header"><Brand /><nav className="memorial-nav" aria-label="主导航"><a href="#stories" aria-label="历史故事"><span className="nav-prefix">历史</span>故事</a><a href="#events" aria-label="历史时间线"><span className="nav-prefix">历史</span>时间线</a><a href={siteHref("/festivals/")}>节日</a></nav><span className="header-note">心怀敬意 · 珍爱和平</span></header>
    <ChinaCalendarStrip day={day} />
    <main>
      <section className="hero" id="memorial" aria-labelledby="hero-title">
        <img className="hero-scenery" src={siteHref("/art/backgrounds/mountain-dawn.jpg")} width="1680" height="946" alt="" fetchPriority="high" />
        <div className="hero-vignette"/>
        <div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span/>铭记来路 · 守望和平</div><h1 id="hero-title">山河长明<span>致敬英雄</span></h1><p className="hero-description">致敬中国历史上的英雄，<br/>缅怀为国家和人民作出牺牲的人们。</p>
          <div className="candle-action"><button className={`light-button ${isLit ? "completed" : ""}`} onClick={light} disabled={busy || !me?.ready || !me.can_light}>{isLit ? <Check size={18}/> : <Flame size={19} strokeWidth={1.5}/>}<span>{buttonLabel}</span>{!isLit && <ArrowRight size={17}/>}</button><span className="action-caption">每日一烛，寄托思念</span></div>
          <p className={`candle-feedback ${error ? "has-error" : ""}`} role="status" aria-live="polite">{error || notice || (isLit ? "你的敬意已被记录，明日可再次点亮。" : "无需登录 · 同一浏览器每天一次")}{error && <><button className="text-button" onClick={() => { void prepare(); void refreshStats(); }}>重新连接</button><a className="text-button" href={backupSite} target="_blank" rel="noopener noreferrer">备用站点</a></>}</p>
          <div className={`memorial-stats ${isLocalOnly ? "local-stats" : ""}`} aria-label="点烛统计">
            {!isLocalOnly && <><div><span className="stat-value">{stats ? stats.today_count.toLocaleString("zh-CN") : "—"}</span><span>今日点亮<span className="stat-unit"> / 次</span></span></div><div><span className="stat-value">{stats ? stats.total_count.toLocaleString("zh-CN") : "—"}</span><span>全站累计<span className="stat-unit"> / 次</span></span></div></>}
            <div className="personal-checkins"><span className="stat-value">{typeof me?.browser_total_count === "number" ? me.browser_total_count.toLocaleString("zh-CN") : "—"}</span><span>本浏览器打卡<span className="stat-unit"> / 次</span></span></div>
            <p>{isLocalOnly ? "记录仅在本浏览器保存，清除数据后重置。" : "按当前浏览器记录，清除数据后重新计算。"}</p>
          </div>
          <div className="hero-reading-links">
            <a className="hero-player-link" href="#stories"><BookOpen size={15} aria-hidden="true" /> 阅读历史故事</a>
            <a className="hero-player-link" href="#timeline-player"><Play size={14} aria-hidden="true" /> 历史展映 <ArrowRight size={14} aria-hidden="true" /></a>
            <a className="hero-player-link" href={siteHref("/share/")}>分享与部署 <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          {festival && <a className="hero-festival-link" href={siteHref("/festivals/")}>
            <FestivalMark motif={festival.motif} /> <span>{day?.festivals.map(item => item.name).join(" · ")}</span> <ArrowRight size={14} aria-hidden="true" />
          </a>}
        </div><div className="hero-art"><Candle lit={!!isLit}/><span className="art-caption"><span/> 一烛微光，山河共念 <span/></span></div></div>
        <a className="scroll-note" href="#stories"><span>向下 · 循时铭记</span><ArrowDown size={14}/></a>
        <span className="hero-coordinate">以铭记，致敬不朽。</span>
      </section>
      <StoryJourney />
      <HistoryTimeline />
      <section className="closing"><Flame size={21} strokeWidth={1}/><span>写给所有中国年轻人</span><p>铭记历史</p><span>作者：{SITE_AUTHOR}</span><a href="#memorial">回到纪念区 <ArrowRight size={14}/></a></section>
    </main><Footer />
    <RocketTop />
  </div>;
}
