import { z } from "zod";

import { GenerationOutput, GenerationSchema } from "@mediajel/assistant-core/ai/schema";
import { buildPrompt } from "@mediajel/assistant-core/ai/prompt";
import { DeployTargetKind } from "@mediajel/assistant-core/deploy/targets";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import { WidgetSession } from "@mediajel/assistant-core/types";

import { SIGNED_OUT } from "~/auth/signed-out";

/**
 * MediaJel's assistant service, as the extension sees it.
 *
 * The service owns the model, its key, the deploy credential — and, since the NestJS service
 * replaced the Lambda, the integrations knowledge itself. It composes the instructions, checks
 * its own answer and runs the repair round.
 *
 * What this side still owns is the EVIDENCE: `buildPrompt` masks and trims the recording, and
 * that stays here deliberately, because "show what leaves" means the operator has to be able to
 * see the exact bytes before pressing Generate. Instructions are not the operator's data and no
 * longer travel from the browser at all.
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

interface Health {
  ok: boolean;
  model: string;
  user: { username: string; email: string };
  /** Whether the service holds a GitHub credential. Absent on older deployments. */
  deployConfigured?: boolean;
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
const GENERATION_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 20_000;
const DEPLOY_TIMEOUT_MS = 60_000;
/** The service gives each app ID 20 s against internal-service, all of them at once. */
const ACTIVITY_TIMEOUT_MS = 30_000;

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

/**
 * Whether a failure means the session itself is over: nobody is signed in, Cognito refused the refresh
 * token, or the service would not accept the ID token. Signing in again is the only fix for any of them,
 * so the background ends the session instead of reporting one more failed call.
 */
export const endsSession = (err: unknown): boolean =>
  (err instanceof ServiceError && err.status === 401) || (err as { code?: unknown } | null)?.code === SIGNED_OUT;

export const describeFailure = (err: unknown): string => {
  // The service's own words, and a session's end, are already written for the operator.
  if (err instanceof ServiceError || endsSession(err)) return (err as Error).message;
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out/i.test(message)) return "The assistant service did not answer in time. Try again.";
  if (/abort/i.test(message)) return "Cancelled.";
  if (/no assistant service url/i.test(message)) return message;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Could not reach MediaJel's assistant service. Check your connection and try again.";
  }
  return `The assistant service call failed: ${message}`;
};

/** A failure as the operator reads it, keeping the code that says what kind of failure it was. */
const failure = (err: unknown): Error =>
  Object.assign(new Error(describeFailure(err)), {
    code: endsSession(err) ? SIGNED_OUT : err instanceof ServiceError ? err.code : undefined,
  });

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
    throw new Error(
      "This build has no assistant service URL (PLASMO_PUBLIC_WIDGET_API_URL), so it cannot reach the assistant service.",
    );
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
    const who = `${health.model} · signed in as ${health.user.username}`;
    // Said here because this is where someone checks when a deploy has just failed, and
    // "access is fine" on its own reads as "deploy will work". Older services omit the field
    // entirely, and silence is not the same as a no.
    return health.deployConfigured === false ? `${who} · deploys unavailable (service has no GitHub credential)` : who;
  } catch (err) {
    throw failure(err);
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
    throw failure(err);
  }
};

interface GenerateResponse {
  output: unknown;
  model: string;
  violations?: string[];
}

export const generateTag = async (
  token: TokenSource,
  { session, status, hostname, signal }: GenerateInput,
): Promise<GenerateResult> => {
  // Evidence only. The service builds the instructions from its own knowledge base — the
  // extension no longer ships one, and no longer posts one back.
  const evidence = buildPrompt(session, status, hostname);

  let answer: GenerateResponse;
  try {
    answer = await withTimeout(
      call<GenerateResponse>("/generate", token, {
        method: "POST",
        body: { goal: session.goal, hostname, evidence },
        signal,
      }),
      GENERATION_TIMEOUT_MS,
    );
  } catch (err) {
    throw failure(err);
  }

  const parsed = GenerationSchema.safeParse(answer.output);
  if (!parsed.success) {
    throw new Error("The assistant service returned an object that does not match the tag contract. Try again.");
  }

  return {
    output: parsed.data,
    model: answer.model || "MediaJel assistant",
    // Named by the service, which validated the exact file it is handing over. An empty list
    // means it passed; a non-empty one is shown to the operator rather than hidden.
    violations: answer.violations ?? [],
  };
};

const ActivityTotalsSchema = z.object({
  pageviews: z.number(),
  sessions: z.number(),
  transactions: z.number(),
  signups: z.number(),
  impressions: z.number(),
  transactionTotal: z.number(),
});

const TagActivitySchema = z.discriminatedUnion("status", [
  z.object({
    appId: z.string(),
    status: z.literal("ok"),
    totals: ActivityTotalsSchema,
    lastTransactionAt: z.string().nullable(),
    lastSignUpAt: z.string().nullable(),
    pages: z
      .array(z.object({ pageUrl: z.string(), conversions: z.number(), transactionTotal: z.number().nullable() }))
      .nullable(),
    truncated: z.boolean(),
    partial: z.boolean(),
  }),
  z.object({ appId: z.string(), status: z.literal("unavailable"), message: z.string() }),
]);

const TagActivityResponseSchema = z.object({ days: z.number(), tags: z.array(TagActivitySchema) });

/** One tag's last days as MediaJel recorded them — or why that could not be read. */
export type TagActivity = z.infer<typeof TagActivitySchema>;
export type TagActivityResponse = z.infer<typeof TagActivityResponseSchema>;

/**
 * What MediaJel recorded for each tag on the page over the last 7 days, one answer per app ID and
 * in the order asked. Only the app IDs leave the browser — nothing read from the page itself.
 *
 * A failure keeps the service's error code, so the panel can tell "this service has no activity
 * source" from "the activity could not be read right now".
 */
export const readTagActivity = async (
  token: TokenSource,
  appIds: string[],
  signal?: AbortSignal,
): Promise<TagActivityResponse> => {
  let answer: unknown;
  try {
    answer = await withTimeout(
      call<unknown>(`/activity?appIds=${appIds.map(encodeURIComponent).join(",")}`, token, { method: "GET", signal }),
      ACTIVITY_TIMEOUT_MS,
    );
  } catch (err) {
    throw failure(err);
  }

  const parsed = TagActivityResponseSchema.safeParse(answer);
  if (!parsed.success) {
    throw new Error("The assistant service answered with tag activity this version of the extension cannot read.");
  }
  return parsed.data;
};
