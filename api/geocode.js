const NOMINATIM_BASE_URL =
    process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
const NOMINATIM_CONTACT = process.env.NOMINATIM_CONTACT;

// Bail out of a slow/hung upstream instead of holding the serverless function
// open until the platform execution cap. The client already times out at 10s
// (src/utils/geocode.js), so the server conversing should abort first to return
// a definitive 504 rather than a wall-clock timeout.
const UPSTREAM_TIMEOUT_MS = 8000;

function queryValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function sendJson(res, status, body, cacheControl) {
    res.status(status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);
    res.json(body);
}

function upstreamUrl(mode, query) {
    const url = new URL(
        mode === "reverse"
            ? "/reverse"
            : "/search",
        NOMINATIM_BASE_URL,
    );

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "en");

    if (mode === "reverse") {
        url.searchParams.set("lat", query.lat);
        url.searchParams.set("lon", query.lon);
        url.searchParams.set("zoom", "10");
    } else {
        url.searchParams.set("q", query.q);
        url.searchParams.set("limit", "5");
        if (query.viewbox) url.searchParams.set("viewbox", query.viewbox);
    }

    return url;
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    const mode = queryValue(req.query?.mode) || "search";
    const q = String(queryValue(req.query?.q) || "").trim();

    if (mode === "search" && q.length < 2) {
        return sendJson(res, 400, {
            code: "INVALID_QUERY",
            error: "Enter at least two characters to search for a location.",
        });
    }

    const lat = queryValue(req.query?.lat);
    const lon = queryValue(req.query?.lon);
    if (
        mode === "reverse" &&
        (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)))
    ) {
        return sendJson(res, 400, {
            code: "INVALID_COORDINATES",
            error: "Valid coordinates are required.",
        });
    }

    if (mode !== "search" && mode !== "reverse") {
        return sendJson(res, 400, {
            code: "INVALID_MODE",
            error: "Unsupported geocoding mode.",
        });
    }

    try {
        const headers = {
            Accept: "application/json",
            "User-Agent": `DistanceContext/1.0${NOMINATIM_CONTACT ? ` (${NOMINATIM_CONTACT})` : ""}`,
        };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        let upstream;
        try {
            upstream = await fetch(
                upstreamUrl(mode, {
                    q,
                    lat,
                    lon,
                    viewbox: queryValue(req.query?.viewbox),
                }),
                { headers, signal: controller.signal },
            );
        } finally {
            clearTimeout(timeout);
        }

        if (upstream.status === 429) {
            const retryAfter = upstream.headers.get("retry-after");
            if (retryAfter) res.setHeader("Retry-After", retryAfter);
            return sendJson(res, 429, {
                code: "RATE_LIMITED",
                error: "Location search is busy. Try again in a moment.",
            });
        }

        if (!upstream.ok) {
            return sendJson(res, 502, {
                code: "UPSTREAM_ERROR",
                error: "Location search is temporarily unavailable.",
            });
        }

        const data = await upstream.json();
        if (mode === "search" && !Array.isArray(data)) {
            return sendJson(res, 502, {
                code: "INVALID_RESPONSE",
                error: "Location search returned an invalid response.",
            });
        }

        if (mode === "search" && data.length === 0) {
            return sendJson(res, 404, {
                code: "NOT_FOUND",
                error: `Location "${q}" was not found.`,
            });
        }

        return sendJson(
            res,
            200,
            data,
            "public, s-maxage=3600, stale-while-revalidate=86400",
        );
    } catch (err) {
        // An abort from the timeout above is a definitive "took too long",
        // distinct from a genuine upstream/network failure.
        if (err?.name === "AbortError") {
            return sendJson(res, 504, {
                code: "TIMEOUT",
                error: "Location search took too long. Try again.",
            });
        }
        return sendJson(res, 502, {
            code: "NETWORK_ERROR",
            error: "Location search is unavailable. Check your connection and try again.",
        });
    }
}
