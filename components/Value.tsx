import type { ReactNode } from "react";

/**
 * Renders a value that may still be a bracketed placeholder, e.g. "[AOC No.]".
 * Placeholders get a discreet marker so staff can see what is outstanding,
 * without the site pretending the figure is real.
 */
export default function Value({ children, className }: { children: ReactNode; className?: string }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  const pending = text.includes("[");
  return (
    <span className={[className, pending ? "is-pending" : ""].filter(Boolean).join(" ")}>
      {text}
      {pending && <span className="sr-only"> (to be confirmed)</span>}
    </span>
  );
}
