# DistanceContext

Turn abstract distances into things you can actually picture.

> "12 km is like walking from Lagos Island to Ikeja, 3 times. It will take you about 2.4 hours."

DistanceContext detects your location, finds nearby places, and matches a distance you give it (or a route you pick) to real-world paths on a map — so numbers stop being abstract.

## How it works

Two modes:

- **By Distance** — enter a number + unit, get it translated into real local routes of comparable length.
- **By Route** — pick a start and end place directly, see the distance, route, and estimated time.

Travel time is estimated for **walking (5 km/h)** and **driving (30 km/h)**.

## Tech Stack

- **React 19** + **Vite 5** (ESM)
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **MapLibre GL 6** for map rendering
- **shadcn-style UI** components on `@base-ui/react` (button, card, input, select, tabs, badge, skeleton)
- **lucide-react** for icons, **Geist** variable font

### External APIs

| Service                                                          | Used for                      | Notes                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Nearby places                 | Ranked by place-type importance + proximity, deduplicated. Results cached in `localStorage` for 12h to reduce repeat calls. |
| [Nominatim](https://nominatim.org/)                              | Geocoding (reverse + forward) | Used through the `/api/geocode` proxy for location search and manual location override, with a local Lagos exact-match fallback. |
| [OSRM](http://project-osrm.org/)                                 | Routing                       | Powers route drawing and distance/time calculation.                                                                         |

All three are public/free-tier OSM-ecosystem APIs with rate limits — be considerate with request volume in development, and consider self-hosting or a paid tier before any real traffic.

## Getting Started

```bash
# install dependencies
npm install

# start dev server
npm run dev

# production build
npm run build

# preview the production build locally
npm run preview

# run the unit test suite
npm test

# unit tests in watch mode
npm run test:watch
```

No API keys are required to run locally — Overpass, Nominatim, and OSRM are used via their public endpoints. Browser geolocation permission is required for auto-detected location; the app also supports manual location search as a fallback.

The deployed geocoder proxy accepts an optional `NOMINATIM_CONTACT` environment variable so the upstream request can identify a support URL or contact address. Local Vite development uses the same `/api/geocode` path through a development proxy.

## Features

- Two input modes: **By Distance** and **By Route**
- Walking / driving travel mode toggle
- Nearby places search via Overpass with client-side ranking, dedup, and 12h cache
- Full geocoding flow (reverse + forward) with retry and edge-case handling
- Route suggestions bucketed across 3 distance ranges, with closest matches highlighted
- Free-text start/end places (any city or area) resolved via Nominatim when not in the nearby list
- **Anchors** — pin routes you already know (Home → Work, the school run) and every distance gets framed against them: *"12 km is like doing your Home → Work route twice"*
- **Landmark framing** — verified Lagos crossing spans (Third Mainland Bridge, Eko Bridge) fill in when you have no anchors of your own
- **Distance ladder** — up to three framings at once, closest match first
- Rich map interactions: pulsing location dot, distance radius ring, animated route drawing with glow trail, dashed straight-line comparison, marker bounce, fly-to/fit-bounds
- Skeleton loaders and a map overlay card (route name, distance, time)
- Mode, travel mode, and distance unit persisted to `localStorage`
- Responsive layout — stacked on mobile, side-by-side on desktop

## Project Status

🟢 Functional, deployed, and actively developed. Build passes (`vite build`, ~10s, 1961 modules) and the unit suite is green (`npm test`, 99 tests).

### Known gaps

- **No lint/format scripts** — `dev`, `build`, `preview`, `test`, `test:watch` are the only scripts in `package.json`.
- **No CI** — tests only run when someone runs them locally.
- **Bundle size** — MapLibre is heavy and the map is already lazy-loaded, but its chunk is still ~978 kB (~258 kB gzipped).
- **Landmark spans cover Lagos only** — and only two crossings. Anything that can't be measured from real OSM geometry is left out rather than approximated (see the exclusions documented in `src/data/landmarks.js`).
- **Straight-line vs road distance** — anchors and landmark spans are straight-line (matching "Base route"); the road distance comes from OSRM. They can differ meaningfully.
- **The ladder can repeat a source** — e.g. "29% of the Eko Bridge" alongside "11% of the Third Mainland Bridge" are both fraction frames of the same journey.

## Project Structure

```
src/
  components/   # UI + map components (anchor panel, ladder, map, inputs)
  hooks/        # state and data hooks (context, places, geolocation, anchors)
  utils/        # pure helpers + tests (distance, format, place matching, anchors)
  data/         # curated static data (Lagos places, verified landmark spans)
  lib/          # shared class strings
```

## Contributing

This is currently a solo, actively-developed project — no formal contribution process yet. Issues and PRs may not be reliably reviewed until docs/CI are in place.

## License

_Not yet specified._
