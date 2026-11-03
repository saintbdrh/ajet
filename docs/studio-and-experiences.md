# Studio and new passenger experiences

## Helicopter

The supplied EC145 rebuild is isolated from earlier helicopter generations. The new web model contains one aircraft mesh with 23 material groups, no review floor, and no dust mesh. Local Draco compression reduces the GLB to approximately 1.1 MB; decoding uses the existing files in `public/vendor/draco`.

The studio has a dark reflective floor, soft key light, blue rim lighting, and a moving reflection strip. The Blender camera and lights form a 30-second loop. The encoded web film is approximately 30 seconds at 24 fps, 1280 × 720, with no audio. It is used in the homepage and as an alternative to live 3D. Reduced-motion preferences disable automatic playback. Users can pause all motion.

The live Three.js viewer fits sampled aircraft geometry to the available viewport, preserving the rotor and tail. Controls sit below the canvas. Orbit, preset views, explicit zoom, fit, fullscreen, keyboard controls, and a film fallback are provided. Rendering pauses outside the viewport or in hidden tabs, caps pixel ratio at 1.5 and rendering at approximately 30 fps. The reflective target is limited to 768 pixels.

## Airport Express

Routes connect Chinggis Khaan International Airport (ZMCK) with Bogd Khan Heliport (ZMBK), Khiimori Helipad, and Baga Tenger Helipad, in either direction. Selecting a route prefills the existing quote form.

The client must confirm the price, its charging basis, and whether Moduun Khaan is the airport pickup point. These values are deliberately unpublished. The indicative flight time is 13–15 minutes, excluding ground transfers, with operational confirmation required.

## Lounges

The page announces a planned 2027 opening. Three images extracted from the supplied visual identity illustrate the intended lounge, cabin comfort and service details. Captions identify them as design concepts rather than operational facilities. No location, amenities or precise opening date has been invented.

## Careers

No unconfirmed vacancies are advertised. Visitors may register interest in future roles. The form records name, email, optional phone, professional summary, area of interest, consent and timestamp. It does not accept document uploads.

Before enabling collection:

1. Configure `DATABASE_URL` and run `npm run db:migrate` to apply `0003_career_interest.sql`.
2. Configure the existing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` for production. Ensure Cloudflare bindings are available as required by the existing server runtime.
3. Verify recruitment operations and information-handling arrangements with the client.

The form displays an unavailable state without database configuration. The API never reports success unless a registration is stored (or the same request was already stored). It validates consent, size, origin and field lengths; requires Turnstile in production; uses parameterized statements, an email cooldown and request idempotency; and does not send candidate details to outside messaging services.

Authorized owners can read the latest 100 registrations at `/admin/careers`, linked from the staff workspace. Dispatchers and content editors do not receive recruitment access. Production Cloudflare Access settings must already be configured.

## Validation

TypeScript and production compilation; browser checks for English and Mongolian pages at 1440, 390 and 320 pixels; loaded imagery; live WebGL and compressed model decoding; film playback; fullscreen; mobile navigation; reverse-route quote prefill; API origin and validation failures; unavailable-storage handling; and blocked unauthenticated recruitment access.

End-to-end registration storage requires a running PostgreSQL service. No local database was configured during this update, so storage success and authorized HR viewing have not been exercised against a live database.
