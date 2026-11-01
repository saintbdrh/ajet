# Auth and protection

There are three separate mechanisms. Only staff have accounts.

| Who | Mechanism | Code |
|---|---|---|
| Staff | Cloudflare Access (login + MFA) → JWT → email allowlist → role | `lib/admin.ts`, `lib/admin-api.ts` |
| Client answering a quote | Single-use, expiring secret link (capability token) | `app/api/quote/decision/route.ts` |
| Public quote form | Turnstile + honeypot + rate limit + idempotency key | `app/api/quote/route.ts` |

## Staff login

The app has no login page. Cloudflare Access sits in front of `/admin*` and `/api/admin*`, signs the staff member in (with MFA, set in the Access policy), and adds a signed JWT header to every request.

```mermaid
sequenceDiagram
    actor S as Staff
    participant CA as Cloudflare Access
    participant App as Next.js (/admin, /api/admin/*)
    participant JWKS as Access certs<br/>{team}.cloudflareaccess.com/cdn-cgi/access/certs

    S->>CA: GET /admin
    CA->>S: Login page (IdP + MFA)
    S->>CA: Sign in
    CA->>App: Request + Cf-Access-Jwt-Assertion
    App->>JWKS: Fetch signing keys (cached)
    App->>App: Verify signature, issuer, audience (CF_ACCESS_AUD)
    App->>App: email in ADMIN_ALLOWED_EMAILS?
    App->>App: role from ADMIN_ROLE_MAPPINGS
    alt valid + role allowed
        App-->>S: Page / JSON
    else no or bad token
        App-->>S: 401 (admin page shows 404)
    else role not allowed
        App-->>S: 403
    else Access vars missing
        App-->>S: 503
    end
```

### Admin request checks (`requireAdmin`)

```mermaid
flowchart TD
    R[Admin API request] --> M{"Mutation?<br/>POST/PUT/PATCH/DELETE"}
    M -- yes --> O{"Origin = site origin<br/>and not cross-site?"}
    O -- no --> F403a[403 cross-origin]
    O -- yes --> J
    M -- no --> J{"Valid Access JWT?"}
    J -- no --> F401[401]
    J -- yes --> E{"Email allowed<br/>and has role?"}
    E -- no --> F401b[401]
    E -- yes --> RO{"role = owner<br/>or in allowed roles?"}
    RO -- no --> F403b[403 role]
    RO -- yes --> H[Run handler]
```

### Roles

| Role | Can do |
|---|---|
| `owner` | Everything, including permanent delete of aircraft/destinations |
| `content_editor` | Text, photos, uploads, aircraft, destinations, prices, history/restore |
| `dispatcher` | Flight requests: review, send quotes, confirm, close |

Config example:

```text
ADMIN_ALLOWED_EMAILS=owner@example.com,ops@example.com,editor@example.com
ADMIN_ROLE_MAPPINGS=owner@example.com:owner,ops@example.com:dispatcher,editor@example.com:content_editor
```

A malformed mapping makes all admin requests fail with 503 (fail closed).

## Client quote link

```mermaid
sequenceDiagram
    actor D as Dispatcher
    participant App
    participant DB as Postgres
    participant R as Resend
    actor C as Client

    D->>App: POST /api/admin/quotes
    App->>App: token = 2 random UUIDs (72 chars)
    App->>DB: store SHA-256(token) only
    App->>R: email link /{locale}/quote/response#token
    R->>C: Email
    C->>App: Open page (token stays in URL hash, never sent to server logs)
    C->>App: POST /api/quote/decision {token, action}
    App->>DB: find revision by SHA-256(token)
    App-->>C: quote / approved / declined / expired / answered
```

- The token is in the URL **hash**, so it is not sent in the page request or `Referer`.
- Only the hash is stored; a database leak does not reveal working links.
- Single use: approve/decline only works while the revision is `sent` and the quote is `quoted`.
- Expiring: after `expires_at` the link returns 410.
- A newer revision supersedes the old link.
- Client approval is **not** flight confirmation; a dispatcher must confirm.

## Public form protection

| Layer | Detail |
|---|---|
| Turnstile | Verified server-side; production refuses requests if the secret is missing |
| Honeypot | Hidden `website` field; bots get a fake success |
| Rate limit | 5 per 10 min per IP, in memory (resets on restart, not shared) — add an edge/proxy rule |
| Size limit | 16 KB body |
| Idempotency | Same `idempotencyKey` returns the same quote; different data → 409 |

## Planned change (VPS portability)

Cloudflare Access only works behind Cloudflare. To move to a VPS, staff login will move into the app: email + password + TOTP MFA, sessions stored in Postgres, same three roles and the same `requireAdmin(request, roles)` interface so route handlers do not change.
