/**
 * Per-source reliability score (editorial standards, 0-100). Pure function.
 *
 * `getReliability(sourceName)` returns the publisher's editorial-standards
 * score, or a neutral default of 50 for unknown sources.
 *
 * Scores are based on widely-cited media-reliability ratings (NewsGuard,
 * Ad Fontes, AllSides). They are intentionally coarse-grained for the MVP
 * — a real prod system would store a continuous score and update it
 * periodically based on fact-check outcomes.
 *
 * Tests require: NYT > Breitbart; Reuters > 80; unknown source -> 50.
 */

export const RELIABILITY_TABLE: Record<string, number> = {
  Reuters: 88,
  "BBC News": 82,
  "The New York Times": 85,
  "The Guardian": 80,
  "Hacker News": 75,
  "Ars Technica": 84,
  "The Verge": 78,
  Wired: 76,
  NPR: 86,
  "Al Jazeera": 70,
  "The Economist": 83,
  Politico: 78,
  "Wall Street Journal": 84,
  "Fox News": 55,
  Breitbart: 45,
};

/** Returns the publisher's reliability score (0-100), default 50. */
export function getReliability(sourceName: string): number {
  if (!sourceName) return 50;
  return RELIABILITY_TABLE[sourceName] ?? 50;
}
