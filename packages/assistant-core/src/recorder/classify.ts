import { QueryStringContext } from "@mediajel/tracker-core/types";
import { NetworkCategory } from "@mediajel/assistant-core/types";

/**
 * Sorting the page's traffic from the tag's own, and keeping the widget's out entirely.
 *
 * Tracker traffic is still recorded — Review uses it to say "the tag already fired a
 * transaction during your action" — but it is capped low by the scorer and never offered as
 * the signal to build on. Widget traffic (provider, GitHub) is never recorded at all: those
 * calls go through the pristine fetch captured at chunk load, and this list is the backstop.
 */

const OWN_HOSTS = [
  "ai-gateway.vercel.sh",
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.github.com",
];

const TRACKER_PATH_RE = /com\.snowplowanalytics\.snowplow\/tp2|\/analytics\/track|\/com\.snowplowanalytics/;

export const isOwnTraffic = (url: string): boolean => {
  try {
    const host = new URL(url, typeof location === "undefined" ? "https://page.invalid/" : location.href).host;
    return OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`));
  } catch {
    return false;
  }
};

export const categorize = (url: string, tag: QueryStringContext): NetworkCategory => {
  if (TRACKER_PATH_RE.test(url)) return "tracker";
  const collector = (tag.collector || "").replace(/^\/\//, "").replace(/^https?:\/\//, "");
  if (collector && url.includes(collector)) return "tracker";
  return "page";
};

/** What the tag sent, when it is legible from a collector payload. */
export const peekTrackerEvent = (body: string): string | null => {
  if (/[?&"]e["=]+tr\b|"e":"tr"/.test(body)) return "transaction";
  if (/sign_up/.test(body)) return "sign-up";
  if (/[?&"]e["=]+pv\b|"e":"pv"/.test(body)) return "pageview";
  return null;
};
