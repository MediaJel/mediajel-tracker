/**
 * The app IDs a Snowplow request names — read from the events on the wire, the way Snowplow
 * Inspector reads them, rather than from the page.
 *
 * Every event a MediaJel tag sends carries its app ID as `aid`. The tag POSTs batches to its
 * collector's custom path (`…dmp.cnna.io/analytics/track`) as a `payload_data` document; older
 * trackers can send a GET pixel to `/i?tv=…` with the same fields in the query. Neither needs the
 * page's cooperation, and both arrive for as long as the tag keeps sending, however it was loaded.
 */

const PAYLOAD_DATA = /^iglu:[^/]+\/payload_data\//i;

const unique = (values: unknown[]): string[] => [
  ...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)),
];

/** A GET pixel: Snowplow's `/i` path with its tracker version in the query. */
const fromPixel = (url: string): string[] => {
  try {
    const parsed = new URL(url);
    return /\/i$/.test(parsed.pathname) && parsed.searchParams.has("tv")
      ? unique([parsed.searchParams.get("aid")])
      : [];
  } catch {
    return [];
  }
};

/** A POSTed batch: `{ schema: "iglu:…/payload_data/…", data: [{ aid, … }] }`. */
const fromBatch = (body: string): string[] => {
  try {
    const batch = JSON.parse(body) as { schema?: unknown; data?: unknown };
    if (typeof batch.schema !== "string" || !PAYLOAD_DATA.test(batch.schema) || !Array.isArray(batch.data)) return [];
    return unique(batch.data.map((event) => (event as { aid?: unknown } | null)?.aid));
  } catch {
    return [];
  }
};

export const appIdsInBeacon = ({ url, body }: { url: string; body?: string }): string[] =>
  body ? fromBatch(body) : fromPixel(url);
