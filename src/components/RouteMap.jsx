import { useState, useEffect, useRef } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapRoute, MapControls, useMap, MapGeoJSON } from "./ui/map";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Loader2 } from "lucide-react";

function circleGeoJSON(lat, lng, radiusKm, points = 64) {
  const coords = [];
  const R = 6371;
  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const d = radiusKm / R;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
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

export function RouteMap({ route, actualRouteCoords, isRouteLoading, userLocation, mode, routeDistanceKm }) {
  const [animProgress, setAnimProgress] = useState(1);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!actualRouteCoords || actualRouteCoords.length < 2) {
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
      ? actualRouteCoords.slice(0, Math.max(1, Math.floor(animProgress * actualRouteCoords.length)))
      : [];

  const markerClass = `h-4 w-4 rounded-full border-2 border-white shadow-lg ${
    bouncing ? "animate-bounce" : ""
  }`;

  const center = route
    ? [
        (route.startCoords[1] + route.endCoords[1]) / 2,
        (route.startCoords[0] + route.endCoords[0]) / 2,
      ]
    : userLocation
      ? [userLocation.lng, userLocation.lat]
      : [3.3792, 6.5244];

  const straightLineCoords = route
    ? [
        [route.startCoords[1], route.startCoords[0]],
        [route.endCoords[1], route.endCoords[0]],
      ]
    : [];

  const showRing = mode === "distance" && routeDistanceKm > 0 && userLocation;
  const ringData = showRing ? circleGeoJSON(userLocation.lat, userLocation.lng, routeDistanceKm) : null;

  return (
    <Card className="rounded-none w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium uppercase tracking-[0.25em]">
              Map
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {route
                ? "A single leg is shown to keep the map calm and readable."
                : "Select a route or enter a distance to see it on the map."}
            </CardDescription>
          </div>
          {isRouteLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Routing...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-full p-4">
        <div className="overflow-hidden rounded-[1.5rem] h-full">
          <Map center={center} zoom={route ? 10 : 9} className="h-full w-full">
            {route && <FitRouteBounds route={route} actualRouteCoords={actualRouteCoords} />}
            {route && (
              <MapRoute
                coordinates={straightLineCoords}
                color="#94a3b8"
                width={2}
                opacity={0.5}
                dashArray={[4, 6]}
              />
            )}
            {actualRouteCoords && actualRouteCoords.length > 1 && (
              <>
                <MapRoute
                  coordinates={animatedCoords}
                  color="#3b82f6"
                  width={12}
                  opacity={0.15}
                  interactive={false}
                />
                <MapRoute
                  coordinates={animatedCoords}
                  color="#3b82f6"
                  width={4}
                  opacity={0.9}
                />
              </>
            )}
            {route && (
              <>
                <MapMarker longitude={route.startCoords[1]} latitude={route.startCoords[0]}>
                  <MarkerContent>
                    <div className={`${markerClass} bg-foreground`} />
                  </MarkerContent>
                  <MarkerPopup>{route.start}</MarkerPopup>
                </MapMarker>
                <MapMarker longitude={route.endCoords[1]} latitude={route.endCoords[0]}>
                  <MarkerContent>
                    <div className={`${markerClass} bg-foreground`} />
                  </MarkerContent>
                  <MarkerPopup>{route.end}</MarkerPopup>
                </MapMarker>
              </>
            )}
            {userLocation && (
              <MapMarker longitude={userLocation.lng} latitude={userLocation.lat}>
                <MarkerContent>
                  <div className="relative">
                    <div className="absolute inset-0 h-4 w-4 rounded-full animate-pulse-soft" />
                    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg ring-2 ring-blue-500/50" />
                  </div>
                </MarkerContent>
                <MarkerPopup>You are here</MarkerPopup>
              </MapMarker>
            )}
            {ringData && (
              <MapGeoJSON
                data={ringData}
                fillPaint={{ "fill-color": "#3b82f6", "fill-opacity": 0.08 }}
                linePaint={{
                  "line-color": "#3b82f6",
                  "line-width": 2,
                  "line-opacity": 0.4,
                  "line-dasharray": [4, 8],
                }}
              />
            )}
            <MapControls showZoom showCompass={false} showLocate={false} showFullscreen={false} />
          </Map>
        </div>
      </CardContent>
    </Card>
  );
}

function FitRouteBounds({ route, actualRouteCoords }) {
  const { map, isLoaded } = useMap();

  const fitKey = actualRouteCoords?.length > 1
    ? `osrm:${actualRouteCoords[0][0].toFixed(4)},${actualRouteCoords[0][1].toFixed(4)}-${actualRouteCoords[actualRouteCoords.length - 1][0].toFixed(4)},${actualRouteCoords[actualRouteCoords.length - 1][1].toFixed(4)}`
    : `route:${route.startCoords[0].toFixed(4)},${route.startCoords[1].toFixed(4)}-${route.endCoords[0].toFixed(4)},${route.endCoords[1].toFixed(4)}`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (actualRouteCoords?.length > 1) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lng, lat] of actualRouteCoords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      const lngPad = Math.max((maxLng - minLng) * 0.1, 0.005);
      const latPad = Math.max((maxLat - minLat) * 0.1, 0.005);
      map.fitBounds(
        [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
        { padding: 40, maxZoom: 14, animate: true, duration: 1000 },
      );
    } else {
      const sw = [route.startCoords[1], route.startCoords[0]];
      const ne = [route.endCoords[1], route.endCoords[0]];
      map.fitBounds([sw, ne], { padding: 40, maxZoom: 14, animate: true, duration: 1000 });
    }
  }, [map, isLoaded, fitKey]);

  return null;
}
