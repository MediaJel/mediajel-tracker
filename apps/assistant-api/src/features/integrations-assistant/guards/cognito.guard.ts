import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Request } from "express";

import { ApiError } from "../errors";
import type { Authorized, AuthorizedRequest } from "../types/assistant.types";

/**
 * Authorization = "this is a MediaJel account".
 *
 * The caller presents the ID token from the same Cognito user pool the MediaJel dashboard signs
 * into, and the service verifies it against that pool's JWKS. Nothing else authenticates: a
 * verified token is the whole check, so anyone with a MediaJel account can use the assistant and
 * nobody has to be given a second credential to hold.
 *
 * It has to be the ID token, not the access token. Every verified path at MediaJel checks
 * `aud === <client id>` and reads `cognito:username`, and only ID tokens carry either.
 *
 * Verification is offline after the first request — the verifier caches the pool's public keys —
 * so there is no result cache here and no window in which a revoked session keeps working.
 */

/** The seam the tests use: anything that can turn a token into claims, or throw. */
export interface Verifier {
  verify(token: string): Promise<Record<string, unknown>>;
}

/** Accepts "Bearer <token>" or a bare token; empty → 401. */
export const extractToken = (header: string | undefined): string => (header ?? "").replace(/^bearer\s+/i, "").trim();

const text = (claims: Record<string, unknown>, key: string): string => {
  const value = claims[key];
  return typeof value === "string" ? value : "";
};

export const identityFrom = (claims: Record<string, unknown>): Authorized => {
  const username = text(claims, "cognito:username") || text(claims, "username");
  if (!username) {
    throw new ApiError(401, "unauthorized", "That token carries no MediaJel username. Sign in again.");
  }
  const given = text(claims, "given_name");
  const family = text(claims, "family_name");
  return {
    username,
    email: text(claims, "email"),
    name: text(claims, "name") || `${given} ${family}`.trim() || username,
    sub: text(claims, "sub"),
  };
};

/**
 * Cognito's rejection reasons are written for a library user, not for someone who has been
 * working all morning and just had a request refused. Expiry is the one that actually happens,
 * and it has a specific answer: sign in again.
 */
const describe = (err: unknown): ApiError => {
  const message = err instanceof Error ? err.message : String(err);
  if (/expired/i.test(message)) {
    return new ApiError(401, "unauthorized", "Your MediaJel session has expired. Sign in again.");
  }
  if (/token_use|audience|not match|issuer/i.test(message)) {
    return new ApiError(401, "unauthorized", "That is not a MediaJel session token for this service. Sign in again.");
  }
  return new ApiError(401, "unauthorized", "Your MediaJel session was not accepted. Sign in again.");
};

@Injectable()
export class CognitoGuard implements CanActivate {
  private cached: Verifier | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Tests bind their own verifier rather than reaching the network. */
  useVerifier(verifier: Verifier | null): void {
    this.cached = verifier;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & AuthorizedRequest>();
    const token = extractToken(request.headers.authorization);
    if (!token) {
      throw new ApiError(401, "unauthorized", "Sign in with your MediaJel account to use the assistant.");
    }

    // Built outside the try: a missing pool id is our misconfiguration, a 500, and must not be
    // reported to the operator as their session being rejected.
    const verifier = this.verifier();

    let claims: Record<string, unknown>;
    try {
      claims = await verifier.verify(token);
    } catch (err) {
      throw describe(err);
    }

    request.mjUser = identityFrom(claims);
    return true;
  }

  /**
   * Built once. `CognitoJwtVerifier` holds the fetched JWKS, so rebuilding it per request would
   * mean re-fetching the keys on a path that is supposed to be free.
   */
  private verifier(): Verifier {
    if (this.cached) return this.cached;

    const userPoolId = this.config.get<string>("COGNITO_USER_POOL_ID")?.trim();
    const clientId = this.config.get<string>("COGNITO_CLIENT_ID")?.trim();
    if (!userPoolId || !clientId) {
      throw new ApiError(
        500,
        "misconfigured",
        "The assistant service has no Cognito configuration. A MediaJel engineer needs to set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.",
      );
    }

    const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
    this.cached = { verify: (token) => verifier.verify(token) as Promise<Record<string, unknown>> };
    return this.cached;
  }
}
