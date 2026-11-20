/**
 * Multi-source dedup. Pure functions — no I/O.
 *
 * `clusterItems(items)` clusters items whose tokenized titles have a
 * Jaccard similarity > 0.6 (computed via `tokenize` + `jaccardSets`).
 * Uses a union-find so the clustering is transitive: if A~B and B~C,
 * A/B/C end up in the same cluster even if A and C are below the
 * threshold pairwise. (In practice this rarely matters because the
 * threshold is high enough that transitivity is rare, but it's the
 * correct behavior for a "cluster" abstraction.)
 *
 * `dedupeNewsItems(items)` calls `clusterItems`, then within each cluster
 * picks the headline from the highest-reliability source as the
 * canonical "winner". Returns the cluster list with `clusterId`s the
 * aggregation route writes back to the NewsItem rows.
 */

import { tokenize } from "./tokenizer";
import { jaccardSets } from "./jaccard";
import { getReliability } from "./feeds";

export interface DedupeItem {
  id: string;
  title: string;
  sourceName: string;
  link?: string;
  [key: string]: unknown;
}

export interface NewsCluster<T extends DedupeItem = DedupeItem> {
  clusterId: string;
  items: T[];
  winner: T;
}

export const SIM_THRESHOLD = 0.6;

class UnionFind {
  private parent: Map<string, string> = new Map();
  constructor(ids: string[]) {
    for (const id of ids) this.parent.set(id, id);
  }
  find(x: string): string {
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path compression
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/** Clusters items by Jaccard > SIM_THRESHOLD on tokenized titles. Pure. */
export function clusterItems<T extends DedupeItem>(items: T[]): T[][] {
  if (items.length === 0) return [];
  const tokens = items.map((it) => tokenize(it.title));
  const uf = new UnionFind(items.map((it) => it.id));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = jaccardSets(tokens[i], tokens[j]);
      if (sim > SIM_THRESHOLD) uf.union(items[i].id, items[j].id);
    }
  }
  // Group by root, preserving original order
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const root = uf.find(it.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(it);
  }
  return Array.from(groups.values());
}

/**
 * Clusters items, then picks the headline from the highest-reliability
 * source as the canonical winner (tie-break: first item in input order).
 * Returns clusters with stable `clusterId`s.
 */
export function dedupeNewsItems<T extends DedupeItem>(items: T[]): NewsCluster<T>[] {
  const clusters = clusterItems(items);
  return clusters.map((cluster, idx) => {
    let winner = cluster[0];
    let bestRel = getReliability(winner.sourceName);
    for (const it of cluster) {
      const rel = getReliability(it.sourceName);
      if (rel > bestRel) {
        bestRel = rel;
        winner = it;
      }
    }
    return {
      clusterId: `cluster-${idx + 1}`,
      items: cluster,
      winner,
    };
  });
}
