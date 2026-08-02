export async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;

    const res = await fetch(url, {
        headers: { "User-Agent": "DistanceContext/1.0" },
    });

    if (!res.ok) throw new Error("Could not determine location name");

    const data = await res.json();
    return {
        name:
            data.display_name?.split(",")[0]?.trim() ||
            `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
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
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=en`;
    if (viewbox) url += `&viewbox=${viewbox}`;

    const res = await fetch(url, {
        headers: { "User-Agent": "DistanceContext/1.0" },
        signal,
    });

    if (!res.ok) throw new Error("Could not search for location");

    const data = await res.json();
    if (!data.length) throw new Error(`Location "${query}" not found`);

    return data.map((r) => ({
        name: r.display_name?.split(",")[0]?.trim() || r.name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        importance: r.importance ?? 0,
        displayName: r.display_name,
    }));
}
