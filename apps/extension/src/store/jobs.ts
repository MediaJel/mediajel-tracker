import { Storage } from "@plasmohq/storage";

import { createSession, enforce, isUsableSession, serializeWithin } from "@mediajel/assistant-core/session/session";
import { TransitionOptions, transition as machineTransition } from "@mediajel/assistant-core/state/machine";
import { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";

import { JOBS_INDEX_KEY, jobKey, siteFromJobKey } from "~/store/keys";

/**
 * One job per site, held by the background and written behind a debounce.
 *
 * The in-page widget kept its session in `sessionStorage`, which meant a job died with the tab
 * and every site shared one slot. Here a job is durable and addressed by hostname, so closing
 * the browser on a half-finished integration and coming back tomorrow is an ordinary thing to
 * do rather than a loss.
 *
 * The write path is the part worth reading. Recording produces events several times a second,
 * and each write stringifies the whole session — so writes coalesce over 200 ms, exactly as
 * they did before. What changed is what a lost write costs: the page can navigate mid-burst,
 * and the events that matter most (the purchase IS the navigation) are the ones in flight. So
 * the recorder marks those events `flush`, and a flush bypasses the debounce.
 */

export const PERSIST_DEBOUNCE_MS = 200;

export interface JobSummary {
  site: string;
  goal: WidgetGoal;
  step: WidgetStep;
  events: number;
  /** Epoch ms of the last change, so the panel can put the most recent job first. */
  touchedAt: number;
  deployed: boolean;
}

const area = new Storage({ area: "local" });

/** In-memory mirror. The background is one process; the panel reads through it, never around it. */
const live = new Map<string, WidgetSession>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<(site: string, session: WidgetSession) => void>();

const summarize = (site: string, session: WidgetSession): JobSummary => ({
  site,
  goal: session.goal,
  step: session.step,
  events: session.timeline.length,
  touchedAt: Date.now(),
  deployed: !!session.deploy,
});

const writeIndex = async (site: string, session: WidgetSession | null): Promise<void> => {
  const index = (await area.get<JobSummary[]>(JOBS_INDEX_KEY)) ?? [];
  const rest = index.filter((entry) => entry.site !== site);
  const next = session ? [summarize(site, session), ...rest] : rest;
  await area.set(JOBS_INDEX_KEY, next);
};

const persist = async (site: string): Promise<void> => {
  const timer = timers.get(site);
  if (timer) {
    clearTimeout(timer);
    timers.delete(site);
  }
  const session = live.get(site);
  if (!session) return;

  const packed = serializeWithin(session);
  if (!packed) return; // a cycle reached the timeline; the next capture will most likely serialize

  // Eviction is only committed once the write is the thing that happened — a recording is never
  // thinned out for a write that did not land.
  if (packed.shrunk) live.set(site, packed.session);
  await area.set(jobKey(site), packed.session);
  await writeIndex(site, packed.session);
  if (packed.shrunk) notify(site);
};

const schedule = (site: string): void => {
  if (timers.has(site)) return;
  timers.set(
    site,
    setTimeout(() => void persist(site), PERSIST_DEBOUNCE_MS),
  );
};

const notify = (site: string): void => {
  const session = live.get(site);
  if (!session) return;
  for (const listener of listeners) {
    try {
      listener(site, session);
    } catch {
      /* one bad subscriber must not stop the others */
    }
  }
};

/** The job for a site, loaded from storage the first time and held after that. */
export const openJob = async (site: string, init: { goal?: WidgetGoal } = {}): Promise<WidgetSession> => {
  const held = live.get(site);
  if (held) return held;

  const stored = await area.get<unknown>(jobKey(site));
  const session = isUsableSession(stored) ? stored : createSession(init);
  live.set(site, session);
  return session;
};

export const peekJob = (site: string): WidgetSession | null => live.get(site) ?? null;

/**
 * Applies `mutate` to a copy and installs the result. The copy always carries a FRESH
 * `timeline`, so pushing onto it never mutates an array a previous session object still points
 * at — both the session and its timeline change identity when their content changes, which is
 * what lets the panel memoize on either.
 *
 * A `step` written here is ignored and restored: `advance()` is the only door.
 */
export const updateJob = (
  site: string,
  mutate: (draft: WidgetSession) => void,
  opts: { flush?: boolean } = {},
): WidgetSession | null => {
  const current = live.get(site);
  if (!current) return null;

  const stepBefore = current.step;
  const draft = { ...current, timeline: current.timeline.slice() };
  mutate(draft);
  draft.step = stepBefore;

  const next = enforce(draft);
  live.set(site, next);
  notify(site);
  if (opts.flush) void persist(site);
  else schedule(site);
  return next;
};

/** The one legal way to change a job's step. Always written immediately — a step change is rare
 *  and load-bearing, and losing "review" to a crash would resurrect a recording that was ended. */
export const advance = (site: string, to: WidgetStep, options?: TransitionOptions): WidgetStep | null => {
  const current = live.get(site);
  if (!current) return null;

  const next = machineTransition(current.step, to, options);
  if (next !== current.step) {
    live.set(site, { ...current, step: next });
    notify(site);
    void persist(site);
  }
  return next;
};

/** Throw this site's recording away and start a new one. Settings and other sites are untouched. */
export const resetJob = async (site: string, init: { goal?: WidgetGoal } = {}): Promise<WidgetSession> => {
  const session = createSession(init);
  live.set(site, session);
  notify(site);
  await persist(site);
  return session;
};

export const deleteJob = async (site: string): Promise<void> => {
  live.delete(site);
  const timer = timers.get(site);
  if (timer) {
    clearTimeout(timer);
    timers.delete(site);
  }
  await area.remove(jobKey(site));
  await writeIndex(site, null);
};

export const listJobs = async (): Promise<JobSummary[]> => {
  const index = (await area.get<JobSummary[]>(JOBS_INDEX_KEY)) ?? [];
  return index.slice().sort((a, b) => b.touchedAt - a.touchedAt);
};

/** Every job, gone. The Settings escape hatch, and what an operator lending their laptop wants. */
export const clearAllJobs = async (): Promise<void> => {
  const all = await area.getAll();
  await Promise.all(
    Object.keys(all)
      .filter((key) => siteFromJobKey(key) !== null)
      .map((key) => area.remove(key)),
  );
  await area.remove(JOBS_INDEX_KEY);
  live.clear();
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
};

export const subscribeJobs = (listener: (site: string, session: WidgetSession) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Drop the in-memory copy of one job; storage keeps it. This is what a service-worker restart
 * does to this module on its own, and doing it deliberately is how a long session stops holding
 * every site the operator visited today in memory. The next `openJob` loads it back.
 */
export const releaseJob = (site: string): void => {
  const timer = timers.get(site);
  if (timer) {
    clearTimeout(timer);
    timers.delete(site);
    void persist(site);
  }
  live.delete(site);
};

/** Write everything pending, now. Called when the service worker is about to be suspended. */
export const flushAll = async (): Promise<void> => {
  await Promise.all([...timers.keys()].map(persist));
};
