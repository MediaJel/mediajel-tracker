import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession } from "amazon-cognito-identity-js";

/**
 * Signing in to MediaJel.
 *
 * The same user pool the dashboard signs into, through the same public app client — no client
 * secret exists for it, which is what lets a browser (and therefore an extension) authenticate
 * directly instead of proxying a password through a server. The flow is SRP: the password is
 * used to prove knowledge of itself and is never sent.
 *
 * Two challenges are not optional to support. The pool has TOTP MFA set to OPTIONAL, so anyone
 * who turned it on gets `SOFTWARE_TOKEN_MFA`; and admin-created accounts start on a temporary
 * password, so a first sign-in gets `NEW_PASSWORD_REQUIRED`. The GraphQL service's own sign-in
 * mutation rejects both, which is exactly why this does not go through it.
 *
 * What comes back is held by the background service worker and nothing else. The ID token is
 * the credential the assistant service verifies: every verified path at MediaJel checks
 * `aud === <client id>` and reads `cognito:username`, and only ID tokens carry those.
 */

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
}

export interface Identity {
  username: string;
  email: string;
  name: string;
}

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  /** Epoch ms at which the ID token stops being accepted. */
  expiresAt: number;
  identity: Identity;
}

/** A sign-in that is not finished: the pool wants one more thing before it issues tokens. */
export type AuthChallenge =
  | { kind: "mfa"; label: string }
  | { kind: "new-password"; label: string }
  | { kind: "mfa-setup"; label: string };

export type SignInResult = { done: true; session: AuthSession } | { done: false; challenge: AuthChallenge };

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string = "auth",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const config = (): CognitoConfig => {
  const userPoolId = (process.env.PLASMO_PUBLIC_COGNITO_USER_POOL_ID ?? "").trim();
  const clientId = (process.env.PLASMO_PUBLIC_COGNITO_CLIENT_ID ?? "").trim();
  if (!userPoolId || !clientId) {
    throw new AuthError(
      "This build has no Cognito configuration, so it cannot sign anyone in. A MediaJel engineer needs to rebuild it with PLASMO_PUBLIC_COGNITO_USER_POOL_ID and PLASMO_PUBLIC_COGNITO_CLIENT_ID.",
      "misconfigured",
    );
  }
  return { userPoolId, clientId };
};

const pool = (): CognitoUserPool => {
  const { userPoolId, clientId } = config();
  return new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
};

/**
 * Cognito's own wording is written for a login page, not for someone who has been using the
 * dashboard all morning. These are the four an operator actually hits.
 */
const describe = (err: { code?: string; name?: string; message?: string }): AuthError => {
  const code = err.code ?? err.name ?? "auth";
  switch (code) {
    case "NotAuthorizedException":
      return new AuthError("That email and password were not accepted. Check them and try again.", "unauthorized");
    case "UserNotFoundException":
      return new AuthError("There is no MediaJel account with that email.", "unknown-user");
    case "PasswordResetRequiredException":
      return new AuthError(
        "This account needs a password reset. Do it in the MediaJel dashboard, then come back.",
        "reset-required",
      );
    case "CodeMismatchException":
    case "EnableSoftwareTokenMFAException":
      return new AuthError(
        "That authenticator code was not accepted. Codes expire quickly — try the next one.",
        "bad-code",
      );
    case "UserNotConfirmedException":
      return new AuthError(
        "This account has not been confirmed yet. Finish setup in the MediaJel dashboard first.",
        "unconfirmed",
      );
    default:
      return new AuthError(err.message || "Sign-in failed.", code);
  }
};

const identityFrom = (session: CognitoUserSession, fallbackUsername: string): Identity => {
  const claims = session.getIdToken().decodePayload() as Record<string, unknown>;
  const username = String(claims["cognito:username"] ?? fallbackUsername);
  const email = String(claims.email ?? "");
  const given = String(claims.given_name ?? "");
  const family = String(claims.family_name ?? "");
  const name = String(claims.name ?? `${given} ${family}`.trim()) || username;
  return { username, email, name };
};

const sessionFrom = (session: CognitoUserSession, fallbackUsername: string): AuthSession => ({
  idToken: session.getIdToken().getJwtToken(),
  refreshToken: session.getRefreshToken().getToken(),
  expiresAt: session.getIdToken().getExpiration() * 1000,
  identity: identityFrom(session, fallbackUsername),
});

/**
 * The pending sign-in, held between the password and whatever the pool asked for next. It is
 * deliberately module state rather than something the panel carries: a half-finished
 * authentication is not a thing to hand around, and there can only be one at a time.
 */
let pending: { user: CognitoUser; username: string; requiredAttributes?: string[] } | null = null;

export const signIn = (username: string, password: string): Promise<SignInResult> =>
  new Promise<SignInResult>((resolve, reject) => {
    let user: CognitoUser;
    try {
      user = new CognitoUser({ Username: username, Pool: pool() });
    } catch (err) {
      reject(err instanceof AuthError ? err : describe(err as Record<string, string>));
      return;
    }
    pending = { user, username };

    user.authenticateUser(new AuthenticationDetails({ Username: username, Password: password }), {
      onSuccess: (session) => {
        pending = null;
        resolve({ done: true, session: sessionFrom(session, username) });
      },
      onFailure: (err) => {
        pending = null;
        reject(describe(err));
      },
      totpRequired: () => {
        resolve({ done: false, challenge: { kind: "mfa", label: "Enter the code from your authenticator app." } });
      },
      mfaRequired: () => {
        resolve({ done: false, challenge: { kind: "mfa", label: "Enter the code we sent you." } });
      },
      mfaSetup: () => {
        pending = null;
        reject(
          new AuthError(
            "This account still needs two-factor set up. Do that in the MediaJel dashboard, then sign in here.",
            "mfa-setup",
          ),
        );
      },
      newPasswordRequired: (_userAttributes, requiredAttributes: string[]) => {
        if (pending) pending.requiredAttributes = requiredAttributes;
        resolve({
          done: false,
          challenge: {
            kind: "new-password",
            label: "This account is still on its temporary password. Choose a new one.",
          },
        });
      },
    });
  });

/** Answers whichever challenge `signIn` came back with. */
export const answerChallenge = (kind: AuthChallenge["kind"], answer: string): Promise<AuthSession> =>
  new Promise<AuthSession>((resolve, reject) => {
    const current = pending;
    if (!current) {
      reject(new AuthError("That sign-in has expired. Start again with your email and password.", "expired"));
      return;
    }
    const { user, username } = current;

    const callbacks = {
      onSuccess: (session: CognitoUserSession) => {
        pending = null;
        resolve(sessionFrom(session, username));
      },
      onFailure: (err: Record<string, string>) => {
        // A wrong code is worth another try; anything else has ended this attempt.
        if (err.code !== "CodeMismatchException") pending = null;
        reject(describe(err));
      },
    };

    if (kind === "new-password") {
      // Passing `{}` is deliberate: any attribute the pool still wants was set when the account
      // was created in the dashboard, and inventing values for them here would write them.
      user.completeNewPasswordChallenge(answer, {}, callbacks);
      return;
    }
    user.sendMFACode(answer, callbacks, kind === "mfa" ? "SOFTWARE_TOKEN_MFA" : undefined);
  });

/**
 * Trades the refresh token for a fresh ID token. Called by the background before a service
 * call when the current one is close to expiring, so nobody is ever shown a 401 that a
 * round-trip would have avoided.
 */
export const refresh = (session: AuthSession): Promise<AuthSession> =>
  new Promise<AuthSession>((resolve, reject) => {
    const user = new CognitoUser({ Username: session.identity.username, Pool: pool() });
    user.refreshSession(
      { getToken: () => session.refreshToken } as never,
      (err: Record<string, string> | null, next: CognitoUserSession) => {
        if (err) {
          reject(describe(err));
          return;
        }
        resolve(sessionFrom(next, session.identity.username));
      },
    );
  });

/** Signs out locally. There is no server-side revocation to do: the ID token is short-lived
 *  and the refresh token is only ever held here. */
export const forgetPending = (): void => {
  pending = null;
};
