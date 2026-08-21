import { checkPayload } from "@mediajel/tracker-widget/verify/payload-check";
import { InterceptedCall } from "@mediajel/tracker-widget/verify/interceptor";
import { WidgetSession } from "@mediajel/tracker-widget/types";
import { VNode, useMemo } from "@mediajel/tracker-widget/vendor";

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
  onApprove(): void;
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
}): VNode => {
  const marked = session.timeline.filter((event) => session.markedIds.includes(event.id));
  const verdict = checkPayload(capture, session.goal, marked);
  return (
    <li class={`mj-capture${verdict.ok ? "" : " mj-capture--bad"}`}>
      <div class="mj-capture-head">
        <span class="mj-ev-badge">{index + 1}</span>
        <span class="mj-capture-name">window.{capture.name}(…)</span>
        {capture.fromReplay ? <span class="mj-chip-filter">replayed</span> : null}
        <span class={`mj-capture-verdict${verdict.ok ? " mj-capture-verdict--ok" : ""}`}>
          {verdict.ok ? "looks right" : "problems"}
        </span>
      </div>
      {verdict.problems.map((problem) => (
        <p key={problem} class="mj-capture-problem">
          {problem}
        </p>
      ))}
      {verdict.hints.map((hint) => (
        <p key={hint} class="mj-capture-hint">
          {hint}
        </p>
      ))}
      <pre class="mj-ev-detail">{JSON.stringify(capture.payload, null, 2)}</pre>
    </li>
  );
};

export const VerifySection = ({
  session,
  runErrors,
  onRunAgain,
  onBackToCode,
  onApprove,
  readOnly = false,
}: VerifySectionProps): VNode => {
  const captured = session.verify?.captured ?? [];
  const errors = [...(session.verify?.errors ?? []), ...runErrors];

  const approvable = useMemo(() => {
    if (captured.length === 0) return false;
    const marked = session.timeline.filter((event) => session.markedIds.includes(event.id));
    const latest = captured[captured.length - 1] as InterceptedCall;
    return checkPayload(latest, session.goal, marked).ok;
  }, [captured, session]);

  return (
    <div class="mj-section-body">
      <p class="mj-lede">
        The generated tag is running on this page with <code>trackTrans</code> intercepted — nothing reaches the
        collector. Redo the {session.goal === "transaction" ? "purchase" : "sign-up"} now and read what it fires.
      </p>

      {errors.length > 0 && (
        <div class="mj-notice mj-notice--warn" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {captured.length === 0 && errors.length === 0 && (
        <div class="mj-working">
          <span class="mj-rec-dot" aria-hidden="true" />
          <span>Waiting for the tag to fire…</span>
        </div>
      )}

      {captured.length > 0 && (
        <ol class="mj-captures">
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

      <p class="mj-fine">Live tracking stays intercepted on this page until you reload it.</p>

      {!readOnly && (
        <div class="mj-section-footer">
          <button type="button" class="mj-btn mj-btn--ghost" onClick={onBackToCode}>
            Back to the code
          </button>
          <button type="button" class="mj-btn mj-btn--ghost" onClick={onRunAgain}>
            Run again
          </button>
          <button
            type="button"
            class="mj-btn mj-btn--primary"
            aria-disabled={approvable ? "false" : "true"}
            title={approvable ? undefined : "Needs at least one capture whose payload checks out"}
            onClick={approvable ? onApprove : undefined}
          >
            Approve → Deploy
          </button>
        </div>
      )}
    </div>
  );
};

export default VerifySection;
