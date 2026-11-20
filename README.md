# AI News Aggregator (No-Clickbait)

> Aggregates news from 15 well-known RSS feeds, scores headlines for
> clickbait, rewrites misleading headlines into factual neutral versions,
> and surfaces only fact-grounded stories with source reliability ratings
> and per-topic digests.

This is the MVP for project #60 in the 110-project portfolio plan. The
goal is a single-page Next.js app that fights back against clickbait:
when a headline scores high on a transparent heuristic scorer, an LLM
rewrites it into a neutral declarative statement, and the original is
shown alongside the rewrite so the reader can see what was misleading.
Multi-source dedup clusters near-identical stories across publishers
and surfaces the highest-reliability source's headline as the canonical
one.

---

## MVP scope

- **RSS aggregation** — 15 hardcoded RSS feed URLs in `src/lib/feeds.ts`
  (Reuters, BBC, NYT, Guardian, Hacker News, Ars Technica, The Verge,
  Wired, NPR, Al Jazeera, The Economist, Politico, Wall Street Journal,
  Fox News, Breitbart). On `POST /api/aggregate` (manual trigger), the
  route fetches each feed, parses items (title, link, pubDate,
  description), and persists them as `NewsItem` rows deduped by `link`.
  Real production would replace the manual button with a cron —
  Vercel Cron or Inngest calling `/api/aggregate` every N minutes.
- **Clickbait scoring** — pure-function `scoreClickbait(headline)` → 0-100
  with 9 documented heuristics (all-caps ratio, clickbait phrases,
  question/exclamation marks, BREAKING prefix, quotation marks, numeric
  superlatives, emoji, length sweet spot). Band: low <30 / medium 30-69
  / high >=70.
- **Headline rewriting** — for headlines with score >=70 (high band),
  an LLM call (z-ai-web-dev-sdk) rewrites the headline to a factual
  neutral version. Stored as `rewrittenHeadline` on the NewsItem row.
  Falls back to a pure-function `fallbackRewrite` if the LLM is
  unavailable, throws, or returns empty.
- **Source reliability rating** — each source has a reliability score
  (0-100) hardcoded in `src/lib/reliability.ts` (Reuters=88, BBC=82,
  NYT=85, Guardian=80, Breitbart=45, Fox News=55, ...). Per-source
  rating is shown as a colored badge in the UI (green >70, amber 50-70,
  red <50).
- **Multi-source dedup** — `dedupeNewsItems(items)` clusters items by
  Jaccard similarity > 0.6 on tokenized titles (union-find for
  transitivity). Within a cluster, the headline from the highest-
  reliability source wins as the canonical headline. Clusters of size
  >=2 get a stable `clusterId` written back to the NewsItem rows.
- **Per-topic digest** — `categorizeNewsItem(item)` returns the topic
  (Tech / Politics / Business / Science / Health / Sports /
  Entertainment / General) based on weighted keyword rules over the
  title + description.
- **Bias indicator** — for political items, `getBiasTag(source)` returns
  "left" / "center" / "right" / null based on a hardcoded bias table.
  Shown as a colored badge next to the topic tag.

## Stretch (not in MVP)

- **Real cron** — Vercel Cron / Inngest to call `/api/aggregate` every
  15-60 minutes instead of the manual button.
- **Daily audio news brief** — TTS over the day's top fact-grounded
  headlines per topic, generated via the z-ai-web-dev-sdk TTS endpoint
  and pushed to the user as a short MP3.
- **Personalized per reader** — track per-user topic affinity and bias
  preferences; weight the feed ranking accordingly. (Needs auth —
  NextAuth.js is already in the stack.)
- **Real push notifications** — web-push API for "breaking factual
  news" alerts when a high-reliability source publishes a story
  clustered across >=3 other high-reliability sources.
- **Real ML clickbait classifier** — fine-tune a small BERT-based
  classifier on a labeled clickbait dataset (e.g. the Clickbait
  Challenge 2017 corpus) instead of the hand-tuned heuristics. The
  heuristics get you ~80% of the way for free; the ML gets the last 20%.

## Features

| Feature | Status | Where |
|---|---|---|
| 15 hardcoded RSS feeds with reliability + bias | MVP | `src/lib/feeds.ts` |
| Manual aggregation trigger | MVP | `POST /api/aggregate` |
| Clickbait scorer (9 heuristics, 0-100, 3 bands) | MVP | `src/lib/clickbait-scorer.ts` |
| LLM headline rewrite with pure-function fallback | MVP | `src/lib/ai.ts`, `src/lib/headline-rewriter.ts` |
| Multi-source dedup (Jaccard > 0.6 + union-find) | MVP | `src/lib/dedupe.ts` |
| Topic classifier (7 topics + General) | MVP | `src/lib/topic-classifier.ts` |
| Bias tagger (left/center/right/null) | MVP | `src/lib/bias-tagger.ts` |
| Reliability scorer (0-100) | MVP | `src/lib/reliability.ts` |
| Filter bar (topic chips, source, sliders) | MVP | `src/app/page.tsx` |
| Per-source breakdown sidebar | MVP | `src/app/page.tsx` |
| Stats endpoint (items, feeds, clusters) | MVP | `GET /api/stats` |
| Add/remove user feeds | MVP | `POST /api/feeds`, `DELETE /api/feeds/[id]` |
| Real cron (Vercel Cron / Inngest) | Stretch | — |
| Daily audio news brief (TTS) | Stretch | — |
| Personalized per reader | Stretch | — |
| Real ML clickbait classifier (BERT-based) | Stretch | — |
| Real push notifications | Stretch | — |

## Tech stack

- **Framework**: Next.js 16 (App Router, RSC)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Database**: Prisma 6 + SQLite (single-file, local-first)
- **LLM**: z-ai-web-dev-sdk (server-side only)
- **Tests**: `bun test` (bun:test runner)
- **Lint**: eslint-config-next

## Architecture

```
+---------------------------------------------------------------+
|  src/app/page.tsx (client component, 3-section layout)        |
|  +----- HEADER -----+                                          |
|  | app name | Aggregate now | stats                            |
|  +-------------------+                                          |
|  +----- FILTER BAR --+                                          |
|  | topic chips | source | max-clickbait | min-reliability      |
|  +-------------------+                                          |
|  +----- NEWS FEED (cards) ---+ +- SIDEBAR ----+               |
|  | source + rel badge        | | per-source   |               |
|  | headline + clickbait band | | breakdown    |               |
|  | AI rewrite box (if any)   | | legend       |               |
|  | topic + bias + cluster    | +---------------+              |
|  +---------------------------+                                  |
|  +----- FOOTER -----+                                          |
+---------------------------------------------------------------+
        ^                       ^
        | fetch                 | fetch
        v                       v
+----------------+    +------------------+    +---------------+
| GET /api/news  |    | GET /api/stats   |    | GET /api/feeds|
| filters by     |    | items/feeds/     |    | hardcoded +   |
| topic/source/  |    | clusters        |    | user-added    |
| clickbait/rel  |    +------------------+    +---------------+
+----------------+                                       ^
        ^                                                |
        | persisted by                                   | POST /api/feeds
        |                                                | DELETE /api/feeds/[id]
        |                                                v
+------------------+   parse   +------------------+  +-----------+
| POST /api/aggregate|  -----> | src/lib/rss.ts   |  | Feed table |
| - fetch 15 feeds  |          | (regex RSS+Atom) |  +-----------+
| - scoreClickbait  |
| - rewriteHeadline (LLM or fallback)
| - categorize topic
| - getBiasTag (politics only)
| - dedupeNewsItems -> clusterId write-back
+------------------+
        |
        v
+----------------------+
| Prisma + SQLite      |
| NewsItem + Feed      |
| (db/custom.db)       |
+----------------------+
```

## Setup

```bash
# 1. Install deps (bun)
bun install

# 2. Create the SQLite database file + apply the schema
bun run db:push
bun run db:generate

# 3. Start the dev server (http://localhost:3000)
bun run dev

# 4. In the browser, click "Aggregate now" to fetch the 15 RSS feeds
#    and populate the database with scored + rewritten NewsItems.
```

The DATABASE_URL is inlined in the `package.json` `db:*` scripts as
`"$(pwd)/db/custom.db"` so the database file always lives under the
project directory regardless of where you invoke the command from.

## Tests

```bash
bun test
```

The test suite is ~120 tests across 9 files in `src/lib/__tests__/`:

- `clickbait-scorer.test.ts` — verifies all 9 heuristics and the 4
  canonical spec cases (BREAKING/clickbait → high; Senate bill → low;
  10 SHOCKING → high; Fed rates → low). Asserts score always in [0, 100].
- `headline-rewriter.test.ts` — `buildRewritePrompt` returns a prompt
  asking the LLM for a factual neutral rewrite; `fallbackRewrite`
  strips all-caps + emoji + clickbait phrases and preserves neutral
  headlines.
- `dedupe.test.ts` — `clusterItems` clusters by Jaccard > 0.6 on
  tokenized titles; identical / near-identical cluster, very different
  stay separate; `dedupeNewsItems` picks the highest-reliability source.
- `topic-classifier.test.ts` — `categorizeNewsItem` returns the right
  topic from keyword rules for each of the 7 topics + General; uses
  the description as a fallback when the title is uninformative.
- `bias-tagger.test.ts` — `getBiasTag` returns left/center/right for
  known political sources, null for tech feeds and unknown sources.
- `reliability.test.ts` — `getReliability` returns 0-100 for known
  sources, 50 for unknown; NYT > Breitbart; Reuters > 80.
- `feeds.test.ts` — every hardcoded feed has url + name + category +
  reliability (in [0,100]) + optional bias; URLs and names are unique;
  values are consistent with the reliability/bias tables.
- `jaccard.test.ts` — `jaccardSimilarity(a, b)` returns 0-1; identical
  → 1; disjoint → 0; partial overlap → in (0, 1); empty+empty → 1.
- `ai.test.ts` — `MockProvider` returns a deterministic rewrite;
  `rewriteHeadline` uses the injected provider, falls back to
  `fallbackRewrite` when the provider throws or returns empty.

Live RSS fetching is intentionally NOT tested — it would be flaky in
CI. The pure-function pipeline (scorer → rewriter → categorize → bias →
dedupe) is fully covered.

## Env vars

See `.env.example`:

- `DATABASE_URL` (required) — absolute file path to the SQLite
  database. The `package.json` `db:*` scripts inline this as
  `"$(pwd)/db/custom.db"` so you don't need to set it manually for
  `db:push` / `db:generate`.
- `PKC_DISABLE_LLM` (optional) — set to `1` to force the
  pure-function `fallbackRewrite` path (offline dev / CI / tests).

## Project structure

```
60-ai-news-aggregator/
├── prisma/
│   └── schema.prisma          # NewsItem + Feed models
├── src/
│   ├── app/
│   │   ├── layout.tsx         # root layout
│   │   ├── page.tsx           # the 3-section UI (only user-visible route)
│   │   ├── globals.css        # tailwind + shadcn theme tokens
│   │   └── api/
│   │       ├── aggregate/route.ts   # POST — fetch + score + rewrite + cluster
│   │       ├── news/route.ts         # GET — list with filters
│   │       ├── news/[id]/route.ts    # GET — single item
│   │       ├── feeds/route.ts        # GET (list) + POST (add)
│   │       ├── feeds/[id]/route.ts   # DELETE
│   │       └── stats/route.ts        # GET — counters
│   ├── components/ui/         # shadcn/ui components used by the UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── slider.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── progress.tsx
│   │   └── input.tsx
│   └── lib/
│       ├── clickbait-scorer.ts    # 9 heuristics, 0-100, 3 bands
│       ├── headline-rewriter.ts  # buildRewritePrompt + fallbackRewrite
│       ├── ai.ts                 # ChatProvider + rewriteHeadline (LLM call)
│       ├── dedupe.ts              # clusterItems + dedupeNewsItems (Jaccard > 0.6)
│       ├── topic-classifier.ts    # categorizeNewsItem (7 topics + General)
│       ├── bias-tagger.ts         # getBiasTag + BIAS_TABLE
│       ├── reliability.ts         # getReliability + RELIABILITY_TABLE
│       ├── feeds.ts               # FEEDS array (15 RSS feeds) + accessors
│       ├── jaccard.ts             # jaccardSimilarity / jaccardSets
│       ├── tokenizer.ts           # tokenize / termFrequencies (for Jaccard)
│       ├── rss.ts                 # parseRss (regex RSS 2.0 + Atom)
│       ├── db.ts                  # PrismaClient singleton
│       ├── utils.ts               # cn() helper
│       └── __tests__/             # 9 test files, ~120 tests
├── package.json               # deps + scripts (db:* inline DATABASE_URL)
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── components.json            # shadcn/ui config (New York, neutral)
├── eslint.config.mjs          # relaxed rules (matches parent project)
├── README.md
├── LICENSE                    # MIT
├── .gitignore
├── .env.example
└── .env                       # local DATABASE_URL (gitignored)
```

## Case study

### Clickbait scoring heuristics

The scorer is a transparent, additive heuristic — each rule adds a
fixed penalty and the total is clamped to [0, 100]:

| Heuristic | Penalty | Why |
|---|---|---|
| All-caps words > 30% of headline | +20 | All-caps = emotional shouting |
| Clickbait phrases ("You won't believe", "Shocking", "Mind-blowing", "...changed everything", "What happened next") | +30 each | Literal clickbait tell |
| Question marks > 1 | +10 | Multiple questions = engagement bait |
| Exclamation marks > 2 | +10 | !!! is rarely factual |
| "BREAKING" prefix | +15 | Often legitimate but clickbait-adjacent |
| Quotation marks (>=2 chars) | +10 | "False-quote around controversial terms" |
| Numeric superlatives ("10 things you MUST know") | +15 | Listicle bait |
| Emoji in headline | +10 | Emoji almost never in serious news |
| Length sweet spot (40-120 chars) | -5 | Longer headlines are usually more informative |

The transparency is the point: a reader (or a regulator) can audit
exactly why a headline was flagged. The 4 canonical cases all hit the
expected band:

- `"BREAKING: You won't believe what happened next!!!"` → 80 → high
- `"Senate passes bill 51-49 after 12-hour debate"` → 0 → low
- `"10 SHOCKING things you MUST know about AI!!!"` → 70 → high
- `"Fed holds rates steady amid economic uncertainty"` → 0 → low

A real ML classifier (BERT-based, fine-tuned on a labeled clickbait
corpus) would catch subtler patterns ("This one weird trick", "Why X
is actually Y", etc.) but the heuristic scorer gets the loud cases
right for free, with zero latency and zero inference cost.

### Headline rewriting

For headlines in the high band (>=70), `rewriteHeadline` is called:

1. `buildRewritePrompt(headline)` constructs the prompt instructing the
   LLM to "Rewrite the following headline to be factual, neutral, and
   informative. Preserve all factual information. Do not add
   information. Return ONLY the rewritten headline."
2. The `ChatProvider` (z-ai-web-dev-sdk in prod, MockProvider in
   tests) returns the rewrite.
3. If the provider throws or returns an empty string, we fall back to
   `fallbackRewrite` — a pure function that strips clickbait phrases,
   converts all-caps words (length >= 3) to title case, removes emoji,
   strips the "BREAKING:" prefix, and collapses repeated punctuation.

The fallback is critical: the app stays useful offline, in CI, and in
the test suite, and the LLM is only one part of the pipeline — not a
single point of failure.

### Multi-source dedup

`dedupeNewsItems(items)`:

1. Tokenizes each title via `tokenize` (lowercases, strips stop words,
   handles CJK).
2. Computes pairwise `jaccardSets` between every pair of items.
3. Uses union-find to cluster items with similarity > 0.6 (so the
   clustering is transitive — if A~B and B~C, A/B/C end up in the same
   cluster even if A~C is below the threshold pairwise).
4. Within each cluster, picks the headline from the highest-reliability
   source as the canonical "winner". (Reuters > BBC > NYT > ...)
5. Multi-source clusters (>=2 items) get a stable `clusterId` written
   back to the NewsItem rows; singletons get no `clusterId`.

Why Jaccard on tokenized titles (and not, say, semantic embeddings)?
For MVP dedup it's good enough, free, and explainable. The
"Senate passes major spending bill today" vs "Senate OKs major
spending bill today" case has Jaccard 5/7 ≈ 0.71 — well above the 0.6
threshold. Embeddings would catch paraphrases with no shared tokens
("Senators approve budget plan" vs "Upper chamber passes spending
measure") but they cost latency + an embedding API call per item,
which is overkill for the MVP.

### Bias + reliability

Each source has two independent scores:

- **Reliability** (0-100) — editorial standards. Reuters=88, BBC=82,
  NYT=85, Guardian=80, Breitbart=45, Fox News=55. Used for source
  badges (green >70, amber 50-70, red <50) and as the tie-breaker in
  dedup (the highest-reliability source's headline wins the cluster).
- **Bias** (left / center / right / null) — political lean, only
  shown on political items. Tech feeds (Hacker News, Ars Technica, The
  Verge, Wired) are not politically rated and return null.

The two are intentionally separate — a source can be reliable and
biased (e.g. Fox News: reliability 55, bias right; Breitbart:
reliability 45, bias right). The reader sees both and decides.

## What I'd do differently

- **Real ML clickbait classifier** — fine-tune a small BERT-based
  classifier on the Clickbait Challenge 2017 corpus. The hand-tuned
  heuristics get the loud cases right but miss subtle clickbait
  ("This one weird trick", "Why X is actually Y"). A trained model
  would also generalize to new clickbait patterns without code changes.
- **Real personalization** — track per-user topic affinity and bias
  preferences (NextAuth.js is already in the stack). Weight the feed
  ranking accordingly. Let the user opt in to "show me stories I
  disagree with" mode to avoid filter bubbles.
- **Real audio brief via TTS** — generate a 2-3 minute daily audio
  news brief over the day's top fact-grounded headlines per topic,
  using the z-ai-web-dev-sdk TTS endpoint. Pushed to the user as a
  short MP3 / podcast-style feed.
- **Real push notifications** — web-push API for "breaking factual
  news" alerts when a high-reliability source publishes a story
  clustered across >=3 other high-reliability sources. The cluster
  signal is what makes the alert trustworthy — a single source's
  "BREAKING" is not.
- **Continuous bias / reliability scoring** — wire the bias and
  reliability tables to a periodic fact-check feed (NewsGuard API,
  Ad Fontes) instead of hardcoding them. The hardcoded values are
  correct as of writing but they age.
- **Embedding-based dedup** — once the corpus gets large enough
  (>10k items/day), embeddings + a vector DB would catch paraphrase
  dedup that Jaccard misses. For the MVP's 15 feeds, Jaccard is the
  right call.
- **Streaming aggregation progress** — the `POST /api/aggregate`
  route is a single POST that processes all 15 feeds. A real version
  would stream progress per feed (15 SSE events, one per feed
  completed) so the UI can show a real progress bar instead of a
  spinner.

## Resume bullet

Built a No-Clickbait AI news aggregator (Next.js 16, TypeScript, Prisma
+ SQLite) that scores headlines with a 9-heuristic clickbait scorer,
LLM-rewrites high-score headlines into factual neutral versions, and
clusters near-identical stories across 15 RSS feeds via Jaccard
similarity (with union-find for transitivity) surfacing the highest-
reliability source's headline as the canonical one. Shipped ~120
unit tests covering every pure-function heuristic + the LLM-rewrite
fallback path; UI shows per-source reliability badges, clickbait
bands, AI rewrites, topic + bias tags, and per-source breakdowns.

## Push instructions

```bash
gh repo create ai-news-aggregator --public --source=. --remote=origin --push
```

## License

MIT — see `LICENSE`.
