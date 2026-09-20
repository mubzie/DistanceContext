import { useState, useEffect, useRef } from "react";
import {
    Map,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MapRoute,
    MapControls,
    useMap,
    MapGeoJSON,
} from "./ui/map";
import {
    Card,
    CardHeader,
    CardContent,
} from "./ui/card";
import { Loader2, MapPin } from "lucide-react";
import { MapOverlay } from "./MapOverlay";
import { geojsonLineMidpoint } from "../utils/distance";
import { formatDistance } from "../utils/format";

// Sole source of the map's blue (routes, ring). MapLibre paint properties do
// not resolve CSS variables, so it's duplicated as a Tailwind token
// `--color-map-accent` in index.css for DOM-side classes; keep them in sync.
const MAP_ACCENT = "#3b82f6";

// The dashed straight-line comparison drawn between the route's endpoints.
const STRAIGHT_LINE_COLOR = "#94a3b8";

// Display-only fallback for the map before any GPS or manual location exists.
// Deliberately neutral (world view) — never a Lagos default, so the map can't
// look like it assumes a location the user hasn't given.
const NEUTRAL_CENTER = [0, 0];
const NEUTRAL_ZOOM = 2;
const REGION_ZOOM = 9;

function circleGeoJSON(lat, lng, radiusKm, points = 64) {
    const coords = [];
    const R = 6371;
    for (let i = 0; i <= points; i++) {
        const bearing = (i / points) * 2 * Math.PI;
        const lat1 = (lat * Math.PI) / 180;
        const lng1 = (lng * Math.PI) / 180;
        const d = radiusKm / R;
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) +
                Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
        );
        const lng2 =
            lng1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
                Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
            );
        coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
    }
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [coords] },
            },
        ],
    };
}

// A distance pill pinned to a line, rendered as an HTML marker (the same
// mechanism as the endpoint markers) so it needs no glyphs from the basemap.
// The swatch reproduces the line's own style — dashed grey vs solid blue — so
// the two labels stay tellable apart without relying on colour alone; the
// words are kept for screen readers only. `pointer-events-none` keeps the
// marker from swallowing map drags.
function LineLabel({
    color,
    dashed = false,
    srLabel,
    distanceKm,
    distanceUnit,
    style,
}) {
    return (
        <MarkerContent
            className="pointer-events-none cursor-default"
            style={style}
        >
            <div className="flex items-center gap-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-md backdrop-blur-md">
                <svg
                    width="16"
                    height="4"
                    viewBox="0 0 16 4"
                    className="shrink-0"
                    aria-hidden="true"
                >
                    <line
                        x1="1"
                        y1="2"
                        x2="15"
                        y2="2"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={dashed ? "3 3" : undefined}
                    />
                </svg>
                <span className="sr-only">{srLabel}</span>
                <span className="tabular-nums text-foreground">
                    {formatDistance(distanceKm, distanceUnit)}
                </span>
            </div>
        </MarkerContent>
    );
}

export function RouteMap({
    route,
    actualRouteCoords,
    actualRouteKm,
    isRouteLoading,
    userLocation,
    activeLocation,
    mode,
    routeDistanceKm,
    displayDistanceKm,
    estimatedMinutes,
    travelMode,
    distanceUnit,
}) {
    const [animProgress, setAnimProgress] = useState(1);
    const animRef = useRef(null);
    const startTimeRef = useRef(null);

    useEffect(() => {
        if (!actualRouteCoords || actualRouteCoords.length < 2) {
            setAnimProgress(1);
            return;
        }

        if (
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ) {
            setAnimProgress(1);
            return;
        }

        if (animRef.current) cancelAnimationFrame(animRef.current);
        setAnimProgress(0);
        startTimeRef.current = null;

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const t = Math.min(elapsed / 800, 1);
            setAnimProgress(t);
            if (t < 1) animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [actualRouteCoords]);

    const [bouncing, setBouncing] = useState(false);

    useEffect(() => {
        if (route) {
            setBouncing(true);
            const timer = setTimeout(() => setBouncing(false), 400);
            return () => clearTimeout(timer);
        }
    }, [route?.start, route?.end]);

    const animatedCoords =
        actualRouteCoords && actualRouteCoords.length > 1
            ? actualRouteCoords.slice(
                  0,
                  Math.max(
                      1,
                      Math.floor(animProgress * actualRouteCoords.length),
                  ),
              )
            : [];

    const markerClass = `h-4 w-4 rounded-full border-2 border-white shadow-lg ${
        bouncing ? "animate-bounce motion-reduce:animate-none" : ""
    }`;

    // Browser geolocation may be denied on mobile; fall back to the app's
    // active location (real GPS or the default area) so the distance ring
    // still responds to input.
    const ringLocation = userLocation ?? activeLocation;

    const center = route
        ? [
              (route.startCoords[1] + route.endCoords[1]) / 2,
              (route.startCoords[0] + route.endCoords[0]) / 2,
          ]
        : ringLocation
          ? [ringLocation.lng, ringLocation.lat]
          : NEUTRAL_CENTER;

    const mapZoom = route ? 10 : ringLocation ? REGION_ZOOM : NEUTRAL_ZOOM;

    const straightLineCoords = route
        ? [
              [route.startCoords[1], route.startCoords[0]],
              [route.endCoords[1], route.endCoords[0]],
          ]
        : [];

    // Each label carries its own line's length: the dashed line is the endpoint
    // span, the route line the road distance OSRM measured for it.
    const straightLineKm = route?.baseDistanceKm ?? routeDistanceKm;
    const routeLineKm = actualRouteKm ?? displayDistanceKm;
    const hasRouteLine = actualRouteCoords?.length > 1;

    // When the road barely deviates the dashed line hides under the route, so
    // its label would only repeat the same number. Half a kilometre or 5% of
    // the span counts as "the same line".
    const linesCoincide =
        hasRouteLine &&
        straightLineKm > 0 &&
        Math.abs(routeLineKm - straightLineKm) <
            Math.max(0.5, straightLineKm * 0.05);

    const straightLabelPos = route
        ? geojsonLineMidpoint(straightLineCoords)
        : null;
    const routeLabelPos = hasRouteLine
        ? geojsonLineMidpoint(actualRouteCoords)
        : null;

    // Reveal the route label as its line finishes drawing instead of floating
    // ahead of the animation.
    const routeLabelOpacity = Math.min(
        1,
        Math.max(0, (animProgress - 0.75) / 0.25),
    );

    const showRing = mode === "distance" && routeDistanceKm > 0 && ringLocation;
    const ringData = showRing
        ? circleGeoJSON(ringLocation.lat, ringLocation.lng, routeDistanceKm)
        : null;

    return (
        <Card className="rounded-none w-full h-full">
            <CardHeader className="hidden md:block">
                <div className="flex items-center justify-between">
                    {isRouteLoading && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Routing...
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="h-full p-2">
                <div className="relative overflow-hidden rounded-[.5rem] h-full">
                    <Map
                        center={center}
                        zoom={mapZoom}
                        className="h-full w-full"
                    >
                        <RecenterOnLocation
                            location={ringLocation}
                            route={route}
                        />
                        {route && (
                            <FitRouteBounds
                                route={route}
                                actualRouteCoords={actualRouteCoords}
                            />
                        )}
                        {mode === "distance" && !route && (
                            <FitDistanceRing
                                location={ringLocation}
                                radiusKm={routeDistanceKm}
                            />
                        )}
                        {route && (
                            <MapRoute
                                coordinates={straightLineCoords}
                                color={STRAIGHT_LINE_COLOR}
                                width={2}
                                opacity={0.5}
                                dashArray={[4, 6]}
                            />
                        )}
                        {actualRouteCoords && actualRouteCoords.length > 1 && (
                            <>
                                <MapRoute
                                    coordinates={animatedCoords}
                                    color={MAP_ACCENT}
                                    width={12}
                                    opacity={0.15}
                                    interactive={false}
                                />
                                <MapRoute
                                    coordinates={animatedCoords}
                                    color={MAP_ACCENT}
                                    width={4}
                                    opacity={0.9}
                                />
                            </>
                        )}
                        {straightLabelPos && !linesCoincide && (
                            <MapMarker
                                longitude={straightLabelPos[0]}
                                latitude={straightLabelPos[1]}
                                offset={[0, -14]}
                                className="pointer-events-none"
                            >
                                <LineLabel
                                    color={STRAIGHT_LINE_COLOR}
                                    dashed
                                    srLabel="Straight line"
                                    distanceKm={straightLineKm}
                                    distanceUnit={distanceUnit}
                                />
                            </MapMarker>
                        )}
                        {routeLabelPos && (
                            <MapMarker
                                longitude={routeLabelPos[0]}
                                latitude={routeLabelPos[1]}
                                offset={[0, 16]}
                                className="pointer-events-none"
                            >
                                <LineLabel
                                    color={MAP_ACCENT}
                                    srLabel="Route"
                                    distanceKm={routeLineKm}
                                    distanceUnit={distanceUnit}
                                    style={{ opacity: routeLabelOpacity }}
                                />
                            </MapMarker>
                        )}
                        {route && (
                            <>
                                <MapMarker
                                    longitude={route.startCoords[1]}
                                    latitude={route.startCoords[0]}
                                >
                                    <MarkerContent aria-label={route.start}>
                                        <div
                                            className={`${markerClass} bg-foreground`}
                                        />
                                    </MarkerContent>
                                    <MarkerPopup>{route.start}</MarkerPopup>
                                </MapMarker>
                                <MapMarker
                                    longitude={route.endCoords[1]}
                                    latitude={route.endCoords[0]}
                                >
                                    <MarkerContent aria-label={route.end}>
                                        <div
                                            className={`${markerClass} bg-foreground`}
                                        />
                                    </MarkerContent>
                                    <MarkerPopup>{route.end}</MarkerPopup>
                                </MapMarker>
                            </>
                        )}
                        {userLocation && (
                                <MapMarker
                                    longitude={userLocation.lng}
                                    latitude={userLocation.lat}
                                >
                                    <MarkerContent aria-label="You are here">
                                        <div className="relative">
                                            <div className="absolute inset-0 h-4 w-4 rounded-full animate-pulse-soft motion-reduce:animate-none" />
                                            <div className="relative h-4 w-4 rounded-full border-2 border-white bg-map-accent shadow-lg ring-2 ring-map-accent/50" />
                                        </div>
                                    </MarkerContent>
                                    <MarkerPopup>You are here</MarkerPopup>
                                </MapMarker>
                        )}
                        {ringData && (
                            <MapGeoJSON
                                data={ringData}
                                fillPaint={{
                                    "fill-color": MAP_ACCENT,
                                    "fill-opacity": 0.08,
                                }}
                                linePaint={{
                                    "line-color": MAP_ACCENT,
                                    "line-width": 2,
                                    "line-opacity": 0.4,
                                    "line-dasharray": [4, 8],
                                }}
                            />
                        )}
                        <MapControls
                            showZoom
                            showCompass={false}
                            showLocate={false}
                            showFullscreen={false}
                        />
                    </Map>
                    {!ringLocation && !route && (
                        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 md:top-6">
                            <div className="flex items-center gap-1.5 rounded-xl bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-md backdrop-blur-md">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                Set your location to begin
                            </div>
                        </div>
                    )}
                    <MapOverlay
                        route={route}
                        distanceKm={displayDistanceKm}
                        estimatedMinutes={estimatedMinutes}
                        travelMode={travelMode}
                        distanceUnit={distanceUnit}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function FitRouteBounds({ route, actualRouteCoords }) {
    const { map, isLoaded } = useMap();

    const fitKey =
        actualRouteCoords?.length > 1
            ? `osrm:${actualRouteCoords[0][0].toFixed(4)},${actualRouteCoords[0][1].toFixed(4)}-${actualRouteCoords[actualRouteCoords.length - 1][0].toFixed(4)},${actualRouteCoords[actualRouteCoords.length - 1][1].toFixed(4)}`
            : `route:${route.startCoords[0].toFixed(4)},${route.startCoords[1].toFixed(4)}-${route.endCoords[0].toFixed(4)},${route.endCoords[1].toFixed(4)}`;

    useEffect(() => {
        if (!map || !isLoaded) return;

        // The map may have been constructed before the route panel layout
        // settled (sticky panel on mobile/desktop). A stale canvas size makes
        // fitBounds compute a wrong viewport, so resize first and bail if the
        // container isn't laid out yet.
        const container = map.getContainer();
        if (!container || !container.clientHeight) return;
        map.resize();

        if (actualRouteCoords?.length > 1) {
            let minLng = Infinity,
                maxLng = -Infinity,
                minLat = Infinity,
                maxLat = -Infinity;
            for (const [lng, lat] of actualRouteCoords) {
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
            const lngPad = Math.max((maxLng - minLng) * 0.1, 0.005);
            const latPad = Math.max((maxLat - minLat) * 0.1, 0.005);
            map.fitBounds(
                [
                    [minLng - lngPad, minLat - latPad],
                    [maxLng + lngPad, maxLat + latPad],
                ],
                { padding: 40, maxZoom: 14, animate: true, duration: 1000 },
            );
        } else {
            const sw = [route.startCoords[1], route.startCoords[0]];
            const ne = [route.endCoords[1], route.endCoords[0]];
            map.fitBounds([sw, ne], {
                padding: 40,
                maxZoom: 14,
                animate: true,
                duration: 1000,
            });
        }
    }, [map, isLoaded, fitKey]);

    return null;
}

// Fallback viewport control while a distance is entered but no route pair has
// matched yet (nearby places still loading or unavailable): fit the radius
// ring around the active location so the map still responds to input. Once a
// route exists, FitRouteBounds owns the viewport. Debounced so fast typing
// ("25" as "2" then "5") doesn't fire a fit per keystroke.
function FitDistanceRing({ location, radiusKm }) {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded || !location || !(radiusKm > 0)) return;

        const container = map.getContainer();
        if (!container || !container.clientHeight) return;
        map.resize();

        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        const timer = setTimeout(() => {
            const lat = location.lat;
            const lng = location.lng;
            const dLat = radiusKm / 111.32;
            const dLng =
                radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
            map.fitBounds(
                [
                    [lng - dLng, lat - dLat],
                    [lng + dLng, lat + dLat],
                ],
                {
                    padding: 48,
                    maxZoom: 13,
                    animate: !reduceMotion,
                    duration: 600,
                },
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [map, isLoaded, location?.lat, location?.lng, radiusKm]);

    return null;
}

// Keeps the viewport on the active location when no route owns it (routes are
// fitted by FitRouteBounds). Fires only when the location or route presence
// actually changes, so user panning isn't fought on unrelated re-renders.
function RecenterOnLocation({ location, route }) {
    const { map, isLoaded } = useMap();

    const locationKey = location
        ? `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`
        : "default";
    const routeActive = Boolean(route);

    useEffect(() => {
        if (!map || !isLoaded || routeActive) return;

        const center = location
            ? [location.lng, location.lat]
            : NEUTRAL_CENTER;
        map.flyTo({
            center,
            zoom: location ? REGION_ZOOM : NEUTRAL_ZOOM,
            duration: 800,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded, locationKey, routeActive]);

    return null;
}
