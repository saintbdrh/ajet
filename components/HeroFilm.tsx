"use client";

import { useEffect, useRef, useState } from "react";

type VideoSource = { src: string; type: string };

export default function HeroFilm({
  backgroundSources,
  filmSources,
  poster,
  buttonLabel,
  closeLabel,
  dialogLabel,
}: {
  backgroundSources: VideoSource[];
  filmSources: VideoSource[];
  poster: string;
  buttonLabel: string;
  closeLabel: string;
  dialogLabel: string;
}) {
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [filmRequested, setFilmRequested] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backgroundRef = useRef<HTMLVideoElement>(null);
  const sourcesRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: number | undefined;
    let observer: PerformanceObserver | undefined;
    let loadListener: (() => void) | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const canLoadBackground = () => {
      if (reducedMotion.matches) return false;
      const connection = Reflect.get(navigator, "connection");
      if (!connection || typeof connection !== "object") return true;
      if (Reflect.get(connection, "saveData") === true) return false;
      const effectiveType = Reflect.get(connection, "effectiveType");
      return !["slow-2g", "2g", "3g"].includes(String(effectiveType ?? "").toLowerCase());
    };

    const scheduleVideo = () => {
      if (!canLoadBackground() || backgroundSources.length === 0) return;
      timer = window.setTimeout(() => {
        if (canLoadBackground()) setBackgroundReady(true);
      }, 1400);
    };

    const handleMotionChange = () => {
      if (reducedMotion.matches) {
        if (timer !== undefined) window.clearTimeout(timer);
        setBackgroundReady(false);
        backgroundRef.current?.pause();
      }
    };

    reducedMotion.addEventListener("change", handleMotionChange);
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")
    ) {
      observer = new PerformanceObserver((entries) => {
        if (entries.getEntries().length > 0) {
          observer?.disconnect();
          scheduleVideo();
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } else {
      loadListener = scheduleVideo;
      if (document.readyState === "complete") scheduleVideo();
      else window.addEventListener("load", loadListener, { once: true });
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      observer?.disconnect();
      reducedMotion.removeEventListener("change", handleMotionChange);
      if (loadListener) window.removeEventListener("load", loadListener);
    };
  }, [backgroundSources.length]);

  const openFilm = () => {
    setFilmRequested(true);
    dialogRef.current?.showModal();
  };

  const closeFilm = () => {
    sourcesRef.current?.pause();
    dialogRef.current?.close();
  };

  return (
    <div className="signature-film">
      {backgroundReady && backgroundSources.length > 0 && (
        <video
          ref={backgroundRef}
          className="signature-film__background"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          {backgroundSources.map((source) => <source key={source.src} src={source.src} type={source.type} />)}
        </video>
      )}
      {filmSources.length > 0 && (
        <>
          <button className="signature-film-button" type="button" onClick={openFilm}>
            <span aria-hidden="true">▷</span>{buttonLabel}
          </button>
          <dialog
            ref={dialogRef}
            className="signature-film-dialog"
            aria-label={dialogLabel}
            onClose={() => {
              sourcesRef.current?.pause();
              setFilmRequested(false);
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeFilm();
            }}
          >
            <button className="signature-film-dialog__close" type="button" onClick={closeFilm} aria-label={closeLabel}>×</button>
            <video ref={sourcesRef} controls playsInline autoPlay={filmRequested} preload="none" poster={poster} aria-label={dialogLabel}>
              {filmRequested && filmSources.map((source) => <source key={source.src} src={source.src} type={source.type} />)}
            </video>
          </dialog>
        </>
      )}
    </div>
  );
}
