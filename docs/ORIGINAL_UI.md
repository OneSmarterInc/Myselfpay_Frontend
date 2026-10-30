# Original SelfPay UI restoration

Reference: `OneSmarterInc/SelfPay` commit `bf839ef9af6efde48b2666cc26e7e793a7d9bd06`.

The original `static/index.html` stylesheet, logo, Public Sans font and license, app icons, information pages and presentation templates are retained. React owns application state, rendering and event handlers through `App.jsx` and `OriginalBooking.jsx`. The original imperative `app.js` is not served, embedded in an iframe or executed.

`src/original-ui.js` contains the extracted presentation functions with their original class names, wording and markup. The original header/footer, welcome page, filter layout, cards, comparison and directory dialogs, location picker, guided chat, account forms and booking views are rendered as React elements. API calls continue through the verified same-origin `/api` proxy to Django REST Framework on AWS.

## Verification

The original source reference and React pages were rendered in the same Chrome browser with the same data and self-hosted font:

| Page | Viewport width | Comparison |
| --- | --- | --- |
| Home | 1440px | Identical screenshot bytes and layout geometry |
| Home | 390px | Identical screenshot bytes and layout geometry |
| Search | 1440px | Identical screenshot bytes and layout geometry |
| Search | 390px | Identical screenshot bytes and layout geometry |

The reference fixtures live under `tests/fixtures` and are served only by Vite's development middleware. They are not production pages. Visual tests also run in the frontend integration workflow against the separately checked-out Django backend and its local demo directory.

Browser tests cover the original signup/login forms, guest search, comparison, directory filtering, expired-session sign-out, public pages and the two-step appointment dialog. Booking screens preserve their layout and adapt their wording to the API's email-delivery status. AWS directory data is not modified by this frontend restoration.
