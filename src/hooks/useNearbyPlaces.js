import { useState, useEffect, useRef } from "react";
import { haversineDistanceKm } from "../utils/distance";

const CACHE_TTL = 12 * 60 * 60 * 1000;
const CACHE_MAX_DISTANCE_KM = 5;
const QUERY_LIMIT = 250;
const TOP_PLACES = 30;
const MIN_USABLE_PLACES = 2;
const ENDPOINT_TIMEOUT_MS = 7000;
const TOTAL_SEARCH_TIMEOUT_MS = 15000;

// Context search is adaptive: start tight around the user (everyday context),
// widen to 25 km, then 50 km, so sparsely mapped regions still get at least a
// couple of comparable places instead of nothing.
const RADIUS_STAGES = [10000, 25000, 50000];

// Public Overpass instances. The main one load-balances across backends that
// are inconsistent about CORS headers (some GET responses lack
// Access-Control-Allow-Origin entirely), so the documented POST interface is
// used and mirrors are tried in order until one responds. Regional mirrors
// (e.g. overpass.osm.ch) are deliberately excluded: they answer 200 with zero
// elements for queries outside their region, which must not be treated as a
// valid "no places here" result or be cached.
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOverpass(query, signal) {
    let lastError = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
        const endpointController = new AbortController();
        let timedOut = false;
        const abortEndpoint = () => endpointController.abort();
        signal?.addEventListener("abort", abortEndpoint, { once: true });
        if (signal?.aborted) endpointController.abort();
        const timeoutId = setTimeout(() => {
            timedOut = true;
            endpointController.abort();
        }, ENDPOINT_TIMEOUT_MS);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: endpointController.signal,
            });
            if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
            const data = await res.json();
            if (
                !data ||
                !Array.isArray(data.elements) ||
                data.elements.length === 0
            ) {
                // Empty is a failure, not a result: it usually means a mirror
                // that doesn't serve this region (or an Overpass timeout that
                // returned `remark` with no elements). Try the next mirror.
                throw new Error("Overpass returned no places");
            }
            return data;
        } catch (err) {
            if (signal?.aborted) throw err;
            lastError = timedOut
                ? new Error("Nearby place search timed out.")
                : err;
        } finally {
            clearTimeout(timeoutId);
            signal?.removeEventListener("abort", abortEndpoint);
        }
    }
    throw lastError ?? new Error("All Overpass mirrors failed");
}

const PLACE_WEIGHT = {
    city: 5,
    town: 4,
    suburb: 3,
    village: 2,
    neighbourhood: 1,
};

// Named, well-known features complement settlements — many regions don't tag
// neighbourhoods at all, and a market, station, or hospital is just as good
// as local distance context as a suburb is.
const FEATURE_TAGS = {
    amenity: [
        "university",
        "college",
        "hospital",
        "marketplace",
        "townhall",
        "stadium",
        "library",
        "police",
    ],
    railway: ["station"],
    tourism: ["museum", "attraction", "zoo", "gallery", "viewpoint"],
    shop: ["supermarket", "mall", "department_store"],
};

const FEATURE_WEIGHT = {
    university: 4,
    college: 3,
    hospital: 4,
    marketplace: 3,
    townhall: 3,
    stadium: 3,
    library: 2,
    police: 2,
    station: 4,
    museum: 3,
    attraction: 3,
    zoo: 3,
    gallery: 2,
    viewpoint: 2,
    supermarket: 2,
    mall: 2,
    department_store: 2,
};

function buildQuery(lat, lng, radiusMeters) {
    const featureBlocks = [];
    for (const [key, values] of Object.entries(FEATURE_TAGS)) {
        const joined = values.join("|");
        featureBlocks.push(
            `node["${key}"~"^(${joined})$"]["name"](around:${radiusMeters},${lat},${lng});`,
        );
    }
    return `[out:json][timeout:25];(node["place"~"^(city|town|suburb|village|neighbourhood)$"](around:${radiusMeters},${lat},${lng});${featureBlocks.join("")});out body ${QUERY_LIMIT};`;
}

function elementWeight(el) {
    const placeType = el.tags?.place;
    if (placeType && PLACE_WEIGHT[placeType] != null) {
        return PLACE_WEIGHT[placeType];
    }
    const amenity = el.tags?.amenity;
    if (amenity && FEATURE_WEIGHT[amenity] != null) {
        return FEATURE_WEIGHT[amenity];
    }
    if (el.tags?.railway === "station") {
        return FEATURE_WEIGHT.station;
    }
    const tourism = el.tags?.tourism;
    if (tourism && FEATURE_WEIGHT[tourism] != null) {
        return FEATURE_WEIGHT[tourism];
    }
    const shop = el.tags?.shop;
    if (shop && FEATURE_WEIGHT[shop] != null) {
        return FEATURE_WEIGHT[shop];
    }
    return 1;
}

// Dedup by name and by coordinates (~110 m clusters), keep the highest-scoring
// name of each cluster, rank by importance − distance so local wins.
function normalizeElements(elements, lat, lng) {
    const seen = new Set();
    const byCoord = new Map();
    for (const el of elements) {
        const name = el.tags?.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const distanceKm = haversineDistanceKm([el.lat, el.lon], [lat, lng]);
        const score = elementWeight(el) * 100 - distanceKm;
        const coordKey = `${el.lat.toFixed(3)},${el.lon.toFixed(3)}`;
        const existing = byCoord.get(coordKey);
        if (existing && existing.score >= score) continue;
        byCoord.set(coordKey, {
            name,
            lat: el.lat,
            lng: el.lon,
            placeType: el.tags?.place,
            distanceKm,
            score,
        });
    }
    return [...byCoord.values()].sort((a, b) => b.score - a.score);
}

function cacheKey(lat, lng) {
    return `nearby_places_v6_${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

// Older cache versions (v4/v5) may hold empty or region-wrong place arrays
// written by earlier fallback bugs. Purge them once so stale data can't
// resurface.
function purgeStaleCache(currentKey) {
    const staleKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("nearby_places_v") && key !== currentKey) {
            staleKeys.push(key);
        }
    }
    for (const key of staleKeys) localStorage.removeItem(key);
}

// Cache entries remember where they were fetched; they're only reused when the
// user is still within CACHE_MAX_DISTANCE_KM of that spot.
function loadCache(lat, lng) {
    try {
        const raw = localStorage.getItem(cacheKey(lat, lng));
        if (!raw) return null;
        const { data, ts, lat: cachedLat, lng: cachedLng } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            localStorage.removeItem(cacheKey(lat, lng));
            return null;
        }
        if (cachedLat == null || cachedLng == null) return null;
        if (
            haversineDistanceKm([cachedLat, cachedLng], [lat, lng]) >
            CACHE_MAX_DISTANCE_KM
        ) {
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function writeCache(lat, lng, data) {
    try {
        localStorage.setItem(
            cacheKey(lat, lng),
            JSON.stringify({ data, ts: Date.now(), lat, lng }),
        );
    } catch {
        /* localStorage full */
    }
}

export function useNearbyPlaces(location) {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const abortRef = useRef(null);

    useEffect(() => {
        // No confirmed location yet (GPS pending/denied, no manual choice):
        // no nearby search, no context, no errors — the UI shows its own
        // location-required state.
        if (!location) {
            abortRef.current?.abort();
            abortRef.current = null;
            setPlaces([]);
            setLoading(false);
            setError(null);
            return;
        }

        const { lat, lng } = location;

        if (abortRef.current) abortRef.current.abort();

        const key = cacheKey(lat, lng);
        purgeStaleCache(key);

        const cached = loadCache(lat, lng);
        if (cached) {
            setPlaces(cached);
            setLoading(false);
            setError(null);
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, TOTAL_SEARCH_TIMEOUT_MS);

        setLoading(true);
        setError(null);

        (async () => {
            const collected = [];
            for (const radius of RADIUS_STAGES) {
                try {
                    const data = await fetchOverpass(
                        buildQuery(lat, lng, radius),
                        controller.signal,
                    );
                    collected.push(...data.elements);
                    if (
                        normalizeElements(collected, lat, lng).length >=
                        MIN_USABLE_PLACES
                    ) {
                        break;
                    }
                } catch (err) {
                    if (err.name === "AbortError") throw err;
                }
            }

            if (abortRef.current !== controller) return;

            const unique = normalizeElements(collected, lat, lng);
            if (unique.length >= MIN_USABLE_PLACES) {
                const top = unique.slice(0, TOP_PLACES);
                setPlaces(top);
                if (top.length > 0) writeCache(lat, lng, top);
                setError(null);
                setLoading(false);
            } else {
                setPlaces([]);
                setLoading(false);
                setError("No nearby places found. You can still enter a distance or choose By Route.");
            }
        })().catch((err) => {
            if (abortRef.current !== controller) return;
            if (err.name === "AbortError" && !timedOut) return;
            setPlaces([]);
            setError(
                timedOut
                    ? "Nearby search timed out. You can still enter a distance or choose By Route."
                    : /429/.test(err.message || "")
                      ? "Nearby places are busy. You can still enter a distance or choose By Route."
                      : "Nearby places are unavailable. You can still enter a distance or choose By Route.",
            );
            setLoading(false);
        })
            .finally(() => {
                if (abortRef.current === controller) {
                    clearTimeout(timeoutId);
                    setLoading(false);
                }
            });

        return () => {
            clearTimeout(timeoutId);
            if (abortRef.current === controller) {
                abortRef.current = null;
            }
            controller.abort();
        };
    }, [location?.lat, location?.lng, retryCount]);

    return { places, loading, error, retry: () => setRetryCount((c) => c + 1) };
}
