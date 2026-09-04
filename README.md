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
- Share a trip link or print/save a designed travel book as PDF
- Export and import a complete JSON backup
- Install as a PWA and reopen the application shell offline
- Use the full responsive interface on desktop and mobile

## Privacy and storage

Personal content is stored in IndexedDB in the current browser. No account, analytics service, or private-location backend is used. Clearing site data will remove local content, so use **You → Export backup** regularly. Images from the included starter journeys are remote editorial placeholders; personal uploads remain local.

Browser geolocation cannot guarantee background tracking after the app is closed or suspended. Keep the installed PWA open during route recording.

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
```

The production build is deployed to GitHub Pages by `.github/workflows/deploy.yml` after every push to `main`.
