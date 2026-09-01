import { z } from "zod";

/**
 * The model's output contract. Strict-output friendly: `.nullable()` everywhere optionality
 * is meant — OpenAI's strict mode requires every key to be present.
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
