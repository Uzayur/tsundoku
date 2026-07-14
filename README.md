# 積ん読 Tsundoku

> _Tsundoku_ (n.) — the art of acquiring books and letting them pile up, unread.

A series-oriented reading tracker for **manga, comics, and novels** — follow your
collection volume by volume. Built with Expo (React Native) and TypeScript, it runs
fully offline and lives entirely on your device.

## Concept

Most reading apps track individual books. Tsundoku tracks **series** and the
**volumes** within them, so you always know where you stand:

- Which volumes you own, which you're reading, which you've finished, and which are
  still on the wishlist.
- How far you are in a series (e.g. _8 / 30_).
- Reading stats over time (books, pages) by week, month, quarter, or year.

## Architecture principles

- **100% local, no backend.** All data is stored in **SQLite** (`expo-sqlite`). The
  app works offline.
- **Direct API calls, no proxy.** Metadata comes straight from public APIs and is
  cached in SQLite after the first lookup:
  - [Open Library](https://openlibrary.org/) — ISBN lookup (no key)
  - [Google Books](https://books.google.com/) — metadata fallback (no key)
  - [AniList](https://anilist.co/) — series search + total volume count (GraphQL, no key)
- **Cross-platform.** iOS + Android, tested via Expo Go.

## Data model

```
Series  { id, title, type, total_volumes, external_ids, cover_url, genres, status }
Volume  { id, series_id, number, isbn, title, page_count, cover_url,
          status (wishlist | owned | reading | read), current_page,
          started_at, finished_at }
```

A standalone novel is simply a series with one volume.

## Tech stack

- [Expo](https://expo.dev/) SDK 54 · React Native 0.81 · React 19 · TypeScript (strict)
- [expo-router](https://docs.expo.dev/router/introduction/) — file-based navigation
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — local persistence
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/) — ISBN barcode scanning
- [Inter](https://rsms.me/inter/) via `@expo-google-fonts/inter`
- ESLint + Prettier

## Getting started

**Prerequisites:** Node.js 20+ and the [Expo Go](https://expo.dev/go) app on your
phone (iOS or Android).

```bash
# Install dependencies
npm install

# Start the dev server
npm start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm start`        | Start the Expo dev server      |
| `npm run ios`      | Open on an iOS simulator       |
| `npm run android`  | Open on an Android emulator    |
| `npm run lint`     | Lint the codebase              |
| `npm run lint:fix` | Lint and auto-fix              |
| `npm run format`   | Format all files with Prettier |

## Project structure

```
app/                       # Screens (expo-router, file-based routing)
  _layout.tsx              # Root layout — loads the Inter font
  (tabs)/
    _layout.tsx            # Bottom tab bar
    index.tsx              # Accueil (Dashboard)
    collection.tsx         # Collection
    wishlist.tsx           # Envies (wishlist)
    stats.tsx              # Stats
src/
  theme/theme.ts           # Design tokens
  components/
    ui/                    # Reusable UI primitives (Screen, …)
    navigation/            # Tab configuration
```

Imports use the `~/*` alias (mapped to the project root), e.g.
`import { theme } from '~/src/theme/theme'`.

## Design system

A warm, light theme. Coral is an accent only (active states, progress, FAB) — book
covers are meant to be the visual stars.

| Token   | Value     | Use                          |
| ------- | --------- | ---------------------------- |
| accent  | `#f55139` | Coral — active, progress     |
| ink     | `#0f222d` | Navy — text, filled elements |
| bg      | `#f4f2ec` | Warm background              |
| surface | `#ffffff` | Cards, surfaces              |
| Font    | Inter     | Everywhere                   |

## Roadmap

- [x] **Foundation** — theme, tab navigation, Inter font, ESLint/Prettier
- [ ] SQLite schema + queries, seeded data
- [ ] Dashboard + series detail (clickable volume grid)
- [ ] API layer (Open Library, Google Books, AniList) with SQLite caching
- [ ] ISBN barcode scanning
- [ ] Add by title / import a whole series
- [ ] Wishlist view
- [ ] Stats with charts
- [ ] Export / import (JSON + CSV)

## License

MIT
