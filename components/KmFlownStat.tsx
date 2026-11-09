"use client";

import { useEffect, useRef, useState } from "react";
import type { FlightStats } from "@/lib/flight-stats";

export default function KmFlownStat({ stats, locale }: { stats: FlightStats; locale: "mn" | "en" }) {
  const [value, setValue] = useState(stats.total_km);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const started = performance.now();
      const duration = 900;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(stats.total_km * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      setValue(0);
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [stats.total_km]);

  const number = new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", { maximumFractionDigits: 0 }).format(value);
  const year = new Date(`${stats.as_of}T00:00:00Z`).getUTCFullYear();
  return (
    <section className="signature-stats" aria-label={locale === "mn" ? "Ниссэн зай" : "Flight distance statistics"}>
      <div className="signature-stats__inner" ref={element}>
        <p className="eyebrow">{locale === "mn" ? "НИЙТ НИСЭЛТ" : "OUR FLIGHT LOG"}</p>
        <strong className="signature-stats__number" aria-label={`${number} km`}>{number}</strong>
        <p className="signature-stats__label">{locale === "mn" ? `${year} оноос хойш ниссэн км` : `km flown since ${year}`}</p>
      </div>
    </section>
  );
}
