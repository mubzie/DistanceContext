import { useState, useEffect, useRef } from "react";
import { haversineDistanceKm } from "../utils/distance";

const CACHE_TTL = 24 * 60 * 60 * 1000;
const RADIUS_METERS = 50000;
const LOCAL_RADIUS_METERS = 25000;
const QUERY_LIMIT = 250;
const TOP_PLACES = 20;

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
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `data=${encodeURIComponent(query)}`,
                signal,
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
            if (err.name === "AbortError") throw err;
            lastError = err;
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

function cacheKey(lat, lng) {
    return `nearby_places_v5_${lat.toFixed(1)}_${lng.toFixed(1)}`;
}

// Older cache versions (v4 and earlier) may hold empty place arrays written
// when the regional mirror "succeeded" with no elements — the exact bug that
// made the map unresponsive. Purge them once so stale empties can't resurface.
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

function loadCache(lat, lng) {
    try {
        const raw = localStorage.getItem(cacheKey(lat, lng));
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            localStorage.removeItem(cacheKey(lat, lng));
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
            JSON.stringify({ data, ts: Date.now() }),
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
        if (!location) return;

        const { lat, lng } = location;

        const key = cacheKey(lat, lng);
        purgeStaleCache(key);

        const cached = loadCache(lat, lng);
        if (cached) {
            setPlaces(cached);
            setLoading(false);
            setError(null);
            return;
        }

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        // Tiered query: all cities/towns within 50 km (they're few), plus
        // suburbs/villages/neighbourhoods within 25 km. A single flat query with
        // a small `out` cap returns arbitrary elements (Overpass doesn't sort by
        // distance), which silently drops well-known places like Ikeja or Agege.
        const query = `[out:json][timeout:25];(node["place"~"^(city|town)$"](around:${RADIUS_METERS},${lat},${lng});node["place"~"^(suburb|village|neighbourhood)$"](around:${LOCAL_RADIUS_METERS},${lat},${lng}););out body ${QUERY_LIMIT};`;

        fetchOverpass(query, controller.signal)
            .then((data) => {
                if (!data?.elements) {
                    setPlaces([]);
                    setLoading(false);
                    return;
                }

                const seen = new Set();
                // OSM often has several differently-named place nodes at the
                // same spot (e.g. "Igbe" / "Igbe Ewoliwo", "Agani" / "Aqani"),
                // so dedup by coordinates as well as by name — rounded to
                // ~110 m — keeping the highest-scoring name of each cluster.
                const byCoord = new Map();
                for (const el of data.elements) {
                    const name = el.tags?.name;
                    const placeType = el.tags?.place;
                    if (!name || seen.has(name)) continue;
                    seen.add(name);
                    const distanceKm = haversineDistanceKm(
                        [el.lat, el.lon],
                        [lat, lng],
                    );
                    const weight = PLACE_WEIGHT[placeType] ?? 0;
                    const score = weight * 100 - distanceKm;
                    const coordKey = `${el.lat.toFixed(3)},${el.lon.toFixed(3)}`;
                    const existing = byCoord.get(coordKey);
                    if (existing && existing.score >= score) continue;
                    byCoord.set(coordKey, {
                        name,
                        lat: el.lat,
                        lng: el.lon,
                        placeType,
                        distanceKm,
                        score,
                    });
                }

                const result = [...byCoord.values()];

                result.sort((a, b) => b.score - a.score);

                const top = result.slice(0, TOP_PLACES);

                setPlaces(top);
                if (top.length > 0) writeCache(lat, lng, top);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err.message);
                    setPlaces([]);
                    setLoading(false);
                }
            });
    }, [location?.lat, location?.lng, retryCount]);

    return { places, loading, error, retry: () => setRetryCount((c) => c + 1) };
}
