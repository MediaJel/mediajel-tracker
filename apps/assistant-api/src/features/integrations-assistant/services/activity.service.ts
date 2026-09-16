import { Inject, Injectable, Logger } from "@nestjs/common";

import type { TagActivity, TagActivityResponse } from "../dto/activity.dto";
import { ApiError } from "../errors";
import { TAG_ACTIVITY_SOURCE } from "../providers/tag-activity.source";
import { DAILY_ACTIVITY_SOURCE } from "../providers/daily-activity.source";
import type { DailyActivitySource, RawDailyRow } from "../providers/daily-activity.source";
import type { RawActivity, RawPageUrlRow, TagActivitySource } from "../providers/tag-activity.source";

/**
 * What a site's tags have actually recorded, per app ID, over the last seven days.
 *
 * Each app ID stands alone. One the source cannot read comes back `unavailable` with the reason —
 * never as zeros — and the others answer regardless; a page breakdown that fails leaves the totals
 * standing and says it is partial.
 */

export const TAG_ACTIVITY_DAYS = 7;

/** Reopening the panel should not re-run two queries per app ID; a fix should still show within minutes. */
const CACHE_TTL_MS = 5 * 60_000;

/** internal-service returns every page that converted, with no limit; the operator needs the top of it. */
const PAGE_LIMIT = 250;

type TagActivityOk = Extract<TagActivity, { status: "ok" }>;
type Page = NonNullable<TagActivityOk["pages"]>[number];

/** ClickHouse's JSON quotes 64-bit integers, so counts arrive as numbers or strings. Unreadable is 0. */
const numeric = (value: unknown): number => {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const cents = (value: unknown): number => Math.round(numeric(value) * 100) / 100;

/**
 * `MAX()` over no rows is ClickHouse's epoch rather than NULL, so "none" arrives as
 * "1970-01-01 00:00:00.000". Anything else is "YYYY-MM-DD HH:MM:SS.sss" in UTC, which `Date` would
 * read as local time without the T and the Z.
 */
const instant = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.startsWith("1970-01-01")) return null;
  const parsed = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const summarize = (raw: RawActivity): Pick<TagActivityOk, "totals" | "lastTransactionAt" | "lastSignUpAt"> => ({
  totals: {
    pageviews: numeric(raw.pageviews),
    sessions: numeric(raw.sessions),
    transactions: numeric(raw.transactions),
    signups: numeric(raw.signups),
    impressions: numeric(raw.impressions),
    transactionTotal: cents(raw.total),
  },
  lastTransactionAt: instant(raw.latest_transaction_event),
  lastSignUpAt: instant(raw.latest_signup_event),
});

/** A path segment that names one thing rather than a kind of page: all digits, a UUID, or 16+ hex characters. */
const IDENTIFIER = /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,})$/i;

/**
 * internal-service lists one row per distinct URL, query string included, and a confirmation
 * page's URL is usually its order's: WooCommerce's `/checkout/order-received/1234?key=wc_order_…`
 * is a row per order, and that key opens the order's details. So a URL is reduced to its shape
 * before it is counted or leaves this service — no credentials, query string or fragment, and
 * identifiers as `:id`. A value that does not parse as a URL keeps its text up to the first `?`
 * or `#`.
 */
const shapeOf = (pageUrl: unknown): string => {
  const text = typeof pageUrl === "string" ? pageUrl : "";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text.replace(/[?#].*$/s, "");
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname
    .split("/")
    .map((segment) => (IDENTIFIER.test(segment) ? ":id" : segment))
    .join("/");
  return url.href;
};

/** Rows that share a shape are one page. Its total stays null only while no row has carried one. */
const groupByShape = (rows: RawPageUrlRow[]): Page[] => {
  const pages = new Map<string, Page>();
  for (const row of rows) {
    const pageUrl = shapeOf(row.page_url);
    const page = pages.get(pageUrl) ?? { pageUrl, conversions: 0, transactionTotal: null };
    page.conversions += numeric(row.page_url_count);
    if (row.tr_total !== null) page.transactionTotal = (page.transactionTotal ?? 0) + numeric(row.tr_total);
    pages.set(pageUrl, page);
  }
  return [...pages.values()];
};

const breakdown = (rows: RawPageUrlRow[]): Pick<TagActivityOk, "pages" | "truncated"> => {
  const pages = groupByShape(rows)
    .map((page) => ({
      ...page,
      transactionTotal: page.transactionTotal === null ? null : cents(page.transactionTotal),
    }))
    .sort((a, b) => b.conversions - a.conversions);
  return { pages: pages.slice(0, PAGE_LIMIT), truncated: pages.length > PAGE_LIMIT };
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The days oldest first, as internal-service fills them; a row whose day is not a date has nowhere to go. */
const perDay = (rows: RawDailyRow[]): Pick<TagActivityOk, "daily"> => ({
  daily: rows
    .filter((row) => typeof row.day === "string" && DAY.test(row.day))
    .map((row) => ({
      day: row.day,
      pageviews: numeric(row.pageviews),
      sessions: numeric(row.sessions),
      transactions: numeric(row.transactions),
      signups: numeric(row.signups),
      transactionTotal: cents(row.total),
    }))
    .sort((a, b) => a.day.localeCompare(b.day)),
});

/** The answer for a service with no days source: none, and nothing to try again for. */
const NO_DAYS: Promise<Pick<TagActivityOk, "daily">> = Promise.resolve({ daily: null });

const reasonOf = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private readonly cache = new Map<string, { at: number; tag: TagActivityOk }>();
  private now: () => number = () => Date.now();

  constructor(
    @Inject(TAG_ACTIVITY_SOURCE) private readonly source: TagActivitySource,
    @Inject(DAILY_ACTIVITY_SOURCE) private readonly days: DailyActivitySource,
  ) {}

  /**
   * Tests bind their own clock rather than waiting out the cache. A method rather than a
   * constructor parameter because Nest resolves every constructor parameter as a provider, and a
   * function-typed one fails at boot — after the build and every test have passed.
   */
  useClock(now: () => number): void {
    this.now = now;
  }

  /**
   * Whether internal-service is configured — asked by /health, so a client can know before it asks
   * rather than from a 503.
   */
  get configured(): boolean {
    return this.source.configured();
  }

  /** Whether the days can be read — asked by /health; without them `daily` is null and the rest stands. */
  get dailyConfigured(): boolean {
    return this.days.configured();
  }

  async read(appIds: string[]): Promise<TagActivityResponse> {
    if (!this.source.configured()) {
      throw new ApiError(
        503,
        "activity-not-configured",
        "The assistant service has no internal-service configuration, so it cannot read tag activity. A MediaJel engineer needs to set INTERNAL_SERVICE_URL and INTERNAL_SERVICE_BEARER_TOKEN.",
      );
    }

    this.forgetExpired();
    const tags = await Promise.all(appIds.map((appId) => this.cache.get(appId)?.tag ?? this.load(appId)));
    return { days: TAG_ACTIVITY_DAYS, tags };
  }

  /**
   * The normalisation runs inside each settled promise, so a body that is not the shape it should
   * be fails that half of that app ID the same way a refused call does — never the whole request.
   */
  private async load(appId: string): Promise<TagActivity> {
    const wantDays = this.days.configured();
    const [recorded, pages, days] = await Promise.allSettled([
      this.source.activity(appId, TAG_ACTIVITY_DAYS).then(summarize),
      this.source.pageUrls(appId, TAG_ACTIVITY_DAYS).then(breakdown),
      wantDays ? this.days.daily(appId, TAG_ACTIVITY_DAYS).then(perDay) : NO_DAYS,
    ]);

    if (recorded.status === "rejected") {
      const message = reasonOf(recorded.reason);
      this.logger.warn(`Tag activity for ${appId} is unavailable: ${message}`);
      return { appId, status: "unavailable", message };
    }

    const daily = this.settledDays(appId, days);

    // Only a whole answer is kept. A partial one would go on saying the breakdown is missing for
    // five minutes after internal-service recovered, and nothing the operator can do skips the cache.
    if (pages.status === "rejected") {
      this.logger.warn(`Page breakdown for ${appId} is unavailable: ${reasonOf(pages.reason)}`);
      return { appId, status: "ok", ...recorded.value, ...daily, pages: null, truncated: false, partial: true };
    }

    const tag: TagActivityOk = { appId, status: "ok", ...recorded.value, ...pages.value, ...daily, partial: false };
    // Days that could not be read are not kept either, so the chart appears on the next read; a
    // service with no days source has its whole answer without them.
    if (daily.daily || !wantDays) this.cache.set(appId, { at: this.now(), tag });
    return tag;
  }

  /** The days, or null with the reason logged — a missing chart never costs the totals beside it. */
  private settledDays(
    appId: string,
    days: PromiseSettledResult<Pick<TagActivityOk, "daily">>,
  ): Pick<TagActivityOk, "daily"> {
    if (days.status === "fulfilled") return days.value;
    this.logger.warn(`Daily activity for ${appId} is unavailable: ${reasonOf(days.reason)}`);
    return { daily: null };
  }

  /** Swept on every read, so the cache holds only what was read in the last five minutes. */
  private forgetExpired(): void {
    const now = this.now();
    for (const [appId, entry] of this.cache) {
      if (now - entry.at >= CACHE_TTL_MS) this.cache.delete(appId);
    }
  }
}
