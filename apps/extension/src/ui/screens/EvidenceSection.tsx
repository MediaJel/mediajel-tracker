import { Candidate, suggestCandidates } from "@mediajel/assistant-core/ai/suggest";
import { describeEvent, factsLine } from "@mediajel/assistant-core/recorder/describe";
import { TimelineEvent, WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode, useId, useMemo, useState } from "react";

import { cn } from "~/lib/utils";
import { Fine, Lede, Machine, SectionBody, SectionFooter } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Card, CardFooter } from "~/ui/components/ui/card";
import { Field, FieldLabel } from "~/ui/components/ui/field";
import { Textarea } from "~/ui/components/ui/textarea";
import { Check, KindIcon } from "~/ui/icons";

/**
 * Section 02 — Evidence. Pointing at the moment is OPTIONAL. The sheet leads with its best
 * guess ("This looks like the purchase") for a yes/no; a yes pins it, a no hands the operator
 * the timeline to point themselves — and they can always skip and let the model work it out
 * from the whole recording. The timeline speaks plain language: what happened, when, with
 * the order id and total pulled out of whatever carried them.
 */

export interface EvidenceSectionProps {
  session: WidgetSession;
  onToggleMark(id: string): void;
  onNotes(notes: string): void;
  onBackToRecording(): void;
  onMode(mode: "suggest" | "pinpoint"): void;
  /** Why Generate is not available yet ("" when it is). */
  generateBlocked: string;
  /** Peeking at a finished section: pins still work (Regenerate honors them), no footer. */
  readOnly?: boolean;
}

type Mode = "suggest" | "pinpoint";

const seconds = (t: number): string => `${(t / 1000).toFixed(1)}s`;

/** The `+12.4s` column: mono, tabular, soft. */
const Time = ({ t }: { t: number }): ReactNode => (
  <span className="font-mono text-2xs text-muted-foreground tabular-nums">+{seconds(t)}</span>
);

const Suggestion = ({
  candidate,
  index,
  onYes,
  onNo,
}: {
  candidate: Candidate;
  index: number;
  onYes(): void;
  onNo(): void;
}): ReactNode => {
  const reading = describeEvent(candidate.event);
  return (
    <Card role="group" aria-label={`Suggestion ${index + 1}`}>
      <div className="flex items-start gap-2.5">
        <KindIcon kind={candidate.event.kind} className="mt-px size-5 flex-none text-primary" />
        <div className="flex min-w-0 flex-auto flex-col gap-[3px] text-base">
          <strong className="leading-[1.3] font-semibold">{reading.title}</strong>
          {candidate.facts ? <span className="text-sm text-primary tabular-nums">{candidate.facts}</span> : null}
          <span className="text-sm text-muted-foreground">{candidate.reason}</span>
        </div>
        <Time t={candidate.event.t} />
      </div>
      <CardFooter>
        <Button type="button" variant="outline" onClick={onNo}>
          No, not this
        </Button>
        <Button type="button" onClick={onYes}>
          <Check className="size-3.5" /> Yes, that’s it
        </Button>
      </CardFooter>
    </Card>
  );
};

/** The rail: a hairline running through every dot, broken only at the ends of the list. */
const Rail = ({ edge, children }: { edge: { first: boolean; last: boolean }; children: ReactNode }): ReactNode => (
  <span
    className="relative w-[22px] flex-none before:absolute before:top-0 before:bottom-0 before:left-[10.5px] before:w-px before:bg-border data-[first]:before:top-[11px] data-[last]:before:bottom-auto data-[last]:before:h-[11px]"
    aria-hidden="true"
    data-first={edge.first || undefined}
    data-last={edge.last || undefined}
  >
    {children}
  </span>
);

const Dot = ({ kind, pinned, quiet }: { kind: string; pinned: boolean; quiet: boolean }): ReactNode => (
  <span
    className={cn(
      "relative flex size-[22px] items-center justify-center rounded-full border border-border bg-sheet text-muted-foreground [&_svg]:size-3",
      quiet && "text-ink-faint",
      pinned && "border-primary bg-primary text-primary-foreground",
    )}
  >
    {pinned ? <Check /> : <KindIcon kind={kind} />}
  </span>
);

const Title = ({ title, quiet, pinned, facts }: { title: string; quiet: boolean; pinned: boolean; facts: string }) => (
  <>
    <span
      className={cn(
        "text-base leading-[1.3] wrap-anywhere",
        quiet && "text-muted-foreground",
        pinned && "font-semibold",
      )}
    >
      {title}
    </span>
    {facts ? <span className="text-xs text-primary tabular-nums">{facts}</span> : null}
  </>
);

/** "This is the one": a pill that only shows itself when its row is under the pointer or holds focus. */
const Pin = ({ pinned, onPin }: { pinned: boolean; onPin(): void }): ReactNode => (
  <button
    type="button"
    className={cn(
      "flex-none cursor-pointer self-center rounded-full border border-border bg-sheet px-2 py-[3px] text-xs text-muted-foreground opacity-0 transition-opacity duration-[120ms] ease-out group-focus-within:opacity-100 group-hover:opacity-100",
      pinned && "border-primary font-semibold text-primary opacity-100",
    )}
    aria-pressed={pinned}
    onClick={onPin}
  >
    {pinned ? "This is it" : "This is the one"}
  </button>
);

const Entry = ({
  event,
  edge,
  pinned,
  expanded,
  onExpand,
  onPin,
}: {
  event: TimelineEvent;
  /** Where the rail ends: it runs through every dot and is broken only at the list's ends. */
  edge: { first: boolean; last: boolean };
  pinned: boolean;
  expanded: boolean;
  onExpand(): void;
  onPin(): void;
}): ReactNode => {
  const reading = describeEvent(event);
  return (
    <li className="group relative flex min-h-10 gap-2.5" data-pinned={pinned || undefined}>
      <Rail edge={edge}>
        <Dot kind={event.kind} pinned={pinned} quiet={reading.background} />
      </Rail>
      <div className="flex min-w-0 flex-auto flex-wrap items-start gap-x-2 gap-y-0.5 pt-0.5 pb-3">
        <button
          type="button"
          className="flex min-w-0 flex-[1_1_160px] cursor-pointer flex-col gap-px border-0 bg-transparent p-0 text-left"
          aria-expanded={expanded}
          onClick={onExpand}
        >
          <Time t={event.t} />
          <Title title={reading.title} quiet={reading.background} pinned={pinned} facts={factsLine(reading.facts)} />
        </button>
        {expanded && (
          <div className="mt-1 flex-[1_1_100%]">
            <Machine>{JSON.stringify(event, null, 2)}</Machine>
          </div>
        )}
        <Pin pinned={pinned} onPin={onPin} />
      </div>
    </li>
  );
};

/** The guess, for a yes or a no — and the way to the whole record instead. */
const SuggestMode = ({
  goalWord,
  candidate,
  onYes,
  onNo,
  onPinpoint,
}: {
  goalWord: string;
  candidate: Candidate;
  onYes(): void;
  onNo(): void;
  onPinpoint(): void;
}): ReactNode => (
  <>
    <Lede>
      We watched the page while you placed the {goalWord}. This looks like the moment it happened — is that right?
    </Lede>
    <Suggestion candidate={candidate} index={0} onYes={onYes} onNo={onNo} />
    <Fine>
      Not sure?{" "}
      <Button type="button" variant="link" size="none" onClick={onPinpoint}>
        Show me everything that happened
      </Button>{" "}
      — or just generate and the model will work it out from the whole recording.
    </Fine>
  </>
);

const moreLabel = (hiddenCount: number, showAll: boolean): string => {
  if (showAll) return "Hide the background activity";
  return `Show ${hiddenCount} background item${hiddenCount === 1 ? "" : "s"} (tracker traffic, storage, page loads)`;
};

const MoreButton = ({
  hiddenCount,
  showAll,
  onToggle,
}: {
  hiddenCount: number;
  showAll: boolean;
  onToggle(): void;
}) => {
  if (hiddenCount === 0 && !showAll) return null;
  return (
    <Button type="button" variant="link" size="none" className="mb-3 ml-8 block text-sm" onClick={onToggle}>
      {moreLabel(hiddenCount, showAll)}
    </Button>
  );
};

interface TimelineProps {
  session: WidgetSession;
  entries: TimelineEvent[];
  expandedId: string | null;
  onExpand(id: string | null): void;
  onToggleMark(id: string): void;
}

const Timeline = ({ session, entries, expandedId, onExpand, onToggleMark }: TimelineProps): ReactNode => (
  <ol className="m-0 mt-1 mb-1.5 list-none p-0" aria-label="What happened on the page">
    {entries.map((event, index) => (
      <Entry
        key={event.id}
        event={event}
        edge={{ first: index === 0, last: index === entries.length - 1 }}
        pinned={session.markedIds.includes(event.id)}
        expanded={expandedId === event.id}
        onExpand={() => onExpand(expandedId === event.id ? null : event.id)}
        onPin={() => onToggleMark(event.id)}
      />
    ))}
    {entries.length === 0 && <li className="p-2.5 text-sm text-muted-foreground">Nothing was recorded yet.</li>}
  </ol>
);

/** Everything that happened, in order, for the operator to point at. */
const PinpointMode = ({
  goalWord,
  hasPins,
  hiddenCount,
  showAll,
  onToggleAll,
  ...timeline
}: TimelineProps & {
  goalWord: string;
  hasPins: boolean;
  hiddenCount: number;
  showAll: boolean;
  onToggleAll(): void;
}): ReactNode => (
  <>
    {hasPins ? (
      <Lede>
        Got it — the {goalWord} is the moment below marked with a check. Add another if it happened in more than one
        place, or generate.
      </Lede>
    ) : (
      <Lede>
        Here is everything that happened, in order. Point at the moment that <em>is</em> the {goalWord} — or skip it and
        let the model decide.
      </Lede>
    )}
    <Timeline {...timeline} />
    <MoreButton hiddenCount={hiddenCount} showAll={showAll} onToggle={onToggleAll} />
  </>
);

const Notes = ({ notes, onNotes }: { notes: string; onNotes(notes: string): void }): ReactNode => {
  const id = useId();
  return (
    <Field className="mb-2.5">
      <FieldLabel htmlFor={id}>Anything the model should know? (optional)</FieldLabel>
      <Textarea
        id={id}
        rows={2}
        placeholder="e.g. the total includes tax, the order number is in the URL"
        value={notes}
        onChange={(event) => onNotes(event.currentTarget.value)}
      />
    </Field>
  );
};

/** Which of the two readings of the sheet to show: the guess, or the whole record. */
const modeOf = (session: WidgetSession, pinnedCount: number, candidateCount: number): Mode => {
  if (session.evidenceMode) return session.evidenceMode;
  return pinnedCount === 0 && candidateCount > 0 ? "suggest" : "pinpoint";
};

/** The guess is shown when the mode says so and there is still a candidate left to show. */
const suggesting = (session: WidgetSession, pinnedCount: number, candidates: Candidate[]): boolean =>
  modeOf(session, pinnedCount, candidates.length) === "suggest" && candidates.length > 0;

/** The operator's own contribution: notes for the model, the way back, and why Generate waits. */
const Contribute = ({
  session,
  generateBlocked,
  onNotes,
  onBackToRecording,
}: Pick<EvidenceSectionProps, "session" | "generateBlocked" | "onNotes" | "onBackToRecording">): ReactNode => (
  <>
    <Notes notes={session.notes ?? ""} onNotes={onNotes} />
    <SectionFooter>
      <Button type="button" variant="outline" onClick={onBackToRecording}>
        Keep recording
      </Button>
    </SectionFooter>
    {generateBlocked && <p className="mt-1.5 mb-0 text-right text-xs text-warning-text">{generateBlocked}</p>}
  </>
);

/** The events on show: everything, or only what is not background noise (pins always show). */
const visibleEntries = (session: WidgetSession, showAll: boolean): TimelineEvent[] => {
  const ordered = session.timeline.slice().sort((a, b) => a.t - b.t);
  if (showAll) return ordered;
  return ordered.filter((event) => !describeEvent(event).background || session.markedIds.includes(event.id));
};

const GOAL_WORD = { transaction: "purchase", signup: "sign-up" } as const;

export const EvidenceSection = (props: EvidenceSectionProps): ReactNode => {
  const { session, onToggleMark, onMode, readOnly = false } = props;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const goalWord = GOAL_WORD[session.goal];
  const candidates = useMemo(
    () => suggestCandidates(session).filter((candidate) => !dismissed.includes(candidate.event.id)),
    [session, dismissed],
  );
  const pinnedCount = useMemo(
    () => session.timeline.filter((event) => session.markedIds.includes(event.id)).length,
    [session.timeline, session.markedIds],
  );
  const entries = useMemo(() => visibleEntries(session, showAll), [session, showAll]);

  const dismiss = (candidate: Candidate): void => {
    setDismissed([...dismissed, candidate.event.id]);
    if (candidates.length <= 1) onMode("pinpoint");
  };

  return (
    <SectionBody>
      {suggesting(session, pinnedCount, candidates) ? (
        <SuggestMode
          goalWord={goalWord}
          candidate={candidates[0]}
          onYes={() => onToggleMark(candidates[0].event.id)}
          onNo={() => dismiss(candidates[0])}
          onPinpoint={() => onMode("pinpoint")}
        />
      ) : (
        <PinpointMode
          goalWord={goalWord}
          hasPins={pinnedCount > 0}
          session={session}
          entries={entries}
          expandedId={expandedId}
          onExpand={setExpandedId}
          onToggleMark={onToggleMark}
          hiddenCount={session.timeline.length - entries.length}
          showAll={showAll}
          onToggleAll={() => setShowAll(!showAll)}
        />
      )}

      {session.generationError && (
        <Alert tone="warn" role="alert" className="mb-3">
          <p>{session.generationError}</p>
        </Alert>
      )}

      {!readOnly && <Contribute {...props} />}
    </SectionBody>
  );
};

export default EvidenceSection;
