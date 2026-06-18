export const frequentRoutes = [
  {
    id: 'ikorodu-agric',
    start: 'Ikorodu Garage',
    end: 'Agric',
    startCoords: [6.6139, 3.5101],
    endCoords: [6.6076, 3.5154],
    notes: 'A common short trip around Ikorodu.'
  },
  {
    id: 'maryland-ojota',
    start: 'Maryland (Ikeja)',
    end: 'Ojota',
    startCoords: [6.5834, 3.3516],
    endCoords: [6.5793, 3.3922],
    notes: 'A familiar mainland commute corridor.'
  },
  {
    id: 'yaba-akoka',
    start: 'Yaba (Tejuosho)',
    end: 'Akoka',
    startCoords: [6.5128, 3.3797],
    endCoords: [6.5262, 3.3945],
    notes: 'Short movement between Yaba and Akoka.'
  },
  {
    id: 'lekki-vi',
    start: 'Lekki Phase 1',
    end: 'Victoria Island',
    startCoords: [6.4359, 3.4726],
    endCoords: [6.4281, 3.4219],
    notes: 'A common Lekki to VI route.'
  }
];

export const frequentLocations = Array.from(
  new Set(frequentRoutes.flatMap((route) => [route.start, route.end]))
);
