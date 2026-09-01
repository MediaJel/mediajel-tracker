import { Injectable } from "@nestjs/common";
import type { Request } from "express";

import type { DeployOutcome, DeployRequest, ExistingTag } from "./dto/deploy.dto";
import type { GenerateRequest, GenerateResponse } from "./dto/generate.dto";
import { ApiError } from "./errors";
import type { Authorized, AuthorizedRequest, DeployTargetKind } from "./types/assistant.types";
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

  generate(input: GenerateRequest): Promise<GenerateResponse> {
    return this.generator.generate(input);
  }

  readTag(kind: DeployTargetKind, name: string): Promise<ExistingTag> {
    return this.deployer.readTag(kind, name);
  }

  deploy(input: DeployRequest, who: Authorized): Promise<DeployOutcome> {
    return this.deployer.deploy(input, who);
  }
}
