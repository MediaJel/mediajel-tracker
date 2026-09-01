import { z } from "zod";

/**
 * The model's output contract, and the request that asks for it.
 *
 * Strict-output friendly: `.nullable()` everywhere optionality is meant, because OpenAI's
 * strict mode requires every key to be present.
 */

export const GenerationSchema = z.object({
  /** One sentence: what signal the tag hooks and what it sends. */
  summary: z.string(),
  trigger: z.object({
    kind: z.enum(["dataLayer", "fetch", "xhr", "form", "dom", "postMessage", "storage"]),
    description: z.string(),
  }),
  /** The COMPLETE file content for src/<domains|app-ids>/<name>.ts. */
  code: z.string(),
  fieldCoverage: z.array(
    z.object({
      field: z.string(),
      status: z.enum(["mapped", "derived", "default", "missing"]),
      source: z.string().nullable(),
      value: z.string().nullable(),
      confidence: z.enum(["high", "medium", "low"]),
      note: z.string().nullable(),
    }),
  ),
  items: z.object({
    trackable: z.boolean(),
    reason: z.string().nullable(),
  }),
  warnings: z.array(z.string()),
  suggestedTarget: z.object({
    kind: z.enum(["domain", "app-id"]),
    reason: z.string(),
  }),
  /** The localStorage dedup key the code uses, e.g. "mj-shop-" + orderId. */
  dedupKey: z.string(),
});

export type GenerationOutput = z.infer<typeof GenerationSchema>;

/**
 * What the extension sends.
 *
 * `evidence` is the masked, budget-trimmed recording that `buildPrompt` produces in the
 * browser. That composition stays client-side deliberately: PRODUCT.md's third principle is
 * that every byte leaving the browser is previewable first, and the trimming and masking is
 * exactly the part the operator is entitled to inspect before pressing Generate.
 *
 * What is NOT here any more is `instructions`. The client used to build the system prompt from
 * a knowledge base it shipped in its own bundle and post it back to a service that simply
 * forwarded it. The service composes it now.
 */
export const GenerateRequestSchema = z.object({
  goal: z.enum(["transaction", "signup"]),
  hostname: z.string().min(1).max(253),
  evidence: z.string().min(1).max(400_000),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export interface GenerateResponse {
  output: GenerationOutput;
  model: string;
  /** Mechanical violations still standing after the repair round; empty on a clean answer. */
  violations: string[];
}
