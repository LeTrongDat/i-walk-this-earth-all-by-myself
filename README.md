# I Walk This Earth

A private, device-local travel planner and photo archive. Organize trips into countries, cities, and places, save albums without making posts, and plan each day in one installable web app.

## What works

- Create, edit, filter, and delete planned, active, and completed trips
- Enter cities and places offline, with optional explicit OpenStreetMap lookup online
- Keep addresses, map links, restaurant notes, photo/vlog ideas, and reference links per place
- Plan daily visits with times, durations, accommodation, reservations, and manual ordering
- Preview and apply a shorter straight-line visit order, preserving fixed positions
- Import batches of original photos into place albums, with thumbnails and no post/count requirement
- Browse/filter photos by trip, country, city, place, favourite, date, or search; play slideshows at each scope
- Edit captions and dates, favourite photos, download originals, and keep optional journal notes
- Record a live route using browser geolocation while the app is open
- Explore all trips and memories through interactive maps and library views
- View travel statistics and visited-country stamps
- Print/save a daily travel playbook or filtered memory photobook as PDF
- Export/import a full ZIP backup including original album files; import older JSON backups
- Inspect device storage, request persistent storage, and explicitly clean unused files
- Install as a PWA and reopen the application shell offline
- Use the full responsive interface on desktop and mobile

## Privacy and storage

Personal content is stored in IndexedDB in the current browser. No account, analytics service, or private-location backend is used. Clearing site data will remove local content, so use **You → Export backup** regularly. Images from the included starter journeys are remote editorial placeholders; personal uploads remain local.

Browser geolocation cannot guarantee background tracking after the app is closed or suspended. Keep the installed PWA open during route recording.

This is a personal archive, not a social app: no accounts, followers, posts required for albums, cloud sync, public trip hosting, push notifications, or physical book ordering. A shared trip URL only resolves records already stored in the receiving browser. Free map/lookup services receive ordinary network requests, but uploaded photos, notes, and plans are not sent to them.

### Backup and offline limits

Album originals and thumbnails are separate IndexedDB Blob records. Metadata changes commit atomically before showing success, and old city/journal records remain readable. Full ZIP restore stages files under new identifiers, validates the archive and each photo's SHA-256 integrity hash, and only then replaces metadata. Deletion removes album references; explicit cleanup removes unreferenced files older than 24 hours. Export before deletion or reset.

ZIP backups are limited to 3.8 GB of photo files and 200 MB per entry (including metadata); individual photo imports are limited to 200 MB. Supported formats: JPEG, PNG, WebP, GIF, AVIF; convert HEIC first. Photo dates initially use the file modification date, not EXIF. Browsers supporting the save-file picker stream backups to disk; others assemble the download in memory, so large libraries may exceed available memory. Keep independent original-file copies. Device storage is finite and persistent-storage requests may be denied. There is no cloud recovery.

After the first successful load, the installed application shell, local albums, planning, printing, and approximate route suggestions work offline. Map tiles, optional OpenStreetMap searches, external links, and remote sample photos need a connection. Backups retain remote sample photo URLs rather than downloading their content.

Route suggestions use nearest-neighbour plus bounded 2-opt on straight-line distances, up to 100 visits per day. They do not guarantee the global shortest route and do not model roads, transit, travel time, opening hours, or accessibility. Accommodation is the start and optional return point; without accommodation, the first visit stays fixed. Review appointment times and overlap warnings before saving.

## Map and app UI

The map-first interface keeps travel-app visual cues with original branding. Trip tabs separate cities and places, daily planning, photos, and optional notes. Satellite imagery is supplied by Esri World Imagery; English vector labels and the street layer use OpenFreeMap / OpenMapTiles / OpenStreetMap. These external services require an internet connection and their attribution remains visible. English names fall back to Latin-script names when no translation exists.

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
