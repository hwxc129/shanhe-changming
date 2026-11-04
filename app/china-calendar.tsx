"use client";

import type { CSSProperties } from "react";
import { ArrowRight, CalendarDays, Flag, Flame, Flower2, Landmark, Snowflake, Sparkles, Sprout, Sunrise, Wheat } from "lucide-react";
import { siteHref } from "../lib/api-client";
import type { Festival, chinaDay } from "../lib/festivals";

const icons = { flag: Flag, flame: Flame, flower: Flower2, monument: Landmark, snow: Snowflake, stars: Sparkles, sprout: Sprout, sun: Sunrise, grain: Wheat };

export function festivalStyle(festival: Festival | undefined) {
  return festival && {
    "--festival-accent": festival.accent,
    "--festival-surface": festival.surface,
  } as CSSProperties;
}

export function FestivalMark({ motif }: { motif: Festival["motif"] }) {
  if (motif === "lantern" || motif === "moon" || motif === "boat") {
    return <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {motif === "lantern" && <>
        <path d="M60 11v12M38 24h44M38 77h44M60 78v30M54 94v10m12-10v10" strokeLinecap="round" />
        <path d="M42 25C15 36 15 66 42 76h36c27-10 27-40 0-51H42Z" fill="currentColor" fillOpacity=".14" />
        <path d="M48 25c-14 14-14 37 0 51m24-51c14 14 14 37 0 51M60 25v51" />
      </>}
      {motif === "moon" && <>
        <circle cx="61" cy="47" r="30" fill="currentColor" fillOpacity=".24" />
        <path d="M13 79h44m-30 9h57m-67 11h86m-37-24h41M97 28h12m-6-6v12" strokeLinecap="round" />
      </>}
      {motif === "boat" && <>
        <path d="M15 71c28 13 56 13 84-2l-10 14c-24 11-48 12-66 0l-8-12Z" fill="currentColor" fillOpacity=".14" />
        <path d="M60 73V25l30 40H60M15 100c10-5 18 5 27 0s18 5 27 0 18 5 27 0" strokeLinecap="round" />
      </>}
    </svg>;
  }
  const Icon = icons[motif];
  return <Icon strokeWidth={1.15} aria-hidden="true" />;
}

export function ChinaCalendarStrip({ day, onFestivalPage = false }: { day: ReturnType<typeof chinaDay> | null; onFestivalPage?: boolean }) {
  return <div className="china-calendar">
    <div className="china-calendar-inner">
      <div className="china-calendar-date">
        <CalendarDays size={15} aria-hidden="true" />
        <span className="china-calendar-label">北京时间</span>
        {day && <><time dateTime={day.key}>{day.label}</time><span className="china-calendar-lunar">{day.lunarLabel}</span></>}
      </div>
      <div className="china-calendar-links">
        {!!day?.festivals.length && <span className="china-calendar-festival">{day.festivals.map(festival => festival.name).join(" · ")}</span>}
        {!onFestivalPage && <a href={siteHref("/festivals/")}>中国节日 <ArrowRight size={13} aria-hidden="true" /></a>}
      </div>
    </div>
  </div>;
}
