import { guard } from "@mediajel/tracker-core/utils/guard";
import logger from "@mediajel/assistant-core/log";
import { buildShims } from "@mediajel/assistant-core/verify/shims";
import { installVerifyInterceptor } from "@mediajel/assistant-core/verify/interceptor";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { parseGate, rewriteImports } from "@mediajel/assistant-core/verify/rewrite-imports";

/**
 * Runs the generated tag ON THIS PAGE exactly the way production will: rewritten imports,
 * then injected as an inline <script> — the same mechanism get-custom-tags.ts uses — with
 * the tracker entry points intercepted so nothing reaches the collector.
 */

declare global {
  interface Window {
    __mjWidgetShims?: Record<string, Record<string, unknown>>;
  }
}

export interface RunResult {
  ok: boolean;
  errors: string[];
}

/** Production injector: an inline <script>, the exact mechanism get-custom-tags.ts uses. */
const injectInlineScript = (js: string): void => {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.text = js;
  document.head.appendChild(script);
  script.remove();
};

export const runGenerated = (
  code: string,
  onCapture: (call: InterceptedCall) => void,
  // Injectable for the unit suite: happy-dom does not evaluate injected inline scripts, and
  // the real path is proven in a real browser by the Cypress specs.
  inject: (js: string) => void = injectInlineScript,
): RunResult => {
  const errors: string[] = [];

  const rewritten = rewriteImports(code);
  errors.push(...rewritten.errors);
  const syntax = parseGate(rewritten.js);
  if (syntax) errors.push(syntax);
  if (errors.length > 0) return { ok: false, errors };

  const interceptor = installVerifyInterceptor();
  interceptor.onCapture(onCapture);
  window.__mjWidgetShims = buildShims(interceptor);

  const onWindowError = guard((event: ErrorEvent): void => {
    errors.push(`the tag threw: ${event.message}`);
  }, "verify-window-error");
  const onCsp = guard((event: Event): void => {
    const violation = event as SecurityPolicyViolationEvent;
    if (violation.violatedDirective?.includes("script")) {
      errors.push(
        "this site's Content-Security-Policy blocks inline scripts — frictionless tags cannot run here at all",
      );
    }
  }, "verify-csp");

  window.addEventListener("error", onWindowError);
  window.addEventListener("securitypolicyviolation", onCsp);
  try {
    inject(rewritten.js);
  } catch (err) {
    errors.push(`could not inject the tag: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // Synchronous errors have fired by now; listeners for async ones stay one tick.
    setTimeout(
      guard(() => {
        window.removeEventListener("error", onWindowError);
        window.removeEventListener("securitypolicyviolation", onCsp);
      }, "verify-cleanup"),
      50,
    );
  }

  if (errors.length === 0) logger.debug("Verify: the generated tag is live on this page, intercepted.");
  return { ok: errors.length === 0, errors };
};
