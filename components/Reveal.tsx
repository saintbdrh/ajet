"use client";
import type { ReactNode } from "react";

type RevealDirection = "up" | "left" | "right" | "image";

export default function Reveal({
  children,
  direction = "up",
}: {
  children: ReactNode;
  direction?: RevealDirection;
}) {
  return <div className={`reveal reveal--${direction}`}>{children}</div>;
}