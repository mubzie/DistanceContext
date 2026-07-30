import { useEffect, useMemo, useRef, useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { useNearbyPlaces } from './useNearbyPlaces';
import { haversineDistanceKm, toKilometers } from '../utils/distance';
import { formatNumber, formatTime } from '../utils/format';

const speedByMode = {
  walking: 5,
  driving: 30,
};

const DEFAULT_LOCATION = { lat: 6.5244, lng: 3.3792 };

function normalizePlace(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function useDistanceContext() {
  const { location: geoLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const activeLocation = geoLocation || DEFAULT_LOCATION;

  const { places: nearbyPlaces, loading: placesLoading, error: placesError } =
    useNearbyPlaces(activeLocation);

  const [mode, setMode] = useState('distance');
  const [distanceValue, setDistanceValue] = useState(2);
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [travelMode, setTravelMode] = useState('walking');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const placePairs = useMemo(() => {
    if (!nearbyPlaces || nearbyPlaces.length < 2) return [];
    const pairs = [];
    for (let i = 0; i < nearbyPlaces.length; i++) {
      for (let j = i + 1; j < nearbyPlaces.length; j++) {
        const a = nearbyPlaces[i];
        const b = nearbyPlaces[j];
        pairs.push({
          start: a.name,
          end: b.name,
          startCoords: [a.lat, a.lng],
          endCoords: [b.lat, b.lng],
          baseDistanceKm: haversineDistanceKm([a.lat, a.lng], [b.lat, b.lng]),
        });
      }
    }
    pairs.sort((a, b) => a.baseDistanceKm - b.baseDistanceKm);
    return pairs;
  }, [nearbyPlaces]);

  const startPlace = useMemo(() => {
    if (!customStart || !nearbyPlaces) return null;
    const norm = normalizePlace(customStart);
    return nearbyPlaces.find((p) => normalizePlace(p.name) === norm) ?? null;
  }, [customStart, nearbyPlaces]);

  const endPlace = useMemo(() => {
    if (!customEnd || !nearbyPlaces) return null;
    const norm = normalizePlace(customEnd);
    return nearbyPlaces.find((p) => normalizePlace(p.name) === norm) ?? null;
  }, [customEnd, nearbyPlaces]);

  const routeDistanceKm = useMemo(() => {
    if (mode === 'route') {
      if (startPlace && endPlace) {
        return haversineDistanceKm([startPlace.lat, startPlace.lng], [endPlace.lat, endPlace.lng]);
      }
      return 0;
    }
    return toKilometers(Number(distanceValue) || 0, distanceUnit);
  }, [mode, startPlace, endPlace, distanceValue, distanceUnit]);

  const contextualRoute = useMemo(() => {
    if (mode === 'route') {
      if (startPlace && endPlace) {
        return {
          start: startPlace.name,
          end: endPlace.name,
          startCoords: [startPlace.lat, startPlace.lng],
          endCoords: [endPlace.lat, endPlace.lng],
          baseDistanceKm: haversineDistanceKm([startPlace.lat, startPlace.lng], [endPlace.lat, endPlace.lng]),
        };
      }
      return null;
    }

    if (!placePairs.length) return null;

    return placePairs.reduce((best, pair) => {
      const bestDelta = Math.abs(best.baseDistanceKm - routeDistanceKm);
      const currentDelta = Math.abs(pair.baseDistanceKm - routeDistanceKm);
      return currentDelta < bestDelta ? pair : best;
    });
  }, [mode, startPlace, endPlace, placePairs, routeDistanceKm]);

  const routeSuggestions = useMemo(() => {
    if (!placePairs.length) return [];
    const sorted = [...placePairs].sort(
      (a, b) =>
        Math.abs(a.baseDistanceKm - routeDistanceKm) -
        Math.abs(b.baseDistanceKm - routeDistanceKm),
    );
    return sorted.slice(0, 6);
  }, [placePairs, routeDistanceKm]);

  const baseDistanceKm = contextualRoute?.baseDistanceKm ?? 0;
  const multiplier = baseDistanceKm ? routeDistanceKm / baseDistanceKm : 1;
  const speed = speedByMode[travelMode];
  const estimatedMinutes = (routeDistanceKm / speed) * 60;

  const summary = useMemo(() => {
    if (!contextualRoute || !routeDistanceKm) return '';
    const travelWord = travelMode === 'walking' ? 'walking' : 'driving or transit';
    const roundedMultiplier = Math.max(1, Math.round(multiplier));
    const distanceLabel = `${formatNumber(routeDistanceKm, routeDistanceKm >= 10 ? 0 : 1)} km`;
    const timeLabel = formatTime(estimatedMinutes);
    return `${distanceLabel} is like ${travelWord} from ${contextualRoute.start} to ${contextualRoute.end}${roundedMultiplier > 1 ? ` ${roundedMultiplier} times` : ''}. It will take you about ${timeLabel}.`;
  }, [contextualRoute, estimatedMinutes, multiplier, routeDistanceKm, travelMode]);

  const mapRoute = contextualRoute;

  const displayedMultiplier = Math.max(1, Math.round(multiplier));

  const [actualRouteCoords, setActualRouteCoords] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const abortRef = useRef(null);

  const osrmProfile = travelMode === 'walking' ? 'foot' : 'driving';

  useEffect(() => {
    const route = mapRoute;
    if (!route?.startCoords || !route?.endCoords) {
      setActualRouteCoords(null);
      return;
    }

    const startLng = route.startCoords[1];
    const startLat = route.startCoords[0];
    const endLng = route.endCoords[1];
    const endLat = route.endCoords[0];

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRouteLoading(true);

    fetch(
      `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLng},${startLat}%3B${endLng},${endLat}?overview=full&geometries=geojson&alternatives=false`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 'Ok' && data.routes?.length > 0) {
          setActualRouteCoords(data.routes[0].geometry.coordinates);
        } else {
          setActualRouteCoords(null);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setActualRouteCoords(null);
        }
      })
      .finally(() => {
        setIsRouteLoading(false);
      });
  }, [mapRoute, osrmProfile]);

  return {
    mode, setMode,
    distanceValue, setDistanceValue,
    distanceUnit, setDistanceUnit,
    travelMode, setTravelMode,
    customStart, setCustomStart,
    customEnd, setCustomEnd,

    userLocation: geoLocation,
    locationLoading: geoLoading,
    locationError: geoError,
    nearbyPlaces,
    placesLoading,
    placesError,

    routeSuggestions,
    routeDistanceKm,
    baseDistanceKm,
    multiplier,
    displayedMultiplier,
    estimatedMinutes,
    summary,
    mapRoute,
    actualRouteCoords,
    isRouteLoading,
  };
}
