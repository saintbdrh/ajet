"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    const observeReveals = (elements: NodeListOf<Element>) => {
      elements.forEach((element) => observer.observe(element));
    };

    observeReveals(document.querySelectorAll(".rv:not(.in), .reveal:not(.in)"));
    root.classList.add("motion-ready");

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches(".rv:not(.in), .reveal:not(.in)")) observer.observe(node);
            observeReveals(node.querySelectorAll(".rv:not(.in), .reveal:not(.in)"));
          }
        });
      });
    });
    mutationObserver.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, [pathname]);

  return null;
}
