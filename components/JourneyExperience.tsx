"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type JourneyScene = { label: string; title: string; body: string; image: string; position: string };

export default function JourneyExperience({ locale, scenes, kicker, intro }: {
  locale: Locale;
  scenes: JourneyScene[];
  kicker: string;
  intro: string;
}) {
  const content = scenes;
  const stageImages = Array.from(new Set(content.map((scene) => scene.image)));
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    setActiveScene(0);
    const elements = document.querySelectorAll<HTMLElement>("[data-journey-scene]");
    if (!("IntersectionObserver" in window)) return;

    let observer: IntersectionObserver;
    const observeScenes = () => {
      observer?.disconnect();
      const centerInset = Math.round(window.innerHeight * 0.38);
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveScene(Number((entry.target as HTMLElement).dataset.journeyScene));
          });
        },
        { threshold: 0, rootMargin: `-${centerInset}px 0px -${centerInset}px 0px` },
      );
      elements.forEach((element) => observer.observe(element));
    };
    observeScenes();
    window.addEventListener("resize", observeScenes, { passive: true });
    return () => {
      window.removeEventListener("resize", observeScenes);
      observer.disconnect();
    };
  }, [locale]);

  return (
    <section className="journey" aria-label={locale === "mn" ? "Нислэгийн аялал" : "The flight journey"}>
      <div className="journey-heading wrap">
        <p className="eyebrow">{kicker}</p>
        <p>{intro}</p>
      </div>
      <div className="journey-layout">
        <div className="journey-copy">
          {content.map((scene, index) => (
            <article
              className={`journey-scene${index === 6 ? " journey-scene--invitation" : ""}`}
              data-journey-scene={index}
              key={scene.label}
              aria-current={activeScene === index ? "step" : undefined}
            >
              <p className="journey-label"><span>{String(index + 1).padStart(2, "0")}</span> {scene.label}</p>
              <div className="journey-scene-image">
                <img src={scene.image} alt="" loading={index === 0 ? "eager" : "lazy"} style={{ objectPosition: scene.position }} />
              </div>
              <h2>{scene.title}</h2>
              <p className="journey-body">{scene.body}</p>
              {index === 6 && (
                <Link className="btn ghost" href={`/${locale}/quote`}>
                  {locale === "mn" ? "ХУВИЙН НИСЛЭГ ХҮСЭХ" : "REQUEST YOUR PRIVATE FLIGHT"}<span aria-hidden="true">→</span>
                </Link>
              )}
            </article>
          ))}
        </div>
        <div className="journey-visual" aria-hidden="true">
          <div className="journey-image-stack">
            {stageImages.map((image) => (
              <img
                className={`journey-image${image === content[activeScene].image ? " is-active" : ""}`}
                src={image}
                alt=""
                loading={image === content[0].image ? "eager" : "lazy"}
                style={{ objectPosition: content[activeScene].position }}
                key={image}
              />
            ))}
            <span className="journey-image-shade" />
          </div>
          <div className="journey-image-caption">
            <span>{content[activeScene].label}</span>
            <span>{String(activeScene + 1).padStart(2, "0")} / {String(content.length).padStart(2, "0")}</span>
          </div>
          <span className="journey-progress" style={{ width: `${((activeScene + 1) / content.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
