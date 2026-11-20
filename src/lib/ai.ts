/**
 * Headline-rewrite LLM client. Mirrors the `ChatProvider` pattern from the
 * parent project's `ai.ts` so the rewrite pipeline is pluggable: tests can
 * inject a deterministic `MockProvider` via `__setChatProviderForTest`,
 * and prod uses `ZaiProvider` (z-ai-web-dev-sdk) to call the LLM.
 *
 * `rewriteHeadline(headline)` is the only public entrypoint the
 * aggregation route calls. It builds the prompt via
 * `buildRewritePrompt` (from `headline-rewriter.ts`), calls the provider,
 * and falls back to `fallbackRewrite` if the provider throws or returns
 * an empty string.
 */

import { buildRewritePrompt, fallbackRewrite } from "./headline-rewriter";

export interface ChatProvider {
  /** Returns the model's full completion as a single string. */
  complete(prompt: string): Promise<string>;
}

let cachedProvider: ChatProvider | null = null;

class ZaiProvider implements ChatProvider {
  async complete(prompt: string): Promise<string> {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const messages = [
      { role: "system" as const, content: "You are a senior headline editor for a fact-grounded news aggregator." },
      { role: "user" as const, content: prompt },
    ];
    const completion = await zai.chat.completions.create({
      messages,
      stream: false,
      thinking: { type: "disabled" },
    });
    const content = (completion as any)?.choices?.[0]?.message?.content ?? "";
    return typeof content === "string" ? content : String(content ?? "");
  }
}

class MockProvider implements ChatProvider {
  async complete(prompt: string): Promise<string> {
    // Deterministic mock used by tests and offline dev.
    const headlineMatch = prompt.match(/Original headline:\n(.*)$/s);
    const headline = (headlineMatch?.[1] ?? "").trim();
    return `[MOCK REWRITE] ${headline}`;
  }
}

export function getChatProvider(): ChatProvider {
  if (cachedProvider) return cachedProvider;
  if (process.env.PKC_DISABLE_LLM === "1") {
    cachedProvider = new MockProvider();
    return cachedProvider;
  }
  try {
    cachedProvider = new ZaiProvider();
  } catch (e) {
    console.warn(
      "[ai] ZaiProvider unavailable, using MockProvider:",
      (e as Error).message,
    );
    cachedProvider = new MockProvider();
  }
  return cachedProvider;
}

/** Test-only — inject a mock provider or reset to null. */
export function __setChatProviderForTest(p: ChatProvider | null) {
  cachedProvider = p;
}

/**
 * Rewrite a clickbait headline into a factual neutral version.
 * Returns `{ rewritten, used }` where `used` is "llm" if the provider
 * returned a non-empty string, or "fallback" if we fell back to the
 * pure-function `fallbackRewrite`.
 */
export async function rewriteHeadline(headline: string): Promise<{
  rewritten: string;
  used: "llm" | "fallback";
}> {
  if (!headline) return { rewritten: "", used: "fallback" };
  const fallback = fallbackRewrite(headline);
  try {
    const provider = getChatProvider();
    const prompt = buildRewritePrompt(headline);
    const result = await provider.complete(prompt);
    const cleaned = (result ?? "").trim();
    if (!cleaned) {
      return { rewritten: fallback || headline, used: "fallback" };
    }
    return { rewritten: cleaned, used: "llm" };
  } catch (e) {
    console.warn(
      "[ai] rewriteHeadline failed, using fallback:",
      (e as Error).message,
    );
    return { rewritten: fallback || headline, used: "fallback" };
  }
}
