# Ajet

Premium Mongolian helicopter charter website built with Next.js 16, Postgres, Cloudflare Workers, R2, and Cloudflare Access. The database layer is portable (any Postgres via `DATABASE_URL`); R2, Access, and Workers hosting are still Cloudflare-specific.

## Local preview

Requires Node.js 22+ and Docker.

```bash
npm ci
cp .dev.vars.example .dev.vars
cp .env.example .env.local
npm run db:up          # start local Postgres (port 5433) and S3 storage (port 9000) in Docker
npm run db:migrate     # apply migrations/
npm run storage:setup  # create the media bucket (first time only)
npm run dev
```

If `DATABASE_URL` is empty, public pages fall back to clearly marked sample fleet and destination data. The admin at `/admin` requires a Cloudflare Access session and configured Worker bindings.

## Cloudflare resources

1. Sign in with `npx wrangler login`.
2. Create a production Postgres database (for example Neon) and set its connection string as the `DATABASE_URL` secret.

3. Create the R2 media bucket (free tier: 10 GB, free egress) and an R2 API token with read/write access to it. Enable public access (custom domain or r2.dev URL). Set `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `NEXT_PUBLIC_MEDIA_BASE_URL=<public bucket URL>`. Then allow browser uploads from the site:

   ```bash
   S3_CORS_ORIGINS=https://your-domain node --env-file=.env.production.local scripts/storage-setup.mjs
   ```

   While still deploying with OpenNext, also create its cache bucket: `npx wrangler r2 bucket create tenger-opennext-cache`.

4. Apply the schema to the production database before launch (only after reviewing the migrations for the client-owned database):

   ```bash
   DATABASE_URL=<production url> node scripts/migrate.mjs
   ```

5. Configure Cloudflare Zero Trust > Access > Applications. Protect `/admin*` and `/api/admin*` on the production hostname, allow only approved staff, and require MFA in the Access policy. Set Worker vars `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and `ADMIN_ALLOWED_EMAILS`, then assign a server-enforced role to each staff email using `ADMIN_ROLE_MAPPINGS`, for example:

   ```text
   ADMIN_ALLOWED_EMAILS=owner@example.com,ops@example.com,editor@example.com
   ADMIN_ROLE_MAPPINGS=owner@example.com:owner,ops@example.com:dispatcher,editor@example.com:content_editor
   ```

   `owner` can manage all sections, `dispatcher` can access flight requests, and `content_editor` can manage copy, aircraft, destinations, and media. Users without an explicit role are denied. MFA is enforced by the Cloudflare Access policy, not by this application; verify that the policy requires it for every administrator.
6. Set `PUBLIC_SITE_URL` to the canonical public origin (for example, `https://charter.example.com`). Add notification and Turnstile secrets in the Worker settings or with `npx wrangler secret put`. Never commit production secrets. Turnstile's public site key must also be available as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build time.
7. Preview and deploy:

   ```powershell
   npm run cf:preview
   npm run cf:deploy
   ```

The install-time script includes Next 16.4's `preview-props.json` in the OpenNext Worker bundle; it fails clearly if the adapter's patch target changes.

The Cloudflare account, production database, buckets, Access policy, domain, and secrets must be provisioned in the client's Cloudflare account; this workspace does not have those credentials.

## Admin features

- Manage the website in Mongolian by default, with an English switch. The text editor groups fields by page section, shows Mongolian and English together, and supports resetting a field to its original default.
- Edit the homepage journey scene labels, titles, and descriptions as bilingual website copy.
- Replace the named homepage and journey photos in the Photos screen. Existing `/img/` files remain the fallback until a photo is saved. Images are resized in the browser, focal position and bilingual alternative text can be edited, and previous versions remain available to restore.
- Add, edit, reorder, publish, hide, and remove aircraft and destinations, including their photos, focal position, and bilingual alternative text.
- Add prices in integer minor units with currency and unit, then choose whether to publish them. No prices are pre-filled. Published starting prices appear on the public site with a bilingual disclaimer; the dispatcher quote form may suggest a matching price, but staff must review it and public pricing never creates or replaces a written quote.
- Review the last 20 changes to copy, photos, prices, aircraft, and destinations, and restore a prior version. Restores are recorded as new revisions. Hiding is the default removal action; permanent deletion is owner-only.
- Review flight requests saved in the database, create numbered quote revisions with a currency, terms, and expiry, and email them to the client through Resend.
- Clients can approve or decline a quote through a single-use, expiring capability link. Client approval is not flight confirmation.
- A dispatcher can confirm an approved request only after selecting a published, non-placeholder aircraft whose specifications were marked source-checked and have sufficient seats, then recording an operational approval note. This is a human attestation; the application does not verify crew, maintenance, airspace, weather clearance, or aircraft availability.
- Fleet specifications and destination coordinates stay hidden from the public map/specification view until an editor adds an HTTPS reference and explicitly marks the data checked. The checkbox records a human attestation; it does not independently validate the source or the aircraft's operational status.
- Quote lifecycle transitions and quote-related dispatcher actions are recorded separately from the website content revision history.
- Request submissions use an idempotency key, persist before delivery, and record email/Telegram delivery attempts. If every configured channel fails, the client receives an error and can retry with the same key; there is no scheduled notification retry worker.
- Dispatcher queues currently show the most recent 250 requests. Search/filter controls, a calendar, aircraft scheduling/conflict checks, and a full audit-log viewer are not implemented.

## Operational and security limits

- Production quote intake fails closed if the database or the Turnstile secret is unavailable. Configure both the Turnstile site key and secret. The in-process rate limiter is best-effort only; add and test a Cloudflare edge rate-limiting rule for `POST /api/quote` before launch.
- Admin mutations validate the same-origin request, verify the Cloudflare Access JWT, enforce the email allowlist and role mapping, and reject cross-origin requests. MFA still needs to be required in Cloudflare Access.
- Content editors can manage website text, photos, prices, aircraft, and destinations; dispatchers can manage flight requests; owners can manage all sections and permanently delete aircraft or destinations. These permissions are enforced on the server.
- Migrations live in `migrations/` as Postgres SQL and are tracked in the `schema_migrations` table by `scripts/migrate.mjs`. The former D1 migrations 0001-0007 were consolidated into `0001_initial_schema.sql`.
- Uploads go directly from the browser to S3-compatible storage with signed URLs and are verified by the server (size, type, file signature) before use. Photos: JPEG, PNG, WebP up to 10 MB (resized to WebP in the browser). Videos (photo slots only): MP4 or WebM up to 50 MB and 60 seconds, with an automatic poster frame. Objects use generated names and are never deleted. Upload throttling is process-local best-effort; add an edge rate limit for production. Abandoned unfinished uploads are not cleaned up yet.
- Quote email delivery, customer quote-response links, and expiry handling require a functioning Resend configuration. The quote workflow has been implemented, but production email delivery and client approval must be tested with client-owned credentials before launch.
- No Cloudflare account resources or credentials are configured in this workspace. No production database exists yet; remote migrations, R2, Access, MFA, domains, secrets, notifications, and production deployment are not verified.
- Backups, restore drills, uptime monitoring, alerting, and retention/deletion policies for customer data are not configured. The client should establish and test these in the client-owned Cloudflare account before accepting live customer data.
- Fleet and destination seed records are marked as placeholders. No aircraft specifications or route data have been independently verified against authoritative sources; replace or verify them before publication.

## Other service configuration

- `.env.example` contains local public-site settings such as brand, map tiles, and weather.
- `.dev.vars.example` lists local Worker variables. Create `.dev.vars` from it and fill in the Cloudflare Access values when testing against a configured environment.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `QUOTE_FROM_EMAIL`, `QUOTE_TO_EMAIL`, and `TURNSTILE_SECRET_KEY` are server-side Worker secrets.
- Replace the preview photography with client-approved helicopter and destination images before launch. The hero photo is from Wikimedia Commons and credited in the footer; landscape preview photos are from Unsplash.
- The map's default public OpenStreetMap tile service is for development only. Configure a commercial provider before launch.
