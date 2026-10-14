import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ActivityService } from "./services/activity.service";
import { ClickHouseDailySource } from "./providers/clickhouse-daily.source";
import { DAILY_ACTIVITY_SOURCE } from "./providers/daily-activity.source";
import { CognitoGuard } from "./guards/cognito.guard";
import { DeployService } from "./services/deploy.service";
import { GenerateService } from "./services/generate.service";
import { GithubService } from "./services/github.service";
import { GqlTagAccessSource } from "./providers/gql-tag-access.source";
import { TAG_ACCESS_SOURCE } from "./providers/tag-access.source";
import { TagAccessService } from "./services/tag-access.service";
import { INTEGRATIONS_KNOWLEDGE, StaticIntegrationsKnowledge } from "./knowledge/knowledge.provider";
import { IntegrationsAssistantController } from "./integrations-assistant.controller";
import { IntegrationsAssistantService } from "./integrations-assistant.service";
import { InternalServiceActivitySource } from "./providers/internal-service.source";
import { LLM_PROVIDER } from "./providers/llm.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { TAG_ACTIVITY_SOURCE } from "./providers/tag-activity.source";
import { ValidateService } from "./services/validate.service";

/**
 * The Integrations Assistant, whole.
 *
 * This module is written to be lifted into amplication-nestjs-microservices'
 * `external-service/src/features/` unchanged — the app around it (main.ts, app.module.ts) is
 * scaffolding that gets thrown away. Five bindings are the seams that make that move mechanical:
 *
 *   LLM_PROVIDER           → LlmOrchestrationService (common/llm-orchestration)
 *   INTEGRATIONS_KNOWLEDGE → knowledge-base's vector search over the same corpus
 *   TAG_ACTIVITY_SOURCE    → an adapter over MicroservicesService.internal (axios to internal-service)
 *   DAILY_ACTIVITY_SOURCE  → that repo's ClickhouseService, or internal-service once it serves the days;
 *                            here, ClickHouse read directly
 *   TAG_ACCESS_SOURCE      → whatever that repo asks the directory with; here, gql-service over fetch
 *
 * Nothing above any of the tokens knows which implementation is bound, so the swap is five lines
 * in this file and no change anywhere else.
 */
@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsAssistantController],
  providers: [
    IntegrationsAssistantService,
    GenerateService,
    DeployService,
    GithubService,
    ActivityService,
    TagAccessService,
    ValidateService,
    CognitoGuard,
    { provide: LLM_PROVIDER, useClass: OpenAiProvider },
    { provide: INTEGRATIONS_KNOWLEDGE, useClass: StaticIntegrationsKnowledge },
    { provide: TAG_ACTIVITY_SOURCE, useClass: InternalServiceActivitySource },
    { provide: DAILY_ACTIVITY_SOURCE, useClass: ClickHouseDailySource },
    { provide: TAG_ACCESS_SOURCE, useClass: GqlTagAccessSource },
  ],
  exports: [IntegrationsAssistantService],
})
export class IntegrationsAssistantModule {}
