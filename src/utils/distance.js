export function toKilometers(value, unit) {
  return unit === 'miles' ? value * 1.60934 : value;
}

export function haversineDistanceKm([lat1, lon1], [lat2, lon2]) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

// Point half-way along a line, measured by length rather than by vertex count:
// real route geometries cluster vertices around curves and junctions, so the
// middle index can sit visibly off-centre.
//
// Coordinates are GeoJSON order ([lng, lat]) — the inverse of
// haversineDistanceKm — and the result is returned in the same order.
export function geojsonLineMidpoint(coords) {
  if (!coords || coords.length < 2) return null;

  const segments = [];
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const length = haversineDistanceKm(
      [coords[i - 1][1], coords[i - 1][0]],
      [coords[i][1], coords[i][0]],
    );
    segments.push(length);
    total += length;
  }
  if (!total) return coords[0];

  let remaining = total / 2;
  for (let i = 0; i < segments.length; i += 1) {
    // The last segment absorbs any floating-point overshoot.
    if (remaining <= segments[i] || i === segments.length - 1) {
      const ratio = segments[i] ? remaining / segments[i] : 0;
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      return [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];
    }
    remaining -= segments[i];
  }
  return coords[coords.length - 1];
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
