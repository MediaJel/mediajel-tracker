/**
 * Where a generated tag goes and what the commit says.
 *
 * The naming is exact and load-bearing: the tag fetches a custom file by base64 of the LIVE
 * hostname or app id, so the file name must equal it byte for byte. That is the whole reason
 * this lives beside the recorder rather than in the service — the hostname it must match is
 * the one the operator is standing on, and only the browser knows that.
 *
 * The commit itself is the service's job now: it holds the deploy credential and runs the
 * validator one last time on the exact text being shipped.
 */

export const REPO_OWNER = "MediaJel";
export const REPO_NAME = "mediajel-frictionless-custom-tag";
export const REPO_BRANCH = "master";

export type DeployTargetKind = "domain" | "app-id";

export interface DeployTargetInfo {
  kind: DeployTargetKind;
  name: string;
  path: string;
}

export const targetPath = (kind: DeployTargetKind, name: string): string =>
  kind === "domain" ? `src/domains/${name}.ts` : `src/app-ids/${name}.ts`;

export const deployTargets = (
  hostname: string,
  appId: string,
): { domain: DeployTargetInfo; appId: DeployTargetInfo | null } => ({
  domain: { kind: "domain", name: hostname, path: targetPath("domain", hostname) },
  appId: appId ? { kind: "app-id", name: appId, path: targetPath("app-id", appId) } : null,
});

/**
 * The factory's convention, with the signed-in MediaJel user on the second line. The committer
 * stays the factory bot (set by the service), so a widget deploy and a factory deploy are
 * indistinguishable in the repo's history except for who is named here.
 */
export const commitMessage = (input: {
  update: boolean;
  kind: DeployTargetKind;
  name: string;
  actor: { name: string; email: string };
}): string =>
  `${input.update ? "Update" : "Add"} ${input.kind} tag ${input.name}\n\n${input.update ? "Updated" : "Created"} by: ${input.actor.name} (${input.actor.email})`;
