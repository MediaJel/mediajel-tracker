import { Inject, Injectable, Logger } from "@nestjs/common";

import { GenerationSchema } from "../dto/generate.dto";
import type { GenerateRequest, GenerationOutput } from "../dto/generate.dto";
import { INTEGRATIONS_KNOWLEDGE } from "../knowledge/knowledge.provider";
import type { IntegrationsKnowledge } from "../knowledge/knowledge.provider";
import { LLM_PROVIDER } from "../providers/llm.provider";
import type { LlmProvider } from "../providers/llm.provider";
import { buildInstructions, buildRepairPrompt } from "../knowledge/system";
import { ValidateService } from "./validate.service";

export interface GenerateOutcome {
  output: GenerationOutput;
  model: string;
  violations: string[];
}

/**
 * The whole generate — the first answer and the repair round together — inside the extension's two
 * minutes, with room for the answer to travel back. The repair round gets what the first left, and
 * when that is nothing it is skipped the way a failed repair is: the first answer, its violations
 * named.
 */
const GENERATE_BUDGET_MS = 110_000;

/** The caller's signal, if any, ended early by the budget. */
const withinBudget = (signal?: AbortSignal): AbortSignal => {
  const budget = AbortSignal.timeout(GENERATE_BUDGET_MS);
  return signal ? AbortSignal.any([signal, budget]) : budget;
};

/**
 * One tag, generated and mechanically checked.
 *
 * The repair round used to run in the browser: the extension called /generate, validated the
 * answer itself, and called again with the violations appended. Moving it here is not only
 * tidier — it makes the panel's loading story a single call it can honestly describe, instead
 * of an opaque two-round wait with nothing to show between the rounds.
 *
 * One repair round, not a loop. A model that cannot satisfy the mechanical rules in two
 * attempts is not going to satisfy them in five, and the operator is sitting there.
 */
@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(INTEGRATIONS_KNOWLEDGE) private readonly knowledge: IntegrationsKnowledge,
    private readonly validator: ValidateService,
  ) {}

  async generate(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateOutcome> {
    const deadline = withinBudget(signal);
    const instructions = await this.instructionsFor(request.goal);

    const first = await this.llm.generateStructured({
      instructions,
      prompt: request.evidence,
      schema: GenerationSchema,
      signal: deadline,
    });

    const violations = this.check(first.output, request);
    if (violations.length === 0) {
      return { output: first.output, model: first.model, violations: [] };
    }

    if (deadline.aborted) {
      this.logger.warn(`No time left to repair the tag for ${request.hostname}; keeping the first answer.`);
      return { output: first.output, model: first.model, violations };
    }

    this.logger.log(`Generated tag for ${request.hostname} failed validation; running one repair round.`);

    let repaired: { output: GenerationOutput; model: string };
    try {
      repaired = await this.llm.generateStructured({
        instructions,
        prompt: buildRepairPrompt(request.evidence, first.output.code, violations),
        schema: GenerationSchema,
        signal: deadline,
      });
    } catch (err) {
      // The repair round is best-effort. A first answer with named violations is worth more to
      // the operator than an error that throws the whole attempt away — but the reason the
      // second call failed is the only record of it, so it is logged rather than swallowed.
      const why = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Repair round failed for ${request.hostname} (${why}); keeping the first answer.`);
      return { output: first.output, model: first.model, violations };
    }

    const repairedViolations = this.check(repaired.output, request);

    // Only take the repair if it actually repaired something — strictly fewer violations. A
    // second answer that is equally bad is still a second answer, and the operator would have
    // no way to tell which of the two they were looking at.
    return repairedViolations.length < violations.length
      ? { output: repaired.output, model: repaired.model, violations: repairedViolations }
      : { output: first.output, model: first.model, violations };
  }

  private async instructionsFor(goal: GenerateRequest["goal"]): Promise<string> {
    const [types, helpers, conventions, templates] = await Promise.all([
      this.knowledge.types(),
      this.knowledge.helpers(),
      this.knowledge.conventions(),
      this.knowledge.templates(goal),
    ]);
    return buildInstructions(goal, { types, helpers, conventions, templates });
  }

  private check(output: GenerationOutput, request: GenerateRequest): string[] {
    return this.validator.validate({
      code: output.code,
      goal: request.goal,
      appIdTarget: output.suggestedTarget.kind === "app-id",
    });
  }
}
