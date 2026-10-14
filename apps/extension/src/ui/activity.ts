import { TagRecord, TagState } from "@mediajel/assistant-core/tags";
import { WidgetGoal } from "@mediajel/assistant-core/types";

import type { TagActivity } from "~/service/client";

/**
 * How tag activity is said on screen: the numbers, the one sentence the tally adds, and page URLs.
 *
 * Pure, so the words the panel uses about a client's traffic can be tested without a panel.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const twoPlaces = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moment = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** In full up to 9,999, then compact (12.9K) — four columns have to fit across a 400px panel. */
export const tallyNumber = (n: number): string => (n > 9_999 ? compact.format(n) : whole.format(n));

export const fullNumber = (n: number): string => whole.format(n);

/**
 * A transaction total, without a currency symbol: the service sums what the tags sent and carries no
 * currency, and "USD" is only a tag's default — a CAD shop's sales are not dollars, and a mix of
 * currencies summed under "$" would be an invented figure.
 */
export const amount = (n: number): string => twoPlaces.format(n);

const STATE_LABELS: Record<TagState, string> = {
  installed: "installed, not running yet",
  "held-back": "held back by a page-speed plugin until the visitor interacts",
  running: "running, nothing sent yet",
  sending: "sending events",
  "opted-out": "not tracking: this browser sends GPC/DNT",
  disabled: "disabled (enable=false)",
  failed: "failed to start",
};

/** A tag's state as the report prints it beside its configuration. */
export const stateLabel = (state: TagState): string => STATE_LABELS[state];

/** Enough of an app ID to tell two tags on one page apart; the whole of it is in Details. */
export const shortAppId = (appId: string): string => appId.split("-")[0].slice(0, 8) || appId;

/**
 * A tag's configuration and state on one line under its app ID — "Environment dutchie · version 2
 * · sending events" — so a reading always says which tag it is about and what that tag is doing. A
 * tag known only from the events it sends, or from Snowplow, has nothing on the page naming its
 * configuration, and says so rather than printing blanks.
 */
export const describeTag = (tag: TagRecord | undefined): string => {
  if (!tag) return "";
  const configuration = tag.environment
    ? `Environment ${tag.environment} · version ${tag.version}`
    : "Nothing on the page names this tag’s configuration";
  return `${configuration} · ${stateLabel(tag.state)}`;
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "2 hours ago", in the largest unit there has been at least one of. */
export const ago = (iso: string, now = Date.now()): string => {
  const elapsed = Math.max(0, now - Date.parse(iso));
  const [unit, size] = UNITS.find(([, ms]) => elapsed >= ms) ?? UNITS[UNITS.length - 1];
  return relative.format(-Math.floor(elapsed / size), unit);
};

/** "Sep 14, 3:12 PM, 2 days ago" — the moment, and how long it has been. */
export const when = (iso: string, now = Date.now()): string => `${moment.format(new Date(iso))}, ${ago(iso, now)}`;

const JOB = {
  transaction: { count: "transactions", last: "lastTransactionAt", one: "transaction", many: "transactions" },
  signup: { count: "signups", last: "lastSignUpAt", one: "sign-up", many: "sign-ups" },
} as const;

/** The answered tag whose job event is the most recent, if any tag has recorded one. */
const latestFor = (answered: Answered[], goal: WidgetGoal): Answered | undefined => {
  const job = JOB[goal];
  return answered
    .filter((result) => result.totals[job.count] > 0 && result[job.last])
    .sort((a, b) => Date.parse(b[job.last] ?? "") - Date.parse(a[job.last] ?? ""))[0];
};

/**
 * The tag whose week the main panel strips: the one with the most recent event of the job's kind,
 * else the first that answered — the same tag the tally's sentence singles out.
 */
export const stripTag = (results: TagActivity[], goal: WidgetGoal): Answered | undefined => {
  const answered = results.filter((result): result is Answered => result.status === "ok");
  return latestFor(answered, goal) ?? answered[0];
};

/** When nothing of the job's kind was recorded: are pages being seen at all? */
const quietSentence = (answered: Answered[], goal: WidgetGoal): string => {
  if (answered.some((result) => result.totals.pageviews > 0)) {
    return `Page views are arriving, but no ${JOB[goal].many} were recorded.`;
  }
  return `Nothing was recorded for ${answered.length > 1 ? "these tags" : "this tag"} in the last 7 days.`;
};

/**
 * The one sentence the tally adds under its rows — about the job in hand, so a transaction job
 * hears about transactions — or "" when the rows already say everything.
 */
export const tallySentence = (results: TagActivity[], goal: WidgetGoal, now = Date.now()): string => {
  const answered = results.filter((result): result is Answered => result.status === "ok");
  if (answered.length === 0) return "";

  const latest = latestFor(answered, goal);
  if (latest) {
    const by = answered.length > 1 ? `, by tag ${shortAppId(latest.appId)}` : "";
    return `Last ${JOB[goal].one} recorded ${ago(latest[JOB[goal].last] ?? "", now)}${by}.`;
  }
  // A tag that could not be read may hold exactly what the quiet sentences below would deny.
  if (answered.length < results.length) return "";
  // Counted, but with no time to put on it: say nothing rather than guess at one.
  if (answered.some((result) => result.totals[JOB[goal].count] > 0)) return "";
  return quietSentence(answered, goal);
};

/**
 * The service groups pages that differ only by an identifier — every WooCommerce thank-you page
 * is `/checkout/order-received/<order>` — into one shape with `:id` in its path. A shape stands for
 * many pages and is none of them.
 */
const isShape = (path: string): boolean => /\/:id(\/|$)/.test(path);

/**
 * Which of a tag's pages a sheet lists: the first ten until all are asked for, and a filter once
 * there are more than ten to look through. `grouped` says whether any row stands for many pages.
 */
export const pageListing = <T extends { pageUrl: string }>(pages: T[], all: boolean, filter: string, preview = 10) => {
  const more = pages.length > preview;
  const needle = filter.trim().toLowerCase();
  const matching = needle ? pages.filter((page) => page.pageUrl.toLowerCase().includes(needle)) : pages;
  return {
    shown: all ? matching : matching.slice(0, preview),
    canFilter: all && more,
    canShowAll: !all && more,
    grouped: pages.some((page) => isShape(page.pageUrl)),
  };
};

/**
 * A recorded page as a row prints it: its path, and its host only when that is not the job's own
 * site — a checkout on another domain is exactly what an engineer needs to notice.
 *
 * Printed, never linked. Every listed page is one where a conversion fired, and opening it runs the
 * client's tag: a click from here could add page views to the counts on screen, or record a test
 * purchase on a thank-you page in production.
 */
export const pageLabel = (pageUrl: string, site: string): { path: string; host: string } => {
  try {
    const url = new URL(pageUrl);
    const web = url.protocol === "http:" || url.protocol === "https:";
    return {
      path: web ? `${url.pathname}${url.search}` : pageUrl,
      host: web && url.hostname !== site ? url.hostname : "",
    };
  } catch {
    return { path: pageUrl, host: "" };
  }
};
