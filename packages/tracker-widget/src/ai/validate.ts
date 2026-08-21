import { WidgetGoal } from "@mediajel/tracker-widget/types";
import { parseGate, rewriteImports } from "@mediajel/tracker-widget/verify/rewrite-imports";

/**
 * The mechanical gate between "the model said" and "we will run/deploy this". Everything
 * here protects either the client's page (no rogue APIs) or the frictionless repo's build
 * (a syntax error there freezes every future tag deploy).
 */

export interface ValidationInput {
  code: string;
  goal: WidgetGoal;
  /** True when the operator chose the app-id folder — window.overrides is fatal there. */
  appIdTarget: boolean;
}

export const validateGenerated = ({ code, goal, appIdTarget }: ValidationInput): string[] => {
  const errors: string[] = [];

  const rewritten = rewriteImports(code);
  errors.push(...rewritten.errors);

  const call = goal === "transaction" ? "window.trackTrans(" : "window.trackSignUp(";
  if (!code.includes(call)) errors.push(`the file never calls ${call}…) — that is its whole job`);

  if (/window\.tracker\s*\(/.test(code))
    errors.push("window.tracker(...) is not allowed — only trackTrans/trackSignUp");
  if (/\bfetch\s*\(/.test(code) && !code.includes("fetchSource"))
    errors.push("no fetch calls of its own — observe with fetchSource");
  if (/new\s+XMLHttpRequest/.test(code)) errors.push("no XHR of its own — observe with xhrResponseSource");
  if (/\beval\s*\(|document\.write\s*\(/.test(code)) errors.push("eval/document.write are never allowed");
  if (/<script/i.test(code)) errors.push("no external or inline scripts");
  if (appIdTarget && /window\.overrides\s*=/.test(code)) {
    errors.push("an app-id tag must never assign window.overrides (it would wipe the domain tag's overrides)");
  }
  if (!/localStorage\.(getItem|setItem)\(\s*["'`]?mj-/.test(code) && !/dedupKey/.test(code)) {
    errors.push('no dedup guard found — use a localStorage key "mj-<slug>-…" set before any await');
  }
  // The valid-JS rule, mechanically: the rewritten text must PARSE as JavaScript.
  const syntax = parseGate(rewritten.js);
  if (syntax) errors.push(`the file is not valid plain JavaScript (${syntax}) — drop TS-only syntax`);

  return errors;
};
