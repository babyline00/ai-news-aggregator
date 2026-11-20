/**
 * Hardcoded RSS feed list for the MVP. Each feed entry carries:
 *   - url:        the RSS/Atom feed URL
 *   - name:       human-readable publisher name (keyed into the
 *                 reliability + bias tables)
 *   - category:   Tech | Politics | Business | Science | Health | Sports
 *                 | Entertainment | General
 *   - reliability: editorial-standards score (0-100), looked up from
 *                 `reliability.ts` so the data lives in one place.
 *   - bias:       "left" | "center" | "right" | null  (null = not politically
 *                 rated), looked up from `bias-tagger.ts`.
 *
 * The MVP uses a static list of 15 well-known feeds. In production this
 * would live in the `Feed` table and be editable from the UI
 * (`POST /api/feeds`). Real prod would also use a cron (Vercel Cron /
 * Inngest) to call `POST /api/aggregate` every N minutes instead of the
 * manual "Aggregate now" button.
 */
import { BIAS_TABLE, getBiasTag, type BiasTag } from "./bias-tagger";
import { RELIABILITY_TABLE, getReliability } from "./reliability";

export type FeedCategory =
  | "Tech"
  | "Politics"
  | "Business"
  | "Science"
  | "Health"
  | "Sports"
  | "Entertainment"
  | "General";

export type { BiasTag };

export interface FeedSource {
  url: string;
  name: string;
  category: FeedCategory;
  reliability: number;
  bias: BiasTag | null;
}

const FEED_DEFS: Array<{ url: string; name: string; category: FeedCategory }> = [
  { url: "https://feeds.reuters.com/reuters/topNews", name: "Reuters", category: "General" },
  { url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", category: "General" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "The New York Times", category: "General" },
  { url: "https://www.theguardian.com/world/rss", name: "The Guardian", category: "General" },
  { url: "https://news.ycombinator.com/rss", name: "Hacker News", category: "Tech" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", category: "Tech" },
  { url: "https://www.theverge.com/rss/index.xml", name: "The Verge", category: "Tech" },
  { url: "https://www.wired.com/feed/rss", name: "Wired", category: "Tech" },
  { url: "https://feeds.npr.org/1001/rss.xml", name: "NPR", category: "General" },
  { url: "https://www.aljazeera.com/xml/rss/all", name: "Al Jazeera", category: "General" },
  { url: "https://www.economist.com/finance-and-economics/rss.xml", name: "The Economist", category: "Business" },
  { url: "https://rss.politico.com/politics-news.xml", name: "Politico", category: "Politics" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", name: "Wall Street Journal", category: "Business" },
  { url: "https://feeds.foxnews.com/foxnews/politics", name: "Fox News", category: "Politics" },
  { url: "https://www.breitbart.com/feed/", name: "Breitbart", category: "Politics" },
];

export const FEEDS: FeedSource[] = FEED_DEFS.map((f) => ({
  ...f,
  reliability: RELIABILITY_TABLE[f.name] ?? 50,
  bias: BIAS_TABLE[f.name] ?? null,
}));

export const FEED_BY_NAME: Record<string, FeedSource> = Object.fromEntries(
  FEEDS.map((f) => [f.name, f]),
);

export { getBiasTag, getReliability };
