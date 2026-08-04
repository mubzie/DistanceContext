import { findKnownLocation } from "../data/knownLocations";

const GEOCODE_ENDPOINT = "/api/geocode";
const REQUEST_TIMEOUT_MS = 10000;

class GeocodeError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "GeocodeError";
        this.code = code;
    }
}

async function requestGeocoder(url, signal) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const abortRequest = () => controller.abort();
    signal?.addEventListener("abort", abortRequest, { once: true });
    if (signal?.aborted) controller.abort();

    try {
        const res = await fetch(url, { signal: controller.signal });
        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        if (res.status === 429) {
            throw new GeocodeError(
                data?.error || "Location search is busy. Try again in a moment.",
                "RATE_LIMITED",
            );
        }
        if (res.status === 404) {
            if (data?.code !== "NOT_FOUND") {
                throw new GeocodeError(
                    "Location search is temporarily unavailable.",
                    "UPSTREAM_ERROR",
                );
            }
            throw new GeocodeError(
                data?.error || "Location was not found.",
                "NOT_FOUND",
            );
        }
        if (!res.ok) {
            throw new GeocodeError(
                data?.error ||
                    "Location search is temporarily unavailable.",
                "UPSTREAM_ERROR",
            );
        }
        return data;
    } catch (err) {
        if (signal?.aborted) throw err;
        if (timedOut) {
            throw new GeocodeError(
                "Location search took too long. Try again.",
                "TIMEOUT",
            );
        }
        if (err instanceof GeocodeError) throw err;
        throw new GeocodeError(
            "Location search is unavailable. Check your connection and try again.",
            "NETWORK_ERROR",
        );
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abortRequest);
    }
}

export async function reverseGeocode(lat, lng) {
    const url = new URL(GEOCODE_ENDPOINT, window.location.origin);
    url.searchParams.set("mode", "reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    const data = await requestGeocoder(url, undefined);
    const parsedLat = Number(data?.lat);
    const parsedLng = Number(data?.lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        throw new GeocodeError("Could not determine location name.", "INVALID_RESPONSE");
    }
    return {
        name:
            data.display_name?.split(",")[0]?.trim() ||
            `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        lat: parsedLat,
        lng: parsedLng,
    };
}

// Nominatim viewbox (left, top, right, bottom) around a location. Biases
// search results toward the user's area so ambiguous names resolve locally —
// "Agric" or "Yaba" must not match identically named places in Ghana or
// Burkina Faso.
const VIEWBOX_DEGREES = 2;

export function locationViewbox(lat, lng) {
    return `${lng - VIEWBOX_DEGREES},${lat + VIEWBOX_DEGREES},${lng + VIEWBOX_DEGREES},${lat - VIEWBOX_DEGREES}`;
}

// Top candidate per Nominatim's own ranking (used by the location search bar).
export async function forwardGeocode(query, options = {}) {
    const candidates = await geocodeCandidates(query, options);
    return candidates[0];
}

// Up to 5 candidates with their importance, so callers can re-rank them by
// proximity to the active location instead of trusting global importance.
export async function geocodeCandidates(query, options = {}) {
    const { signal, viewbox } = options;
    const knownLocation = findKnownLocation(query);
    if (knownLocation) return [knownLocation];

    const url = new URL(GEOCODE_ENDPOINT, window.location.origin);
    url.searchParams.set("mode", "search");
    url.searchParams.set("q", query);
    if (viewbox) url.searchParams.set("viewbox", viewbox);

    const data = await requestGeocoder(url, signal);
    if (!Array.isArray(data) || !data.length) {
        throw new GeocodeError(
            `Location "${query}" was not found.`,
            "NOT_FOUND",
        );
    }

    const candidates = data
        .map((r) => ({
            name: r.display_name?.split(",")[0]?.trim() || r.name,
            lat: Number(r.lat),
            lng: Number(r.lon),
            importance: r.importance ?? 0,
            displayName: r.display_name,
        }))
        .filter((candidate) =>
            Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng),
        );

    if (!candidates.length) {
        throw new GeocodeError(
            `Location "${query}" was not found.`,
            "INVALID_RESPONSE",
        );
    }

    return candidates;
}
