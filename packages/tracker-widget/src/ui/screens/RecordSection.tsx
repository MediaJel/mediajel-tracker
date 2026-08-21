import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { TimelineEventKind, WidgetGoal, WidgetSession } from "@mediajel/tracker-widget/types";
import { Fragment, VNode } from "@mediajel/tracker-widget/vendor";

/**
 * Section 01 — Record. Two states share the body: choosing the job (step `home`) and the live
 * recording (step `recording`). Stopping hands the work order to Evidence.
 */

export interface RecordSectionProps {
  session: WidgetSession;
  status: TrackerStatus;
  onStart(goal: WidgetGoal): void;
  onStop(): void;
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

const Warnings = ({ status }: { status: TrackerStatus }): VNode | null =>
  status.warnings.length === 0 ? null : (
    <div class="mj-notice mj-notice--warn" role="note">
      {status.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );

export const RecordSection = ({ session, status, onStart, onStop, onDiscard }: RecordSectionProps): VNode => {
  if (session.step === "home") {
    return (
      <div class="mj-section-body">
        <p class="mj-lede">
          Choose the job. The assistant records this page while you simulate it, then writes the tag.
        </p>
        <Warnings status={status} />
        <div class="mj-goals">
          <button type="button" class="mj-btn mj-btn--primary" onClick={() => onStart("transaction")}>
            Track transactions
          </button>
          <button type="button" class="mj-btn mj-btn--primary" onClick={() => onStart("signup")}>
            Track sign-ups
          </button>
        </div>
      </div>
    );
  }

  const counts = countByKind(session);
  const job = session.goal === "transaction" ? "a transaction" : "a sign-up";

  return (
    <div class="mj-section-body">
      <p class="mj-lede">
        Simulate {job} on this page now — place the order the way a customer would. Navigating is fine; the recording
        follows.
      </p>
      <div class="mj-rec-row">
        <span class="mj-rec-dot" aria-hidden="true" />
        <span class="mj-rec-label">REC</span>
        <span class="mj-rec-meta">
          {elapsed(session)} · {session.timeline.length} events · {session.pages.length}{" "}
          {session.pages.length === 1 ? "page" : "pages"}
        </span>
      </div>
      {counts.length > 0 && (
        <dl class="mj-counts">
          {counts.map(([label, count]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{count}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      <div class="mj-section-footer">
        <button type="button" class="mj-btn mj-btn--ghost" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" class="mj-btn mj-btn--primary" onClick={onStop}>
          Stop recording
        </button>
      </div>
    </div>
  );
};

export default RecordSection;
