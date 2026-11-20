/**
 * Jaccard similarity over token sets. Used by the dedupe step to cluster
 * near-identical news headlines ("Senate passes X" vs "Senate OKs X").
 *
 * Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 *
 * - identical inputs -> 1.0
 * - completely disjoint -> 0.0
 * - partial overlap -> 0 < x < 1
 *
 * The token sets are derived from the tokenizer, which strips stop words
 * and lowercases everything.
 */
import { tokenize } from "./tokenizer";

export function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1.0;
  if (ta.size === 0 || tb.size === 0) return 0.0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter++;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Same as above but accepts pre-tokenized arrays. */
export function jaccardSets(a: string[], b: string[]): number {
  const ta = new Set(a);
  const tb = new Set(b);
  if (ta.size === 0 && tb.size === 0) return 1.0;
  if (ta.size === 0 || tb.size === 0) return 0.0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter++;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}
