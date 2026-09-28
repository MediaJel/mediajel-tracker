import { base64ToText } from "@mediajel/assistant-core/wire/base64";
import type { CustomTagFetch, CustomTagScope, Decoded } from "@mediajel/assistant-core/wire/types";
import { maskedUrl, parseUrl } from "@mediajel/assistant-core/wire/url";

/**
 * The custom-tag files the tag fetches as it boots, named for what they load.
 *
 * The tag asks for `/domains/<hostname>.js` and `/app-ids/<appId>.js` under its custom-tag host,
 * each name base64-encoded (`utils/get-custom-tags.ts` and `get-appId-tags.ts` in tracker-core),
 * and runs whatever comes back inline. The fetch is the one sign on the wire that a site's custom
 * integration was looked for; decoding the name says which one.
 */

const FILE_RE = /^\/(domains|app-ids)\/(.+)\.js$/;

const SCOPES: Record<string, CustomTagScope> = { domains: "domain", "app-ids": "app-id" };

/** A hostname or an app ID is printable ASCII; anything else decoded from the name is not a name. */
const NAME_RE = /^[\x20-\x7e]+$/;

const nameOf = (encoded: string): string | null => {
  const text = base64ToText(encoded);
  return text !== null && NAME_RE.test(text) ? text : null;
};

const fileOf = (url: string): { scope: CustomTagScope; encoded: string } | null => {
  const match = FILE_RE.exec(parseUrl(url)?.pathname ?? "");
  return match ? { scope: SCOPES[match[1]], encoded: match[2] } : null;
};

/** An app-id file names the tag it was written for; a domain file names the site. */
const appIdOf = (scope: CustomTagScope, name: string): string => (scope === "app-id" ? name : "");

/** A fetch of one of the tag's custom-tag files, or null for any other URL — or a name that decodes to nothing readable. */
export const recogniseCustomTag = (url: string): Decoded<CustomTagFetch> | null => {
  const file = fileOf(url);
  if (file === null) return null;
  const name = nameOf(file.encoded);
  if (name === null) return null;
  return {
    source: "custom-tag",
    scope: file.scope,
    name,
    url: maskedUrl(url),
    appId: appIdOf(file.scope, name),
    pageUrl: "",
  };
};
