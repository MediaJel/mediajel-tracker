/**
 * Field filter for Snowplow form tracking. Returns `true` to TRACK a field, `false` to skip it.
 *
 * Excludes likely-PII / sensitive form fields (email, password, phone, payment card, SSN, auth
 * secrets, date-of-birth) — matched by input `type`, `name`, or `id` — so their values are never
 * captured by form tracking. Privacy/compliance guard; see the README "Privacy & compliance".
 *
 * Wired into both tracker versions' `enableFormTracking`:
 *   - classic `sp.js` (v1): `{ fields: { filter } }`
 *   - `cnna.js` v3 (v2):    `{ options: { fields: { filter } } }`
 */
export const isNonSensitiveFormField = (elt: { name?: string; id?: string; type?: string } | null | undefined): boolean => {
  if (!elt) return true;
  const haystack = `${elt.name || ""} ${elt.id || ""} ${elt.type || ""}`.toLowerCase();
  // pass(word) · email · phone/tel · ssn/social · payment card (cc-/cvv/cvc) · auth secrets · dob/birth
  return !/pass|email|e-mail|phone|tel|ssn|social|card|cc-|cvv|cvc|secret|token|dob|birth/.test(haystack);
};

export default isNonSensitiveFormField;
