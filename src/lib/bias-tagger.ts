/**
 * Per-source political bias tag. Pure function — no I/O.
 *
 * `getBiasTag(sourceName)` returns "left" | "center" | "right" | null.
 * `null` means the source is not politically rated (e.g. pure-tech feeds
 * like Hacker News / Ars Technica / The Verge / Wired) — the UI uses this
 * to skip the bias badge for non-political items.
 *
 * The bias table is based on widely-cited media-bias assessments
 * (AllSides, Ad Fontes). It is intentionally coarse-grained (3 buckets)
 * — a real prod system would store a continuous left-right score
 * (-1..+1) per source.
 */

export type BiasTag = "left" | "center" | "right";

export const BIAS_TABLE: Record<string, BiasTag> = {
  Reuters: "center",
  "BBC News": "center",
  "The New York Times": "left",
  "The Guardian": "left",
  NPR: "center",
  "Al Jazeera": "center",
  "The Economist": "center",
  Politico: "center",
  "Wall Street Journal": "right",
  "Fox News": "right",
  Breitbart: "right",
  // Tech-only feeds (Hacker News, Ars Technica, The Verge, Wired) are
  // intentionally absent — they have no political bias rating.
};

/** Returns the source's political bias tag, or null if not rated. */
export function getBiasTag(sourceName: string): BiasTag | null {
  if (!sourceName) return null;
  return BIAS_TABLE[sourceName] ?? null;
}
