import { Injectable } from "@nestjs/common";

import type { WidgetGoal } from "../types/assistant.types";
import { withoutBlocks } from "./overrides-block";
import { parseGate, rewriteImports } from "./rewrite-imports";

/**
 * The mechanical gate between "the model said" and "we will run or deploy this".
 *
 * Everything here protects either the client's page (no rogue APIs) or the frictionless repo's
 * build — a syntax error on that master branch freezes every future tag deploy, for everyone.
 * The extension used to run this and then ask the service to commit; now the service runs it,
 * on the exact bytes it is about to write, which is the only place it is a boundary rather than
 * a courtesy.
 */

export interface ValidationInput {
  code: string;
  goal: WidgetGoal;
  /** True when the operator chose the app-id folder — window.overrides is fatal there. */
  appIdTarget: boolean;
}

/** One thing a file must not do, and how to say that it did. */
interface Rule {
  broken(input: ValidationInput): boolean;
  message(input: ValidationInput): string;
}

const callOf = (goal: WidgetGoal): string => (goal === "transaction" ? "window.trackTrans(" : "window.trackSignUp(");

/**
 * A guard is required; its spelling is not. The rule used to demand a localStorage key prefixed
 * "mj-", which 104 of the 110 shipped tags fail — including the library's own deduplicator, which
 * uses sessionStorage. Requiring one invented mechanism rejected correct files, so this asks only
 * that the tag read a key and write it back. That the requirement itself survives is deliberate:
 * the tag runs on every page view forever, and 77% of the repo having no guard at all is a latent
 * double-count, not a precedent.
 */
const guarded = (code: string): boolean =>
  (/(local|session)Storage\.getItem\(/.test(code) && /(local|session)Storage\.setItem\(/.test(code)) ||
  /dedupKey/.test(code);

/** In the order they are reported. */
const RULES: Rule[] = [
  {
    broken: ({ code, goal }) => !code.includes(callOf(goal)),
    message: ({ goal }) => `the file never calls ${callOf(goal)}…) — that is its whole job`,
  },
  {
    broken: ({ code }) => /window\.tracker\s*\(/.test(code),
    message: () => "window.tracker(...) is not allowed — only trackTrans/trackSignUp",
  },
  {
    broken: ({ code }) => /\bfetch\s*\(/.test(code) && !code.includes("fetchSource"),
    message: () => "no fetch calls of its own — observe with fetchSource",
  },
  {
    broken: ({ code }) => /new\s+XMLHttpRequest/.test(code),
    message: () => "no XHR of its own — observe with xhrResponseSource",
  },
  {
    broken: ({ code }) => /\beval\s*\(|document\.write\s*\(/.test(code),
    message: () => "eval/document.write are never allowed",
  },
  {
    broken: ({ code }) => /<script/i.test(code),
    message: () => "no external or inline scripts",
  },
  // The assistant's own configuration blocks merge rather than assign, and are rendered by this
  // service; the rule is about the file's own code.
  {
    broken: ({ code, appIdTarget }) => appIdTarget && /window\.overrides\s*=/.test(withoutBlocks(code)),
    message: () => "an app-id tag must never assign window.overrides (it would wipe the domain tag's overrides)",
  },
  {
    broken: ({ code }) => !guarded(code),
    message: () =>
      "no dedup guard found — read and write a storage key derived from the order id or email " +
      '(preferred: localStorage "mj-<slug>-<value>"), set before any await',
  },
];

@Injectable()
export class ValidateService {
  validate(input: ValidationInput): string[] {
    const rewritten = rewriteImports(input.code);
    // The valid-JS rule, mechanically: the rewritten text must PARSE as JavaScript.
    const syntax = parseGate(rewritten.js);
    return [
      ...rewritten.errors,
      ...RULES.filter((rule) => rule.broken(input)).map((rule) => rule.message(input)),
      ...(syntax ? [`the file is not valid plain JavaScript (${syntax}) — drop TS-only syntax`] : []),
    ];
  }
}
