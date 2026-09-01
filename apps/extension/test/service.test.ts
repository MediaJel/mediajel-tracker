process.env.PLASMO_PUBLIC_WIDGET_API_URL = "https://assistant.test";

import { afterEach, describe, expect, test } from "bun:test";

import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import { WidgetSession, WIDGET_SESSION_VERSION } from "@mediajel/assistant-core/types";

import { ServiceError, checkAccess, deployTag, describeFailure, generateTag, readExistingTag } from "~/service/client";

/**
 * What the extension asks the assistant service, and what it does with the answers.
 *
 * Two things matter here and nothing else does. Every request must carry the signed-in user's
 * ID token, because that is the only credential in the product now. And every failure must come
 * back as a sentence an operator can act on — a raw status code reaching the panel is a bug.
 */

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

const server = (reply: (call: Call) => { status: number; json: unknown }): { calls: Call[] } => {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status, json } = reply(call);
    return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { calls };
};

const token = async (): Promise<string> => "id-token-123";

const STATUS: TrackerStatus = {
  appId: "acme",
  environment: "production",
  version: "2",
  event: "",
  collector: "//collector.test",
  tagPresent: true,
  trackTransPresent: true,
  optedOut: false,
  warnings: [],
};

const SESSION: WidgetSession = {
  v: WIDGET_SESSION_VERSION,
  id: "ses-1",
  goal: "transaction",
  step: "review",
  startedAt: 0,
  pages: [{ id: "pg-1", url: "https://shop.example.com/thanks", title: "Thanks", t: 0 }],
  timeline: [],
  markedIds: [],
};

/** A structured output that satisfies GenerationSchema and the validator. */
const OUTPUT = {
  summary: "Reads the GA4 purchase push.",
  trigger: { kind: "dataLayer", description: "purchase event" },
  code: `import { datalayerSource } from "../libs/sources/google-datalayer-source";

datalayerSource((data) => {
  if (data.event !== "purchase") return;
  if (localStorage.getItem("mj-shop-" + data.ecommerce.transaction_id)) return;
  localStorage.setItem("mj-shop-" + data.ecommerce.transaction_id, "1");
  window.trackTrans({ id: String(data.ecommerce.transaction_id), total: 1, currency: "USD", items: [] });
});
`,
  fieldCoverage: [],
  items: { trackable: true, reason: null },
  warnings: [],
  suggestedTarget: { kind: "domain", reason: "one site" },
  dedupKey: "mj-shop-",
};

describe("every call", () => {
  test("carries the signed-in user's ID token as a Bearer", async () => {
    const { calls } = server(() => ({ status: 200, json: { ok: true, model: "gpt-5.5", user: { username: "dana" } } }));
    await checkAccess(token);

    expect(calls[0].url).toBe("https://assistant.test/health");
    expect(calls[0].headers.authorization).toBe("Bearer id-token-123");
  });

  test("asks for a fresh token per call, so an expired one is never sent twice", async () => {
    let issued = 0;
    const fresh = async (): Promise<string> => `token-${++issued}`;
    const { calls } = server(() => ({ status: 200, json: { exists: false } }));

    await readExistingTag(fresh, "domain", "a.com");
    await readExistingTag(fresh, "domain", "a.com");
    expect(calls.map((call) => call.headers.authorization)).toEqual(["Bearer token-1", "Bearer token-2"]);
  });
});

describe("checkAccess", () => {
  test("reports the model and who the service thinks you are", async () => {
    server(() => ({ status: 200, json: { ok: true, model: "gpt-5.5", user: { username: "dana", email: "d@m.com" } } }));
    expect(await checkAccess(token)).toBe("gpt-5.5 · signed in as dana");
  });

  test("passes the service's own refusal through, rather than inventing one", async () => {
    server(() => ({
      status: 401,
      json: { error: { code: "unauthorized", message: "Your MediaJel session has expired. Sign in again." } },
    }));
    await expect(checkAccess(token)).rejects.toThrow("Your MediaJel session has expired. Sign in again.");
  });
});

describe("readExistingTag", () => {
  test("asks about the exact target, escaped", async () => {
    const { calls } = server(() => ({ status: 200, json: { exists: true, sha: "abc", content: "code" } }));
    const file = await readExistingTag(token, "domain", "shop.example.com");

    expect(calls[0].url).toBe("https://assistant.test/tag?kind=domain&name=shop.example.com");
    expect(file).toEqual({ exists: true, sha: "abc", content: "code" });
  });
});

describe("deployTag", () => {
  test("sends the tag and the sha the operator was shown", async () => {
    const { calls } = server(() => ({
      status: 200,
      json: { commitUrl: "c", fileUrl: "f", path: "src/domains/a.com.ts", update: true },
    }));
    const outcome = await deployTag(token, {
      goal: "transaction",
      kind: "domain",
      name: "a.com",
      code: "x",
      expectedSha: "abc",
    });

    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({
      goal: "transaction",
      kind: "domain",
      name: "a.com",
      code: "x",
      expectedSha: "abc",
    });
    expect(outcome.update).toBe(true);
  });

  test("shows the service's validation refusal verbatim — it names what is wrong with the tag", async () => {
    server(() => ({
      status: 400,
      json: {
        error: {
          code: "invalid_tag",
          message: "Refusing to deploy — the file failed validation:\n- no dedup guard found",
        },
      },
    }));
    await expect(deployTag(token, { goal: "transaction", kind: "domain", name: "a.com", code: "bad" })).rejects.toThrow(
      /no dedup guard/,
    );
  });
});

describe("generateTag", () => {
  test("sends the evidence and the goal — and no instructions, which are the service's now", async () => {
    const { calls } = server(() => ({ status: 200, json: { output: OUTPUT, model: "gpt-5.5", violations: [] } }));
    const result = await generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" });

    expect(calls).toHaveLength(1);
    expect(Object.keys(calls[0].body as object).sort()).toEqual(["evidence", "goal", "hostname"]);
    expect(String((calls[0].body as { evidence: string }).evidence)).toContain("shop.example.com");
    expect(result.model).toBe("gpt-5.5");
    expect(result.violations).toEqual([]);
  });

  test("sends the masked, trimmed recording — what leaves the browser is what buildPrompt produced", async () => {
    const { calls } = server(() => ({ status: 200, json: { output: OUTPUT, model: "gpt-5.5", violations: [] } }));
    await generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" });

    const body = calls[0].body as { evidence: string; goal: string };
    expect(body.goal).toBe(SESSION.goal);
    // The knowledge base used to travel in every request. It must not any more.
    expect(body.evidence).not.toContain("TransactionEvent");
    expect(body.evidence).not.toContain("REAL SHIPPED TAGS");
  });

  test("makes ONE call — the repair round belongs to the service now", async () => {
    const broken = { ...OUTPUT, code: "window.trackTrans({});" };
    const { calls } = server(() => ({
      status: 200,
      json: { output: broken, model: "gpt-5.5", violations: ["no dedup guard found"] },
    }));

    const result = await generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" });
    expect(calls).toHaveLength(1);
    expect(result.violations).toEqual(["no dedup guard found"]);
    expect(result.output.code).toBe(broken.code);
  });

  test("shows the violations the service reports rather than re-deciding them", async () => {
    server(() => ({
      status: 200,
      json: { output: OUTPUT, model: "gpt-5.5", violations: ["something the service saw"] },
    }));

    const result = await generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" });
    expect(result.violations).toEqual(["something the service saw"]);
  });

  test("treats a service that names no violations as a clean answer", async () => {
    server(() => ({ status: 200, json: { output: OUTPUT, model: "gpt-5.5" } }));

    const result = await generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" });
    expect(result.violations).toEqual([]);
  });

  test("refuses an answer that does not match the tag contract", async () => {
    server(() => ({ status: 200, json: { output: { summary: "nope" }, model: "gpt-5.5" } }));
    await expect(
      generateTag(token, { session: SESSION, status: STATUS, hostname: "shop.example.com" }),
    ).rejects.toThrow(/does not match the tag contract/);
  });
});

describe("describeFailure", () => {
  test("passes a service error through untouched — it was written for the operator", () => {
    expect(describeFailure(new ServiceError(429, "rate_limited", "Wait a moment and try again."))).toBe(
      "Wait a moment and try again.",
    );
  });

  test("turns the failures that have no message into ones that do", () => {
    expect(describeFailure(new Error("timed out"))).toMatch(/did not answer in time/);
    expect(describeFailure(new Error("The operation was aborted"))).toBe("Cancelled.");
    expect(describeFailure(new TypeError("Failed to fetch"))).toMatch(/Could not reach MediaJel/);
  });
});
