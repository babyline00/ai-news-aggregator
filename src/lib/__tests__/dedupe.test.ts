import { test, expect, describe } from "bun:test";
import { clusterItems, dedupeNewsItems, type DedupeItem } from "../dedupe";

function item(id: string, title: string, sourceName = "Reuters"): DedupeItem {
  return { id, title, sourceName };
}

describe("clusterItems — identical titles", () => {
  test("two identical titles cluster together", () => {
    const clusters = clusterItems([
      item("a", "Senate passes major spending bill today"),
      item("b", "Senate passes major spending bill today"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });
  test("three identical titles cluster together", () => {
    const clusters = clusterItems([
      item("a", "Apple announces new iPhone today"),
      item("b", "Apple announces new iPhone today"),
      item("c", "Apple announces new iPhone today"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
  });
});

describe("clusterItems — near-identical titles", () => {
  test("'Senate passes X' vs 'Senate OKs X' cluster when X is long enough", () => {
    const clusters = clusterItems([
      item("a", "Senate passes major spending bill today"),
      item("b", "Senate OKs major spending bill today"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });
  test("two near-identical + one different → one cluster of 2 + singleton", () => {
    const clusters = clusterItems([
      item("a", "Senate passes major spending bill today"),
      item("b", "Senate OKs major spending bill today"),
      item("c", "Apple announces new iPhone features"),
    ]);
    expect(clusters).toHaveLength(2);
    const sizes = clusters.map((c) => c.length).sort();
    expect(sizes).toEqual([1, 2]);
  });
});

describe("clusterItems — very different titles stay separate", () => {
  test("two unrelated titles → two singletons", () => {
    const clusters = clusterItems([
      item("a", "Apple announces new iPhone"),
      item("b", "Lakers win championship"),
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toHaveLength(1);
    expect(clusters[1]).toHaveLength(1);
  });
  test("empty input → empty clusters", () => {
    expect(clusterItems([])).toEqual([]);
  });
  test("single item → one singleton cluster", () => {
    const clusters = clusterItems([item("a", "Just one headline")]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(1);
  });
});

describe("dedupeNewsItems — winner selection", () => {
  test("highest-reliability source wins the cluster", () => {
    const clusters = dedupeNewsItems([
      item("a", "Senate passes major spending bill today", "Breitbart"),
      item("b", "Senate passes major spending bill today", "Reuters"),
      item("c", "Senate passes major spending bill today", "Fox News"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].winner.sourceName).toBe("Reuters");
    expect(clusters[0].winner.id).toBe("b");
  });
  test("tie-break: first item in input order wins", () => {
    const clusters = dedupeNewsItems([
      item("a", "Apple announces new iPhone today", "Wired"),
      item("b", "Apple announces new iPhone today", "Ars Technica"),
    ]);
    expect(clusters).toHaveLength(1);
    // Both are tech feeds with reliability 76 / 84 — Ars Technica is higher.
    expect(clusters[0].winner.sourceName).toBe("Ars Technica");
  });
  test("clusterIds are unique and stable across calls", () => {
    const input = [
      item("a", "Senate passes major spending bill today", "Reuters"),
      item("b", "Senate OKs major spending bill today", "BBC News"),
      item("c", "Apple announces new iPhone features", "Wired"),
    ];
    const c1 = dedupeNewsItems(input);
    const c2 = dedupeNewsItems(input);
    expect(c1.map((c) => c.clusterId)).toEqual(c2.map((c) => c.clusterId));
  });
  test("returns NewsCluster shape with items + winner", () => {
    const clusters = dedupeNewsItems([
      item("a", "Senate passes major spending bill today", "Reuters"),
      item("b", "Senate passes major spending bill today", "BBC News"),
    ]);
    expect(clusters[0]).toHaveProperty("clusterId");
    expect(clusters[0]).toHaveProperty("items");
    expect(clusters[0]).toHaveProperty("winner");
    expect(Array.isArray(clusters[0].items)).toBe(true);
  });
});
