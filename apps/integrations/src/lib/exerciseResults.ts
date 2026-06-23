/**
 * Persistence for the Exercises feature. Mirrors the lesson `Progress` store in core.ts, but
 * keyed by exerciseId and carrying timing/score so the Report Card can show best time and accuracy.
 */

export interface ExerciseResult {
  completed: boolean;
  /** Fastest completion across attempts, ms. null until first completion. */
  bestTimeMs: number | null;
  attempts: number;
  /** 0..100 from the most recent completed attempt (goal completeness − bad-event penalty). */
  lastScore: number;
  /** Good/bad Micro counts from the most recent completed attempt. */
  eventsGood: number;
  eventsBad: number;
}
export type ExerciseResults = Record<string, ExerciseResult>;

/** Format a millisecond duration as mm:ss. */
export const fmtMs = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const KEY = "mj-exercise-results-v1";

export function loadExerciseResults(): ExerciseResults {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveExerciseResults(r: ExerciseResults) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

/**
 * Score a completed attempt: goal completeness (0..100) minus 10 per quarantined (bad) event,
 * floored at 0. A clean run that meets every goal with no bad events scores 100.
 */
export function scoreAttempt(goalsPassed: number, goalsTotal: number, bad: number): number {
  const base = goalsTotal ? Math.round((goalsPassed / goalsTotal) * 100) : 0;
  return Math.max(0, base - bad * 10);
}

export function recordExerciseAttempt(
  r: ExerciseResults,
  id: string,
  o: { completed: boolean; timeMs: number; goalsPassed: number; goalsTotal: number; good: number; bad: number },
): ExerciseResults {
  const prev = r[id] ?? {
    completed: false,
    bestTimeMs: null,
    attempts: 0,
    lastScore: 0,
    eventsGood: 0,
    eventsBad: 0,
  };
  const next: ExerciseResult = {
    completed: prev.completed || o.completed,
    bestTimeMs: o.completed ? Math.min(prev.bestTimeMs ?? Number.POSITIVE_INFINITY, o.timeMs) : prev.bestTimeMs,
    attempts: prev.attempts + 1,
    lastScore: scoreAttempt(o.goalsPassed, o.goalsTotal, o.bad),
    eventsGood: o.good,
    eventsBad: o.bad,
  };
  const updated = { ...r, [id]: next };
  saveExerciseResults(updated);
  return updated;
}
