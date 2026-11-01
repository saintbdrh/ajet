# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Next.js 16 is newer than most training data — check `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Project

Ajet: bilingual (Mongolian default, English) helicopter charter site with a staff admin. Next.js 16 App Router deployed to Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`), with Postgres (`pg`), S3-compatible object storage for uploads (R2 in production), and Cloudflare Access (admin auth). Target host is Vercel (VPS possible later). Goal: stay migration-ready for a future VPS, so prefer portable services over Cloudflare-specific bindings; D1 was already replaced by Postgres. README.md documents Cloudflare provisioning, admin features, and known operational limits. `docs/` has the ERD, full endpoint reference, auth and flow diagrams — update it when endpoints, tables, or flows change.

## Commands

```bash
npm run dev          # next dev; initOpenNextCloudflareForDev() exposes local wrangler bindings
npm run typecheck    # tsc --noEmit — the only automated check (no test suite, no linter configured)
npm run build        # next build
npm run cf:preview   # build + run in local Workers runtime (closest to production)
npm run cf:deploy    # deploy to Cloudflare
npm run cf:typegen   # regenerate cloudflare-env.d.ts after changing wrangler.jsonc bindings
npm run db:up        # start local Postgres (port 5433) + RustFS S3 storage (9000, console 9001) in Docker
npm run storage:setup # create bucket, CORS, public read (run once; also sets CORS on R2)
npm run db:migrate   # apply migrations/*.sql to DATABASE_URL from .env.local (tracked in schema_migrations)
npm run db:down      # stop local Postgres
```

Requires Node 22+ (wrangler refuses Node 20). Local setup: copy `.dev.vars.example` → `.dev.vars` (Worker vars) and `.env.example` → `.env.local` (public settings + `DATABASE_URL`). `postinstall` runs `scripts/patch-open-next-preview-manifest.mjs`, which patches the OpenNext adapter to bundle `preview-props.json`; it throws if the patch target changes after an adapter upgrade.

## Architecture

**Routing.** `/` redirects to `/mn` (`next.config.ts`). Public pages live under `app/[locale]/` (home, fleet, destinations, quote, quote/response); `dynamicParams = false` restricts locales to `mn`/`en`. Admin is a single client app (`app/admin` → `components/AdminDashboard.tsx`) backed by `app/api/admin/*` routes. `app/media/[...key]` serves R2 objects under `uploads/`.

**Database.** `lib/db.ts` wraps a `pg` Pool behind a D1-shaped API: `db.prepare(sql).bind(...).all/first/run()` with `?` placeholders (rewritten to `$n`), `db.batch([...])` (one transaction), and `db.transaction(async (tx) => ...)` for conditional multi-step writes (throw to roll back). Queries throw on error; the `success`/`error` result fields exist only for compatibility. `getDatabase()` returns `null` without `DATABASE_URL` in dev/build and throws in production. INT8 parses to number and TIMESTAMPTZ to ISO strings; boolean-ish columns are `INTEGER` 0/1. Don't use SQLite-isms (`changes()`, `datetime()`, `INSERT OR`).

**Storage.** `lib/storage.ts` (S3 SDK) works with RustFS locally (MinIO has no free images anymore) and R2 in production — config only. Uploads go browser → bucket via presigned PUT (`/api/admin/media` start → PUT → complete); the server verifies size/type/magic bytes and marks the `media_assets` row `ready`. Content routes must only accept `/img/...` keys or ready uploads (`usableMediaKind` in `lib/media-assets.ts`). `lib/media.ts` is browser-safe (types, limits, `mediaUrl`, `defaultMediaSlots`); client components must import from it, never from `lib/content.ts` (pulls in `pg`). Photo slots may hold a video (`.mp4`/`.webm`) + `poster_key`; render slots with `components/MediaView.tsx`, and use `slotStill()` where only an image works. Keep `requestChecksumCalculation: "WHEN_REQUIRED"` and signed content-type headers on presigning — R2 rejects SDK checksum presigns.

**Cloudflare bindings.** Remaining bindings (Access vars, secrets) go through `getCloudflareEnv()` in `lib/cloudflare.ts`, typed in `cloudflare-env.d.ts`.

**Content with fallbacks.** `lib/content.ts` loads fleet, destinations, prices, media slots, and site copy from Postgres, falling back to hard-coded defaults/placeholders when no database is configured or tables are empty, so public pages render without a database. Site copy: `lib/i18n.ts` holds the built-in dictionary (`t(locale)`) and `CMS_COPY_KEYS` — the whitelist of keys editable via the admin; `site_copy` rows override dictionary values. Adding an editable string means adding the key to `CMS_COPY_KEYS`, the dictionary, and the admin field grouping in `lib/cms-fields.ts`. Admin UI strings are separate, in `lib/admin-dictionary.ts`. Media keys starting with `/img/` are static files in `public/`; others are bucket keys, resolved by `mediaUrl()` to `NEXT_PUBLIC_MEDIA_BASE_URL` (or the `/media/` proxy).

**Admin API pattern.** Every `app/api/admin/*` handler starts with `requireAdmin(request, [roles])` from `lib/admin-api.ts` and returns early if `isAdminResponse(...)`. It enforces same-origin on mutations, verifies the `cf-access-jwt-assertion` JWT against the Access JWKS (`lib/admin.ts`), and checks `ADMIN_ALLOWED_EMAILS` + `ADMIN_ROLE_MAPPINGS`. Roles: `owner` (passes every check), `dispatcher` (quotes), `content_editor` (copy/photos/prices/aircraft/destinations). Routes declare `export const runtime = "nodejs"`, validate input with zod, and respond `{ ok: boolean, error?, ... }`.

**Revisions.** Content mutations write a `content_revisions` row in the same `db.batch([...])` via `contentRevisionStatement()` (`lib/content-revisions.ts`) storing `{before, after}` snapshots; restores are recorded as new revisions. Mutations call `revalidatePath("/[locale]/...", "page")` for affected public pages. Quote lifecycle events are logged separately from content revisions.

**Quote workflow.** `POST /api/quote` (public, Turnstile-protected, idempotency key, best-effort in-process rate limit) persists the request before notifying ops via email (Resend) / Telegram (`lib/notifications.ts`), recording each delivery attempt. Dispatchers create numbered quote revisions in the admin; clients approve/decline via a single-use expiring link handled by `/api/quote/decision`. Confirmation requires a published, non-placeholder, source-checked aircraft with enough seats. Production intake fails closed if the database or the Turnstile secret is missing.

**Data conventions.** Money is stored as integer minor units with a currency (`lib/money.ts`). Localized fields are `{ mn, en }`. Aircraft specs and destination coordinates have a source URL + "verified" flag and stay hidden publicly until verified; seed records are flagged `placeholder`.

**Migrations.** Sequential Postgres SQL files in `migrations/` (`NNNN_description.sql`), each applied in its own transaction by `scripts/migrate.mjs`. Add new numbered files; never edit applied ones.
