import { haversineDistanceKm } from "./distance";

// Weight for Nominatim `importance` (roughly log-scale) when re-ranking
// candidates against distance from the active location: 1000 makes a nearby
// suburb beat a far-away major city ("Agric" in Ikorodu beats "Agric" in
// Ghana; "Mende" in Lagos beats "Mende" in Sierra Leone).
const IMPORTANCE_WEIGHT = 1000;

export function normalizePlace(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Merge place lists into one deduplicated list (by normalized name), keeping
// the first occurrence — earlier lists win. Used to layer curated fallback
// places under live API results without duplicate autocomplete entries or
// duplicate route pairs.
export function mergePlaceLists(...lists) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const place of list ?? []) {
      const key = normalizePlace(place.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(place);
    }
  }
  return merged;
}

// Loose similarity of a typed query against a place name. 100 = exact,
// 80 = name starts with query, 70 = a name token starts with query,
// 60 = query starts with the whole name, 50 = query starts with a token.
export function fuzzyScore(query, name) {
  const q = normalizePlace(query);
  const n = normalizePlace(name);
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (q.startsWith(n) && n.length >= 3) return 60;
  const tokens = n.split(" ");
  if (tokens.some((t) => t.startsWith(q))) return 70;
  if (tokens.some((t) => t.length >= 3 && q.startsWith(t))) return 50;
  return 0;
}

// Best local match across the given lists (nearby places first, then the
// curated index). Exact matches always win; otherwise the highest fuzzy
// score ≥ 50 wins, with a minimum query length of 3 to avoid noise.
export function bestLocalMatch(query, lists) {
  const q = normalizePlace(query);
  if (!q) return null;

  for (const list of lists) {
    const exact = list.find((p) => normalizePlace(p.name) === q);
    if (exact) return { place: exact, score: 100 };
  }

  if (q.length < 3) return null;

  let best = null;
  for (const list of lists) {
    for (const p of list) {
      const score = fuzzyScore(q, p.name);
      if (score >= 50 && (!best || score > best.score)) {
        best = { place: p, score };
      }
    }
  }
  return best;
}

export function candidateScore(candidate, location) {
  const dist = location
    ? haversineDistanceKm(
        [location.lat, location.lng],
        [candidate.lat, candidate.lng],
      )
    : 0;
  return candidate.importance * IMPORTANCE_WEIGHT - dist;
}

export function rankCandidates(candidates, location) {
  return [...candidates].sort(
    (a, b) => candidateScore(b, location) - candidateScore(a, location),
  );
}
