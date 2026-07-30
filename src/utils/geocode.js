export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DistanceContext/1.0" },
  });

  if (!res.ok) throw new Error("Could not determine location name");

  const data = await res.json();
  return {
    name: data.display_name?.split(",")[0]?.trim() || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
  };
}

export async function forwardGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DistanceContext/1.0" },
  });

  if (!res.ok) throw new Error("Could not search for location");

  const data = await res.json();
  if (!data.length) throw new Error(`Location "${query}" not found`);

  return {
    name: data[0].display_name?.split(",")[0]?.trim() || data[0].name,
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}
