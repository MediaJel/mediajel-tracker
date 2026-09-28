import { z } from "zod";

import { TargetName } from "./deploy.dto";

/** A parameter as the tag reads it off its URL — `s2.pv`, `conversionId` — and nothing that could be code. */
const ParamName = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,64}$/, "is letters, numbers, dots, dashes and underscores, at most 64 of them");

/**
 * A tag's edited configuration: the params it should run with instead of its own. Data only — the
 * service renders the code that carries it. An empty value clears a param; no edits at all take the
 * tag's block out of its app-id file.
 */
export const OverridesRequestSchema = z.object({
  appId: TargetName,
  edits: z
    .record(ParamName, z.string().max(2_048))
    .refine((edits) => Object.keys(edits).length <= 64, "names at most 64 params"),
  /** The sha the operator was shown. Absent means "this should be a new file". */
  expectedSha: z.string().max(100).optional(),
});

export type OverridesRequest = z.infer<typeof OverridesRequestSchema>;

/** What an edit would do to the tag's app-id file, before anything is committed. */
export interface OverridesPreview {
  path: string;
  exists: boolean;
  sha?: string;
  before: string;
  after: string;
  /** The code the page runs when the edit is tried, byte for byte what the commit writes; null when the edit takes the block out. */
  block: string | null;
  /**
   * The edit's version, which the page names while the edit is tried. An edit that takes the block
   * out has one too: named on the page, it makes the deployed block stand aside, so the page runs
   * the file as that deploy would leave it.
   */
  version: string;
  /** The edits the file's block for this tag carries now, or null when it has none. */
  deployed: Record<string, string> | null;
  /** Whether committing would change the file at all. */
  changed: boolean;
}
