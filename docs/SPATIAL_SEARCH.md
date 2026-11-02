# Location search

Current behavior: [Automatic current-location search without state input](AUTOMATIC_LOCATION.md). The location button now uses the selected US state and calculates miles locally from anywhere in the world; the neighborhood-only loading flow below is retained as historical API documentation.

The existing search page now supports optional ZIP+4 registration and opt-in browser location. Backend setup and the full privacy/API/deployment contract are documented in [the backend architecture guide](https://github.com/OneSmarterInc/MyselfPay_Backend/blob/main/docs/SPATIAL_ARCHITECTURE.md).

Run `npm ci`, `npm test`, `npm run build` and `npm run dev` from this frontend checkout. Keep `VITE_API_BASE_URL=/api`; do not hardcode an AWS hostname in client code. The local Vite proxy still uses `DEV_API_TARGET` when configured.

The **Use my location** button appears after the backend reports its H3 index ready. It requests browser permission and sends only H3 Resolution 7 to `/api/v1/spatial-bundle/{cell}/`. The user's coordinates and H3 Resolution 11 never leave this client feature or enter persistent browser storage. Location tracking stops on hidden pages and does not automatically resume. Press the location button to resume. Manual ZIP/state search remains available.

`src/spatial.js` owns conversion, validation, request deduplication, an eight-bundle in-memory cache, local filtering and geographic distance sorting. `src/App.jsx` owns the React lifecycle and existing UI/booking integration. The spatial API is authenticated and private/no-store; do not add a public CDN cache rule. The legacy directory is downloaded only on explicit directory browsing, not by GPS updates.

ZIP+4 accepts `12345-6789`; the base five digits drive approximate statewide proximity results after account login. H3 7 still reveals an approximate area, and facility locations with city/ZIP precision cannot be treated as street-level positions.

Tests: `npm test` runs the H3/cache/privacy contracts. `npm run test:e2e` requires a migrated, indexed development backend and checks browser permissions, actual API results, filters, registration, comparisons and existing layouts. Use synthetic users and an isolated database.
