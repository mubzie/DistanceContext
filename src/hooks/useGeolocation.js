import { useCallback, useEffect, useState } from "react";

const HIGH_ACCURACY_TIMEOUT_MS = 10000;
const MAX_AGE_MS = 60000;
// PositionError code for a timed-out fix (PositionError.TIMEOUT === 3).
const POSITION_TIMEOUT_CODE = 3;

function locationErrorMessage(error) {
    switch (error?.code) {
        case 1:
            return "Location permission was denied. Allow access or set your location manually.";
        case 2:
            return "Your location could not be determined. Try again or set it manually.";
        case POSITION_TIMEOUT_CODE:
            return "Location request timed out. Try again or set it manually.";
        default:
            return "Location is unavailable. Try again or set it manually.";
    }
}

// Single-shot geolocation with a manual refresh path. High accuracy is tried
// first; on timeout the request is retried once at default accuracy so slow
// GPS fixes don't strand the user. There is no implicit default location —
// callers decide what "no location" means (hint, manual entry, map-only
// fallback center).
export function useGeolocation() {
    const [status, setStatus] = useState("idle");
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);

    const requestLocation = useCallback(() => {
        const isLocalHost =
            typeof window !== "undefined" &&
            ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
                window.location.hostname,
            );
        if (
            typeof window !== "undefined" &&
            !window.isSecureContext &&
            !isLocalHost
        ) {
            setError(
                "Location access requires HTTPS or localhost. Set your location manually.",
            );
            setStatus("error");
            return;
        }

        if (!("geolocation" in navigator)) {
            setError(
                "Location is not supported by this browser. Set it manually.",
            );
            setStatus("error");
            return;
        }

        setStatus("locating");
        setError(null);

        const tryGet = (highAccuracy) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracyMeters: position.coords.accuracy ?? null,
                        source: "gps",
                    });
                    setStatus("ready");
                },
                (err) => {
                    if (err.code === POSITION_TIMEOUT_CODE && highAccuracy) {
                        tryGet(false);
                    } else {
                        setError(locationErrorMessage(err));
                        setStatus("error");
                    }
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: HIGH_ACCURACY_TIMEOUT_MS,
                    maximumAge: MAX_AGE_MS,
                },
            );
        };

        tryGet(true);
    }, []);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    const setManualLocation = useCallback((lat, lng) => {
        setLocation({ lat, lng, accuracyMeters: null, source: "manual" });
        setStatus("ready");
        setError(null);
    }, []);

    return {
        location,
        loading: status === "idle" || status === "locating",
        error,
        status,
        source: location?.source ?? null,
        accuracyMeters: location?.accuracyMeters ?? null,
        requestLocation,
        setManualLocation,
    };
}
