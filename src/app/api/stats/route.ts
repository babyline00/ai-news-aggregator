import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FEEDS } from "@/lib/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stats — high-level counters for the header.
 *
 * Returns:
 *   - items: total NewsItem rows
 *   - feeds: number of known feeds (hardcoded + user-added)
 *   - highClickbaitItems: NewsItems with band === "high"
 *   - clusters: distinct clusterId values (multi-source clusters only)
 */
export async function GET() {
  const items = await db.newsItem.count();
  const highClickbaitItems = await db.newsItem.count({
    where: { clickbaitBand: "high" },
  });

  const dbFeedCount = await db.feed.count();
  const feeds = FEEDS.length + dbFeedCount;

  // Distinct clusterId via raw groupBy — SQLite-friendly
  const clusters = await db.newsItem.groupBy({
    by: ["clusterId"],
    where: { clusterId: { not: null } },
    _count: { clusterId: true },
  });
  const multiClusters = clusters.filter(
    (c) => (c._count.clusterId ?? 0) >= 2,
  ).length;

  return NextResponse.json({
    items,
    feeds,
    highClickbaitItems,
    clusters: multiClusters,
  });
}
