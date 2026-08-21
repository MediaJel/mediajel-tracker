import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";
import { WidgetSettings } from "@mediajel/tracker-widget/session/settings";
import {
  LanguageModel,
  createAnthropic,
  createGateway,
  createGoogle,
  createOpenAI,
} from "@mediajel/tracker-widget/vendor";

/**
 * Settings → an AI SDK model, browser-direct. Every provider gets the PRISTINE fetch captured
 * at chunk load: the recorder must never see the widget's own traffic (an API key inside a
 * recorded request body would end up inside the next prompt), and a page that wrapped fetch
 * must not see the prompt either.
 *
 * `window.__MJ_WIDGET_MOCK_MODEL__` is the E2E hook: a hand-built LanguageModel the Cypress
 * specs install so the whole flow runs with zero network. A dev tool accepting a dev hook.
 */

declare global {
  interface Window {
    __MJ_WIDGET_MOCK_MODEL__?: unknown;
  }
}

/** What the E2E specs install: one canned JSON output, a sequence (repair rounds), or a failure. */
export interface MockModelMarker {
  json?: unknown;
  /** When set, every call rejects with this message — the failure path, end to end. */
  error?: string;
}

const EMPTY_USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: undefined, reasoning: undefined },
};

/**
 * A hand-rolled LanguageModel (spec v4) that answers with canned JSON. Kept here rather than
 * importing `ai/test` so the browser chunk carries no test machinery; the shape is asserted
 * against the real `generateText` in the unit suite, which would break loudly on a spec bump.
 */
export const mockModelFromJson = (marker: MockModelMarker): LanguageModel => {
  let calls = 0;
  const sequence = Array.isArray(marker.json) ? (marker.json as unknown[]) : [marker.json];
  return {
    specificationVersion: "v4",
    provider: "mock",
    modelId: "mock",
    supportedUrls: {},
    doGenerate: async () => {
      if (marker.error) throw new Error(marker.error);
      const json = sequence[Math.min(calls, sequence.length - 1)];
      calls += 1;
      return {
        content: [{ type: "text", text: JSON.stringify(json) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: EMPTY_USAGE,
        warnings: [],
      };
    },
    doStream: async () => {
      throw new Error("the mock model does not stream");
    },
  } as unknown as LanguageModel;
};

export const createModel = (settings: WidgetSettings, runtime: WidgetRuntime): LanguageModel => {
  const mock = window.__MJ_WIDGET_MOCK_MODEL__;
  if (
    mock &&
    typeof mock === "object" &&
    ("json" in (mock as Record<string, unknown>) || "error" in (mock as Record<string, unknown>))
  ) {
    return mockModelFromJson(mock as MockModelMarker);
  }
  if (mock) return mock as LanguageModel;

  // Trimmed: a pasted key with a trailing newline is a 401 the operator cannot see.
  const common = {
    apiKey: settings.apiKey.trim(),
    ...(settings.baseURL?.trim() ? { baseURL: settings.baseURL.trim() } : {}),
    fetch: runtime.pristineFetch,
  };

  switch (settings.provider) {
    case "openai":
      // Chat Completions rather than the Responses API: every OpenAI key type can reach it.
      return createOpenAI(common).chat(settings.model.trim() || "gpt-5.5");
    case "anthropic":
      return createAnthropic({
        ...common,
        // Anthropic refuses browser calls without this named opt-in. The operator's own key,
        // the operator's own browser — exactly the case the header exists for.
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      })(settings.model.trim() || "claude-sonnet-5");
    case "google":
      return createGoogle(common)(settings.model.trim() || "gemini-3.5-flash");
    case "gateway":
    default:
      return createGateway(common)(settings.model.trim() || "anthropic/claude-sonnet-5");
  }
};

/**
 * What a pasted key looks like it belongs to — the cheapest way to catch "OpenAI key, Gateway
 * selected", which the provider reports only as a 401 the browser cannot even read.
 */
export const keyLooksLike = (key: string): TrackerWidgetProviderGuess | null => {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (/^sk-ant-/.test(trimmed)) return "anthropic";
  if (/^sk-/.test(trimmed)) return "openai";
  if (/^AIza/.test(trimmed)) return "google";
  if (/^vck_/.test(trimmed)) return "gateway";
  return null;
};
export type TrackerWidgetProviderGuess = "openai" | "anthropic" | "google" | "gateway";
