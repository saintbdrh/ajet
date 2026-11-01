# Ajet technical docs

Diagrams use [Mermaid](https://mermaid.js.org/) and render on GitHub and in VS Code (with a Mermaid preview extension).

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | System overview, request paths, code layout, environment variables |
| [database.md](database.md) | ERD, every table and column, status values, migrations |
| [api.md](api.md) | Every page and API endpoint: method, role, input, responses |
| [auth.md](auth.md) | Staff auth (Cloudflare Access + roles), client quote links, quote form protection |
| [flows.md](flows.md) | Quote lifecycle state machine and sequence diagrams for the main flows |

Current state (2026-11): Postgres (Neon in production) and S3-compatible file storage (Cloudflare R2 in production, RustFS in Docker locally) are portable. Admin auth (Cloudflare Access) and hosting (Workers via OpenNext) are still Cloudflare-specific; the target host is Vercel, with a VPS possible later.
