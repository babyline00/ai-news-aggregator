"use client";

import * as React from "react";
import { RefreshCw, ExternalLink, Sparkles, Newspaper, Shield, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FEEDS, getReliability } from "@/lib/feeds";

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

type BiasTag = "left" | "center" | "right";

interface NewsItem {
  id: string;
  sourceFeed: string;
  sourceName: string;
  title: string;
  rewrittenHeadline: string | null;
  link: string;
  pubDate: string;
  description: string | null;
  clickbaitScore: number;
  clickbaitBand: "low" | "medium" | "high";
  topic: string | null;
  biasTag: string | null;
  clusterId: string | null;
  createdAt: string;
}

interface FeedView {
  id: string;
  url: string;
  name: string;
  category: string;
  reliability: number;
  bias: BiasTag | null;
  lastFetchedAt: string | null;
  hardcoded: boolean;
}

interface Stats {
  items: number;
  feeds: number;
  highClickbaitItems: number;
  clusters: number;
}

const TOPICS = [
  "All",
  "Tech",
  "Politics",
  "Business",
  "Science",
  "Health",
  "Sports",
  "Entertainment",
  "General",
] as const;

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function reliabilityColor(rel: number): string {
  if (rel > 70) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (rel >= 50) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-rose-100 text-rose-800 border-rose-300";
}

function clickbaitBandColor(band: NewsItem["clickbaitBand"]): string {
  if (band === "high") return "text-rose-700 bg-rose-50 border-rose-200";
  if (band === "medium") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function biasColor(bias: BiasTag): string {
  if (bias === "left") return "bg-sky-100 text-sky-800 border-sky-300";
  if (bias === "right") return "bg-rose-100 text-rose-800 border-rose-300";
  return "bg-slate-100 text-slate-800 border-slate-300";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export default function Page() {
  const [items, setItems] = React.useState<NewsItem[]>([]);
  const [feeds, setFeeds] = React.useState<FeedView[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [aggregating, setAggregating] = React.useState(false);
  const [aggregateMsg, setAggregateMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [topic, setTopic] = React.useState<string>("All");
  const [source, setSource] = React.useState<string>("all");
  const [maxClickbait, setMaxClickbait] = React.useState<number>(100);
  const [minReliability, setMinReliability] = React.useState<number>(0);

  // Build query string
  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();
    if (topic && topic !== "All") params.set("topic", topic);
    if (source && source !== "all") params.set("source", source);
    if (maxClickbait < 100) params.set("maxClickbait", String(maxClickbait));
    if (minReliability > 0) params.set("minReliability", String(minReliability));
    return params.toString();
  }, [topic, source, maxClickbait, minReliability]);

  const refreshNews = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const res = await fetch(`/api/news${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const refreshFeeds = React.useCallback(async () => {
    try {
      const res = await fetch("/api/feeds", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setFeeds(data.feeds ?? []);
    } catch {
      // ignore
    }
  }, []);

  const refreshStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      setStats(await res.json());
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    refreshNews();
    refreshFeeds();
    refreshStats();
  }, [refreshNews, refreshFeeds, refreshStats]);

  // Re-fetch news when filters change
  React.useEffect(() => {
    refreshNews();
  }, [refreshNews]);

  const onAggregate = React.useCallback(async () => {
    setAggregating(true);
    setAggregateMsg("Fetching RSS feeds and scoring headlines...");
    try {
      const res = await fetch("/api/aggregate", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const errs = data.errors?.length ?? 0;
      setAggregateMsg(
        `Aggregated ${data.aggregated ?? 0} items, ${data.newItems ?? 0} new, ` +
          `${data.highClickbaitItems ?? 0} high-clickbait (rewritten), ` +
          `${data.clusters ?? 0} clusters. ${errs > 0 ? `${errs} feed(s) had errors.` : ""}`,
      );
      refreshNews();
      refreshFeeds();
      refreshStats();
    } catch (e) {
      setAggregateMsg(`Error: ${(e as Error).message}`);
    } finally {
      setAggregating(false);
    }
  }, [refreshNews, refreshFeeds, refreshStats]);

  // Source breakdown (item count per source)
  const perSource = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.sourceName, (map.get(it.sourceName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        reliability: getReliability(name),
        bias: FEEDS.find((f) => f.name === name)?.bias ?? null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Newspaper className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                AI News Aggregator
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                No-clickbait news, scored and rewritten
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                <span className="flex items-center gap-1">
                  <Newspaper className="size-3.5" /> {stats.items} items
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="size-3.5" /> {stats.feeds} feeds
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="size-3.5" /> {stats.clusters} clusters
                </span>
              </div>
            )}
            <Button
              onClick={onAggregate}
              disabled={aggregating}
              size="sm"
              className="shrink-0"
            >
              <RefreshCw
                className={cn("size-4", aggregating && "animate-spin")}
              />
              {aggregating ? "Aggregating..." : "Aggregate now"}
            </Button>
          </div>
        </div>
        {aggregateMsg && (
          <div className="container mx-auto px-4 pb-2">
            <div className="text-xs text-muted-foreground bg-muted/60 border rounded-md px-3 py-1.5">
              {aggregateMsg}
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Filter bar */}
        <section
          aria-label="filters"
          className="bg-card border rounded-xl p-4 mb-6 shadow-sm"
        >
          <div className="flex flex-col gap-4">
            {/* Topic chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Topic:
              </span>
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-colors",
                    topic === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <Separator />

            {/* Source + sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Source
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {feeds.map((f) => (
                      <SelectItem key={f.id} value={f.name}>
                        {f.name} ({f.reliability})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex justify-between">
                  <span>Max clickbait</span>
                  <span className="font-mono">{maxClickbait}</span>
                </label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[maxClickbait]}
                  onValueChange={(v) => setMaxClickbait(v[0] ?? 100)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 (strict)</span>
                  <span>100 (off)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex justify-between">
                  <span>Min reliability</span>
                  <span className="font-mono">{minReliability}</span>
                </label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[minReliability]}
                  onValueChange={(v) => setMinReliability(v[0] ?? 0)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 (off)</span>
                  <span>100 (strict)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* News + Sidebar grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* News feed */}
          <section aria-label="news-feed" className="space-y-3">
            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-3">
                Error loading news: {error}
              </div>
            )}
            {loading && items.length === 0 && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </>
            )}
            {!loading && items.length === 0 && !error && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No items yet. Click <strong>Aggregate now</strong> to fetch
                  the latest RSS feeds.
                </CardContent>
              </Card>
            )}
            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto scroll-pretty pr-1">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside aria-label="source-breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Source breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-pretty">
                {perSource.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No items to break down.
                  </p>
                )}
                {perSource.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border",
                            reliabilityColor(s.reliability),
                          )}
                        >
                          rel {s.reliability}
                        </span>
                        {s.bias && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border",
                              biasColor(s.bias as BiasTag),
                            )}
                          >
                            {s.bias}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {s.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-emerald-200" /> Reliability
                  high &gt;70
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-amber-200" /> Reliability
                  mid 50-70
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-rose-200" /> Reliability
                  low &lt;50
                </div>
                <Separator className="my-2" />
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-emerald-200" /> Clickbait
                  low &lt;30
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-amber-200" /> Clickbait
                  mid 30-69
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-rose-200" /> Clickbait
                  high &gt;=70
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="container mx-auto px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            AI News Aggregator (No-Clickbait) — 15 RSS feeds, pure-function
            clickbait scorer + LLM rewriter
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * NewsCard
 * ------------------------------------------------------------------------- */

function NewsCard({ item }: { item: NewsItem }) {
  const reliability = getReliability(item.sourceName);
  const clusterSize = item.clusterId ? null : null; // cluster size from server aggregation
  return (
    <Card className="py-4 gap-3">
      <CardHeader className="pb-2 px-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-medium truncate">
              {item.sourceName}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                reliabilityColor(reliability),
              )}
            >
              rel {reliability}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                clickbaitBandColor(item.clickbaitBand),
              )}
            >
              {item.clickbaitBand} ({item.clickbaitScore})
            </span>
            {item.topic && (
              <Badge variant="secondary" className="text-[10px]">
                {item.topic}
              </Badge>
            )}
            {item.biasTag && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  biasColor(item.biasTag as BiasTag),
                )}
              >
                {item.biasTag}
              </span>
            )}
            {item.clusterId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                <Layers className="size-3 inline mr-1" />
                in cluster
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDate(item.pubDate)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-2">
        <h2 className="text-sm font-semibold leading-snug">
          {item.title}
        </h2>
        {item.rewrittenHeadline && (
          <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-violet-700 mb-0.5">
              <Sparkles className="size-3" />
              AI rewrite
            </div>
            <p className="text-sm text-foreground/90 leading-snug">
              {item.rewrittenHeadline}
            </p>
          </div>
        )}
        {item.description && !item.rewrittenHeadline && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Read more <ExternalLink className="size-3" />
          </a>
          {clusterSize && <span className="text-[10px] text-muted-foreground">{clusterSize}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
