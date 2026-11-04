"use client";

import { useEffect, useRef, useState } from "react";

const models = [
  { name: "东风一号", label: "1960 · 首枚国产地地导弹", variant: "first" },
  { name: "东风二号", label: "1964 · 自主研制节点", variant: "second" },
  { name: "东风-41", label: "2019 · 国庆阅兵公开亮相", variant: "modern" },
  { name: "东风-61", label: "2025 · 九三阅兵公开亮相", variant: "latest" },
];

export default function RocketTop() {
  const [stage, setStage] = useState(0);
  const [launching, setLaunching] = useState(false);
  const flightTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const length = document.documentElement.scrollHeight - window.innerHeight;
      const progress = length > 0 ? window.scrollY / length : 0;
      setStage(Math.min(models.length - 1, Math.floor(Math.max(0, progress) * models.length)));
    }
    function schedule() { if (!frame) frame = window.requestAnimationFrame(update); }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(flightTimer.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, []);

  function goTop() {
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    window.clearTimeout(flightTimer.current);
    flightTimer.current = window.setTimeout(() => setLaunching(false), 750);
  }

  const model = models[stage];
  return <button type="button" className={`rocket-top ${launching ? "is-launching" : ""}`} onClick={goTop}
    aria-label={`回到顶部，${model.name}主题图标`} title={`${model.name} · ${model.label} · 回到顶部`}>
    <svg viewBox="0 0 48 72" aria-hidden="true" className={`rocket-icon rocket-${model.variant}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path className="rocket-exhaust" d="m19 58 5 11 5-11" fill="currentColor" fillOpacity=".55" />
      <path d="M18 22 24 5l6 17v34H18V22Z" fill="currentColor" fillOpacity=".13" />
      <path d="M18 22h12M18 50h12M24 28v9" />
      {stage < 2 ? <path d="m18 43-8 15h8m12-15 8 15h-8" fill="currentColor" fillOpacity=".2" /> : <path d="m18 47-5 11h5m12-11 5 11h-5M16 39h2m12 0h2" />}
      {stage === 1 && <path d="M21 16h6M21 53h6" />}
      {stage >= 2 && <path d="M20 14h8M21 42h6M21 46h6" />}
      {stage === 3 && <path d="M22 11h4M20 24h8" />}
    </svg>
    <span>回到顶部</span><small>{model.name}</small>
  </button>;
}
