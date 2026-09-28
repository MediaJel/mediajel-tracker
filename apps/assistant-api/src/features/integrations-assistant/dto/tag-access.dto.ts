import { z } from "zod";

/**
 * "May I deploy this tag?", asked about one app ID.
 *
 * The same string rule the deploy DTO applies to a target name: an app ID is checked rather than
 * trusted, because it is interpolated into a query to MediaJel's directory.
 */
export const TagAccessQuerySchema = z.object({
  appId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[\w.-]+$/, "an app ID is letters, numbers, dots, dashes and underscores")
    .refine((id) => id !== "." && id !== "..", "an app ID may not be a relative path"),
});

/**
 * What the panel is told. `reason` is written for the operator and is shown as it arrives; the org
 * is named when the directory knew it, so the refusal can say whose tag it is. Nothing here is a
 * credential or a fact the browser could replay.
 */
export interface TagAccessResponse {
  appId: string;
  allowed: boolean;
  /** Empty when allowed. */
  reason: string;
  org?: { id: string; name: string };
}
