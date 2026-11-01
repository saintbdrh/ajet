"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type ModelElement = HTMLElement & {
  cameraOrbit: string;
  getCameraOrbit: () => { theta: number; phi: number; radius: number };
};
const initialOrbit = "140deg 72deg 70%";
const views = [
  { id: "side", en: "Profile", mn: "Хажуу талаас", image: "side", orbit: "90deg 78deg 75%" },
  { id: "front", en: "Front", mn: "Урд талаас", image: "front", orbit: "180deg 78deg 75%" },
  { id: "rear", en: "Rear", mn: "Ард талаас", image: "rear", orbit: "0deg 78deg 75%" },
] as const;

let viewerReady: Promise<void> | undefined;
function loadViewer() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (!viewerReady) viewerReady = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/vendor/model-viewer-4.4.0.min.js";
    script.onload = () => { void customElements.whenDefined("model-viewer").then(() => resolve()); };
    script.onerror = () => { script.remove(); viewerReady = undefined; reject(new Error("Viewer could not load")); };
    document.head.appendChild(script);
  });
  return viewerReady;
}

export default function AircraftPortrait({ locale }: { locale: Locale }) {
  const [view, setView] = useState(0);
  const [interactive, setInteractive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const model = useRef<ModelElement | null>(null);
  const mn = locale === "mn";

  useEffect(() => {
    if (!interactive) return;
    let cancelled = false;
    let element: ModelElement | undefined;
    const timeout = window.setTimeout(() => {
      if (!cancelled) { setFailed(true); setInteractive(false); }
    }, 30000);
    setLoaded(false);
    setFailed(false);
    setPreset(null);
    void loadViewer().then(() => {
      if (cancelled || !host.current) return;
      const Viewer = customElements.get("model-viewer") as CustomElementConstructor & { dracoDecoderLocation: string };
      Viewer.dracoDecoderLocation = "/vendor/draco/";
      element = document.createElement("model-viewer") as ModelElement;
      const attributes = {
        src: "/models/ajet-ec145.glb",
        alt: mn ? "Ajet EC145 нисдэг тэрэгний интерактив 3D загвар" : "Interactive 3D model of the Ajet EC145 helicopter",
        "camera-controls": "", "disable-pan": "", "disable-tap": "",
        "touch-action": "pan-y", "interaction-prompt": "none",
        "camera-orbit": initialOrbit, "min-camera-orbit": "auto 15deg 40%",
        "max-camera-orbit": "auto 95deg 180%", "environment-image": "neutral",
        "shadow-intensity": "0.6", "shadow-softness": "0.8", exposure: "1.1",
        "interpolation-decay": window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "0" : "120",
        loading: "eager", reveal: "auto",
      };
      Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
      element.addEventListener("load", () => { window.clearTimeout(timeout); if (!cancelled) setLoaded(true); });
      element.addEventListener("error", () => {
        if (!cancelled) { setFailed(true); setInteractive(false); }
      });
      element.addEventListener("camera-change", (event) => {
        if ((event as CustomEvent<{ source: string }>).detail?.source === "user-interaction") setPreset(null);
      });
      model.current = element;
      host.current.appendChild(element);
    }).catch(() => {
      if (!cancelled) { setFailed(true); setInteractive(false); }
    });
    return () => { cancelled = true; window.clearTimeout(timeout); element?.remove(); model.current = null; };
  }, [interactive, mn]);

  function selectView(index: number) {
    setView(index);
    if (interactive && model.current) { model.current.cameraOrbit = views[index].orbit; setPreset(index); }
  }
  function zoom(scale: number) {
    const element = model.current;
    if (!element || !loaded) return;
    const { theta, phi, radius } = element.getCameraOrbit();
    element.cameraOrbit = `${theta}rad ${phi}rad ${radius * scale}m`;
  }
  function reset() {
    if (model.current) model.current.cameraOrbit = initialOrbit;
    setPreset(null);
    setAnnouncement(mn ? "Анхны байрлалд буцаалаа" : "View reset");
  }

  return <div id="aircraft-viewer" className={`aircraft-portrait${interactive ? " is-interactive" : ""}`}>
    <div className="portrait-meta"><span>AJET / EC145</span><span>{mn ? "360° · ИНТЕРАКТИВ 3D" : "360° · INTERACTIVE 3D"}</span></div>
    <div className="portrait-image">
      <img src={`/img/ajet-aircraft-${views[view].image}.png`} alt={`${mn ? "Ajet EC145 нисдэг тэрэг" : "Ajet EC145 helicopter"} — ${views[view][locale]}`} loading="lazy" hidden={interactive && loaded} />
      <div className={`portrait-model${loaded ? " is-loaded" : ""}`} ref={host} aria-hidden={!interactive} />
      {(!interactive || !loaded) && <div className="portrait-load-panel">
        {interactive ? <span className="portrait-loading" role="status">{mn ? "3D загвар ачаалж байна…" : "Preparing your aircraft…"}</span> : <>
          {failed && <p role="status">{mn ? "3D загварыг ачаалж чадсангүй. Дахин оролдоно уу эсвэл зургуудыг үзээрэй." : "The 3D view could not load. Try again or explore the photos."}</p>}
          <button className="btn" type="button" onClick={() => { setFailed(false); setAnnouncement(""); setInteractive(true); }}><span aria-hidden="true">↻</span> {failed ? (mn ? "Дахин оролдох" : "Try 3D again") : (mn ? "3D загварыг үзэх" : "Explore in 3D")}</button>
          <span>{mn ? "Эргүүлэх · Томруулах" : "Orbit. Zoom. Explore."}</span>
        </>}
      </div>}
      {interactive && loaded && <div className="portrait-tools" role="group" aria-label={mn ? "3D удирдлага" : "3D controls"}>
        <button type="button" aria-label={mn ? "Томруулах" : "Zoom in"} onClick={() => zoom(0.8)}>＋</button>
        <button type="button" aria-label={mn ? "Жижигрүүлэх" : "Zoom out"} onClick={() => zoom(1.25)}>−</button>
        <button type="button" aria-label={mn ? "Анхны байрлал" : "Reset view"} onClick={reset}>↺</button>
      </div>}
    </div>
    <div className="portrait-bottom">
      <span>{interactive ? "360°" : `${String(view + 1).padStart(2, "0")} / 03`}</span>
      <div className="portrait-views" role="group" aria-label={mn ? "Харах өнцөг" : "Aircraft view"}>{views.map((item, index) => <button type="button" key={item.id} disabled={interactive && !loaded} aria-pressed={interactive ? preset === index : view === index} onClick={() => selectView(index)}>{item[locale]}</button>)}</div>
      {interactive ? <button className="portrait-stills" type="button" onClick={() => { setInteractive(false); setLoaded(false); }}>{mn ? "Зургууд" : "Photos"}</button> : <span className="portrait-cross" aria-hidden="true">＋</span>}
    </div>
    <p className="portrait-guidance" role="status">{interactive && loaded ? (mn ? "Чирж эргүүлнэ · Гүйлгэж эсвэл хоёр хуруугаар томруулна · Сумтай товчоор эргүүлнэ" : "Drag to rotate · Scroll or pinch to zoom · Arrow keys to orbit") : (mn ? "Таны хяналтад. Өнцөг бүрээс хараарай." : "Every angle. At your own pace.")}<span className="sr-only">{announcement}</span></p>
  </div>;
}
