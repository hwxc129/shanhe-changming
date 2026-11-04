"use client";

import { useEffect, useState } from "react";
import { chinaDay } from "../lib/festivals";
import { nextDayResetAt } from "../lib/rules";

export function useChinaDay() {
  const [day, setDay] = useState<ReturnType<typeof chinaDay> | null>(null);
  useEffect(() => {
    let timer: number;
    function refresh() {
      const now = Date.now();
      const current = chinaDay(now);
      setDay(previous => previous?.key === current.key ? previous : current);
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, Date.parse(nextDayResetAt(now)) - now + 80);
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
