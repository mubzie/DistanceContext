import { haversineDistanceKm } from "../utils/distance";
import { buildAnchorFrames } from "../utils/anchor";

// Curated landmark spans: crossings people can picture, used to frame a
// distance against something real ("9 km — the Third Mainland Bridge").
//
// Every coordinate pair was measured from the actual OSM geometry on
// 2026-09-17 (Nominatim to resolve the feature, then the OSM API for the way's
// nodes). `osm` records the source way so any figure can be re-checked, and
// spanKm is COMPUTED from a/b at module load and asserted in
// landmarks.test.js — so editing coordinates can never leave a stale span.
//
// Only complete linear features qualify. Deliberately excluded:
//   - Area features (squares, parks, buildings) are closed OSM ways whose first
//     node equals their last, which would measure as ~0 km.
//   - Named roads are split across many OSM ways, so one way measures a
//     fragment of the road rather than the road people picture.
//   - way/207402234 "Carter Bridge" measures 0.559 km, i.e. one segment of the
//     crossing, not the crossing. Left out rather than under-claimed.
const LANDMARKS = [
    {
        id: "lm_third_mainland",
        name: "Third Mainland Bridge",
        region: "Lagos",
        osm: "way/134222253",
        a: { lat: 6.544057, lng: 3.3987115 },
        b: { lat: 6.4631312, lng: 3.3939908 },
    },
    {
        id: "lm_eko",
        name: "Eko Bridge",
        region: "Lagos",
        osm: "way/10561240",
        a: { lat: 6.4599959, lng: 3.382649 },
        b: { lat: 6.4853854, lng: 3.3651089 },
    },
];

export const LANDMARKS_WITH_SPAN = LANDMARKS.map((landmark) => ({
    ...landmark,
    spanKm: haversineDistanceKm(
        [landmark.a.lat, landmark.a.lng],
        [landmark.b.lat, landmark.b.lng],
    ),
}));

// Landmarks are projected into the anchor shape, so the ladder runs on one
// framing engine with two data sources: user anchors ("your Home → Work
// route") and landmarks ("the Third Mainland Bridge").
export function landmarkFrames(targetKm, options = {}) {
    const { limit = 2, excludeIds = [] } = options;
    const anchors = LANDMARKS_WITH_SPAN.filter(
        (landmark) => !excludeIds.includes(landmark.id),
    ).map((landmark) => ({
        id: landmark.id,
        label: landmark.name,
        // Both ends carry the crossing's name: placeFrom() requires a named
        // place, and the two ends of one bridge are the same feature.
        a: {
            name: landmark.name,
            lat: landmark.a.lat,
            lng: landmark.a.lng,
        },
        b: {
            name: landmark.name,
            lat: landmark.b.lat,
            lng: landmark.b.lng,
        },
    }));

    return buildAnchorFrames(targetKm, anchors, { limit }).map((frame) => ({
        ...frame,
        subject: `the ${frame.anchor.label}`,
    }));
}