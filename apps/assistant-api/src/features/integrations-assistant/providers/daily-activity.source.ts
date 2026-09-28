/**
 * Each tag's activity by day, behind a seam of its own.
 *
 * Kept apart from TAG_ACTIVITY_SOURCE because the two are answered from different places. The
 * totals and the pages are internal-service's endpoints; internal-service has no per-day endpoint,
 * so this service reads the days from ClickHouse itself — the same table, counted the same way, so
 * a week of rows adds up to the totals. Should internal-service grow a `daily-activity` endpoint,
 * this binding becomes an adapter over it and nothing above the token changes.
 */

/** ClickHouse's JSON output quotes 64-bit integers, so a count can arrive as "12". */
type Count = number | string;

/**
 * One calendar day in UTC, as a source hands it over: oldest first, zero-filled from the start of
 * the window through today. The oldest day is partial for events, which age out of the 7-day table
 * by the hour.
 */
export interface RawDailyRow {
  /** "YYYY-MM-DD". */
  day: string;
  pageviews: Count;
  sessions: Count;
  transactions: Count;
  signups: Count;
  impressions: Count;
  /** That day's transaction totals, summed. */
  total: Count;
}

export interface DailyActivitySource {
  /** Whether the source can answer at all — asked by /health, and before every read. */
  configured(): boolean;
  daily(appId: string, days: number): Promise<RawDailyRow[]>;
}

export const DAILY_ACTIVITY_SOURCE = Symbol("DAILY_ACTIVITY_SOURCE");
