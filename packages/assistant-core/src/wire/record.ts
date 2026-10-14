import { ELEMENT_CHAR_CAP, paramsOf } from "@mediajel/assistant-core/context";
import { RecordedTag, collectorHost } from "@mediajel/assistant-core/tags";
import { RECORD_SCHEMA_RE } from "@mediajel/assistant-core/wire/protocol";
import type { SelfDescribing } from "@mediajel/assistant-core/wire/types";

/**
 * The tag's own word on its configuration, read off the wire.
 *
 * Every MediaJel tag sends one `record` event as it boots, carrying the whole context it runs
 * with: every parameter of its URL, the defaults it filled in, whatever `window.overrides` on
 * the page changed, the collector it was built for, and the markup of its own script element.
 * It is the one complete source that works on the production tag of today, which announces
 * nothing.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Every value as text — the tag itself writes `logs=false` as a string, an override may write it as a boolean. */
const stringified = (data: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
  );

const field = (said: Record<string, string>, key: string): string => said[key] ?? "";

/** The configuration a tag's record event states, or null for any other event. */
export const recordedTagOf = ({ schema, data }: SelfDescribing): RecordedTag | null => {
  if (!RECORD_SCHEMA_RE.test(schema) || !isRecord(data)) return null;
  const said = stringified(data);
  if (field(said, "appId") === "") return null;
  return {
    appId: field(said, "appId"),
    environment: field(said, "environment"),
    version: field(said, "version"),
    event: field(said, "event"),
    collector: collectorHost(field(said, "collector")),
    config: {
      params: paramsOf(said),
      src: "",
      element: field(said, "tag").slice(0, ELEMENT_CHAR_CAP),
      source: "record",
    },
  };
};
