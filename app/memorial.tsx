"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Flame, Play } from "lucide-react";
import HistoryTimeline from "./history-timeline";
import { request, post, siteHref, backupSite } from "../lib/api-client";

type Stats = { today_count: number; total_count: number; business_date: string; as_of: string };
type Me = { ready: boolean; today_state: string; can_light: boolean; business_date: string; next_reset_at: string };
export function Brand() { return <a className="brand" href={siteHref("/")} aria-label="山河长明 首页"><span className="brand-mark"><Flame size={19} strokeWidth={1.2} /></span><span>山河长明<span className="brand-caption">铭记历史 · 致敬英雄</span></span></a>; }
export function Footer() { return <footer className="site-footer"><Brand /><p>以微光寄思念，以铭记守和平。</p><div><a href={siteHref("/about/")}>收录与核对</a><a href={siteHref("/privacy/")}>隐私说明</a></div></footer>; }
function MountainScene() { return <svg className="mountains" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mountain-fade" x2="0" y2="1"><stop stopColor="#807052" stopOpacity=".2"/><stop offset="1" stopColor="#11130f" stopOpacity="0"/></linearGradient></defs><path fill="url(#mountain-fade)" d="M0 220 80 198 146 238 232 132 270 148 350 105 410 174 480 145 570 234 638 183 720 242 804 147 870 165 940 80 1020 136 1082 119 1170 192 1234 154 1320 224 1392 115 1470 158 1530 130 1600 204V500H0Z"/><path fill="#20251b" fillOpacity=".57" d="m0 304 113-58 72 30 97-55 80 66 92-11 109 60 108-50 79 62 110-34 91 25 91-76 115 59 104-29 86 46 107-20 145 17V500H0Z"/><path fill="#151a12" d="M0 413 175 369 290 398 417 343 559 404 706 377 867 412 1017 357 1152 409 1300 368 1420 397 1600 350V500H0Z"/></svg>; }
function Candle({ lit }: { lit: boolean }) { return <div className={`candle-scene ${lit ? "is-lit" : ""}`} aria-hidden="true"><div className="memorial-orbit orbit-one"/><div className="memorial-orbit orbit-two"/><div className="scene-mist"/><div className="candle-glow"/><div className="candle-flame"><div className="flame-core"/></div><div className="candle-wick"/><div className="candle-body"><div className="candle-top"/><i className="wax-drip drip-one"/><i className="wax-drip drip-two"/><span className="candle-engraving">长<br/>明</span></div><div className="candle-holder"/><div className="candle-ground"/><span className="scene-side-note">山河铭记 · 薪火长存</span></div>; }

export default function Memorial({ initialStats }: { initialStats: Stats | null }) {
  const [stats, setStats] = useState(initialStats); const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const preparing = useRef(false);
  const refreshStats = useCallback(async () => { try { setStats(await request<Stats>("/api/v1/candles/stats")); } catch { /* Preserve the last confirmed snapshot. */ } }, []);
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
      pending.current ??= crypto.randomUUID();
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
  return <>
    <a className="skip-link" href="#events">跳到事件目录</a>
    <header className="site-header"><Brand /><nav aria-label="主导航"><a className="active" href="#memorial">纪念</a><a href="#events">历史时间线</a><a href={siteHref("/about/")}>关于本站</a></nav><span className="header-note">心怀敬意 · 珍爱和平</span></header>
    <main>
      <section className="hero" id="memorial" aria-labelledby="hero-title">
        <div className="hero-vignette"/><MountainScene />
        <div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span/>铭记来路 · 守望和平</div><h1 id="hero-title">山河长明<span>致敬英雄</span></h1><p className="hero-description">致敬中国历史上的英雄，<br/>缅怀为国家和人民作出牺牲的人们。</p>
          <div className="candle-action"><button className={`light-button ${isLit ? "completed" : ""}`} onClick={light} disabled={busy || !me?.ready || !me.can_light}>{isLit ? <Check size={18}/> : <Flame size={19} strokeWidth={1.5}/>}<span>{buttonLabel}</span>{!isLit && <ArrowRight size={17}/>}</button><span className="action-caption">每日一烛，寄托思念</span></div>
          <p className={`candle-feedback ${error ? "has-error" : ""}`} role="status" aria-live="polite">{error || notice || (isLit ? "你的敬意已被记录，明日可再次点亮。" : "无需登录 · 同一浏览器每天一次")}{error && <><button className="text-button" onClick={() => { void prepare(); void refreshStats(); }}>重新连接</button><a className="text-button" href={backupSite} target="_blank" rel="noopener noreferrer">备用站点</a></>}</p>
          <div className="memorial-stats" aria-label="点烛统计"><div><span className="stat-value">{stats ? stats.today_count.toLocaleString("zh-CN") : "—"}</span><span>今日点亮<span className="stat-unit"> / 次</span></span></div><div><span className="stat-value">{stats ? stats.total_count.toLocaleString("zh-CN") : "—"}</span><span>累计点亮<span className="stat-unit"> / 次</span></span></div><p>{import.meta.env.DEV ? "本地预览数据，与公网独立。" : "每一份敬意，都值得被记得。"}</p></div>
          <a className="hero-player-link" href="#timeline-player"><Play size={14} aria-hidden="true" /> 历史展映 <ArrowRight size={14} aria-hidden="true" /></a>
        </div><div className="hero-art"><Candle lit={!!isLit}/><span className="art-caption"><span/> 一烛微光，山河共念 <span/></span></div></div>
        <a className="scroll-note" href="#journey"><span>向下 · 循时铭记</span><ArrowDown size={14}/></a>
        <span className="hero-coordinate">以铭记，致敬不朽。</span>
      </section>
      <HistoryTimeline />
      <section className="closing"><Flame size={21} strokeWidth={1}/><p>山河无恙，吾辈自强。</p><span>让铭记成为日常，让和平走向长远。</span><a href="#memorial">回到纪念区 <ArrowRight size={14}/></a></section>
    </main><Footer />
  </>;
}
