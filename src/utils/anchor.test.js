import { describe, expect, it } from "vitest";
import {
  MAX_ANCHORS,
  MIN_ANCHOR_KM,
  anchorMultiplier,
  anchorSpanKm,
  buildAnchorFrames,
  createAnchor,
  describeMultiplier,
  framePhrase,
  isDistinctAnchor,
  isValidAnchor,
  makeAnchorId,
  placeFrom,
  rankAnchors,
  sanitizeAnchors,
} from "./anchor";

// One degree of latitude is a fixed arc, so anchors of a known span can be
// built from coordinates without depending on haversine to build the fixture.
const KM_PER_DEG_LAT = 111.194926367;
const ORIGIN = { lat: 6.5, lng: 3.4 };

function anchorOfSpan(km, options = {}) {
  const { label = "Home → Work", id = `anc-${km}`, lat = ORIGIN.lat } =
    options;
  return {
    id,
    label,
    a: { name: "Home", lat, lng: ORIGIN.lng },
    b: { name: "Work", lat: lat + km / KM_PER_DEG_LAT, lng: ORIGIN.lng },
    spanKm: km,
    createdAt: 0,
  };
}

describe("placeFrom", () => {
  it("keeps only the name/coordinate triple", () => {
    expect(
      placeFrom({ name: " Yaba ", lat: 6.5, lng: 3.3, importance: 0.9 }),
    ).toEqual({ name: "Yaba", lat: 6.5, lng: 3.3 });
  });

  it("accepts numeric strings", () => {
    expect(placeFrom({ name: "Yaba", lat: "6.5", lng: "3.3" })).toEqual({
      name: "Yaba",
      lat: 6.5,
      lng: 3.3,
    });
  });

  it("rejects missing names or unusable coordinates", () => {
    expect(placeFrom({ name: "", lat: 6.5, lng: 3.3 })).toBeNull();
    expect(placeFrom({ name: "Yaba", lat: "abc", lng: 3.3 })).toBeNull();
    expect(placeFrom(null)).toBeNull();
    expect(placeFrom(undefined)).toBeNull();
  });
});

describe("anchorSpanKm", () => {
  it("measures the straight-line span", () => {
    expect(anchorSpanKm(anchorOfSpan(12))).toBeCloseTo(12, 3);
  });

  it("returns null when an endpoint is unusable", () => {
    expect(
      anchorSpanKm({ a: { name: "Home", lat: 6.5, lng: 3.4 } }),
    ).toBeNull();
    expect(anchorSpanKm(null)).toBeNull();
  });
});

describe("createAnchor", () => {
  it("derives a label from the endpoints", () => {
    const anchor = createAnchor({
      a: { name: "Yaba", lat: 6.5, lng: 3.38 },
      b: { name: "Ikeja", lat: 6.6, lng: 3.35 },
      now: 1700000000000,
    });
    expect(anchor.label).toBe("Yaba → Ikeja");
    expect(anchor.spanKm).toBeGreaterThan(9);
    expect(anchor.createdAt).toBe(1700000000000);
    expect(typeof anchor.id).toBe("string");
  });

  it("keeps an explicit label", () => {
    const anchor = createAnchor({
      label: "  Home → Work  ",
      a: { name: "Yaba", lat: 6.5, lng: 3.38 },
      b: { name: "Ikeja", lat: 6.6, lng: 3.35 },
    });
    expect(anchor.label).toBe("Home → Work");
  });

  it("refuses duplicate-coordinate places (0.0 km routes)", () => {
    expect(
      createAnchor({
        a: { name: "Yaba", lat: 6.5244, lng: 3.3792 },
        b: { name: "Yaba", lat: 6.5244, lng: 3.3792 },
      }),
    ).toBeNull();
  });

  it("refuses unusable endpoints", () => {
    expect(
      createAnchor({ a: { name: "Yaba", lat: 6.5, lng: 3.3 }, b: null }),
    ).toBeNull();
  });
});

describe("isValidAnchor", () => {
  it("accepts a well-formed anchor", () => {
    expect(isValidAnchor(anchorOfSpan(12))).toBe(true);
  });

  it("rejects malformed records", () => {
    expect(isValidAnchor(null)).toBe(false);
    expect(isValidAnchor([])).toBe(false);
    expect(isValidAnchor("anchor")).toBe(false);
    expect(isValidAnchor({ ...anchorOfSpan(12), id: "" })).toBe(false);
    expect(isValidAnchor({ ...anchorOfSpan(12), id: 42 })).toBe(false);
  });

  it("rejects spans below the minimum pair distance", () => {
    const tooClose = anchorOfSpan(MIN_ANCHOR_KM / 2);
    expect(MIN_ANCHOR_KM / 2).toBeLessThan(MIN_ANCHOR_KM);
    expect(isValidAnchor(tooClose)).toBe(false);
  });
});

describe("sanitizeAnchors", () => {
  it("returns an empty list for anything but an array", () => {
    expect(sanitizeAnchors(null)).toEqual([]);
    expect(sanitizeAnchors({})).toEqual([]);
    expect(sanitizeAnchors("nope")).toEqual([]);
  });

  it("drops invalid records", () => {
    const cleaned = sanitizeAnchors([
      anchorOfSpan(12),
      null,
      { id: "broken", label: "Broken", a: { name: "X" }, b: { name: "Y" } },
      anchorOfSpan(0),
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe("anc-12");
  });

  it("recomputes spanKm instead of trusting storage", () => {
    const tampered = { ...anchorOfSpan(12), spanKm: 999 };
    expect(sanitizeAnchors([tampered])[0].spanKm).toBeCloseTo(12, 3);
  });

  it("treats the same endpoints either way round as one anchor", () => {
    const forward = anchorOfSpan(12, { id: "f" });
    const reversed = {
      ...anchorOfSpan(12, { id: "r" }),
      a: forward.b,
      b: forward.a,
    };
    expect(sanitizeAnchors([forward, reversed])).toHaveLength(1);
  });

  it("fills a missing label from the endpoints", () => {
    const cleaned = sanitizeAnchors([{ ...anchorOfSpan(12), label: "  " }]);
    expect(cleaned[0].label).toBe("Home → Work");
  });

  it("caps the list at MAX_ANCHORS", () => {
    const many = Array.from({ length: MAX_ANCHORS + 4 }, (_, i) =>
      anchorOfSpan(i + 2, { id: `anc-${i}`, label: `Leg ${i}` }),
    );
    expect(sanitizeAnchors(many)).toHaveLength(MAX_ANCHORS);
  });

  it("gives duplicate ids distinct ones", () => {
    const cleaned = sanitizeAnchors([
      anchorOfSpan(12, { id: "same" }),
      anchorOfSpan(8, { id: "same" }),
    ]);
    expect(cleaned[0].id).not.toBe(cleaned[1].id);
  });
});

describe("anchorMultiplier", () => {
  it("divides the target by the span", () => {
    expect(anchorMultiplier(24, anchorOfSpan(12))).toBeCloseTo(2, 3);
    expect(anchorMultiplier(6, anchorOfSpan(12))).toBeCloseTo(0.5, 3);
  });

  it("returns null instead of NaN or Infinity", () => {
    expect(anchorMultiplier(0, anchorOfSpan(12))).toBeNull();
    expect(anchorMultiplier(-5, anchorOfSpan(12))).toBeNull();
    expect(anchorMultiplier(NaN, anchorOfSpan(12))).toBeNull();
    expect(anchorMultiplier(12, { a: {}, b: {} })).toBeNull();
  });
});

describe("isDistinctAnchor", () => {
  it("rejects the same pair in either direction", () => {
    const existing = anchorOfSpan(12);
    const duplicate = { ...existing, a: existing.b, b: existing.a };
    expect(isDistinctAnchor(duplicate, [existing])).toBe(false);
  });

  it("accepts a different pair of similar length", () => {
    const existing = anchorOfSpan(12, { label: "Home → Work" });
    const other = {
      id: "other",
      label: "Home → School",
      a: { name: "Home", lat: 6.5, lng: 3.4 },
      b: { name: "School", lat: 6.5 + 12.4 / KM_PER_DEG_LAT, lng: 3.4 },
      createdAt: 0,
    };
    expect(anchorSpanKm(other)).toBeCloseTo(12.4, 3);
    expect(isDistinctAnchor(other, [existing])).toBe(true);
  });

  it("rejects unusable candidates", () => {
    expect(isDistinctAnchor(null, [])).toBe(false);
    expect(isDistinctAnchor({ a: {}, b: {} }, [])).toBe(false);
  });
});

describe("makeAnchorId", () => {
  it("produces unique ids for rapid calls", () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i += 1) ids.add(makeAnchorId());
    expect(ids.size).toBe(1000);
  });
});

describe("describeMultiplier", () => {
  it("maps ratios to display parts at the boundaries", () => {
    expect(describeMultiplier(0.89)).toMatchObject({
      kind: "fraction",
      percent: 89,
      ladder: "89%",
    });
    expect(describeMultiplier(0.4)).toMatchObject({
      kind: "fraction",
      percent: 40,
      ladder: "40%",
    });
    expect(describeMultiplier(0.9)).toMatchObject({ kind: "same", ladder: "same" });
    expect(describeMultiplier(1.09)).toMatchObject({ kind: "same" });
    expect(describeMultiplier(1.1)).toMatchObject({
      kind: "times",
      times: 1.1,
      ladder: "1.1×",
    });
    expect(describeMultiplier(1.99)).toMatchObject({
      kind: "times",
      times: 2,
      ladder: "2.0×",
    });
    expect(describeMultiplier(2)).toMatchObject({
      kind: "times",
      times: 2,
      ladder: "2×",
    });
    expect(describeMultiplier(3.4)).toMatchObject({
      kind: "times",
      times: 3,
      ladder: "3×",
    });
  });

  it("returns null for unusable ratios", () => {
    expect(describeMultiplier(0)).toBeNull();
    expect(describeMultiplier(-1)).toBeNull();
    expect(describeMultiplier(NaN)).toBeNull();
    expect(describeMultiplier(undefined)).toBeNull();
  });
});

describe("framePhrase", () => {
  const frame = (overrides) => ({
    kind: "times",
    times: 3,
    percent: null,
    ladder: "3×",
    anchor: { label: "Home → Work" },
    ...overrides,
  });

  it("reads as whole multiples", () => {
    expect(framePhrase(frame({}))).toBe(
      "like doing your Home → Work route 3 times",
    );
  });

  it("uses 'twice' for two", () => {
    expect(framePhrase(frame({ times: 2, ladder: "2×" }))).toBe(
      "like doing your Home → Work route twice",
    );
  });

  it("keeps one decimal for fractional multiples", () => {
    expect(framePhrase(frame({ times: 1.4, ladder: "1.4×" }))).toBe(
      "like doing your Home → Work route 1.4 times",
    );
  });

  it("describes a matching length", () => {
    expect(framePhrase(frame({ kind: "same", times: null }))).toBe(
      "about the length of your Home → Work route",
    );
  });

  it("describes a fraction", () => {
    expect(
      framePhrase(frame({ kind: "fraction", times: null, percent: 40 })),
    ).toBe("about 40% of your Home → Work route");
  });

  it("returns an empty string when it cannot describe anything", () => {
    expect(framePhrase(null)).toBe("");
    expect(framePhrase(frame({ anchor: null }))).toBe("");
    expect(framePhrase(frame({ kind: "unknown" }))).toBe("");
  });
});

describe("rankAnchors", () => {
  it("orders by relative difference, not absolute", () => {
    const ranked = rankAnchors(25, [
      anchorOfSpan(1),
      anchorOfSpan(50),
    ]);
    expect(ranked[0].spanKm).toBeCloseTo(50, 3);
  });

  it("favours the small anchor for a small target", () => {
    const ranked = rankAnchors(0.6, [
      anchorOfSpan(0.5, { id: "small" }),
      anchorOfSpan(50, { id: "big" }),
    ]);
    expect(ranked[0].anchor.id).toBe("small");
  });

  it("skips anchors with no usable span", () => {
    const ranked = rankAnchors(10, [
      anchorOfSpan(10),
      { id: "bad", label: "Broken", a: {}, b: {} },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].anchor.id).toBe("anc-10");
  });

  it("exposes the multiple and delta ratio", () => {
    const [entry] = rankAnchors(24, [anchorOfSpan(12)]);
    expect(entry.multiple).toBeCloseTo(2, 3);
    expect(entry.deltaRatio).toBeCloseTo(1, 3);
  });
});

describe("buildAnchorFrames", () => {
  it("returns nothing for a non-positive target", () => {
    expect(buildAnchorFrames(0, [anchorOfSpan(12)])).toEqual([]);
    expect(buildAnchorFrames(-3, [anchorOfSpan(12)])).toEqual([]);
    expect(buildAnchorFrames(NaN, [anchorOfSpan(12)])).toEqual([]);
  });

  it("returns nothing without anchors", () => {
    expect(buildAnchorFrames(12, [])).toEqual([]);
    expect(buildAnchorFrames(12, null)).toEqual([]);
  });

  it("frames the closest anchor", () => {
    const frames = buildAnchorFrames(12, [anchorOfSpan(12)]);
    expect(frames).toHaveLength(1);
    expect(frames[0].kind).toBe("same");
    expect(framePhrase(frames[0])).toBe(
      "about the length of your Home → Work route",
    );
  });

  it("collapses frames that restate each other", () => {
    // For a 17 km target the 12.5 km anchor is the closer of the two (1.4x vs
    // 1.42x), so it is the one kept.
    const frames = buildAnchorFrames(17, [
      anchorOfSpan(12, { id: "far" }),
      anchorOfSpan(12.5, { id: "near" }),
    ]);
    expect(frames).toHaveLength(1);
    expect(frames[0].anchor.id).toBe("near");
  });

  it("drops a weak fraction when a stronger frame exists", () => {
    const frames = buildAnchorFrames(0.6, [
      anchorOfSpan(0.5, { id: "small" }),
      anchorOfSpan(20, { id: "big" }),
    ]);
    expect(frames).toHaveLength(1);
    expect(frames[0].kind).toBe("times");
    expect(frames[0].anchor.id).toBe("small");
  });

  it("keeps a weak fraction when it is the only framing", () => {
    const frames = buildAnchorFrames(0.6, [anchorOfSpan(20, { id: "big" })]);
    expect(frames).toHaveLength(1);
    expect(frames[0].kind).toBe("fraction");
    expect(frames[0].percent).toBe(3);
  });

  it("respects the limit", () => {
    const anchors = [
      anchorOfSpan(4, { id: "1" }),
      anchorOfSpan(9, { id: "2" }),
      anchorOfSpan(20, { id: "3" }),
      anchorOfSpan(45, { id: "4" }),
    ];
    expect(buildAnchorFrames(12, anchors)).toHaveLength(3);
    expect(buildAnchorFrames(12, anchors, { limit: 2 })).toHaveLength(2);
    expect(buildAnchorFrames(12, anchors, { limit: 0 })).toEqual([]);
  });
});