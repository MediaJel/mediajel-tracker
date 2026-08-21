import { TrackerWidgetProvider } from "@mediajel/tracker-widget/api";

/**
 * The recorded session and everything the timeline can hold.
 *
 * This file is a contract, not an implementation detail: the recorder (Task 2), Review, the
 * prompt builder, Verify and Deploy all read these shapes out of one persisted blob. Later
 * tasks may ADD fields; renaming one silently invalidates every session already sitting in a
 * tab's sessionStorage, so treat the names as frozen.
 */

/** The two integrations the assistant knows how to build a tag for. */
export type WidgetGoal = "transaction" | "signup";

/**
 * Where the operator is in the work order. `settings` is deliberately absent: it is an
 * overlay that can be opened from any step and leaves the step untouched (see state/machine).
 */
export type WidgetStep = "home" | "recording" | "review" | "generating" | "result" | "verify" | "deploy" | "done";

/** One page the recording spanned. Multi-page checkouts produce several. */
export interface WidgetPage {
  id: string;
  url: string;
  title: string;
  /** ms since `WidgetSession.startedAt`, same clock as `TimelineEvent.t`. */
  t: number;
}

/** Fields every timeline event carries, whatever its kind. */
export interface TimelineEventBase {
  id: string;
  /**
   * ms since `WidgetSession.startedAt` — a delta, not an epoch. Review renders it as `+ms`
   * directly, and four digits per event instead of thirteen matters against the size cap.
   */
  t: number;
  /** `WidgetPage.id` this happened on. */
  pageId: string;
  /** One dense line for Review rows and the compressed prompt timeline. */
  summary: string;
  /**
   * Cheap keyword/amount/long-id heuristic (Task 2). Sorts Review and pre-suggests what to
   * mark; the engineer always confirms, so it never gates anything on its own.
   */
  score: number;
}

/** A page load or SPA route that started a new `WidgetPage`. */
export interface PageEvent extends TimelineEventBase {
  kind: "page";
}

/** How a request left the page. */
export type NetworkSub = "fetch" | "xhr" | "beacon";

/**
 * `tracker` marks traffic the MediaJel tag itself produced (the collector, `…/tp2`,
 * `/analytics/track`) so Review can say "the tracker already fired X" instead of offering it
 * as a signal to build on. Provider and GitHub calls are never recorded at all — they go
 * through the pristine references captured in runtime.ts, which the recorder never wraps.
 */
export type NetworkCategory = "page" | "tracker";

export interface NetworkEvent extends TimelineEventBase {
  kind: "network";
  sub: NetworkSub;
  method: string;
  url: string;
  status: number;
  reqType: string;
  reqBody: string;
  resType: string;
  resBody: string;
  ms: number;
  category: NetworkCategory;
}

/** A `push` onto a data layer array (`dataLayer`, `digitalData`, a custom global). */
export interface DataLayerEvent extends TimelineEventBase {
  kind: "datalayer";
  /** Name of the global the array is published under. */
  layer: string;
  data: unknown;
  /** True when this entry was already in the array before we patched it. */
  replayed?: boolean;
}

export interface FormFieldSnapshot {
  name: string;
  type: string;
  /** Already masked — see session/masking (Task 2). Raw values never reach the timeline. */
  value: string;
}

export interface FormEvent extends TimelineEventBase {
  kind: "form";
  selector: string;
  action: string;
  method: string;
  fields: FormFieldSnapshot[];
}

export interface ClickEvent extends TimelineEventBase {
  kind: "click";
  selector: string;
  tag: string;
  text: string;
  href: string | null;
}

/** The history mechanism that moved the page. */
export type NavSub = "pushState" | "replaceState" | "popstate" | "hashchange" | "load";

export interface NavEvent extends TimelineEventBase {
  kind: "nav";
  sub: NavSub;
  from: string;
  to: string;
}

export interface DomSnapshotItem {
  selector: string;
  /** Clamped to DOM_TEXT_CHAR_CAP — see session/bounds. */
  text: string;
}

export interface DomEvent extends TimelineEventBase {
  kind: "dom";
  items: DomSnapshotItem[];
}

export type StorageArea = "local" | "session";
export type StorageOp = "set" | "remove" | "clear";

/** Named to stay clear of the DOM's own `StorageEvent`. */
export interface StorageWriteEvent extends TimelineEventBase {
  kind: "storage";
  area: StorageArea;
  op: StorageOp;
  key: string;
  value: string | null;
}

/** Named to stay clear of the DOM's own `MessageEvent`, which the recorder also handles. */
export interface PostMessageEvent extends TimelineEventBase {
  kind: "message";
  origin: string;
  data: unknown;
}

/** One-shot snapshot of what the page is built on, taken when recording starts. */
export interface PlatformEvent extends TimelineEventBase {
  kind: "platform";
  /** Best guess, e.g. "Shopify", "WooCommerce", or "" when nothing matched. */
  detected: string;
  /** Names of the telling globals that were present. */
  globals: string[];
  /** Whether the page routes client-side. */
  spa: boolean;
}

export type TimelineEvent =
  | PageEvent
  | NetworkEvent
  | DataLayerEvent
  | FormEvent
  | ClickEvent
  | NavEvent
  | DomEvent
  | StorageWriteEvent
  | PostMessageEvent
  | PlatformEvent;

export type TimelineEventKind = TimelineEvent["kind"];

/** What one generation run produced. Task 5 adds the model's structured output alongside. */
export interface WidgetGeneration {
  /** Epoch ms the run finished. */
  at: number;
  /** Provider + model the code came from, e.g. "anthropic/claude-sonnet-5". */
  model: string;
  /** The generated tag source, exactly as it will be verified and deployed. */
  code: string;
}

/** One tracker call the verify interceptor caught. It is recorded and never forwarded. */
export interface VerifyCapture {
  /** "trackTrans" | "trackSignUp" | "addToCart" | "removeFromCart". */
  name: string;
  payload: unknown;
  /** Epoch ms. */
  at: number;
}

export interface WidgetVerify {
  captured: VerifyCapture[];
  errors: string[];
}

/** Where the generated tag landed. Task 7 fills this in from the GitHub response. */
export interface WidgetDeploy {
  /** Epoch ms. */
  at: number;
  kind: "domain" | "app-id";
  /** Repo-relative path, e.g. "src/domains/www.example.com.ts". */
  path: string;
  commitUrl: string;
}

/** Current schema version of the persisted blob. Bump it and old sessions are discarded. */
export const WIDGET_SESSION_VERSION = 1;

export interface WidgetSession {
  v: typeof WIDGET_SESSION_VERSION;
  id: string;
  goal: WidgetGoal;
  step: WidgetStep;
  /** Epoch ms. Every `t` in the session is measured from here. */
  startedAt: number;
  pages: WidgetPage[];
  timeline: TimelineEvent[];
  /** Ids of the events the engineer pinned as evidence. These are never evicted. */
  markedIds: string[];
  notes?: string;
  generation?: WidgetGeneration;
  verify?: WidgetVerify;
  deploy?: WidgetDeploy;
  /** Set once anything was dropped to stay inside the storage budget. */
  truncated?: boolean;
}

/** Settings shape lives with the store that owns it — re-exported here for convenience. */
export type { TrackerWidgetProvider };
