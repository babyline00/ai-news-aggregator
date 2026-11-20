import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getReliability } from "@/lib/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/news
 *
 * Query params:
 *   - topic:           filter by topic (Tech, Politics, Business, ...)
 *   - source:          filter by source name (exact match)
 *   - minReliability:   drop items whose source reliability is below this (0-100)
 *   - maxClickbait:     drop items whose clickbait score is above this (0-100)
 *   - since:           ISO date — drop items published before this
 *
 * Returns the most recent 200 items (newest first).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");
  const source = searchParams.get("source");
  const minReliability = parseInt(searchParams.get("minReliability") ?? "0", 10) || 0;
  const maxClickbait = parseInt(searchParams.get("maxClickbait") ?? "100", 10) || 100;
  const since = searchParams.get("since");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (topic) where.topic = topic;
  if (source) where.sourceName = source;
  if (since) {
    const d = new Date(since);
    if (!isNaN(d.getTime())) where.pubDate = { gte: d };
  }

  let items = await db.newsItem.findMany({
    where,
    orderBy: { pubDate: "desc" },
    take: 200,
  });

  items = items.filter((it) => it.clickbaitScore <= maxClickbait);
  if (minReliability > 0) {
    items = items.filter((it) => getReliability(it.sourceName) >= minReliability);
  }

  return NextResponse.json({ items });
}
