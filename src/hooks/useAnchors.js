import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
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
      if (anchors.length >= MAX_ANCHORS) {
        return { ok: false, reason: "limit" };
      }
      if (!isDistinctAnchor(candidate, anchors)) {
        return { ok: false, reason: "duplicate" };
      }

      setAnchors((current) => [...current, candidate]);
      return { ok: true, anchor: candidate };
    },
    [anchors],
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