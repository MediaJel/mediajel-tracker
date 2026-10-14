/**
 * PII masking, applied AT CAPTURE — before anything is persisted and long before anything is
 * put in a prompt. The timeline never holds a raw email, phone number, card number or the
 * value of a sensitive form field; what the operator sees in Review is what the model gets.
 *
 * Deliberately NOT masked: city, state, country, currency, product names, ids, quantities and
 * totals — the generator needs them, and they identify a purchase, not a person.
 *
 * The key regex is a superset of tracker-core's form-PII filter
 * (snowplow/form-pii-filter.ts) — a field the tracker refuses to track, the widget refuses to
 * store. A parity test keeps the two from drifting.
 */

const SENSITIVE_KEY_RE =
  /pass|email|e-mail|phone|tel|ssn|social|card|cc-|cvv|cvc|secret|token|dob|birth|address|street|line1|line2|zip|postal|postcode|auth/i;

const EMAIL_RE = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+)((?:\.[A-Za-z0-9-]+)+)/g;
/** 13–19 digits with optional spaces/dashes — the shapes card numbers actually arrive in. */
const CARD_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
/** 7+ digit runs with phone punctuation. Order matters: cards and SSNs are replaced first. */
const PHONE_RE = /(?:\+?\d{1,3}[ .-]?)?(?:\(\d{2,4}\)[ .-]?)?\d{3}[ .-]?\d{2,4}(?:[ .-]?\d{2,4})\b/g;

const last4 = (value: string): string => value.replace(/\D/g, "").slice(-4);

/** Shape-preserving: enough to recognise which value it was, never enough to use it. */
export const maskEmail = (value: string): string =>
  value.replace(
    EMAIL_RE,
    (_, user: string, domain: string, tld: string) => `${user[0] ?? "•"}***@${domain[0] ?? "•"}***${tld}`,
  );

export const maskText = (value: string): string =>
  value
    .replace(EMAIL_RE, (match) => maskEmail(match))
    .replace(CARD_RE, (match) => `**** ${last4(match)}`)
    .replace(SSN_RE, "***-**-****")
    .replace(PHONE_RE, (match) => (match.replace(/\D/g, "").length >= 7 ? `***-${last4(match)}` : match));

export const isSensitiveKey = (key: string): boolean => SENSITIVE_KEY_RE.test(key);

/**
 * One value, masked by what its key says it is. Sensitive keys keep their shape where the
 * shape helps the operator recognise the field (email, phone, card) and disappear entirely
 * where it would not (passwords, tokens).
 */
export const maskValue = (key: string, value: string): string => {
  if (!isSensitiveKey(key)) return maskText(value);
  const lowered = key.toLowerCase();
  if (/pass|secret|token|cvv|cvc|auth/.test(lowered)) return "<masked>";
  if (/email|e-mail/.test(lowered)) return maskEmail(value);
  if (/card|cc-/.test(lowered)) return value.trim() ? `**** ${last4(value)}` : "";
  if (/phone|tel/.test(lowered)) return value.trim() ? `***-${last4(value)}` : "";
  return value.trim() ? "<masked>" : "";
};

const MAX_DEPTH = 5;

/**
 * Masks a structured payload (a dataLayer push, a parsed request body) by walking it. Keys
 * decide; free text is swept for the patterns. Depth-capped and cycle-safe — a page's object
 * graph is not something to trust with recursion.
 */
export const maskObject = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (typeof value === "string") return maskText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[deep]";
  if (seen.has(value as object)) return "[cycle]";
  seen.add(value as object);

  if (Array.isArray(value)) return value.map((entry) => maskObject(entry, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = maskValue(key, entry);
    else if (typeof entry === "number" && isSensitiveKey(key)) out[key] = "<masked>";
    else out[key] = maskObject(entry, depth + 1, seen);
  }
  return out;
};
