# A-JET improvement pass — 5 November 2026

## Implemented
1. Editorial homepage: film → personal care → services → aircraft → experiences → airport → enquiry process.
2. Shared visual refinement, official space blue / white / sand, Manrope, window-shaped imagery. Benzin needs licensed webfont files.
3. Planner progression and accessible review dialog before enquiry; date validation.
4. Landing-site and direct-distance guidance beside the primary action and in review.
5. Aircraft gallery with native dialog, keyboard navigation; existing 3D views retained.
6. Dedicated charter, catering, photography and transfer service detail routes.
7. Experience-led trip discovery on homepage and destination page. Imagery is inspirational, not a claimed photograph of a specific destination.
8. Editable enquiry review, service-specific wording, privacy link and existing reference-number confirmation.
9. Passenger preparation information, actual aircraft photography; no invented testimonials, credentials or safety guarantees.
10. Mobile grids, readable inputs, keyboard focus, modal focus containment, reduced motion; manual hero pause remains respected.
11. Authenticated request ownership and internal notes, service filters, audit trail. Migration 0005 required. Preview remains read-only.
12. Environment readiness checker, sitemap, robots, social image metadata, error recovery and enquiry information page.

## Assets
Existing extracted Visual Identity images under public/img/brand, actual client cabin/exterior photos under public/img/ajet, Blender studio detail render, original AJET_Hero_1080p.mp4 and matching poster remain in use. No new stock images or generated imagery.

## External dependencies / launch gates
- Run all migrations in staging, then review production migration plan; this update does not mutate a live database.
- Configure database, staff access, media storage, domain, Turnstile and email. Run node --env-file-if-exists=.env.local scripts/check-launch.mjs (presence check only).
- Verify real delivery and authenticated staff flows with client-designated test recipients before launch.
- Client to confirm credentials/team profiles, contact details, operating information, lounge/ground service readiness and legal privacy notice including retention and processor details. The public information page explains the actual enquiry flow; it is not a claim of legal compliance.
- Analytics deliberately not activated without provider/privacy configuration. Map production provider and attribution require owner review.
- No prices published, no deployment, no client messages sent.
