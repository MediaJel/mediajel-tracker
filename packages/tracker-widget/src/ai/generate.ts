import logger from "@mediajel/tracker-widget/log";
import { GenerationOutput, GenerationSchema } from "@mediajel/tracker-widget/ai/schema";
import { buildInstructions } from "@mediajel/tracker-widget/ai/system";
import { buildPrompt } from "@mediajel/tracker-widget/ai/prompt";
import { validateGenerated } from "@mediajel/tracker-widget/ai/validate";
import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";
import { WidgetSettings } from "@mediajel/tracker-widget/session/settings";
import { WidgetSession } from "@mediajel/tracker-widget/types";

/**
 * One generation run: instructions + evidence → MediaJel's assistant service → structured
 * output → mechanical validation → at most ONE repair round with the violations fed back.
 *
 * The widget builds the prompt and validates the answer; the service (mediajel-serverless,
 * `services/widget-api`) owns the model and its key. The operator's GitHub token is the access
 * credential — the one they already need to deploy. Failures come back as messages an operator
 * can act on, never as raw stacks.
 */

declare global {
  interface Window {
    __MJ_WIDGET_MOCK_MODEL__?: unknown;
  }
}

/** What the E2E specs install: one canned JSON output, a sequence (repair rounds), or a failure. */
export interface MockModelMarker {
  json?: unknown;
  /** When set, every call rejects with this message — the failure path, end to end. */
  error?: string;
}

export interface GenerateInput {
  session: WidgetSession;
  status: TrackerStatus;
  settings: WidgetSettings;
  runtime: WidgetRuntime;
  signal?: AbortSignal;
}

export interface GenerateResult {
  output: GenerationOutput;
  model: string;
  /** Non-empty when even the repair round left violations — shown, not hidden. */
  violations: string[];
}

/** A run that hangs is a failure the operator must see; 120s is generous for a tag. */
export const GENERATION_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 20_000;

/** Inlined by Parcel at build time; empty in a build that was not given a service URL. */
export const apiUrl = (): string => (process.env.WIDGET_API_URL || "").trim().replace(/\/+$/, "");

/** An answer the service gave on purpose: its status and its own message. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const statusFallback = (status: number): string => {
  if (status === 401) return "The assistant service did not accept your GitHub token. Check it in Settings.";
  if (status === 403)
    return "Your GitHub token cannot push to the frictionless repo, so the assistant service refused it.";
  if (status === 429) return "The assistant service is rate limiting requests. Wait a moment and try again.";
  if (status === 504) return "The model did not answer in time. Try again.";
  return `The assistant service answered ${status}.`;
};

export const describeFailure = (err: unknown, cspBlocked = false): string => {
  if (err instanceof ServiceError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out/i.test(message)) return "The assistant service did not answer within two minutes. Try again.";
  if (/abort/i.test(message)) return "Cancelled.";
  if (/no assistant service url/i.test(message)) return message;
  if (/\b401\b|unauthori[sz]ed/i.test(message)) return statusFallback(401);
  if (/\b403\b|forbidden/i.test(message)) return statusFallback(403);
  if (/\b429\b|rate.?limit/i.test(message)) return statusFallback(429);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    if (cspBlocked) {
      return "This site's Content-Security-Policy blocks calls to MediaJel's assistant service. Use the integrations sandbox, or paste the code by hand.";
    }
    return "Could not reach MediaJel's assistant service. Check your connection, or try again from the integrations sandbox.";
  }
  return `The assistant service call failed: ${message}`;
};

/** Flags a CSP connect-src block seen while `work` ran — the one network failure not about the service. */
const withCspWatch = async <T>(work: () => Promise<T>): Promise<T> => {
  let blocked = false;
  const onViolation = (event: Event): void => {
    const violation = event as SecurityPolicyViolationEvent;
    if (/connect-src|default-src/.test(violation.violatedDirective ?? "")) blocked = true;
  };
  document.addEventListener("securitypolicyviolation", onViolation);
  try {
    return await work();
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { cspBlocked: blocked });
  } finally {
    document.removeEventListener("securitypolicyviolation", onViolation);
  }
};

const cspFlag = (err: unknown): boolean =>
  !!(err && typeof err === "object" && (err as { cspBlocked?: boolean }).cspBlocked);

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

interface GenerateResponse {
  output: unknown;
  model: string;
}

interface HealthResponse {
  ok: boolean;
  model: string;
  login: string;
}

/** Per-marker call counter, so `{ json: [first, repaired] }` plays out across the repair round. */
const mockCalls = new WeakMap<object, number>();

const mockAnswer = (marker: MockModelMarker, path: string): unknown => {
  if (marker.error) throw new Error(marker.error);
  const calls = mockCalls.get(marker) ?? 0;
  mockCalls.set(marker, calls + 1);
  const json = Array.isArray(marker.json) ? marker.json[Math.min(calls, marker.json.length - 1)] : marker.json;
  if (path === "/health") return { ok: true, model: "mock-model", login: "mock" } satisfies HealthResponse;
  return { output: json, model: "mock-model" } satisfies GenerateResponse;
};

/**
 * One call to the service over the pristine fetch: the recorder never sees it and a page that
 * wrapped `window.fetch` never gets the token. A non-2xx answer becomes a `ServiceError`
 * carrying the service's own message.
 */
const callService = async <T>(
  path: string,
  settings: WidgetSettings,
  runtime: WidgetRuntime,
  options: { method: "GET" | "POST"; body?: unknown; signal?: AbortSignal },
): Promise<T> => {
  const mock = window.__MJ_WIDGET_MOCK_MODEL__;
  if (mock && typeof mock === "object") return mockAnswer(mock as MockModelMarker, path) as T;

  const base = apiUrl();
  if (!base) throw new Error("This build has no assistant service URL (WIDGET_API_URL), so it cannot generate.");

  const response = await runtime.pristineFetch(`${base}${path}`, {
    method: options.method,
    headers: {
      authorization: `Bearer ${settings.githubToken.trim()}`,
      accept: "application/json",
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ServiceError(response.status, error?.code ?? "http", error?.message ?? statusFallback(response.status));
  }
  return data as T;
};

/**
 * Settings' "Check access": the token is accepted by the service and the service is
 * configured. Resolves with a one-line description of what answered, rejects with an
 * operator-readable message. No model spend.
 */
export const testConnection = async (settings: WidgetSettings, runtime: WidgetRuntime): Promise<string> => {
  try {
    const health = await withCspWatch(() =>
      withTimeout(callService<HealthResponse>("/health", settings, runtime, { method: "GET" }), HEALTH_TIMEOUT_MS),
    );
    return `${health.model} · token of ${health.login}`;
  } catch (err) {
    logger.warn("Access check failed:", err instanceof Error ? err.message : err);
    throw new Error(describeFailure(err, cspFlag(err)));
  }
};

export const generateTag = async ({
  session,
  status,
  settings,
  runtime,
  signal,
}: GenerateInput): Promise<GenerateResult> => {
  const instructions = buildInstructions(session.goal);
  const prompt = buildPrompt(session, status);
  let modelName = "MediaJel assistant";

  const run = async (extra?: string): Promise<GenerationOutput> => {
    const answer = await callService<GenerateResponse>("/generate", settings, runtime, {
      method: "POST",
      body: { instructions, prompt: extra ? `${prompt}\n\n${extra}` : prompt },
      signal,
    });
    const parsed = GenerationSchema.safeParse(answer.output);
    if (!parsed.success) {
      throw new Error("The assistant service returned an object that does not match the tag contract. Try again.");
    }
    if (answer.model) modelName = answer.model;
    return parsed.data;
  };

  let output: GenerationOutput;
  try {
    output = await withCspWatch(() => withTimeout(run(), GENERATION_TIMEOUT_MS));
  } catch (err) {
    logger.warn("Generation failed:", err instanceof Error ? err.message : err);
    throw new Error(describeFailure(err, cspFlag(err)));
  }

  let violations = validateGenerated({
    code: output.code,
    goal: session.goal,
    appIdTarget: output.suggestedTarget.kind === "app-id",
  });
  if (violations.length > 0) {
    logger.debug("Generated code failed validation; running one repair round.", violations);
    try {
      const repaired = await run(
        `YOUR PREVIOUS FILE FAILED MECHANICAL VALIDATION. Violations:\n- ${violations.join("\n- ")}\n\nPrevious file:\n${output.code}\n\nReturn the corrected structured object; fix every violation without changing the approach.`,
      );
      const repairedViolations = validateGenerated({
        code: repaired.code,
        goal: session.goal,
        appIdTarget: repaired.suggestedTarget.kind === "app-id",
      });
      if (repairedViolations.length < violations.length) {
        output = repaired;
        violations = repairedViolations;
      }
    } catch (err) {
      logger.warn("Repair round failed; keeping the first result with its violations.", err);
    }
  }

  return { output, model: modelName, violations };
};
