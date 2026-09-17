import { describe, expect, it } from "vitest";
import {
  distanceInUnit,
  distancePrecision,
  formatDistance,
  formatNumber,
  formatTime,
  formatTimeShort,
} from "./format";

describe("formatNumber", () => {
  it("always renders the requested fraction digits", () => {
    expect(formatNumber(2)).toBe("2.0");
    expect(formatNumber(2, 0)).toBe("2");
    expect(formatNumber(2, 2)).toBe("2.00");
  });

  it("rounds to the requested precision", () => {
    expect(formatNumber(12.345)).toBe("12.3");
    expect(formatNumber(12.55, 1)).toBe("12.6");
  });

  it("groups thousands", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});

describe("formatTime", () => {
  it("never reports less than a minute", () => {
    expect(formatTime(0)).toBe("1 minute");
    expect(formatTime(0.4)).toBe("1 minute");
  });

  it("singularises one minute", () => {
    expect(formatTime(1)).toBe("1 minute");
  });

  it("pluralises minutes and rounds", () => {
    expect(formatTime(2.4)).toBe("2 minutes");
    expect(formatTime(45.6)).toBe("46 minutes");
    expect(formatTime(59.6)).toBe("1 hour");
  });

  it("renders whole hours without a minute part", () => {
    expect(formatTime(60)).toBe("1 hour");
    expect(formatTime(120)).toBe("2 hours");
  });

  it("renders hours and minutes together", () => {
    expect(formatTime(61)).toBe("1 hour 1 minute");
    expect(formatTime(122)).toBe("2 hours 2 minutes");
    expect(formatTime(90)).toBe("1 hour 30 minutes");
  });
});

describe("formatTimeShort", () => {
  it("clamps to a minimum of one minute", () => {
    expect(formatTimeShort(0)).toBe("1 min");
  });

  it("uses min below an hour", () => {
    expect(formatTimeShort(30)).toBe("30 min");
    expect(formatTimeShort(59.6)).toBe("1 h");
  });

  it("uses h and h min above an hour", () => {
    expect(formatTimeShort(60)).toBe("1 h");
    expect(formatTimeShort(90)).toBe("1 h 30 min");
  });
});

describe("distanceInUnit", () => {
  it("converts to miles only for the miles unit", () => {
    expect(distanceInUnit(1, "km")).toBe(1);
    expect(distanceInUnit(1, "miles")).toBeCloseTo(0.621371, 6);
  });
});

describe("distancePrecision", () => {
  it("drops decimals at 10 km and above", () => {
    expect(distancePrecision(9.9)).toBe(1);
    expect(distancePrecision(10)).toBe(0);
    expect(distancePrecision(42)).toBe(0);
  });
});

describe("formatDistance", () => {
  it("uses distance-derived precision by default", () => {
    expect(formatDistance(3.2, "km")).toBe("3.2 km");
    expect(formatDistance(12.4, "km")).toBe("12 km");
  });

  it("honours an explicit precision", () => {
    expect(formatDistance(1.25, "km", 0)).toBe("1 km");
    expect(formatDistance(1.25, "km", 2)).toBe("1.25 km");
  });

  it("converts and labels miles", () => {
    expect(formatDistance(1, "miles")).toBe("0.6 miles");
    expect(formatDistance(10, "miles")).toBe("6 miles");
  });
});