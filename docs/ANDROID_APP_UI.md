# Android app UI

The React app detects the MySelfPayAndroid user-agent marker. Android users receive the reference home screen, hamburger/search header, service tiles, progressively disclosed filters, compact center cards and floating predefined-chat action. Browser users retain the existing website presentation.

Search, filtering, comparison, directory, account login, dashboard and booking reuse the existing React state and APIs. The UI does not move React-owned DOM nodes or fabricate prices, distances or result counts. Core actions are available from the drawer and center details. Footer elements are hidden in the app. The Android shell also hides footers on static information pages.

Android Back closes app dialogs/drawers and returns from filters/chat to results. The APK uses the live portal, so internet is required. Version 1.0.9 adds the gray status-bar/black navigation-bar treatment and retains the existing package/signing identity for updates. No server migration is needed for these presentation changes.
