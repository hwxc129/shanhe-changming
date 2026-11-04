"use client";

import { useEffect, useRef, useState } from "react";
import { siteHref } from "../lib/api-client";

export default function RocketTop() {
  const [launching, setLaunching] = useState(false);
  const visualRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<(() => void) | null>(null);

  useEffect(() => () => flightRef.current?.(), []);

  function goTop() {
    if (flightRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    const visual = visualRef.current;
    if (!visual) return;
    const startScroll = window.scrollY;
    const travel = visual.getBoundingClientRect().top + visual.offsetHeight + 80;
    const duration = Math.min(3200, 2400 + startScroll * .035);
    const started = performance.now();
    let frame = 0;
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReducedMotion);
      visual!.removeAttribute("style");
      visual!.removeAttribute("data-flight-phase");
      flightRef.current = null;
      setLaunching(false);
    }
    function cancel() { finish(); }
    function onKey(event: KeyboardEvent) {
      if (["Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) finish();
    }
    function onVisibility() { if (document.hidden) finish(); }
    function onReducedMotion() {
      if (reduced.matches) { finish(); window.scrollTo({ top: 0, behavior: "instant" }); }
    }
    function animate(now: number) {
      if (finished) return;
      const elapsed = Math.min(1, (now - started) / duration);
      const height = Math.pow(elapsed, 1.65);
      visual!.style.setProperty("--flight-y", `${-travel * height}px`);
      visual!.style.setProperty("--flight-x", `${-18 * height}px`);
      visual!.style.setProperty("--flight-scale", `${1 - .58 * height}`);
      visual!.style.setProperty("--flight-opacity", `${Math.min(1, (1 - elapsed) * 10)}`);
      visual!.style.setProperty("--engine-scale", `${.7 + Math.sin(elapsed * Math.PI) * 1.15}`);
      visual!.style.setProperty("--engine-brightness", `${1 + height * .6}`);
      visual!.style.setProperty("--trail-scale", `${.25 + height * 1.65}`);
      visual!.style.setProperty("--trail-opacity", `${.55 * (1 - height)}`);
      visual!.dataset.flightPhase = height < .15 ? "ignition" : height < .65 ? "climb" : "high";
      window.scrollTo({ top: startScroll * (1 - height), behavior: "instant" });
      if (elapsed < 1) frame = window.requestAnimationFrame(animate);
      else { window.scrollTo({ top: 0, behavior: "instant" }); finish(); }
    }
    flightRef.current = finish;
    setLaunching(true);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onReducedMotion);
    frame = window.requestAnimationFrame(animate);
  }

  return <button type="button" className={`rocket-top ${launching ? "is-launching" : ""}`} onClick={goTop}
    disabled={launching} aria-busy={launching} aria-label="火箭升空并回到顶部" title="回到顶部 · AI写实火箭示意">
    <span className="rocket-visual" ref={visualRef} aria-hidden="true">
      <span className="rocket-trail" />
      <img src={siteHref("/art/rocket/rocket-poster.png")} width="480" height="800" alt="" decoding="async" />
      <span className="rocket-engine" />
    </span>
    <span className="rocket-caption">回到顶部</span>
  </button>;
}
