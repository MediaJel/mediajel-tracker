// Decode Snowplow self-describing application_error payloads out of a POST body.
// Handles both plain (ue_pr) and base64url (ue_px) encodings — ue_px can carry
// -/_ chars and stripped padding, so a raw atob would throw InvalidCharacterError.
// Shared by the error-funnel specs; keep decoding fixes here, not in the specs.

function fromB64Url(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return atob(b64);
}

/** Register the collector intercept (aliased "track", always replying 200) and
 *  return the array that application_error payloads are collected into. */
export function captureAppErrors(): any[] {
  const captured: any[] = [];
  cy.intercept("POST", "**/analytics/track", (req) => {
    appErrorsFrom(req.body).forEach((d) => captured.push(d));
    req.reply({ statusCode: 200, body: {} });
  }).as("track");
  return captured;
}

export function appErrorsFrom(body: any): any[] {
  const events = (body && body.data) || [];
  const out: any[] = [];
  for (const ev of events) {
    if (ev.e !== "ue") continue;
    const raw = ev.ue_pr ?? (ev.ue_px ? fromB64Url(ev.ue_px) : null);
    if (!raw) continue;
    let unstruct: any;
    try {
      unstruct = JSON.parse(raw);
    } catch {
      continue;
    }
    const inner = unstruct.data; // { schema, data }
    if (inner?.schema?.includes("application_error")) out.push(inner.data);
  }
  return out;
}
