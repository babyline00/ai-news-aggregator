import { test, expect, describe } from "bun:test";
import { categorizeNewsItem, type Topic } from "../topic-classifier";

function item(title: string, description?: string) {
  return { title, description: description ?? null };
}

describe("categorizeNewsItem — canonical spec cases", () => {
  test("'Apple announces new iPhone' → Tech", () => {
    expect(categorizeNewsItem(item("Apple announces new iPhone"))).toBe("Tech");
  });
  test("'Senate passes bill' → Politics", () => {
    expect(categorizeNewsItem(item("Senate passes bill"))).toBe("Politics");
  });
  test("'Lakers win' → Sports", () => {
    expect(categorizeNewsItem(item("Lakers win"))).toBe("Sports");
  });
  test("unknown → General", () => {
    expect(categorizeNewsItem(item("Random stuff happens"))).toBe("General");
  });
});

describe("categorizeNewsItem — Tech", () => {
  test("Apple → Tech", () => {
    expect(categorizeNewsItem(item("Apple unveils new MacBook Pro"))).toBe("Tech");
  });
  test("AI + OpenAI keywords → Tech", () => {
    expect(categorizeNewsItem(item("OpenAI releases new GPT model"))).toBe("Tech");
  });
  test("Hacker News-style: 'Show HN: a new startup' → Tech", () => {
    expect(categorizeNewsItem(item("Show HN: a new startup built with cloud"))).toBe("Tech");
  });
});

describe("categorizeNewsItem — Politics", () => {
  test("Election + president → Politics", () => {
    expect(categorizeNewsItem(item("President signs election reform bill"))).toBe("Politics");
  });
  test("Congress + lawmakers → Politics", () => {
    expect(categorizeNewsItem(item("Congress lawmakers debate new legislation"))).toBe("Politics");
  });
});

describe("categorizeNewsItem — Business", () => {
  test("Fed + rates + economy → Business", () => {
    expect(categorizeNewsItem(item("Fed holds rates steady amid economic uncertainty"))).toBe("Business");
  });
  test("Stock market earnings → Business", () => {
    expect(categorizeNewsItem(item("Stock market rises on strong earnings report"))).toBe("Business");
  });
});

describe("categorizeNewsItem — Science", () => {
  test("Scientists + species → Science", () => {
    expect(categorizeNewsItem(item("Scientists discover new species in Amazon"))).toBe("Science");
  });
  test("NASA + Mars → Science", () => {
    expect(categorizeNewsItem(item("NASA announces Mars rover discovery"))).toBe("Science");
  });
});

describe("categorizeNewsItem — Health", () => {
  test("Vaccine + FDA → Health", () => {
    expect(categorizeNewsItem(item("FDA approves new vaccine for outbreak"))).toBe("Health");
  });
  test("Cancer + hospital → Health", () => {
    expect(categorizeNewsItem(item("Hospital reports breakthrough in cancer treatment"))).toBe("Health");
  });
});

describe("categorizeNewsItem — Entertainment", () => {
  test("Netflix + movie → Entertainment", () => {
    expect(categorizeNewsItem(item("Netflix announces new movie deal"))).toBe("Entertainment");
  });
  test("Oscars + actor → Entertainment", () => {
    expect(categorizeNewsItem(item("Oscars 2026: best actor nominations announced"))).toBe("Entertainment");
  });
});

describe("categorizeNewsItem — uses description as fallback", () => {
  test("Tech keyword only in description → Tech", () => {
    expect(
      categorizeNewsItem(item("Major announcement", "the new iPhone from Apple")),
    ).toBe("Tech");
  });
  test("empty title with description → categorizes from description", () => {
    expect(
      categorizeNewsItem(item("", "Senate passes new bill on infrastructure")),
    ).toBe("Politics");
  });
});

describe("categorizeNewsItem — edge cases", () => {
  test("empty item → General", () => {
    expect(categorizeNewsItem(item("", "")).toString()).toBe("General");
  });
  test("returns a valid Topic", () => {
    const validTopics = [
      "Tech", "Politics", "Business", "Science", "Health",
      "Sports", "Entertainment", "General",
    ];
    const t = categorizeNewsItem(item("anything goes here")) as Topic;
    expect(validTopics).toContain(t);
  });
});
