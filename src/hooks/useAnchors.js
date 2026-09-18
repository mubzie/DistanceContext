import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_ANCHORS,
  createAnchor,
  isDistinctAnchor,
  sanitizeAnchors,
} from "../utils/anchor";

// Deliberately NOT part of dc_prefs: that record is written wholesale from
// { travelMode, distanceUnit } on every change, so sharing a key would wipe
// anchors on the next unit toggle.
const ANCHORS_KEY = "dc_anchors_v1";

// Storage is best-effort. A denied or full localStorage must degrade the
// feature to session-only rather than break the app — the same reasoning as
// writeCache in useNearbyPlaces.
function loadAnchors() {
  try {
    const raw = localStorage.getItem(ANCHORS_KEY);
    return sanitizeAnchors(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function persistAnchors(anchors) {
  try {
    localStorage.setItem(ANCHORS_KEY, JSON.stringify(anchors));
  } catch {
    // Ignore: the in-memory list still works for this session.
  }
}

export function useAnchors() {
  // Lazy initialiser so storage is read once per mount, like loadPrefs.
  const [anchors, setAnchors] = useState(loadAnchors);

  // Mirror of the latest anchors so addAnchor can read the freshest list even
  // if it runs before a re-render (a memoised callback with () => [] deps reads
  // the closure value otherwise, which can lag the state). The mirror is kept
  // in sync by the effect below; rendering and storage read the state itself.
  const anchorsRef = useRef(anchors);

  useEffect(() => {
    anchorsRef.current = anchors;
    persistAnchors(anchors);
  }, [anchors]);

  // Returns a result object instead of throwing: "to the limit", "already
  // pinned" and "no usable route" are all normal paths the UI has to explain.
  const addAnchor = useCallback(
    ({ label, a, b }) => {
      const candidate = createAnchor({ label, a, b });
      if (!candidate) {
        return { ok: false, reason: "invalid" };
      }
      // Read the freshest list (the ref is updated on every commit) rather
      // than the closure, so the guard and the distinct check never operate on
      // a stale snapshot.
      const current = anchorsRef.current;
      if (current.length >= MAX_ANCHORS) {
        return { ok: false, reason: "limit" };
      }
      if (!isDistinctAnchor(candidate, current)) {
        return { ok: false, reason: "duplicate" };
      }

      // Functional append stays race-safe; the mirror updates on the next
      // render via the effect above.
      setAnchors((prev) => [...prev, candidate]);
      return { ok: true, anchor: candidate };
    },
    [],
  );

  const removeAnchor = useCallback((id) => {
    setAnchors((current) => current.filter((anchor) => anchor.id !== id));
  }, []);

  const renameAnchor = useCallback((id, label) => {
    const next = String(label || "").trim();
    setAnchors((current) =>
      current.map((anchor) =>
        anchor.id === id
          ? {
                ...anchor,
                label: next || `${anchor.a.name} → ${anchor.b.name}`,
            }
          : anchor,
      ),
    );
  }, []);

  return {
    anchors,
    addAnchor,
    removeAnchor,
    renameAnchor,
    canAdd: anchors.length < MAX_ANCHORS,
    maxAnchors: MAX_ANCHORS,
  };
}