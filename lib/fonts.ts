import { Manrope } from "next/font/google";

/**
 * Manrope — secondary typeface (VI p.16).
 *
 * `cyrillic-ext` is required: the Mongolian Cyrillic letters Ө and Ү are not
 * present in Google's `cyrillic` subset, so loading only `cyrillic` silently
 * falls back to Arial/Times for those glyphs.
 *
 * `next/font` self-hosts the files, generates unicode-range rules and
 * preloads the subsets used above the fold, so there is no layout shift.
 */
export const manrope = Manrope({
  subsets: ["latin", "cyrillic-ext"],
  variable: "--font-manrope",
  display: "swap",
  adjustFontFallback: true,
});

/*
 * Benzin — primary typeface (VI p.15).
 *
 * BLOCKED ON ASSETS: no licensed Benzin WOFF2 files (400/500/600/700/800,
 * Cyrillic-ext) exist in the repository. When they are supplied:
 *
 *   import localFont from "next/font/local";
 *   export const benzin = localFont({
 *     src: [
 *       { path: "../app/fonts/benzin-400.woff2", weight: "400" },
 *       { path: "../app/fonts/benzin-500.woff2", weight: "500" },
 *       { path: "../app/fonts/benzin-600.woff2", weight: "600" },
 *       { path: "../app/fonts/benzin-700.woff2", weight: "700" },
 *       { path: "../app/fonts/benzin-800.woff2", weight: "800" },
 *     ],
 *     variable: "--font-benzin",
 *     display: "swap",
 *   });
 *
 * then add `benzin.variable` to the <body> className. No CSS changes needed:
 * --ajet-font-display already prefers var(--font-benzin).
 */
