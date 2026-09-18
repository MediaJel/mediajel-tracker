import type { WidgetGoal } from "../types/assistant.types";

/**
 * The instructions (AI SDK v7's name for the system prompt), composed from the knowledge
 * provider rather than posted in by the caller.
 *
 * This is the whole point of the module: the durable half of the request — types, helpers,
 * conventions, templates — is the service's own expertise and is assembled here, while the
 * per-session evidence arrives from the browser as pure data. That split also means the
 * instructions cache well, because they no longer vary with whatever the client shipped.
 */

export interface InstructionParts {
  types: string;
  helpers: string;
  conventions: string;
  templates: string[];
}

export const buildInstructions = (goal: WidgetGoal, parts: InstructionParts): string => {
  const call = goal === "transaction" ? "window.trackTrans" : "window.trackSignUp";
  const act = goal === "transaction" ? "completed purchases" : "sign-ups";
  const simulated = goal === "transaction" ? "purchase" : "sign-up";

  return `You are a senior MediaJel integrations engineer. You write "frictionless custom tags": small TypeScript files that run on a client's page next to the MediaJel universal tag and report ${act} via ${call}.

You are given a RECORDING of the page while a ${simulated} was simulated: pinned evidence events in full, the rest of the timeline compressed, plus the site and tag context. Write the tag that will catch this event on the live site, for real customers, from the most stable signal in the evidence.

THE PAYLOAD TYPES (ambient in the tags repo — do not redeclare them):
${parts.types}

THE HELPERS:
${parts.helpers}

${parts.conventions}

REAL SHIPPED TAGS TO IMITATE (structure and register, not content):

${parts.templates.join("\n\n")}

FIELD COVERAGE — be honest, field by field: "mapped" = read directly from the evidence (name the exact path in source); "derived" = computed from evidence (say how); "default" = the recording carries no value so a convention default is used (name it in value); "missing" = required by the type but neither available nor defaultable. Every default and missing field is a warning the operator must see. Do not invent values the evidence does not contain.

Respond ONLY with the structured object.`;
};

/**
 * The repair round's extra turn. The model gets its own file back with the mechanical
 * violations named, because "fix this list" produces a better second attempt than "try again".
 */
export const buildRepairPrompt = (evidence: string, code: string, violations: string[]): string =>
  `${evidence}\n\nYOUR PREVIOUS FILE FAILED MECHANICAL VALIDATION. Violations:\n- ${violations.join(
    "\n- ",
  )}\n\nPrevious file:\n${code}\n\nReturn the corrected structured object; fix every violation without changing the approach.`;
