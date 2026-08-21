import logger from "@mediajel/tracker-widget/log";
import { GenerationOutput, GenerationSchema } from "@mediajel/tracker-widget/ai/schema";
import { buildInstructions } from "@mediajel/tracker-widget/ai/system";
import { buildPrompt } from "@mediajel/tracker-widget/ai/prompt";
import { createModel } from "@mediajel/tracker-widget/ai/providers";
import { validateGenerated } from "@mediajel/tracker-widget/ai/validate";
import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";
import { WidgetSettings } from "@mediajel/tracker-widget/session/settings";
import { WidgetSession } from "@mediajel/tracker-widget/types";
import { Output, generateText } from "@mediajel/tracker-widget/vendor";

/**
 * One generation run: instructions + evidence → structured output → mechanical validation →
 * at most ONE repair round with the violations fed back. Failures come back as messages an
 * operator can act on, never as raw stacks.
 */

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

export const describeFailure = (err: unknown, cspBlocked = false): string => {
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out/i.test(message))
    return "The provider did not answer within two minutes. Try again, or a smaller model.";
  if (/abort/i.test(message)) return "Cancelled.";
  if (/401|invalid[_ ]?api[_ ]?key|authentication|incorrect api key/i.test(message)) {
    return "The provider rejected the API key (401). Check it in Settings — and that the key belongs to the selected provider.";
  }
  if (/403/.test(message)) return "The provider refused the request (403) — the key may lack access to this model.";
  if (/\b404\b|model_not_found|does not exist/i.test(message)) {
    return "The provider does not know this model. Pick another in Settings.";
  }
  if (/\b429\b|rate.?limit/i.test(message)) return "Rate limited by the provider (429). Wait a moment and try again.";
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    if (cspBlocked) {
      return "This site's Content-Security-Policy blocks calls to the provider. Use the integrations sandbox, or paste the code by hand.";
    }
    // A provider that answers 401/403 without CORS headers looks, from a browser, exactly like
    // no answer at all. Nine times in ten this is the key.
    return "The provider refused the request before the browser could read the answer — almost always a rejected key (401), a key from a different provider, or a revoked one. Check it with Test connection in Settings.";
  }
  return `The provider call failed: ${message}`;
};

/** Flags a CSP connect-src block seen while `work` ran — the one network failure not about the key. */
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

/**
 * Settings' "Test connection": the smallest real call the configured provider/model will
 * answer. Resolves with the model id that replied, rejects with an operator-readable message.
 */
export const testConnection = async (settings: WidgetSettings, runtime: WidgetRuntime): Promise<string> => {
  const model = createModel(settings, runtime);
  try {
    await withCspWatch(() =>
      withTimeout(
        generateText({ model, prompt: "Reply with the single word OK.", maxOutputTokens: 5, maxRetries: 0 }),
        20_000,
      ),
    );
    return settings.model.trim() || settings.provider;
  } catch (err) {
    logger.warn("Connection test failed:", err instanceof Error ? err.message : err);
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
  const model = createModel(settings, runtime);
  const instructions = buildInstructions(session.goal);
  const prompt = buildPrompt(session, status);
  const modelName = settings.model || settings.provider;

  const run = async (extra?: string): Promise<GenerationOutput> => {
    const result = await generateText({
      model,
      instructions,
      prompt: extra ? `${prompt}\n\n${extra}` : prompt,
      output: Output.object({ schema: GenerationSchema }),
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: signal,
    });
    return result.output as GenerationOutput;
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
