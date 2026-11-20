/**
 * Per-topic classifier — pure function `categorizeNewsItem(item)`.
 *
 * Each known topic has a list of keywords. We count distinct keyword
 * hits per topic (case-insensitive, word-boundary regex) and pick the
 * topic with the most hits. Tie-break: priority order Tech > Politics >
 * Business > Science > Health > Sports > Entertainment. If no topic
 * matches, returns "General".
 *
 * The classifier combines the title and (optional) description so a
 * headline like "Apple announces new product" with description "the
 * latest iPhone features ..." still ends up in Tech.
 */

export type Topic =
  | "Tech"
  | "Politics"
  | "Business"
  | "Science"
  | "Health"
  | "Sports"
  | "Entertainment"
  | "General";

export interface ClassifiableItem {
  title: string;
  description?: string | null;
  [key: string]: unknown;
}

const TOPIC_PRIORITY: Exclude<Topic, "General">[] = [
  "Tech",
  "Politics",
  "Business",
  "Science",
  "Health",
  "Sports",
  "Entertainment",
];

const TOPIC_KEYWORDS: Record<Exclude<Topic, "General">, string[]> = {
  Tech: [
    "apple", "iphone", "ipad", "mac", "android", "google", "microsoft",
    "meta", "amazon", "openai", "anthropic", "claude", "gpt", "llm",
    "software", "chip", "chips", "semiconductor", "intel", "nvidia", "amd",
    "tesla", "startup", "startups", "silicon", "smartphone", "laptop",
    "internet", "cloud", "github", "programming", "algorithm", "robot",
    "robotics", "cybersecurity", "tech", "technology",
  ],
  Politics: [
    "senate", "congress", "parliament", "white house", "president",
    "election", "elections", "democrat", "democrats", "republican",
    "republicans", "gop", "senator", "senators", "governor", "mayor",
    "political", "politics", "lawmaker", "lawmakers", "legislation",
    "prime minister", "trump", "biden", "harris", "pelosi", "schumer",
    "mccarthy", "partisan",
  ],
  Business: [
    "stock", "stocks", "market", "shares", "earnings", "ceo", "company",
    "companies", "business", "economy", "economic", "fed", "rates",
    "dow", "nasdaq", "inflation", "employment", "bank", "banks", "banking",
    "merger", "acquisition", "ipo", "wall street", "tariff", "tariffs",
    "recession", "gdp", "deficit",
  ],
  Science: [
    "science", "research", "study", "studies", "scientists", "scientist",
    "discovery", "physics", "chemistry", "biology", "space", "nasa", "mars",
    "climate", "environment", "environmental", "species", "evolution",
    "journal", "quantum", "telescope", "experiment",
  ],
  Health: [
    "health", "medical", "doctor", "doctors", "hospital", "hospitals",
    "disease", "diseases", "virus", "viruses", "covid", "vaccine",
    "vaccines", "cancer", "patient", "patients", "medicine", "fda",
    "obesity", "mental health", "wellness", "diet", "outbreak", "pandemic",
    "epidemic",
  ],
  Sports: [
    "sports", "lakers", "celtics", "nba", "nfl", "mlb", "nhl", "soccer",
    "football", "basketball", "baseball", "hockey", "tennis", "golf",
    "ufc", "mls", "olympics", "world cup", "championship", "championships",
    "playoff", "playoffs", "goal", "touchdown", "pitcher", "quarterback",
    "tournament", "fighter", "boxer",
  ],
  Entertainment: [
    "entertainment", "movie", "movies", "film", "films", "actor", "actress",
    "music", "song", "album", "concert", "netflix", "hollywood", "celebrity",
    "celebrities", "television", "oscars", "grammy", "grammys", "emmy",
    "emmys", "streaming", "box office", "disney", "spotify", "billboard",
    "documentary",
  ],
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTopicMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
    if (re.test(text)) count++;
  }
  return count;
}

/** Returns the topic for the given news item. Pure — no I/O. */
export function categorizeNewsItem(item: ClassifiableItem): Topic {
  const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (!text.trim()) return "General";

  let bestTopic: Topic = "General";
  let bestScore = 0;
  for (const topic of TOPIC_PRIORITY) {
    const score = countTopicMatches(text, TOPIC_KEYWORDS[topic]);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }
  return bestTopic;
}
