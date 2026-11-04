"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { PublicEvent } from "../lib/catalog";
import { siteHref } from "../lib/api-client";
import { SITE_AUTHOR } from "../lib/site-meta";
import { useChinaDay } from "../hooks/use-china-day";
import { festivalStyle } from "./china-calendar";

type Playback = { index: number; status: "idle" | "playing" | "paused" | "finished" };

export default function TimelinePlayer({ entries, allEntries = entries }: { entries: PublicEvent[]; allEntries?: PublicEvent[] }) {
  const [playback, setPlayback] = useState<Playback>({ index: 0, status: "idle" });
  const [presenting, setPresenting] = useState(false);
  const [scope, setScope] = useState("all");
  const [seconds, setSeconds] = useState(8);
  const [sound, setSound] = useState(true);
  const [volume, setVolume] = useState(40);
  const [audioError, setAudioError] = useState(false);
  const day = useChinaDay();
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);
  const selected = scope === "all" ? allEntries : entries;
  const { index, status } = playback;
  const playing = status === "playing";
  const finished = status === "finished";
  const event = status === "idle" ? undefined : selected[index];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setPlayback(current => {
        if (current.status !== "playing") return current;
        if (current.index === selected.length - 1) return { ...current, status: "finished" };
        return { index: current.index + 1, status: "playing" };
      });
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [selected.length, index, playing, seconds]);

  useEffect(() => { if (!playing) audioRef.current?.pause(); }, [playing]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  useEffect(() => {
    if (!presenting) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>(".slide-close")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      launchRef.current?.focus({ preventScroll: true });
    };
  }, [presenting]);

  useEffect(() => {
    const audio = audioRef.current;
    const suspend = () => {
      audio?.pause();
      setPlayback(current => current.status === "playing" ? { ...current, status: "paused" } : current);
    };
    const onVisibilityChange = () => { if (document.hidden) suspend(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", suspend);
    return () => {
      audio?.pause();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", suspend);
    };
  }, []);

  function playMusic() {
    setAudioError(false);
    void audioRef.current?.play().catch((error: DOMException) => {
      if (error.name === "AbortError") return;
      setSound(false);
      setAudioError(true);
    });
  }

  function togglePlayback() {
    if (playing) {
      audioRef.current?.pause();
      setPlayback({ index, status: "paused" });
      return;
    }
    if (!selected.length) return;
    if (finished && audioRef.current) audioRef.current.currentTime = 0;
    if (sound) playMusic();
    setPlayback({ index: finished ? 0 : index, status: "playing" });
  }

  function launch() {
    setPresenting(true);
    togglePlayback();
  }

  function close() {
    audioRef.current?.pause();
    setPlayback(current => current.status === "playing" ? { ...current, status: "paused" } : current);
    setPresenting(false);
  }

  function move(step: number) {
    setPlayback(current => ({
      index: Math.min(selected.length - 1, Math.max(0, current.index + step)),
      status: current.status === "playing" ? "playing" : "paused",
    }));
  }

  function toggleSound() {
    if (sound) audioRef.current?.pause();
    else if (playing) playMusic();
    setSound(!sound);
  }

  function onDialogKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select, input");
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const playLabel = { idle: "开始播放", playing: "暂停", paused: "继续播放", finished: "重新播放" }[status];

  function controls() {
    return <div className="player-controls">
      <div className="player-transport">
        <button type="button" aria-label="上一条" onClick={() => move(-1)} disabled={!event || index === 0}><ArrowLeft size={17} aria-hidden="true" /></button>
        <button type="button" className="player-play" onClick={togglePlayback} disabled={!selected.length}>
          {playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{playLabel}
        </button>
        <button type="button" aria-label="下一条" onClick={() => move(1)} disabled={!event || index >= selected.length - 1}><ArrowRight size={17} aria-hidden="true" /></button>
      </div>
      <div className="player-settings">
        <select aria-label="每条停留时间" value={seconds} onChange={e => setSeconds(Number(e.target.value))}>
          <option value={5}>每条 5 秒</option><option value={8}>每条 8 秒</option><option value={12}>每条 12 秒</option>
        </select>
        <button type="button" onClick={toggleSound} aria-label={sound ? "关闭配乐" : "开启配乐"}>
          {sound ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}<span>{sound ? "配乐开启" : "配乐关闭"}</span>
        </button>
        <label className="player-volume"><span>音量</span><input aria-label="配乐音量" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
      </div>
    </div>;
  }

  return <section id="timeline-player" className="timeline-player" aria-labelledby="player-title">
    <div className="player-top"><h3 id="player-title">历史幻灯展映</h3><span className="player-count">{selected.length} 个已核条目</span></div>
    <div className="player-stage">
      <div><h4>让历史，一页一页展开</h4><p>从1840年到新中国成立，随原创配乐逐条回望。</p></div>
    </div>
    <div className="player-inline-actions">
      {entries.length !== allEntries.length && <select aria-label="展映范围" value={scope} onChange={e => {
        audioRef.current?.pause(); setScope(e.target.value); setPlayback({ index: 0, status: "idle" });
      }}><option value="all">全部 {allEntries.length} 条</option><option value="filtered">当前筛选 {entries.length} 条</option></select>}
      <button type="button" ref={launchRef} className="player-launch" onClick={launch} disabled={!selected.length}><Play size={17} aria-hidden="true" />{finished ? "重新播放" : status === "paused" ? "继续展映" : "开始播放"}</button>
      <span>配乐《山河长明》 · 原创纪念组曲</span>
    </div>
    <audio ref={audioRef} src={siteHref("/audio/shanhe-changming.mp3")} preload="none" loop />
    {presenting && createPortal(<div className="history-slideshow" style={festivalStyle(day?.theme)} role="dialog" aria-modal="true" aria-labelledby="slide-title" ref={dialogRef} onKeyDown={onDialogKey}>
      <div className="slide-scenery" aria-hidden="true" />
      <header className="slide-header"><span>山河长明 · 历史展映</span><button type="button" className="slide-close" aria-label="关闭幻灯展映" onClick={close}><X size={22} aria-hidden="true" /></button></header>
      <div className="slide-stage" aria-live="polite" aria-atomic="true">
        {finished ? <div className="slide-ending player-reveal">
          <Check size={25} aria-hidden="true" /><p>写给所有中国年轻人</p><h2 id="slide-title">铭记历史</h2><span>作者：{SITE_AUTHOR}</span><small>本次展映已读完 {selected.length} 个条目</small>
        </div> : event && <article className="slide-event player-reveal" key={event.id}>
          <span className="slide-index">{String(index + 1).padStart(3, "0")} / {selected.length}</span>
          <time dateTime={event.start_date}>{event.date_label}</time>
          <h2 id="slide-title">{event.display_name}</h2>
          <p>{event.category} · {event.region}</p>
          {event.parent_name && <small>{event.parent_name}</small>}
        </article>}
      </div>
      <footer className="slide-footer">
        <progress className="player-progress" aria-label="展映进度" value={finished ? selected.length : event ? index + 1 : 0} max={selected.length || 1} />
        {controls()}
        <p className="player-credit">{audioError ? "配乐暂时无法播放，可点击开启配乐重试。" : "《山河长明》 · 原创中式纪念组曲"}</p>
      </footer>
    </div>, document.body)}
  </section>;
}
