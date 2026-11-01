"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function HelicopterHero({ locale }: { locale: Locale }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(preference.matches);
      if (preference.matches) { video.current?.pause(); setPlaying(false); }
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!reduced) void video.current?.play().catch(() => setPlaying(false));
  }, [reduced]);

  return <>
    <div className="helicopter-film" aria-hidden="true">
      <img src="/img/ajet-hero-poster.png" alt="" fetchPriority="high" />
      {!reduced && <video ref={video} src="/films/ajet-hero.mp4#t=2.3" poster="/img/ajet-hero-poster.png" muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
    </div>
    <div className="hero-film-label"><span className="live-dot" /> AJET <span>—</span> {locale === "mn" ? "ШИНЭ ӨНЦӨГ" : "A DIFFERENT PERSPECTIVE"}</div>
    {!reduced && <button className="film-control" type="button" aria-label={playing ? (locale === "mn" ? "Дүрсийг түр зогсоох" : "Pause film") : (locale === "mn" ? "Дүрс тоглуулах" : "Play film")} onClick={() => {
      if (playing) video.current?.pause();
      else void video.current?.play().catch(() => setPlaying(false));
    }}>{playing ? "Ⅱ" : "▷"}</button>}
  </>;
}
