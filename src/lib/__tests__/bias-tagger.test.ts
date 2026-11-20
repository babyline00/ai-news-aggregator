import { test, expect, describe } from "bun:test";
import { getBiasTag, BIAS_TABLE, type BiasTag } from "../bias-tagger";

describe("getBiasTag — known sources", () => {
  test("Reuters → center", () => {
    expect(getBiasTag("Reuters")).toBe("center");
  });
  test("BBC News → center", () => {
    expect(getBiasTag("BBC News")).toBe("center");
  });
  test("The New York Times → left", () => {
    expect(getBiasTag("The New York Times")).toBe("left");
  });
  test("The Guardian → left", () => {
    expect(getBiasTag("The Guardian")).toBe("left");
  });
  test("Wall Street Journal → right", () => {
    expect(getBiasTag("Wall Street Journal")).toBe("right");
  });
  test("Fox News → right", () => {
    expect(getBiasTag("Fox News")).toBe("right");
  });
  test("Breitbart → right", () => {
    expect(getBiasTag("Breitbart")).toBe("right");
  });
  test("NPR → center", () => {
    expect(getBiasTag("NPR")).toBe("center");
  });
});

describe("getBiasTag — tech sources return null (not politically rated)", () => {
  test("Hacker News → null", () => {
    expect(getBiasTag("Hacker News")).toBeNull();
  });
  test("Ars Technica → null", () => {
    expect(getBiasTag("Ars Technica")).toBeNull();
  });
  test("The Verge → null", () => {
    expect(getBiasTag("The Verge")).toBeNull();
  });
  test("Wired → null", () => {
    expect(getBiasTag("Wired")).toBeNull();
  });
});

describe("getBiasTag — unknown sources", () => {
  test("unknown source → null", () => {
    expect(getBiasTag("Some Random Blog")).toBeNull();
  });
  test("empty string → null", () => {
    expect(getBiasTag("")).toBeNull();
  });
});

describe("BIAS_TABLE — shape", () => {
  test("every value is left/center/right", () => {
    const valid: BiasTag[] = ["left", "center", "right"];
    for (const v of Object.values(BIAS_TABLE)) {
      expect(valid).toContain(v);
    }
  });
  test("has at least 10 entries (covers major US/UK politics sources)", () => {
    expect(Object.keys(BIAS_TABLE).length).toBeGreaterThanOrEqual(10);
  });
});
