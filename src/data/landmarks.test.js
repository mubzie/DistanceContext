import { describe, expect, it } from "vitest";
import { LANDMARKS_WITH_SPAN, landmarkFrames } from "./landmarks";
import { haversineDistanceKm } from "../utils/distance";
import { framePhrase } from "../utils/anchor";

describe("landmark data", () => {
  it("ships at least one verified landmark", () => {
    expect(LANDMARKS_WITH_SPAN.length).toBeGreaterThan(0);
  });

  it("keeps spanKm consistent with its own coordinates", () => {
    for (const landmark of LANDMARKS_WITH_SPAN) {
      const recomputed = haversineDistanceKm(
        [landmark.a.lat, landmark.a.lng],
        [landmark.b.lat, landmark.b.lng],
      );
      expect(landmark.spanKm).toBeCloseTo(recomputed, 6);
    }
  });

  it("records the source way for every figure", () => {
    for (const landmark of LANDMARKS_WITH_SPAN) {
      expect(landmark.osm).toMatch(/^way\/\d+$/);
      expect(landmark.region).toBe("Lagos");
      expect(landmark.id).toMatch(/^lm_/);
      expect(landmark.name).toBeTruthy();
    }
  });

  it("uses unique ids and names", () => {
    expect(new Set(LANDMARKS_WITH_SPAN.map((l) => l.id)).size).toBe(
      LANDMARKS_WITH_SPAN.length,
    );
    expect(new Set(LANDMARKS_WITH_SPAN.map((l) => l.name)).size).toBe(
      LANDMARKS_WITH_SPAN.length,
    );
  });

  it("stays inside a plausible span band", () => {
    for (const landmark of LANDMARKS_WITH_SPAN) {
      // 0.5 km is MIN_ANCHOR_KM: below it a landmark cannot be framed.
      expect(landmark.spanKm).toBeGreaterThanOrEqual(0.5);
      expect(landmark.spanKm).toBeLessThanOrEqual(200);
    }
  });
});

describe("landmarkFrames", () => {
  it("returns nothing for an unusable target", () => {
    expect(landmarkFrames(0)).toEqual([]);
    expect(landmarkFrames(NaN)).toEqual([]);
  });

  it("frames a distance as the length of a crossing", () => {
    const frames = landmarkFrames(9, { limit: 1 });
    expect(frames).toHaveLength(1);
    expect(frames[0].anchor.id).toBe("lm_third_mainland");
    expect(frames[0].kind).toBe("same");
    expect(framePhrase(frames[0])).toBe(
      "about the length of the Third Mainland Bridge",
    );
  });

  it("describes crossings as multiples", () => {
    const frames = landmarkFrames(18, { limit: 1 });
    expect(framePhrase(frames[0])).toBe(
      "like doing the Third Mainland Bridge twice",
    );
  });

  it("uses the landmark as the subject, not a possession", () => {
    const frames = landmarkFrames(3.4, { limit: 1 });
    expect(frames[0].subject).toBe("the Eko Bridge");
    expect(framePhrase(frames[0])).toBe("about the length of the Eko Bridge");
  });

  it("honours excludeIds so an anchor is never repeated", () => {
    const frames = landmarkFrames(9, {
      limit: 2,
      excludeIds: ["lm_third_mainland"],
    });
    expect(frames.every((f) => f.anchor.id !== "lm_third_mainland")).toBe(true);
  });
});