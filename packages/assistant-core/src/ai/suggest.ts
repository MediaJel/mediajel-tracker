import { describeEvent, factsLine } from "@mediajel/assistant-core/recorder/describe";
import { TimelineEvent, WidgetGoal, WidgetSession } from "@mediajel/assistant-core/types";

/**
 * The widget's own first guess at "which moment was the purchase / sign-up" — local, instant,
 * free. The operator approves it (it becomes the pinned evidence) or rejects it and points
 * at the moment themselves. Whatever they choose, the model still judges the whole recording
 * at generation time; this only decides what is shown first.
 */

export interface Candidate {
  event: TimelineEvent;
  /** Why this looked like the one, in plain words. */
  reason: string;
  /** "Order T4821 · $84.00 · 2 items" */
  facts: string;
}

const PURCHASE_WORDS = /purchase|order|transaction|checkout|payment|receipt|confirm/i;
const SIGNUP_WORDS = /sign[- ]?up|subscribe|register|newsletter|lead|contact/i;

/**
 * The path of a recorded URL, for a one-line reason the operator reads. Recorded URLs are
 * normally absolute; a relative one resolves against a placeholder rather than `location`,
 * because this also runs in the panel, where `location` is the extension's own page.
 */
const pathOf = (url: string): string => {
  try {
    return new URL(url, "https://page.invalid/").pathname;
  } catch {
    return url;
  }
};

const reasonFor = (event: TimelineEvent, goal: WidgetGoal): string | null => {
  const reading = describeEvent(event);
  if (reading.background) return null;
  const words = goal === "transaction" ? PURCHASE_WORDS : SIGNUP_WORDS;

  if (event.kind === "datalayer") {
    const name = reading.facts.eventName ?? "";
    if (words.test(name))
      return `A “${name}” event was pushed to the data layer — the most reliable signal a site can give.`;
    if (goal === "transaction" && (reading.facts.total || reading.facts.orderId)) {
      return "A data layer push carrying an order id or total.";
    }
  }
  if (event.kind === "network" && event.category === "page") {
    const hit = words.test(event.url) || words.test(event.reqBody) || words.test(event.resBody);
    if (goal === "transaction" && (reading.facts.orderId || reading.facts.total)) {
      return `The site's own server confirmed it: ${event.method} ${pathOf(event.url)} returned an order.`;
    }
    if (hit && event.method !== "GET")
      return `A ${event.method} request whose name and contents say ${goal === "transaction" ? "checkout" : "sign-up"}.`;
  }
  if (event.kind === "form" && goal === "signup" && reading.facts.email)
    return "A form with an email address was submitted.";
  if (event.kind === "message" && (reading.facts.orderId || reading.facts.total)) {
    return "An embedded checkout reported an order to the page.";
  }
  if (event.kind === "dom" && event.score >= 5) return "The page showed a confirmation message.";
  return null;
};

/**
 * What a tag can hook most reliably, per goal: a purchase is best caught from the data layer
 * or the server's own response; a sign-up from the form the customer filled in (the shipped
 * sign-up tags all hook the form or its button — POST bodies vary from site to site).
 */
const KIND_PRIORITY: Record<WidgetGoal, Partial<Record<TimelineEvent["kind"], number>>> = {
  transaction: { datalayer: 4, network: 3, message: 3, form: 2, dom: 1 },
  signup: { form: 4, datalayer: 3, network: 2, message: 2, dom: 1 },
};

export const suggestCandidates = (session: WidgetSession, limit = 3): Candidate[] => {
  const priority = KIND_PRIORITY[session.goal];
  const scored = session.timeline
    .map((event) => ({ event, reason: reasonFor(event, session.goal) }))
    .filter((entry): entry is { event: TimelineEvent; reason: string } => entry.reason !== null)
    .sort(
      (a, b) =>
        (priority[b.event.kind] ?? 0) - (priority[a.event.kind] ?? 0) ||
        b.event.score - a.event.score ||
        a.event.t - b.event.t,
    );

  // One per kind: a dataLayer push AND the network call that caused it are the same purchase.
  const seenKinds = new Set<string>();
  const picked: Candidate[] = [];
  for (const entry of scored) {
    if (seenKinds.has(entry.event.kind)) continue;
    seenKinds.add(entry.event.kind);
    picked.push({ event: entry.event, reason: entry.reason, facts: factsLine(describeEvent(entry.event).facts) });
    if (picked.length >= limit) break;
  }
  return picked;
};
