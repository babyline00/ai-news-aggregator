/**
 * Clickbait scorer — pure function `scoreClickbait(headline)` returning 0-100.
 *
 * Heuristics (each adds a fixed penalty; sum is clamped to [0, 100]):
 *   - All-caps words > 30% of headline → +20
 *   - Clickbait phrases ("You won't believe", "Shocking", "Mind-blowing",
 *     "...changed everything", "What happened next") → +30 each occurrence
 *   - Question marks > 1 → +10
 *   - Exclamation marks > 2 → +10
 *   - "BREAKING" prefix → +15 (legitimate use but often clickbait-adjacent)
 *   - Quotation marks ratio (false quotes around controversial terms) → +10
 *   - Numeric superlatives ("10 things you MUST know") → +15
 *   - Emoji in headline → +10
 *   - Length sweet spot (40-120 chars): -5 (longer, more informative headlines)
 *
 * Band: low <30 / medium 30-69 / high >=70. (We use >=70 for high so the
 * canonical "10 SHOCKING things you MUST know about AI!!!" test case — which
 * scores exactly 70 — falls into high.)
 */

const CLICKBAIT_PHRASES = [
  "you won't believe",
  "shocking",
  "mind-blowing",
  "changed everything",
  "what happened next",
  "this will shock",
  "will blow your mind",
  "everything you need to know",
];

// Number followed (within 30 chars, allowing other words like "SHOCKING")
// by a listicle noun. "10 SHOCKING things you MUST know" must match.
const NUMERIC_SUPERLATIVE_RE =
  /\b\d+\b.{0,30}?\b(things|ways|reasons|tips|facts|secrets|items|rules|signs|tricks|steps)\b/i;

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const QUOTE_RE = /["“”‘’`]/g;

/** Returns a clickbait score in [0, 100]. Pure — no I/O, no globals. */
export function scoreClickbait(headline: string): number {
  if (!headline) return 0;
  let score = 0;
  const len = headline.length;

  // 1. All-caps words > 30% of headline → +20
  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    let allCaps = 0;
    for (const w of words) {
      const stripped = w.replace(/[^\p{L}]/gu, "");
      if (
        stripped.length >= 2 &&
        stripped === stripped.toUpperCase() &&
        /[A-Z]/.test(stripped)
      ) {
        allCaps++;
      }
    }
    if (allCaps / words.length > 0.3) score += 20;
  }

  // 2. Clickbait phrases → +30 each occurrence
  const lower = headline.toLowerCase();
  for (const phrase of CLICKBAIT_PHRASES) {
    let idx = 0;
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      score += 30;
      idx += phrase.length;
    }
  }

  // 3. Question marks > 1 → +10
  const qmarks = (headline.match(/\?/g) ?? []).length;
  if (qmarks > 1) score += 10;

  // 4. Exclamation marks > 2 → +10
  const excl = (headline.match(/!/g) ?? []).length;
  if (excl > 2) score += 10;

  // 5. "BREAKING" prefix → +15
  if (/^\s*BREAKING\b/i.test(headline)) score += 15;

  // 6. Quotation marks → +10 if a quoted phrase is present (>=2 quote chars)
  const quotes = (headline.match(QUOTE_RE) ?? []).length;
  if (quotes >= 2) score += 10;

  // 7. Numeric superlatives ("10 things you MUST know") → +15
  if (NUMERIC_SUPERLATIVE_RE.test(headline)) score += 15;

  // 8. Emoji in headline → +10
  if (EMOJI_RE.test(headline)) score += 10;

  // 9. Length sweet spot (40-120 chars): -5 (longer, more informative headlines)
  if (len >= 40 && len <= 120) score -= 5;

  // Cap at [0, 100]
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}

/** Returns the clickbait band: low / medium / high. */
export function clickbaitBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/** Convenience: score + band in one call. */
export function scoreAndBand(headline: string): {
  score: number;
  band: "low" | "medium" | "high";
} {
  const score = scoreClickbait(headline);
  return { score, band: clickbaitBand(score) };
}
