/**
 * What a tag has recorded lately, behind one seam.
 *
 * The numbers are internal-service's — the `tracker/events/activity` and `page-url-activity`
 * endpoints gql-service already reads, and `daily-activity` beside them — and never a ClickHouse
 * query of this module's own:
 * internal-service owns those queries, and a second copy here would drift the first time either
 * side changed a filter.
 *
 * It is a seam because the transport does not survive the move. In amplication-nestjs-microservices'
 * external-service this binding becomes an adapter over that repo's `MicroservicesService.internal`
 * — the axios instance it already points at internal-service, with its own URL and credential —
 * so `fetch` and the INTERNAL_SERVICE_* pair stay behind with main.ts. The shapes below are
 * internal-service's own, quirks included, because both bindings read the same endpoints and
 * ActivityService is the one place those quirks are absorbed.
 */

/** ClickHouse's JSON output quotes 64-bit integers, so a count can arrive as "12". */
type Count = number | string;

/** `GET /api/tracker/events/activity/:appId?daysToTrack=N`, as it arrives. */
export interface RawActivity {
  pageviews: Count;
  sessions: Count;
  transactions: Count;
  signups: Count;
  impressions: Count;
  /** The window's transaction totals, summed. */
  total: Count;
  /**
   * "YYYY-MM-DD HH:MM:SS.sss" in UTC: the most recent the 7-day tag activity table still holds (its
   * TTL is the window — internal-service's query has no date filter of its own). When there was
   * none in it, this reports ClickHouse's epoch rather than null.
   */
  latest_transaction_event?: string | null;
  /** The same, for sign-ups — null rather than the epoch when there was none. */
  latest_signup_event?: string | null;
}

/**
 * One row of `GET /api/tracker/events/page-url-activity/:appId?daysToTrack=N` — one per distinct
 * URL, query string included, so a confirmation page is often one row per order.
 */
export interface RawPageUrlRow {
  page_url: string;
  /** Transactions and sign-ups together. */
  page_url_count: Count;
  /** Null when nothing on the page carried a transaction total. */
  tr_total: Count | null;
}

/**
 * One row of `GET /api/tracker/events/daily-activity/:appId?daysToTrack=N`: one per calendar day in
 * UTC, oldest first and zero-filled, counted exactly as `activity` counts — so the rows add up to its
 * totals. The oldest day is partial for events, which age out of the 7-day table by the hour.
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

export interface TagActivitySource {
  /** Whether the source can answer at all — asked by /health, and before every read. */
  configured(): boolean;
  activity(appId: string, days: number): Promise<RawActivity>;
  /** The rows, unwrapped from internal-service's `{ rows }` envelope. */
  pageUrls(appId: string, days: number): Promise<RawPageUrlRow[]>;
  /** The rows, unwrapped from internal-service's `{ rows }` envelope. */
  daily(appId: string, days: number): Promise<RawDailyRow[]>;
}

export const TAG_ACTIVITY_SOURCE = Symbol("TAG_ACTIVITY_SOURCE");
