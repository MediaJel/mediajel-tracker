import { TimelineEvent, TimelineEventKind, WidgetSession } from "@mediajel/tracker-widget/types";

/**
 * The size policy for a recorded session — pure functions only, so the store can apply them
 * and the tests can assert them without touching Storage.
 *
 * A session lives in `sessionStorage`, which browsers cap at roughly 5 MB per origin and share
 * with whatever the client's own site keeps there. Recording a checkout can easily produce
 * megabytes of response bodies, so the widget spends a deliberate slice of that budget and
 * drops the cheapest evidence first rather than letting `setItem` fail and losing the lot.
 */

/**
 * Ceiling for the serialized session, in UTF-16 code units — the unit browsers actually charge
 * against the storage quota, and what `JSON.stringify(...).length` returns.
 */
export const SESSION_SERIALIZED_CAP = 1_500_000;

/** Per request/response body. Enough to see a purchase payload, far short of a HTML document. */
export const BODY_CHAR_CAP = 2_048;

/** Per DOM snapshot item. A price, a total or an order number, not an article. */
export const DOM_TEXT_CHAR_CAP = 160;

/** Hard ceiling on timeline length, applied before the byte cap. */
export const EVENT_CAP = 400;

/**
 * Cheapest evidence first. `dom` and `click` are re-derivable by looking at the page; `storage`
 * and `message` are rarely the signal a tag is built on; `network` is last because a response
 * body is usually the one thing that cannot be recovered. Kinds absent from this list —
 * `page`, `nav`, `form`, `datalayer`, `platform` — are never dropped: they are the spine of
 * the recording, and marked events of ANY kind are never dropped either.
 */
export const EVICTION_ORDER: readonly TimelineEventKind[] = ["dom", "click", "storage", "message", "network"];

/** Truncation marker. One character, so a clamped string still lands exactly on its cap. */
const ELLIPSIS = "…";

const clamp = (value: string, cap: number): string =>
  value.length <= cap ? value : value.slice(0, cap - ELLIPSIS.length) + ELLIPSIS;

/**
 * Returns a copy of `event` with its oversized text clamped, or the SAME object when it was
 * already within bounds. The store re-runs this across the whole timeline on every update, so
 * the identity fast path is what keeps that a handful of length comparisons rather than a deep
 * copy — and it keeps subscribers from seeing a "change" that changed nothing.
 */
export const applyBounds = (event: TimelineEvent): TimelineEvent => {
  if (event.kind === "network") {
    if (event.reqBody.length <= BODY_CHAR_CAP && event.resBody.length <= BODY_CHAR_CAP) return event;
    return {
      ...event,
      reqBody: clamp(event.reqBody, BODY_CHAR_CAP),
      resBody: clamp(event.resBody, BODY_CHAR_CAP),
    };
  }

  if (event.kind === "dom") {
    if (event.items.every((item) => item.text.length <= DOM_TEXT_CHAR_CAP)) return event;
    return {
      ...event,
      items: event.items.map((item) => ({ ...item, text: clamp(item.text, DOM_TEXT_CHAR_CAP) })),
    };
  }

  return event;
};

/**
 * Index of the next event to drop, or -1 when nothing may be dropped.
 *
 * Walks `EVICTION_ORDER` and, within a kind, takes the oldest unmarked event — the timeline is
 * append-ordered, so the lowest index is the earliest. Callers loop until it returns -1 or the
 * session fits.
 */
export const nextEvictionIndex = (session: WidgetSession): number => {
  const marked = new Set(session.markedIds);

  for (const kind of EVICTION_ORDER) {
    for (let i = 0; i < session.timeline.length; i += 1) {
      const event = session.timeline[i];
      if (event.kind === kind && !marked.has(event.id)) return i;
    }
  }

  return -1;
};

/** Size of the session as the browser will charge it: UTF-16 code units of its JSON. */
export const serializedSize = (session: WidgetSession): number => JSON.stringify(session).length;
