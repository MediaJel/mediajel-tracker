import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { TimelineEvent, WidgetSession } from "@mediajel/tracker-widget/types";

/**
 * The per-session half of the request: pure, deterministic data. Pinned events travel in
 * full (they are the evidence), the rest as one dense line each; dom/click/storage rows are
 * dropped first when the budget bites. Everything here was masked at capture.
 */

export const PROMPT_CHAR_BUDGET = 60_000;
const PINNED_CHAR_CAP = 8_000;
const PINNED_TOTAL_CAP = 40_000;

const line = (event: TimelineEvent, index: number): string =>
  `#${index} +${(event.t / 1000).toFixed(1)}s [${event.kind}] ${event.summary}`;

/** Least essential first — what gets dropped when the budget bites. */
const DROP_ORDER: TimelineEvent["kind"][] = ["dom", "click", "storage", "message"];

export const buildPrompt = (session: WidgetSession, status: TrackerStatus): string => {
  const pinnedSet = new Set(session.markedIds);
  const pinned = session.timeline.filter((event) => pinnedSet.has(event.id));

  let pinnedBudget = PINNED_TOTAL_CAP;
  const pinnedBlocks = pinned.map((event, i) => {
    const body = JSON.stringify(event, null, 2);
    const clamped = body.slice(0, Math.min(PINNED_CHAR_CAP, Math.max(0, pinnedBudget)));
    pinnedBudget -= clamped.length;
    return `EVIDENCE ${i + 1} (pinned by the operator):\n${clamped}${clamped.length < body.length ? "\n…[truncated]" : ""}`;
  });

  const context = [
    `site: ${location.hostname}`,
    `page at recording start: ${session.pages[0]?.url ?? location.href}`,
    `tag: appId=${status.appId || "(none)"} environment=${status.environment || "(none)"} version=${status.version} event=${status.event || "(default)"}`,
    `trackTrans present on page: ${status.trackTransPresent}`,
    `goal: ${session.goal}`,
    session.notes?.trim() ? `operator notes: ${session.notes.trim()}` : null,
    `deploy targets: domain file = src/domains/${location.hostname}.ts · app-id file = src/app-ids/${status.appId || "(unknown)"}.ts`,
  ]
    .filter(Boolean)
    .join("\n");

  const rest = session.timeline.filter((event) => !pinnedSet.has(event.id));
  let timelineLines = rest.map((event, i) => ({ kind: event.kind, text: line(event, i) }));

  const assemble = (): string =>
    [
      "PAGE & TAG CONTEXT:",
      context,
      "",
      ...pinnedBlocks,
      "",
      `TIMELINE (${timelineLines.length} of ${rest.length} events, compressed, chronological):`,
      ...timelineLines.map((entry) => entry.text),
    ].join("\n");

  let prompt = assemble();
  for (const kind of DROP_ORDER) {
    if (prompt.length <= PROMPT_CHAR_BUDGET) break;
    timelineLines = timelineLines.filter((entry) => entry.kind !== kind);
    prompt = assemble();
  }
  if (prompt.length > PROMPT_CHAR_BUDGET) {
    timelineLines = timelineLines.slice(-200);
    prompt = assemble();
  }
  return prompt;
};
