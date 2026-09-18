import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode } from "react";

import { cn } from "~/lib/utils";
import { Fine, Lede, Machine, SectionBody, SectionFooter, Working } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Badge } from "~/ui/components/ui/badge";
import { Button } from "~/ui/components/ui/button";

/**
 * Section 04 — Verify. The generated tag is live on THIS page with the tracker entry points
 * intercepted: the operator redoes the action and reads exactly what would have been sent.
 * Nothing reaches the collector; live tracking stays intercepted until a reload, and the
 * copy says so.
 */

export interface VerifySectionProps {
  session: WidgetSession;
  runErrors: string[];
  onRunAgain(): void;
  onBackToCode(): void;
  readOnly?: boolean;
}

/** "looks right" in platform ink, "problems" in the warning ink — read aloud as such. */
const Verdict = ({ ok }: { ok: boolean }): ReactNode => (
  <span
    data-verdict={ok ? "ok" : "problems"}
    className={cn(
      "ml-auto font-display text-3xs tracking-label uppercase",
      ok ? "text-platform-text" : "text-warning-text",
    )}
  >
    {ok ? "looks right" : "problems"}
  </span>
);

const Capture = ({
  session,
  capture,
  index,
}: {
  session: WidgetSession;
  capture: InterceptedCall;
  index: number;
}): ReactNode => {
  const marked = session.timeline.filter((event) => session.markedIds.includes(event.id));
  const verdict = checkPayload(capture, session.goal, marked);
  return (
    <li
      className={cn(
        "px-2 py-1.5 [li+&]:border-t [li+&]:border-border",
        !verdict.ok && "shadow-[inset_0_0_0_1px_var(--mj-partner)]",
      )}
      data-bad={verdict.ok ? undefined : true}
    >
      <div className="mb-1 flex items-center gap-2">
        <Badge>{index + 1}</Badge>
        <span className="font-mono text-xs">window.{capture.name}(…)</span>
        {capture.fromReplay ? <Badge variant="chip">replayed</Badge> : null}
        <Verdict ok={verdict.ok} />
      </div>
      {verdict.problems.map((problem) => (
        <p key={problem} className="mt-0 mb-0.5 text-xs text-warning-text">
          {problem}
        </p>
      ))}
      {verdict.hints.map((hint) => (
        <p key={hint} className="mt-0 mb-0.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ))}
      <Machine>{JSON.stringify(capture.payload, null, 2)}</Machine>
    </li>
  );
};

/** What the run has to say before anything fired: its errors, or that it is waiting. */
const Progress = ({ captured, errors }: { captured: number; errors: string[] }): ReactNode => {
  if (errors.length > 0) {
    return (
      <Alert tone="warn" role="alert" className="mb-3">
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </Alert>
    );
  }
  if (captured === 0) return <Working>Waiting for the tag to fire…</Working>;
  return null;
};

const Captures = ({ session, captured }: { session: WidgetSession; captured: InterceptedCall[] }): ReactNode =>
  captured.length === 0 ? null : (
    <ol className="m-0 mb-2.5 list-none rounded-sm border border-border p-0">
      {captured.map((capture, index) => (
        <Capture key={`${capture.at}-${index}`} session={session} capture={capture} index={index} />
      ))}
    </ol>
  );

export const VerifySection = ({
  session,
  runErrors,
  onRunAgain,
  onBackToCode,
  readOnly = false,
}: VerifySectionProps): ReactNode => {
  const captured = (session.verify?.captured ?? []) as InterceptedCall[];
  const errors = [...(session.verify?.errors ?? []), ...runErrors];

  return (
    <SectionBody>
      <Lede>
        The generated tag is running on this page with <code>trackTrans</code> intercepted — nothing reaches the
        collector. Redo the {session.goal === "transaction" ? "purchase" : "sign-up"} now and read what it fires.
      </Lede>

      <Progress captured={captured.length} errors={errors} />
      <Captures session={session} captured={captured} />

      <Fine>Live tracking stays intercepted on this page until you reload it.</Fine>

      {!readOnly && (
        <SectionFooter>
          <Button type="button" variant="outline" onClick={onBackToCode}>
            Back to the code
          </Button>
          <Button type="button" variant="outline" onClick={onRunAgain}>
            Run again
          </Button>
        </SectionFooter>
      )}
    </SectionBody>
  );
};

export default VerifySection;
