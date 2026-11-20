import { test, expect, describe } from "bun:test";
import { jaccardSimilarity, jaccardSets } from "../jaccard";
import { tokenize } from "../tokenizer";

describe("jaccardSimilarity — identical inputs", () => {
  test("identical strings → 1.0", () => {
    expect(jaccardSimilarity("Senate passes bill", "Senate passes bill")).toBe(1);
  });
  test("identical after stop-word removal → 1.0", () => {
    expect(
      jaccardSimilarity("The Senate passes the bill", "Senate passes bill"),
    ).toBe(1);
  });
  test("case-insensitive → 1.0", () => {
    expect(jaccardSimilarity("SENATE passes BILL", "senate passes bill")).toBe(1);
  });
});

describe("jaccardSimilarity — disjoint inputs", () => {
  test("completely different words → 0", () => {
    expect(jaccardSimilarity("apple banana", "cherry durian")).toBe(0);
  });
  test("empty + non-empty → 0", () => {
    expect(jaccardSimilarity("", "something here")).toBe(0);
  });
});

describe("jaccardSimilarity — partial overlap", () => {
  test("partial overlap returns a value in (0, 1)", () => {
    const s = jaccardSimilarity("Senate passes major spending bill", "Senate OKs major spending bill");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
  test("2 of 4 shared → 0.5", () => {
    // tokens: {apple, banana}, {apple, banana, cherry, durian}
    // inter = {apple, banana} = 2; union = 4 → 0.5
    expect(jaccardSimilarity("apple banana", "apple banana cherry durian")).toBe(0.5);
  });
});

describe("jaccardSimilarity — edge cases", () => {
  test("both empty → 1.0 (degenerate case)", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });
  test("both reduce to empty after stop-word removal → 1.0", () => {
    expect(jaccardSimilarity("the a an", "of the and")).toBe(1);
  });
});

describe("jaccardSets — pre-tokenized", () => {
  test("identical token sets → 1.0", () => {
    expect(jaccardSets(tokenize("apple banana cherry"), tokenize("apple banana cherry"))).toBe(1);
  });
  test("disjoint token sets → 0", () => {
    expect(jaccardSets(["apple", "banana"], ["cherry", "durian"])).toBe(0);
  });
  test("returns a number in [0, 1]", () => {
    const s = jaccardSets(["apple", "banana", "cherry"], ["apple", "banana", "durian"]);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});
