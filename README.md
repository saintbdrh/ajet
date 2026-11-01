# Ajet

Premium Mongolian helicopter charter website built with Next.js 16, Cloudflare Workers, D1, R2, and Cloudflare Access.

## Premium redesign

The homepage uses the supplied AJET helicopter hero film with a poster fallback, pause control and reduced-motion support. Uploaded custom hero photography overrides the default film.

The homepage and fleet page include an interactive EC145 viewer: drag/touch/arrow-key rotation, wheel/pinch/button zoom, reset and front/profile/rear camera presets. The supplied Blender model is exported as a Draco-compressed 707 KB GLB with 23 material groups. Model-viewer 4.4.0 and its Draco decoder are vendored under `public/vendor` with licences; the model and viewer load only after the visitor selects Explore in 3D. Static renders remain available if WebGL or model loading fails. Original `.blend` files are never modified. Re-export with Blender using `scripts/export-aircraft.py`; its command is documented in the script. These visual assets do not establish verified operational specifications.

The staff workspace has persistent navigation, a light interface, section search, request-status filters, queue counts and unsaved-copy protection. Existing server-side roles and Cloudflare Access remain required. Request search and counts cover the latest 250 loaded requests, not the entire database.

For a local design review, run `npm run dev -- --webpack` and visit `/admin/design-preview`. This development-only page uses clearly labelled illustrative records and disables its dashboard save operations. It returns 404 in production. The real `/admin` and all admin API routes retain their existing authentication and authorisation.

Fonts are served from the installed Noto Sans package, including Cyrillic, without build-time Google Fonts downloads. No database schema changes are needed for this redesign.

## Local preview

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
Copy-Item .env.example .env.local
npm run dev
```

The public pages use clearly marked sample fleet and destination data until the D1 database is connected. The admin at `/admin` requires a Cloudflare Access session and configured Worker bindings.

## Cloudflare resources

1. Sign in with `npx wrangler login`.
2. Create D1 and copy the returned ID into `wrangler.jsonc`:

   ```powershell
   npx wrangler d1 create tenger-db
   ```

3. Create the media and Next.js cache buckets:

   ```powershell
   npx wrangler r2 bucket create tenger-media
   npx wrangler r2 bucket create tenger-opennext-cache
   ```

4. Apply the schema locally during development and remotely before launch:

   ```powershell
   npm run db:local
   npm run db:remote
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

`wrangler.jsonc` contains a zero UUID placeholder for the D1 ID. Replace it with the ID returned by `wrangler d1 create` before deploying. The Cloudflare account, database, buckets, Access policy, domain, and secrets must be provisioned in the client's Cloudflare account; this workspace does not have those credentials.

## Admin features

- Manage the website in Mongolian by default, with an English switch. The text editor groups fields by page section, shows Mongolian and English together, and supports resetting a field to its original default.
- Edit the homepage journey scene labels, titles, and descriptions as bilingual website copy.
- Replace the named homepage and journey photos in the Photos screen. Existing `/img/` files remain the fallback until a photo is saved. Images are resized in the browser, focal position and bilingual alternative text can be edited, and previous versions remain available to restore.
- Add, edit, reorder, publish, hide, and remove aircraft and destinations, including their photos, focal position, and bilingual alternative text.
- Add prices in integer minor units with currency and unit, then choose whether to publish them. No prices are pre-filled. Published starting prices appear on the public site with a bilingual disclaimer; the dispatcher quote form may suggest a matching price, but staff must review it and public pricing never creates or replaces a written quote.
- Review the last 20 changes to copy, photos, prices, aircraft, and destinations, and restore a prior version. Restores are recorded as new revisions. Hiding is the default removal action; permanent deletion is owner-only.
- Review flight requests saved in D1, create numbered quote revisions with a currency, terms, and expiry, and email them to the client through Resend.
- Clients can approve or decline a quote through a single-use, expiring capability link. Client approval is not flight confirmation.
- A dispatcher can confirm an approved request only after selecting a published, non-placeholder aircraft whose specifications were marked source-checked and have sufficient seats, then recording an operational approval note. This is a human attestation; the application does not verify crew, maintenance, airspace, weather clearance, or aircraft availability.
- Fleet specifications and destination coordinates stay hidden from the public map/specification view until an editor adds an HTTPS reference and explicitly marks the data checked. The checkbox records a human attestation; it does not independently validate the source or the aircraft's operational status.
- Quote lifecycle transitions and quote-related dispatcher actions are recorded separately from the website content revision history.
- Request submissions use an idempotency key, persist before delivery, and record email/Telegram delivery attempts. If every configured channel fails, the client receives an error and can retry with the same key; there is no scheduled notification retry worker.
- Dispatcher queues show the most recent 250 requests, with text search and status filters across those loaded records. A calendar, aircraft scheduling/conflict checks, and a full audit-log viewer are not implemented.

## Operational and security limits

- Production quote intake fails closed if D1 or the Turnstile secret is unavailable. Configure both the Turnstile site key and secret. The in-process rate limiter is best-effort only; add and test a Cloudflare edge rate-limiting rule for `POST /api/quote` before launch.
- Admin mutations validate the same-origin request, verify the Cloudflare Access JWT, enforce the email allowlist and role mapping, and reject cross-origin requests. MFA still needs to be required in Cloudflare Access.
- Content editors can manage website text, photos, prices, aircraft, and destinations; dispatchers can manage flight requests; owners can manage all sections and permanently delete aircraft or destinations. These permissions are enforced on the server.
- Migrations `0006_admin_editor_foundation.sql` and `0007_seed_journey_photo_alt.sql` add photo slots, published-price data, display metadata, website content revision history, and descriptive default alternative text for Journey images. Apply them with `npm run db:local` for local development or `npm run db:remote` only after reviewing and approving the migrations for the client-owned database.
- Photo uploads are restricted to JPEG, PNG, and WebP, checked against image signatures, limited to 10 MB, and stored under generated R2 object names. Previous objects are retained. Upload throttling is process-local best-effort and should be supplemented with an edge rate limit for production.
- Quote email delivery, customer quote-response links, and expiry handling require a functioning Resend configuration. The quote workflow has been implemented, but production email delivery and client approval must be tested with client-owned credentials before launch.
- No Cloudflare account resources or credentials are configured in this workspace. The D1 UUID in `wrangler.jsonc` is still a placeholder; remote migrations, R2, Access, MFA, domains, secrets, notifications, and production deployment are not verified.
- Backups, restore drills, uptime monitoring, alerting, and retention/deletion policies for customer data are not configured. The client should establish and test these in the client-owned Cloudflare account before accepting live customer data.
- Fleet and destination seed records are marked as placeholders. No aircraft specifications or route data have been independently verified against authoritative sources; replace or verify them before publication.

## Other service configuration

- `.env.example` contains local public-site settings such as brand, map tiles, and weather.
- `.dev.vars.example` lists local Worker variables. Create `.dev.vars` from it and fill in the Cloudflare Access values when testing against a configured environment.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `QUOTE_FROM_EMAIL`, `QUOTE_TO_EMAIL`, and `TURNSTILE_SECRET_KEY` are server-side Worker secrets.
- Replace the preview photography with client-approved helicopter and destination images before launch. The hero photo is from Wikimedia Commons and credited in the footer; landscape preview photos are from Unsplash.
- The map's default public OpenStreetMap tile service is for development only. Configure a commercial provider before launch.
