# Automatic current-location search

Press **Use my location** without filling the state field. The browser asks for location permission, resolves the US state locally, and loads its full directory with nearest-first distances. A higher-accuracy browser fix is requested; location and facility-coordinate accuracy still limit the displayed straight-line estimates.

Outside the US, an existing state selection or saved account ZIP is used when available. With no US preference, the existing National search is used automatically and US centers are sorted by distance from the device, including overseas locations. Invalid saved ZIPs and empty state results also fall back to the US directory instead of requiring state input. Normal manual search remains unchanged.

State detection uses a locally hosted, lazy-loaded boundary asset. Exact device coordinates never go to a geocoder or the backend. The API receives only the detected US state or user-provided directory preference. No precise user coordinates or microcells are stored in browser storage. Cached state data is reused during movement; a newly detected state loads its own records. Session changes invalidate pending results.

The asset `src/data/us-state-boundaries.json` is derived from the [US Census Bureau 2024 state cartographic boundaries at 1:20,000,000](https://catalog.data.gov/dataset/2024-cartographic-boundary-file-shp-state-and-equivalent-entities-for-united-states-1-2000), downloaded from the [official source](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip). It contains the fifty states and DC, with coordinates rounded to six decimals. These generalized mapping boundaries are approximate, especially near coasts and borders; they are not legal parcel boundaries. Outside or unavailable boundary coverage uses the broader directory fallback. The conversion utility is not an application dependency.

The narrow H3 API remains available unchanged. This frontend-only update reuses the existing authenticated `/api/search`; no AWS update, migration or new environment variable is required. The prior requirement to select a US state before using the location button is removed.
