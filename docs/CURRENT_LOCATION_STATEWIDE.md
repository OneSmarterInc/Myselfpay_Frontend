# Statewide results from the current location

The location button now browses every available listing in the selected US state, not only the small H3 neighborhood around the device. Select a US state, qualified city or ZIP first. A saved account ZIP is used when the search field is blank. This selection determines the directory coverage; it does not replace the device as the distance origin. GPS can be anywhere in the world, including outside the US.

The frontend reuses the existing authenticated `/api/search` state search with optional exam/price filters cleared for the initial load. Only the user-selected state/city/ZIP is submitted. Device coordinates and the device H3 cells are never included in this request. Facility coordinates and reviewed offers returned for that state are processed locally. No geocoder, external maps call or backend change is needed.

`StatewideLocationManager` caches the state's records in memory, deduplicates pending loads, and recalculates distances when location changes. Crossing an H3 cell does not cause another state request. H3 11 still supports local grid calculations, with Haversine for physical straight-line miles, including distant overseas origins. The existing narrow H3 bundle API and its tests remain available for other clients; it is no longer the data source for this button. This behavior supersedes the neighborhood-only browser flow in the earlier spatial architecture document.

Results default to nearest first, overriding completeness-first ordering only while current-location results are active. Other manual searches retain their previous priority. Miles show one decimal place, and city/ZIP reference-point labels remain. These are approximate straight-line distances, not exact address accuracy or driving distance. Entries without usable facility coordinates remain in the result set, last, labeled “Distance unavailable.” The app does not invent distances or substitute another state's branch coordinates.

The existing ten-card pagination, optional local filters, comparison, detail and booking actions remain. A location update does not reset the current page. Switching the selected location, stopping location updates or changing sessions clears the active local search. Hidden pages stop watching location. No precise user location is written to local storage or sent to the backend.

Deployment is frontend-only. Run `npm test` and `npm run build`, then deploy through the existing Vercel project. No AWS pull, migration, backfill or environment-variable change is required for this update.

Verification: 33 frontend unit tests and all 17 browser tests passed, including statewide results from an emulated India location, nearest-first decimal miles, missing coordinates, local filtering, pagination, ZIP login, permission fallback and no raw GPS in API requests. The production build passed.
