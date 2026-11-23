# Hospital price comparison (local development)

The facility View details screen now includes a responsive hospital comparison based on the supplied desktop and phone references. The existing Request a time flow is preserved.

## Try it

1. Open http://localhost:5173 and enter as a guest or sign in.
2. Search for a facility and click View details.
3. Set a five-digit ZIP with Change ZIP.
4. Select MRI, CT, echocardiogram or ultrasound; optionally filter contrast and search an exam name or CPT/HCPCS code. Choose the exact procedure.
5. Review hospital cash, gross, and insurer prices. Change exam reopens the controls. Show all expands the hospital list.

A live verified example is ZIP 43081, CT procedure 70450: Mount Carmel East returns cash $978.25 and gross $1,505. API prices can change.

## Data and limits

- The frontend calls the no-auth Imaging Price API via the Vite /imaging-prices development proxy. GET requests omit cookies and patient credentials. Only selected ZIP/procedure/filter values are sent; GPS coordinates are not sent.
- Procedure-specific /prices responses provide gross_charge. The all-procedures ZIP endpoint does not provide gross charges and is not used for these comparisons.
- No procedure is silently assumed to match a facility offer. Choose the exact procedure. The facility price marker appears only after confirming the same exam and contrast as the facility listing.
- Null, zero, negative and missing prices appear as Not posted. Cash is the posted median or minimum fallback; gross is gross_charge; insurer cells show posted min/max, falling back to median when a range is unavailable. Outliers are not silently removed.
- Ranges compare records in the exact selected ZIP, not a 25-mile radius. This API has no coordinates/distances, so hospitals are alphabetical and no distances are invented.
- One row per hospital CCN. There is no health-system/shared-price-file identifier in this API, so system-level deduplication is not claimed.
- Direct price-file links appear only if a future response supplies source_url or price_file_url. Otherwise API record links to the actual procedure/ZIP response.
- Nearby ZIP suggestions are on demand after empty results and are explicitly labeled as three-digit prefix suggestions, not geographic distance.
- Successful public responses are cached for five minutes with a bounded cache. Requests are cancelled on selection change/unmount and time out after 35 seconds. No API credentials are required.

## Deployment

These changes are local and uncommitted. No AWS changes are required. Before deploying the production frontend, configure a production rewrite for /imaging-prices to https://myselfpayheathdata.onesmarter.com, or set VITE_IMAGING_API_BASE to a CORS-enabled public endpoint. The Vite proxy applies only in local development.

## Validation

Frontend unit tests cover ZIP precedence, missing/zero amounts, separate cash/gross/insurance data, outliers, hospital deduplication, safe source links, caching and HTTP failures. Desktop (1440px) and phone (390px) browser checks cover procedure selection, ZIP changes, show all/fewer, facility marker, empty results and Request a time. The real API was also tested through the local browser with ZIP 43081 and procedure 70450. Synthetic screenshot/test rows are not bundled in the application.
