import { validateGenerated } from "@mediajel/tracker-widget/ai/validate";
import { GitHubClient } from "@mediajel/tracker-widget/deploy/github";
import { WidgetActor } from "@mediajel/tracker-widget/session/settings";
import { WidgetGoal } from "@mediajel/tracker-widget/types";

/**
 * The deploy itself: exact naming (the tag fetches by base64 of the LIVE hostname/appId, so
 * the file name must equal it byte for byte), the factory's commit-message convention, and
 * the validator run one last time on the exact text being shipped — this commit goes to
 * master and is live after the repo's CI, with no human in between.
 */

export interface DeployTargetInfo {
  kind: "domain" | "app-id";
  name: string;
  path: string;
}

export const deployTargets = (appId: string): { domain: DeployTargetInfo; appId: DeployTargetInfo | null } => ({
  domain: { kind: "domain", name: location.hostname, path: `src/domains/${location.hostname}.ts` },
  appId: appId ? { kind: "app-id", name: appId, path: `src/app-ids/${appId}.ts` } : null,
});

export const commitMessage = (input: {
  update: boolean;
  kind: "domain" | "app-id";
  name: string;
  actor: WidgetActor;
}): string =>
  `${input.update ? "Update" : "Add"} ${input.kind} tag ${input.name}\n\n${input.update ? "Updated" : "Created"} by: ${input.actor.name} (${input.actor.email})`;

export interface DeployInput {
  client: GitHubClient;
  target: DeployTargetInfo;
  code: string;
  goal: WidgetGoal;
  actor: WidgetActor;
  /** Set when the operator explicitly confirmed overwriting the existing file. */
  existingSha?: string;
}

export interface DeployOutcome {
  commitUrl: string;
  fileUrl: string;
  path: string;
  update: boolean;
}

export const deployTag = async ({
  client,
  target,
  code,
  goal,
  actor,
  existingSha,
}: DeployInput): Promise<DeployOutcome> => {
  const violations = validateGenerated({ code, goal, appIdTarget: target.kind === "app-id" });
  if (violations.length > 0) {
    throw new Error(`refusing to deploy — the file failed validation:\n- ${violations.join("\n- ")}`);
  }

  const update = !!existingSha;
  const result = await client.putFile({
    path: target.path,
    content: code.endsWith("\n") ? code : `${code}\n`,
    message: commitMessage({ update, kind: target.kind, name: target.name, actor }),
    sha: existingSha,
  });

  return { commitUrl: result.commitUrl, fileUrl: result.fileUrl, path: target.path, update };
};
