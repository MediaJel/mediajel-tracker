import { FormEvent, ReactNode, useId, useState } from "react";

import type { AuthChallenge } from "~/auth/cognito";
import { Letterhead } from "~/ui/components/Letterhead";
import { Fine, Lede } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Field, FieldLabel } from "~/ui/components/ui/field";
import { Input } from "~/ui/components/ui/input";

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

const INTRO = "Sign in with your MediaJel account — the username you use for the dashboard, not your email address.";

const NEW_PASSWORD = { label: "New password", type: "password", autoComplete: "new-password" } as const;
const CODE = {
  label: "Code",
  type: "text",
  inputMode: "numeric",
  autoComplete: "one-time-code",
  className: "font-mono",
} as const;

/** The challenge's one field: the code from an authenticator, or the new password the account owes. */
const ChallengeField = ({
  challenge,
  answer,
  onChange,
}: {
  challenge: AuthChallenge;
  answer: string;
  onChange(value: string): void;
}): ReactNode => {
  const id = useId();
  const { label, ...input } = challenge.kind === "new-password" ? NEW_PASSWORD : CODE;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} {...input} value={answer} autoFocus onChange={(event) => onChange(event.currentTarget.value)} />
    </Field>
  );
};

const Credentials = ({
  username,
  password,
  onUsername,
  onPassword,
}: {
  username: string;
  password: string;
  onUsername(value: string): void;
  onPassword(value: string): void;
}): ReactNode => {
  const ids = { username: useId(), password: useId() };
  return (
    <>
      <Field>
        <FieldLabel htmlFor={ids.username}>Username</FieldLabel>
        <Input
          id={ids.username}
          type="text"
          autoComplete="username"
          value={username}
          autoFocus
          onChange={(event) => onUsername(event.currentTarget.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={ids.password}>Password</FieldLabel>
        <Input
          id={ids.password}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPassword(event.currentTarget.value)}
        />
      </Field>
    </>
  );
};

const buttonLabel = (busy: boolean, challenge: AuthChallenge | null): string => {
  if (busy) return "Signing in…";
  return challenge ? "Continue" : "Sign in";
};

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
    <form className="flex flex-col gap-3 p-5" onSubmit={submit}>
      <Letterhead title="Integrations Assistant" />

      <Lede>{challenge ? challenge.label : INTRO}</Lede>
      {challenge ? (
        <ChallengeField challenge={challenge} answer={answer} onChange={setAnswer} />
      ) : (
        <Credentials username={username} password={password} onUsername={setUsername} onPassword={setPassword} />
      )}

      {error && (
        <Alert tone="warn" role="alert" className="mb-3">
          <p>{error}</p>
        </Alert>
      )}

      <Button type="submit" className="w-full" aria-disabled={busy}>
        {buttonLabel(busy, challenge)}
      </Button>

      <Fine>
        Your password is never sent — it proves itself to AWS Cognito and stays in this browser. The assistant keeps
        only the session token, in extension storage no website can read.
      </Fine>
    </form>
  );
};

export default SignIn;
