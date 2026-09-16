import { WidgetGoal } from "@mediajel/assistant-core/types";

import type { TagActivity } from "~/service/client";

/**
 * How tag activity is said on screen: the numbers, the one sentence the tally adds, and page URLs.
 *
 * Pure, so the words the panel uses about a client's traffic can be tested without a panel.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;

const whole = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const moment = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** In full up to 9,999, then compact (12.9K) — four columns have to fit across a 400px panel. */
export const tallyNumber = (n: number): string => (n > 9_999 ? compact.format(n) : whole.format(n));

export const fullNumber = (n: number): string => whole.format(n);

export const dollars = (n: number): string => money.format(n);

/** Enough of an app ID to tell two tags on one page apart; the whole of it is in Details. */
export const shortAppId = (appId: string): string => appId.split("-")[0].slice(0, 8) || appId;

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
  // Counted, but with no time to put on it: say nothing rather than guess at one.
  if (answered.some((result) => result.totals[JOB[goal].count] > 0)) return "";
  return quietSentence(answered, goal);
};

/**
 * Which of a tag's pages a sheet lists: the first ten until all are asked for, and a filter once
 * there are more than ten to look through.
 */
export const pageListing = <T extends { pageUrl: string }>(pages: T[], all: boolean, filter: string, preview = 10) => {
  const more = pages.length > preview;
  const needle = filter.trim().toLowerCase();
  const matching = needle ? pages.filter((page) => page.pageUrl.toLowerCase().includes(needle)) : pages;
  return { shown: all ? matching : matching.slice(0, preview), canFilter: all && more, canShowAll: !all && more };
};

/**
 * A recorded page as a row shows it. The host appears only when it is not the job's own site —
 * a checkout on another domain is exactly what an engineer needs to notice.
 *
 * `href` is null for anything but http(s). These URLs arrive from tracked events, and anyone can
 * send the collector an event; a `javascript:` URL must never become a link in this panel.
 */
export const pageLabel = (pageUrl: string, site: string): { path: string; host: string; href: string | null } => {
  try {
    const url = new URL(pageUrl);
    const web = url.protocol === "http:" || url.protocol === "https:";
    return {
      path: web ? `${url.pathname}${url.search}` : pageUrl,
      host: web && url.hostname !== site ? url.hostname : "",
      href: web ? url.href : null,
    };
  } catch {
    return { path: pageUrl, host: "", href: null };
  }
};
