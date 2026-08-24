import logger from "@mediajel/assistant-core/log";
import { WidgetStep } from "@mediajel/assistant-core/types";

/**
 * The work order's step machine.
 *
 * The steps are a document that fills in top to bottom, so the legal moves are deliberately
 * few: one step forward, three named ways back, and starting over. Everything the UI offers is
 * derived from this — a button that cannot lead anywhere is a button that is not drawn — and
 * nothing else in the widget is allowed to assign `session.step` directly.
 */

export const STEP_ORDER: readonly WidgetStep[] = [
  "home",
  "recording",
  "review",
  "generating",
  "result",
  "verify",
  "deploy",
  "done",
];

/**
 * The only moves backwards.
 *
 * `result -> generating` is Regenerate, `result -> review` is "not the right event — let me
 * point at it", `verify -> result` is "read the code again", and `review -> recording` is
 * "keep recording, I missed something". `generating -> review` is a cancelled
 * or failed run landing back on the evidence. There is deliberately no `deploy -> verify`
 * (a verified run is the thing being deployed). Anything else goes through home.
 */
export const BACK_EDGES: readonly (readonly [WidgetStep, WidgetStep])[] = [
  ["generating", "review"],
  ["result", "generating"],
  ["result", "review"],
  ["verify", "result"],
  ["review", "recording"],
];

export interface TransitionOptions {
  /**
   * The operator has confirmed they are throwing the recording away. Required for any move to
   * `home`, which is the reset — it is the one transition that destroys work.
   */
  confirmed?: boolean;
}

/**
 * `settings` is intentionally not a step: it is an overlay that opens from anywhere and leaves
 * the step untouched, so it needs no transition and can never strand an operator mid-flow.
 */
export const canTransition = (from: WidgetStep, to: WidgetStep, options: TransitionOptions = {}): boolean => {
  if (from === to) return true;
  if (to === "home") return options.confirmed === true;

  const fromIndex = STEP_ORDER.indexOf(from);
  const toIndex = STEP_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  if (toIndex === fromIndex + 1) return true;

  return BACK_EDGES.some(([edgeFrom, edgeTo]) => edgeFrom === from && edgeTo === to);
};

/**
 * The next step, or `from` unchanged when the move is not allowed.
 *
 * Refusing by returning rather than throwing is deliberate: this runs inside a client's page,
 * where an exception from a mis-wired button is a far worse outcome than a button that does
 * nothing and says so in the console.
 */
export const transition = (from: WidgetStep, to: WidgetStep, options: TransitionOptions = {}): WidgetStep => {
  if (canTransition(from, to, options)) return to;

  logger.warn(`Refused the step "${from}" -> "${to}"; staying on "${from}".`);
  return from;
};

/**
 * What the two outbound steps need before they are offered.
 *
 * Both used to be answered by a pasted GitHub token; both are now answered by a signed-in
 * MediaJel account. Deploy needs nothing further because the service holds the deploy
 * credential and attributes the commit from the verified identity — the frictionless repo's
 * history still says who shipped a tag, it just no longer asks anyone to type it.
 */
export interface AssistantReadiness {
  /** A verified MediaJel session is in hand. */
  signedIn: boolean;
  /** The operator has seen what Generate sends out of the browser. */
  acknowledgedDataSharing: boolean;
}

export const canGenerate = (ready: AssistantReadiness): boolean => ready.signedIn && ready.acknowledgedDataSharing;

export const canDeploy = (ready: AssistantReadiness): boolean => ready.signedIn;
