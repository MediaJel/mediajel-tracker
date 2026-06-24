/**
 * Grading engine for the Integrations training site.
 *
 * Flow per "Play":  reset Micro → run learner code in a sandboxed iframe (which loads the real
 * tag pointed at our Micro proxy) → poll Micro until events settle → run the lesson's validator
 * over the captured events → produce a per-check report.
 */

// ---------------------------------------------------------------------------- Micro types
export interface MicroGoodEvent {
  eventType: string;
  schema: string | null;
  contexts: string[];
  event: Record<string, any>;
  rawEvent?: any;
}
export interface MicroBadEvent {
  collectorPayload?: any;
  rawEvent?: any;
  errors?: any[];
}
export interface MicroCounts {
  total: number;
  good: number;
  bad: number;
}
export interface MicroBundle {
  counts: MicroCounts;
  good: MicroGoodEvent[];
  bad: MicroBadEvent[];
}

/** Fetch + parse JSON, returning `fallback` on any network/non-OK/parse error (never throws). */
async function safeJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

export const micro = {
  async reset(): Promise<void> {
    try {
      await fetch("/micro/reset", { method: "POST" });
    } catch {
      /* ignore */
    }
  },
  async all(): Promise<MicroCounts> {
    return safeJson<MicroCounts>("/micro/all", { total: 0, good: 0, bad: 0 });
  },
  async good(): Promise<MicroGoodEvent[]> {
    return safeJson<MicroGoodEvent[]>("/micro/good", []);
  },
  async bad(): Promise<MicroBadEvent[]> {
    return safeJson<MicroBadEvent[]>("/micro/bad", []);
  },
  /** Is Micro reachable through the proxy? */
  async health(): Promise<boolean> {
    try {
      const r = await fetch("/micro/all", { cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  },
  /** Poll until the event count stops growing (settled) or timeout, then return everything. */
  async collect(opts: { settleMs?: number; timeoutMs?: number } = {}): Promise<MicroBundle> {
    const settleMs = opts.settleMs ?? 700;
    const timeoutMs = opts.timeoutMs ?? 6500;
    const start = Date.now();
    let last = -1;
    let stableSince = Date.now();
    while (Date.now() - start < timeoutMs) {
      let counts: MicroCounts;
      try {
        counts = await this.all();
      } catch {
        counts = { total: 0, good: 0, bad: 0 };
      }
      if (counts.total !== last) {
        last = counts.total;
        stableSince = Date.now();
      } else if (counts.total > 0 && Date.now() - stableSince >= settleMs) {
        break;
      }
      await sleep(250);
    }
    const [good, bad, counts] = await Promise.all([this.good(), this.bad(), this.all()]);
    return { counts, good, bad };
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The tag's deduplication extension records tracked ids in localStorage under `${appId}_${eventType}`.
 * The sandbox iframe is same-origin, so without clearing these a re-run of a lesson would be
 * discarded as a duplicate. Clear just this appId's keys (not the app's own progress/theme).
 */
export function clearTrackerState(appId: string): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(appId + "_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------- Sandbox
/** A captured console line. `css` is the style from a `console.log("%c…", css)` call (the tag's
 * logger uses these), rendered as a colored badge in the inspector's Console tab. */
export interface ConsoleLog {
  level: string;
  text: string;
  css?: string;
}
export interface SandboxResult {
  ran: boolean;
  error?: string;
  logs: ConsoleLog[];
}

/**
 * Run an iframe `srcdoc` that loads the tag + learner code. Resolves when the document posts
 * `{__mj:"done"}` or after `maxMs`. The iframe is same-origin (allow-same-origin) so the tag,
 * collector and Micro proxy are all same-origin — no CORS.
 */
export function runSandbox(srcdoc: string, maxMs = 9000): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const logs: ConsoleLog[] = [];
    let settled = false;
    const prev = document.getElementById("mj-sandbox");
    if (prev) prev.remove();

    const frame = document.createElement("iframe");
    frame.id = "mj-sandbox";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText =
      "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none;";

    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object" || (d as any).__mj === undefined) return;
      if (d.__mj === "log") logs.push({ level: d.level || "log", text: d.text, css: d.css });
      if (d.__mj === "error") logs.push({ level: "error", text: d.error });
      if (d.__mj === "done") finish(d.error);
    };
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      // leave the frame briefly so in-flight beacons flush, then remove
      setTimeout(() => frame.remove(), 1500);
      resolve({ ran: true, error, logs });
    };
    const timer = setTimeout(() => finish(), maxMs);

    window.addEventListener("message", onMsg);
    frame.srcdoc = srcdoc;
    document.body.appendChild(frame);
  });
}

// ---------------------------------------------------------------------------- Lesson model
export type Difficulty = "Basics" | "Intermediate" | "Advanced";

export interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail?: string;
}

export interface SandboxContext {
  origin: string;
  /** host:port (used as the protocol-relative collector override) */
  host: string;
  appId: string;
  /** convenience: the local tag URL with params */
  tagUrl: (params: Record<string, string>) => string;
}

/** Build a SandboxContext for an appId against the current origin (shared by lessons & exercises). */
export const ctxFor = (appId: string): SandboxContext => ({
  origin: location.origin,
  appId,
  host: location.host,
  tagUrl: (params) => "/tag/index.js?" + new URLSearchParams(params).toString(),
});

export interface Lesson {
  id: string;
  title: string;
  tagline: string;
  difficulty: Difficulty;
  icon: string;
  /** Markdown-ish mission text (rendered with a tiny formatter): the "why" and "how". */
  mission: string;
  /** Concrete, gradable objectives shown as a checklist — the "what to accomplish". */
  objectives: string[];
  hints: string[];
  language: "html" | "javascript";
  starterCode: string;
  /** Optional reference solution. Intentionally omitted for most lessons — the learner writes the
   * integration and Snowplow Micro is the sole grader; there is no "reveal answer" shortcut. */
  solutionCode?: string;
  appId: string;
  /** Build the iframe srcdoc from the learner's code. */
  buildSandbox: (code: string, ctx: SandboxContext) => string;
  /** Turn captured Micro events into graded checks. */
  validate: (bundle: MicroBundle) => Check[];
}

// ---------------------------------------------------------------------------- Curriculum model
/**
 * The curriculum is a flat list of Sections, each a card on the Courses page (mirroring Exercises).
 * A Section lists its lessons by id in display order. This manifest (in lessons.tsx) is the single
 * source of truth for grouping AND ordering — the LESSONS array order is irrelevant and lessons
 * carry no position field of their own. (Pre-requisites is handled separately in the UI — it has no
 * lessons, just the debugging tools to install.)
 */
export interface Section {
  id: string;
  label: string;
  blurb: string;
  /** Emoji shown on the section card. */
  icon: string;
  /** Lesson ids, in the order they should appear within this section. */
  lessonIds: string[];
}

// ---------------------------------------------------------------------------- Validator helpers
export const findGood = (b: MicroBundle, pred: (e: MicroGoodEvent) => boolean) => b.good.find(pred);

export const hasEventType = (b: MicroBundle, t: string) => b.good.some((e) => e.eventType === t);

/**
 * True when Micro quarantined nothing — i.e. every event the learner produced validated against
 * its Iglu schema and reached `/micro/good`, with none routed to `/micro/bad`. This is the literal
 * "the events received are correct" guarantee: a malformed payload (wrong type, missing required
 * field, unknown property) lands in `bad` and flips this to false.
 */
export const noBadEvents = (b: MicroBundle) => b.bad.length === 0;

/** Pull the inner self-describing event data (works for good events). */
export function unstructData(e: MicroGoodEvent): { schema?: string; data?: any } | null {
  const ue = e.event?.unstruct_event;
  if (ue?.data) return ue.data;
  // some Micro versions expose it differently; fall back to rawEvent ue_pr
  const uePr = e.rawEvent?.parameters?.ue_pr;
  if (uePr) {
    try {
      const parsed = JSON.parse(uePr);
      return parsed.data ?? parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Find a self-describing (unstruct) event whose inner schema matches a vendor/name fragment. */
export function findSelfDescribing(b: MicroBundle, schemaFragment: string) {
  return b.good.find((e) => {
    if (e.eventType !== "unstruct") return false;
    if (e.schema && e.schema.includes(schemaFragment)) return true;
    const d = unstructData(e);
    return !!d?.schema && d.schema.includes(schemaFragment);
  });
}

// ---------------------------------------------------------------------------- Persistence
export interface AttemptStat {
  attempts: number;
  passes: number;
  failures: number;
  lastChecks: Check[];
  completed: boolean;
  bestRatio: number; // best passed/total
}
export type Progress = Record<string, AttemptStat>;

const KEY = "mj-progress-v1";

export function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function recordAttempt(p: Progress, lessonId: string, checks: Check[]): Progress {
  const prev = p[lessonId] ?? {
    attempts: 0,
    passes: 0,
    failures: 0,
    lastChecks: [],
    completed: false,
    bestRatio: 0,
  };
  const passedAll = checks.length > 0 && checks.every((c) => c.pass);
  const ratio = checks.length ? checks.filter((c) => c.pass).length / checks.length : 0;
  const next: AttemptStat = {
    attempts: prev.attempts + 1,
    passes: prev.passes + (passedAll ? 1 : 0),
    failures: prev.failures + (passedAll ? 0 : 1),
    lastChecks: checks,
    completed: prev.completed || passedAll,
    bestRatio: Math.max(prev.bestRatio, ratio),
  };
  const updated = { ...p, [lessonId]: next };
  saveProgress(updated);
  return updated;
}
