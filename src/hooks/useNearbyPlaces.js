import { useState, useEffect, useRef } from 'react';
import { haversineDistanceKm } from '../utils/distance';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const RADIUS_METERS = 50000;
const MAX_RESULTS = 50;
const TOP_PLACES = 20;

const PLACE_WEIGHT = {
  city: 5,
  town: 4,
  suburb: 3,
  village: 2,
  neighbourhood: 1,
};

function cacheKey(lat, lng) {
  return `nearby_places_${lat.toFixed(1)}_${lng.toFixed(1)}`;
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
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({ data, ts: Date.now() }));
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

    const query = `[out:json][timeout:15];node["place"~"^(city|town|suburb|village|neighbourhood)$"](around:${RADIUS_METERS},${lat},${lng});out body ${MAX_RESULTS};`;

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.elements) {
          setPlaces([]);
          setLoading(false);
          return;
        }

        const seen = new Set();
        const result = [];
        for (const el of data.elements) {
          const name = el.tags?.name;
          const placeType = el.tags?.place;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          const distanceKm = haversineDistanceKm([el.lat, el.lng], [lat, lng]);
          const weight = PLACE_WEIGHT[placeType] ?? 0;
          result.push({
            name,
            lat: el.lat,
            lng: el.lon,
            placeType,
            distanceKm,
            score: weight * 100 - distanceKm,
          });
        }

        result.sort((a, b) => b.score - a.score);

        setPlaces(result.slice(0, TOP_PLACES));
        writeCache(lat, lng, result);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setPlaces([]);
          setLoading(false);
        }
      });
  }, [location?.lat, location?.lng, retryCount]);

  return { places, loading, error, retry: () => setRetryCount((c) => c + 1) };
}
