import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getReliability } from "@/lib/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/news/[id] — single news item with its source reliability resolved. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await db.newsItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    item: {
      ...item,
      sourceReliability: getReliability(item.sourceName),
    },
  });
}
