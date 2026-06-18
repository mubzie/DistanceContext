import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function RouteMap({ route }) {
  if (!route) {
    return null;
  }

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
        <MapContainer
          center={route.startCoords}
          zoom={13}
          scrollWheelZoom={false}
        >
          <FitRouteBounds route={route} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={route.startCoords} icon={markerIcon}>
            <Popup>{route.start}</Popup>
          </Marker>
          <Marker position={route.endCoords} icon={markerIcon}>
            <Popup>{route.end}</Popup>
          </Marker>
          <Polyline
            positions={[route.startCoords, route.endCoords]}
            pathOptions={{ color: "#0f172a", weight: 4 }}
          />
        </MapContainer>
      </div>
    </section>
  );
}

function FitRouteBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds([route.startCoords, route.endCoords], {
      padding: [40, 40],
      maxZoom: 14,
    });
  }, [map, route]);

  return null;
}
