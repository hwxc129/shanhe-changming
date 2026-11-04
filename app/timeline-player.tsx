"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { PublicEvent } from "../lib/catalog";
import { siteHref } from "../lib/api-client";

type Playback = {
  index: number;
  status: "idle" | "playing" | "paused" | "finished";
};

export default function TimelinePlayer({ entries }: { entries: PublicEvent[] }) {
  const [playback, setPlayback] = useState<Playback>({ index: 0, status: "idle" });
  const [seconds, setSeconds] = useState(8);
  const [sound, setSound] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { index, status } = playback;
  const playing = status === "playing";
  const event = status === "idle" ? undefined : entries[index];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setPlayback(current => {
        if (current.status !== "playing") return current;
        if (current.index === entries.length - 1) return { ...current, status: "finished" };
        return { index: current.index + 1, status: "playing" };
      });
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [entries.length, index, playing, seconds]);

  useEffect(() => {
    if (!playing) audioRef.current?.pause();
  }, [playing]);

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
    if (status === "finished" && audioRef.current) audioRef.current.currentTime = 0;
    if (sound) playMusic();
    setPlayback({ index: status === "finished" ? 0 : index, status: "playing" });
  }

  function move(step: number) {
    setPlayback(current => ({
      index: Math.min(entries.length - 1, Math.max(0, current.index + step)),
      status: current.status === "playing" ? "playing" : "paused",
    }));
  }

  function toggleSound() {
    if (sound) audioRef.current?.pause();
    else if (playing) playMusic();
    setSound(!sound);
  }

  const playLabel = { idle: "开始播放", playing: "暂停", paused: "继续播放", finished: "重新播放" }[status];

  return <section id="timeline-player" className="timeline-player" aria-labelledby="player-title">
    <div className="player-top">
      <h3 id="player-title">历史展映</h3>
      <span className="player-count" aria-label={`第 ${event ? index + 1 : 0} 条，共 ${entries.length} 条`}>
        {event ? String(index + 1).padStart(3, "0") : "—"} / {entries.length}
      </span>
    </div>
    <div className="player-stage" aria-live="polite" aria-atomic="true">
      {event ? <div className="player-reveal" key={event.id}>
        <time dateTime={event.start_date}>{event.date_label}</time>
        <h4>{event.display_name}</h4>
        <p>{event.category} · {event.region}</p>
      </div> : <div>
        <h4>{entries.length ? "循时铭记" : "当前范围暂无条目"}</h4>
        <p>{entries.length ? "随时间逐条阅读当前目录" : "调整筛选后即可播放"}</p>
      </div>}
    </div>
    <progress className="player-progress" aria-label="展映进度" value={event ? index + 1 : 0} max={entries.length || 1} />
    <div className="player-controls">
      <div className="player-transport">
        <button type="button" aria-label="上一条" onClick={() => move(-1)} disabled={!event || index === 0}><ArrowLeft size={16} aria-hidden="true" /></button>
        <button type="button" className="player-play" onClick={togglePlayback} disabled={!entries.length}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {playLabel}
        </button>
        <button type="button" aria-label="下一条" onClick={() => move(1)} disabled={!event || index >= entries.length - 1}><ArrowRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="player-settings">
        <select aria-label="每条停留时间" value={seconds} onChange={e => setSeconds(Number(e.target.value))}>
          <option value={5}>每条 5 秒</option>
          <option value={8}>每条 8 秒</option>
          <option value={12}>每条 12 秒</option>
        </select>
        <button type="button" onClick={toggleSound} aria-label={sound ? "关闭配乐" : "开启配乐"}>
          {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          <span>{sound ? "配乐开启" : "配乐关闭"}</span>
        </button>
      </div>
    </div>
    <p className="player-credit">配乐《山河长明》 · 原创中式纪念纯音乐</p>
    {audioError && <p className="player-credit" role="status">配乐暂时无法播放，可点击开启配乐重试。</p>}
    <audio ref={audioRef} src={siteHref("/audio/shanhe-changming.mp3")} preload="none" loop />
  </section>;
}
