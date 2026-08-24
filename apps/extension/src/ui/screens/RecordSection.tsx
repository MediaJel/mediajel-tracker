import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import { TimelineEventKind, WidgetGoal, WidgetSession } from "@mediajel/assistant-core/types";
import { Fragment, ReactNode } from "react";

/**
 * Section 01 — Record. Two states share the body: choosing the job (step `home`) and the live
 * recording (step `recording`). Stopping hands the work order to Evidence.
 */

export interface RecordSectionProps {
  session: WidgetSession;
  status: TrackerStatus;
  onStart(goal: WidgetGoal): void;
  onDiscard(): void;
}

const KIND_LABELS: Partial<Record<TimelineEventKind, string>> = {
  network: "requests",
  datalayer: "dataLayer",
  form: "forms",
  click: "clicks",
  nav: "routes",
  dom: "page text",
  storage: "storage",
  message: "messages",
};

const countByKind = (session: WidgetSession): [string, number][] => {
  const counts = new Map<TimelineEventKind, number>();
  for (const event of session.timeline) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  return Object.entries(KIND_LABELS)
    .map(([kind, label]): [string, number] => [label as string, counts.get(kind as TimelineEventKind) ?? 0])
    .filter(([, count]) => count > 0);
};

const elapsed = (session: WidgetSession): string => {
  const total = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const Warnings = ({ status }: { status: TrackerStatus }): ReactNode | null =>
  status.warnings.length === 0 ? null : (
    <div className="mj-notice mj-notice--warn" role="note">
      {status.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );

export const RecordSection = ({ session, status, onStart, onDiscard }: RecordSectionProps): ReactNode => {
  if (session.step === "home") {
    return (
      <div className="mj-section-body">
        <p className="mj-lede">
          Choose the job. The assistant records this page while you simulate it, then writes the tag.
        </p>
        <Warnings status={status} />
        <div className="mj-goals">
          <button type="button" className="mj-btn mj-btn--primary" onClick={() => onStart("transaction")}>
            Track transactions
          </button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={() => onStart("signup")}>
            Track sign-ups
          </button>
        </div>
      </div>
    );
  }

  const counts = countByKind(session);
  const job = session.goal === "transaction" ? "a transaction" : "a sign-up";

  return (
    <div className="mj-section-body">
      <p className="mj-lede">
        Simulate {job} on this page now — place the order the way a customer would. Navigating is fine; the recording
        follows.
      </p>
      <div className="mj-rec-row">
        <span className="mj-rec-dot" aria-hidden="true" />
        <span className="mj-rec-label">REC</span>
        <span className="mj-rec-meta">
          {elapsed(session)} · {session.timeline.length} events · {session.pages.length}{" "}
          {session.pages.length === 1 ? "page" : "pages"}
        </span>
      </div>
      {counts.length > 0 && (
        <dl className="mj-counts">
          {counts.map(([label, count]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{count}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      <div className="mj-section-footer">
        <button type="button" className="mj-btn mj-btn--ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
};

export default RecordSection;
