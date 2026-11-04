"use client";

import { useEffect, useRef, useState } from "react";
import { siteHref } from "../lib/api-client";

export default function RocketTop() {
  const [launching, setLaunching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flightTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    const suspend = () => { if (document.hidden) { video?.pause(); setLaunching(false); } };
    document.addEventListener("visibilitychange", suspend);
    return () => { window.clearTimeout(flightTimer.current); video?.pause(); document.removeEventListener("visibilitychange", suspend); };
  }, []);

  function finish() { window.clearTimeout(flightTimer.current); videoRef.current?.pause(); setLaunching(false); }
  function goTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
    window.clearTimeout(flightTimer.current);
    if (reduced) { videoRef.current?.pause(); setLaunching(false); return; }
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(error => { if (error.name !== "AbortError") finish(); });
    flightTimer.current = window.setTimeout(finish, 4000);
  }

  return <button type="button" className={`rocket-top ${launching ? "is-launching" : ""}`} onClick={goTop}
    aria-label="播放火箭升空短片并回到顶部" title="回到顶部 · AI生成写实火箭示意">
    <span className="rocket-visual" aria-hidden="true">
      <img src={siteHref("/art/rocket/rocket-poster.png")} width="480" height="800" alt="" decoding="async" />
      <video ref={videoRef} muted playsInline preload="none" disablePictureInPicture onPlaying={() => setLaunching(true)} onEnded={finish} onError={finish}>
        <source src={siteHref("/art/rocket/rocket-liftoff.webm")} type="video/webm" />
        <source src={siteHref("/art/rocket/rocket-liftoff.mp4")} type="video/mp4" />
      </video>
    </span>
    <span className="rocket-caption">回到顶部</span>
  </button>;
}
