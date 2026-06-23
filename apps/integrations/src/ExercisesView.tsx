import React, { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { Button } from "./components/ui/button";
import { ExerciseInspector, Stat, celebrate, cx, motion, NetReq } from "./components";
import { ConsoleLog, MicroBundle, clearTrackerState, ctxFor, micro } from "./lib/core";
import { ExerciseResults, fmtMs, recordExerciseAttempt, scoreAttempt } from "./lib/exerciseResults";
import { Exercise, Goal } from "./exercises";

/* ----------------------------------------------------------------- code persistence */
const exCodeKey = (id: string) => "mj-ex-code-" + id;
const loadExCode = (ex: Exercise) => {
  try {
    return localStorage.getItem(exCodeKey(ex.id)) ?? ex.starterCode;
  } catch {
    return ex.starterCode;
  }
};

/* ----------------------------------------------------------------- timer */
/** Live stopwatch for display only (ticks every 250ms). The authoritative elapsed time is a single
 * performance.now() delta captured at completion in useExerciseRun, so it's exact regardless of tick. */
function useStopwatch(running: boolean, startedAt: number | null): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!running || startedAt == null) return;
    setNow(performance.now());
    const iv = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(iv);
  }, [running, startedAt]);
  return running && startedAt != null ? Math.max(0, now - startedAt) : 0;
}

/* ----------------------------------------------------------------- micro polling */
/** Continuously poll Micro while `active` (unlike micro.collect which settles then stops). An
 * in-flight guard prevents overlapping reads; goal checks are pure fns of the latest bundle. */
function useMicroPolling(active: boolean, onBundle: (b: MicroBundle) => void, intervalMs = 1000) {
  const cbRef = useRef(onBundle);
  cbRef.current = onBundle;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [counts, good, bad] = await Promise.all([micro.all(), micro.good(), micro.bad()]);
        if (alive) cbRef.current({ counts, good, bad });
      } finally {
        inFlight = false;
      }
    };
    tick();
    const iv = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [active, intervalMs]);
}

/* ----------------------------------------------------------------- run engine */
export interface ExerciseReport {
  exerciseId: string;
  timeMs: number;
  goalsPassed: number;
  goalsTotal: number;
  good: number;
  bad: number;
  score: number;
}

type Phase = "idle" | "running" | "complete";

function useExerciseRun(exercise: Exercise, code: string, onComplete: (r: ExerciseReport) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bundle, setBundle] = useState<MicroBundle | null>(null);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [dlPushes, setDlPushes] = useState<any[]>([]);
  const [netReqs, setNetReqs] = useState<NetReq[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [frameKey, setFrameKey] = useState(0);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // One message listener for the hook's life: route the sandbox's {__mj} posts to the inspector.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object" || (d as any).__mj === undefined) return;
      if (d.__mj === "log") setLogs((l) => [...l, { level: d.level || "log", text: d.text, css: d.css }]);
      else if (d.__mj === "error") setLogs((l) => [...l, { level: "error", text: d.error }]);
      else if (d.__mj === "datalayer") setDlPushes((a) => [...a, d.data]);
      else if (d.__mj === "network") setNetReqs((a) => [...a, d.req]);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const start = useCallback(async () => {
    setLogs([]);
    setDlPushes([]);
    setNetReqs([]);
    setBundle(null);
    setElapsedMs(0);
    clearTrackerState(exercise.appId);
    await micro.reset();
    setSrcdoc(exercise.buildSandbox(code, ctxFor(exercise.appId)));
    setFrameKey((k) => k + 1);
    setStartedAt(performance.now());
    setPhase("running");
  }, [exercise, code]);

  const stop = useCallback(() => {
    setPhase("idle");
    setSrcdoc(null);
    setStartedAt(null);
  }, []);

  useMicroPolling(phase === "running", setBundle, 1000);

  // Completion: every goal passes (the "valid" goal also gates on no-bad + non-empty). Freeze the
  // timer with a single exact delta, celebrate, and hand the report up for persistence + the modal.
  useEffect(() => {
    if (phase !== "running" || !bundle) return;
    const passed = exercise.goals.filter((g) => g.check(bundle)).length;
    if (passed !== exercise.goals.length) return;
    const t = startedAt != null ? performance.now() - startedAt : 0;
    setElapsedMs(t);
    setPhase("complete");
    celebrate();
    onCompleteRef.current({
      exerciseId: exercise.id,
      timeMs: t,
      goalsPassed: passed,
      goalsTotal: exercise.goals.length,
      good: bundle.counts.good,
      bad: bundle.counts.bad,
      score: scoreAttempt(passed, exercise.goals.length, bundle.counts.bad),
    });
  }, [bundle, phase, startedAt, exercise]);

  const liveMs = useStopwatch(phase === "running", startedAt);
  const displayMs = phase === "running" ? liveMs : phase === "complete" ? elapsedMs : 0;
  const passedCount = bundle ? exercise.goals.filter((g) => g.check(bundle)).length : 0;

  return { phase, bundle, logs, dlPushes, netReqs, srcdoc, frameKey, displayMs, passedCount, start, stop };
}

/* ----------------------------------------------------------------- mounted sandbox (the hero) */
function MountedSandbox({ srcdoc, frameKey }: { srcdoc: string | null; frameKey: number }) {
  if (!srcdoc) {
    return (
      <div className="grid h-full w-full place-items-center rounded-2xl border hairline bg-surface-2/50 text-center">
        <div className="max-w-sm px-6">
          <div className="mb-2 text-4xl">▶</div>
          <div className="text-sm text-ink-soft">
            Press <strong className="text-ink">Start</strong> to launch the simulator. Then interact with it and watch
            your captured events land in Micro.
          </div>
        </div>
      </div>
    );
  }
  return (
    <iframe
      key={frameKey}
      title="exercise simulator"
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full rounded-2xl border hairline bg-white"
    />
  );
}

/* ----------------------------------------------------------------- goal row */
function GoalRow({ goal, passed, index }: { goal: Goal; passed: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-3 py-2"
    >
      <span
        className={cx(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
          passed ? "bg-good text-white" : "border-[1.5px] border-ink-faint/40 text-transparent",
        )}
      >
        ✓
      </span>
      <div className={cx("min-w-0 text-sm", passed ? "text-ink" : "text-ink-soft")}>{goal.label}</div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------- report modal */
function ExerciseReportModal({
  report,
  exercise,
  isBest,
  onAgain,
  onBack,
  onReport,
}: {
  report: ExerciseReport;
  exercise: Exercise;
  isBest: boolean;
  onAgain: () => void;
  onBack: () => void;
  onReport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onBack}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="card w-full max-w-md p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Exercise complete 🎉</div>
          <div className="mt-1 text-5xl font-bold grad-text tabular-nums">{fmtMs(report.timeMs)}</div>
          {isBest && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-good/15 px-2.5 py-0.5 text-xs font-semibold text-good">
              ★ New best time
            </div>
          )}
          <div className="mt-2 text-sm text-ink-soft">
            {exercise.title} · {report.goalsPassed}/{report.goalsTotal} goals
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Score" value={report.score} tone={report.score >= 80 ? "good" : undefined} />
          <Stat label="Good events" value={report.good} tone="good" />
          <Stat label="Bad events" value={report.bad} tone={report.bad > 0 ? "bad" : undefined} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onAgain}>↻ Play again</Button>
          <Button variant="secondary" onClick={onReport}>
            Report card
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Back to exercises
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ----------------------------------------------------------------- workspace */
export function ExerciseWorkspace({
  exercise,
  results,
  setResults,
  microOk,
  onBack,
  onReport,
}: {
  exercise: Exercise;
  results: ExerciseResults;
  setResults: (r: ExerciseResults) => void;
  microOk: boolean | null;
  onBack: () => void;
  onReport: () => void;
}) {
  const [code, setCode] = useState(() => loadExCode(exercise));
  const [tab, setTab] = useState<"inspector" | "code">("inspector");
  const [report, setReport] = useState<ExerciseReport | null>(null);
  const [reportBest, setReportBest] = useState(false);
  const startedCodeRef = useRef<string | null>(null);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const onComplete = useCallback(
    (r: ExerciseReport) => {
      const prevBest = resultsRef.current[exercise.id]?.bestTimeMs ?? null;
      setReportBest(prevBest == null || r.timeMs <= prevBest);
      setResults(
        recordExerciseAttempt(resultsRef.current, exercise.id, {
          completed: true,
          timeMs: r.timeMs,
          goalsPassed: r.goalsPassed,
          goalsTotal: r.goalsTotal,
          good: r.good,
          bad: r.bad,
        }),
      );
      setReport(r);
    },
    [exercise.id, setResults],
  );

  const run = useExerciseRun(exercise, code, onComplete);

  const onCode = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem(exCodeKey(exercise.id), v);
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    startedCodeRef.current = code;
    setReport(null);
    run.start();
  };

  const codeDirty = run.phase !== "idle" && startedCodeRef.current !== null && startedCodeRef.current !== code;

  const goals = exercise.goals;
  const bundle = run.bundle;

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      {/* top bar */}
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={onBack} className="btn-ghost h-8 px-2 text-sm" title="Back to exercises">
          ← Exercises
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-lg text-accent">{exercise.icon}</span>
          {exercise.title}
        </span>
        <span className="hidden text-xs text-ink-faint sm:inline">· {exercise.tagline}</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-surface-3/60 px-3 py-1 font-mono text-sm tabular-nums text-ink">
            ⏱ {fmtMs(run.displayMs)}
          </span>
          <span className="text-xs tabular-nums text-ink-faint">
            {run.passedCount}/{goals.length} goals
          </span>
          <Button
            onClick={start}
            disabled={microOk === false}
            title={microOk === false ? "Snowplow Micro is offline" : "Start / restart the exercise"}
          >
            {run.phase === "idle" ? "▶ Start" : "↻ Restart"}
          </Button>
        </div>
      </div>

      {/* body: goals as a small left sidebar · simulator + tools on the right */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {/* goals — small persistent left rail */}
        <aside className="card flex shrink-0 flex-col overflow-hidden lg:w-72">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-soft">
              {exercise.intro.map((line, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t hairline pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Goals</span>
              <span className="text-[11px] tabular-nums text-ink-faint">
                {run.passedCount}/{goals.length}
              </span>
            </div>
            <div className="mt-1">
              {goals.map((g, i) => (
                <GoalRow key={g.id} goal={g} passed={!!bundle && g.check(bundle)} index={i} />
              ))}
            </div>
          </div>
        </aside>

        {/* main column: simulator hero gets the lion's share (~70%), Inspector/Code below (~30%) */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-[320px] flex-[7]">
            <MountedSandbox srcdoc={run.srcdoc} frameKey={run.frameKey} />
          </div>

          <div className="card flex min-h-[170px] flex-[3] flex-col overflow-hidden">
            <div className="flex items-center gap-1 border-b hairline px-2 py-2">
              {(["inspector", "code"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                    tab === t ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink-soft",
                  )}
                >
                  {t}
                </button>
              ))}
              {codeDirty && <span className="ml-auto pr-1 text-[11px] text-accent">Restart to apply code changes</span>}
            </div>

            <div className="min-h-0 flex-1">
              {tab === "inspector" && (
                <div className="h-full p-3">
                  <ExerciseInspector
                    bundle={run.bundle}
                    logs={run.logs}
                    dlPushes={run.dlPushes}
                    netReqs={run.netReqs}
                  />
                </div>
              )}

              {tab === "code" && (
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 border-b hairline px-4 py-2 text-xs font-medium text-ink-faint">
                    {exercise.language === "html" ? "index.html" : "capture.js"}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onCode(exercise.starterCode)}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    <CodeEditor value={code} onChange={onCode} language={exercise.language} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {report && (
        <ExerciseReportModal
          report={report}
          exercise={exercise}
          isBest={reportBest}
          onAgain={() => {
            setReport(null);
            start();
          }}
          onBack={() => setReport(null)}
          onReport={onReport}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- picker */
export function ExercisesHome({
  exercises,
  results,
  onPick,
}: {
  exercises: Exercise[];
  results: ExerciseResults;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Exercises</h1>
        <p className="mt-2 text-ink-soft">
          Apply the Course to realistic, interactive simulations. Each exercise is a live app that fires real dataLayer
          and network events — your job is to debug and instrument it so every conversion lands in Snowplow Micro.
          You're timed, and graded against the pipeline.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {exercises.map((ex, i) => {
          const r = results[ex.id];
          return (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onPick(ex.id)}
              className="card group p-6 text-left transition hover:-translate-y-0.5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-3 text-2xl">{ex.icon}</span>
                {r?.completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-good/15 px-2.5 py-0.5 text-xs font-semibold text-good">
                    ✓ {r.bestTimeMs != null ? `best ${fmtMs(r.bestTimeMs)}` : "done"}
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">
                    {r?.attempts ? `${r.attempts} attempt(s)` : "Not started"}
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold text-ink">{ex.title}</div>
              <div className="mt-1 text-sm text-ink-soft">{ex.tagline}</div>
              <div className="mt-4 text-sm font-semibold text-accent">Start exercise →</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
