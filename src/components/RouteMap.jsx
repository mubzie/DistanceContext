import { useEffect } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapRoute, MapControls, useMap } from "./ui/map";

export function RouteMap({ route }) {
  if (!route) {
    return null;
  }

  const routeCoords = [
    [route.startCoords[1], route.startCoords[0]],
    [route.endCoords[1], route.endCoords[0]],
  ];

  const center = [
    (route.startCoords[1] + route.endCoords[1]) / 2,
    (route.startCoords[0] + route.endCoords[0]) / 2,
  ];

  return (
    <section className="flex flex-col gap-3 rounded-none bg-white p-4 shadow-soft ring-1 ring-slate-200/80 w-full h-full object-cover">
      <div className="mb-4 px-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
          Map
        </p>
        <p className="mt-1 text-sm text-slate-600">
          A single leg is shown to keep the map calm and readable.
        </p>
      </div>
      <div className="overflow-hidden rounded-[1.5rem] h-full">
        <Map center={center} scrollZoom={false} className="h-full w-full">
          <FitRouteBounds route={route} />
          <MapRoute coordinates={routeCoords} color="#0f172a" width={4} />
          <MapMarker longitude={route.startCoords[1]} latitude={route.startCoords[0]}>
            <MarkerContent>
              <div className="h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow-lg" />
            </MarkerContent>
            <MarkerPopup>{route.start}</MarkerPopup>
          </MapMarker>
          <MapMarker longitude={route.endCoords[1]} latitude={route.endCoords[0]}>
            <MarkerContent>
              <div className="h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow-lg" />
            </MarkerContent>
            <MarkerPopup>{route.end}</MarkerPopup>
          </MapMarker>
          <MapControls showZoom showCompass={false} showLocate={false} showFullscreen={false} />
        </Map>
      </div>
    </section>
  );
}

function FitRouteBounds({ route }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sw = [route.startCoords[1], route.startCoords[0]];
    const ne = [route.endCoords[1], route.endCoords[0]];

    map.fitBounds([sw, ne], { padding: 40, maxZoom: 14 });
  }, [map, isLoaded, route]);

  return null;
}
