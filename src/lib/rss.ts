/**
 * Minimal RSS/Atom XML parser. Pure function — no I/O.
 *
 * Returns a flat list of items with title/link/pubDate/description. Used
 * by the `POST /api/aggregate` route. Tests do not exercise live RSS
 * fetching (would be flaky); this module is intentionally regex-based so
 * it has zero deps and is easy to reason about.
 */

export interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: Date;
  description: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripHtml(s: string): string {
  // CDATA sections: keep inner text
  const noCdata = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return noCdata.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pick(block: string, tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = block.match(re);
    if (m) return m[1];
    // Atom <link href="..." /> variant
    const hrefRe = new RegExp(`<${tag}[^>]*href="([^"]+)"`, "i");
    const hm = block.match(hrefRe);
    if (hm) return hm[1];
  }
  return null;
}

/**
 * Parse RSS 2.0 (`<item>`) or Atom (`<entry>`) XML into a flat item list.
 * Returns `[]` for empty or unparseable XML.
 */
export function parseRss(xml: string): ParsedRssItem[] {
  if (!xml) return [];
  const items: ParsedRssItem[] = [];

  // RSS 2.0: <item>...</item>
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks) {
    const title = pick(block, ["title"]);
    const link = pick(block, ["link"]);
    const pubDateRaw = pick(block, ["pubDate", "date"]);
    const desc = pick(block, ["description"]);
    if (title && link) {
      items.push({
        title: decodeEntities(stripHtml(title)),
        link: decodeEntities(link.trim()),
        pubDate: pubDateRaw ? new Date(pubDateRaw.trim()) : new Date(),
        description: desc ? decodeEntities(stripHtml(desc)).slice(0, 500) : null,
      });
    }
  }

  // Atom: <entry>...</entry> (only if RSS didn't yield anything)
  if (items.length === 0) {
    const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
    for (const block of entryBlocks) {
      const title = pick(block, ["title"]);
      const link = pick(block, ["link"]);
      const pubDateRaw = pick(block, ["published", "updated"]);
      const desc = pick(block, ["summary", "content"]);
      if (title && link) {
        items.push({
          title: decodeEntities(stripHtml(title)),
          link: decodeEntities(link.trim()),
          pubDate: pubDateRaw ? new Date(pubDateRaw.trim()) : new Date(),
          description: desc ? decodeEntities(stripHtml(desc)).slice(0, 500) : null,
        });
      }
    }
  }

  return items;
}
