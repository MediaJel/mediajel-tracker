import { z } from "zod";

/**
 * The model call, behind one seam.
 *
 * In amplication-nestjs-microservices this is bound to LlmOrchestrationService
 * (common/llm-orchestration), which already routes across Claude, DeepSeek and Gemini with the
 * repo's own retry and fallback policy. Keeping the surface to one method is what makes that a
 * provider binding rather than a rewrite: nothing above it knows, or may know, which model
 * answered.
 */
export interface StructuredRequest<T> {
  instructions: string;
  prompt: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

export interface StructuredResult<T> {
  output: T;
  /** The model that actually answered, for the receipt the operator is shown. */
  model: string;
}

export interface LlmProvider {
  /** The identifier to report before a call has been made (the /health answer). */
  modelId(): string;
  generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

export const LLM_PROVIDER = Symbol("LLM_PROVIDER");
