# A-JET brand implementation

Based on the supplied October 2026 Brand Strategy and Visual Identity PDFs.

## Public website

- Space blue `#022636`, white `#FFFFFF`, grey `#E0E0E0`, gold sand `#DDBA9E`. Sky blue `#2E7DAC` is a secondary accent.
- Original A-JET Aviation wordmark and rotor symbol exported as vector paths from Visual Identity pages 9 and 11. The symbol also serves as the site icon.
- Window-shaped hero and photography from Visual Identity page 4; mountain photograph from page 6. Optimized WebP derivatives are stored in `public/img/brand/`.
- Manrope is bundled through Fontsource for Latin and Cyrillic text. The identity's primary font, Benzin, was not supplied as a licensed webfont. Headings currently fall back to Manrope. Supply licensed Benzin webfont files before enabling a local `@font-face`; do not use embedded PDF font subsets as webfonts.
- English and Mongolian defaults reflect personal care, experience and the window story (Brand Strategy pages 15, 19, 23–25). The 25-year experience statement comes from page 15.
- Existing CMS copy and custom hero images retain precedence. No database values were overwritten. Review published CMS copy if it contains older messaging.
- Homepage statistics, credentials, certificate cards and landing-site cards omit unfilled bracket placeholders. The detailed pages retain their existing data-pending states.
- Quote requests, staff CMS and the interactive aircraft remain available.

## Build repairs encountered during validation

- Content loader now imports the existing PostgreSQL adapter from `lib/db`.
- History restore uses media defaults from `lib/media`, which include photo credits.
- Database pool initialization explicitly handles an absent cached pool.
- Notification recipient callbacks have explicit string types.
- TypeScript excludes retained `page_BASE_*`, `page_BACKUP_*`, `page_LOCAL_*` and `page_REMOTE_*` merge artifacts. The files were preserved.

## Validation

Run `npm ci`, `npm run typecheck` and `npm run build`. Use `npm run dev` for local preview without a database; production runtime requires the repository's documented database configuration. No deployment or database migration is part of this update.
