import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { IntegrationsAssistantModule } from "./features/integrations-assistant/integrations-assistant.module";

/**
 * Scaffolding. This app exists so the assistant's backend can be run and tested locally; when
 * the feature module moves into amplication-nestjs-microservices' external-service, this file
 * and main.ts are what gets left behind.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // `.env` last: an explicitly exported variable should always beat a file left on disk.
      envFilePath: [".env.development", ".env"],
    }),
    IntegrationsAssistantModule,
  ],
})
export class AppModule {}
