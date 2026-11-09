# Homepage scene asset slots

The helicopter uses the supplied split-rotor EC145 model. Terrain and cloud layers remain labeled placeholders until A-JET supplies production photography. Do not replace them with generated or non-Mongolian scenery.

| Asset | Path | Recommended delivery |
|---|---|---|
| Sky backdrop | `public/img/home/scene/sky-background.webp` | Current 1500 × 320 px, 15 KB cloud-sky crop from the existing site image; replace with A-JET sky photography when available |
| Mongolian mountain plate | `public/img/home/scene/mongolia-mountains.avif` | 2400 × 1350 px, AVIF/WebP, under 500 KB; real Mongolian terrain, sunset exposure |
| Rear cloud layer | `public/img/home/scene/clouds-back.webp` | 2400 × 700 px, transparent WebP/PNG, under 250 KB |
| Front cloud layer | `public/img/home/scene/clouds-front.webp` | 2400 × 700 px, transparent WebP/PNG, under 250 KB |
| EC145 with animated rotor pivots | `public/models/ajet-ec145-hero.glb` | Validated 720 KB Draco-compressed GLB, extracted from the supplied EC145 web model |
| Fly-in sequence (optional override) | `public/scene/fly-in/frame-000.avif` … | 60–90 transparent AVIF/WebP frames, consistent 1920 × 1080 canvas, total sequence under 4 MB |
| Category icon set | `public/img/home/icons/{charter,catering,photography}.svg` | 48 × 48 viewBox, consistent 1.5 px stroke, one icon per service |

Drop landscape/cloud files at the listed paths, then set the corresponding paths in `public/scene/home-assets.json`; this configuration does not require application-code changes. The helicopter loads from the split-rig GLB directly and does not need image-layer configuration. The fly-in frames use `public/scene/fly-in/manifest.json`: list their same-origin paths and byte sizes in playback order, for example `{"frames":[{"src":"/scene/fly-in/frame-000.avif","bytes":51000}]}`. The client validates the 60–90 frame count and declared 4 MB maximum, then progressively requests frames near the current scroll position. A non-empty frame sequence replaces the live GLB animation.

## Helicopter motion

The live GLB animation starts with the aircraft offset to the lower right, banks gently, and settles at center with the scene's scroll progress. The main rotor spins at 41 rad/s and the tail rotor at 220 rad/s in the opposite direction. Rendering pauses offscreen, is capped at 60 fps (20 fps on low-end devices), and uses reduced pixel ratio/no antialiasing on low-end devices. Reduced-motion mode holds the aircraft centered with both rotors still. The optional frame sequence replaces this animation and must include the complete helicopter in each frame.

The hero model is the supplied split-rotor test export. To regenerate it after changing the source model, run Blender 4.2+ with `scripts/blender/split-ec145-rotors.py`, using `public/models/ajet-ec145.glb` as input and `public/models/ajet-ec145-hero.glb` as output. The site loads the local Draco decoder from `public/vendor/draco/`.

The interface uses Manrope with the `cyrillic-ext` subset; the display fallback is Noto Serif. The configured font subsets include Mongolian Cyrillic letters Ө and Ү.

The current site has no analytics provider installed. The scene emits a `category_focus` browser event and pushes the same `{ event, id, method }` object to `window.dataLayer` when a tag manager provides one.
