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
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Nearby places                 | Ranked by place-type importance + proximity, deduplicated. Results cached in `localStorage` for 24h to reduce repeat calls. |
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
```

No API keys are required to run locally — Overpass, Nominatim, and OSRM are used via their public endpoints. Browser geolocation permission is required for auto-detected location; the app also supports manual location search as a fallback.

The deployed geocoder proxy accepts an optional `NOMINATIM_CONTACT` environment variable so the upstream request can identify a support URL or contact address. Local Vite development uses the same `/api/geocode` path through a development proxy.

## Features

- Two input modes: **By Distance** and **By Route**
- Walking / driving travel mode toggle
- Nearby places search via Overpass with client-side ranking, dedup, and 24h cache
- Full geocoding flow (reverse + forward) with retry and edge-case handling
- Route suggestions bucketed across 3 distance ranges, with closest matches highlighted
- Free-text start/end places (any city or area) resolved via Nominatim when not in the nearby list
- Rich map interactions: pulsing location dot, distance radius ring, animated route drawing with glow trail, dashed straight-line comparison, marker bounce, fly-to/fit-bounds
- Skeleton loaders and a map overlay card (route name, distance, time)
- Mode, travel mode, and distance unit persisted to `localStorage`
- Responsive layout — stacked on mobile, side-by-side on desktop

## Project Status

🟢 Functional, actively developed. Build passes (`vite build`, ~6.5s, 1903 modules).

### Known gaps

- **No tests** — no test framework configured yet.
- **No lint/format scripts** — only `dev`, `build`, `preview` exist in `package.json`.
- **No CI/CD or deployment setup.**
- **Bundle size** — MapLibre is heavy; being addressed via lazy-loading / code-splitting.
- `distanceValue` is initialized as a number but set from raw input string (`event.target.value`) — works today, but should be normalized to avoid loose typing.

## Project Structure

```
src/
  components/   # UI + map components
  data/         # (currently empty — reserved for static data/config)
  ...
```

## Contributing

This is currently a solo, actively-developed project — no formal contribution process yet. Issues and PRs may not be reliably reviewed until docs/CI are in place.

## License

_Not yet specified._
