import { guard } from "@mediajel/tracker-core/utils/guard";
import logger from "@mediajel/tracker-widget/log";
import {
  EVENT_CAP,
  SESSION_SERIALIZED_CAP,
  applyBounds,
  nextEvictionIndex,
} from "@mediajel/tracker-widget/session/bounds";
import { newId } from "@mediajel/tracker-widget/session/ids";
import { WIDGET_SESSION_KEY } from "@mediajel/tracker-widget/session/keys";
import { TransitionOptions, transition as machineTransition } from "@mediajel/tracker-widget/state/machine";
import { WIDGET_SESSION_VERSION, WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/tracker-widget/types";

/**
 * The recorded session: one object, one storage key, one place that decides when it is written.
 *
 * Writing on every captured event would stringify megabytes several times a second, so writes
 * are debounced. Debouncing alone would lose the tail of a recording exactly when it matters —
 * the purchase usually IS the navigation — so the store also writes synchronously on every
 * signal the browser gives that the page is going away, and exposes `flush()` for the recorder
 * to call after an event worth surviving a crash (network, dataLayer, form, nav).
 */

/** How long a burst of updates is allowed to coalesce before it reaches storage. */
export const PERSIST_DEBOUNCE_MS = 200;

export interface SessionStore {
  /** The current session. Always a complete object — never null, never a partial. */
  get(): WidgetSession;
  /**
   * Applies `mutate` to a copy and installs the result. The copy always carries a FRESH
   * `timeline` array, so pushing onto `draft.timeline` never mutates an array a previous
   * session object still points at — both the session and its timeline change identity when
   * their content changes, which is what lets the screens memoize on either.
   *
   * `update` is for data. A `step` written here is ignored and restored — `transition()` is
   * the only door the step goes through.
   */
  update(mutate: (draft: WidgetSession) => void): WidgetSession;
  /**
   * The one legal way to change `session.step`: runs the machine, persists only a move the
   * machine allows, and returns the step actually in force afterwards.
   */
  transition(to: WidgetStep, options?: TransitionOptions): WidgetStep;
  subscribe(listener: (session: WidgetSession) => void): () => void;
  /**
   * Write now, synchronously, and cancel any pending debounce. This is the `flushNow` the
   * recorder calls after an important event; it is also what the page-lifecycle listeners run.
   */
  flush(): void;
  /** Throw the recording away and start a new one. Persisted immediately. */
  reset(init?: { goal?: WidgetGoal }): WidgetSession;
  /**
   * Detach the lifecycle listeners and drop any pending write. Without this, `disable()` would
   * clear the storage key only for a queued debounce — or the next `pagehide` — to write it
   * straight back.
   */
  dispose(): void;
}

const createSession = (init: { goal?: WidgetGoal } = {}): WidgetSession => ({
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
const isUsableSession = (value: unknown): value is WidgetSession => {
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

const read = (storage: Storage): WidgetSession | null => {
  try {
    const raw = storage.getItem(WIDGET_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isUsableSession(parsed) ? parsed : null;
  } catch {
    // Unparseable, or a storage that throws on access (sandboxed iframe, blocked cookies).
    // Either way the right answer is a fresh session, never an exception on a client's page.
    return null;
  }
};

/**
 * Storage is full. Both spellings are DOMException names in the wild, and the numeric codes
 * cover the browsers that predate named DOMExceptions.
 */
const isQuotaError = (err: unknown): boolean => {
  const candidate = err as { name?: string; code?: number } | null;
  return (
    candidate?.name === "QuotaExceededError" ||
    candidate?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate?.code === 22 ||
    candidate?.code === 1014
  );
};

/** A copy with the next evictable event removed, or null when nothing may be dropped. */
const shrink = (session: WidgetSession): WidgetSession | null => {
  const index = nextEvictionIndex(session);
  if (index === -1) return null;

  const timeline = session.timeline.slice();
  timeline.splice(index, 1);
  return { ...session, timeline, truncated: true };
};

/** Clamp oversized text and hold the timeline at EVENT_CAP. Cheap enough to run every update. */
const enforce = (draft: WidgetSession): WidgetSession => {
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

/** `caps.serializedCap` exists for the tests: the 1.5 MB default is deliberately unreachable
 *  with bounded events, and the pre-emptive shrink branch still deserves a direct test. */
export const createSessionStore = (
  storage: Storage = sessionStorage,
  caps: { serializedCap?: number } = {},
): SessionStore => {
  const serializedCap = caps.serializedCap ?? SESSION_SERIALIZED_CAP;
  let session = read(storage) ?? createSession();
  let listeners: ((session: WidgetSession) => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const notify = (): void => {
    for (const listener of listeners) guard(listener, "session-subscriber")(session);
  };

  const cancel = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const persist = (): void => {
    cancel();
    if (disposed) return;

    let candidate = session;
    let shrunk = false;

    for (;;) {
      let payload: string;
      try {
        payload = JSON.stringify(candidate);
      } catch (err) {
        // A page object with a cycle in it made it into the timeline. Losing this write is
        // better than throwing, and the next capture will most likely serialize fine.
        logger.warn("Session could not be serialized; skipping this write:", err);
        return;
      }

      // Our own budget, checked before the browser's. Over the cap we shrink pre-emptively;
      // if nothing may be dropped we still attempt the write and let the browser decide.
      if (payload.length > serializedCap) {
        const smaller = shrink(candidate);
        if (smaller) {
          candidate = smaller;
          shrunk = true;
          continue;
        }
      }

      try {
        storage.setItem(WIDGET_SESSION_KEY, payload);
        // Only commit the eviction once the write actually landed — a recording must never be
        // thinned out for a write that never happened.
        if (shrunk) {
          session = candidate;
          notify();
        }
        return;
      } catch (err) {
        if (!isQuotaError(err)) {
          logger.warn("Session could not be stored:", err);
          return;
        }
        const smaller = shrink(candidate);
        if (!smaller) {
          logger.warn(
            "Storage is full and every remaining event is marked or structural — the recording " +
              "is kept in memory but will not survive a navigation.",
          );
          return;
        }
        candidate = smaller;
        shrunk = true;
      }
    }
  };

  const schedule = (): void => {
    if (disposed || timer !== null) return;
    timer = setTimeout(guard(persist, "session-persist"), PERSIST_DEBOUNCE_MS);
  };

  const onHidden = guard((): void => {
    if (document.visibilityState === "hidden") persist();
  }, "session-visibilitychange");
  const onPageAway = guard(persist, "session-pagehide");

  window.addEventListener("pagehide", onPageAway);
  window.addEventListener("beforeunload", onPageAway);
  document.addEventListener("visibilitychange", onHidden);

  return {
    get: () => session,

    update: (mutate) => {
      const stepBefore = session.step;
      const draft = { ...session, timeline: session.timeline.slice() };
      mutate(draft);
      if (draft.step !== stepBefore) {
        // Data mutations do not get to move the work order. transition() is the door.
        logger.warn(`update() ignored a step change to "${draft.step}" — use transition().`);
        draft.step = stepBefore;
      }
      session = enforce(draft);
      schedule();
      notify();
      return session;
    },

    transition: (to, options) => {
      const next = machineTransition(session.step, to, options);
      if (next !== session.step) {
        session = { ...session, step: next };
        schedule();
        notify();
      }
      return session.step;
    },

    subscribe: (listener) => {
      listeners = listeners.concat(listener);
      return () => {
        listeners = listeners.filter((candidate) => candidate !== listener);
      };
    },

    flush: persist,

    reset: (init) => {
      session = createSession(init);
      persist();
      notify();
      return session;
    },

    dispose: () => {
      cancel();
      disposed = true;
      listeners = [];
      window.removeEventListener("pagehide", onPageAway);
      window.removeEventListener("beforeunload", onPageAway);
      document.removeEventListener("visibilitychange", onHidden);
    },
  };
};
