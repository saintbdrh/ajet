"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type Props = {
  src: string;
  /** Renders a muted, looping background video with this poster instead of an image. */
  video?: boolean;
  poster?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export default function MediaView({ src, video = false, poster, alt, className, style, loading = "lazy", fetchPriority }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query.matches) element.pause();
      else void element.play().catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [src]);

  if (!video) {
    return <img className={className} src={src} alt={alt} loading={loading} fetchPriority={fetchPriority} style={style} />;
  }
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      style={style}
      muted
      loop
      playsInline
      autoPlay
      preload={loading === "eager" ? "auto" : "metadata"}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
