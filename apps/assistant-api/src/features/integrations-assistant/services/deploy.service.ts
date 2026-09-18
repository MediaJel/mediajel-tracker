import { Injectable, Logger } from "@nestjs/common";

import type { DeployOutcome, DeployRequest, ExistingTag } from "../dto/deploy.dto";
import type { Authorized, DeployTargetKind } from "../types/assistant.types";
import { ApiError } from "../errors";
import { GithubService } from "./github.service";
import { ValidateService } from "./validate.service";

/**
 * Shipping a tag.
 *
 * Validation here is the security boundary, not a courtesy. This endpoint commits whatever it
 * is given with MediaJel's own credential, to a repo whose master branch goes live within
 * minutes and whose build a syntax error would freeze for everyone — so the same validator the
 * generate path ran is run again, on the exact bytes about to be written, and a file that
 * fails is refused before GitHub is touched at all. The browser's opinion does not get to stake
 * the repo's build.
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

    const client = this.github.client();
    const path = this.targetPath(request.kind, request.name);

    // Read first, always. The operator was shown a sha (or told the file was new) and the
    // answer may have changed since; committing against a stale sha is how two people
    // overwrite each other's tag without either of them finding out.
    const existing = await client.getFile(path);
    if (existing && !request.expectedSha) {
      throw new ApiError(
        409,
        "conflict",
        `${path} exists now but did not when you started. Re-open the deploy step so you can see what is there.`,
      );
    }
    if (existing && request.expectedSha && existing.sha !== request.expectedSha) {
      throw new ApiError(
        409,
        "conflict",
        `${path} changed in the repo while you were working. Re-open the deploy step so you can see the current version.`,
      );
    }
    if (!existing && request.expectedSha) {
      throw new ApiError(409, "conflict", `${path} was deleted while you were working. Re-open the deploy step.`);
    }

    const update = !!existing;
    const result = await client.putFile({
      path,
      content: request.code.endsWith("\n") ? request.code : `${request.code}\n`,
      message: this.commitMessage({ update, kind: request.kind, name: request.name, actor: who }),
      sha: existing?.sha,
    });

    this.logger.log(`${update ? "Updated" : "Added"} ${path} for ${who.username}`);
    return { commitUrl: result.commitUrl, fileUrl: result.fileUrl, path, update };
  }

  /** The factory's convention, with the verified Cognito identity on the second line. */
  private commitMessage(input: {
    update: boolean;
    kind: DeployTargetKind;
    name: string;
    actor: { name: string; email: string };
  }): string {
    const verb = input.update ? "Update" : "Add";
    const past = input.update ? "Updated" : "Created";
    return `${verb} ${input.kind} tag ${input.name}\n\n${past} by: ${input.actor.name} (${input.actor.email})`;
  }
}
