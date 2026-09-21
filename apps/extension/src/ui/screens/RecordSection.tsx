import { TrackerStatus } from "@mediajel/assistant-core/tags";
import { TimelineEventKind, WidgetGoal, WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode } from "react";

import { Definitions } from "~/ui/components/Definitions";
import { Empty, Lede, RecDot, SectionBody, SectionFooter } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";

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
    <Alert tone="warn" role="note" className="mb-3">
      {status.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </Alert>
  );

/** The live readout: the recording light, REC, and the clock beside what has been caught so far. */
const Readout = ({ session }: { session: WidgetSession }): ReactNode => (
  <div data-slot="rec" className="mb-2.5 flex items-center gap-2">
    <RecDot />
    <span className="font-display text-xs font-bold tracking-stamp text-primary">REC</span>
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {elapsed(session)} · {session.timeline.length} events · {session.pages.length}{" "}
      {session.pages.length === 1 ? "page" : "pages"}
    </span>
  </div>
);

/**
 * What has been caught, by kind — or, while nothing has, which it is. "0 events" beside a running
 * clock is the one moment an operator cannot tell a working recorder from a broken one, so the
 * empty state says which it is and what would end it: the recorder is genuinely idle until the
 * page does something, and a page at rest between clicks is the expected case, not a fault.
 */
const Caught = ({ session }: { session: WidgetSession }): ReactNode => {
  const counts = countByKind(session);
  if (counts.length === 0) {
    return (
      <Empty role="status">
        Nothing yet. The recorder is watching this page and stays quiet until it does something — the first click,
        request or route change will appear here.
      </Empty>
    );
  }
  return <Definitions entries={counts} />;
};

export const RecordSection = ({ session, status, onStart, onDiscard }: RecordSectionProps): ReactNode => {
  if (session.step === "home") {
    return (
      <SectionBody>
        <Lede>
          Choose the job. The assistant records this page while you simulate it, then writes the tag, proves it here,
          and deploys it.
        </Lede>
        <Warnings status={status} />
        <div data-slot="goals" className="grid gap-2">
          <Button type="button" onClick={() => onStart("transaction")}>
            Track transactions
          </Button>
          <Button type="button" onClick={() => onStart("signup")}>
            Track sign-ups
          </Button>
        </div>
      </SectionBody>
    );
  }

  const job = session.goal === "transaction" ? "a transaction" : "a sign-up";
  return (
    <SectionBody>
      <Lede>
        Simulate {job} on this page now — place the order the way a customer would. Navigating is fine; the recording
        follows.
      </Lede>
      <Readout session={session} />
      <Caught session={session} />
      <SectionFooter>
        <Button type="button" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
      </SectionFooter>
    </SectionBody>
  );
};

export default RecordSection;
