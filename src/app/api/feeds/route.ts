import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FEEDS } from "@/lib/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/feeds — list all known feeds.
 *
 * Combines the hardcoded FEEDS list with any user-added feeds from the
 * Feed table (added via POST /api/feeds). Hardcoded feeds gain their
 * `lastFetchedAt` from the DB row if it exists (set by /api/aggregate).
 */
export async function GET() {
  const dbFeeds = await db.feed.findMany();
  const hardcodedUrls = new Set(FEEDS.map((f) => f.url));
  const dbOnly = dbFeeds.filter((f) => !hardcodedUrls.has(f.url));

  const allFeeds = [
    ...FEEDS.map((f) => ({
      id: `static:${f.name}`,
      url: f.url,
      name: f.name,
      category: f.category,
      reliability: f.reliability,
      bias: f.bias,
      lastFetchedAt:
        dbFeeds.find((d) => d.url === f.url)?.lastFetchedAt ?? null,
      hardcoded: true,
    })),
    ...dbOnly.map((f) => ({
      id: f.id,
      url: f.url,
      name: f.name,
      category: f.category,
      reliability: f.reliability,
      bias: f.bias,
      lastFetchedAt: f.lastFetchedAt,
      hardcoded: false,
    })),
  ];

  return NextResponse.json({ feeds: allFeeds });
}

/**
 * POST /api/feeds — add a user-supplied feed.
 *
 * Body: { url, name, category?, reliability?, bias? }
 * Required: url, name. Category defaults to "General", reliability to 50,
 * bias to null.
 */
export async function POST(req: NextRequest) {
  let body: {
    url?: string;
    name?: string;
    category?: string;
    reliability?: number;
    bias?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { url, name, category, reliability, bias } = body;
  if (!url || !name) {
    return NextResponse.json(
      { error: "url and name are required" },
      { status: 400 },
    );
  }
  try {
    const feed = await db.feed.create({
      data: {
        url,
        name,
        category: category ?? "General",
        reliability: typeof reliability === "number" ? reliability : 50,
        bias: bias ?? null,
      },
    });
    return NextResponse.json({ feed });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
