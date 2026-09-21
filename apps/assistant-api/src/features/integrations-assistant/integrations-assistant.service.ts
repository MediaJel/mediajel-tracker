import { Injectable } from "@nestjs/common";
import type { Request } from "express";

import type { TagActivityResponse } from "./dto/activity.dto";
import type { DeployOutcome, DeployRequest, ExistingTag } from "./dto/deploy.dto";
import type { OverridesPreview, OverridesRequest } from "./dto/overrides.dto";
import type { GenerateRequest, GenerateResponse } from "./dto/generate.dto";
import { ApiError } from "./errors";
import type { Authorized, AuthorizedRequest, DeployTargetKind } from "./types/assistant.types";
import { ActivityService } from "./services/activity.service";
import { GithubService } from "./services/github.service";
import { DeployService } from "./services/deploy.service";
import { GenerateService } from "./services/generate.service";
import { LLM_PROVIDER } from "./providers/llm.provider";
import type { LlmProvider } from "./providers/llm.provider";
import { Inject } from "@nestjs/common";

/**
 * The module's façade: the one class other features import when this module lands in
 * amplication-nestjs-microservices, so the sub-services stay private to it.
 */
@Injectable()
export class IntegrationsAssistantService {
  constructor(
    private readonly generator: GenerateService,
    private readonly deployer: DeployService,
    private readonly github: GithubService,
    private readonly activity: ActivityService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  /**
   * The identity the guard verified. A missing one is a wiring mistake — a route reached
   * without CognitoGuard — and is worth failing loudly rather than treating as anonymous.
   */
  who(request: Request & AuthorizedRequest): Authorized {
    if (!request.mjUser) {
      throw new ApiError(401, "unauthorized", "Sign in with your MediaJel account to use the assistant.");
    }
    return request.mjUser;
  }

  modelId(): string {
    return this.llm.modelId();
  }

  /** Whether this service could commit a tag if asked. See GithubService.configured. */
  deployConfigured(): boolean {
    return this.github.configured;
  }

  /** Whether this service could read tag activity if asked. See ActivityService.configured. */
  activityConfigured(): boolean {
    return this.activity.configured;
  }

  /** Whether this service could read each tag's days if asked. See ActivityService.dailyConfigured. */
  dailyConfigured(): boolean {
    return this.activity.dailyConfigured;
  }

  generate(input: GenerateRequest): Promise<GenerateResponse> {
    return this.generator.generate(input);
  }

  readTag(kind: DeployTargetKind, name: string): Promise<ExistingTag> {
    return this.deployer.readTag(kind, name);
  }

  deploy(input: DeployRequest, who: Authorized): Promise<DeployOutcome> {
    return this.deployer.deploy(input, who);
  }

  previewOverrides(input: OverridesRequest): Promise<OverridesPreview> {
    return this.deployer.previewOverrides(input);
  }

  deployOverrides(input: OverridesRequest, who: Authorized): Promise<DeployOutcome> {
    return this.deployer.deployOverrides(input, who);
  }

  readActivity(appIds: string[]): Promise<TagActivityResponse> {
    return this.activity.read(appIds);
  }
}
