import { TimelineEvent, TimelineEventKind, WidgetSession } from "@mediajel/tracker-widget/types";
import { VNode, useMemo, useState } from "@mediajel/tracker-widget/vendor";

/**
 * Section 02 — Evidence. The recorded timeline, dense and scannable; the operator pins the
 * event(s) that ARE the purchase or sign-up. Pinned events are the exhibits the model builds
 * from — everything else travels compressed. Nothing here guesses: the score only sorts.
 */

export interface EvidenceSectionProps {
  session: WidgetSession;
  onToggleMark(id: string): void;
  onNotes(notes: string): void;
  onBackToRecording(): void;
  onGenerate(): void;
  /** Why Generate is not available yet ("" when it is). */
  generateBlocked: string;
}

const BADGES: Record<TimelineEventKind, string> = {
  page: "PG",
  network: "NET",
  datalayer: "DL",
  form: "FM",
  click: "CL",
  nav: "NV",
  dom: "DM",
  storage: "ST",
  message: "PM",
  platform: "PF",
};

const FILTERS: { label: string; kinds: TimelineEventKind[] }[] = [
  { label: "All", kinds: [] },
  { label: "Data", kinds: ["datalayer", "message", "storage"] },
  { label: "Network", kinds: ["network"] },
  { label: "Actions", kinds: ["form", "click"] },
  { label: "Pages", kinds: ["nav", "page", "dom"] },
];

const detailOf = (event: TimelineEvent): unknown => {
  switch (event.kind) {
    case "network": {
      const { method, url, status, reqType, reqBody, resType, resBody, ms, category } = event;
      return { method, url, status, reqType, reqBody, resType, resBody, ms, category };
    }
    case "datalayer":
      return { layer: event.layer, replayed: event.replayed ?? false, data: event.data };
    case "form":
      return { selector: event.selector, action: event.action, method: event.method, fields: event.fields };
    case "click":
      return { selector: event.selector, tag: event.tag, text: event.text, href: event.href };
    case "nav":
      return { via: event.sub, from: event.from, to: event.to };
    case "dom":
      return { items: event.items };
    case "storage":
      return { area: event.area, op: event.op, key: event.key, value: event.value };
    case "message":
      return { origin: event.origin, data: event.data };
    case "platform":
      return { detected: event.detected, globals: event.globals, spa: event.spa };
    default:
      return { summary: event.summary };
  }
};

const Row = ({
  event,
  marked,
  expanded,
  onExpand,
  onToggleMark,
}: {
  event: TimelineEvent;
  marked: boolean;
  expanded: boolean;
  onExpand(): void;
  onToggleMark(): void;
}): VNode => (
  <li class={`mj-ev${marked ? " mj-ev--marked" : ""}`}>
    <div class="mj-ev-row">
      <button type="button" class="mj-ev-main" aria-expanded={String(expanded) as "true" | "false"} onClick={onExpand}>
        <span class="mj-ev-badge">{BADGES[event.kind]}</span>
        <span class="mj-ev-time">+{(event.t / 1000).toFixed(1)}s</span>
        <span class="mj-ev-summary">{event.summary}</span>
        {event.score >= 5 && <span class="mj-ev-signal" title={`signal ${event.score}/10`} aria-hidden="true" />}
      </button>
      <button
        type="button"
        class="mj-ev-pin"
        aria-pressed={String(marked) as "true" | "false"}
        aria-label={marked ? "Unpin this event" : "Pin as evidence"}
        onClick={onToggleMark}
      >
        {marked ? "Pinned" : "Pin"}
      </button>
    </div>
    {expanded && <pre class="mj-ev-detail">{JSON.stringify(detailOf(event), null, 2)}</pre>}
  </li>
);

export const EvidenceSection = ({
  session,
  onToggleMark,
  onNotes,
  onBackToRecording,
  onGenerate,
  generateBlocked,
}: EvidenceSectionProps): VNode => {
  const [filter, setFilter] = useState(0);
  const [bySignal, setBySignal] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const marked = useMemo(
    () => session.timeline.filter((event) => session.markedIds.includes(event.id)),
    [session.timeline, session.markedIds],
  );

  const rows = useMemo(() => {
    const kinds = FILTERS[filter].kinds;
    const filtered = session.timeline.filter(
      (event) => !session.markedIds.includes(event.id) && (kinds.length === 0 || kinds.includes(event.kind)),
    );
    return bySignal ? filtered.slice().sort((a, b) => b.score - a.score || a.t - b.t) : filtered;
  }, [session.timeline, session.markedIds, filter, bySignal]);

  return (
    <div class="mj-section-body">
      <p class="mj-lede">
        Pin the moment that <em>is</em> the {session.goal === "transaction" ? "purchase" : "sign-up"} — a dataLayer
        push, a network response, a confirmation. Pinned events go to the model in full; the rest travel compressed.
      </p>

      {marked.length > 0 && (
        <ol class="mj-exhibits">
          {marked.map((event) => (
            <Row
              key={event.id}
              event={event}
              marked
              expanded={expandedId === event.id}
              onExpand={() => setExpandedId(expandedId === event.id ? null : event.id)}
              onToggleMark={() => onToggleMark(event.id)}
            />
          ))}
        </ol>
      )}

      <div class="mj-ev-tools" role="toolbar" aria-label="Timeline filters">
        {FILTERS.map((entry, index) => (
          <button
            type="button"
            key={entry.label}
            class={`mj-chip-filter${filter === index ? " mj-chip-filter--on" : ""}`}
            aria-pressed={String(filter === index) as "true" | "false"}
            onClick={() => setFilter(index)}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          class="mj-chip-filter mj-ev-order"
          onClick={() => setBySignal(!bySignal)}
          aria-label={`Order: ${bySignal ? "strongest signal first" : "chronological"}`}
        >
          {bySignal ? "By signal" : "By time"}
        </button>
      </div>

      <ol class="mj-ev-list">
        {rows.map((event) => (
          <Row
            key={event.id}
            event={event}
            marked={false}
            expanded={expandedId === event.id}
            onExpand={() => setExpandedId(expandedId === event.id ? null : event.id)}
            onToggleMark={() => onToggleMark(event.id)}
          />
        ))}
        {rows.length === 0 && <li class="mj-ev-empty">Nothing here under this filter.</li>}
      </ol>

      <label class="mj-field">
        <span class="mj-field-label">Notes for the model</span>
        <textarea
          class="mj-textarea"
          rows={2}
          placeholder="Anything it should know — e.g. the total includes tax, the order id is in the URL."
          value={session.notes ?? ""}
          onChange={(event) => onNotes((event.target as HTMLTextAreaElement).value)}
        />
      </label>

      <div class="mj-notice mj-notice--privacy" role="note">
        <p>
          Generate sends: {session.markedIds.length} pinned event{session.markedIds.length === 1 ? "" : "s"} in full ·{" "}
          {Math.max(0, session.timeline.length - session.markedIds.length)} compressed rows · site + tag context. PII
          was masked at capture; nothing has left this browser yet.
        </p>
      </div>

      <div class="mj-section-footer">
        <button type="button" class="mj-btn mj-btn--ghost" onClick={onBackToRecording}>
          Keep recording
        </button>
        <button
          type="button"
          class="mj-btn mj-btn--primary"
          aria-disabled={generateBlocked ? "true" : "false"}
          title={generateBlocked || undefined}
          onClick={onGenerate}
        >
          Generate code
        </button>
      </div>
      {generateBlocked && <p class="mj-blocked-note">{generateBlocked}</p>}
    </div>
  );
};

export default EvidenceSection;
