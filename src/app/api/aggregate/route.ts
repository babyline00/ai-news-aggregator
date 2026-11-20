import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FEEDS } from "@/lib/feeds";
import { parseRss } from "@/lib/rss";
import { scoreAndBand } from "@/lib/clickbait-scorer";
import { rewriteHeadline } from "@/lib/ai";
import { categorizeNewsItem } from "@/lib/topic-classifier";
import { getBiasTag } from "@/lib/bias-tagger";
import { dedupeNewsItems } from "@/lib/dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/aggregate
 *
 * Manual aggregation trigger for the MVP. Walks the hardcoded FEEDS list,
 * fetches each RSS feed, parses items, persists NewsItems (dedup by link),
 * scores clickbait, rewrites high-score headlines via the LLM (or the
 * pure-function fallback), categorizes by topic, tags political bias, then
 * clusters by title similarity and writes back clusterIds.
 *
 * In production this would be invoked by a cron (Vercel Cron / Inngest)
 * every N minutes rather than a manual button click.
 */
export async function POST() {
  const errors: Array<{ feed: string; error: string }> = [];
  const parsed: Array<{
    sourceFeed: string;
    sourceName: string;
    title: string;
    link: string;
    pubDate: Date;
    description: string | null;
  }> = [];

  for (const feed of FEEDS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(feed.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        errors.push({ feed: feed.url, error: `HTTP ${res.status}` });
        continue;
      }
      const xml = await res.text();
      for (const item of parseRss(xml)) {
        parsed.push({
          sourceFeed: feed.url,
          sourceName: feed.name,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          description: item.description,
        });
      }
      // Mirror the feed into the Feed table (for lastFetchedAt + user-added feeds)
      await db.feed.upsert({
        where: { url: feed.url },
        create: {
          url: feed.url,
          name: feed.name,
          category: feed.category,
          reliability: feed.reliability,
          bias: feed.bias,
          lastFetchedAt: new Date(),
        },
        update: { lastFetchedAt: new Date() },
      });
    } catch (e) {
      errors.push({ feed: feed.url, error: (e as Error).message });
    }
  }

  let newItems = 0;
  let highClickbaitItems = 0;
  for (const p of parsed) {
    try {
      const existing = await db.newsItem.findUnique({ where: { link: p.link } });
      if (existing) continue;
      const { score, band } = scoreAndBand(p.title);
      const topic = categorizeNewsItem({
        title: p.title,
        description: p.description,
      });
      const biasTag = topic === "Politics" ? getBiasTag(p.sourceName) : null;
      let rewrittenHeadline: string | null = null;
      if (band === "high") {
        highClickbaitItems++;
        try {
          const { rewritten } = await rewriteHeadline(p.title);
          rewrittenHeadline = rewritten && rewritten !== p.title ? rewritten : null;
        } catch {
          // ignore — fallback already applied inside rewriteHeadline
        }
      }
      await db.newsItem.create({
        data: {
          sourceFeed: p.sourceFeed,
          sourceName: p.sourceName,
          title: p.title,
          rewrittenHeadline,
          link: p.link,
          pubDate: p.pubDate,
          description: p.description,
          clickbaitScore: score,
          clickbaitBand: band,
          topic,
          biasTag,
        },
      });
      newItems++;
    } catch {
      // skip individual persist errors
    }
  }

  // Cluster all items by title similarity, write back clusterId for multi-
  // source clusters (singletons get no clusterId).
  const allItems = await db.newsItem.findMany({ orderBy: { pubDate: "desc" } });
  const dedupeInput = allItems.map((it) => ({
    id: it.id,
    title: it.title,
    sourceName: it.sourceName,
  }));
  const clusters = dedupeNewsItems(dedupeInput);
  let multiClusters = 0;
  for (const cluster of clusters) {
    if (cluster.items.length < 2) continue;
    multiClusters++;
    for (const item of cluster.items) {
      await db.newsItem.update({
        where: { id: item.id },
        data: { clusterId: cluster.clusterId },
      });
    }
  }

  return NextResponse.json({
    aggregated: parsed.length,
    newItems,
    highClickbaitItems,
    clusters: multiClusters,
    errors,
    totalItems: allItems.length,
    timestamp: new Date().toISOString(),
  });
}
