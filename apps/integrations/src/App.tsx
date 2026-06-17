import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CodeEditor } from "./CodeEditor";
import { LESSONS, SECTIONS, lessonById, lessonsBySection } from "./lessons";
import { Button } from "./components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
import {
  Check,
  Lesson,
  MicroBundle,
  Progress,
  SandboxContext,
  clearTrackerState,
  loadProgress,
  micro,
  recordAttempt,
  runSandbox,
} from "./lib/core";
import {
  CheckRow,
  DifficultyBadge,
  EventInspector,
  MicroStatus,
  MissionText,
  ReportCard,
  ThemeSwitcher,
  celebrate,
  cx,
} from "./components";

/* --------------------------------------------------------------- helpers */
function useMicroHealth() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const h = await micro.health();
      if (alive) setOk(h);
    };
    ping();
    const iv = setInterval(ping, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
  return ok;
}

const ctxFor = (appId: string): SandboxContext => ({
  origin: location.origin,
  appId,
  host: location.host,
  tagUrl: (params) => "/tag/index.js?" + new URLSearchParams(params).toString(),
});

const codeKey = (id: string) => "mj-code-" + id;
const loadCode = (l: Lesson) => {
  try {
    return localStorage.getItem(codeKey(l.id)) ?? l.starterCode;
  } catch {
    return l.starterCode;
  }
};

/* --------------------------------------------------------------- header */
function Header({
  view,
  setView,
  microOk,
}: {
  view: View;
  setView: (v: View) => void;
  microOk: boolean | null;
}) {
  const Item = ({ id, label }: { id: View["kind"]; label: string }) => (
    <button
      onClick={() => setView(id === "lesson" ? { kind: "lesson", id: LESSONS[0].id } : ({ kind: id } as View))}
      className={cx(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        view.kind === id ? "bg-surface-3 text-ink" : "text-ink-soft hover:text-ink",
      )}
    >
      {label}
    </button>
  );
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button onClick={() => setView({ kind: "home" })} className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow">
            ◆
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            MediaJel <span className="text-ink-faint">Integrations</span>
          </span>
        </button>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Item id="lesson" label="Course" />
          <Item id="freeplay" label="Free Play" />
          <Item id="report" label="Report Card" />
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <MicroStatus ok={microOk} />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------- hero */
function Hero({ onStart }: { onStart: () => void }) {
  const features = [
    { icon: "◎", t: "Real pipeline", d: "Graded against a live local Snowplow Micro, not a mock." },
    { icon: "⚡", t: "Hands-on", d: "Write real tracker code; press Play; watch events land." },
    { icon: "❒", t: "Basics → advanced", d: "From your first tag to iframe & network capture." },
  ];
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border hairline bg-surface-2/60 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> Interactive Snowplow training
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-7xl">
            Master the
            <br />
            <span className="grad-text">MediaJel tracker.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A hands-on course that teaches you to integrate the tracker — from adding the tag to
            capturing transactions out of dataLayers, network calls and iframes. Every lesson is
            graded against a real Snowplow pipeline.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onStart} className="btn-accent px-6 py-3 text-base">
              Start the course →
            </button>
            <span className="text-sm text-ink-faint">{LESSONS.length} lessons · ~30 min</span>
          </div>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="card p-6"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-surface-3 text-lg text-accent">
                {f.icon}
              </div>
              <div className="font-semibold text-ink">{f.t}</div>
              <div className="mt-1 text-sm text-ink-soft">{f.d}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- lesson stepper */
/**
 * Horizontal "connected dots" progress stepper that sits above the workspace, freeing the
 * whole row width for the editor + mission columns. Steps run left→right across the sections
 * (Basics → Advanced); completed steps show a check, the current step gets an accent ring and
 * its title is echoed in the caption beneath. The dot track scrolls horizontally on narrow
 * screens so the connectors never wrap.
 */
function LessonStepper({
  active,
  progress,
  onPick,
}: {
  active: string;
  progress: Progress;
  onPick: (id: string) => void;
}) {
  const activeLesson = lessonById(active) ?? LESSONS[0];

  const Dot = ({ l, showConnector, connectorDone }: { l: Lesson; showConnector: boolean; connectorDone: boolean }) => {
    const done = progress[l.id]?.completed;
    const on = l.id === active;
    return (
      <div className="flex items-center">
        {showConnector && (
          <div
            className={cx(
              "h-0.5 w-5 shrink-0 rounded-full transition-colors sm:w-7",
              connectorDone ? "bg-good/50" : "bg-border/70",
            )}
          />
        )}
        <button
          onClick={() => onPick(l.id)}
          title={`${l.title} — ${l.tagline}`}
          aria-current={on ? "step" : undefined}
          className={cx(
            "grid shrink-0 place-items-center rounded-full text-xs font-semibold transition",
            on
              ? "h-9 w-9 bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow ring-2 ring-primary/40"
              : done
                ? "h-8 w-8 bg-good text-white hover:brightness-110"
                : "h-8 w-8 bg-muted text-ink-faint hover:bg-surface-3 hover:text-ink-soft",
          )}
        >
          {done && !on ? "✓" : l.number + 1}
        </button>
      </div>
    );
  };

  return (
    <div className="card px-4 py-4 sm:px-6">
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-start gap-4">
          {SECTIONS.map((s, si) => {
            const lessons = lessonsBySection(s.id);
            const doneCount = lessons.filter((l) => progress[l.id]?.completed).length;
            return (
              <React.Fragment key={s.id}>
                {si > 0 && <div className="mt-7 h-8 w-px shrink-0 bg-border/60" />}
                <div className="shrink-0">
                  <div className="mb-2 flex items-baseline gap-2 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      {s.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-ink-faint">
                      {doneCount}/{lessons.length}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {lessons.map((l, i) => (
                      <Dot
                        key={l.id}
                        l={l}
                        showConnector={i > 0}
                        connectorDone={!!progress[lessons[i - 1]?.id]?.completed}
                      />
                    ))}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* caption — echoes the current step (position/progress only; difficulty lives in the mission card) */}
      <div className="mt-4 flex items-center gap-2 border-t hairline pt-3">
        <span className="text-lg text-accent">{activeLesson.icon}</span>
        <span className="text-sm font-semibold text-ink">{activeLesson.title}</span>
        <span className="truncate text-xs text-ink-faint">· {activeLesson.tagline}</span>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-faint">
          Lesson {activeLesson.number + 1} of {LESSONS.length}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- workspace */
function Workspace({
  lesson,
  progress,
  setProgress,
  goto,
}: {
  lesson: Lesson;
  progress: Progress;
  setProgress: (p: Progress) => void;
  goto: (id: string) => void;
}) {
  const [code, setCode] = useState(() => loadCode(lesson));
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);
  const [bundle, setBundle] = useState<MicroBundle | null>(null);
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);

  useEffect(() => {
    setCode(loadCode(lesson));
    setChecks([]);
    setBundle(null);
    setLogs([]);
  }, [lesson.id]);

  const onCode = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem(codeKey(lesson.id), v);
    } catch {
      /* ignore */
    }
  };

  const run = useCallback(async () => {
    setRunning(true);
    setChecks([]);
    setLogs([]);
    setBundle(null);
    try {
      clearTrackerState(lesson.appId);
      await micro.reset();
      const srcdoc = lesson.buildSandbox(code, ctxFor(lesson.appId));
      const res = await runSandbox(srcdoc);
      setLogs(res.logs);
      const b = await micro.collect();
      setBundle(b);
      const result = lesson.validate(b);
      setChecks(result);
      const updated = recordAttempt(progress, lesson.id, result);
      setProgress(updated);
      if (result.length > 0 && result.every((c) => c.pass)) celebrate();
    } catch (e) {
      setLogs((l) => [...l, { level: "error", text: String(e) }]);
    } finally {
      setRunning(false);
    }
  }, [code, lesson, progress, setProgress]);

  const passedAll = checks.length > 0 && checks.every((c) => c.pass);
  // numbering drives order (the array isn't in display order), so find the next by number.
  const next = LESSONS.find((l) => l.number === lesson.number + 1);

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-2">
      {/* editor */}
      <div className="card flex min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b hairline px-4 py-2.5">
          <span className="text-xs font-medium text-ink-faint">
            {lesson.language === "html" ? "index.html" : "integration.js"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onCode(lesson.starterCode)}>
              Reset
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onCode(lesson.solutionCode)}>
              Reveal solution
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor value={code} onChange={onCode} language={lesson.language} />
        </div>
        <div className="flex items-center gap-3 border-t border-border/60 px-4 py-3">
          <Button onClick={run} disabled={running}>
            {running ? (
              <>
                <Spinner /> Running…
              </>
            ) : (
              <>▶ Play</>
            )}
          </Button>
          {passedAll && next && (
            <Button variant="secondary" onClick={() => goto(next.id)}>
              Next: {next.title} →
            </Button>
          )}
          <span className="ml-auto text-xs text-ink-faint">
            {progress[lesson.id]?.attempts
              ? `${progress[lesson.id]!.attempts} attempt(s)`
              : "Not attempted"}
          </span>
        </div>
      </div>

      {/* mission + results */}
      <div className="flex min-h-[520px] flex-col gap-5">
        <div className="card p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl text-accent">{lesson.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">{lesson.title}</h2>
                <DifficultyBadge d={lesson.difficulty} />
              </div>
              <div className="text-xs text-ink-faint">Lesson {lesson.number + 1} · {lesson.tagline}</div>
            </div>
          </div>
          <MissionText text={lesson.mission} />
          {lesson.hints.length > 0 && (
            <Accordion type="single" collapsible className="mt-4 rounded-xl bg-muted/40 px-3">
              <AccordionItem value="hints" className="border-0">
                <AccordionTrigger>Hints</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1 pl-5">
                    {lesson.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        <div className="card flex min-h-0 flex-1 flex-col p-5">
          <AnimatePresence mode="wait">
            {checks.length > 0 ? (
              <motion.div
                key="checks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-0 flex-col"
              >
                <div
                  className={cx(
                    "mb-2 flex items-center gap-2 text-sm font-semibold",
                    passedAll ? "text-good" : "text-ink",
                  )}
                >
                  {passedAll ? "🎉 Lesson passed!" : "Checks"}
                  <span className="text-ink-faint">
                    {checks.filter((c) => c.pass).length}/{checks.length}
                  </span>
                </div>
                <div className="min-h-0 overflow-auto">
                  {checks.map((c, i) => (
                    <CheckRow key={c.id} c={c} index={i} />
                  ))}
                </div>
                <div className="mt-3 min-h-[120px] flex-1 border-t hairline pt-3">
                  <EventInspector bundle={bundle} logs={logs} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid flex-1 place-items-center text-center"
              >
                <div className="max-w-xs text-sm text-ink-faint">
                  <div className="mb-2 text-3xl">▶</div>
                  Write your integration and press <strong className="text-ink-soft">Play</strong>.
                  Captured events and checks appear here.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const Spinner = () => (
  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
);

/* --------------------------------------------------------------- free play */
const FREEPLAY_START = `// Free play — the tag is loaded (environment=training) and pointed at Micro.
// Try anything: trackTrans, trackSignUp, dataLayer pushes, postMessage...

window.trackTrans({
  id: "FP-1",
  total: 42,
  currency: "USD",
  tax: 0,
  shipping: 0,
  city: "Denver", state: "CO", country: "USA",
  items: [{ sku: "x", name: "Sample", category: "demo", unitPrice: 42, quantity: 1, orderId: "FP-1", currency: "USD" }],
});`;

function FreePlay() {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem("mj-freeplay") ?? FREEPLAY_START;
    } catch {
      return FREEPLAY_START;
    }
  });
  const [running, setRunning] = useState(false);
  const [bundle, setBundle] = useState<MicroBundle | null>(null);
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);

  const lesson = lessonById("transactions")!; // reuse jsSandbox via a lesson's builder
  const run = async () => {
    setRunning(true);
    setLogs([]);
    setBundle(null);
    try {
      clearTrackerState("mj-freeplay");
      await micro.reset();
      const srcdoc = lesson.buildSandbox(code, ctxFor("mj-freeplay"));
      const res = await runSandbox(srcdoc);
      setLogs(res.logs);
      setBundle(await micro.collect());
    } finally {
      setRunning(false);
    }
  };
  const onCode = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem("mj-freeplay", v);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-2">
      <div className="card flex min-h-[520px] flex-col overflow-hidden">
        <div className="border-b hairline px-4 py-2.5 text-xs font-medium text-ink-faint">
          playground.js
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor value={code} onChange={onCode} language="javascript" />
        </div>
        <div className="border-t hairline px-4 py-3">
          <button onClick={run} disabled={running} className="btn-accent disabled:opacity-60">
            {running ? (
              <>
                <Spinner /> Running…
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>
      </div>
      <div className="card flex min-h-[520px] flex-col p-5">
        <div className="mb-2 text-sm font-semibold text-ink">Live event inspector</div>
        <div className="min-h-0 flex-1">
          <EventInspector bundle={bundle} logs={logs} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- root */
type View =
  | { kind: "home" }
  | { kind: "lesson"; id: string }
  | { kind: "freeplay" }
  | { kind: "report" };

export function App() {
  const microOk = useMicroHealth();
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [view, setView] = useState<View>({ kind: "home" });

  const lesson = useMemo(
    () => (view.kind === "lesson" ? lessonById(view.id) ?? LESSONS[0] : null),
    [view],
  );

  const gotoLesson = useCallback((id: string) => setView({ kind: "lesson", id }), []);

  return (
    <div className="min-h-full">
      <Header view={view} setView={setView} microOk={microOk} />

      {microOk === false && (
        <div className="border-b border-bad/20 bg-bad/10 px-4 py-2 text-center text-sm text-bad">
          Snowplow Micro isn't reachable. Run <code className="font-mono">bun dev</code> (or{" "}
          <code className="font-mono">bun run micro:up</code>) to start it.
        </div>
      )}

      {/* Keyed fade-in per view. We intentionally avoid AnimatePresence's exit-wait here:
          the heavy Monaco mount could interrupt the exit→enter handoff and leave the page
          stuck mid-fade. A keyed remount with initial→animate is reliable. */}
      <motion.main
          key={view.kind + (view.kind === "lesson" ? view.id : "")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {view.kind === "home" && <Hero onStart={() => gotoLesson(LESSONS[0].id)} />}

          {view.kind === "lesson" && lesson && (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
              <div className="mb-5">
                <LessonStepper active={lesson.id} progress={progress} onPick={gotoLesson} />
              </div>
              <Workspace
                lesson={lesson}
                progress={progress}
                setProgress={setProgress}
                goto={gotoLesson}
              />
            </div>
          )}

          {view.kind === "freeplay" && (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-ink">Free Play</h2>
                <p className="text-sm text-ink-soft">
                  An open sandbox — the tag is live and pointed at Micro. Experiment freely.
                </p>
              </div>
              <FreePlay />
            </div>
          )}

          {view.kind === "report" && (
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
              <ReportCard progress={progress} lessons={LESSONS} onJump={gotoLesson} />
            </div>
          )}
        </motion.main>

      <footer className="mx-auto max-w-7xl px-6 py-10 text-center text-xs text-ink-faint">
        MediaJel Integrations · graded against Snowplow Micro · schemas via iglu.mediajel.ninja
      </footer>
    </div>
  );
}
