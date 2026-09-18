import { describe, expect, test } from "bun:test";

import { CognitoGuard, extractToken, identityFrom } from "~/features/integrations-assistant/guards/cognito.guard";
import type { Verifier } from "~/features/integrations-assistant/guards/cognito.guard";

/**
 * The whole access-control story: a verified Cognito ID token, and nothing else.
 *
 * These tests never reach Cognito — the guard takes a verifier seam for exactly that reason.
 * What is worth proving is the shape of the refusals, because every one of them is read by an
 * operator mid-job, and "sign in again" versus "a MediaJel engineer needs to…" is the
 * difference between them retrying and them filing a ticket.
 */

const config = (values: Record<string, string | undefined>): { get<T>(key: string): T | undefined } => ({
  get: <T>(key: string) => values[key] as T | undefined,
});

const CONFIGURED = { COGNITO_USER_POOL_ID: "us-east-1_test", COGNITO_CLIENT_ID: "client-1" };

const context = (headers: Record<string, string>): any => {
  const request: Record<string, unknown> = { headers };
  return { switchToHttp: () => ({ getRequest: () => request }), request };
};

const guardWith = (
  verifier: Verifier | null,
  values: Record<string, string | undefined> = CONFIGURED,
): CognitoGuard => {
  const guard = new CognitoGuard(config(values) as never);
  guard.useVerifier(verifier);
  return guard;
};

const accepting = (claims: Record<string, unknown>): Verifier => ({ verify: async () => claims });
const rejecting = (message: string): Verifier => ({
  verify: async () => {
    throw new Error(message);
  },
});

describe("extractToken", () => {
  test("takes the token out of a Bearer header, however it is cased", () => {
    expect(extractToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractToken("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  test("accepts a bare token, and reads nothing out of an absent header", () => {
    expect(extractToken("abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractToken(undefined)).toBe("");
  });
});

describe("a request with no usable token", () => {
  test("is refused with the one instruction that helps", async () => {
    const guard = guardWith(accepting({ "cognito:username": "pacholo" }));
    await expect(guard.canActivate(context({}))).rejects.toThrow("Sign in with your MediaJel account");
  });
});

describe("a token Cognito will not accept", () => {
  test("expiry tells the operator to sign in again, because that is the fix", async () => {
    const guard = guardWith(rejecting("Token expired at 2026-01-01"));
    await expect(guard.canActivate(context({ authorization: "Bearer x" }))).rejects.toThrow(
      "Your MediaJel session has expired. Sign in again.",
    );
  });

  test("a token for something else is named as such, not as an expiry", async () => {
    const guard = guardWith(rejecting("Audience does not match"));
    await expect(guard.canActivate(context({ authorization: "Bearer x" }))).rejects.toThrow(
      "That is not a MediaJel session token for this service",
    );
  });

  test("anything else still lands on an instruction rather than a stack trace", async () => {
    const guard = guardWith(rejecting("kid not found in jwks"));
    await expect(guard.canActivate(context({ authorization: "Bearer x" }))).rejects.toThrow(
      "Your MediaJel session was not accepted. Sign in again.",
    );
  });
});

describe("a service with no Cognito configuration", () => {
  test("blames itself rather than the operator's session", async () => {
    const guard = guardWith(null, {});
    await expect(guard.canActivate(context({ authorization: "Bearer x" }))).rejects.toThrow(
      "A MediaJel engineer needs to set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID",
    );
  });
});

describe("the identity a verified token carries", () => {
  test("is attached to the request for the controller to attribute a deploy to", async () => {
    const guard = guardWith(
      accepting({ "cognito:username": "pacholo", email: "pacholo@mediajel.com", name: "Pacholo", sub: "s-1" }),
    );
    const ctx = context({ authorization: "Bearer x" });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.mjUser).toEqual({
      username: "pacholo",
      email: "pacholo@mediajel.com",
      name: "Pacholo",
      sub: "s-1",
    });
  });

  test("falls back to the given/family pair, then to the username, for the commit line", () => {
    expect(identityFrom({ "cognito:username": "p", given_name: "Pach", family_name: "Amit" }).name).toBe("Pach Amit");
    expect(identityFrom({ "cognito:username": "p" }).name).toBe("p");
  });

  test("a token with no username is refused — a deploy must be attributable", () => {
    expect(() => identityFrom({ email: "someone@mediajel.com" })).toThrow("carries no MediaJel username");
  });
});
