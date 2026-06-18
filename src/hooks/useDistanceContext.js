import { useMemo, useState } from 'react';
import { frequentRoutes } from '../data/frequentRoutes';
import { haversineDistanceKm, toKilometers } from '../utils/distance';
import { formatNumber, formatTime } from '../utils/format';

const speedByMode = {
  walking: 5,
  driving: 30
};

export function useDistanceContext() {
  const [mode, setMode] = useState('distance');
  const [distanceValue, setDistanceValue] = useState(2);
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [travelMode, setTravelMode] = useState('walking');
  const [selectedRouteId, setSelectedRouteId] = useState(frequentRoutes[0].id);
  const [customStart, setCustomStart] = useState(frequentRoutes[0].start);
  const [customEnd, setCustomEnd] = useState(frequentRoutes[0].end);

  const selectedRoute = useMemo(
    () => frequentRoutes.find((route) => route.id === selectedRouteId) ?? frequentRoutes[0],
    [selectedRouteId]
  );

  const routeFromInputs = useMemo(() => {
    const normalizedStart = normalizePlace(customStart);
    const normalizedEnd = normalizePlace(customEnd);

    return (
      frequentRoutes.find((route) => {
        const startMatch = normalizePlace(route.start) === normalizedStart;
        const endMatch = normalizePlace(route.end) === normalizedEnd;
        const reverseMatch =
          normalizePlace(route.start) === normalizedEnd &&
          normalizePlace(route.end) === normalizedStart;

        return (startMatch && endMatch) || reverseMatch;
      }) ?? selectedRoute
    );
  }, [customEnd, customStart, selectedRoute]);

  const routeDistanceKm = useMemo(() => {
    if (mode === 'route') {
      return haversineDistanceKm(routeFromInputs.startCoords, routeFromInputs.endCoords);
    }

    return toKilometers(Number(distanceValue) || 0, distanceUnit);
  }, [distanceUnit, distanceValue, mode, routeFromInputs]);

  const contextualRoute = useMemo(() => {
    if (mode === 'route') {
      return {
        ...routeFromInputs,
        baseDistanceKm: haversineDistanceKm(routeFromInputs.startCoords, routeFromInputs.endCoords)
      };
    }

    return frequentRoutes.reduce((best, route) => {
      const baseDistanceKm = haversineDistanceKm(route.startCoords, route.endCoords);
      if (!best) {
        return { ...route, baseDistanceKm };
      }

      const bestDelta = Math.abs(best.baseDistanceKm - routeDistanceKm);
      const currentDelta = Math.abs(baseDistanceKm - routeDistanceKm);

      return currentDelta < bestDelta ? { ...route, baseDistanceKm } : best;
    }, null);
  }, [mode, routeDistanceKm, selectedRoute]);

  const baseDistanceKm = contextualRoute?.baseDistanceKm ?? 0;
  const multiplier = baseDistanceKm ? routeDistanceKm / baseDistanceKm : 1;
  const speed = speedByMode[travelMode];
  const estimatedMinutes = (routeDistanceKm / speed) * 60;

  const summary = useMemo(() => {
    if (!contextualRoute) {
      return '';
    }

    const travelWord = travelMode === 'walking' ? 'walking' : 'driving or transit';
    const roundedMultiplier = Math.max(1, Math.round(multiplier));
    const distanceLabel = `${formatNumber(routeDistanceKm, routeDistanceKm >= 10 ? 0 : 1)} km`;
    const timeLabel = formatTime(estimatedMinutes);

    return `${distanceLabel} is like ${travelWord} from ${contextualRoute.start} to ${contextualRoute.end}${roundedMultiplier > 1 ? ` ${roundedMultiplier} times` : ''}. It will take you about ${timeLabel}.`;
  }, [contextualRoute, estimatedMinutes, multiplier, routeDistanceKm, travelMode]);

  const mapRoute = useMemo(() => {
    if (mode === 'route') {
      return contextualRoute;
    }

    return contextualRoute;
  }, [contextualRoute, mode]);

  const displayedMultiplier = Math.max(1, Math.round(multiplier));

  return {
    mode,
    setMode,
    distanceValue,
    setDistanceValue,
    distanceUnit,
    setDistanceUnit,
    travelMode,
    setTravelMode,
    selectedRouteId,
    setSelectedRouteId,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    selectedRoute,
    routeFromInputs,
    routeDistanceKm,
    baseDistanceKm,
    multiplier,
    displayedMultiplier,
    estimatedMinutes,
    summary,
    mapRoute
  };
}

function normalizePlace(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
