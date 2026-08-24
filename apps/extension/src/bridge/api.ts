import type { AuthChallenge, Identity } from "~/auth/cognito";
import type { DeployOutcome, ExistingTag } from "~/service/client";
import type { JobSummary } from "~/store/jobs";
import type { Settings } from "~/store/settings";
import type { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import type { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";

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
  | { type: "page/snapshot"; tabId: number }
  | { type: "page/verify"; tabId: number }
  | { type: "page/inject-tag"; tabId: number; url: string }
  | { type: "page/clear-dedup"; tabId: number }
  // — the service —
  | { type: "service/generate"; tabId: number }
  | { type: "service/cancel-generate"; tabId: number }
  | { type: "service/existing-tag"; kind: "domain" | "app-id"; name: string }
  | { type: "service/deploy"; tabId: number; kind: "domain" | "app-id"; name: string; expectedSha?: string };

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
  status: TrackerStatus | null;
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
  "page/snapshot": TrackerStatus | null;
  "page/verify": null;
  "page/inject-tag": null;
  "page/clear-dedup": null;
  "service/generate": null;
  "service/cancel-generate": null;
  "service/existing-tag": ExistingTag;
  "service/deploy": DeployOutcome;
}

/** What the background pushes at a bound panel without being asked. */
export type Push =
  | { type: "session"; session: WidgetSession }
  | { type: "status"; status: TrackerStatus }
  | { type: "verify-result"; ok: boolean; errors: string[] }
  | { type: "dedup-cleared"; count: number }
  | { type: "generation-error"; message: string };

/**
 * Ask the background something. Rejects with the background's own message, so a caller can put
 * the string straight in front of the operator — every error that reaches here was written to
 * be read by one.
 */
export const ask = async <K extends Request["type"]>(request: Extract<Request, { type: K }>): Promise<ResultOf[K]> => {
  const response = (await chrome.runtime.sendMessage(request)) as Response<ResultOf[K]> | undefined;
  if (!response) throw new Error("The assistant's background service did not answer. Try again.");
  if (!response.ok) throw Object.assign(new Error(response.error), { code: response.code });
  return response.value;
};
