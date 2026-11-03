# Client briefing implementation — 3 November 2026

## Public positioning

The existing A-JET identity remains the brand authority. The new visual research informs a restrained, mature service tone; its third-party logos and reference photographs are not reused as A-JET assets. The presentation is technical background and includes historical aircraft data and other operators' imagery, not proof of the current A-JET configuration or capabilities.

Three principal services are presented in Mongolian and English: helicopter charter, VIP catering coordinated with Sparrow, and photography/video. Ground transfers are an additional request. The two branded vehicles are described as a service being developed, not guaranteed available transport.

The two supplied photographs show the actual A-JET aircraft and cabin. The existing A-JET studio film and live 3D viewer remain. An A-JET branded render from the local `studio/tenger-hero` folder is used as a clearly labelled studio visualisation; the unbranded or Tenger-branded references are not used.

The client-provided EC145 summary states up to eight passenger places and two engines. Configuration, baggage and flight availability remain subject to the operator's confirmation. No current H145/ACH145 manufacturer's figures have been substituted for the photographed legacy EC145.

## Publication decisions

| Briefing item | Treatment |
| --- | --- |
| All prices | Unpublished, following the user's explicit follow-up. Home and destination pages no longer fetch or render catalogue prices, even if staff records are marked published. Private written proposals remain available to their recipients. |
| Waiting-time percentage and billing start | No calculator or billing formula. Obtain clear written commercial terms from the client. |
| Largest passenger capacity / only two aircraft in Mongolia | Not published as a market comparison without current evidence. |
| Accident-free record for 25 years | Not published as a safety-record claim without operator documentation and a defined reporting scope. The existing 25-year experience statement remains. |
| Single-engine continuation | No unconditional promise. Do not treat two engines as a guarantee of continued flight under every loading, terrain and weather condition. |
| Planning range of 520–550 km | Not offered as a guaranteed trip range. Operations must review reserves, payload, weather, landing and refuelling. |
| Second helicopter / March 2027 | No second aircraft offered as currently available; the maintenance return date needs reconfirmation. |
| Mid-November–Tsagaan Sar slowdown | Seasonal availability and winter maintenance/training are described without inventing a holiday date or confirmed blackout calendar. |
| 24/7 | Online enquiries may be sent at any time. This is not a promise of year-round flight dispatch availability. |
| Bose A30 | Headset comfort is discussed without claiming a specific installed model or guaranteed noise-cancellation performance. |
| MIAT space, private hangar ambitions, Bulgan hangar | No unconfirmed ownership, location or partner-facility claim. |
| River Garden landings | No new verified map point or permanent helipad entitlement inferred from the note or photograph. |
| Charity events | Retained as an aspiration; no invented event history. |
| Search and rescue | Described as operational support based on the client briefing, without turning the website into an emergency dispatch channel. |
| China | No bookable Chinese route. See the preliminary research below. |

## China: preliminary feasibility research

This review does not establish that A-JET currently has permission or operational capacity to fly a particular China itinerary.

China's Civil Aviation Law, effective 1 July 2026, requires the relevant acceptance or approval for foreign aircraft entry and landing. Articles 202, 204 and 208 address foreign aircraft approvals, non-scheduled international transport, and designated international airports. Article 206 prohibits foreign operators from transporting between two points within China. This rules out treating a Chinese domestic helicopter tour as a simple extension of an international charter. [CAAC: Civil Aviation Law, Chapter XI](https://app.caac.gov.cn/XXGK/XXGK/FLFG/202512/t20251227_229597.html).

CAAC's 2024 advisory circular describes operations specifications and a charter exemption application process for foreign carriers. It does not by itself approve this operator, aircraft, route or landing site. Its applicability and the relevant application route must be checked for the actual proposed operation. [CAAC AC-129-FS-001R2, section 8](https://app.caac.gov.cn/XXGK/XXGK/GFXWJ/202406/P020240809572699045292.pdf).

Before marketing a route, the operator should resolve its Mongolian approvals, Chinese approvals, approved entry/exit airports, immigration/customs arrangements, aircraft insurance, crew and aircraft documents, route-specific fuel planning and local handling. This is an implementation checklist inferred from the sources and the unresolved client notes, not a confirmed route plan. Passport formalities alone do not establish flight permission. No specific permission lead time is promised here.

## Enquiry and staff workflow

`0004_service_enquiries.sql` adds a validated main service and supporting-service array to stored requests. Existing requests default to charter. Non-flight enquiries use location and project fields and can represent larger event parties. Aerial shoots needing a flight must be requested as charter with photography added.

Staff can review, quote and confirm catering or photography without assigning an aircraft. Charter confirmation still requires an approved request, explicit operational approval and a verified aircraft with sufficient seats. Service scope and extras also appear in request notes for staff clarity. No external notifications were sent during verification.

Apply migrations with `npm run db:migrate` before enabling real submissions. PostgreSQL, production bot protection and delivery configuration are still required by the existing request system.

## Validation

Production compilation and TypeScript; English/Mongolian layouts at 1440, 390 and 320 pixels; three-service navigation; image loading and real-photo switching; absent public price figures; catering enquiry selection and supporting services; and preserved Airport Express route prefill.

An isolated PostgreSQL WASM test applies all four migrations, preserves a pre-existing request, exercises real request-handler persistence and idempotency, rejects invalid service/party sizes, confirms catering without an aircraft and checks that charter still requires a verified aircraft. Notification transports are mocked or disabled. This does not test the production PostgreSQL connection, Cloudflare authentication deployment or actual email delivery.
