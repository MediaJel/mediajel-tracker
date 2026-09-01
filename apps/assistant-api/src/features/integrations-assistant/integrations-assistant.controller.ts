import { Body, Controller, Get, Logger, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { z } from "zod";

import { DeployRequestSchema, TagQuerySchema } from "./dto/deploy.dto";
import type { DeployOutcome, ExistingTag } from "./dto/deploy.dto";
import { GenerateRequestSchema } from "./dto/generate.dto";
import type { GenerateResponse } from "./dto/generate.dto";
import { ApiError } from "./errors";
import type { AuthorizedRequest } from "./types/assistant.types";
import { CognitoGuard } from "./guards/cognito.guard";
import { IntegrationsAssistantService } from "./integrations-assistant.service";

/**
 * The Integrations Assistant's four endpoints. Same contract the extension already speaks, so
 * the move off the Lambda is a URL change for the client and nothing else.
 *
 *   GET  /health    → { ok, model, user }        the session is accepted and the service is configured
 *   POST /generate  → { output, model, … }       evidence → a validated tag
 *   GET  /tag       → { exists, sha, content }   the file a deploy would replace
 *   POST /deploy    → { commitUrl, … }           validate, then commit with MediaJel's credential
 *
 * All four require `Authorization: Bearer <Cognito ID token>`.
 */
@ApiTags("Integrations Assistant")
@Controller("assistant")
@UseGuards(CognitoGuard)
export class IntegrationsAssistantController {
  private readonly logger = new Logger(IntegrationsAssistantController.name);

  constructor(private readonly assistant: IntegrationsAssistantService) {}

  /**
   * Zod rather than class-validator, deliberately: these schemas are the contract the extension
   * already validates against, and one shared shape is worth more than matching the destination
   * repo's DTO habit. Both are hand-parsed here so a bad body is a 400 with the offending field
   * named, not a stack trace.
   */
  private parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path.map(String).join(".") || "body";
      throw new ApiError(
        400,
        "bad_request",
        `Invalid ${what}: ${where} — ${issue?.message ?? "not the expected shape"}.`,
      );
    }
    return result.data;
  }

  @Get("health")
  @ApiOperation({
    summary: "Confirm the session and the service configuration",
    description: "Answers only for a verified MediaJel session, and names the model that would answer a generate.",
  })
  @ApiResponse({ status: 200, description: "The session is accepted" })
  @ApiResponse({ status: 401, description: "No MediaJel session, or one that was not accepted" })
  health(@Req() request: Request & AuthorizedRequest): {
    ok: true;
    model: string;
    user: { username: string; email: string };
  } {
    const who = this.assistant.who(request);
    return { ok: true, model: this.assistant.modelId(), user: { username: who.username, email: who.email } };
  }

  @Post("generate")
  @ApiOperation({
    summary: "Write a frictionless custom tag from a page recording",
    description:
      "Takes the masked, trimmed evidence the extension recorded and returns a tag that has passed the same mechanical validation the deploy gate applies. The instructions and the integrations knowledge are the service's own — the caller does not supply them.",
  })
  @ApiResponse({ status: 200, description: "A tag, with any surviving mechanical violations named" })
  async generate(@Req() request: Request & AuthorizedRequest, @Body() body: unknown): Promise<GenerateResponse> {
    const who = this.assistant.who(request);
    const input = this.parse(GenerateRequestSchema, body, "generate request");
    const started = Date.now();

    const result = await this.assistant.generate(input);

    this.logger.log(
      JSON.stringify({
        at: "generate",
        user: who.username,
        hostname: input.hostname,
        model: result.model,
        violations: result.violations.length,
        ms: Date.now() - started,
      }),
    );
    return result;
  }

  @Get("tag")
  @ApiOperation({
    summary: "Read the tag a deploy would replace",
    description:
      "So the deploy step can show new-vs-update honestly, and carry the sha the commit will be made against.",
  })
  @ApiResponse({ status: 200, description: "The existing file, or exists: false" })
  async tag(@Req() request: Request & AuthorizedRequest, @Query() query: unknown): Promise<ExistingTag> {
    this.assistant.who(request);
    const { kind, name } = this.parse(TagQuerySchema, query, "tag query");
    return this.assistant.readTag(kind, name);
  }

  @Post("deploy")
  @ApiOperation({
    summary: "Commit the tag to the frictionless repo",
    description:
      "Validates the exact bytes it is about to write, refuses a file that fails, and commits with MediaJel's own credential — attributed to the verified Cognito identity.",
  })
  @ApiResponse({ status: 200, description: "Committed" })
  @ApiResponse({ status: 400, description: "The file failed validation and was not committed" })
  @ApiResponse({ status: 409, description: "The file changed in the repo while the operator was working" })
  async deploy(@Req() request: Request & AuthorizedRequest, @Body() body: unknown): Promise<DeployOutcome> {
    const who = this.assistant.who(request);
    const input = this.parse(DeployRequestSchema, body, "deploy request");
    return this.assistant.deploy(input, who);
  }
}
