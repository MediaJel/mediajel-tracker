import { GenerationOutput, GenerationSchema } from "@mediajel/assistant-core/ai/schema";
import { buildPrompt } from "@mediajel/assistant-core/ai/prompt";
import { buildInstructions } from "@mediajel/assistant-core/ai/system";
import { validateGenerated } from "@mediajel/assistant-core/ai/validate";
import { DeployTargetKind } from "@mediajel/assistant-core/deploy/targets";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import { WidgetSession } from "@mediajel/assistant-core/types";

/**
 * MediaJel's assistant service, as the extension sees it.
 *
 * The service owns the model and its key, and now the deploy credential too. This side builds
 * the prompt, validates the answer and runs at most ONE repair round with the violations fed
 * back — the judgement about what a good tag looks like stays where the recording is.
 *
 * Every call carries the signed-in user's Cognito ID token. Nothing else authenticates, and
 * nobody types a credential: the service verifies the token against the pool and attributes
 * the deploy commit to whoever it says signed in.
 *
 * The CSP watching the in-page widget needed is gone. This runs on the extension's own origin,
 * where a client's Content-Security-Policy has no say.
 */

export interface GenerateInput {
  session: WidgetSession;
  status: TrackerStatus;
  /** The page's hostname, from the bound tab — the prompt says which site this is about. */
  hostname: string;
  signal?: AbortSignal;
}

export interface GenerateResult {
  output: GenerationOutput;
  model: string;
  /** Non-empty when even the repair round left violations — shown, not hidden. */
  violations: string[];
}

export interface Health {
  ok: boolean;
  model: string;
  user: { username: string; email: string };
}

export interface ExistingTag {
  exists: boolean;
  sha?: string;
  content?: string;
}

export interface DeployInput {
  goal: WidgetSession["goal"];
  kind: DeployTargetKind;
  name: string;
  code: string;
  /** The sha the operator was shown, so the service refuses a file that moved under us. */
  expectedSha?: string;
  signal?: AbortSignal;
}

export interface DeployOutcome {
  commitUrl: string;
  fileUrl: string;
  path: string;
  update: boolean;
}

/** A run that hangs is a failure the operator must see; two minutes is generous for a tag. */
export const GENERATION_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 20_000;
const DEPLOY_TIMEOUT_MS = 60_000;

export const apiUrl = (): string => (process.env.PLASMO_PUBLIC_WIDGET_API_URL || "").trim().replace(/\/+$/, "");

/** An answer the service gave on purpose: its status and its own message. */
export class ServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const statusFallback = (status: number): string => {
  if (status === 401) return "Your MediaJel session was not accepted. Sign in again.";
  if (status === 403) return "Your MediaJel account is not allowed to use the assistant service.";
  if (status === 429) return "The assistant service is rate limiting requests. Wait a moment and try again.";
  if (status === 504) return "The model did not answer in time. Try again.";
  return `The assistant service answered ${status}.`;
};

export const describeFailure = (err: unknown): string => {
  if (err instanceof ServiceError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out/i.test(message)) return "The assistant service did not answer in time. Try again.";
  if (/abort/i.test(message)) return "Cancelled.";
  if (/no assistant service url/i.test(message)) return message;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Could not reach MediaJel's assistant service. Check your connection and try again.";
  }
  return `The assistant service call failed: ${message}`;
};

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

/** How the client gets a currently-valid ID token; the background refreshes behind this. */
export type TokenSource = () => Promise<string>;

const call = async <T>(
  path: string,
  token: TokenSource,
  options: { method: "GET" | "POST"; body?: unknown; signal?: AbortSignal } = { method: "GET" },
): Promise<T> => {
  const base = apiUrl();
  if (!base) {
    throw new Error("This build has no assistant service URL (PLASMO_PUBLIC_WIDGET_API_URL), so it cannot generate.");
  }

  const response = await fetch(`${base}${path}`, {
    method: options.method,
    headers: {
      authorization: `Bearer ${await token()}`,
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

/** Settings' "Check access": the session is accepted and the service is configured. No model spend. */
export const checkAccess = async (token: TokenSource): Promise<string> => {
  try {
    const health = await withTimeout(call<Health>("/health", token), HEALTH_TIMEOUT_MS);
    return `${health.model} · signed in as ${health.user.username}`;
  } catch (err) {
    throw new Error(describeFailure(err));
  }
};

/** Reads the file the deploy would overwrite, so the choice shows new-vs-update honestly. */
export const readExistingTag = async (token: TokenSource, kind: DeployTargetKind, name: string): Promise<ExistingTag> =>
  call<ExistingTag>(`/tag?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`, token);

export const deployTag = async (token: TokenSource, input: DeployInput): Promise<DeployOutcome> => {
  const { signal, ...body } = input;
  try {
    return await withTimeout(
      call<DeployOutcome>("/deploy", token, { method: "POST", body, signal }),
      DEPLOY_TIMEOUT_MS,
    );
  } catch (err) {
    throw new Error(describeFailure(err));
  }
};

interface GenerateResponse {
  output: unknown;
  model: string;
}

export const generateTag = async (
  token: TokenSource,
  { session, status, hostname, signal }: GenerateInput,
): Promise<GenerateResult> => {
  const instructions = buildInstructions(session.goal);
  const prompt = buildPrompt(session, status, hostname);
  let modelName = "MediaJel assistant";

  const run = async (extra?: string): Promise<GenerationOutput> => {
    const answer = await call<GenerateResponse>("/generate", token, {
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
    output = await withTimeout(run(), GENERATION_TIMEOUT_MS);
  } catch (err) {
    throw new Error(describeFailure(err));
  }

  let violations = validateGenerated({
    code: output.code,
    goal: session.goal,
    appIdTarget: output.suggestedTarget.kind === "app-id",
  });
  if (violations.length > 0) {
    try {
      const repaired = await run(
        `YOUR PREVIOUS FILE FAILED MECHANICAL VALIDATION. Violations:\n- ${violations.join("\n- ")}\n\nPrevious file:\n${output.code}\n\nReturn the corrected structured object; fix every violation without changing the approach.`,
      );
      const repairedViolations = validateGenerated({
        code: repaired.code,
        goal: session.goal,
        appIdTarget: repaired.suggestedTarget.kind === "app-id",
      });
      // Only take the repair if it actually repaired something. A second answer that is worse
      // is still an answer, and the operator would have no way to tell which they were looking at.
      if (repairedViolations.length < violations.length) {
        output = repaired;
        violations = repairedViolations;
      }
    } catch {
      /* the repair round failed; the first result and its violations are still worth showing */
    }
  }

  return { output, model: modelName, violations };
};
