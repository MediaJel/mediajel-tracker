/**
 * Adding click IDs to a URL's text without re-serializing it, shared by link decoration and the address-bar carry-over.
 */
import { CLICK_ID_NAMES, ClickIdName, ClickIds } from "./click-ids";

/** `gclid=…&gbraid=…&wbraid=…` for the ids present, in that order; "" when there are none. */
export const clickIdQuery = (ids: ClickIds | null): string =>
  ids
    ? CLICK_ID_NAMES.filter((name) => ids[name])
        .map((name) => `${name}=${encodeURIComponent(ids[name] as string)}`)
        .join("&")
    : "";


export const lowerCaseKeys = (url: URL): string[] => {
  const keys: string[] = [];
  url.searchParams.forEach((_, key) => keys.push(key.toLowerCase()));
  return keys;
};

export const hasClickIdParam = (url: URL): boolean =>
  lowerCaseKeys(url).some((key) => CLICK_ID_NAMES.indexOf(key as ClickIdName) !== -1);

/** Appends `addition` to the query of `base` (before any `#fragment`), keeping the rest of the text exactly as is. */
export const appendParams = (base: string, addition: string): string => {
  const hashAt = base.indexOf("#");
  const beforeHash = hashAt === -1 ? base : base.slice(0, hashAt);
  const fragment = hashAt === -1 ? "" : base.slice(hashAt);
  const separator = beforeHash.indexOf("?") === -1 ? "?" : /[?&]$/.test(beforeHash) ? "" : "&";
  return `${beforeHash}${separator}${addition}${fragment}`;
};
