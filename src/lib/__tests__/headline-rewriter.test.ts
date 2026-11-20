import { test, expect, describe } from "bun:test";
import { buildRewritePrompt, fallbackRewrite } from "../headline-rewriter";

describe("buildRewritePrompt", () => {
  test("returns a string that contains the original headline", () => {
    const headline = "BREAKING: You won't believe what happened next!!!";
    const prompt = buildRewritePrompt(headline);
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain(headline);
  });

  test("asks the LLM for a factual neutral rewrite", () => {
    const prompt = buildRewritePrompt("Some headline");
    const lower = prompt.toLowerCase();
    expect(lower).toContain("rewrite");
    expect(lower).toContain("factual");
    expect(lower).toContain("neutral");
  });

  test("tells the LLM to return only the headline (no quotes/explanation)", () => {
    const prompt = buildRewritePrompt("Some headline");
    expect(/return only/i.test(prompt)).toBe(true);
  });

  test("instructs to preserve factual content (numbers, entities, dates)", () => {
    const prompt = buildRewritePrompt("Some headline");
    expect(/preserve/i.test(prompt)).toBe(true);
    expect(/number|named entit|date/i.test(prompt)).toBe(true);
  });
});

describe("fallbackRewrite — strips clickbait phrases", () => {
  test("removes 'You won't believe'", () => {
    const out = fallbackRewrite("You won't believe this shocking new tech");
    expect(out.toLowerCase()).not.toContain("won't believe");
  });
  test("removes 'shocking'", () => {
    const out = fallbackRewrite("shocking new product announced by apple today");
    expect(out.toLowerCase()).not.toContain("shocking");
  });
  test("removes 'what happened next'", () => {
    const out = fallbackRewrite("Click here to see what happened next today");
    expect(out.toLowerCase()).not.toContain("what happened next");
  });
});

describe("fallbackRewrite — strips all-caps words", () => {
  test("converts SHOCKING to Shocking and NEWS to News", () => {
    const out = fallbackRewrite("BREAKING NEWS today about the economy");
    expect(out).not.toContain("NEWS");
    expect(out).toContain("News");
    expect(out).not.toContain("BREAKING");
  });
  test("does NOT convert 2-letter acronyms (AI stays AI)", () => {
    const out = fallbackRewrite("Apple announces new AI features today");
    expect(out).toContain("AI");
  });
});

describe("fallbackRewrite — strips emoji and excessive punctuation", () => {
  test("removes emoji", () => {
    const out = fallbackRewrite("Apple announces new product today 🤯");
    expect(out).not.toContain("🤯");
  });
  test("collapses !!! to nothing (trailing punctuation stripped)", () => {
    const out = fallbackRewrite("Senate passes bill 51-49 after 12-hour debate!!!");
    expect(out).not.toContain("!!!");
    expect(out).toContain("Senate passes bill");
  });
});

describe("fallbackRewrite — preserves neutral headlines", () => {
  test("does not modify a fully neutral factual headline", () => {
    const out = fallbackRewrite("Senate passes bill 51-49 after 12-hour debate");
    expect(out).toBe("Senate passes bill 51-49 after 12-hour debate");
  });
  test("does not modify 'Fed holds rates steady amid economic uncertainty'", () => {
    const out = fallbackRewrite("Fed holds rates steady amid economic uncertainty");
    expect(out).toBe("Fed holds rates steady amid economic uncertainty");
  });
});

describe("fallbackRewrite — edge cases", () => {
  test("empty input returns empty string", () => {
    expect(fallbackRewrite("")).toBe("");
  });
  test("fully-clickbait headline reduces to empty (caller falls back to original)", () => {
    const out = fallbackRewrite("BREAKING: You won't believe what happened next!!!");
    expect(out).toBe("");
  });
});
