import { WidgetGoal } from "@mediajel/assistant-core/types";
import { scaleLinear } from "d3-scale";

import type { TagActivity } from "~/service/client";
import { amount, fullNumber, tallyNumber } from "~/ui/activity";

/**
 * A tag's last days as the activity report draws them: which days get a column, which measures get a
 * band, where a band tops out, and which day a pointer or a key is reading. Kept apart from the drawing,
 * so every decision the figure makes is one a test has made too.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;
export type Day = NonNullable<Answered["daily"]>[number];
export type Measure = Exclude<keyof Day, "day">;

export interface Band {
  measure: Measure;
  label: string;
  /** A value as the readout prints it. */
  format(value: number): string;
  /** A band's top as its label prints it, where there is room for a few characters. */
  short(value: number): string;
}

/** In the order the report's counts are printed, so a band sits where its total does. */
const BANDS: Band[] = [
  { measure: "pageviews", label: "Page views", format: fullNumber, short: tallyNumber },
  { measure: "transactions", label: "Transactions", format: fullNumber, short: tallyNumber },
  { measure: "signups", label: "Sign-ups", format: fullNumber, short: tallyNumber },
  { measure: "sessions", label: "Sessions", format: fullNumber, short: tallyNumber },
  {
    measure: "transactionTotal",
    label: "Transaction total",
    format: amount,
    short: (value) => tallyNumber(Math.round(value)),
  },
];

/** A week of columns, ending today. */
const DAYS_DRAWN = 7;

/**
 * The days worth a column. internal-service counts from midnight a week ago, but the 7-day table has
 * already let that day's early events expire, so its column would read as a slump that never happened.
 * What remains is six whole days and today so far.
 */
export const daysToDraw = (days: Day[]): Day[] => days.slice(-DAYS_DRAWN);

/**
 * The bands a tag's days are drawn in: the four counts always — a flat band is the answer "none" — and
 * the transaction total only when there was any, since without money it only repeats the transactions.
 */
export const bandsFor = (days: Day[]): Band[] =>
  BANDS.filter((band) => band.measure !== "transactionTotal" || days.some((day) => day.transactionTotal > 0));

/** The measure a job is about: what the main panel strips beside the page views. */
const JOB_MEASURE: Record<WidgetGoal, Measure> = { transaction: "transactions", signup: "signups" };

/**
 * The two bands the main panel has room for under the tally: page views, and the job's own measure.
 * The rest of the record — sign-ups on a transaction job, sessions, the total — is in Details.
 */
export const stripBands = (goal: WidgetGoal): Band[] =>
  BANDS.filter((band) => band.measure === "pageviews" || band.measure === JOB_MEASURE[goal]);

/**
 * A band's top: its largest day rounded up to the next clean tick, so the one figure on its scale reads
 * at a glance and the busiest column still nearly reaches it.
 */
export const topOf = (days: Day[], measure: Measure): number => {
  const largest = Math.max(0, ...days.map((day) => day[measure]));
  return largest === 0 ? 0 : scaleLinear().domain([0, largest]).nice().domain()[1];
};

const inUtc = (day: string): Date => new Date(`${day}T00:00:00Z`);
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const dated = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Today in UTC, the calendar internal-service counts days in. */
export const todayOf = (now = Date.now()): string => new Date(now).toISOString().slice(0, 10);

/** A day's name under its column. */
export const axisLabel = (day: string, today: string): string => (day === today ? "Today" : weekday.format(inUtc(day)));

/** A day as the readout names it; today's counts are still arriving. */
export const readoutLabel = (day: string, today: string): string =>
  day === today ? `Today so far · ${dated.format(inUtc(day))}` : dated.format(inUtc(day));

/** The day under a pointer `x` pixels into a figure `width` wide: every day owns its whole column. */
export const dayAt = (x: number, width: number, count: number): number =>
  Math.min(count - 1, Math.max(0, Math.floor((x / Math.max(width, 1)) * count)));

const MOVES: Record<string, (from: number, count: number) => number> = {
  ArrowLeft: (from) => from - 1,
  ArrowRight: (from) => from + 1,
  Home: () => 0,
  End: (_from, count) => count - 1,
};

/**
 * The day a key moves the reading to, or undefined for a key that does not move it. With nothing
 * chosen the reading is on the last day, so the first arrow steps from there.
 */
export const dayAfterKey = (key: string, chosen: number | null, count: number): number | undefined => {
  const move = MOVES[key];
  if (!move || count === 0) return undefined;
  return Math.min(count - 1, Math.max(0, move(chosen ?? count - 1, count)));
};
