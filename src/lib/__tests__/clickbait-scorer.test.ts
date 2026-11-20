import { test, expect, describe } from "bun:test";
import {
  scoreClickbait,
  clickbaitBand,
  scoreAndBand,
} from "../clickbait-scorer";

describe("scoreClickbait — canonical spec cases", () => {
  test("BREAKING + You won't believe + what happened next + !!! → high band", () => {
    const s = scoreClickbait("BREAKING: You won't believe what happened next!!!");
    expect(clickbaitBand(s)).toBe("high");
    expect(s).toBeGreaterThan(70);
  });
  test("'Senate passes bill 51-49 after 12-hour debate' → low band (factual)", () => {
    const s = scoreClickbait("Senate passes bill 51-49 after 12-hour debate");
    expect(clickbaitBand(s)).toBe("low");
    expect(s).toBeLessThan(30);
  });
  test("'10 SHOCKING things you MUST know about AI!!!' → high band", () => {
    const s = scoreClickbait("10 SHOCKING things you MUST know about AI!!!");
    expect(clickbaitBand(s)).toBe("high");
    expect(s).toBeGreaterThanOrEqual(70);
  });
  test("'Fed holds rates steady amid economic uncertainty' → low band", () => {
    const s = scoreClickbait("Fed holds rates steady amid economic uncertainty");
    expect(clickbaitBand(s)).toBe("low");
    expect(s).toBeLessThan(30);
  });
});

describe("scoreClickbait — range", () => {
  test("always returns a number in [0, 100]", () => {
    const inputs = [
      "",
      "a",
      "!!!",
      "BREAKING: You won't believe what happened next!!!",
      "x".repeat(500),
      "🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯",
      "This is a perfectly neutral informative headline about a policy change",
    ];
    for (const i of inputs) {
      const s = scoreClickbait(i);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("scoreClickbait — individual heuristics", () => {
  test("BREAKING prefix → +15", () => {
    // Short base (< 40 chars) so the length-bonus (-5) doesn't apply and
    // the only diff is the BREAKING prefix.
    const base = "Senate passes bill";
    const withBreaking = "BREAKING: Senate passes bill";
    const diff = scoreClickbait(withBreaking) - scoreClickbait(base);
    expect(diff).toBe(15);
  });

  test("Clickbait phrase 'Shocking' → +30 each occurrence", () => {
    // Short strings (< 40 chars) so the length-bonus doesn't confound.
    const base = "Apple announces iPhone today";
    const one = base + " shocking";
    const two = "Apple shocking shocking iPhone";
    expect(scoreClickbait(one) - scoreClickbait(base)).toBe(30);
    expect(scoreClickbait(two) - scoreClickbait(base)).toBe(60);
  });

  test("Multiple question marks > 1 → +10", () => {
    // Short strings (< 40 chars) so the length-bonus doesn't confound.
    const base = "Apple announces iPhone";
    const withQs = base + "?? Is it good??";
    const diff = scoreClickbait(withQs) - scoreClickbait(base);
    expect(diff).toBe(10);
  });

  test("Exclamation marks > 2 → +10", () => {
    const base = "Apple announces new iPhone today";
    const withExcl = base + "!!!";
    const diff = scoreClickbait(withExcl) - scoreClickbait(base);
    expect(diff).toBe(10);
  });

  test("All-caps words > 30% → +20", () => {
    // 3 of 6 words are all-caps (>30%): SHOCKING MUST KNOW
    const s = scoreClickbait("SHOCKING MUST KNOW about new apple iphone today");
    // Should have at least +20 from all-caps; subtract any other signals.
    expect(s).toBeGreaterThanOrEqual(20);
  });

  test("Quotation marks (2+) → +10", () => {
    // Short base so the length-bonus doesn't confound.
    const base = "Senate passes bill";
    const withQuotes = '"Controversial" ' + base;
    const diff = scoreClickbait(withQuotes) - scoreClickbait(base);
    expect(diff).toBe(10);
  });

  test("Numeric superlative '10 things' → +15", () => {
    // Short base so the length-bonus doesn't confound.
    const base = "Senate passes bill";
    const withNum = "10 things about " + base;
    const diff = scoreClickbait(withNum) - scoreClickbait(base);
    expect(diff).toBe(15);
  });

  test("Emoji → +10", () => {
    // Short base so the length-bonus doesn't confound.
    const base = "Senate passes bill";
    const withEmoji = base + " 🤯";
    const diff = scoreClickbait(withEmoji) - scoreClickbait(base);
    expect(diff).toBe(10);
  });

  test("Length sweet spot (40-120) → -5", () => {
    // A pure factual headline of exactly 45 chars should be -5 (capped at 0).
    const s = scoreClickbait("Senate passes bill 51-49 after 12-hour debate");
    expect(s).toBe(0);
  });
});

describe("clickbaitBand", () => {
  test("low < 30", () => {
    expect(clickbaitBand(0)).toBe("low");
    expect(clickbaitBand(29)).toBe("low");
  });
  test("medium 30-69", () => {
    expect(clickbaitBand(30)).toBe("medium");
    expect(clickbaitBand(69)).toBe("medium");
  });
  test("high >= 70", () => {
    expect(clickbaitBand(70)).toBe("high");
    expect(clickbaitBand(100)).toBe("high");
  });
});

describe("scoreAndBand", () => {
  test("returns both score and band", () => {
    const { score, band } = scoreAndBand("BREAKING: You won't believe what happened next!!!");
    expect(typeof score).toBe("number");
    expect(band).toBe("high");
  });
});
