"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n";
import type { StudioControls } from "@/components/StudioCanvas";

const StudioCanvas = dynamic(() => import("@/components/StudioCanvas"), { ssr: false });
const views = [
  { en: "Profile", mn: "Хажуу", angle: -Math.PI / 2 },
  { en: "Front", mn: "Урд", angle: Math.PI },
  { en: "Rear", mn: "Ард", angle: 0 },
] as const;

export default function AircraftPortrait({ locale }: { locale: Locale }) {
  const mn = locale === "mn";
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [film, setFilm] = useState(false);
  const [filmPlaying, setFilmPlaying] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<StudioControls | null>(null);
  const ready = useCallback(() => { setLoaded(true); setFailed(false); }, []);
  const error = useCallback(() => { setFailed(true); setActive(false); setLoaded(false); }, []);
  const interact = useCallback(() => { setPlaying(false); setPreset(null); }, []);

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); observer.disconnect(); }
    }, { rootMargin: "150px" });
    observer.observe(wrapper.current);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const changed = () => setFullscreen(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", changed);
    return () => { observer.disconnect(); document.removeEventListener("fullscreenchange", changed); };
  }, []);

  useEffect(() => {
    if (!active || loaded) return;
    const timer = window.setTimeout(error, 45000);
    return () => window.clearTimeout(timer);
  }, [active, loaded, error]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapper.current?.requestFullscreen();
    } catch { /* Fullscreen may be unavailable on a mobile browser; the full model remains in frame. */ }
  }
  function toggleFilm() {
    setFilm((current) => !current); setPlaying(false);
    if (film) { video.current?.pause(); setFilmPlaying(false); }
  }
  function togglePlayback() {
    if (!film) { setPlaying((current) => !current); return; }
    if (!video.current) return;
    if (filmPlaying) video.current.pause();
    else void video.current.play().catch(() => setFilmPlaying(false));
  }

  return <div id="aircraft-viewer" className="aircraft-portrait studio-viewer" ref={wrapper}>
    <div className="portrait-meta"><span>A-JET / EC145</span><span>{mn ? "СТУДИ · 360°" : "THE STUDIO · 360°"}</span></div>
    <div className="studio-stage" aria-busy={active && !loaded && !film}>
      <img className="studio-poster" src="/img/ajet-studio-poster.webp" width="1600" height="900" alt={mn ? "EC145 нисдэг тэрэг харанхуй студийн гэрэлд" : "The EC145 in a dark studio with a reflective floor"} hidden={loaded && !film} />
      {active && !failed && <div className="studio-live" style={{ opacity: loaded ? 1 : 0 }} hidden={film}><StudioCanvas locale={locale} playing={playing && !film} controls={controls} onReady={ready} onError={error} onInteract={interact} /></div>}
      {film && <video ref={video} className="studio-film" poster="/img/ajet-studio-poster.webp" loop muted playsInline preload="none" onPlay={() => setFilmPlaying(true)} onPause={() => setFilmPlaying(false)} controls>
        <source src="/films/ajet-studio.mp4" type="video/mp4" />
      </video>}
      {active && !loaded && !failed && !film && <p className="studio-loading" role="status">{mn ? "Студи ачаалж байна…" : "Preparing the studio…"}</p>}
    </div>
    <div className="studio-controls">
      <div className="studio-views" role="group" aria-label={mn ? "Харах өнцөг" : "Aircraft views"}>
        {views.map((view, index) => <button key={view.en} type="button" disabled={!loaded || film} aria-pressed={preset === index} onClick={() => { setPlaying(false); setPreset(index); controls.current?.view(view.angle); }}>{view[locale]}</button>)}
      </div>
      <div className="studio-tools" role="group" aria-label={mn ? "Студийн удирдлага" : "Studio controls"}>
        <button type="button" onClick={togglePlayback} disabled={!film && !loaded} aria-pressed={film ? filmPlaying : playing}>{(film ? filmPlaying : playing) ? (mn ? "Түр зогсоох" : "Pause motion") : (mn ? "Хөдөлгөх" : "Play motion")}</button>
        <button type="button" disabled={!loaded || film} aria-label={mn ? "Томруулах" : "Zoom in"} onClick={() => { setPlaying(false); controls.current?.zoom(.85); }}>＋</button>
        <button type="button" disabled={!loaded || film} aria-label={mn ? "Жижигрүүлэх" : "Zoom out"} onClick={() => { setPlaying(false); controls.current?.zoom(1.18); }}>−</button>
        <button type="button" disabled={!loaded || film} onClick={() => { setPlaying(false); setPreset(null); controls.current?.reset(); }}>{mn ? "Бүтнээр харах" : "Fit aircraft"}</button>
        <button type="button" onClick={toggleFullscreen}>{fullscreen ? (mn ? "Жижгэрүүлэх" : "Exit fullscreen") : (mn ? "Бүтэн дэлгэц" : "Fullscreen")}</button>
      </div>
    </div>
    <div className="studio-caption">
      <p role="status">{failed ? (mn ? "3D ачаалагдсангүй. Студийн бичлэгийг үзээрэй эсвэл дахин оролдоорой." : "The 3D view could not load. Watch the studio film or retry.") : (mn ? "Чирж эргүүлнэ · Сумтай товчоор өнцөг солино · 30 секундийн удаан хөдөлгөөн" : "Drag to orbit · Arrow keys to explore · A slow 30-second studio sweep")}</p>
      <div>{failed && <button type="button" onClick={() => { setFailed(false); setActive(true); }}>{mn ? "Дахин оролдох" : "Retry 3D"}</button>}<button type="button" aria-pressed={film} onClick={toggleFilm}>{film ? (mn ? "3D рүү буцах" : "Back to 3D") : (mn ? "Студийн бичлэг ↗" : "Watch the studio film ↗")}</button></div>
    </div>
  </div>;
}
