# Main flows

## Quote request lifecycle (`quotes.status`)

```mermaid
stateDiagram-v2
    [*] --> requested: Client submits form
    requested --> in_review: Dispatcher "review"
    in_review --> quoted: Dispatcher sends quote (email OK)
    quoted --> quoted: New revision sent (old one superseded)
    quoted --> approved: Client approves
    quoted --> declined: Client declines
    quoted --> expired: expires_at passed
    approved --> confirmed: Dispatcher confirms aircraft + operational approval
    requested --> closed: Dispatcher "close"
    in_review --> closed
    quoted --> closed
    approved --> closed
    declined --> closed
    expired --> closed
    confirmed --> [*]
    closed --> [*]
```

Every transition writes a `quote_status_history` row. Staff actions also write `admin_audit_log`.

## Quote revision lifecycle (`quote_revisions.status`)

```mermaid
stateDiagram-v2
    [*] --> draft: Dispatcher submits quote
    draft --> sent: Email delivered
    draft --> draft: Email failed (stays draft)
    sent --> superseded: Newer revision sent
    sent --> approved: Client approves
    sent --> declined: Client declines
    sent --> expired: expires_at passed
```

Expiry is applied lazily: when a dispatcher loads `GET /api/admin/quotes` or a client opens the link. There is no background job.

## 1. Client submits a flight request

```mermaid
sequenceDiagram
    actor C as Client
    participant F as Quote form
    participant API as POST /api/quote
    participant TS as Turnstile
    participant DB as Postgres
    participant TG as Telegram
    participant RS as Resend

    C->>F: Fill form
    F->>API: JSON + idempotencyKey + Turnstile token
    API->>API: Rate limit, size, honeypot, zod validation
    API->>TS: siteverify(token)
    TS-->>API: success
    API->>DB: Find quote by idempotencyKey
    alt new key
        API->>DB: BEGIN; INSERT quotes; INSERT status_history; COMMIT
    else same key, same data
        Note over API: Reuse existing quote id
    else same key, different data
        API-->>F: 409 idempotency_conflict
    end
    API->>DB: Which channels already delivered?
    par Not yet delivered
        API->>TG: Alert ops
        API->>RS: Email ops
    end
    API->>DB: INSERT quote_notification_attempts
    alt any channel delivered
        API-->>F: 200 { ok, id }
    else none delivered
        API-->>F: 503 { id, notification_failed } — saved, safe to retry
    end
```

## 2. Dispatcher sends a quote

```mermaid
sequenceDiagram
    actor D as Dispatcher
    participant API as POST /api/admin/quotes
    participant DB as Postgres
    participant RS as Resend
    actor C as Client

    D->>API: { id, amount, currency, terms, expiresAt }
    API->>DB: Load quote (must be in_review/quoted, has email)
    API->>DB: INSERT quote_revisions (draft, token hash)
    API->>RS: Email client with link #token
    API->>DB: INSERT notification attempt
    alt email failed
        API-->>D: 502 draft kept
    else email sent
        API->>DB: BEGIN
        API->>DB: older sent → superseded
        API->>DB: this revision → sent
        API->>DB: quote → quoted
        API->>DB: status_history + audit_log
        API->>DB: COMMIT
        API-->>D: 200 { revision }
        RS->>C: Quote email
    end
```

## 3. Client approves or declines

```mermaid
sequenceDiagram
    actor C as Client
    participant P as /{locale}/quote/response#token
    participant API as POST /api/quote/decision
    participant DB as Postgres

    C->>P: Open email link
    P->>API: { token, action: "view" }
    API->>DB: Find revision by SHA-256(token)
    alt expired
        API->>DB: revision + quote → expired
        API-->>P: 410 expired
    else valid
        API-->>P: Quote details
    end
    C->>P: Approve / Decline
    P->>API: { token, action }
    API->>DB: BEGIN
    API->>DB: quote quoted → approved/declined
    API->>DB: revision sent → approved/declined
    API->>DB: status_history
    API->>DB: COMMIT (ROLLBACK if either update hit 0 rows)
    API-->>P: 200 or 409 answered
    API->>API: Alert ops (Telegram/email), log attempts
```

## 4. Dispatcher confirms the flight

```mermaid
sequenceDiagram
    actor D as Dispatcher
    participant API as PATCH /api/admin/quotes
    participant DB as Postgres

    D->>API: { action: confirm, id, aircraftId, operationalApproval: true, note }
    API->>DB: Quote must be approved
    API->>DB: Aircraft published, not placeholder, verified, seats ≥ passengers
    API->>DB: BEGIN; quote → confirmed (+ aircraft, approver, time); history; audit; COMMIT
    API->>API: Email client + alert ops, log attempts
    API-->>D: { ok, status: confirmed, notificationPending }
```

Confirmation is a human attestation. The app does not check crew, maintenance, airspace, weather or aircraft availability.

## 5. Editor changes content

```mermaid
sequenceDiagram
    actor E as Editor
    participant UI as AdminDashboard
    participant API as /api/admin/{content,photos,aircraft,destinations,prices}
    participant DB as Postgres
    participant N as Next.js cache

    E->>UI: Edit and save
    opt new photo
        UI->>UI: Resize in browser
        UI->>API: POST /api/admin/media (file)
        API-->>UI: { key: uploads/uuid.jpg }
    end
    UI->>API: PUT/POST item
    API->>DB: Read current row (before)
    API->>DB: BEGIN; upsert row; INSERT content_revisions {before, after}; COMMIT
    API->>N: revalidatePath(affected pages)
    API-->>UI: { ok }
```

## 6. Restore a previous version

```mermaid
flowchart LR
    A["GET /api/admin/history?type&id"] --> B[Last 20 revisions]
    B --> C["POST /api/admin/history<br/>{restore, entityType, entityId, revisionId}"]
    C --> D["Write revision.before back to the table"]
    D --> E["New content_revisions row<br/>(restore is itself undoable)"]
    E --> F[revalidatePath]
```
