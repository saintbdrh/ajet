# A-JET journey planner

Routes: `/mn/estimate` and `/en/estimate`. The page uses a full-height satellite/road map workspace, a persistent trip brief, searchable published places, map clicks and draggable endpoints. Mobile users switch between the map and trip details; a map summary returns them to the brief.

The share link contains the route, coordinates, passenger count, aircraft preference, date and waiting time. Edits update that link without a page reload. Language changes and browser back navigation restore the latest valid trip. The enquiry page validates the parameters and carries them into the existing charter form. A shared link never creates a booking or sends a notification.

Distances are great-circle geographical distances. They are not flown routes, fuel/range checks or flight-time calculations. Prices remain unpublished. Operations confirms aircraft loading, route, time, refuelling and landing permissions separately.

Place presets identify general areas. Verified destinations maintained by staff are added to the catalogue. The country outline reuses the existing public-domain Natural Earth data. Satellite imagery defaults to Esri World Imagery with attribution; road mapping uses the existing OSM/provider configuration. Override imagery with `NEXT_PUBLIC_SATELLITE_TILE_URL` and `NEXT_PUBLIC_SATELLITE_ATTRIBUTION` for the intended deployment provider.

Validation: production build and TypeScript; desktop and narrow mobile layouts; destination search and cards; map selection and actual pin dragging; road/satellite and expanded map controls; coordinate and passenger bounds; shared URL restoration, language preservation, browser back and enquiry prefilling. No live request was submitted.
