import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Accent, ACCENTS, useTheme } from "./theme/ThemeProvider";
import { AttemptStat, Check, MicroBundle, Progress } from "./lib/core";
import { Badge } from "./components/ui/badge";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ----------------------------------------------------------------- confetti */
export function celebrate() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const opts = { spread: 70, startVelocity: 45, ticks: 220, zIndex: 9999 };
  confetti({ ...opts, particleCount: 80, origin: { x: 0.2, y: 0.5 } });
  confetti({ ...opts, particleCount: 80, origin: { x: 0.8, y: 0.5 } });
  setTimeout(() => confetti({ ...opts, particleCount: 60, origin: { y: 0.4 } }), 180);
}

/* ----------------------------------------------------------------- mission text */
function renderInline(text: string, key: number): React.ReactNode {
  // split on `code` and **bold**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return (
            <strong key={i} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          );
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code
              key={i}
              className="rounded-md bg-surface-3/80 px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
            >
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </React.Fragment>
  );
}

export function MissionText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\n+/);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
      {blocks.map((b, i) => (
        <p key={i}>{renderInline(b, i)}</p>
      ))}
    </div>
  );
}

/** Inline-formatted text (supports `code` and **bold**) for single lines like objectives. */
export function Inline({ text }: { text: string }) {
  return <>{renderInline(text, 0)}</>;
}

/** A lesson's objectives rendered as an unchecked checklist (mirrors the graded checks on Play). */
export function Objectives({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-5">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        Objectives
      </div>
      <ul className="space-y-2">
        {items.map((o, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-soft">
            <span className="mt-[3px] h-[15px] w-[15px] shrink-0 rounded-[5px] border-[1.5px] border-ink-faint/50" />
            <span>{renderInline(o, i)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------- badges */
export function DifficultyBadge({ d }: { d: string }) {
  const variant = d === "Basics" ? "good" : d === "Advanced" ? "bad" : "default";
  return <Badge variant={variant as "good" | "bad" | "default"}>{d}</Badge>;
}

/* ----------------------------------------------------------------- theme switcher */
export function ThemeSwitcher() {
  const { mode, toggleMode, accent, setAccent } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-1 rounded-full bg-surface-3/60 p-1 sm:flex">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            title={a.label}
            onClick={() => setAccent(a.id as Accent)}
            className={cx(
              "h-5 w-5 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
              accent === a.id ? "ring-ink/50 scale-110" : "ring-transparent hover:scale-110",
            )}
            style={{ backgroundImage: a.swatch }}
          />
        ))}
      </div>
      <button
        onClick={toggleMode}
        className="btn-ghost h-9 w-9 !px-0"
        title={mode === "dark" ? "Switch to light" : "Switch to dark"}
        aria-label="Toggle theme"
      >
        {mode === "dark" ? "☾" : "☀"}
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- checks */
export function CheckRow({ c, index }: { c: Check; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 py-2"
    >
      <span
        className={cx(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
          c.pass ? "bg-good" : "bg-bad",
        )}
      >
        {c.pass ? "✓" : "✕"}
      </span>
      <div className="min-w-0">
        <div className={cx("text-sm", c.pass ? "text-ink" : "text-ink-soft")}>{c.label}</div>
        {c.detail && <div className="font-mono text-xs text-ink-faint">{c.detail}</div>}
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------- event inspector */
export function EventInspector({
  bundle,
  logs,
}: {
  bundle: MicroBundle | null;
  logs: { level: string; text: string }[];
}) {
  const [tab, setTab] = React.useState<"events" | "console">("events");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b hairline px-1 pb-2">
        {(["events", "console"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "rounded-lg px-3 py-1 text-xs font-medium capitalize transition",
              tab === t ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink-soft",
            )}
          >
            {t}
            {t === "events" && bundle ? ` · ${bundle.counts.total}` : ""}
            {t === "console" && logs.length ? ` · ${logs.length}` : ""}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1 font-mono text-xs">
        {tab === "events" ? (
          !bundle ? (
            <Empty>Press Play to capture events from the pipeline.</Empty>
          ) : bundle.good.length === 0 && bundle.bad.length === 0 ? (
            <Empty>No events captured yet.</Empty>
          ) : (
            <div className="space-y-1">
              {bundle.good.map((e, i) => (
                <EventPill key={"g" + i} good label={e.eventType} sub={shortSchema(e.schema)} />
              ))}
              {bundle.bad.map((e, i) => (
                <EventPill key={"b" + i} good={false} label="bad event" sub={badReason(e)} />
              ))}
            </div>
          )
        ) : logs.length === 0 ? (
          <Empty>console output appears here.</Empty>
        ) : (
          <div className="space-y-0.5">
            {logs.map((l, i) => (
              <div
                key={i}
                className={cx(
                  "whitespace-pre-wrap break-all",
                  l.level === "error" ? "text-bad" : l.level === "warn" ? "text-accent" : "text-ink-soft",
                )}
              >
                <span className="text-ink-faint">{l.level} ›</span> {l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="grid h-full place-items-center p-6 text-center text-xs text-ink-faint">
    {children}
  </div>
);

function EventPill({ good, label, sub }: { good: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-3/50 px-2.5 py-1.5">
      <span className={cx("h-2 w-2 shrink-0 rounded-full", good ? "bg-good" : "bg-bad")} />
      <span className="text-ink">{label}</span>
      {sub && <span className="truncate text-ink-faint">{sub}</span>}
    </div>
  );
}

const shortSchema = (s: string | null) =>
  s ? s.replace("iglu:", "").replace("/jsonschema", "") : "";
const badReason = (e: any) => {
  const err = e?.errors?.[0];
  if (typeof err === "string") return err.slice(0, 60);
  return JSON.stringify(err ?? "").slice(0, 60);
};

/* ----------------------------------------------------------------- report card */
export function ReportCard({
  progress,
  lessons,
  onJump,
}: {
  progress: Progress;
  lessons: { id: string; number: number; title: string }[];
  onJump?: (id: string) => void;
}) {
  const stats = lessons.map((l) => ({ l, s: progress[l.id] as AttemptStat | undefined }));
  const totals = stats.reduce(
    (a, { s }) => ({
      attempts: a.attempts + (s?.attempts ?? 0),
      passes: a.passes + (s?.passes ?? 0),
      failures: a.failures + (s?.failures ?? 0),
      completed: a.completed + (s?.completed ? 1 : 0),
    }),
    { attempts: 0, passes: 0, failures: 0, completed: 0 },
  );
  const pct = Math.round((totals.completed / lessons.length) * 100);
  return (
    <div className="card overflow-hidden p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            Report Card
          </div>
          <h3 className="text-2xl font-semibold text-ink">Your progress</h3>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold grad-text">{pct}%</div>
          <div className="text-xs text-ink-faint">
            {totals.completed}/{lessons.length} lessons complete
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Attempts" value={totals.attempts} />
        <Stat label="Passes" value={totals.passes} tone="good" />
        <Stat label="Failures" value={totals.failures} tone="bad" />
      </div>

      <div className="divide-y hairline">
        {stats.map(({ l, s }) => {
          const ratio = s?.bestRatio ?? 0;
          return (
            <button
              key={l.id}
              onClick={() => onJump?.(l.id)}
              className="flex w-full items-center gap-4 py-3 text-left transition hover:opacity-80"
            >
              <span
                className={cx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  s?.completed ? "bg-good text-white" : "bg-surface-3 text-ink-faint",
                )}
              >
                {s?.completed ? "✓" : l.number + 1}
              </span>
              <span className="flex-1 truncate text-sm text-ink">{l.title}</span>
              <span className="hidden text-xs text-ink-faint sm:block">
                {s ? `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}` : "—"}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-surface-3/50 p-4 text-center">
      <div
        className={cx(
          "text-3xl font-bold",
          tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- micro status */
export function MicroStatus({ ok }: { ok: boolean | null }) {
  // Link to Micro's own origin (default :9090) — the UI is a self-contained SPA that
  // renders correctly there; behind the same-origin proxy its base path doesn't resolve.
  const microUiUrl =
    typeof location !== "undefined"
      ? `${location.protocol}//${location.hostname}:9090/micro/ui`
      : "http://localhost:9090/micro/ui";
  return (
    <a
      href={microUiUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open the Snowplow Micro UI in a new tab"
      className="group flex items-center gap-2 rounded-full bg-surface-3/60 px-3 py-1.5 text-xs transition hover:bg-surface-3"
    >
      <span className="relative flex h-2 w-2">
        {ok && (
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-good" />
        )}
        <span
          className={cx(
            "relative inline-flex h-2 w-2 rounded-full",
            ok === null ? "bg-ink-faint" : ok ? "bg-good" : "bg-bad",
          )}
        />
      </span>
      <span className="text-ink-soft">
        {ok === null ? "Checking Micro…" : ok ? "Snowplow Micro" : "Micro offline"}
      </span>
      <span className="text-ink-faint transition group-hover:text-ink-soft">↗</span>
    </a>
  );
}

export { AnimatePresence, motion };
