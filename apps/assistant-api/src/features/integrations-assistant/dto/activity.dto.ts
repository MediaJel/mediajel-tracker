import { z } from "zod";

/**
 * An app ID becomes a path segment on internal-service, so it is checked rather than trusted. The
 * character rule alone is not enough: "." and ".." pass it, and `fetch` resolves them before the
 * request leaves — ".." would read internal-service's list of every tracker instead of one tag's
 * activity.
 */
const AppId = z
  .string()
  .regex(/^[\w.-]{1,128}$/, "an app ID is 1 to 128 letters, numbers, dots, dashes or underscores")
  .refine((id) => id !== "." && id !== "..", "an app ID may not be a relative path");

const LIST = "name one to five app IDs, separated by commas";

/**
 * `?appIds=a,b`, or `?appIds=a&appIds=b`, which Express hands over as an array. Either way the list
 * is trimmed, emptied of blanks and de-duplicated in the order it was written, so "a, b,a" reads as
 * a and b. Five at most: every app ID is two queries on internal-service.
 */
export const ActivityQuerySchema = z.object({
  appIds: z
    .union([z.string(), z.array(z.string())], { error: LIST })
    .transform((value) => [
      ...new Set(
        [value]
          .flat()
          .flatMap((part) => part.split(","))
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ])
    .pipe(z.array(AppId).min(1, LIST).max(5, "name at most five app IDs at a time")),
});

/**
 * One app ID's last seven days, or why they could not be read.
 *
 * `unavailable` is deliberately not zeros. Zeros are an answer — "this tag records nothing" — and
 * a wrong one sends the operator to fix a tag that works.
 */
export type TagActivity =
  | {
      appId: string;
      status: "ok";
      totals: {
        pageviews: number;
        sessions: number;
        transactions: number;
        signups: number;
        impressions: number;
        /** The window's transaction totals, summed and rounded to the cent. */
        transactionTotal: number;
      };
      /**
       * ISO-8601 UTC: the most recent the 7-day tag activity table still holds (its TTL is the
       * window) — null when there was none in it.
       */
      lastTransactionAt: string | null;
      lastSignUpAt: string | null;
      /**
       * Pages that recorded a transaction or a sign-up, most first; null when the breakdown could not
       * be read. `pageUrl` is the page's shape — no query string or fragment, identifiers as `:id` —
       * so every order's confirmation URL is one page. internal-service counts these differently
       * from the totals, so they need not add up.
       */
      pages: { pageUrl: string; conversions: number; transactionTotal: number | null }[] | null;
      /** More pages converted than `pages` carries. */
      truncated: boolean;
      /**
       * The same counts per calendar day in UTC, oldest first — they add up to `totals`. Null when the
       * daily read failed, the rest of the answer standing. The oldest day is partial for events,
       * which age out of the 7-day table by the hour; the newest is today so far.
       */
      daily:
        | {
            /** "YYYY-MM-DD". */
            day: string;
            pageviews: number;
            sessions: number;
            transactions: number;
            signups: number;
            /** Rounded to the cent. */
            transactionTotal: number;
          }[]
        | null;
      /** The totals stand but the page breakdown is missing. */
      partial: boolean;
    }
  | { appId: string; status: "unavailable"; message: string };

export interface TagActivityResponse {
  days: 7;
  /** In the order the app IDs were asked for. */
  tags: TagActivity[];
}
