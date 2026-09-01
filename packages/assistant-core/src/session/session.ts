import {
  EVENT_CAP,
  SESSION_SERIALIZED_CAP,
  applyBounds,
  nextEvictionIndex,
} from "@mediajel/assistant-core/session/bounds";
import { newId } from "@mediajel/assistant-core/session/ids";
import { WIDGET_SESSION_VERSION, WidgetGoal, WidgetSession } from "@mediajel/assistant-core/types";

/**
 * The session as a value: how one is made, how one is recognised, and how one is kept inside
 * its size budget. No storage, no listeners, no clock beyond `Date.now()` at creation.
 *
 * This used to live inside the store, which meant the eviction policy could only be exercised
 * through a `Storage`. The store now lives in the extension's background — asynchronous, and a
 * job per site — so the policy that decides which evidence may be dropped moved here, where it
 * is the same in the panel, the background and a test.
 */

export const createSession = (init: { goal?: WidgetGoal } = {}): WidgetSession => ({
  v: WIDGET_SESSION_VERSION,
  id: newId("ses"),
  goal: init.goal ?? "transaction",
  step: "home",
  startedAt: Date.now(),
  pages: [],
  timeline: [],
  markedIds: [],
});

/** Shape check, not validation: enough to be sure we are not about to render someone else's data. */
export const isUsableSession = (value: unknown): value is WidgetSession => {
  const candidate = value as Partial<WidgetSession> | null;
  return (
    !!candidate &&
    typeof candidate === "object" &&
    candidate.v === WIDGET_SESSION_VERSION &&
    typeof candidate.id === "string" &&
    Array.isArray(candidate.timeline) &&
    Array.isArray(candidate.pages) &&
    Array.isArray(candidate.markedIds)
  );
};

/** A copy with the next evictable event removed, or null when nothing may be dropped. */
export const shrink = (session: WidgetSession): WidgetSession | null => {
  const index = nextEvictionIndex(session);
  if (index === -1) return null;

  const timeline = session.timeline.slice();
  timeline.splice(index, 1);
  return { ...session, timeline, truncated: true };
};

/** Clamp oversized text and hold the timeline at EVENT_CAP. Cheap enough to run every update. */
export const enforce = (draft: WidgetSession): WidgetSession => {
  let timeline = draft.timeline;
  let truncated = draft.truncated;

  const bounded = timeline.map(applyBounds);
  if (bounded.some((event, i) => event !== timeline[i])) timeline = bounded;

  if (timeline.length > EVENT_CAP) {
    timeline = timeline.slice();
    while (timeline.length > EVENT_CAP) {
      const index = nextEvictionIndex({ ...draft, timeline });
      // Everything left is marked or structural. The cap yields; the evidence does not.
      if (index === -1) break;
      timeline.splice(index, 1);
      truncated = true;
    }
  }

  if (timeline === draft.timeline && truncated === draft.truncated) return draft;
  return { ...draft, timeline, truncated };
};

/**
 * Serialize a session, shrinking it until it fits `cap`. Returns the payload alongside the
 * session it actually represents — which may have lost events, and the caller must install that
 * version rather than the one it handed in, or the recording and what was written disagree.
 *
 * `null` means the session could not be serialized at all (a cycle reached the timeline);
 * losing one write is better than throwing on a client's page.
 */
export const serializeWithin = (
  session: WidgetSession,
  cap: number = SESSION_SERIALIZED_CAP,
): { payload: string; session: WidgetSession; shrunk: boolean } | null => {
  let candidate = session;
  let shrunk = false;

  for (;;) {
    let payload: string;
    try {
      payload = JSON.stringify(candidate);
    } catch {
      return null;
    }
    if (payload.length <= cap) return { payload, session: candidate, shrunk };

    const smaller = shrink(candidate);
    // Nothing left that may be dropped: hand back the oversized payload and let the caller's
    // storage decide. A recording is never thinned past its marked and structural events.
    if (!smaller) return { payload, session: candidate, shrunk };
    candidate = smaller;
    shrunk = true;
  }
};
