import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

/**
 * Local bootstrap. Port 3011 by default, which is what the extension's `.env.example` already
 * points `PLASMO_PUBLIC_WIDGET_API_URL` at, so a checkout runs against this with no config.
 */
const PORT = Number(process.env.PORT || 3011);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // The extension calls from chrome-extension://<id>, which is an opaque origin. Permissive
    // CORS is the same posture the Lambda Function URL had, and the Cognito guard — not the
    // origin — is what actually decides who may call.
    cors: { origin: true, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["content-type", "authorization"] },
  });

  app.setGlobalPrefix("api");

  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("MediaJel Integrations Assistant")
        .setDescription("The assistant's server side: generate, verify-ready validation, and deploy.")
        .setVersion("1.0")
        .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
        .build(),
    ),
  );

  await app.listen(PORT);
  new Logger("bootstrap").log(`Integrations Assistant API on http://localhost:${PORT}/api`);
}

void bootstrap();
