import { test, expect, describe } from "bun:test";
import { getReliability, RELIABILITY_TABLE } from "../reliability";

describe("getReliability — known sources", () => {
  test("Reuters > 80", () => {
    expect(getReliability("Reuters")).toBeGreaterThan(80);
  });
  test("NYT > Breitbart", () => {
    expect(getReliability("The New York Times")).toBeGreaterThan(
      getReliability("Breitbart"),
    );
  });
  test("BBC News > 70", () => {
    expect(getReliability("BBC News")).toBeGreaterThan(70);
  });
  test("NPR > Breitbart", () => {
    expect(getReliability("NPR")).toBeGreaterThan(getReliability("Breitbart"));
  });
  test("Reuters is the highest among news wires", () => {
    expect(getReliability("Reuters")).toBeGreaterThanOrEqual(
      getReliability("BBC News"),
    );
  });
});

describe("getReliability — unknown sources", () => {
  test("unknown source returns 50", () => {
    expect(getReliability("Some Random Blog")).toBe(50);
  });
  test("empty string returns 50", () => {
    expect(getReliability("")).toBe(50);
  });
});

describe("getReliability — range", () => {
  test("all known sources have reliability in [0, 100]", () => {
    for (const v of Object.values(RELIABILITY_TABLE)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  test("unknown sources return 50 (within range)", () => {
    const r = getReliability("unknown");
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe("RELIABILITY_TABLE — shape", () => {
  test("has at least 10 entries", () => {
    expect(Object.keys(RELIABILITY_TABLE).length).toBeGreaterThanOrEqual(10);
  });
  test("Breitbart is the lowest, Reuters is among the highest", () => {
    const vals = Object.values(RELIABILITY_TABLE);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    expect(getReliability("Breitbart")).toBe(min);
    expect(getReliability("Reuters")).toBe(max);
  });
});
