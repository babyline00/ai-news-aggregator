/**
 * Headline rewriter. Two layers:
 *
 *  1. `buildRewritePrompt(headline)` — pure function that returns the prompt
 *     we send to the LLM. The prompt instructs the model to produce a
 *     factual, neutral, declarative rewrite — strip clickbait, preserve
 *     factual content (numbers, named entities, dates), no added info,
 *     return only the rewritten headline.
 *
 *  2. `fallbackRewrite(headline)` — pure-function template fallback used
 *     when the LLM is unavailable, fails, or returns an empty string.
 *     Strips clickbait phrases, converts all-caps words (length >= 3) to
 *     title case, removes emoji, strips the "BREAKING:" prefix, collapses
 *     repeated punctuation and whitespace, and trims leading/trailing
 *     punctuation.
 *
 * The LLM call itself (`rewriteHeadline`) lives in `ai.ts` so the
 * ChatProvider can be mocked in tests without touching this module.
 */

const CLICKBAIT_PHRASES_RE =
  /you won't believe|shocking|mind-blowing|changed everything|what happened next|this will shock|will blow your mind|everything you need to know/gi;

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const BREAKING_PREFIX_RE = /^\s*BREAKING\b[\s:]*/i;
const MULTI_PUNCT_RE = /([!?])\1+/g;
const MULTI_SPACE_RE = /\s{2,}/g;
const EDGE_PUNCT_RE = /^[\s!?.,:;]+|[\s!?.,:;]+$/g;
const ALLCAPS_WORD_RE = /\b[A-Z]{3,}\b/g;

/** Returns the prompt we send to the LLM to rewrite the headline. Pure. */
export function buildRewritePrompt(headline: string): string {
  return [
    "You are a senior headline editor for a fact-grounded news aggregator.",
    "Rewrite the following headline to be factual, neutral, and informative.",
    "Rules:",
    '1. Remove clickbait language (all-caps words, exclamation marks, clickbait phrases like "You won\'t believe").',
    "2. Convert sensationalist phrasing into a neutral, declarative statement.",
    "3. Preserve all factual information (numbers, named entities, dates).",
    "4. Do not add information that is not in the original headline.",
    "5. Return ONLY the rewritten headline, no quotes, no explanation.",
    "",
    "Original headline:",
    headline,
  ].join("\n");
}

/**
 * Pure-function fallback rewrite. Strips clickbait phrases, emoji, BREAKING
 * prefix; converts all-caps words (length >= 3) to title case; collapses
 * repeated punctuation and whitespace; trims leading/trailing punctuation.
 *
 * Returns "" when the headline reduces to nothing (e.g. a headline that was
 * 100% clickbait phrases). The caller should fall back to the original
 * headline in that case — see `rewriteHeadline` in `ai.ts`.
 */
export function fallbackRewrite(headline: string): string {
  if (!headline) return "";
  let s = headline;
  s = s.replace(CLICKBAIT_PHRASES_RE, "");
  s = s.replace(EMOJI_RE, "");
  s = s.replace(BREAKING_PREFIX_RE, "");
  s = s.replace(ALLCAPS_WORD_RE, (m) => m.charAt(0) + m.slice(1).toLowerCase());
  s = s.replace(MULTI_PUNCT_RE, "$1");
  s = s.replace(MULTI_SPACE_RE, " ");
  s = s.replace(EDGE_PUNCT_RE, "");
  return s.trim();
}
