import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CodeEditor } from "./CodeEditor";
import { ORDERED_LESSONS, SECTIONS, lessonById, lessonIndex, nextLesson, sectionOf } from "./lessons";
import { Button } from "./components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion";
import {
  Check,
  Lesson,
  MicroBundle,
  Progress,
  clearTrackerState,
  ctxFor,
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
  Objectives,
  ReportCard,
  ThemeSwitcher,
  celebrate,
  cx,
} from "./components";
import { EXERCISES, exerciseById } from "./exercises";
import { ExercisesHome, ExerciseWorkspace } from "./ExercisesView";
import { ExerciseResults, loadExerciseResults } from "./lib/exerciseResults";

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

const codeKey = (id: string) => "mj-code-" + id;
// Every lesson starts from a blank editor — learners write the integration from scratch
// (the mission + hints guide them; "Reveal solution" is the escape hatch). We persist their
// in-progress code per lesson, but the initial state is always empty.
const loadCode = (l: Lesson) => {
  try {
    return localStorage.getItem(codeKey(l.id)) ?? "";
  } catch {
    return "";
  }
};

const editorPlaceholder = (l: Lesson) =>
  l.language === "html"
    ? "<!-- Write your tag here, then press Play to grade it -->"
    : "// Write your integration here, then press Play to grade it";

/* --------------------------------------------------------------- header */
function Header({ view, setView, microOk }: { view: View; setView: (v: View) => void; microOk: boolean | null }) {
  const Item = ({ id, label }: { id: "courses" | "exercises" | "report"; label: string }) => {
    const active =
      view.kind === id ||
      (id === "courses" && (view.kind === "lesson" || view.kind === "prerequisites")) ||
      (id === "exercises" && view.kind === "exercise");
    return (
      <button
        onClick={() => setView({ kind: id } as View)}
        className={cx(
          "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
          active ? "bg-surface-3 text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button onClick={() => setView({ kind: "home" })} className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow">
            ◆
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            MediaJel <span className="text-ink-faint">Integrations</span>
          </span>
        </button>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Item id="courses" label="Courses" />
          <Item id="exercises" label="Exercises" />
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
    { icon: "❒", t: "Getting Started → Advanced", d: "From your first tag to iframe & network capture." },
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
            Hands-on courses that teach you to integrate the tracker — from adding the tag to capturing transactions out
            of dataLayers, network calls and iframes. Every lesson is graded against a real Snowplow pipeline.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onStart} className="btn-accent px-6 py-3 text-base">
              Start learning →
            </button>
            <span className="text-sm text-ink-faint">{ORDERED_LESSONS.length} lessons · ~30 min</span>
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

/* --------------------------------------------------------------- course sections */
/**
 * The Courses landing — a card per section (mirrors the Exercises picker). A lesson-section card
 * shows progress and drops you into the next unfinished lesson; the Pre-requisites card opens the
 * debugging-tools setup. Per-lesson navigation lives in the stepper and the Report Card.
 */
function CourseSections({
  progress,
  onPickLesson,
  onPrereq,
}: {
  progress: Progress;
  onPickLesson: (id: string) => void;
  onPrereq: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Courses</h1>
        <p className="mt-2 text-ink-soft">
          Learn the MediaJel tracker end to end, graded against a real Snowplow pipeline. Set up your debugging tools
          first, then work through each section.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={onPrereq}
          className="card group p-6 text-left transition hover:-translate-y-0.5"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-3 text-2xl">🧰</span>
            <span className="text-xs text-ink-faint">2 tools</span>
          </div>
          <div className="text-lg font-semibold text-ink">Pre-requisites</div>
          <div className="mt-1 text-sm text-ink-soft">
            The two Chrome extensions you'll lean on to debug tracking on real sites.
          </div>
          <div className="mt-4 text-sm font-semibold text-accent">Set up →</div>
        </motion.button>

        {SECTIONS.map((section, i) => {
          const lessons = section.lessonIds.map((id) => lessonById(id)).filter((l): l is Lesson => !!l);
          const done = lessons.filter((l) => progress[l.id]?.completed).length;
          const next = lessons.find((l) => !progress[l.id]?.completed) ?? lessons[0];
          const cta = done === 0 ? "Start" : done === lessons.length ? "Review" : "Continue";
          return (
            <motion.button
              key={section.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * (i + 1), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => next && onPickLesson(next.id)}
              className="card group p-6 text-left transition hover:-translate-y-0.5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-3 text-2xl">
                  {section.icon}
                </span>
                <span className="text-xs tabular-nums text-ink-faint">
                  {done}/{lessons.length}
                </span>
              </div>
              <div className="text-lg font-semibold text-ink">{section.label}</div>
              <div className="mt-1 text-sm text-ink-soft">{section.blurb}</div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
                  style={{ width: `${lessons.length ? Math.round((done / lessons.length) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-4 text-sm font-semibold text-accent">{cta} →</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- prerequisites */
const PREREQ_TOOLS = [
  {
    icon: "🧭",
    name: "Adswerve dataLayer Inspector+",
    what: "Logs every Google dataLayer push (GA4 / GTM events) to the browser console as you click around a site — decoded and readable.",
    why: "It's how you confirm what events a real client's site actually emits — the raw signal you build tracking on. It's the in-the-wild version of this trainer's DataLayer inspector tab.",
    search: "https://chromewebstore.google.com/search/Adswerve%20dataLayer%20Inspector",
  },
  {
    icon: "🔎",
    name: "Snowplow Inspector",
    what: "Decodes the Snowplow events leaving the page for the collector, showing each event's type and schema and flagging anything malformed.",
    why: "It's how you verify what actually reached Snowplow in production — the same good-vs-bad-event check the exercises grade against Snowplow Micro.",
    search: "https://chromewebstore.google.com/search/Snowplow%20Inspector",
  },
];

function PrerequisitesView({ onStartCourse }: { onStartCourse: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">Pre-requisites</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Your debugging toolkit</h1>
        <p className="mt-2 text-ink-soft">
          This trainer has a built-in Inspector, but out in the wild — on a client's live site — you debug tracking with
          two free Chrome extensions. Install both before you start; you'll use them on every integration.
        </p>
      </div>

      <div className="space-y-4">
        {PREREQ_TOOLS.map((t) => (
          <div key={t.name} className="card p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-3 text-2xl">
                {t.icon}
              </span>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-ink">{t.name}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">What it does — </span>
                  {t.what}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">Why you need it — </span>
                  {t.why}
                </p>
                <a
                  href={t.search}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
                >
                  Find it on the Chrome Web Store ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button onClick={onStartCourse} className="btn-accent px-5 py-2.5">
          Got the tools — start the course →
        </button>
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
  const activeLesson = lessonById(active) ?? ORDERED_LESSONS[0];

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
          {done && !on ? "✓" : lessonIndex(l.id) + 1}
        </button>
      </div>
    );
  };

  return (
    <div className="card px-4 py-4 sm:px-6">
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-start gap-5">
          {SECTIONS.map((section, si) => {
            const lessons = section.lessonIds.map((id) => lessonById(id)).filter((l): l is Lesson => !!l);
            const doneCount = lessons.filter((l) => progress[l.id]?.completed).length;
            return (
              <React.Fragment key={section.id}>
                {si > 0 && <div className="mt-9 h-10 w-px shrink-0 bg-border" />}
                <div className="shrink-0">
                  <div className="mb-2 flex items-baseline gap-2 px-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink">
                      <span className="text-sm">{section.icon}</span>
                      {section.label}
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
          {sectionOf(activeLesson.id)?.label} · Lesson {lessonIndex(activeLesson.id) + 1} of {ORDERED_LESSONS.length}
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

  // ⌘/Ctrl+Enter runs the lesson from anywhere in the workspace (incl. inside the editor).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, running]);

  const passedAll = checks.length > 0 && checks.every((c) => c.pass);
  // The curriculum manifest defines order; walk to the next lesson across course/category bounds.
  const next = nextLesson(lesson.id);

  return (
    <div className="grid gap-5 lg:h-full lg:grid-cols-2">
      {/* editor */}
      <div className="card flex min-h-[440px] flex-col overflow-hidden lg:min-h-0">
        <div className="flex items-center gap-2 border-b hairline px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-ink-faint">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
            </span>
            {lesson.language === "html" ? "index.html" : "integration.js"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onCode("")}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onCode(lesson.solutionCode)}>
              Reveal solution
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor
            value={code}
            onChange={onCode}
            language={lesson.language}
            placeholder={editorPlaceholder(lesson)}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-border/60 px-4 py-3">
          <Button onClick={run} disabled={running} title="Run (⌘/Ctrl + Enter)">
            {running ? (
              <>
                <Spinner /> Running…
              </>
            ) : (
              <>▶ Play</>
            )}
          </Button>
          {passedAll && next ? (
            <Button variant="secondary" onClick={() => goto(next.id)}>
              Next: {next.title} →
            </Button>
          ) : (
            <kbd className="hidden rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:inline-block">
              ⌘↵
            </kbd>
          )}
          <span className="ml-auto text-xs text-ink-faint">
            {progress[lesson.id]?.attempts ? `${progress[lesson.id]!.attempts} attempt(s)` : "Not attempted"}
          </span>
        </div>
      </div>

      {/* mission + results */}
      <div className="flex min-h-[440px] flex-col gap-5 lg:min-h-0 lg:h-full">
        <div className="card shrink-0 p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl text-accent">{lesson.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">{lesson.title}</h2>
                <DifficultyBadge d={lesson.difficulty} />
              </div>
              <div className="text-xs text-ink-faint">
                Lesson {lessonIndex(lesson.id) + 1} · {lesson.tagline}
              </div>
            </div>
          </div>
          <MissionText text={lesson.mission} />
          <Objectives items={lesson.objectives} />
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
                  Write your integration and press <strong className="text-ink-soft">Play</strong>. Captured events and
                  checks appear here.
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

/* --------------------------------------------------------------- root */
type View =
  | { kind: "home" }
  | { kind: "courses" }
  | { kind: "prerequisites" }
  | { kind: "lesson"; id: string }
  | { kind: "exercises" }
  | { kind: "exercise"; id: string }
  | { kind: "report" };

export function App() {
  const microOk = useMicroHealth();
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [view, setView] = useState<View>({ kind: "home" });

  const [exResults, setExResults] = useState<ExerciseResults>(() => loadExerciseResults());

  const lesson = useMemo(() => (view.kind === "lesson" ? (lessonById(view.id) ?? ORDERED_LESSONS[0]) : null), [view]);
  const exercise = useMemo(() => (view.kind === "exercise" ? (exerciseById(view.id) ?? null) : null), [view]);

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
        key={view.kind + (view.kind === "lesson" || view.kind === "exercise" ? view.id : "")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {view.kind === "home" && <Hero onStart={() => setView({ kind: "courses" })} />}

        {view.kind === "courses" && (
          <CourseSections
            progress={progress}
            onPickLesson={gotoLesson}
            onPrereq={() => setView({ kind: "prerequisites" })}
          />
        )}

        {view.kind === "prerequisites" && <PrerequisitesView onStartCourse={() => gotoLesson(ORDERED_LESSONS[0].id)} />}

        {view.kind === "lesson" && lesson && (
          <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:px-8">
            <LessonStepper active={lesson.id} progress={progress} onPick={gotoLesson} />
            <div className="min-h-0 lg:flex-1">
              <Workspace lesson={lesson} progress={progress} setProgress={setProgress} goto={gotoLesson} />
            </div>
          </div>
        )}

        {view.kind === "exercises" && (
          <ExercisesHome exercises={EXERCISES} results={exResults} onPick={(id) => setView({ kind: "exercise", id })} />
        )}

        {view.kind === "exercise" && exercise && (
          <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:px-8">
            <ExerciseWorkspace
              exercise={exercise}
              results={exResults}
              setResults={setExResults}
              microOk={microOk}
              onBack={() => setView({ kind: "exercises" })}
              onReport={() => setView({ kind: "report" })}
            />
          </div>
        )}

        {view.kind === "report" && (
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <ReportCard
              progress={progress}
              lessons={ORDERED_LESSONS}
              onJump={gotoLesson}
              exercises={EXERCISES.map((e) => ({ id: e.id, title: e.title, icon: e.icon }))}
              exerciseResults={exResults}
              onJumpExercise={(id) => setView({ kind: "exercise", id })}
            />
          </div>
        )}
      </motion.main>

      {(view.kind === "home" ||
        view.kind === "courses" ||
        view.kind === "prerequisites" ||
        view.kind === "report" ||
        view.kind === "exercises") && (
        <footer className="mx-auto max-w-[1680px] px-6 py-10 text-center text-xs text-ink-faint">
          MediaJel Integrations · graded against Snowplow Micro · schemas via iglu.mediajel.ninja
        </footer>
      )}
    </div>
  );
}
