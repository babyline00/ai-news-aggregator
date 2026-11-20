import { test, expect, describe } from "bun:test";
import { FEEDS, FEED_BY_NAME } from "../feeds";
import { RELIABILITY_TABLE } from "../reliability";
import { BIAS_TABLE } from "../bias-tagger";
import type { BiasTag } from "../bias-tagger";

const VALID_CATEGORIES = [
  "Tech", "Politics", "Business", "Science", "Health",
  "Sports", "Entertainment", "General",
];
const VALID_BIAS: BiasTag[] = ["left", "center", "right"];

describe("FEEDS — shape (per spec: every feed has url + name + category + reliability + optional bias)", () => {
  test("has 10-15 feeds (MVP scope)", () => {
    expect(FEEDS.length).toBeGreaterThanOrEqual(10);
    expect(FEEDS.length).toBeLessThanOrEqual(20);
  });

  test("every feed has a non-empty url", () => {
    for (const f of FEEDS) {
      expect(typeof f.url).toBe("string");
      expect(f.url.length).toBeGreaterThan(0);
      expect(f.url.startsWith("http")).toBe(true);
    }
  });

  test("every feed has a non-empty name", () => {
    for (const f of FEEDS) {
      expect(typeof f.name).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
    }
  });

  test("every feed has a valid category", () => {
    for (const f of FEEDS) {
      expect(VALID_CATEGORIES).toContain(f.category);
    }
  });

  test("every feed has a reliability in [0, 100]", () => {
    for (const f of FEEDS) {
      expect(typeof f.reliability).toBe("number");
      expect(f.reliability).toBeGreaterThanOrEqual(0);
      expect(f.reliability).toBeLessThanOrEqual(100);
    }
  });

  test("every feed has a bias that is left/center/right or null", () => {
    for (const f of FEEDS) {
      if (f.bias !== null) {
        expect(VALID_BIAS).toContain(f.bias);
      }
    }
  });

  test("urls are unique", () => {
    const urls = FEEDS.map((f) => f.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("names are unique", () => {
    const names = FEEDS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("FEEDS — consistency with reliability table", () => {
  test("every feed's reliability matches RELIABILITY_TABLE", () => {
    for (const f of FEEDS) {
      expect(f.reliability).toBe(RELIABILITY_TABLE[f.name]);
    }
  });
  test("every feed in RELIABILITY_TABLE appears in FEEDS or is a known source", () => {
    const feedNames = new Set(FEEDS.map((f) => f.name));
    for (const name of Object.keys(RELIABILITY_TABLE)) {
      expect(feedNames.has(name)).toBe(true);
    }
  });
});

describe("FEEDS — consistency with bias table", () => {
  test("every feed's bias matches BIAS_TABLE (null if absent)", () => {
    for (const f of FEEDS) {
      const expected = BIAS_TABLE[f.name] ?? null;
      expect(f.bias).toBe(expected);
    }
  });
});

describe("FEED_BY_NAME — lookup", () => {
  test("FEED_BY_NAME keys are the feed names", () => {
    for (const f of FEEDS) {
      expect(FEED_BY_NAME[f.name]).toBe(f);
    }
  });
  test("returns undefined for unknown sources", () => {
    expect(FEED_BY_NAME["Unknown Source"]).toBeUndefined();
  });
});

describe("FEEDS — covers well-known publishers", () => {
  test("includes Reuters, BBC, NYT, Guardian, Hacker News", () => {
    const names = new Set(FEEDS.map((f) => f.name));
    expect(names.has("Reuters")).toBe(true);
    expect(names.has("BBC News")).toBe(true);
    expect(names.has("The New York Times")).toBe(true);
    expect(names.has("The Guardian")).toBe(true);
    expect(names.has("Hacker News")).toBe(true);
  });
});
