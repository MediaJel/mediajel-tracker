import { TimelineEvent } from "@mediajel/assistant-core/types";

/**
 * A cheap "is this the purchase?" heuristic. It sorts Review and pre-suggests what to mark —
 * it never gates anything, so it is allowed to be wrong and cheap. 0–10.
 */

const SIGNAL_RE =
  /purchase|order|transaction|checkout|thank[- ]?you|confirm|receipt|success|payment|complete|signup|sign[- ]?up|subscribe/i;
const MONEY_RE = /(?:\$|€|£)\s?\d|(?:total|value|amount|price)["':\s]*\d/i;
const LONG_ID_RE = /\b[A-Z]{0,3}\d{4,}\b/;

const KIND_WEIGHT: Partial<Record<TimelineEvent["kind"], number>> = {
  datalayer: 3,
  network: 2,
  form: 2,
  dom: 1,
  message: 1,
};

export const scoreEvent = (event: TimelineEvent, haystackExtra = ""): number => {
  let score = KIND_WEIGHT[event.kind] ?? 0;

  const haystack = `${event.summary} ${haystackExtra}`;
  if (SIGNAL_RE.test(haystack)) score += 3;
  if (MONEY_RE.test(haystack)) score += 2;
  if (LONG_ID_RE.test(haystack)) score += 1;

  if (event.kind === "network" && event.category === "tracker") score = Math.min(score, 2);
  if (event.kind === "datalayer" && event.replayed) score = Math.max(0, score - 1);

  return Math.min(10, score);
};
