import { ClickHouseClient, createClient } from "@clickhouse/client";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { DailyActivitySource, RawDailyRow } from "./daily-activity.source";

/**
 * The days, read from ClickHouse directly.
 *
 * The query is internal-service's `activity` query with its window cut into calendar days — the
 * same event names, the same sign-up predicate, the same sessions table — so a week of these rows
 * adds up to that endpoint's totals (checked against production for two app IDs). It reads the
 * 7-day TAG_ACTIVITY_TABLE, whose ORDER BY starts with APP_ID, so one tag's week is a narrow read.
 * Whatever the credential could otherwise do, the query runs read-only with a ceiling on its time.
 */

const TIMEOUT_MS = 20_000;
const MAX_EXECUTION_S = 20;

const TAG_ACTIVITY_TABLE = "SNOWPLOW.TAG_ACTIVITY_TABLE";
const SESSIONS_TABLE = "SNOWPLOW.SNOWPLOW_SESSIONS_MV";

/**
 * `day` stays a Date column: WITH FILL needs one, and it renders as "YYYY-MM-DD". `toFloat64` is
 * deliberate — 64-bit integers would come back as strings.
 */
const SQL = `
SELECT
  day,
  toFloat64(pageviews) AS pageviews,
  toFloat64(sessions) AS sessions,
  toFloat64(transactions) AS transactions,
  toFloat64(signups) AS signups,
  toFloat64(impressions) AS impressions,
  toFloat64(ifNull(total, 0)) AS total
FROM (
  SELECT
    toDate(COLLECTOR_TSTAMP) AS day,
    countIf(EVENT_NAME = 'page_view') AS pageviews,
    countIf(EVENT_NAME = 'transaction' AND TR_ORDERID != '' AND TR_TOTAL IS NOT NULL) AS transactions,
    countIf(EVENT_NAME = 'sign_up'
      OR notEmpty(JSONExtractString(UNSTRUCT_EVENT, 'data', 'data', 'uuid'))
      OR notEmpty(JSONExtractString(UNSTRUCT_EVENT, 'data', 'data', 'firstName'))
      OR notEmpty(JSONExtractString(UNSTRUCT_EVENT, 'data', 'data', 'emailAddress'))) AS signups,
    countIf(EVENT_NAME = 'ad_impression' OR EVENT_NAME = 'consolidated_ad_impression') AS impressions,
    sumIf(TR_TOTAL, EVENT_NAME = 'transaction') AS total
  FROM ${TAG_ACTIVITY_TABLE}
  WHERE APP_ID = {appId:String}
    AND COLLECTOR_TSTAMP >= toDate(NOW() - INTERVAL {daysToTrack:Int64} DAY)
  GROUP BY day
) AS events
FULL OUTER JOIN (
  SELECT toDate(SESSION_START) AS day, count() AS sessions
  FROM ${SESSIONS_TABLE}
  WHERE APP_ID = {appId:String}
    AND SESSION_START >= toDate(NOW() - INTERVAL {daysToTrack:Int64} DAY)
  GROUP BY day
) AS s USING (day)
ORDER BY day WITH FILL FROM toDate(NOW() - INTERVAL {daysToTrack:Int64} DAY) TO toDate(NOW()) + 1 STEP 1
`;

/** What this source needs of a client — so a test can hand it one that never opens a socket. */
type Client = Pick<ClickHouseClient, "query" | "close">;

const describe = (err: unknown): string => (err instanceof Error ? err.message : String(err));

@Injectable()
export class ClickHouseDailySource implements DailyActivitySource, OnModuleDestroy {
  private client: Client | null = null;

  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return !!(this.url() && this.user() && this.password());
  }

  /**
   * Tests bind a client of their own. A method rather than a constructor parameter because Nest
   * resolves every constructor parameter as a provider, and one it cannot resolve fails at boot.
   */
  useClient(client: Client): void {
    this.client = client;
  }

  async daily(appId: string, days: number): Promise<RawDailyRow[]> {
    try {
      const result = await this.connected().query({
        query: SQL,
        query_params: { appId, daysToTrack: days },
        format: "JSONEachRow",
        // readonly 2: reads only, but a setting like the time ceiling may still be set for the query.
        clickhouse_settings: { readonly: "2", max_execution_time: MAX_EXECUTION_S },
      });
      return (await result.json()) as RawDailyRow[];
    } catch (err) {
      throw new Error(`ClickHouse could not answer for the days: ${describe(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  private connected(): Client {
    this.client ??= createClient({
      url: this.url(),
      username: this.user(),
      password: this.password(),
      request_timeout: TIMEOUT_MS,
    });
    return this.client;
  }

  private url(): string {
    return this.config.get<string>("CLICKHOUSE_URL")?.trim() ?? "";
  }

  private user(): string {
    return this.config.get<string>("CLICKHOUSE_USER")?.trim() ?? "";
  }

  private password(): string {
    return this.config.get<string>("CLICKHOUSE_PASSWORD") ?? "";
  }
}
