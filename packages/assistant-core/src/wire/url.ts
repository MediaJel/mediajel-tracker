import { maskValue } from "@mediajel/assistant-core/session/masking";

/**
 * A URL as the ledger keeps one.
 *
 * A partner pixel or a third-party tag carries its facts in its query — a segment, an order, and
 * on a sign-up the macros the tag filled with a person's email and phone. The query values are
 * masked the way a recording masks a form: by what the key says the value is, and swept for the
 * shapes of an email, a card or a phone number. The path is kept as it is, and the whole is cut
 * to the cap.
 */

/** As much of a URL as a row keeps, in characters. */
export const URL_CHAR_CAP = 1_024;

/** A URL parsed, or null for text that is not one. */
export const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const clipped = (text: string): string => (text.length > URL_CHAR_CAP ? `${text.slice(0, URL_CHAR_CAP)}…` : text);

/** The value as the page wrote it — percent-decoded when it can be, so an email in the query reads as one to the mask. */
const decoded = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const maskedPair = (pair: string): string => {
  const at = pair.indexOf("=");
  if (at === -1) return pair;
  const key = pair.slice(0, at);
  return `${key}=${maskValue(decoded(key), decoded(pair.slice(at + 1)))}`;
};

const maskedQuery = (search: string): string =>
  search === "" ? "" : `?${search.slice(1).split("&").map(maskedPair).join("&")}`;

/** The URL with every query value masked and the whole cut to the cap; text that is not a URL is masked as text. */
export const maskedUrl = (url: string): string => {
  const parsed = parseUrl(url);
  if (parsed === null) return clipped(maskValue("url", url));
  return clipped(`${parsed.origin}${parsed.pathname}${maskedQuery(parsed.search)}${parsed.hash}`);
};
