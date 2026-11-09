"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import EC145HeroModel from "@/components/EC145HeroModel";

type FocusMethod = "scroll" | "hover" | "click" | "keyboard";
type Category = { id: string; name: string; body: string };
type CategoryPose = {
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  depth: number;
};
type FrameManifest = { frames: { src: string; bytes: number }[] };
type SceneAssets = {
  landscape?: string;
  clouds: string[];
  body?: string;
  rotor?: string;
  shadow?: string;
};
type CategoryFlightSceneProps = {
  locale: "mn" | "en";
  categories: Category[];
  title: string;
  intro: string;
  sceneImage?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function categoryPose(index: number, count: number): CategoryPose {
  if (count === 3) {
    const positions = [
      { x: 74, y: 30 },
      { x: 80, y: 76 },
      { x: 22, y: 76 },
    ];
    const position = positions[index] ?? positions[0];
    const offset = index % 2 === 0 ? 1 : -1;
    return {
      x: position.x,
      y: position.y,
      rotateX: (index % 3 - 1) * 3.2,
      rotateY: offset * (6 + (index % 3)),
      rotateZ: offset * (1.5 + (index % 2)),
      scale: [1, 0.94, 1.06][index] ?? 1,
      depth: index % 2 === 0 ? 1 : -1,
    };
  }
  const angle = (-90 + (360 * index) / count) * (Math.PI / 180);
  const offset = index % 2 === 0 ? 1 : -1;
  return {
    x: 50 + Math.cos(angle) * (count >= 6 ? 35 : 32),
    y: 51 + Math.sin(angle) * (count >= 6 ? 29 : 27),
    rotateX: (index % 3 - 1) * 3.2,
    rotateY: offset * (6 + (index % 3)),
    rotateZ: offset * (1.5 + (index % 2)),
    scale: [1, 0.94, 1.06, 0.98][index % 4],
    depth: index % 2 === 0 ? 1 : -1,
  };
}

function validSceneAsset(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/img/home/scene/") && !path.includes("..");
}

function CategoryIcon({ id }: { id: string }) {
  if (id === "catering") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 18h22M8 18a8 8 0 0 1 16 0M16 5v2m-7 1 1.4 1.4m12.2-1.4L21.2 9" />
        <path d="M7 23h18M10 27h12" />
      </svg>
    );
  }
  if (id === "photography") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 10h6l2-3h8l2 3h6v16H4z" />
        <circle cx="16" cy="18" r="5" />
        <path d="M24 13h1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 17h24M16 17l-3 7m3-7 3 7M7 14l3-4 12-1 4 5M13 24h6" />
      <path d="M16 7V4m-9 5-4-2m22 2 4-2" />
    </svg>
  );
}

function FlightFrameCanvas({
  progress,
  reducedMotion,
  lowEnd,
  assets,
  labels,
}: {
  progress: number;
  reducedMotion: boolean;
  lowEnd: boolean;
  assets: SceneAssets;
  labels: { unavailable: string; loading: string };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<string[]>([]);
  const loadedRef = useRef(new Map<string, HTMLImageElement>());
  const requestedRef = useRef(new Set<string>());
  const targetRef = useRef(0);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState("");
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/scene/fly-in/manifest.json", { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Fly-in manifest returned ${response.status}.`);
        const manifest = await response.json() as FrameManifest;
        if (!Array.isArray(manifest.frames)) throw new Error("Fly-in manifest must include a frames array.");
        if (manifest.frames.length > 0 && (manifest.frames.length < 60 || manifest.frames.length > 90)) {
          throw new Error("Fly-in frame sequences must contain 60 to 90 frames.");
        }
        if (manifest.frames.some((frame) =>
          typeof frame?.src !== "string" ||
          !frame.src.startsWith("/scene/fly-in/") ||
          !Number.isSafeInteger(frame.bytes) ||
          frame.bytes <= 0,
        )) {
          throw new Error("Fly-in frames must use local /scene/fly-in/ paths.");
        }
        const totalBytes = manifest.frames.reduce((total, frame) => total + frame.bytes, 0);
        if (totalBytes > 4 * 1024 * 1024) throw new Error("The fly-in frame sequence must stay under 4 MB.");
        framesRef.current = manifest.frames.map((frame) => frame.src);
        setFrameCount(manifest.frames.length);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Fly-in sequence could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || frames.length === 0) return;
    const image = loadedRef.current.get(frames[index]);
    if (!image) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Could not create the flight-scene canvas context.");
      return;
    }
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }, []);

  useEffect(() => {
    const frames = framesRef.current;
    if (frames.length === 0 || lowEnd) return;
    const target = reducedMotion ? 0 : Math.round(clamp(progress, 0, 1) * (frames.length - 1));
    targetRef.current = target;
    const first = reducedMotion ? 0 : Math.max(0, target - 2);
    const last = reducedMotion ? 0 : Math.min(frames.length - 1, target + 8);
    for (let index = first; index <= last; index += 1) {
      const src = frames[index];
      if (requestedRef.current.has(src)) continue;
      requestedRef.current.add(src);
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => {
        loadedRef.current.set(src, image);
        drawFrame(targetRef.current);
      };
      image.onerror = () => setError(`Could not load fly-in frame: ${src}`);
      image.src = src;
    }
    if (loadedRef.current.has(frames[target])) drawFrame(target);
    else {
      for (let distance = 1; distance < frames.length; distance += 1) {
        const previous = frames[target - distance];
        const next = frames[target + distance];
        if (previous && loadedRef.current.has(previous)) {
          drawFrame(target - distance);
          break;
        }
        if (next && loadedRef.current.has(next)) {
          drawFrame(target + distance);
          break;
        }
      }
    }
  }, [drawFrame, lowEnd, progress, reducedMotion, frameCount]);

  return (
    <div className={`flight-scene__aircraft${frameCount > 0 ? " has-sequence" : ""}`} aria-label={labels.unavailable}>
      <div className="flight-scene__aircraft-layers" aria-hidden="true">
        {frameCount > 0
          ? <canvas ref={canvasRef} className="flight-scene__frames" aria-hidden="true" />
          : <EC145HeroModel
              progress={reducedMotion ? 1 : progress}
              reducedMotion={reducedMotion}
              lowEnd={lowEnd}
              onReady={() => setModelReady(true)}
              onError={setError}
            />}
        {!modelReady && frameCount === 0 && assets.shadow && <Image className="flight-scene__shadow-asset" src={assets.shadow} alt="" fill sizes="(max-width: 760px) 65vw, 40vw" unoptimized />}
        {!modelReady && frameCount === 0 && assets.body && <Image className="flight-scene__body-asset" src={assets.body} alt="" fill sizes="(max-width: 760px) 65vw, 40vw" unoptimized />}
        {!modelReady && frameCount === 0 && assets.rotor && <Image className={`flight-scene__rotor-asset${!reducedMotion && !lowEnd ? " is-spinning" : ""}`} src={assets.rotor} alt="" fill sizes="(max-width: 760px) 65vw, 40vw" unoptimized />}
      </div>
      {frameCount === 0 && !modelReady && !error && (
        <div className="flight-scene__asset-slots"><span>{labels.loading}</span></div>
      )}
      {error && <span className="flight-scene__asset-error" role="status">{error}</span>}
    </div>
  );
}

export default function CategoryFlightScene({
  locale,
  categories,
  title,
  intro,
  sceneImage,
}: CategoryFlightSceneProps) {
  const mn = locale === "mn";
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastScrollIndex = useRef(-1);
  const progressRef = useRef(0);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [focus, setFocus] = useState<{ id: string; method: Exclude<FocusMethod, "scroll">; progress: number; scrollTick: number } | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowEnd, setLowEnd] = useState(false);
  const [sceneAssets, setSceneAssets] = useState<SceneAssets>({ clouds: [] });
  const [sceneAssetError, setSceneAssetError] = useState("");
  const scrollTickRef = useRef(0);
  const [scrollTick, setScrollTick] = useState(0);
  const inputModeRef = useRef<"keyboard" | "pointer">("pointer");
  const skipFocusRef = useRef<string | null>(null);

  const poses = useMemo(() => categories.map((_, index) => categoryPose(index, categories.length)), [categories]);
  const activeIndex = focus ? Math.max(0, categories.findIndex((category) => category.id === focus.id)) : scrollIndex;
  const activeCategory = categories[activeIndex] ?? categories[0];
  const activePose = poses[activeIndex] ?? categoryPose(0, Math.max(categories.length, 1));
  const formatCount = (value: number) => String(value + 1).padStart(2, "0");

  const emitFocus = useCallback((id: string, method: FocusMethod) => {
    const detail = { id, method };
    window.dispatchEvent(new CustomEvent("category_focus", { detail }));
    const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, string>> };
    if (Array.isArray(analyticsWindow.dataLayer)) {
      analyticsWindow.dataLayer.push({ event: "category_focus", id, method });
    }
  }, []);

  const setCategoryFocus = useCallback((id: string, method: Exclude<FocusMethod, "scroll">) => {
    window.clearTimeout(closeTimer.current);
    setFocus({ id, method, progress: progressRef.current, scrollTick: scrollTickRef.current });
    emitFocus(id, method);
  }, [emitFocus]);

  useEffect(() => {
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreferences = () => {
      setHoverEnabled(hover.matches);
      setReducedMotion(motion.matches);
      const hardware = navigator.hardwareConcurrency || 8;
      const memory = Reflect.get(navigator, "deviceMemory");
      setLowEnd(hardware <= 4 || (typeof memory === "number" && memory <= 4));
    };
    updatePreferences();
    hover.addEventListener("change", updatePreferences);
    motion.addEventListener("change", updatePreferences);
    return () => {
      hover.removeEventListener("change", updatePreferences);
      motion.removeEventListener("change", updatePreferences);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/scene/home-assets.json", { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Homepage asset manifest returned ${response.status}.`);
        const manifest = await response.json() as Partial<SceneAssets>;
        if (manifest.landscape != null && !validSceneAsset(manifest.landscape)) throw new Error("The landscape asset path is invalid.");
        if (!Array.isArray(manifest.clouds) || manifest.clouds.length > 3 || manifest.clouds.some((asset) => !validSceneAsset(asset))) {
          throw new Error("The cloud asset manifest must contain up to three local scene paths.");
        }
        for (const asset of [manifest.body, manifest.rotor, manifest.shadow]) {
          if (asset != null && !validSceneAsset(asset)) throw new Error("A helicopter render-layer path is invalid.");
        }
        setSceneAssets({
          landscape: manifest.landscape ?? undefined,
          clouds: manifest.clouds,
          body: manifest.body ?? undefined,
          rotor: manifest.rotor ?? undefined,
          shadow: manifest.shadow ?? undefined,
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setSceneAssetError(cause instanceof Error ? cause.message : "Homepage scene assets could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = (fromScroll = false) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;
        const bounds = section.getBoundingClientRect();
        const distance = Math.max(1, bounds.height - window.innerHeight);
        const progress = reducedMotion ? 0 : clamp(-bounds.top / distance, 0, 1);
        const nextIndex = reducedMotion ? 0 : Math.min(categories.length - 1, Math.round(progress * (categories.length - 1)));
        progressRef.current = progress;
        setScrollProgress(progress);
        setScrollIndex(nextIndex);
        if (fromScroll) {
          scrollTickRef.current += 1;
          setScrollTick(scrollTickRef.current);
        }
        if (lastScrollIndex.current !== nextIndex) {
          lastScrollIndex.current = nextIndex;
          if (categories[nextIndex]) emitFocus(categories[nextIndex].id, "scroll");
        }
      });
    };
    update();
    const onScroll = () => update(true);
    const onResize = () => update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [categories, emitFocus, reducedMotion]);

  useEffect(() => {
    if (!focus || reducedMotion || scrollTick <= focus.scrollTick) return;
    const moved = Math.abs(scrollProgress - focus.progress) > 0.02;
    const focusIndex = categories.findIndex((category) => category.id === focus.id);
    const scrolledAboveReveal = scrollProgress < focusIndex / Math.max(1, categories.length - 1) - 0.02;
    if (moved || scrolledAboveReveal) setFocus(null);
  }, [categories, focus, reducedMotion, scrollProgress, scrollTick]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const releaseHoverSoon = () => {
    if (!focus || focus.method !== "hover") return;
    closeTimer.current = window.setTimeout(() => setFocus(null), 180);
  };

  const moveFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (activeIndex + direction + categories.length) % categories.length;
    const category = categories[next];
    if (!category) return;
    setCategoryFocus(category.id, "keyboard");
    skipFocusRef.current = category.id;
    buttonRefs.current[next]?.focus();
  };

  const closePanel = () => {
    setFocus(null);
    skipFocusRef.current = categories[activeIndex]?.id ?? null;
    buttonRefs.current[activeIndex]?.focus();
  };

  const scrollToIndex = (index: number) => {
    const section = sectionRef.current;
    if (!section || reducedMotion) return;
    const start = window.scrollY + section.getBoundingClientRect().top;
    const range = Math.max(0, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: start + range * (index / Math.max(1, categories.length - 1)), behavior: "smooth" });
  };

  const sceneStyle = { "--scene-count": categories.length } as CSSProperties;

  return (
    <section
      className={`flight-scene${reducedMotion ? " is-reduced-motion" : ""}${lowEnd ? " is-low-end" : ""}`}
      ref={sectionRef}
      style={sceneStyle}
      aria-label={mn ? "A-JET нислэгийн үйлчилгээ" : "A-JET flight services"}
      onPointerDownCapture={() => { inputModeRef.current = "pointer"; }}
      onKeyDown={(event) => {
        inputModeRef.current = "keyboard";
        if (event.key === "Escape" && focus) {
          event.preventDefault();
          closePanel();
          return;
        }
        moveFocus(event);
      }}
    >
      <div className="flight-scene__sticky">
        <div className="flight-scene__sky">
          {!sceneImage && !sceneAssets.landscape && (
            <div className="flight-scene__sky-photo" aria-hidden="true">
              <Image src="/img/home/scene/sky-background.webp" alt="" fill priority sizes="100vw" unoptimized />
            </div>
          )}
          {sceneImage && <Image className="flight-scene__cms-image" src={sceneImage} alt="" fill priority unoptimized sizes="100vw" />}
          <div className="flight-scene__stars" aria-hidden="true" />
          <div className="flight-scene__sunset" aria-hidden="true" />
          {!sceneImage && sceneAssets.landscape && (
            <Image className="flight-scene__landscape-asset" src={sceneAssets.landscape} alt="" fill priority unoptimized sizes="100vw" />
          )}
          <div className={`flight-scene__mountain-slot${sceneImage || sceneAssets.landscape ? " has-landscape" : ""}`} aria-hidden="true">
            {!sceneImage && !sceneAssets.landscape && <span>{mn ? "МОНГОЛЫН БОДИТ ЛАНДШАФТ · ЗУРГИЙН ОРОН ЗАЙ" : "MONGOLIAN LANDSCAPE · PHOTO SLOT"}</span>}
            {!sceneAssets.clouds.length && <span>{mn ? "ҮҮЛНИЙ ДАВХАРГА · ЗУРГИЙН ОРОН ЗАЙ" : "CLOUD LAYER PHOTO SLOTS"}</span>}
          </div>
          {sceneAssets.clouds.length > 0
            ? sceneAssets.clouds.map((src, index) => (
                <div
                  className={`flight-scene__cloud-asset flight-scene__cloud-asset--${index + 1}`}
                  key={src}
                  aria-hidden="true"
                  style={{ transform: `translate3d(${(scrollProgress - .5) * (index % 2 ? -44 : 26)}px,0,0)` }}
                >
                  <Image src={src} alt="" fill sizes="100vw" unoptimized />
                </div>
              ))
            : null}
        </div>

        <header className="flight-scene__heading">
          <p className="eyebrow">{mn ? "A-JET AVIATION · МОНГОЛ" : "A-JET AVIATION · MONGOLIA"}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>

        <div className="flight-scene__aircraft-wrap" aria-hidden="true">
          <FlightFrameCanvas
            progress={scrollProgress}
            reducedMotion={reducedMotion}
            lowEnd={lowEnd}
            assets={sceneAssets}
            labels={{
              unavailable: mn ? "Нисдэг тэрэгний загварыг үзүүлэх боломжгүй" : "Helicopter model unavailable",
              loading: mn ? "EC145 загварыг ачаалж байна" : "Loading EC145 model",
            }}
          />
        </div>
        {sceneAssetError && <p className="flight-scene__manifest-error" role="status">{sceneAssetError}</p>}

        <div className="flight-scene__route-caption" aria-hidden="true">
          <span>UB</span><i /><span>GOBI</span><i /><span>KHUVSGUL</span><i /><span>ALTAI</span>
        </div>

        <nav className="flight-scene__progress" aria-label={mn ? "Үйлчилгээний дараалал" : "Service sequence"}>
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              aria-label={`${formatCount(index)} · ${category.name}`}
              aria-current={index === activeIndex ? "step" : undefined}
              onClick={() => scrollToIndex(index)}
            />
          ))}
          <span>{formatCount(activeIndex)} <i>/</i> {formatCount(categories.length - 1)}</span>
        </nav>

        <div className="flight-scene__cards">
          {categories.map((category, index) => {
            const pose = poses[index] ?? categoryPose(index, categories.length);
            const active = category.id === activeCategory?.id;
            const style = {
              "--card-x": `${pose.x}%`,
              "--card-y": `${pose.y}%`,
              "--card-rx": `${pose.rotateX}deg`,
              "--card-ry": `${pose.rotateY}deg`,
              "--card-rz": `${pose.rotateZ}deg`,
              "--card-scale": pose.scale,
              "--card-depth": `${pose.depth * 24}px`,
              zIndex: active ? 12 : pose.depth < 0 ? 2 : 5 + (index % 2),
            } as CSSProperties;
            return (
              <article
                className={`flight-scene__card${active ? " is-active" : ""}${focus?.id === category.id ? " is-focused" : ""}`}
                style={style}
                key={category.id}
                onPointerEnter={(event: PointerEvent<HTMLElement>) => {
                  if (hoverEnabled && event.pointerType === "mouse") setCategoryFocus(category.id, "hover");
                }}
                onPointerLeave={releaseHoverSoon}
                onFocus={() => {
                  if (skipFocusRef.current === category.id) {
                    skipFocusRef.current = null;
                    return;
                  }
                  if (inputModeRef.current === "keyboard" && (!focus || focus.id !== category.id || focus.method !== "keyboard")) {
                    setCategoryFocus(category.id, "keyboard");
                  }
                }}
              >
                <button
                  type="button"
                  className="flight-scene__card-button"
                  ref={(element) => { buttonRefs.current[index] = element; }}
                  aria-pressed={focus?.id === category.id && focus.method !== "hover"}
                  aria-expanded={active}
                  onClick={(event) => setCategoryFocus(category.id, event.detail === 0 ? "keyboard" : "click")}
                >
                  <span className="flight-scene__icon"><CategoryIcon id={category.id} /></span>
                  <span className="flight-scene__card-label">{category.name}</span>
                  <span className="flight-scene__card-index">{formatCount(index)}</span>
                  {active && <span className="flight-scene__card-description">{category.body}</span>}
                </button>
                {active && (
                  <Link
                    className="flight-scene__card-cta"
                    href={`/${locale}/quote?service=${encodeURIComponent(category.id)}`}
                    aria-label={`${mn ? "Үйлчилгээ хүсэх" : "Request"}: ${category.name}`}
                  >
                    <span aria-hidden="true">↗</span>
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <div className={`flight-scene__scroll${scrollProgress > 0.02 ? " is-hidden" : ""}`} aria-hidden="true">
          <span>{mn ? "ГҮЙЛГЭН ҮЗЭХ" : "SCROLL"}</span><b>⌄</b>
        </div>

      </div>
    </section>
  );
}
