import { describe, expect, it } from "vitest";
import { haversineDistanceKm, toKilometers } from "./distance";

describe("toKilometers", () => {
  it("passes km through unchanged", () => {
    expect(toKilometers(5, "km")).toBe(5);
    expect(toKilometers(0, "km")).toBe(0);
  });

  it("converts miles to km", () => {
    expect(toKilometers(1, "miles")).toBeCloseTo(1.60934, 5);
    expect(toKilometers(5, "miles")).toBeCloseTo(8.0467, 4);
  });

  it("treats any non-miles unit as km", () => {
    expect(toKilometers(3, undefined)).toBe(3);
  });
});

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm([6.5244, 3.3792], [6.5244, 3.3792])).toBe(0);
  });

  it("measures one degree of latitude at the equator", () => {
    // 1 degree of latitude is a fixed arc: 2*pi*6371/360 km.
    expect(haversineDistanceKm([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
  });

  it("matches a known short hop (Lagos to Ikeja)", () => {
    expect(haversineDistanceKm([6.5244, 3.3792], [6.6018, 3.3515])).toBeCloseTo(
      9.14,
      1,
    );
  });

  it("is symmetric", () => {
    const a = [6.5244, 3.3792];
    const b = [6.6018, 3.3515];
    expect(haversineDistanceKm(a, b)).toBe(haversineDistanceKm(b, a));
  });

  it("grows with separation", () => {
    const origin = [6.5244, 3.3792];
    const near = haversineDistanceKm(origin, [6.6018, 3.3515]);
    const far = haversineDistanceKm(origin, [9.0579, 7.4951]);
    expect(far).toBeGreaterThan(near);
  });
});