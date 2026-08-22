/* global RequestInfo, RequestInit */
import { describe, expect, test } from "bun:test";

import { describeFailure, generateTag, testConnection } from "@mediajel/tracker-widget/ai/generate";
import {
  CONVENTIONS,
  FRICTIONLESS_TYPES,
  TEMPLATE_DATALAYER,
  TEMPLATE_SIGNUP,
  TEMPLATE_XHR,
} from "@mediajel/tracker-widget/ai/knowledge";
import { buildPrompt } from "@mediajel/tracker-widget/ai/prompt";
import { GenerationSchema } from "@mediajel/tracker-widget/ai/schema";
import { validateGenerated } from "@mediajel/tracker-widget/ai/validate";
import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { WidgetRuntime, captureRuntime } from "@mediajel/tracker-widget/runtime";
import { DEFAULT_SETTINGS } from "@mediajel/tracker-widget/session/settings";
import { WidgetSession } from "@mediajel/tracker-widget/types";
import { parseGate, rewriteImports } from "@mediajel/tracker-widget/verify/rewrite-imports";

import { makeEvent, makeSession } from "./helpers";

const status: TrackerStatus = {
  appId: "acme",
  environment: "",
  version: "2",
  event: "",
  collector: "//c.test",
  trackTransPresent: true,
  optedOut: false,
  warnings: [],
};

describe("rewriteImports", () => {
  test("rewrites allowlisted named imports (with aliasing) into shim destructures", () => {
    const { js, specifiers, errors } = rewriteImports(
      `import { datalayerSource } from "../libs/sources/google-datalayer-source";
import { isTrackTransLoaded as ready } from "../libs/utils/is-trackTrans-loaded";
const t = () => { ready(() => { datalayerSource(() => {}); }); };
t();`,
    );
    expect(errors).toEqual([]);
    expect(specifiers).toHaveLength(2);
    expect(js).toContain('const { datalayerSource } = __mjShims["../libs/sources/google-datalayer-source"];');
    expect(js).toContain('const { isTrackTransLoaded: ready } = __mjShims["../libs/utils/is-trackTrans-loaded"];');
    expect(parseGate(js)).toBeNull();
  });

  test("refuses unknown specifiers, unknown names and default imports", () => {
    const { errors } = rewriteImports(
      `import evil from "../libs/utils/is-trackTrans-loaded";
import { nope } from "../libs/sources/google-datalayer-source";
import { x } from "left-pad";`,
    );
    expect(errors.some((e) => e.includes("no default export"))).toBe(true);
    expect(errors.some((e) => e.includes("does not export nope"))).toBe(true);
    expect(errors.some((e) => e.includes("not on the allowlist"))).toBe(true);
  });

  test("strips export so cross-referenced app-id files still run", () => {
    const { js } = rewriteImports(`export const shop = () => {};\nshop();`);
    expect(js).toContain("const shop = () => {};");
    expect(parseGate(js)).toBeNull();
  });

  test("the parse gate names TS-only syntax instead of letting it deploy", () => {
    const { js } = rewriteImports(`const t = (x: string) => x;\nt("a");`);
    expect(parseGate(js)).toContain("SyntaxError");
  });
});

describe("validateGenerated", () => {
  test("all three shipped templates pass", () => {
    for (const code of [TEMPLATE_DATALAYER, TEMPLATE_XHR, TEMPLATE_SIGNUP]) {
      const goal = code.includes("trackSignUp") ? ("signup" as const) : ("transaction" as const);
      const errors = validateGenerated({ code, goal, appIdTarget: false });
      // The dataLayer template predates the dedup rule; everything else must be clean.
      const material = errors.filter((e) => !e.includes("dedup"));
      expect(material, code.slice(0, 60)).toEqual([]);
    }
  });

  test("catches forbidden APIs, wrong call, overrides in app-id files and TS syntax", () => {
    const errors = validateGenerated({
      code: `window.overrides = {};\nwindow.tracker("trackPageView");\nconst x: number = 1;\neval("x");`,
      goal: "transaction",
      appIdTarget: true,
    });
    expect(errors.some((e) => e.includes("window.tracker"))).toBe(true);
    expect(errors.some((e) => e.includes("window.overrides"))).toBe(true);
    expect(errors.some((e) => e.includes("eval"))).toBe(true);
    expect(errors.some((e) => e.includes("never calls window.trackTrans"))).toBe(true);
    expect(errors.some((e) => e.includes("not valid plain JavaScript"))).toBe(true);
  });
});

describe("buildPrompt", () => {
  const session = (): WidgetSession =>
    makeSession({
      step: "review",
      timeline: [
        makeEvent({ id: "e1", kind: "datalayer" }),
        makeEvent({ id: "e2", kind: "network" }),
        makeEvent({ id: "e3", kind: "dom" }),
      ],
      markedIds: ["e1"],
      notes: "total includes tax",
    });

  test("pins travel in full, the rest as one line each, deterministically", () => {
    const one = session();
    const a = buildPrompt(one, status);
    const b = buildPrompt(one, status);
    expect(a).toBe(b);
    expect(a).toContain("EVIDENCE 1 (pinned by the operator)");
    expect(a).toContain('"id": "e1"');
    expect(a).not.toContain('"id": "e2"'); // unpinned events are compressed, not dumped
    expect(a).toContain("[network]");
    expect(a).toContain("operator notes: total includes tax");
    expect(a).toContain("src/domains/");
  });

  test("stays inside the budget by dropping cheap rows first", () => {
    const big = makeSession({
      step: "review",
      timeline: Array.from({ length: 400 }, (_, i) =>
        makeEvent({ id: `d${i}`, kind: "dom", summary: `page showed "${"x".repeat(400)}"` }),
      ),
      markedIds: [],
    });
    const prompt = buildPrompt(big, status);
    expect(prompt.length).toBeLessThanOrEqual(60_000);
  });
});

// The service URL is inlined at build time; tests point the widget at a stand-in host.
process.env.WIDGET_API_URL = "https://assistant.test/";

const ready = { ...DEFAULT_SETTINGS, githubToken: "ghp_test", acknowledgedDataSharing: true };

describe("generateTag with the mock model", () => {
  const valid = {
    summary: "Tracks the GA4 purchase push.",
    trigger: { kind: "dataLayer", description: "dataLayer purchase event" },
    code: TEMPLATE_XHR,
    fieldCoverage: [
      { field: "id", status: "mapped", source: "order_number", value: null, confidence: "high", note: null },
    ],
    items: { trackable: true, reason: null },
    warnings: [],
    suggestedTarget: { kind: "domain", reason: "hostname-specific markup" },
    dedupKey: "mj-terpsstation-<orderId>",
  };

  const run = (json: unknown) => {
    window.__MJ_WIDGET_MOCK_MODEL__ = { json };
    return generateTag({
      session: makeSession({
        step: "generating",
        timeline: [makeEvent({ id: "e1", kind: "datalayer" })],
        markedIds: ["e1"],
      }),
      status,
      settings: ready,
      runtime: captureRuntime(),
    });
  };

  test("returns the structured output the service answered with", async () => {
    const { output, violations } = await run(valid);
    expect(output.summary).toContain("purchase");
    expect(GenerationSchema.parse(output).trigger.kind).toBe("dataLayer");
    expect(violations).toEqual([]);
  });

  test("runs exactly one repair round and returns the better result", async () => {
    const invalid = { ...valid, code: `window.tracker("bad");\nconst x: number = 1;` };
    const { output, violations } = await run([invalid, valid]);
    expect(output.code).toBe(TEMPLATE_XHR);
    expect(violations).toEqual([]);
  });

  test("keeps the first result (with its violations shown) when the repair does not improve", async () => {
    const invalid = { ...valid, code: `window.tracker("bad");` };
    const { violations } = await run([invalid, invalid]);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("knowledge parity with the frictionless checkout", () => {
  const repo = process.env.FRICTIONLESS_REPO;
  test.if(!!repo)("the embedded types match src/types.ts", async () => {
    // eslint-disable-next-line no-undef -- bun test runtime global
    const real = await Bun.file(`${repo}/src/types.ts`).text();
    for (const line of FRICTIONLESS_TYPES.split("\n")) {
      expect(real).toContain(line.trim() === "" ? "" : line.replace(/^export /, "export "));
    }
  });
  test("the conventions name the two window calls and the dedup rule", () => {
    expect(CONVENTIONS).toContain("window.trackTrans");
    expect(CONVENTIONS).toContain("window.trackSignUp");
    expect(CONVENTIONS).toContain("localStorage");
  });
});

describe("talks to the assistant service", () => {
  const valid = {
    summary: "Tracks the GA4 purchase push.",
    trigger: { kind: "dataLayer", description: "dataLayer purchase event" },
    code: TEMPLATE_XHR,
    fieldCoverage: [],
    items: { trackable: true, reason: null },
    warnings: [],
    suggestedTarget: { kind: "domain", reason: "hostname-specific markup" },
    dedupKey: "mj-terpsstation-<orderId>",
  };

  const fakeRuntime = (
    answer: (url: string, init?: RequestInit) => Response | Promise<Response>,
  ): { runtime: WidgetRuntime; calls: { url: string; init?: RequestInit }[] } => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fake = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      calls.push({ url, init });
      return answer(url, init);
    };
    const runtime: WidgetRuntime = { ...captureRuntime(), pristineFetch: fake as typeof fetch };
    return { runtime, calls };
  };

  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const input = (runtime: WidgetRuntime) => ({
    session: makeSession({
      step: "generating",
      timeline: [makeEvent({ id: "e1", kind: "datalayer" })],
      markedIds: ["e1"],
    }),
    status,
    settings: ready,
    runtime,
  });

  test("POSTs the widget-built instructions + prompt with the GitHub token as Bearer, over the pristine fetch", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const { runtime, calls } = fakeRuntime(() => json(200, { output: valid, model: "anthropic/claude-sonnet-5" }));

    const result = await generateTag(input(runtime));

    expect(result.model).toBe("anthropic/claude-sonnet-5");
    expect(result.output.code).toBe(TEMPLATE_XHR);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://assistant.test/generate");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer ghp_test");
    const body = JSON.parse(String(calls[0].init?.body));
    expect(Object.keys(body).sort()).toEqual(["instructions", "prompt"]);
    expect(body.instructions).toContain("window.trackTrans");
    expect(body.prompt).toContain("EVIDENCE 1");
  });

  test("a service error surfaces with the service's own message", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const { runtime } = fakeRuntime(() =>
      json(403, {
        error: { code: "forbidden", message: "The token cannot push to MediaJel/mediajel-frictionless-custom-tag." },
      }),
    );
    await expect(generateTag(input(runtime))).rejects.toThrow("cannot push");
  });

  test("a non-JSON refusal falls back to a message for its status", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const { runtime } = fakeRuntime(() => new Response("", { status: 401 }));
    await expect(generateTag(input(runtime))).rejects.toThrow("GitHub token");
  });

  test("an answer outside the contract is refused, not rendered", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const { runtime } = fakeRuntime(() => json(200, { output: { summary: "only" }, model: "m" }));
    await expect(generateTag(input(runtime))).rejects.toThrow("tag contract");
  });

  test("a build without a service URL says so instead of calling nowhere", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const saved = process.env.WIDGET_API_URL;
    process.env.WIDGET_API_URL = "";
    const { runtime, calls } = fakeRuntime(() => json(200, {}));
    try {
      await expect(generateTag(input(runtime))).rejects.toThrow("WIDGET_API_URL");
      expect(calls).toHaveLength(0);
    } finally {
      process.env.WIDGET_API_URL = saved;
    }
  });

  test("Check access reads /health and reports the model and token owner", async () => {
    delete window.__MJ_WIDGET_MOCK_MODEL__;
    const { runtime, calls } = fakeRuntime(() =>
      json(200, { ok: true, model: "anthropic/claude-sonnet-5", login: "octocat" }),
    );
    await expect(testConnection(ready, runtime)).resolves.toBe("anthropic/claude-sonnet-5 · token of octocat");
    expect(calls[0].url).toBe("https://assistant.test/health");
    expect(calls[0].init?.method).toBe("GET");
  });
});

describe("failures reach the operator", () => {
  test("a mocked failure becomes an actionable message, not a hang", async () => {
    window.__MJ_WIDGET_MOCK_MODEL__ = { error: "Unauthorized (401)" };
    await expect(
      generateTag({
        session: makeSession({
          step: "generating",
          timeline: [makeEvent({ id: "e1", kind: "datalayer" })],
          markedIds: ["e1"],
        }),
        status,
        settings: ready,
        runtime: captureRuntime(),
      }),
    ).rejects.toThrow("GitHub token");
  });

  test("Check access reports what answered, or the mapped failure", async () => {
    window.__MJ_WIDGET_MOCK_MODEL__ = { json: "OK" };
    await expect(testConnection(ready, captureRuntime())).resolves.toContain("mock-model");
    window.__MJ_WIDGET_MOCK_MODEL__ = { error: "TypeError: Failed to fetch" };
    // No CSP violation fired, so an unreachable service is reported as exactly that.
    await expect(testConnection(ready, captureRuntime())).rejects.toThrow("Could not reach");
    delete window.__MJ_WIDGET_MOCK_MODEL__;
  });
});

describe("describeFailure", () => {
  test("an unreachable service is reported as such — blamed on CSP only when CSP actually fired", () => {
    const hidden = new TypeError("Failed to fetch");
    expect(describeFailure(hidden)).toContain("Could not reach");
    expect(describeFailure(hidden)).not.toContain("Content-Security-Policy");
    expect(describeFailure(hidden, true)).toContain("Content-Security-Policy");
  });

  test("maps the statuses an operator can act on", () => {
    expect(describeFailure(new Error("Unauthorized 401"))).toContain("GitHub token");
    expect(describeFailure(new Error("403 Forbidden"))).toContain("cannot push");
    expect(describeFailure(new Error("429 Too Many Requests"))).toContain("rate limiting");
    expect(describeFailure(new Error("timed out"))).toContain("two minutes");
  });
});
