import { describe, expect, it } from "vitest";
import {
  bestLocalMatch,
  candidateScore,
  fuzzyScore,
  mergePlaceLists,
  normalizePlace,
  rankCandidates,
} from "./placeMatch";

const LAGOS = { lat: 6.5244, lng: 3.3792 };

describe("normalizePlace", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizePlace("  Yaba  ")).toBe("yaba");
    expect(normalizePlace("Aja   Ogun")).toBe("aja ogun");
  });

  it("is safe on empty input", () => {
    expect(normalizePlace(null)).toBe("");
    expect(normalizePlace(undefined)).toBe("");
  });
});

describe("mergePlaceLists", () => {
  it("keeps the first occurrence of a name", () => {
    const merged = mergePlaceLists(
      [{ name: "Yaba", lat: 1, lng: 1 }],
      [{ name: "yaba", lat: 2, lng: 2 }, { name: "Ikeja", lat: 3, lng: 3 }],
    );
    expect(merged.map((p) => p.name)).toEqual(["Yaba", "Ikeja"]);
    expect(merged[0].lat).toBe(1);
  });

  it("tolerates missing lists", () => {
    expect(mergePlaceLists(null, undefined, [{ name: "A" }])).toEqual([
      { name: "A" },
    ]);
  });

  it("drops entries with no usable name", () => {
    expect(mergePlaceLists([{ name: "" }, { name: "   " }])).toEqual([]);
  });
});

describe("fuzzyScore", () => {
  it("scores an exact match at 100", () => {
    expect(fuzzyScore("yaba", "Yaba")).toBe(100);
    expect(fuzzyScore("  YABA ", "yaba")).toBe(100);
  });

  it("scores a name that starts with the query at 80", () => {
    expect(fuzzyScore("ya", "Yaba")).toBe(80);
  });

  it("scores a query that starts with the whole name at 60", () => {
    expect(fuzzyScore("Lagos Island", "Lagos")).toBe(60);
  });

  it("scores a matching name token at 70", () => {
    expect(fuzzyScore("island", "Lagos Island")).toBe(70);
  });

  it("scores a query starting with a name token at 50", () => {
    expect(fuzzyScore("Egba road", "Abule Egba")).toBe(50);
  });

  it("returns 0 for unrelated names", () => {
    expect(fuzzyScore("xyz", "Yaba")).toBe(0);
  });

  it("ignores names shorter than 3 characters for prefix scoring", () => {
    expect(fuzzyScore("Abuja", "Ab")).toBe(0);
  });
});

describe("bestLocalMatch", () => {
  it("returns null for an empty query", () => {
    expect(bestLocalMatch("", [[{ name: "Yaba" }]])).toBeNull();
    expect(bestLocalMatch("   ", [[{ name: "Yaba" }]])).toBeNull();
  });

  it("allows an exact match on a short query", () => {
    expect(bestLocalMatch("ab", [[{ name: "Ab" }]])).toEqual({
      place: { name: "Ab" },
      score: 100,
    });
  });

  it("ignores fuzzy matches shorter than 3 characters", () => {
    expect(bestLocalMatch("ya", [[{ name: "Yaba" }]])).toBeNull();
  });

  it("prefers an exact match in a later list over a fuzzy one", () => {
    const match = bestLocalMatch("island", [
      [{ name: "Island Clinic" }],
      [{ name: "Island" }],
    ]);
    expect(match).toEqual({ place: { name: "Island" }, score: 100 });
  });

  it("picks the highest scoring fuzzy match", () => {
    const match = bestLocalMatch("island", [
      [{ name: "Lagos Island" }, { name: "Island Clinic" }],
    ]);
    expect(match.place.name).toBe("Island Clinic");
    expect(match.score).toBe(80);
  });
});

describe("candidateScore", () => {
  it("ranks on importance alone without a location", () => {
    const candidate = { name: "Yaba", lat: 6.5, lng: 3.3, importance: 0.5 };
    expect(candidateScore(candidate, null)).toBe(500);
  });

  it("penalises candidates by distance from the active location", () => {
    const near = { name: "A", lat: 6.6, lng: 3.48, importance: 0.5 };
    const far = { name: "B", lat: 5.6, lng: -0.19, importance: 0.5 };
    expect(candidateScore(near, LAGOS)).toBeGreaterThan(
      candidateScore(far, LAGOS),
    );
  });
});

describe("rankCandidates", () => {
  it("lets a nearby minor place beat a far-away major one", () => {
    // The documented case: "Agric" in Lagos must beat "Agric" in Ghana.
    const nearby = {
      name: "Agric",
      lat: 6.6254,
      lng: 3.4839,
      importance: 0.45,
    };
    const farAway = {
      name: "Agric",
      lat: 5.6037,
      lng: -0.187,
      importance: 0.55,
    };
    const ranked = rankCandidates([farAway, nearby], LAGOS);
    expect(ranked[0].name).toBe("Agric");
    expect(ranked[0].lat).toBe(6.6254);
  });

  it("does not mutate the input array", () => {
    const input = [
      { name: "A", lat: 6.6, lng: 3.4, importance: 0.1 },
      { name: "B", lat: 6.7, lng: 3.5, importance: 0.9 },
    ];
    const snapshot = input.map((c) => c.name);
    rankCandidates(input, LAGOS);
    expect(input.map((c) => c.name)).toEqual(snapshot);
  });
});