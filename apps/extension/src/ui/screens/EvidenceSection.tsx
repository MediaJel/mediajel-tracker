import { Candidate, suggestCandidates } from "@mediajel/assistant-core/ai/suggest";
import { describeEvent, factsLine } from "@mediajel/assistant-core/recorder/describe";
import { TimelineEvent, WidgetSession } from "@mediajel/assistant-core/types";
import { Check, KindIcon } from "~/ui/icons";
import { ReactNode, useMemo, useState } from "react";

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

const seconds = (t: number): string => `${(t / 1000).toFixed(1)}s`;

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
    <div className="mj-guess" role="group" aria-label={`Suggestion ${index + 1}`}>
      <div className="mj-guess-head">
        <KindIcon kind={candidate.event.kind} className="mj-guess-icon" />
        <div className="mj-guess-text">
          <strong>{reading.title}</strong>
          {candidate.facts ? <span className="mj-guess-facts">{candidate.facts}</span> : null}
          <span className="mj-guess-why">{candidate.reason}</span>
        </div>
        <span className="mj-tl-time">+{seconds(candidate.event.t)}</span>
      </div>
      <div className="mj-guess-actions">
        <button type="button" className="mj-btn mj-btn--ghost" onClick={onNo}>
          No, not this
        </button>
        <button type="button" className="mj-btn mj-btn--primary" onClick={onYes}>
          <Check className="mj-btn-icon" /> Yes, that’s it
        </button>
      </div>
    </div>
  );
};

const Entry = ({
  event,
  pinned,
  expanded,
  onExpand,
  onPin,
}: {
  event: TimelineEvent;
  pinned: boolean;
  expanded: boolean;
  onExpand(): void;
  onPin(): void;
}): ReactNode => {
  const reading = describeEvent(event);
  const facts = factsLine(reading.facts);
  return (
    <li className={`mj-tl${pinned ? " mj-tl--pinned" : ""}${reading.background ? " mj-tl--quiet" : ""}`}>
      <span className="mj-tl-rail" aria-hidden="true">
        <span className="mj-tl-dot">{pinned ? <Check /> : <KindIcon kind={event.kind} />}</span>
      </span>
      <div className="mj-tl-body">
        <button
          type="button"
          className="mj-tl-main"
          aria-expanded={String(expanded) as "true" | "false"}
          onClick={onExpand}
        >
          <span className="mj-tl-time">+{seconds(event.t)}</span>
          <span className="mj-tl-title">{reading.title}</span>
          {facts ? <span className="mj-tl-facts">{facts}</span> : null}
        </button>
        {expanded && (
          <div className="mj-tl-detail">
            <pre className="mj-ev-detail">{JSON.stringify(event, null, 2)}</pre>
          </div>
        )}
        <button
          type="button"
          className={`mj-tl-pin${pinned ? " mj-tl-pin--on" : ""}`}
          aria-pressed={String(pinned) as "true" | "false"}
          onClick={onPin}
        >
          {pinned ? "This is it" : "This is the one"}
        </button>
      </div>
    </li>
  );
};

export const EvidenceSection = ({
  session,
  onToggleMark,
  onNotes,
  onBackToRecording,
  onMode,
  generateBlocked,
  readOnly = false,
}: EvidenceSectionProps): ReactNode => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const goalWord = session.goal === "transaction" ? "purchase" : "sign-up";
  const candidates = useMemo(
    () => suggestCandidates(session).filter((candidate) => !dismissed.includes(candidate.event.id)),
    [session, dismissed],
  );
  const pinned = useMemo(
    () => session.timeline.filter((event) => session.markedIds.includes(event.id)),
    [session.timeline, session.markedIds],
  );

  const mode: "suggest" | "pinpoint" =
    session.evidenceMode ?? (pinned.length === 0 && candidates.length > 0 ? "suggest" : "pinpoint");

  const entries = useMemo(() => {
    const ordered = session.timeline.slice().sort((a, b) => a.t - b.t);
    return showAll
      ? ordered
      : ordered.filter((event) => !describeEvent(event).background || session.markedIds.includes(event.id));
  }, [session.timeline, session.markedIds, showAll]);
  const hiddenCount = session.timeline.length - entries.length;

  return (
    <div className="mj-section-body">
      {mode === "suggest" && pinned.length === 0 ? (
        <>
          <p className="mj-lede">
            We watched the page while you placed the {goalWord}. This looks like the moment it happened — is that right?
          </p>
          {candidates.slice(0, 1).map((candidate, index) => (
            <Suggestion
              key={candidate.event.id}
              candidate={candidate}
              index={index}
              onYes={() => onToggleMark(candidate.event.id)}
              onNo={() => {
                const next = [...dismissed, candidate.event.id];
                setDismissed(next);
                if (candidates.length <= 1) onMode("pinpoint");
              }}
            />
          ))}
          <p className="mj-fine">
            Not sure?{" "}
            <button type="button" className="mj-link" onClick={() => onMode("pinpoint")}>
              Show me everything that happened
            </button>{" "}
            — or just generate and the model will work it out from the whole recording.
          </p>
        </>
      ) : (
        <>
          {pinned.length > 0 ? (
            <p className="mj-lede">
              Got it — the {goalWord} is the moment below marked with a check. Add another if it happened in more than
              one place, or generate.
            </p>
          ) : (
            <p className="mj-lede">
              Here is everything that happened, in order. Point at the moment that <em>is</em> the {goalWord} — or skip
              it and let the model decide.
            </p>
          )}

          <ol className="mj-timeline" aria-label="What happened on the page">
            {entries.map((event) => (
              <Entry
                key={event.id}
                event={event}
                pinned={session.markedIds.includes(event.id)}
                expanded={expandedId === event.id}
                onExpand={() => setExpandedId(expandedId === event.id ? null : event.id)}
                onPin={() => onToggleMark(event.id)}
              />
            ))}
            {entries.length === 0 && <li className="mj-ev-empty">Nothing was recorded yet.</li>}
          </ol>
          {hiddenCount > 0 || showAll ? (
            <button type="button" className="mj-link mj-tl-more" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? "Hide the background activity"
                : `Show ${hiddenCount} background item${hiddenCount === 1 ? "" : "s"} (tracker traffic, storage, page loads)`}
            </button>
          ) : null}
        </>
      )}

      {session.generationError && (
        <div className="mj-notice mj-notice--warn" role="alert">
          <p>{session.generationError}</p>
        </div>
      )}

      {!readOnly && (
        <label className="mj-field">
          <span className="mj-field-label">Anything the model should know? (optional)</span>
          <textarea
            className="mj-textarea"
            rows={2}
            placeholder="e.g. the total includes tax, the order number is in the URL"
            value={session.notes ?? ""}
            onChange={(event) => onNotes((event.target as HTMLTextAreaElement).value)}
          />
        </label>
      )}

      {!readOnly && (
        <div className="mj-section-footer">
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onBackToRecording}>
            Keep recording
          </button>
        </div>
      )}
      {!readOnly && generateBlocked && <p className="mj-blocked-note">{generateBlocked}</p>}
    </div>
  );
};

export default EvidenceSection;
