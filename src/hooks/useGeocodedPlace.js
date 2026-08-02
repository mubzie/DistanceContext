import { useEffect, useRef, useState } from "react";
import { geocodeCandidates, locationViewbox } from "../utils/geocode";
import { bestLocalMatch, rankCandidates } from "../utils/placeMatch";
import { haversineDistanceKm } from "../utils/distance";
import { LAGOS_PLACES } from "../data/lagosPlaces";

const DEBOUNCE_MS = 400;
// Results farther than this from the active location count as "outside the
// nearby area" — the UI flags them so the local-context framing stays honest.
const NEARBY_RADIUS_KM = 50;

// Resolves a free-typed place name to coordinates, in order of preference:
//   1. exact match against the nearby-places list
//   2. exact match against the curated index of well-known Lagos places
//   3. fuzzy match against both (min 3 chars)
//   4. Nominatim geocoding, biased toward the active location (viewbox) and
//      re-ranked by importance − distance, so ambiguous names like "Agric" or
//      "Yaba" resolve to the nearby places the user means, not far-away ones
//      with the same name.
// All local layers are instant and offline; geocoding is debounced and
// cancelled on change so the route boxes don't hammer the API per keystroke.
export function useGeocodedPlace(value, nearbyPlaces, location) {
    const [place, setPlace] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isGeocoded, setIsGeocoded] = useState(false);
    const requestIdRef = useRef(0);

    const viewbox = location
        ? locationViewbox(location.lat, location.lng)
        : undefined;

    useEffect(() => {
        const trimmed = String(value || "").trim();
        const local = bestLocalMatch(trimmed, [
            nearbyPlaces ?? [],
            LAGOS_PLACES,
        ]);

        if (local || !trimmed) {
            setPlace(local?.place ?? null);
            setIsGeocoded(false);
            setLoading(false);
            setError(null);
            return;
        }

        const requestId = ++requestIdRef.current;
        const controller = new AbortController();

        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            geocodeCandidates(trimmed, {
                signal: controller.signal,
                viewbox,
            })
                .then((candidates) => {
                    if (requestId !== requestIdRef.current) return;
                    const ranked = rankCandidates(candidates, location);
                    setPlace(ranked[0] ?? null);
                    setIsGeocoded(true);
                })
                .catch((err) => {
                    if (requestId !== requestIdRef.current) return;
                    if (err.name !== "AbortError") {
                        setError(err.message);
                        setPlace(null);
                        setIsGeocoded(false);
                    }
                })
                .finally(() => {
                    if (requestId === requestIdRef.current) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // `location` only matters through `viewbox` (same coordinates), so the
        // re-rank closure is always current when the effect runs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, nearbyPlaces, viewbox]);

    const distanceKm =
        place && location
            ? haversineDistanceKm(
                  [location.lat, location.lng],
                  [place.lat, place.lng],
              )
            : null;

    return {
        place,
        loading,
        error,
        isGeocoded,
        outsideArea:
            isGeocoded && distanceKm != null && distanceKm > NEARBY_RADIUS_KM,
    };
}
