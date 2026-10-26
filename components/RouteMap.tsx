"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Pt = { id: string; name: string; lat: number; lng: number };
const TILES = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

export default function RouteMap({ points, label }: { points: Pt[]; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let observer: IntersectionObserver | undefined;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        map.getContainer().classList.add("routes-visible");
      } else {
        observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            map?.getContainer().classList.add("routes-visible");
            observer?.disconnect();
          }
        }, { threshold: 0.15 });
        observer.observe(map.getContainer());
      }
      L.tileLayer(TILES, { attribution: ATTR, maxZoom: 14, className: "luxury-map-tiles" }).addTo(map);
      const hub = points.find((point) => point.id === "ub") ?? points[0];
      if (hub && points.length > 1) {
        points
          .filter((point) => point.id !== hub.id)
          .forEach((point) => {
            L.polyline([[hub.lat, hub.lng], [point.lat, point.lng]], {
              className: "route-line",
              color: "#B49B70",
              weight: 1,
              opacity: 0.72,
              dashArray: "2 10",
            }).addTo(map!);
          });
      }
      const ms = points.map((p) =>
        L.circleMarker([p.lat, p.lng], { radius: p.id === hub?.id ? 6 : 4, color: "#C9B58E", weight: 1.2, fillColor: "#B49B70", fillOpacity: 0.9 })
          .bindTooltip(p.name).addTo(map!));
      if (ms.length) map.fitBounds(L.featureGroup(ms).getBounds().pad(0.25));
      else map.setView([46.8, 103.8], 5);
    })();
    return () => { dead = true; observer?.disconnect(); map?.remove(); };
  }, [points]);
  return <div ref={el} className="map" role="img" aria-label={label} />;
}
