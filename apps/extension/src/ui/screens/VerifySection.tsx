import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode } from "react";

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
    <li className={`mj-capture${verdict.ok ? "" : " mj-capture--bad"}`}>
      <div className="mj-capture-head">
        <span className="mj-ev-badge">{index + 1}</span>
        <span className="mj-capture-name">window.{capture.name}(…)</span>
        {capture.fromReplay ? <span className="mj-chip-filter">replayed</span> : null}
        <span className={`mj-capture-verdict${verdict.ok ? " mj-capture-verdict--ok" : ""}`}>
          {verdict.ok ? "looks right" : "problems"}
        </span>
      </div>
      {verdict.problems.map((problem) => (
        <p key={problem} className="mj-capture-problem">
          {problem}
        </p>
      ))}
      {verdict.hints.map((hint) => (
        <p key={hint} className="mj-capture-hint">
          {hint}
        </p>
      ))}
      <pre className="mj-ev-detail">{JSON.stringify(capture.payload, null, 2)}</pre>
    </li>
  );
};

export const VerifySection = ({
  session,
  runErrors,
  onRunAgain,
  onBackToCode,
  readOnly = false,
}: VerifySectionProps): ReactNode => {
  const captured = session.verify?.captured ?? [];
  const errors = [...(session.verify?.errors ?? []), ...runErrors];

  return (
    <div className="mj-section-body">
      <p className="mj-lede">
        The generated tag is running on this page with <code>trackTrans</code> intercepted — nothing reaches the
        collector. Redo the {session.goal === "transaction" ? "purchase" : "sign-up"} now and read what it fires.
      </p>

      {errors.length > 0 && (
        <div className="mj-notice mj-notice--warn" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {captured.length === 0 && errors.length === 0 && (
        <div className="mj-working">
          <span className="mj-rec-dot" aria-hidden="true" />
          <span>Waiting for the tag to fire…</span>
        </div>
      )}

      {captured.length > 0 && (
        <ol className="mj-captures">
          {captured.map((capture, index) => (
            <Capture
              key={`${capture.at}-${index}`}
              session={session}
              capture={capture as InterceptedCall}
              index={index}
            />
          ))}
        </ol>
      )}

      <p className="mj-fine">Live tracking stays intercepted on this page until you reload it.</p>

      {!readOnly && (
        <div className="mj-section-footer">
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onBackToCode}>
            Back to the code
          </button>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onRunAgain}>
            Run again
          </button>
        </div>
      )}
    </div>
  );
};

export default VerifySection;
