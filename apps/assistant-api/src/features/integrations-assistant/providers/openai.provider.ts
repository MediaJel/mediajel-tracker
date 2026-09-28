import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { createOpenAI } from "@ai-sdk/openai";
import type { Output, generateText } from "ai";

import { ApiError } from "../errors";
import type { LlmProvider, StructuredRequest, StructuredResult } from "./llm.provider";

/**
 * OpenAI via the AI SDK — the implementation this repo runs today, and the one that gets
 * replaced by LlmOrchestrationService on the move to amplication.
 *
 * Both SDKs are ESM-only and this app compiles to CommonJS (Nest's DI needs
 * `emitDecoratorMetadata`, which is a CJS-era feature). A plain `await import()` would be
 * downlevelled straight back into `require()` by tsc and fail at runtime with ERR_REQUIRE_ESM,
 * so the import goes through a `Function` constructor that tsc will not rewrite. The types are
 * imported statically and erased, so this costs nothing at the call sites.
 *
 * The key never appears in any message this class produces. Every failure is translated into
 * something an operator can act on, and the ones that are MediaJel's fault say so plainly
 * rather than implying the operator did something wrong.
 */

/** An `import()` tsc cannot see, and therefore cannot turn into a `require()`. */
const esmImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;

interface AiSdk {
  createOpenAI: typeof createOpenAI;
  generateText: typeof generateText;
  Output: typeof Output;
}

/** Loaded once. Both packages are pure ESM and neither is cheap to evaluate twice. */
let sdk: Promise<AiSdk> | null = null;

const loadSdk = (): Promise<AiSdk> =>
  (sdk ??= Promise.all([esmImport("@ai-sdk/openai"), esmImport("ai")]).then(([openai, ai]) => ({
    createOpenAI: (openai as { createOpenAI: typeof createOpenAI }).createOpenAI,
    generateText: (ai as { generateText: typeof generateText }).generateText,
    Output: (ai as { Output: typeof Output }).Output,
  })));

const DEFAULT_MODEL = "gpt-5.5";
/** The extension gives up at two minutes; stay well inside that. */
const GENERATION_TIMEOUT_MS = 240_000;

@Injectable()
export class OpenAiProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  modelId(): string {
    return this.config.get<string>("WIDGET_AI_MODEL")?.trim() || DEFAULT_MODEL;
  }

  async generateStructured<T>({
    instructions,
    prompt,
    schema,
    signal,
  }: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ApiError(500, "misconfigured", "OPENAI_API_KEY is not set on the service.");
    }

    const model = this.modelId();
    const { createOpenAI: create, generateText: run, Output: out } = await loadSdk();
    const openai = create({ apiKey });
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal?.addEventListener("abort", abort);
    const timer = setTimeout(abort, GENERATION_TIMEOUT_MS);

    try {
      const result = await run({
        model: openai.chat(model),
        instructions,
        prompt,
        output: out.object({ schema }),
        temperature: 0.2,
        maxRetries: 2,
        abortSignal: controller.signal,
      });

      const parsed = schema.safeParse(result.output);
      if (!parsed.success) {
        throw new ApiError(
          502,
          "provider",
          "The model returned an object that does not match the tag contract. Try again.",
        );
      }
      return { output: parsed.data, model };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw this.describe(err, model);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  private describe(err: unknown, model: string): ApiError {
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { statusCode?: number })?.statusCode;

    if ((err as { name?: string })?.name === "AbortError" || /abort|timed out/i.test(message)) {
      return new ApiError(504, "timeout", "The model did not answer within four minutes. Try again.");
    }
    if (status === 429 || /\b429\b|rate.?limit/i.test(message)) {
      return new ApiError(
        429,
        "rate_limited",
        "The model is rate limiting the service (429). Wait a moment and try again.",
      );
    }
    if (status === 401 || status === 403 || /\b40[13]\b|invalid[_ ]?api[_ ]?key|authentication/i.test(message)) {
      return new ApiError(
        502,
        "provider",
        "OpenAI rejected the service's key. A MediaJel engineer needs to check OPENAI_API_KEY.",
      );
    }
    if (status === 404 || /\b404\b|model_not_found|does not exist/i.test(message)) {
      return new ApiError(
        502,
        "provider",
        `OpenAI does not know the model "${model}". A MediaJel engineer needs to check WIDGET_AI_MODEL.`,
      );
    }
    this.logger.error(`Model call failed: ${message}`);
    return new ApiError(502, "provider", `The model call failed: ${message}`);
  }
}
