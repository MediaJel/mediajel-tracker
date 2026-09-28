import { describe, expect, test } from "bun:test";

import { type GenerationOutput, GenerationSchema } from "~/features/integrations-assistant/dto/generate.dto";
import { GenerateService } from "~/features/integrations-assistant/services/generate.service";
import type { IntegrationsKnowledge } from "~/features/integrations-assistant/knowledge/knowledge.provider";
import type { LlmProvider, StructuredRequest } from "~/features/integrations-assistant/providers/llm.provider";
import { StaticIntegrationsKnowledge } from "~/features/integrations-assistant/knowledge/knowledge.provider";
import { ValidateService } from "~/features/integrations-assistant/services/validate.service";

/**
 * What the module exists to do: compose the instructions from ITS OWN knowledge, and never
 * hand the operator a file it has not mechanically checked.
 *
 * The LLM is a stub throughout. These tests are about the orchestration around the model — the
 * one thing that moving the repair round server-side made this service responsible for.
 */

/** A file that passes every rule in ValidateService. */
const GOOD_CODE = `import { fetchSource } from "../libs/sources/fetch-source";

fetchSource("/checkout", function (body) {
  var orderId = String(body.id);
  if (localStorage.getItem("mj-shop-" + orderId)) return;
  localStorage.setItem("mj-shop-" + orderId, "1");
  window.trackTrans({
    id: orderId,
    total: body.total,
    tax: 0,
    shipping: 0,
    city: "N/A",
    state: "N/A",
    country: "N/A",
    currency: "USD",
    items: [],
  });
});
`;

/** Never calls trackTrans, and has no dedup guard. */
const BAD_CODE = `console.log("nothing useful here");`;

const output = (code: string): GenerationOutput => ({
  summary: "hooks the order confirmation",
  trigger: { kind: "fetch", description: "POST /checkout" },
  code,
  fieldCoverage: [],
  items: { trackable: true, reason: null },
  warnings: [],
  suggestedTarget: { kind: "domain", reason: "one storefront" },
  dedupKey: "mj-shop-",
});

const request = {
  goal: "transaction",
  hostname: "shop.example.com",
  evidence: "#0 +1.0s [network] POST /checkout",
} as const;

/** A provider that answers with the given files in order, recording what it was asked. */
const stubLlm = (...codes: string[]): LlmProvider & { calls: StructuredRequest<unknown>[] } => {
  const calls: StructuredRequest<unknown>[] = [];
  let i = 0;
  return {
    calls,
    modelId: () => "stub-model",
    generateStructured: async (req) => {
      calls.push(req as StructuredRequest<unknown>);
      const code = codes[Math.min(i++, codes.length - 1)];
      return { output: output(code) as never, model: "stub-model" };
    },
  };
};

const build = (
  llm: LlmProvider,
  knowledge: IntegrationsKnowledge = new StaticIntegrationsKnowledge(),
): GenerateService => new GenerateService(llm, knowledge, new ValidateService());

describe("the instructions the service composes", () => {
  test("carry the integrations knowledge — the caller does not supply it", async () => {
    const llm = stubLlm(GOOD_CODE);
    await build(llm).generate(request);

    const instructions = llm.calls[0]!.instructions;
    expect(instructions).toContain("TransactionEvent"); // the ambient payload types
    expect(instructions).toContain("window.trackTrans"); // the call this goal must make
    expect(instructions).toContain("REAL SHIPPED TAGS"); // the templates
  });

  test("say which call the goal requires, so a sign-up is not written as a purchase", async () => {
    const llm = stubLlm(GOOD_CODE);
    await build(llm).generate({ ...request, goal: "signup" });

    expect(llm.calls[0]!.instructions).toContain("window.trackSignUp");
  });

  test("send the browser's evidence as the prompt, unaltered", async () => {
    const llm = stubLlm(GOOD_CODE);
    await build(llm).generate(request);

    expect(llm.calls[0]!.prompt).toBe(request.evidence);
  });
});

describe("the repair round", () => {
  test("does not run when the first answer is already clean", async () => {
    const llm = stubLlm(GOOD_CODE);
    const result = await build(llm).generate(request);

    expect(llm.calls).toHaveLength(1);
    expect(result.violations).toEqual([]);
  });

  test("runs once on violations, and returns the repaired file", async () => {
    const llm = stubLlm(BAD_CODE, GOOD_CODE);
    const result = await build(llm).generate(request);

    expect(llm.calls).toHaveLength(2);
    expect(result.violations).toEqual([]);
    expect(result.output.code).toBe(GOOD_CODE);
  });

  test("shows the model its own violations, so the second attempt is aimed", async () => {
    const llm = stubLlm(BAD_CODE, GOOD_CODE);
    await build(llm).generate(request);

    const repair = llm.calls[1]!.prompt;
    expect(repair).toContain("FAILED MECHANICAL VALIDATION");
    expect(repair).toContain("window.trackTrans(");
    expect(repair).toContain(BAD_CODE);
  });

  test("keeps the first answer when the repair is no better — never silently worse", async () => {
    const llm = stubLlm(GOOD_CODE.replace("window.trackTrans(", "window.tracker("), BAD_CODE);
    const result = await build(llm).generate(request);

    expect(llm.calls).toHaveLength(2);
    expect(result.output.code).toContain("window.tracker(");
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test("keeps the first answer when the repair round itself fails", async () => {
    let call = 0;
    const llm: LlmProvider = {
      modelId: () => "stub-model",
      generateStructured: async () => {
        if (call++ === 0) return { output: output(BAD_CODE) as never, model: "stub-model" };
        throw new Error("the model fell over");
      },
    };

    const result = await build(llm).generate(request);
    expect(result.output.code).toBe(BAD_CODE);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

describe("what comes back", () => {
  test("names the violations still standing, rather than implying the file is clean", async () => {
    const llm = stubLlm(BAD_CODE);
    const result = await build(llm).generate(request);

    expect(result.violations).toContain("the file never calls window.trackTrans(…) — that is its whole job");
    expect(result.model).toBe("stub-model");
  });

  test("the answer matches the contract the extension parses", async () => {
    const llm = stubLlm(GOOD_CODE);
    const result = await build(llm).generate(request);

    expect(GenerationSchema.safeParse(result.output).success).toBe(true);
  });
});
