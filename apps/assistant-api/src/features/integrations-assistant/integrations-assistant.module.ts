import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CognitoGuard } from "./guards/cognito.guard";
import { DeployService } from "./services/deploy.service";
import { GenerateService } from "./services/generate.service";
import { GithubService } from "./services/github.service";
import { INTEGRATIONS_KNOWLEDGE, StaticIntegrationsKnowledge } from "./knowledge/knowledge.provider";
import { IntegrationsAssistantController } from "./integrations-assistant.controller";
import { IntegrationsAssistantService } from "./integrations-assistant.service";
import { LLM_PROVIDER } from "./providers/llm.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { ValidateService } from "./services/validate.service";

/**
 * The Integrations Assistant, whole.
 *
 * This module is written to be lifted into amplication-nestjs-microservices'
 * `external-service/src/features/` unchanged — the app around it (main.ts, app.module.ts) is
 * scaffolding that gets thrown away. Two bindings are the seams that make that move mechanical:
 *
 *   LLM_PROVIDER           → LlmOrchestrationService (common/llm-orchestration)
 *   INTEGRATIONS_KNOWLEDGE → knowledge-base's vector search over the same corpus
 *
 * Nothing above either token knows which implementation is bound, so the swap is two lines in
 * this file and no change anywhere else.
 */
@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsAssistantController],
  providers: [
    IntegrationsAssistantService,
    GenerateService,
    DeployService,
    GithubService,
    ValidateService,
    CognitoGuard,
    { provide: LLM_PROVIDER, useClass: OpenAiProvider },
    { provide: INTEGRATIONS_KNOWLEDGE, useClass: StaticIntegrationsKnowledge },
  ],
  exports: [IntegrationsAssistantService],
})
export class IntegrationsAssistantModule {}
