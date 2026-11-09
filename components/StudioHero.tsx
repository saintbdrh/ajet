"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function StudioHero({ locale }: { locale: Locale }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);
  useEffect(() => {
    const element = video.current; if (!element) return;
    element.playbackRate = 0.65;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { element.pause(); setPlaying(false); };
    const change = () => { if (media.matches) stop(); };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || media.matches || document.hidden) stop();
      else if (!userPaused.current) void element.play().catch(() => setPlaying(false));
    });
    const visibility = () => { if (document.hidden) stop(); };
    observer.observe(element); media.addEventListener("change", change); document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); media.removeEventListener("change", change); document.removeEventListener("visibilitychange", visibility); element.pause(); };
  }, []);
  return <><video ref={video} className="brand-hero__studio-film" loop muted playsInline preload="metadata" poster="/img/ajet-hero-production.webp" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label={locale === "mn" ? "EC145 студийн удаан тойрон харах бичлэг" : "A slow studio portrait of the EC145"}>
    <source src="/films/ajet-hero-production.mp4" type="video/mp4" />
  </video><button className="hero-film-control" type="button" onClick={() => { if (!video.current) return; if (playing) { userPaused.current=true; video.current.pause(); } else { userPaused.current=false; void video.current.play().catch(() => setPlaying(false)); } }}>{playing ? (locale === "mn" ? "Түр зогсоох Ⅱ" : "Pause film Ⅱ") : (locale === "mn" ? "Бичлэг үзэх ▷" : "Play film ▷")}</button></>;
}
