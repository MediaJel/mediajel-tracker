import { FormEvent, ReactNode, useState } from "react";

import type { AuthChallenge } from "~/auth/cognito";
import { Button } from "~/ui/components/ui/button";
import { Alert } from "~/ui/components/ui/alert";
import { Letterhead } from "~/ui/components/Letterhead";

/**
 * The gate. One MediaJel account, the same one the dashboard uses.
 *
 * The pool issues two challenges in real life — an authenticator code, and a new password for
 * an account still on the one an admin created — so both are ordinary states of this form
 * rather than errors. The password never leaves the extension: SRP proves knowledge of it to
 * Cognito without sending it, and nothing here stores it.
 */

export interface SignInProps {
  challenge: AuthChallenge | null;
  busy: boolean;
  error: string;
  onSignIn(username: string, password: string): void;
  onAnswer(kind: AuthChallenge["kind"], answer: string): void;
}

export const SignIn = ({ challenge, busy, error, onSignIn, onAnswer }: SignInProps): ReactNode => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    if (challenge) onAnswer(challenge.kind, answer);
    else onSignIn(username, password);
  };

  return (
    <form className="mj-signin" onSubmit={submit}>
      <Letterhead title="Integrations Assistant" />

      {challenge ? (
        <>
          <p className="mj-lede">{challenge.label}</p>
          <label className="mj-field">
            <span className="mj-field-label">{challenge.kind === "new-password" ? "New password" : "Code"}</span>
            <input
              className={challenge.kind === "new-password" ? "mj-input" : "mj-input mj-input--mono"}
              type={challenge.kind === "new-password" ? "password" : "text"}
              inputMode={challenge.kind === "new-password" ? undefined : "numeric"}
              autoComplete={challenge.kind === "new-password" ? "new-password" : "one-time-code"}
              value={answer}
              autoFocus
              onChange={(event) => setAnswer(event.currentTarget.value)}
            />
          </label>
        </>
      ) : (
        <>
          <p className="mj-lede">
            Sign in with your MediaJel account — the username you use for the dashboard, not your email address.
          </p>
          <label className="mj-field">
            <span className="mj-field-label">Username</span>
            <input
              className="mj-input"
              type="text"
              autoComplete="username"
              value={username}
              autoFocus
              onChange={(event) => setUsername(event.currentTarget.value)}
            />
          </label>
          <label className="mj-field">
            <span className="mj-field-label">Password</span>
            <input
              className="mj-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </label>
        </>
      )}

      {error && (
        <Alert tone="warn" role="alert" className="mb-3">
          <p>{error}</p>
        </Alert>
      )}

      <Button type="submit" className="w-full" aria-disabled={busy}>
        {busy ? "Signing in…" : challenge ? "Continue" : "Sign in"}
      </Button>

      <p className="mj-fine">
        Your password is never sent — it proves itself to AWS Cognito and stays in this browser. The assistant keeps
        only the session token, in extension storage no website can read.
      </p>
    </form>
  );
};

export default SignIn;
