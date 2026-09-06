# I Walk This Earth

A private, local-first travel planner and memory journal. The app combines a visual world map, chronological itineraries, GPS route capture, photographs, journal entries, travel statistics, and printable trip books in one installable web app.

## What works

- Create, edit, filter, and delete planned, active, and completed trips
- Search real-world places with OpenStreetMap and build ordered routes
- Add stays, transport, activities, dates, and trip notes
- Write location-linked memories and save private photo uploads
- Record a live route using browser geolocation while the app is open
- Explore all trips and memories through interactive maps and library views
- View travel statistics and visited-country stamps
- Print/save a travel journal as PDF (trip URLs only resolve data already on that device)
- Export and import a complete JSON backup
- Install as a PWA and reopen the application shell offline
- Use the full responsive interface on desktop and mobile

## Privacy and storage

Personal content is stored in IndexedDB in the current browser. No account, analytics service, or private-location backend is used. Clearing site data will remove local content, so use **You → Export backup** regularly. Images from the included starter journeys are remote editorial placeholders; personal uploads remain local.

Browser geolocation cannot guarantee background tracking after the app is closed or suspended. Keep the installed PWA open during route recording.

This is a personal, device-local app, not a full Polarsteps service clone: accounts, followers, cloud sync, public trip hosting, push notifications, and physical book ordering are not implemented. Privacy selections do not publish local records.

## Map and app UI

The map/profile sheet and trip step carousel follow the actual Polarsteps app's UI patterns, with original app branding. Satellite imagery is supplied by Esri World Imagery; English vector labels and the street layer use OpenFreeMap / OpenMapTiles / OpenStreetMap. These external services require an internet connection and their attribution remains visible. English names fall back to Latin-script names when no translation exists.

MapLibre 6 needs a bundled worker: `?worker&url` is intentional. A plain `?url` or missing worker can show pins on an empty map while never downloading vector tiles. The browser tests check actual map feature/route rendering, tile downloads, zoom, mobile controls, reload, and error/retry states.

## Development

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
E2E_PRODUCTION=1 npm run test:e2e -- --workers=1
```

The production build is deployed to GitHub Pages by `.github/workflows/deploy.yml` after every push to `main`.
