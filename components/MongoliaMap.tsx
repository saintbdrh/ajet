"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { INTERIOR, MAP_H, MAP_W, NODES, OUTLINE, PROJ } from "@/lib/mongolia-map-data";

const DEST = [
  { key: "terelj", mn: "Тэрэлж", en: "Terelj" },
  { key: "khuvsgul", mn: "Хөвсгөл", en: "Khövsgöl" },
  { key: "gobi", mn: "Говь", en: "Gobi" },
] as const;
type Pt = { id: string; name: string; lat: number; lng: number };
type MapNode = { key: string; label: string; xy: [number, number] };
const project = (lng: number, lat: number): [number, number] => [(lng * PROJ.k - PROJ.x0) * PROJ.s, (-lat - PROJ.y0) * PROJ.s];

const hash = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const FONT = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

// Control point for a gentle arc between the hub and a node (decorative route, not a flight path).
function ctrl(HUB: [number, number], to: [number, number]): [number, number] {
  const mx = (HUB[0] + to[0]) / 2, my = (HUB[1] + to[1]) / 2;
  const dx = to[0] - HUB[0], dy = to[1] - HUB[1], len = Math.hypot(dx, dy) || 1;
  return [mx - (dy / len) * len * 0.18, my + (dx / len) * len * 0.18 - len * 0.1];
}
const bez = (a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
};

export default function MongoliaMap({ locale, points, variant }: { locale: Locale; points?: Pt[]; variant?: "page" }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<string | null>(null);
  const redraw = useRef<() => void>(() => {});
  const [active, setActive] = useState<string | null>(null);
  const pointsKey = JSON.stringify(points ?? null);
  const { hubNode, dests } = useMemo(() => {
    const all: MapNode[] = points
      ? points.map((p) => ({ key: p.id, label: p.name, xy: project(p.lng, p.lat) }))
      : [{ key: "ulaanbaatar", label: locale === "mn" ? "Улаанбаатар" : "Ulaanbaatar", xy: NODES.ulaanbaatar as [number, number] }, ...DEST.map((d) => ({ key: d.key, label: d[locale], xy: NODES[d.key] as [number, number] }))];
    const hubNode = all.find((n) => n.key === "ub" || n.key === "ulaanbaatar") ?? all[0];
    return { hubNode, dests: all.filter((n) => n !== hubNode) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, pointsKey]);

  useEffect(() => { activeRef.current = active; redraw.current(); }, [active]);

  useEffect(() => {
    const el = box.current, cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 700;

    // Theme colours come from CSS so the map follows the site palette.
    const css = getComputedStyle(el);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const DOT = token("--map-dot", "#f1eee7");
    const LINE = token("--map-line", "rgba(241,238,231,.75)");
    const ACCENT = token("--map-accent", "#d5c29e");

    // Build particle groups once: [tx, ty, startX, startY, delay]
    const groups: number[][][] = [[], [], [], [], []];
    const push = (g: number, x: number, y: number, i: number) =>
      groups[g].push([x, y, MAP_W / 2 + (hash(i * 2 + 1) - 0.5) * MAP_W * 1.4, MAP_H / 2 + (hash(i * 2 + 2) - 0.5) * MAP_H * 1.6, (x / MAP_W) * 0.9 + hash(i) * 0.3]);
    for (let i = 0; i < OUTLINE.length; i += 2) push(0, OUTLINE[i], OUTLINE[i + 1], i);
    for (let i = 0; i < INTERIOR.length; i += 2) {
      if (small && (i / 2) % 2) continue;
      const x = INTERIOR[i], y = INTERIOR[i + 1];
      const terrain = 0.5 + 0.5 * Math.sin(x * 0.011 + Math.sin(y * 0.017) * 2.1) * Math.cos(y * 0.013 - x * 0.004);
      push(1 + Math.min(3, Math.floor((terrain * 0.7 + hash(i + 7) * 0.5) * 4)), x, y, i + 9000);
    }
    const alpha = [0.9, 0.16, 0.26, 0.38, 0.55];
    const HUB: [number, number] = hubNode?.xy ?? [0, 0];

    let w = 0, h = 0, dpr = 1, scale = 1, ox = 0, oy = 0, raf = 0, last = 0, visible = true;
    const t0 = performance.now();

    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      scale = Math.min(w / MAP_W, h / MAP_H) * 0.94;
      ox = (w - MAP_W * scale) / 2; oy = (h - MAP_H * scale) / 2;
    };

    const draw = (now: number) => {
      const t = reduced ? 99 : (now - t0) / 1000;
      const act = activeRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      ctx.fillStyle = DOT;
      groups.forEach((g, gi) => {
        ctx.globalAlpha = alpha[gi] * (act && gi > 0 ? 0.8 : 1);
        const s = gi === 0 ? 2.1 : 1.6;
        for (const p of g) {
          const k = ease((t - p[4]) / 1.4);
          if (k <= 0) continue;
          const wob = k >= 1 && !reduced ? Math.sin(t * 0.6 + p[0] * 0.02) * 0.35 : 0;
          ctx.fillRect(p[2] + (p[0] - p[2]) * k + wob - s / 2, p[3] + (p[1] - p[3]) * k + wob - s / 2, s, s);
        }
      });
      ctx.globalAlpha = 1;
      const fs = 11 / scale;
      ctx.font = `${fs}px ${FONT}`;
      if (hubNode) dests.forEach((d, i) => {
        const to = d.xy, c = ctrl(HUB, to), on = act === d.key;
        const prog = ease((t - 1.7 - i * 0.25) / 1.2);
        if (prog <= 0) return;
        ctx.strokeStyle = on ? ACCENT : LINE; ctx.lineWidth = (on ? 1.6 : 0.8) / scale; ctx.globalAlpha = on ? 0.95 : act ? 0.12 : 0.34;
        ctx.beginPath();
        for (let s = 0; s <= 48; s++) { const q = bez(HUB, c, to, (s / 48) * prog); s ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        ctx.stroke();
        if (prog >= 1) {
          const q = bez(HUB, c, to, (t * 0.22 + i * 0.31) % 1);
          ctx.globalAlpha = on ? 1 : 0.6; ctx.fillStyle = on ? ACCENT : DOT; ctx.beginPath(); ctx.arc(q[0], q[1], 2.2, 0, 6.3); ctx.fill();
          ctx.beginPath(); ctx.arc(to[0], to[1], on ? 4 : 2.6, 0, 6.3); ctx.fill();
          ctx.globalAlpha = on ? 1 : act ? 0.35 : 0.75;
          ctx.fillText(d.label.toUpperCase(), to[0] + 8, to[1] + 3);
        }
      });
      const hubOn = ease((t - 1.4) / 0.6);
      if (hubOn > 0 && hubNode) {
        const ring = (t % 2.6) / 2.6;
        ctx.globalAlpha = hubOn; ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(HUB[0], HUB[1], 4.5, 0, 6.3); ctx.fill();
        if (!reduced) { ctx.globalAlpha = hubOn * (1 - ring) * 0.6; ctx.strokeStyle = ACCENT; ctx.lineWidth = 1 / scale; ctx.beginPath(); ctx.arc(HUB[0], HUB[1], 6 + ring * 18, 0, 6.3); ctx.stroke(); }
        ctx.globalAlpha = hubOn; ctx.fillStyle = DOT; ctx.fillText(hubNode.label.toUpperCase(), HUB[0] - 6, HUB[1] - 12);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      if (now - last > ((now - t0) > 7000 ? 66 : 0)) { last = now; draw(now); }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!reduced && !raf && visible) raf = requestAnimationFrame(tick); };
    redraw.current = () => { if (reduced) draw(performance.now()); };

    resize(); reduced ? draw(performance.now()) : start();
    const ro = new ResizeObserver(() => { resize(); redraw.current(); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(el);
    const vis = () => start();
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", vis); redraw.current = () => {}; };
  }, [locale, hubNode, dests]);

  const mn = locale === "mn";
  return (
    <div className={variant === "page" ? "hero-map hero-map--page" : "hero-map"} ref={box}>
      <div className="hero-map-scrim" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <div className="hero-map-ui" role="group" aria-label={mn ? "Чиглэл сонгох" : "Choose a destination"}>
        <span className="hero-map-tag" aria-hidden="true">47.92°N · 106.92°E</span>
        {dests.map((d) => (
          <button key={d.key} type="button" aria-pressed={active === d.key} onClick={() => setActive(active === d.key ? null : d.key)}>{d.label}</button>
        ))}
        {active && <button type="button" className="reset" onClick={() => setActive(null)}>{mn ? "Бүх газрын зураг" : "Full map"}</button>}
      </div>
    </div>
  );
}
