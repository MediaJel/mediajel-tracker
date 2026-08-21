import logger from "@mediajel/tracker-core/logger";
import { QueryStringContext } from "@mediajel/tracker-core/types";
import {
  TrackerWidget,
  TrackerWidgetDisableOptions,
  TrackerWidgetPrefill,
  TrackerWidgetProvider,
} from "@mediajel/tracker-widget/api";
import { WIDGET_ACTIVE_KEY } from "@mediajel/tracker-widget/session/keys";
import styles from "@mediajel/tracker-widget/styles";
// Every third-party import goes through the pre-bundled vendor module — see the "//vendor"
// note in package.json for why Parcel cannot consume these packages from node_modules.
import {
  createAnthropic,
  createGateway,
  createGoogle,
  createOpenAI,
  generateText,
  h,
  LanguageModel,
  Output,
  render,
  z,
} from "@mediajel/tracker-widget/vendor";

/**
 * Lazy entry point. Everything third-party the widget needs is reachable only from this
 * module, so Parcel emits it as a single `widget.<hash>.js` chunk that the tag downloads
 * on demand and a visitor who never enables the widget never pays for.
 *
 * Import-time side effects are forbidden here: the chunk may be fetched before the
 * operator has agreed to anything, so all work happens inside `enable()`.
 */

/** Id of the host element the widget mounts its shadow root on. */
export const WIDGET_HOST_ID = "mj-widget-host";

/**
 * The four provider factories, kept in one map so the spike proves every SDK entry point
 * survives bundling (an unreferenced import would be free to disappear).
 */
const providerFactories: Record<TrackerWidgetProvider, (...args: any[]) => unknown> = {
  gateway: createGateway,
  openai: createOpenAI,
  anthropic: createAnthropic,
  google: createGoogle,
};

/** Stand-in for the real generation schema; only its zod machinery matters to the spike. */
const spikeSchema = z.object({ ok: z.boolean() });

/**
 * A model that answers without a network call, so the spike needs no API key.
 *
 * Hand-written rather than `MockLanguageModelV4` from `ai/test`: that subpath is reachable only
 * through the `exports` field, and `ai/dist/test/index.js` in turn imports
 * `@ai-sdk/provider-utils/test` — an import originating inside node_modules, where a workspace
 * `alias` cannot reach. Enabling Parcel's `packageExports` is the documented alternative, but it
 * has to live in the package.json at Parcel's project root, which this repo does not pin (see the
 * note on `alias` in package.json). Supplying the model object directly is also the shape the
 * real widget uses for its E2E hook, so nothing is lost.
 */
const spikeModel: LanguageModel = {
  specificationVersion: "v4",
  provider: "mock",
  modelId: "spike",
  supportedUrls: {},
  doGenerate: async () => ({
    content: [{ type: "text", text: '{"ok":true}' }],
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    },
    warnings: [],
  }),
  doStream: () => {
    throw new Error("The spike model only supports generateText.");
  },
};

const mountHost = (): HTMLElement => {
  const host = document.createElement("div");
  host.id = WIDGET_HOST_ID;

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  shadow.appendChild(style);

  const mount = document.createElement("div");
  shadow.appendChild(mount);
  document.body.appendChild(host);

  render(h("div", { class: "mj-widget-spike" }, "spike"), mount);
  return host;
};

/**
 * Builds the widget for this page. `context` is the tag's parsed query string, handed over
 * by the stub because it is derived from `document.currentScript` and can only be read
 * while the tag's own script element is executing.
 */
export const createWidget = (context: QueryStringContext): TrackerWidget => {
  let host: HTMLElement | null = null;

  const enable = async (prefill?: TrackerWidgetPrefill): Promise<void> => {
    if (!host) host = mountHost();

    // Marks this tab as running the widget so the stub re-imports the chunk after a
    // navigation. Set on enable, cleared on disable — never on mere chunk load.
    sessionStorage.setItem(WIDGET_ACTIVE_KEY, "1");

    // Mirrored onto the host element so the E2E spec can assert them. A mis-wired lazy chunk
    // fails exactly here — the imports resolve to `undefined` rather than throwing at load —
    // so the spike checks the SDK entry points are live functions and that a real generateText
    // round trip (zod schema included) produced a parsed object.
    const provider = prefill?.provider ?? "gateway";
    host.dataset.providers = Object.keys(providerFactories)
      .filter((name) => typeof providerFactories[name as TrackerWidgetProvider] === "function")
      .join(",");

    const result = await generateText({
      model: spikeModel,
      prompt: "spike",
      output: Output.object({ schema: spikeSchema }),
    });
    host.dataset.output = JSON.stringify(result.output);

    logger.debug("Integrations Assistant spike", { appId: context.appId, provider, output: result.output });
  };

  return {
    enable,
    resume: (): Promise<void> => enable(),
    disable: async (_opts?: TrackerWidgetDisableOptions): Promise<void> => {
      host?.remove();
      host = null;
      sessionStorage.removeItem(WIDGET_ACTIVE_KEY);
    },
  };
};

export default createWidget;
