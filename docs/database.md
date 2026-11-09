# Database

Postgres. Schema migrations are applied by `npm run db:migrate` and tracked in `schema_migrations`.

Conventions:
- Yes/no flags are `INTEGER` 0/1 with a `CHECK`, not `BOOLEAN`.
- Timestamps are `TIMESTAMPTZ`; the app reads them as ISO strings.
- Money is `BIGINT` minor units (e.g. cents) plus a 3-letter `currency`.
- Bilingual text is two columns: `*_mn` and `*_en`.

## ERD

```mermaid
erDiagram
    aircraft ||--o| aircraft_display : "has photo settings"
    destinations ||--o| destination_display : "has photo settings"
    aircraft |o--o{ pricing_items : "priced for"
    destinations |o--o{ pricing_items : "priced for"
    aircraft |o--o{ quotes : "assigned to"
    quotes ||--o{ quote_revisions : "has"
    quotes ||--o{ quote_status_history : "logs"
    quotes ||--o{ quote_notification_attempts : "logs"
    quotes ||--o{ flight_legs : "records"

    aircraft {
        text id PK
        text name
        text description_mn
        text description_en
        int seats
        int range_km
        int cruise_kmh
        int payload_kg
        text image_key
        int order_index
        int is_placeholder
        int is_published
        text specification_source
        int specifications_verified
        timestamptz created_at
        timestamptz updated_at
    }
    aircraft_display {
        text aircraft_id PK,FK
        int focal_x
        int focal_y
        text alt_mn
        text alt_en
    }
    destinations {
        text id PK
        text name_mn
        text name_en
        text description_mn
        text description_en
        float latitude
        float longitude
        text image_key
        int order_index
        int is_placeholder
        int is_published
        text coordinate_source
        int coordinates_verified
        timestamptz created_at
        timestamptz updated_at
    }
    destination_display {
        text destination_id PK,FK
        int focal_x
        int focal_y
        text alt_mn
        text alt_en
    }
    pricing_items {
        text id PK
        text kind
        text label_mn
        text label_en
        text note_mn
        text note_en
        bigint amount_minor
        text currency
        text unit
        text destination_id FK
        text aircraft_id FK
        int is_published
        int order_index
        timestamptz updated_at
        text updated_by
    }
    quotes {
        text id PK
        text idempotency_key UK
        text request_hash
        text locale
        text name
        text phone
        text email
        text organization
        text origin
        text destination
        int round_trip
        text flight_date
        text flight_time
        int passengers
        text notes
        text status
        text assigned_aircraft_id FK
        text operational_approved_by
        timestamptz operational_approved_at
        timestamptz created_at
        timestamptz updated_at
    }
    quote_revisions {
        text id PK
        text quote_id FK
        int revision
        bigint amount_minor
        text currency
        text terms
        timestamptz expires_at
        text approval_token_hash UK
        text status
        text created_by
        timestamptz sent_at
        timestamptz responded_at
        timestamptz created_at
    }
    quote_status_history {
        int id PK
        text quote_id FK
        text from_status
        text to_status
        text actor
        text note
        timestamptz created_at
    }
    quote_notification_attempts {
        int id PK
        text quote_id FK
        text event
        text channel
        int succeeded
        timestamptz attempted_at
    }
    flight_legs {
        text id PK
        text quote_id FK
        int leg_order
        text origin
        text destination
        numeric planned_km
        numeric actual_km
        int block_minutes
        int pax
        timestamptz completed_at
    }
    stats_baseline {
        int id PK
        numeric total_km
        numeric total_hours
        bigint total_flights
        date as_of
    }
```

`0006_total_km_stats.sql` adds the WGS-84 mean-radius `haversine_km` helper, historical baseline, completed-leg stats view and audited leg/baseline tables. It backfills planned legs for existing charter requests (including return legs), using only unique published destinations with verified coordinates. Missing or ambiguous coordinates leave `planned_km` null. The exact stats predicate is `legs.completed_at IS NOT NULL AND booking.status = 'completed' AND booking.service = 'charter'`; distance uses `COALESCE(actual_km, planned_km)`, and each matching leg contributes one flight. Accepted, confirmed, declined, expired and closed bookings are not counted; there is no separate `cancelled` status in the current quote status constraint. RLS denies direct anonymous table access; staff APIs set transaction-scoped roles, and the public endpoint reads only the aggregate view.

The app's `closed` status is treated as cancellation for stats; each completed route leg counts as one flight, so round trips count twice. A route without a unique published, coordinate-verified destination match is retained with a null planned distance until operations records the actual distance.

To reverse just this feature, run `npm run db:rollback:stats`. This removes flight-leg and baseline data and reverts bookings marked completed to confirmed; export the stats and review affected bookings before rollback.

Run integration checks against a disposable migrated Postgres database whose database name includes `test`:

```powershell
$env:TEST_DATABASE_URL = "postgres://.../ajet_test"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:migrate
npm run test:total-km
```

Tables with no foreign keys (linked by convention only):

```mermaid
erDiagram
    site_copy {
        text locale PK
        text key PK
        text value
        timestamptz updated_at
    }
    media_slots {
        text slot_key PK
        text image_key
        text poster_key
        int focal_x
        int focal_y
        text alt_mn
        text alt_en
        text credit_text
        text credit_url
        timestamptz updated_at
        text updated_by
    }
    media_assets {
        text id PK
        text key UK
        text kind
        text mime
        bigint size_bytes
        int width
        int height
        int duration_ms
        text status
        text uploaded_by
        timestamptz created_at
    }
    content_revisions {
        int id PK
        text entity_type
        text entity_id
        text snapshot_json
        text actor
        timestamptz created_at
    }
    admin_audit_log {
        int id PK
        text actor
        text action
        text entity
        text entity_id
        text detail
        timestamptz created_at
    }
    schema_migrations {
        text name PK
        timestamptz applied_at
    }
```

- `content_revisions.entity_type` + `entity_id` point at a row in `site_copy` (`entity_id` = `locale:key`), `media_slots`, `pricing_items`, `aircraft` or `destinations`. `snapshot_json` = `{"before": {...} | null, "after": {...} | null}`.
- `admin_audit_log.entity_id` holds a quote id for quote actions.
- `media_slots.image_key` / `aircraft.image_key` / `destinations.image_key` / `media_slots.poster_key`: `/img/...` = static file in `public/`; `uploads/<uuid>.<ext>` = object in the bucket, matching a `media_assets.key` with `status = 'ready'` (checked on save). A slot whose `image_key` ends in `.mp4`/`.webm` is a video and must have a `poster_key` image.
- `media_slots.credit_text` / `credit_url`: attribution shown in the site footer (deduplicated). Cleared in the admin when a new file is uploaded to the slot.

## Table groups

| Group | Tables | Written by |
|---|---|---|
| Website content | `site_copy`, `media_slots` | Admin: Text, Photos |
| Uploads | `media_assets` | Admin upload (any photo picker) |
| Catalog | `aircraft`, `aircraft_display`, `destinations`, `destination_display`, `pricing_items` | Admin: Fleet, Destinations, Prices |
| Quote workflow | `quotes`, `quote_revisions`, `quote_status_history`, `quote_notification_attempts` | Public form, client link, Admin: Requests |
| Logs | `content_revisions`, `admin_audit_log` | Every content change / quote staff action |

## Allowed values

| Column | Values |
|---|---|
| `quotes.status` | `requested`, `in_review`, `quoted`, `approved`, `confirmed`, `declined`, `expired`, `closed` |
| `quote_revisions.status` | `draft`, `sent`, `approved`, `declined`, `expired`, `superseded` |
| `quote_notification_attempts.event` | `request_received`, `quote_sent`, `client_approved`, `client_declined`, `flight_confirmed` |
| `quote_notification_attempts.channel` | `telegram`, `email` |
| `pricing_items.kind` | `route`, `hourly`, `membership`, `other` |
| `pricing_items.unit` | `per_flight`, `per_hour`, `per_package` |
| `content_revisions.entity_type` | `copy`, `photo`, `price`, `aircraft`, `destination` |
| `media_assets.kind` / `status` | `image`, `video` / `pending`, `ready` |
| `media_slots.slot_key` | `hero`, `membership`, `corporate`, `journey-01` … `journey-07` |
| `locale` | `mn`, `en` |
| `quotes.passengers` | 1–20 |
| `focal_x`, `focal_y` | 0–100 (percent) |

## Public visibility rules

- Only rows with `is_published = 1` appear on the public site.
- Aircraft specs (seats, range, speed, payload) are shown only when `specifications_verified = 1`.
- Destination coordinates source is shown only when `coordinates_verified = 1`.
- Rows with `is_placeholder = 1` are seed data; a placeholder aircraft cannot be assigned to a confirmed flight.

## Seed data

Migration 0001 inserts: 1 placeholder aircraft (`sample-1`), 4 placeholder destinations (`ub`, `terelj`, `khuvsgul`, `gobi`), 10 media slots pointing to `/img/*` files, and the `priceDisclaimer` text in both languages. No prices are seeded.
