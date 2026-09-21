import type { AuthChallenge, Identity } from "~/auth/cognito";
import { SIGNED_OUT } from "~/auth/signed-out";
import type { DeployOutcome, ExistingTag, OverridesPreview, TagActivityResponse } from "~/service/client";
import type { JobSummary } from "~/store/jobs";
import type { Settings } from "~/store/settings";
import type { TagRecord } from "@mediajel/assistant-core/tags";
import type { TrackerStatus } from "@mediajel/assistant-core/tags";
import type { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";
import type { LedgerDelta, LedgerView } from "@mediajel/assistant-core/wire/types";
import type { SimulationView, SiteSimulation } from "@mediajel/assistant-core/simulation";

/**
 * What the panel, the popup and the options page can ask the background to do.
 *
 * One request union rather than a folder of handlers: the surface is small, every case is on
 * one screen, and the alternative pulls in a codegen step for the privilege of splitting nine
 * functions across nine files.
 *
 * Everything that touches a credential is on this side of the line. The panel never sees an ID
 * token, never talks to the assistant service, and never reads `chrome.storage` for auth — it
 * asks, and it is told what happened.
 */

export type Request =
  // — identity —
  | { type: "auth/session" }
  | { type: "auth/sign-in"; username: string; password: string }
  | { type: "auth/answer"; kind: AuthChallenge["kind"]; answer: string }
  | { type: "auth/sign-out" }
  | { type: "auth/check-access" }
  // — settings —
  | { type: "settings/read" }
  | { type: "settings/write"; patch: Partial<Settings> }
  // — jobs —
  | { type: "job/open"; tabId: number }
  | { type: "job/list" }
  | { type: "job/delete"; site: string }
  | { type: "job/clear-all" }
  | { type: "job/reset"; tabId: number; goal?: WidgetGoal }
  | { type: "job/advance"; tabId: number; to: WidgetStep; confirmed?: boolean }
  | { type: "job/patch"; tabId: number; patch: JobPatch }
  // — the page —
  | { type: "page/start-recording"; tabId: number; goal: WidgetGoal }
  | { type: "page/stop-recording"; tabId: number }
  | { type: "page/verify"; tabId: number }
  | { type: "page/clear-dedup"; tabId: number }
  // — the service —
  | { type: "service/generate"; tabId: number }
  | { type: "service/cancel-generate"; tabId: number }
  | { type: "service/existing-tag"; kind: "domain" | "app-id"; name: string }
  | { type: "service/deploy"; tabId: number; kind: "domain" | "app-id"; name: string; expectedSha?: string }
  | { type: "service/tag-activity"; appIds: string[] }
  | { type: "service/overrides-preview"; appId: string; edits: Record<string, string> }
  // — the ledger —
  | { type: "events/read"; tabId: number }
  | { type: "events/clear"; tabId: number }
  // — the simulated tag —
  | { type: "simulation/read"; tabId: number }
  | { type: "simulation/install"; tabId: number; url: string }
  | { type: "simulation/pause"; tabId: number; enabled: boolean }
  /** Try an edit to a tag's configuration on the site; no edits stop trying it. Keyed by the app ID the tag's URL names. */
  | { type: "simulation/try"; tabId: number; appId: string; edits: Record<string, string> }
  /** Start the tab's page again, so a tag that read its configuration too early reads it with the edits. */
  | { type: "simulation/reload"; tabId: number }
  /** `tabId` is the tab the removal came from: reloaded when it shows that site. */
  | { type: "simulation/remove"; site: string; tabId?: number }
  | { type: "simulation/list" };

/** The requests about a simulated tag, which the background answers from its own module. */
export type SimulationRequest = Extract<Request, { type: `simulation/${string}` }>;

/** The data-only edits the panel is allowed to make to a job. Steps go through `job/advance`. */
export type JobPatch =
  | { op: "toggle-mark"; id: string }
  | { op: "notes"; notes: string }
  | { op: "evidence-mode"; mode: "suggest" | "pinpoint" }
  | { op: "code"; code: string }
  | { op: "clear-marks" };

export interface JobView {
  site: string;
  session: WidgetSession;
  /** What the Record step and the prompt read, derived from `tags`. */
  status: TrackerStatus;
  /** Every MediaJel tag known on this tab's page, in the order first seen. */
  tags: TagRecord[];
  /** Whether the page has had its moment to load a tag — "no tag" means nothing before this. */
  settled: boolean;
}

export type Response<T> = { ok: true; value: T } | { ok: false; error: string; code?: string };

export interface AuthState {
  identity: Identity | null;
  challenge: AuthChallenge | null;
}

/** The result type for each request, so callers get a real type rather than `unknown`. */
export interface ResultOf {
  "auth/session": AuthState;
  "auth/sign-in": AuthState;
  "auth/answer": AuthState;
  "auth/sign-out": AuthState;
  "auth/check-access": string;
  "settings/read": Settings;
  "settings/write": Settings;
  "job/open": JobView | null;
  "job/list": JobSummary[];
  "job/delete": null;
  "job/clear-all": null;
  "job/reset": JobView;
  "job/advance": WidgetStep;
  "job/patch": WidgetSession;
  "page/start-recording": WidgetStep;
  "page/stop-recording": WidgetStep;
  "page/verify": null;
  "page/clear-dedup": null;
  "service/generate": null;
  "service/cancel-generate": null;
  "service/existing-tag": ExistingTag;
  "service/deploy": DeployOutcome;
  "service/tag-activity": TagActivityResponse;
  "service/overrides-preview": OverridesPreview;
  /** The tab's ledger, newest first — empty for a tab that has moved to another site. */
  "events/read": LedgerView;
  "events/clear": null;
  "simulation/read": SimulationView;
  "simulation/install": SimulationView;
  "simulation/pause": SimulationView;
  "simulation/try": SimulationView;
  "simulation/reload": null;
  /** Every simulated tag left in this browser. */
  "simulation/remove": SiteSimulation[];
  "simulation/list": SiteSimulation[];
}

/** What the background pushes at a bound panel without being asked. */
export type Push =
  | { type: "session"; session: WidgetSession }
  /** What is now known about the bound tab's tags — after any source learned something new. */
  | { type: "tags"; site: string; tags: TagRecord[]; settled: boolean; status: TrackerStatus }
  /** What just changed in the bound tab's ledger — deltas only; the panel reads the rest with `events/read`. */
  | ({ type: "events"; site: string } & LedgerDelta)
  /** What the page did with the site's simulated tag, when it said something new. */
  | { type: "simulation"; site: string; view: SimulationView }
  | { type: "verify-result"; ok: boolean; errors: string[] }
  | { type: "dedup-cleared"; count: number }
  | { type: "generation-error"; message: string }
  | { type: "signed-out"; message: string };

type SignedOutListener = (reason: string) => void;
const signedOutListeners = new Set<SignedOutListener>();

/**
 * Calls back whenever the background answers that the session has ended — whichever request found it
 * out — so the panel goes to sign in rather than showing the failure under that one request.
 */
export const onSignedOut = (listener: SignedOutListener): (() => void) => {
  signedOutListeners.add(listener);
  return () => {
    signedOutListeners.delete(listener);
  };
};

/**
 * Ask the background something. Rejects with the background's own message, so a caller can put
 * the string straight in front of the operator — every error that reaches here was written to
 * be read by one.
 */
export const ask = async <K extends Request["type"]>(request: Extract<Request, { type: K }>): Promise<ResultOf[K]> => {
  const response = (await chrome.runtime.sendMessage(request)) as Response<ResultOf[K]> | undefined;
  if (!response) throw new Error("The assistant's background service did not answer. Try again.");
  if (!response.ok) {
    if (response.code === SIGNED_OUT) for (const listener of signedOutListeners) listener(response.error);
    throw Object.assign(new Error(response.error), { code: response.code });
  }
  // Every request the background knows answers with a value or null, and Chrome's messaging drops
  // an undefined value — so `{ ok: true }` alone is a background older than this panel, answering a
  // request it has no case for. Said here, instead of as a crash wherever the value is first used.
  if (response.value === undefined) {
    throw new Error(
      "The assistant's background is older than this panel. Reload the extension in chrome://extensions, then reopen the panel.",
    );
  }
  return response.value;
};
