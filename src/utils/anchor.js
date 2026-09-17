import { haversineDistanceKm } from "./distance";

// Anchors are routes the user knows by heart (Home → Work, the school run).
// They let an abstract distance be framed against something personal instead
// of only the algorithmic nearest pair, which is forgotten on reload.
//
// Everything here is pure: no React, no storage, no network. Persistence and
// rendering live in useAnchors / AnchorPanel.

// Five is enough to frame most distances without turning the ladder into a
// wall of text.
export const MAX_ANCHORS = 5;

// Mirrors MIN_PAIR_KM in useDistanceContext: pairs closer than this are
// duplicate OSM nodes and would render as "0.0 km", so they must never become
// an anchor (and would produce a divide-by-zero multiplier).
export const MIN_ANCHOR_KM = 0.5;

// Frames whose multipliers are within this fraction of each other say the same
// thing twice ("1.4x" and "1.5x"), so only the stronger one is kept.
export const DISTINCT_FRAME_RATIO = 0.15;

// "3% of your commute" is not useful context; below this, fraction frames are
// dropped unless they are the only framing available.
export const MIN_FRAME_PERCENT = 10;

export const DEFAULT_FRAME_LIMIT = 3;

// Normalises any place-like object (nearby places, curated index, geocoding
// candidates) down to the only shape anchors depend on.
export function placeFrom(place) {
  const name = String(place?.name || "").trim();
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);
  if (!name) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { name, lat, lng };
}

// Anchors always measure straight-line span, the same measure baseDistanceKm
// uses in useDistanceContext. Comparing an anchor against OSRM road distance
// instead would make the two framings contradict each other.
export function anchorSpanKm(anchor) {
  const start = placeFrom(anchor?.a);
  const end = placeFrom(anchor?.b);
  if (!start || !end) return null;
  return haversineDistanceKm([start.lat, start.lng], [end.lat, end.lng]);
}

export function makeAnchorId(now = Date.now()) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Non-secure contexts (plain-HTTP LAN testing) have no randomUUID.
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function endpointKey(anchor) {
  const start = placeFrom(anchor?.a);
  const end = placeFrom(anchor?.b);
  if (!start || !end) return null;
  const point = (p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
  // Order-insensitive: A → B and B → A are the same knowledge.
  return [point(start), point(end)].sort().join("|");
}

export function createAnchor({ label, a, b, now = Date.now() } = {}) {
  const start = placeFrom(a);
  const end = placeFrom(b);
  if (!start || !end) return null;

  const anchor = {
    id: makeAnchorId(now),
    label: String(label || "").trim() || `${start.name} → ${end.name}`,
    a: start,
    b: end,
    spanKm: haversineDistanceKm([start.lat, start.lng], [end.lat, end.lng]),
    createdAt: now,
  };

  return isValidAnchor(anchor) ? anchor : null;
}

export function isValidAnchor(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (typeof raw.id !== "string" || !raw.id) return false;
  if (!placeFrom(raw.a) || !placeFrom(raw.b)) return false;
  const span = anchorSpanKm(raw);
  return Number.isFinite(span) && span >= MIN_ANCHOR_KM;
}

// Storage is a cache, not a source of truth: spanKm is recomputed from the
// coordinates on every load (the same reasoning as purgeStaleCache in
// useNearbyPlaces), so a tampered or stale record can't mislead the ladder.
export function sanitizeAnchors(rawList) {
  if (!Array.isArray(rawList)) return [];

  const anchors = [];
  const seenIds = new Set();
  const seenPairs = new Set();

  for (const raw of rawList) {
    if (!isValidAnchor(raw)) continue;

    const start = placeFrom(raw.a);
    const end = placeFrom(raw.b);

    const pairKey = endpointKey(raw);
    if (!pairKey || seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const id = seenIds.has(raw.id) ? makeAnchorId() : raw.id;
    seenIds.add(id);

    anchors.push({
      id,
      label: String(raw.label || "").trim() || `${start.name} → ${end.name}`,
      a: start,
      b: end,
      spanKm: haversineDistanceKm([start.lat, start.lng], [end.lat, end.lng]),
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    });

    if (anchors.length >= MAX_ANCHORS) break;
  }

  return anchors;
}

export function anchorMultiplier(targetKm, anchor) {
  const span = anchorSpanKm(anchor);
  if (!span || !Number.isFinite(targetKm) || targetKm <= 0) return null;
  const multiple = targetKm / span;
  return Number.isFinite(multiple) ? multiple : null;
}

// Duplicate detection is about identity, not length: two genuinely different
// routes (Home → Work, Home → School) can be about the same distance and both
// belong in the panel. Only the same endpoint pair is a duplicate.
export function isDistinctAnchor(candidate, anchors) {
  const pairKey = endpointKey(candidate);
  if (!pairKey || !anchorSpanKm(candidate)) return false;
  return !(anchors ?? []).some((existing) => endpointKey(existing) === pairKey);
}

// Turns a raw ratio into display parts, so callers never re-parse strings.
export function describeMultiplier(multiple) {
  if (!Number.isFinite(multiple) || multiple <= 0) return null;

  if (multiple >= 2) {
    const times = Math.round(multiple);
    return { kind: "times", times, percent: null, ladder: `${times}×` };
  }
  if (multiple >= 1.1) {
    const times = Math.round(multiple * 10) / 10;
    return {
      kind: "times",
      times,
      percent: null,
      ladder: `${times.toFixed(1)}×`,
    };
  }
  if (multiple >= 0.9) {
    return { kind: "same", times: null, percent: null, ladder: "same" };
  }

  const percent = Math.round(multiple * 100);
  return { kind: "fraction", times: null, percent, ladder: `${percent}%` };
}

function formatTimes(times) {
  return Number.isInteger(times) ? String(times) : times.toFixed(1);
}

// Sentence fragment for the context summary, in the app's existing voice.
export function framePhrase(frame) {
  const label = frame?.anchor?.label;
  // Anchors describe a possession ("your Home → Work route"); landmark frames
  // carry their own subject ("the Third Mainland Bridge").
  const subject = frame?.subject || (label ? `your ${label} route` : "");
  if (!subject) return "";

  if (frame.kind === "times") {
    return frame.times === 2
      ? `like doing ${subject} twice`
      : `like doing ${subject} ${formatTimes(frame.times)} times`;
  }
  if (frame.kind === "same") {
    return `about the length of ${subject}`;
  }
  if (frame.kind === "fraction") {
    return `about ${frame.percent}% of ${subject}`;
  }
  return "";
}

// Closest anchor first, by relative difference: absolute difference makes the
// largest anchor win every large input, which flattens the ladder.
export function rankAnchors(targetKm, anchors) {
  const ranked = [];

  for (const anchor of anchors ?? []) {
    const spanKm = anchorSpanKm(anchor);
    const multiple = anchorMultiplier(targetKm, anchor);
    if (!spanKm || multiple == null) continue;
    ranked.push({
      anchor,
      spanKm,
      multiple,
      deltaRatio: Math.abs(targetKm - spanKm) / spanKm,
    });
  }

  return ranked.sort((a, b) => a.deltaRatio - b.deltaRatio);
}

export function buildAnchorFrames(targetKm, anchors, options = {}) {
  const limit = options.limit ?? DEFAULT_FRAME_LIMIT;
  if (!Number.isFinite(targetKm) || targetKm <= 0 || limit <= 0) return [];

  const frames = [];

  for (const entry of rankAnchors(targetKm, anchors)) {
    const described = describeMultiplier(entry.multiple);
    if (!described) continue;

    // Skip a frame that restates one already chosen, e.g. 1.4x then 1.5x.
    const restates = frames.some(
      (frame) =>
        Math.abs(frame.multiple - entry.multiple) / entry.multiple <
        DISTINCT_FRAME_RATIO,
    );
    if (restates) continue;

    frames.push({
      anchor: entry.anchor,
      spanKm: entry.spanKm,
      multiple: entry.multiple,
      // Frames describe a possession by default ("your Home → Work route");
      // landmark frames override this with their own subject phrase.
      subject: `your ${entry.anchor.label} route`,
      ...described,
    });
  }

  const strong = frames.filter(
    (frame) => frame.kind !== "fraction" || frame.percent >= MIN_FRAME_PERCENT,
  );

  // A weak fraction is better than nothing when it is the only anchor there is.
  const chosen = strong.length ? strong : frames.slice(0, 1);

  return chosen.slice(0, limit);
}