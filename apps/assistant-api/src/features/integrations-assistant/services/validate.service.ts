import { Injectable } from "@nestjs/common";

import type { WidgetGoal } from "../types/assistant.types";
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

@Injectable()
export class ValidateService {
  validate({ code, goal, appIdTarget }: ValidationInput): string[] {
    const errors: string[] = [];

    const rewritten = rewriteImports(code);
    errors.push(...rewritten.errors);

    const call = goal === "transaction" ? "window.trackTrans(" : "window.trackSignUp(";
    if (!code.includes(call)) errors.push(`the file never calls ${call}…) — that is its whole job`);

    if (/window\.tracker\s*\(/.test(code)) {
      errors.push("window.tracker(...) is not allowed — only trackTrans/trackSignUp");
    }
    if (/\bfetch\s*\(/.test(code) && !code.includes("fetchSource")) {
      errors.push("no fetch calls of its own — observe with fetchSource");
    }
    if (/new\s+XMLHttpRequest/.test(code)) {
      errors.push("no XHR of its own — observe with xhrResponseSource");
    }
    if (/\beval\s*\(|document\.write\s*\(/.test(code)) {
      errors.push("eval/document.write are never allowed");
    }
    if (/<script/i.test(code)) {
      errors.push("no external or inline scripts");
    }
    if (appIdTarget && /window\.overrides\s*=/.test(code)) {
      errors.push("an app-id tag must never assign window.overrides (it would wipe the domain tag's overrides)");
    }
    // A guard is required; its spelling is not. The rule used to demand a localStorage key
    // prefixed "mj-", which 104 of the 110 shipped tags fail — including the library's own
    // deduplicator, which uses sessionStorage. Requiring one invented mechanism rejected
    // correct files, so this asks only that the tag read a key and write it back. That the
    // requirement itself survives is deliberate: the tag runs on every page view forever, and
    // 77% of the repo having no guard at all is a latent double-count, not a precedent.
    const readsKey = /(local|session)Storage\.getItem\(/.test(code);
    const writesKey = /(local|session)Storage\.setItem\(/.test(code);
    if (!(readsKey && writesKey) && !/dedupKey/.test(code)) {
      errors.push(
        "no dedup guard found — read and write a storage key derived from the order id or email " +
          '(preferred: localStorage "mj-<slug>-<value>"), set before any await',
      );
    }

    // The valid-JS rule, mechanically: the rewritten text must PARSE as JavaScript.
    const syntax = parseGate(rewritten.js);
    if (syntax) errors.push(`the file is not valid plain JavaScript (${syntax}) — drop TS-only syntax`);

    return errors;
  }
}
