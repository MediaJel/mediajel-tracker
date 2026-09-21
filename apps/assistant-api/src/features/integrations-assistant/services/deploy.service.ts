import { Injectable, Logger } from "@nestjs/common";

import type { DeployOutcome, DeployRequest, ExistingTag } from "../dto/deploy.dto";
import type { OverridesPreview, OverridesRequest } from "../dto/overrides.dto";
import type { Authorized, DeployTargetKind } from "../types/assistant.types";
import { ApiError } from "../errors";
import { GithubService } from "./github.service";
import type { ExistingFile } from "./github.service";
import { carryBlocks, editsIn, planOverrides, versionOf } from "./overrides-block";
import { parseGate } from "./rewrite-imports";
import { ValidateService } from "./validate.service";

/**
 * Shipping a tag, and shipping an edit to a tag's configuration.
 *
 * Validation here is the security boundary, not a courtesy. This endpoint commits whatever it
 * is given with MediaJel's own credential, to a repo whose master branch goes live within
 * minutes and whose build a syntax error would freeze for everyone — so the same validator the
 * generate path ran is run again, on the exact bytes about to be written, and a file that
 * fails is refused before GitHub is touched at all. The browser's opinion does not get to stake
 * the repo's build.
 *
 * An edit to a tag's configuration is never code from the browser: the panel sends the params,
 * and the block that carries them is rendered here (see `overrides-block.ts`), spliced below the
 * app-id file's own code, and committed only if it parses.
 */
@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    private readonly github: GithubService,
    private readonly validator: ValidateService,
  ) {}

  /** The two folders, spelled in one place — the tag fetches by base64 of this exact name. */
  targetPath(kind: DeployTargetKind, name: string): string {
    return kind === "domain" ? `src/domains/${name}.ts` : `src/app-ids/${name}.ts`;
  }

  /** What the deploy step shows before it commits: the file it is about to replace, or nothing. */
  async readTag(kind: DeployTargetKind, name: string): Promise<ExistingTag> {
    const file = await this.github.client().getFile(this.targetPath(kind, name));
    return file ? { exists: true, sha: file.sha, content: file.content } : { exists: false };
  }

  async deploy(request: DeployRequest, who: Authorized): Promise<DeployOutcome> {
    const violations = this.validator.validate({
      code: request.code,
      goal: request.goal,
      appIdTarget: request.kind === "app-id",
    });
    if (violations.length > 0) {
      throw new ApiError(
        400,
        "invalid_tag",
        `Refusing to deploy — the file failed validation:\n- ${violations.join("\n- ")}`,
      );
    }

    const path = this.targetPath(request.kind, request.name);
    const existing = await this.current(path, request.expectedSha);
    // A tag's deployed configuration lives in its own block; replacing the file's code keeps it.
    const content = carryBlocks(existing?.content ?? null, request.code);
    const verb = existing ? "Update" : "Add";
    const past = existing ? "Updated" : "Created";
    return this.commit({
      path,
      content,
      existing,
      message: this.commitMessage(`${verb} ${request.kind} tag ${request.name}`, past, who),
      who,
    });
  }

  /** What an edit to a tag's configuration would do to its app-id file — nothing is committed. */
  async previewOverrides(request: OverridesRequest): Promise<OverridesPreview> {
    const path = this.targetPath("app-id", request.appId);
    const file = await this.github.client().getFile(path);
    const before = file?.content ?? "";
    const { block, after } = planOverrides(file?.content ?? null, request.appId, request.edits);
    return {
      path,
      exists: !!file,
      sha: file?.sha,
      before,
      after,
      block,
      version: versionOf(request.appId, request.edits),
      deployed: editsIn(file?.content ?? null, request.appId),
      changed: after !== before,
    };
  }

  /** Commits an edit to a tag's configuration: its block, below the app-id file's own code. */
  async deployOverrides(request: OverridesRequest, who: Authorized): Promise<DeployOutcome> {
    const path = this.targetPath("app-id", request.appId);
    const existing = await this.current(path, request.expectedSha);
    const { block, after } = planOverrides(existing?.content ?? null, request.appId, request.edits);
    this.refuseUnchanged(existing?.content ?? "", after, path);
    const syntax = block === null ? null : parseGate(block);
    if (syntax)
      throw new ApiError(400, "invalid_overrides", `Refusing to deploy — the block does not parse (${syntax}).`);
    return this.commit({
      path,
      content: after,
      existing,
      message: this.commitMessage(this.overridesTitle(request.appId, existing, block), "Edited", who),
      who,
    });
  }

  private overridesTitle(appId: string, existing: ExistingFile | null, block: string | null): string {
    if (block === null) return `Remove the configuration overrides for app-id ${appId}`;
    return `${existing ? "Update" : "Add"} the configuration overrides for app-id ${appId}`;
  }

  private refuseUnchanged(before: string, after: string, path: string): void {
    if (after === before) {
      throw new ApiError(409, "nothing_to_deploy", `${path} already holds exactly this configuration.`);
    }
  }

  /**
   * The file as it is now, checked against the sha the operator was shown. Read first, always:
   * the answer may have changed since, and committing against a stale sha is how two people
   * overwrite each other's tag without either of them finding out.
   */
  private async current(path: string, expectedSha: string | undefined): Promise<ExistingFile | null> {
    const existing = await this.github.client().getFile(path);
    if (existing && !expectedSha) {
      throw new ApiError(
        409,
        "conflict",
        `${path} exists now but did not when you started. Re-open the deploy step so you can see what is there.`,
      );
    }
    if (existing && existing.sha !== expectedSha) {
      throw new ApiError(
        409,
        "conflict",
        `${path} changed in the repo while you were working. Re-open the deploy step so you can see the current version.`,
      );
    }
    if (!existing && expectedSha) {
      throw new ApiError(409, "conflict", `${path} was deleted while you were working. Re-open the deploy step.`);
    }
    return existing;
  }

  private async commit(input: {
    path: string;
    content: string;
    existing: ExistingFile | null;
    message: string;
    who: Authorized;
  }): Promise<DeployOutcome> {
    const update = !!input.existing;
    const result = await this.github.client().putFile({
      path: input.path,
      content: input.content.endsWith("\n") ? input.content : `${input.content}\n`,
      message: input.message,
      sha: input.existing?.sha,
    });
    this.logger.log(`${update ? "Updated" : "Added"} ${input.path} for ${input.who.username}`);
    return { commitUrl: result.commitUrl, fileUrl: result.fileUrl, path: input.path, update };
  }

  /** The factory's convention, with the verified Cognito identity on the second line. */
  private commitMessage(title: string, past: string, actor: { name: string; email: string }): string {
    return `${title}\n\n${past} by: ${actor.name} (${actor.email})`;
  }
}
