import { z } from "zod";

/**
 * A target name becomes a path in someone else's repository, so it is checked rather than
 * trusted: hostnames and app ids, nothing that can climb out of its folder.
 */
const TargetName = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-zA-Z0-9._-]+$/, "may contain only letters, numbers, dots, dashes and underscores")
  .refine((value) => !value.includes("..") && value !== ".", "may not be a relative path");

export const DeployRequestSchema = z.object({
  goal: z.enum(["transaction", "signup"]),
  kind: z.enum(["domain", "app-id"]),
  name: TargetName,
  code: z.string().min(1).max(200_000),
  /** The sha the operator was shown. Absent means "this should be a new file". */
  expectedSha: z.string().max(100).optional(),
});

export type DeployRequest = z.infer<typeof DeployRequestSchema>;

export const TagQuerySchema = z.object({
  kind: z.enum(["domain", "app-id"]),
  name: TargetName,
});

export interface DeployOutcome {
  commitUrl: string;
  fileUrl: string;
  path: string;
  update: boolean;
}

export interface ExistingTag {
  exists: boolean;
  sha?: string;
  content?: string;
}
