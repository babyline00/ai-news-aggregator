import { test, expect, describe } from "bun:test";
import {
  getChatProvider,
  rewriteHeadline,
  __setChatProviderForTest,
  type ChatProvider,
} from "../ai";

class MockChat implements ChatProvider {
  calls: string[] = [];
  async complete(prompt: string): Promise<string> {
    this.calls.push(prompt);
    // Deterministic rewrite: strip the "Original headline:" prefix and
    // return a [MOCK] prefix.
    const m = prompt.match(/Original headline:\n([\s\S]*)$/);
    const headline = (m?.[1] ?? "").trim();
    return `[MOCK] ${headline.toLowerCase()}`;
  }
}

describe("ChatProvider — MockProvider returns deterministic rewrite", () => {
  test("MockProvider returns the same output for the same input", async () => {
    const mock = new MockChat();
    __setChatProviderForTest(mock);
    try {
      const a = await mock.complete("Original headline:\nSome Headline");
      const b = await mock.complete("Original headline:\nSome Headline");
      expect(a).toBe(b);
      expect(a).toBe("[MOCK] some headline");
    } finally {
      __setChatProviderForTest(null);
    }
  });
});

describe("rewriteHeadline — uses injected ChatProvider", () => {
  test("returns the LLM rewrite when provider is available", async () => {
    const mock = new MockChat();
    __setChatProviderForTest(mock);
    try {
      const { rewritten, used } = await rewriteHeadline("Some Headline");
      expect(used).toBe("llm");
      expect(rewritten).toContain("some headline");
      // The provider was called with a prompt containing the headline.
      expect(mock.calls.length).toBe(1);
      expect(mock.calls[0]).toContain("Some Headline");
    } finally {
      __setChatProviderForTest(null);
    }
  });

  test("falls back when provider returns empty string", async () => {
    __setChatProviderForTest({
      async complete() {
        return "";
      },
    });
    try {
      const { rewritten, used } = await rewriteHeadline(
        "Senate passes bill 51-49 after 12-hour debate",
      );
      expect(used).toBe("fallback");
      expect(rewritten).toContain("Senate passes bill");
    } finally {
      __setChatProviderForTest(null);
    }
  });

  test("falls back when provider throws", async () => {
    __setChatProviderForTest({
      async complete() {
        throw new Error("LLM unavailable");
      },
    });
    try {
      const { rewritten, used } = await rewriteHeadline(
        "Senate passes bill 51-49 after 12-hour debate",
      );
      expect(used).toBe("fallback");
      expect(rewritten).toContain("Senate passes bill");
    } finally {
      __setChatProviderForTest(null);
    }
  });

  test("empty headline → empty rewrite", async () => {
    const { rewritten, used } = await rewriteHeadline("");
    expect(rewritten).toBe("");
    expect(used).toBe("fallback");
  });
});

describe("getChatProvider — default provider", () => {
  test("returns a provider instance", () => {
    __setChatProviderForTest(null);
    const p = getChatProvider();
    expect(p).toBeDefined();
    expect(typeof p.complete).toBe("function");
  });
});
